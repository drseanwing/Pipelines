/**
 * QI Research Pipeline - Research Agent
 *
 * This agent handles Stage 2 - Research & Literature Review of the QI/Research
 * Project Development Pipeline. It orchestrates literature search, article
 * processing, evidence synthesis, and gap analysis.
 *
 * @module agents/ResearchAgent
 */

import { v4 as uuidv4 } from 'uuid';
import { ProjectRepository } from '../db/repositories/ProjectRepository.js';
import { AuditRepository } from '../db/repositories/AuditRepository.js';
import {
  Project,
  ProjectStatus,
  ResearchStageData,
  SearchStrategy,
  ProcessedArticle,
  GapAnalysis,
  Citation,
  CitationStyle,
  LiteratureSource,
  EvidenceLevel,
  StudyType,
  filterByRelevance,
  sortByRelevance,
} from '../types/index.js';
import { complete } from '../llm/index.js';
import {
  RESEARCH_SYSTEM_PROMPT,
  generateSearchStrategyPrompt,
  rankArticlesPrompt,
  synthesizeEvidencePrompt,
  identifyGapsPrompt,
  parseSearchStrategyResponse,
  parseRankedArticlesResponse,
  parseEvidenceSynthesisResponse,
  parseGapAnalysisResponse,
  formatVancouverCitation,
  type SearchStrategyInput,
  type RankedArticle,
} from '../llm/prompts/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration options for the Research Agent
 */
export interface ResearchAgentConfig {
  /** Minimum relevance score for primary literature (default: 0.7) */
  primaryRelevanceThreshold: number;
  /** Minimum relevance score for secondary literature (default: 0.4) */
  secondaryRelevanceThreshold: number;
  /** Maximum number of articles to process (default: 100) */
  maxArticles: number;
  /** Default date range in years for literature search (default: 5) */
  defaultSearchYears: number;
  /** Enable caching of search results (default: true) */
  enableCaching: boolean;
}

/**
 * Raw article data from literature database APIs
 */
export interface RawArticle {
  pmid?: string;
  doi?: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  abstract: string;
  source: LiteratureSource;
}

/**
 * Search results from a literature database
 */
export interface DatabaseSearchResults {
  source: LiteratureSource;
  articles: RawArticle[];
  totalCount: number;
  query: string;
  searchDate: string;
}

/**
 * Error types specific to the Research Agent
 */
export class ResearchAgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ResearchAgentError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ResearchAgentConfig = {
  primaryRelevanceThreshold: 0.7,
  secondaryRelevanceThreshold: 0.4,
  maxArticles: 100,
  defaultSearchYears: 5,
  enableCaching: true,
};

// ============================================================================
// Research Agent Class
// ============================================================================

/**
 * Research Agent for Stage 2 - Research & Literature Review
 *
 * This agent orchestrates the complete literature review process:
 * 1. Generate search strategies using LLM prompts
 * 2. Execute literature searches (PubMed, Semantic Scholar)
 * 3. Process and rank articles using LLM
 * 4. Synthesize evidence and identify gaps
 * 5. Format citations in Vancouver style
 * 6. Update project record with research data
 *
 * @example
 * ```typescript
 * const researchAgent = new ResearchAgent(projectRepo, auditRepo);
 *
 * // Conduct full research for a project
 * const researchData = await researchAgent.conductResearch(projectId);
 *
 * // Or run individual steps
 * const strategy = await researchAgent.generateSearchStrategy(project);
 * const articles = await researchAgent.searchLiterature(strategy);
 * const rankedArticles = await researchAgent.rankAndFilterArticles(articles, project);
 * ```
 */
export class ResearchAgent {
  private readonly projectRepo: ProjectRepository;
  private readonly auditRepo: AuditRepository;
  private readonly config: ResearchAgentConfig;

  constructor(
    projectRepo: ProjectRepository,
    auditRepo: AuditRepository,
    config: Partial<ResearchAgentConfig> = {}
  ) {
    this.projectRepo = projectRepo;
    this.auditRepo = auditRepo;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Main Entry Point
  // ============================================================================

  /**
   * Conduct complete research and literature review for a project
   *
   * This is the main orchestration method that runs the complete Stage 2 pipeline:
   * 1. Validate project state
   * 2. Generate search strategy
   * 3. Execute literature searches
   * 4. Rank and filter articles
   * 5. Synthesize evidence
   * 6. Identify knowledge gaps
   * 7. Format citations
   * 8. Update project record
   *
   * @param projectId - The project ID to conduct research for
   * @returns Complete research stage data
   * @throws ResearchAgentError if project not found or in invalid state
   */
  async conductResearch(projectId: string): Promise<ResearchStageData> {
    logger.info(`Starting research for project: ${projectId}`);

    // Step 1: Load and validate project
    const project = await this.loadAndValidateProject(projectId);

    // Log the start of research
    await this.auditRepo.logAction({
      projectId,
      action: 'RESEARCH_STARTED',
      details: {
        projectTitle: project.intake.projectTitle,
        projectType: project.classification.project_type,
      },
    });

    try {
      // Step 2: Generate search strategy
      logger.info('Generating search strategy...');
      const searchStrategy = await this.generateSearchStrategy(project);

      // Step 3: Execute literature searches
      logger.info('Executing literature searches...');
      const rawArticles = await this.searchLiterature(searchStrategy);

      // Step 4: Rank and filter articles
      logger.info('Ranking and filtering articles...');
      const rankedArticles = await this.rankAndFilterArticles(rawArticles, project);

      // Step 5: Synthesize evidence
      logger.info('Synthesizing evidence...');
      const evidenceSynthesis = await this.synthesizeEvidence(rankedArticles, project);

      // Step 6: Identify knowledge gaps
      logger.info('Identifying knowledge gaps...');
      const gapAnalysis = await this.identifyGaps(rankedArticles, evidenceSynthesis);

      // Step 7: Format citations
      logger.info('Formatting citations...');
      const citations = await this.formatCitations(rankedArticles);

      // Separate primary and secondary literature based on relevance scores
      const primaryLiterature = filterByRelevance(
        rankedArticles,
        this.config.primaryRelevanceThreshold
      );
      const secondaryLiterature = rankedArticles.filter(
        (article) =>
          article.relevanceScore >= this.config.secondaryRelevanceThreshold &&
          article.relevanceScore < this.config.primaryRelevanceThreshold
      );

      // Update search strategy with final results count
      const finalSearchStrategy: SearchStrategy = {
        ...searchStrategy,
        resultsCount: rankedArticles.length,
      };

      // Build research stage data
      const researchData: ResearchStageData = {
        searchStrategy: finalSearchStrategy,
        primaryLiterature: sortByRelevance(primaryLiterature),
        secondaryLiterature: sortByRelevance(secondaryLiterature),
        gapAnalysis,
        evidenceSynthesis,
        citations,
      };

      // Step 8: Update project record
      await this.updateProjectWithResearchData(projectId, researchData);

      logger.info(`Research completed for project: ${projectId}`, {
        primaryArticles: primaryLiterature.length,
        secondaryArticles: secondaryLiterature.length,
        gapsIdentified: gapAnalysis.identifiedGaps.length,
      });

      return researchData;
    } catch (error) {
      // Log the failure
      await this.auditRepo.logAction({
        projectId,
        action: 'RESEARCH_FAILED',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  // ============================================================================
  // Search Strategy Generation
  // ============================================================================

  /**
   * Generate a comprehensive literature search strategy using LLM
   *
   * Creates database-specific search queries (PubMed, Semantic Scholar, Cochrane)
   * along with MeSH terms, keywords, and suggested filters based on the project
   * intake data.
   *
   * @param project - The project to generate search strategy for
   * @returns Search strategy with queries for multiple databases
   */
  async generateSearchStrategy(project: Project): Promise<SearchStrategy> {
    const { intake } = project;

    // Build input for the search strategy prompt
    const input: SearchStrategyInput = {
      clinicalProblem: intake.clinicalProblem,
      targetPopulation: intake.targetPopulation,
      intendedOutcomes: intake.intendedOutcomes,
      setting: intake.setting,
    };

    // Generate the prompt
    const prompt = generateSearchStrategyPrompt(input);

    // Call LLM to generate search strategy
    const response = await complete(prompt, {
      system: RESEARCH_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Parse the response
    const parsedStrategy = parseSearchStrategyResponse(response);

    // Calculate date range
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - this.config.defaultSearchYears;

    // Build the SearchStrategy object
    const searchStrategy: SearchStrategy = {
      pubmedQuery: parsedStrategy.pubmedQuery,
      semanticQuery: parsedStrategy.semanticScholarQuery,
      cochraneQuery: parsedStrategy.cochraneQuery,
      meshTerms: parsedStrategy.meshTerms,
      keywords: parsedStrategy.keywords,
      dateRange: parsedStrategy.suggestedFilters?.dateRange || {
        start: startYear.toString(),
        end: currentYear.toString(),
      },
      searchDate: new Date().toISOString(),
      resultsCount: 0, // Will be updated after search
      inclusionCriteria: [
        `Studies published ${startYear}-${currentYear}`,
        'English language',
        `Population: ${intake.targetPopulation}`,
        `Setting: ${intake.setting}`,
        ...parsedStrategy.suggestedFilters.studyTypes.map(
          (type: string) => `Study type: ${type}`
        ),
      ],
      exclusionCriteria: [
        'Non-English language publications',
        'Conference abstracts only',
        'Duplicate publications',
        'Non-human studies (unless specified)',
      ],
    };

    logger.debug('Generated search strategy', {
      meshTerms: searchStrategy.meshTerms.length,
      keywords: searchStrategy.keywords.length,
    });

    return searchStrategy;
  }

  // ============================================================================
  // Literature Search Execution
  // ============================================================================

  /**
   * Execute literature searches across multiple databases
   *
   * Searches PubMed and Semantic Scholar using the generated strategy.
   * Note: Actual API calls are stubbed - implement with real APIs.
   *
   * @param strategy - The search strategy to execute
   * @returns Array of processed articles from all sources
   */
  async searchLiterature(strategy: SearchStrategy): Promise<ProcessedArticle[]> {
    const allArticles: ProcessedArticle[] = [];

    // Search PubMed
    logger.debug('Searching PubMed...');
    const pubmedResults = await this.searchPubMed(strategy);
    allArticles.push(...pubmedResults);

    // Search Semantic Scholar
    logger.debug('Searching Semantic Scholar...');
    const semanticResults = await this.searchSemanticScholar(strategy);
    allArticles.push(...semanticResults);

    // Deduplicate articles by DOI and PMID
    const deduplicatedArticles = this.deduplicateArticles(allArticles);

    logger.info(`Literature search complete`, {
      pubmedResults: pubmedResults.length,
      semanticScholarResults: semanticResults.length,
      afterDeduplication: deduplicatedArticles.length,
    });

    return deduplicatedArticles;
  }

  /**
   * Search PubMed database
   *
   * TODO: Implement actual PubMed E-utilities API integration
   * - Use E-search to get PMIDs: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
   * - Use E-fetch to get article details: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
   * - Handle pagination for large result sets
   * - Implement rate limiting (3 requests/second without API key)
   *
   * @param strategy - Search strategy containing PubMed query
   * @returns Array of articles from PubMed
   */
  private async searchPubMed(_strategy: SearchStrategy): Promise<ProcessedArticle[]> {
    // TODO: Implement actual PubMed E-utilities API call
    // For now, return mock/stub data to demonstrate the pipeline

    logger.warn('PubMed API not implemented - returning stub data');

    // Stub implementation - in production, this would call the PubMed API
    const stubArticles: ProcessedArticle[] = [
      // Example stub article structure
      /*
      {
        pmid: '35123456',
        doi: '10.1016/j.example.2025.01.001',
        title: 'Example Article Title from PubMed',
        authors: ['Author A', 'Author B'],
        journal: 'Example Journal',
        year: 2025,
        volume: '10',
        issue: '1',
        pages: '1-10',
        abstract: 'This is an example abstract...',
        relevanceScore: 0, // Will be set during ranking
        keyFindings: [],
        methodologyNotes: '',
        limitations: [],
        fullTextAvailable: false,
        source: LiteratureSource.PUBMED,
        retrievedAt: new Date().toISOString(),
      },
      */
    ];

    return stubArticles;
  }

  /**
   * Search Semantic Scholar database
   *
   * TODO: Implement actual Semantic Scholar API integration
   * - Use Academic Graph API: https://api.semanticscholar.org/graph/v1/paper/search
   * - Handle pagination with offset/limit parameters
   * - Request relevant fields: paperId, title, abstract, authors, venue, year, citationCount
   * - Implement rate limiting (100 requests/5 minutes for public API)
   *
   * @param strategy - Search strategy containing Semantic Scholar query
   * @returns Array of articles from Semantic Scholar
   */
  private async searchSemanticScholar(_strategy: SearchStrategy): Promise<ProcessedArticle[]> {
    // TODO: Implement actual Semantic Scholar API call
    // For now, return mock/stub data to demonstrate the pipeline

    logger.warn('Semantic Scholar API not implemented - returning stub data');

    // Stub implementation - in production, this would call the Semantic Scholar API
    const stubArticles: ProcessedArticle[] = [
      // Example stub article structure
      /*
      {
        doi: '10.1234/example.2025.0001',
        title: 'Example Article Title from Semantic Scholar',
        authors: ['Author C', 'Author D'],
        journal: 'Another Example Journal',
        year: 2024,
        abstract: 'This is another example abstract...',
        relevanceScore: 0, // Will be set during ranking
        keyFindings: [],
        methodologyNotes: '',
        limitations: [],
        fullTextAvailable: true,
        source: LiteratureSource.SEMANTIC_SCHOLAR,
        retrievedAt: new Date().toISOString(),
      },
      */
    ];

    return stubArticles;
  }

  /**
   * Deduplicate articles by DOI and PMID
   *
   * @param articles - Array of articles potentially containing duplicates
   * @returns Deduplicated array of articles
   */
  private deduplicateArticles(articles: ProcessedArticle[]): ProcessedArticle[] {
    const seen = new Set<string>();
    const deduplicated: ProcessedArticle[] = [];

    for (const article of articles) {
      // Create unique key from DOI or PMID
      const key = article.doi || article.pmid || `${article.title}-${article.year}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(article);
      }
    }

    return deduplicated;
  }

  // ============================================================================
  // Article Ranking and Filtering
  // ============================================================================

  /**
   * Rank and filter articles by relevance using LLM
   *
   * Uses the LLM to evaluate each article's relevance to the research question,
   * extract key findings, identify methodology type, and note limitations.
   *
   * @param articles - Array of articles to rank
   * @param project - Project context for relevance assessment
   * @returns Articles with relevance scores and extracted information
   */
  async rankAndFilterArticles(
    articles: ProcessedArticle[],
    project: Project
  ): Promise<ProcessedArticle[]> {
    if (articles.length === 0) {
      logger.warn('No articles to rank');
      return [];
    }

    // Limit articles to process to avoid token limits
    const articlesToProcess = articles.slice(0, this.config.maxArticles);

    // Build ranking input
    const rankingInput = {
      articles: articlesToProcess.map((article) => ({
        pmid: article.pmid,
        doi: article.doi,
        title: article.title,
        authors: article.authors,
        journal: article.journal,
        year: article.year,
        abstract: article.abstract,
      })),
      researchQuestion: project.intake.conceptDescription,
      clinicalProblem: project.intake.clinicalProblem,
      targetPopulation: project.intake.targetPopulation,
    };

    // Generate prompt and call LLM
    const prompt = rankArticlesPrompt(rankingInput);
    const response = await complete(prompt, {
      system: RESEARCH_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 8000,
    });

    // Parse the ranked articles
    const rankedResults = parseRankedArticlesResponse(response);

    // Merge ranking results back into ProcessedArticle format
    const rankedArticles: ProcessedArticle[] = [];

    for (const ranked of rankedResults) {
      // Find the original article
      const original = articlesToProcess.find(
        (a) =>
          (ranked.pmid && a.pmid === ranked.pmid) ||
          (ranked.doi && a.doi === ranked.doi) ||
          a.title === ranked.title
      );

      if (original) {
        rankedArticles.push({
          ...original,
          relevanceScore: ranked.relevanceScore,
          keyFindings: ranked.keyFindings,
          methodologyNotes: ranked.relevanceReasoning,
          limitations: ranked.limitations,
          studyType: this.mapMethodologyToStudyType(ranked.methodologyType),
          evidenceLevel: this.mapApplicabilityToEvidenceLevel(ranked.applicability),
        });
      }
    }

    // Filter by minimum threshold and sort by relevance
    const filteredArticles = filterByRelevance(
      rankedArticles,
      this.config.secondaryRelevanceThreshold
    );

    logger.debug('Article ranking complete', {
      totalProcessed: articlesToProcess.length,
      passedThreshold: filteredArticles.length,
    });

    return sortByRelevance(filteredArticles);
  }

  /**
   * Map methodology type string to StudyType enum
   */
  private mapMethodologyToStudyType(methodology: string): StudyType {
    const methodologyLower = methodology.toLowerCase();

    if (methodologyLower.includes('systematic review')) {return StudyType.SYSTEMATIC_REVIEW;}
    if (methodologyLower.includes('meta-analysis')) {return StudyType.META_ANALYSIS;}
    if (methodologyLower.includes('rct') || methodologyLower.includes('randomized'))
      {return StudyType.RCT;}
    if (methodologyLower.includes('cohort')) {return StudyType.COHORT;}
    if (methodologyLower.includes('case-control') || methodologyLower.includes('case control'))
      {return StudyType.CASE_CONTROL;}
    if (methodologyLower.includes('cross-sectional') || methodologyLower.includes('cross sectional'))
      {return StudyType.CROSS_SECTIONAL;}
    if (methodologyLower.includes('case series')) {return StudyType.CASE_SERIES;}
    if (methodologyLower.includes('case report')) {return StudyType.CASE_REPORT;}
    if (methodologyLower.includes('qualitative')) {return StudyType.QUALITATIVE;}
    if (methodologyLower.includes('mixed')) {return StudyType.MIXED_METHODS;}
    if (methodologyLower.includes('guideline')) {return StudyType.GUIDELINE;}
    if (methodologyLower.includes('editorial')) {return StudyType.EDITORIAL;}

    return StudyType.OTHER;
  }

  /**
   * Map applicability rating to EvidenceLevel
   */
  private mapApplicabilityToEvidenceLevel(applicability: string): EvidenceLevel {
    switch (applicability.toUpperCase()) {
      case 'HIGH':
        return EvidenceLevel.HIGH;
      case 'MODERATE':
        return EvidenceLevel.MODERATE;
      case 'LOW':
        return EvidenceLevel.LOW;
      default:
        return EvidenceLevel.VERY_LOW;
    }
  }

  // ============================================================================
  // Evidence Synthesis
  // ============================================================================

  /**
   * Synthesize evidence from ranked articles using LLM
   *
   * Generates a narrative synthesis of the literature, identifying themes,
   * consistent findings, areas of disagreement, and overall evidence quality.
   *
   * @param articles - Ranked and filtered articles
   * @param project - Project context
   * @returns Evidence synthesis narrative (markdown formatted)
   */
  async synthesizeEvidence(
    articles: ProcessedArticle[],
    project: Project
  ): Promise<string> {
    if (articles.length === 0) {
      return 'No relevant literature was identified for synthesis.';
    }

    // Convert ProcessedArticle to RankedArticle format for the prompt
    const rankedArticles: RankedArticle[] = articles.map((article) => ({
      pmid: article.pmid,
      doi: article.doi,
      title: article.title,
      relevanceScore: article.relevanceScore,
      relevanceReasoning: article.methodologyNotes,
      keyFindings: article.keyFindings,
      methodologyType: article.studyType || 'Unknown',
      limitations: article.limitations,
      applicability:
        article.evidenceLevel === EvidenceLevel.HIGH
          ? 'HIGH'
          : article.evidenceLevel === EvidenceLevel.MODERATE
            ? 'MODERATE'
            : 'LOW',
    }));

    // Build synthesis input
    const synthesisInput = {
      articles: rankedArticles,
      researchQuestion: project.intake.conceptDescription,
      clinicalProblem: project.intake.clinicalProblem,
    };

    // Generate prompt and call LLM
    const prompt = synthesizeEvidencePrompt(synthesisInput);
    const response = await complete(prompt, {
      system: RESEARCH_SYSTEM_PROMPT,
      temperature: 0.5,
      maxTokens: 4000,
    });

    // Parse the synthesis
    const synthesis = parseEvidenceSynthesisResponse(response);

    logger.debug('Evidence synthesis complete', {
      wordCount: synthesis.split(/\s+/).length,
    });

    return synthesis;
  }

  // ============================================================================
  // Gap Analysis
  // ============================================================================

  /**
   * Identify knowledge gaps in the literature using LLM
   *
   * Analyzes the literature to identify gaps in population, intervention,
   * outcome, setting, and methodology that the proposed project could address.
   *
   * @param articles - Ranked and filtered articles
   * @param evidenceSynthesis - Previously generated evidence synthesis
   * @returns Gap analysis with categorized gaps and recommendations
   */
  async identifyGaps(
    articles: ProcessedArticle[],
    evidenceSynthesis: string
  ): Promise<GapAnalysis> {
    // Convert ProcessedArticle to RankedArticle format
    const rankedArticles: RankedArticle[] = articles.map((article) => ({
      pmid: article.pmid,
      doi: article.doi,
      title: article.title,
      relevanceScore: article.relevanceScore,
      relevanceReasoning: article.methodologyNotes,
      keyFindings: article.keyFindings,
      methodologyType: article.studyType || 'Unknown',
      limitations: article.limitations,
      applicability:
        article.evidenceLevel === EvidenceLevel.HIGH
          ? 'HIGH'
          : article.evidenceLevel === EvidenceLevel.MODERATE
            ? 'MODERATE'
            : 'LOW',
    }));

    // Build gap analysis input
    const gapInput = {
      articles: rankedArticles,
      projectConcept: evidenceSynthesis,
      intendedOutcomes: evidenceSynthesis, // Use synthesis as context
    };

    // Generate prompt and call LLM
    const prompt = identifyGapsPrompt(gapInput);
    const response = await complete(prompt, {
      system: RESEARCH_SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 4000,
    });

    // Parse the gap analysis response
    const parsedGaps = parseGapAnalysisResponse(response);

    // Build GapAnalysis object
    const gapAnalysis: GapAnalysis = {
      identifiedGaps: parsedGaps.gaps.map((gap: { description: string; category: string; currentEvidence: string; significance: string; howProjectAddresses: string }) => ({
        description: gap.description,
        category: gap.category.toLowerCase(),
        priority: this.mapSignificanceToPriority(gap.significance),
        supportingEvidence: [gap.currentEvidence],
        suggestedApproach: gap.howProjectAddresses,
      })),
      methodologicalLimitations: parsedGaps.gaps
        .filter((g: { category: string }) => g.category === 'METHODOLOGICAL')
        .map((g: { description: string }) => g.description),
      populationGaps: parsedGaps.gaps
        .filter((g: { category: string }) => g.category === 'POPULATION')
        .map((g: { description: string }) => g.description),
      outcomeGaps: parsedGaps.gaps
        .filter((g: { category: string }) => g.category === 'OUTCOME')
        .map((g: { description: string }) => g.description),
      settingGaps: parsedGaps.gaps
        .filter((g: { category: string }) => g.category === 'SETTING')
        .map((g: { description: string }) => g.description),
      summary: parsedGaps.overallAssessment.justification,
      researchQuestions: [
        parsedGaps.overallAssessment.primaryGap,
        parsedGaps.overallAssessment.noveltyStatement,
      ].filter(Boolean),
    };

    logger.debug('Gap analysis complete', {
      totalGaps: gapAnalysis.identifiedGaps.length,
      highPriorityGaps: gapAnalysis.identifiedGaps.filter((g) => g.priority === 'HIGH').length,
    });

    return gapAnalysis;
  }

  /**
   * Map significance rating to priority
   */
  private mapSignificanceToPriority(significance: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    switch (significance.toUpperCase()) {
      case 'HIGH':
        return 'HIGH';
      case 'MODERATE':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  // ============================================================================
  // Citation Formatting
  // ============================================================================

  /**
   * Format citations for all articles in Vancouver style
   *
   * Creates properly formatted citations for the reference list and
   * in-text citations for use in documents.
   *
   * @param articles - Articles to format citations for
   * @returns Array of formatted citations
   */
  async formatCitations(articles: ProcessedArticle[]): Promise<Citation[]> {
    const citations: Citation[] = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      if (!article) {continue;} // Skip if article is undefined

      const referenceNumber = i + 1;

      // Format the Vancouver citation
      const formattedCitation = formatVancouverCitation({
        authors: article.authors,
        title: article.title,
        journal: article.journal,
        year: article.year,
        volume: article.volume,
        issue: article.issue,
        pages: article.pages,
        doi: article.doi,
      });

      // Generate BibTeX format
      const bibtex = this.generateBibTeX(article, referenceNumber);

      // Generate RIS format
      const ris = this.generateRIS(article);

      const citation: Citation = {
        id: `cite_${uuidv4().substring(0, 8)}`,
        pmid: article.pmid,
        doi: article.doi,
        formattedCitation,
        style: CitationStyle.VANCOUVER,
        bibtex,
        ris,
        inTextCitation: `[${referenceNumber}]`,
        referenceNumber,
      };

      citations.push(citation);
    }

    logger.debug('Citations formatted', { count: citations.length });

    return citations;
  }

  /**
   * Generate BibTeX format for an article
   */
  private generateBibTeX(article: ProcessedArticle, refNum: number): string {
    const key = article.pmid || article.doi?.replace(/[^a-zA-Z0-9]/g, '') || `ref${refNum}`;
    const authors = article.authors.join(' and ');

    return `@article{${key},
  author = {${authors}},
  title = {${article.title}},
  journal = {${article.journal}},
  year = {${article.year}},
  ${article.volume ? `volume = {${article.volume}},` : ''}
  ${article.issue ? `number = {${article.issue}},` : ''}
  ${article.pages ? `pages = {${article.pages}},` : ''}
  ${article.doi ? `doi = {${article.doi}},` : ''}
  ${article.pmid ? `pmid = {${article.pmid}},` : ''}
}`.replace(/\n\s*\n/g, '\n');
  }

  /**
   * Generate RIS format for an article
   */
  private generateRIS(article: ProcessedArticle): string {
    const lines: string[] = [
      'TY  - JOUR',
      ...article.authors.map((author) => `AU  - ${author}`),
      `TI  - ${article.title}`,
      `JO  - ${article.journal}`,
      `PY  - ${article.year}`,
    ];

    if (article.volume) {lines.push(`VL  - ${article.volume}`);}
    if (article.issue) {lines.push(`IS  - ${article.issue}`);}
    if (article.pages) {lines.push(`SP  - ${article.pages}`);}
    if (article.doi) {lines.push(`DO  - ${article.doi}`);}
    if (article.pmid) {lines.push(`AN  - ${article.pmid}`);}
    if (article.abstract) {lines.push(`AB  - ${article.abstract}`);}

    lines.push('ER  - ');

    return lines.join('\n');
  }

  // ============================================================================
  // Project Update
  // ============================================================================

  /**
   * Update the project record with research data and advance status
   *
   * @param projectId - Project ID to update
   * @param researchData - Research stage data to save
   */
  private async updateProjectWithResearchData(
    projectId: string,
    researchData: ResearchStageData
  ): Promise<void> {
    // Update the project with research stage data
    await this.projectRepo.updateStageData(
      projectId,
      'research',
      researchData,
      'ResearchAgent'
    );

    // Update status to RESEARCH_COMPLETE
    await this.projectRepo.updateStatus(
      projectId,
      ProjectStatus.RESEARCH_COMPLETE,
      'ResearchAgent'
    );

    // Log completion
    await this.auditRepo.logAction({
      projectId,
      action: 'RESEARCH_COMPLETED',
      details: {
        primaryArticles: researchData.primaryLiterature.length,
        secondaryArticles: researchData.secondaryLiterature.length,
        totalCitations: researchData.citations.length,
        gapsIdentified: researchData.gapAnalysis.identifiedGaps.length,
      },
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Load and validate project for research
   *
   * @param projectId - Project ID to load
   * @returns The loaded project
   * @throws ResearchAgentError if project not found or in invalid state
   */
  private async loadAndValidateProject(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findById(projectId);

    if (!project) {
      throw new ResearchAgentError(
        `Project not found: ${projectId}`,
        'PROJECT_NOT_FOUND'
      );
    }

    // Validate project is in a valid state for research
    const validStatuses: ProjectStatus[] = [
      ProjectStatus.INTAKE_COMPLETE,
      ProjectStatus.INTAKE_APPROVED,
    ];

    if (!validStatuses.includes(project.status)) {
      throw new ResearchAgentError(
        `Project must be in INTAKE_COMPLETE or INTAKE_APPROVED status to conduct research. Current status: ${project.status}`,
        'INVALID_PROJECT_STATUS',
        { currentStatus: project.status, validStatuses }
      );
    }

    return project;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default ResearchAgent;
