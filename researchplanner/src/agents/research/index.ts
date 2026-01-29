/**
 * Research Agent - Main Module
 * Phase 5 - Stage 2: Research and Literature Review
 *
 * Orchestrates the research process:
 * 1. Generate search strategy (PICO, MeSH terms, queries)
 * 2. Execute searches across PubMed, Semantic Scholar, Cochrane
 * 3. Process and rank articles by relevance
 * 4. Perform gap analysis
 * 5. Generate evidence synthesis
 * 6. Format citations
 *
 * Entry point for the QI/Research Pipeline Stage 2.
 */

import type { Project, ResearchResults, ProcessedArticle, GapAnalysis } from '../../types/index.js';
import type { ProjectContext, RankedPaper } from './ranking.js';
import type { SearchResult, UnifiedPaper } from './deduplication.js';
import { generateSearchStrategy } from './search.js';
import { searchPubMed, fetchPubMedAbstracts, type PubMedArticle } from './pubmed.js';
import { searchSemanticScholar, type SemanticScholarPaper } from './semantic-scholar.js';
import { searchCochrane, type CochraneReview } from './cochrane.js';
import { deduplicateResults } from './deduplication.js';
import { rankArticles } from './ranking.js';
import { processArticle, categorizeByRelevance } from './processing.js';
import { synthesizeEvidence, generateBackgroundDraft } from './synthesis.js';
import { formatCitations } from './citations.js';
import { analyzeGaps } from './gaps.js';

/**
 * Main research orchestration function
 *
 * Conducts complete literature review workflow:
 * 1. Generate search strategy from project intake data
 * 2. Execute parallel searches on PubMed, Semantic Scholar, Cochrane
 * 3. Deduplicate results by DOI/PMID/title similarity
 * 4. Rank by relevance to project context
 * 5. Process top 30 articles
 * 6. Categorize into primary (>0.7) and secondary (>0.4)
 * 7. Analyze knowledge gaps
 * 8. Synthesize evidence
 * 9. Format citations
 * 10. Return complete ResearchResults
 *
 * @param project - Project record from Stage 1 (Intake)
 * @returns Complete research results for Stage 2
 *
 * @throws Error if search strategy generation or critical search operations fail
 *
 * @example
 * ```typescript
 * const project: Project = await processIntake(intakeData);
 * const results = await conductResearch(project);
 * console.log(results.primary_literature.length); // High relevance articles
 * console.log(results.gap_analysis.identified_gaps);
 * ```
 */
export async function conductResearch(project: Project): Promise<ResearchResults> {
  console.log(`[Research] Starting research phase for project ${project.id}`);
  console.log(`[Research] Clinical problem: ${project.intake.clinical_problem}`);

  // Step 1: Generate search strategy from project intake data
  console.log('[Research] Step 1: Generating search strategy...');
  const searchStrategy = await generateSearchStrategy(
    project.intake.clinical_problem,
    project.intake.target_population,
    project.intake.intended_outcomes
  );

  // Step 2: Execute parallel searches on all APIs
  console.log('[Research] Step 2: Executing parallel searches...');
  const [pubmedResults, semanticResults, cochraneResults] = await Promise.all([
    searchPubMedAPI(searchStrategy.pubmed_query),
    searchSemanticScholarAPI(searchStrategy.semantic_query),
    searchCochraneAPI(searchStrategy.cochrane_query || ''),
  ]);

  // Combine all search results
  const allResults: SearchResult[] = [
    ...pubmedResults,
    ...semanticResults,
    ...cochraneResults,
  ];

  console.log(`[Research] Retrieved ${allResults.length} total results`);

  // Step 3: Deduplicate results
  console.log('[Research] Step 3: Deduplicating results...');
  const uniquePapers = deduplicateResults(allResults);
  console.log(`[Research] Deduplicated to ${uniquePapers.length} unique papers`);

  // Update search strategy results count
  searchStrategy.results_count = uniquePapers.length;

  // Step 4: Rank by relevance
  console.log('[Research] Step 4: Ranking by relevance...');
  const projectContext: ProjectContext = {
    clinical_problem: project.intake.clinical_problem,
    target_population: project.intake.target_population,
    intended_outcomes: project.intake.intended_outcomes,
    concept_description: project.intake.concept_description,
  };

  const rankedPapers = await rankArticles(uniquePapers, projectContext);

  // Step 5: Process top 30 articles
  console.log('[Research] Step 5: Processing top 30 articles...');
  const top30 = rankedPapers.slice(0, 30);
  const processedArticlesPromises = top30.map(paper => processArticle(paper));
  const processedArticles = await Promise.all(processedArticlesPromises);

  // Step 6: Categorize into primary and secondary
  console.log('[Research] Step 6: Categorizing by relevance...');
  const { primary: primaryLiterature, secondary: secondaryLiterature } = categorizeByRelevance(processedArticles);

  console.log(`[Research] Primary literature: ${primaryLiterature.length} articles`);
  console.log(`[Research] Secondary literature: ${secondaryLiterature.length} articles`);

  // Step 7: Analyze gaps
  console.log('[Research] Step 7: Analyzing knowledge gaps...');
  const gapAnalysis = await analyzeGaps(
    [...primaryLiterature, ...secondaryLiterature],
    projectContext
  );

  // Step 8: Synthesize evidence
  console.log('[Research] Step 8: Synthesizing evidence...');
  const evidenceSynthesis = await synthesizeEvidence(
    [...primaryLiterature, ...secondaryLiterature],
    gapAnalysis
  );

  // Step 9: Generate background draft
  console.log('[Research] Step 9: Generating background draft...');
  const backgroundDraft = await generateBackgroundDraft(evidenceSynthesis, projectContext);

  // Step 10: Format citations
  console.log('[Research] Step 10: Formatting citations...');
  const citations = formatCitations([...primaryLiterature, ...secondaryLiterature]);

  // Return complete ResearchResults
  console.log('[Research] Research workflow complete');
  return {
    search_strategy: searchStrategy,
    primary_literature: primaryLiterature,
    secondary_literature: secondaryLiterature,
    gap_analysis: gapAnalysis,
    evidence_synthesis: evidenceSynthesis,
    citations,
    background_draft: backgroundDraft,
  };
}

/**
 * Search PubMed API and convert to SearchResult format
 */
async function searchPubMedAPI(query: string): Promise<SearchResult[]> {
  try {
    const pmids = await searchPubMed(query, 100);
    if (pmids.length === 0) {
      console.log('[Research] PubMed search returned 0 results');
      return [];
    }
    const articles = await fetchPubMedAbstracts(pmids);
    return articles.map(convertPubMedToSearchResult);
  } catch (error) {
    console.error('[Research] PubMed search failed:', error);
    return [];
  }
}

/**
 * Search Semantic Scholar API and convert to SearchResult format
 */
async function searchSemanticScholarAPI(query: string): Promise<SearchResult[]> {
  try {
    const papers = await searchSemanticScholar(query, 100);
    return papers.map(convertSemanticScholarToSearchResult);
  } catch (error) {
    console.error('[Research] Semantic Scholar search failed:', error);
    return [];
  }
}

/**
 * Search Cochrane API and convert to SearchResult format
 */
async function searchCochraneAPI(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  try {
    const reviews = await searchCochrane(query, 50);
    return reviews.map(convertCochraneToSearchResult);
  } catch (error) {
    console.error('[Research] Cochrane search failed:', error);
    return [];
  }
}

/**
 * Convert PubMed article to SearchResult
 */
function convertPubMedToSearchResult(article: PubMedArticle): SearchResult {
  return {
    source: 'pubmed',
    id: article.pmid,
    pmid: article.pmid,
    doi: article.doi,
    title: article.title,
    abstract: article.abstract,
    authors: article.authors,
    year: article.year,
    journal: article.journal,
  };
}

/**
 * Convert Semantic Scholar paper to SearchResult
 */
function convertSemanticScholarToSearchResult(paper: SemanticScholarPaper): SearchResult {
  return {
    source: 'semantic_scholar',
    id: paper.paperId,
    doi: paper.doi || undefined,
    pmid: paper.pmid || undefined,
    title: paper.title,
    abstract: paper.abstract || undefined,
    authors: paper.authors.map(a => a.name),
    year: paper.year || undefined,
    journal: paper.venue || undefined,
    citationCount: paper.citationCount,
  };
}

/**
 * Convert Cochrane review to SearchResult
 */
function convertCochraneToSearchResult(review: CochraneReview): SearchResult {
  return {
    source: 'cochrane',
    id: review.id,
    doi: review.doi,
    title: review.title,
    abstract: review.abstract,
    authors: review.authors,
    year: review.publicationYear,
    journal: 'Cochrane Database of Systematic Reviews',
  };
}

/**
 * Re-export sub-modules for external use
 */
export {
  generateSearchStrategy,
  buildPubMedSearchURL,
  buildSemanticScholarParams,
  formatSearchStrategySummary,
} from './search.js';

export {
  searchPubMed,
  fetchPubMedAbstracts,
  type PubMedArticle,
} from './pubmed.js';

export {
  searchSemanticScholar,
  getPaperDetails,
  getRelatedPapers,
  getRateLimiterUsage,
  type SemanticScholarPaper,
} from './semantic-scholar.js';

export {
  searchCochrane,
  parseCochraneResponse,
  cochraneToProcessedArticle,
  convertCochraneReviews,
  type CochraneReview,
  CochraneError,
} from './cochrane.js';

export {
  deduplicateResults,
  matchByDOI,
  matchByPMID,
  matchByTitleSimilarity,
  type SearchResult,
  type UnifiedPaper,
} from './deduplication.js';

export {
  rankArticles,
  calculateRelevanceScore,
  type RankedPaper,
  type ProjectContext,
} from './ranking.js';

export {
  processArticle,
  categorizeByRelevance,
} from './processing.js';

export {
  synthesizeEvidence,
  generateBackgroundDraft,
} from './synthesis.js';

export {
  formatVancouverCitation,
  formatAuthors,
  abbreviateJournalName,
  formatCitations,
  generateBibTeX,
  exportCitationsJSON,
  exportCitationsBibTeX,
  generateNumberedCitationList,
} from './citations.js';

export {
  analyzeGaps,
  identifyKnowledgeGaps,
  identifyMethodologyGaps,
  identifyPopulationGaps,
  crossReferenceWithProject,
  generateOpportunities,
  generateRecommendations,
} from './gaps.js';
