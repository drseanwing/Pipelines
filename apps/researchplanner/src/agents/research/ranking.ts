/**
 * Research Article Relevance Ranking
 * Phase 5.7 - Ranking and Deduplication
 */

import { callLLM, parseJSONResponse } from '../../utils/llm.js';
import type { UnifiedPaper } from './deduplication.js';

/**
 * Project context for relevance evaluation
 */
export interface ProjectContext {
  clinical_problem: string;
  target_population: string;
  intended_outcomes: string;
  concept_description: string;
}

/**
 * Ranked paper with composite relevance score
 */
export interface RankedPaper extends UnifiedPaper {
  relevance_score: number; // Composite score (0.0 - 1.0)
  llm_relevance: number; // LLM-assessed relevance (0.0 - 1.0)
  recency_weight: number; // Recency weight (0.0 - 1.0)
  citation_weight: number; // Citation weight (0.0 - 1.0)
}

/**
 * LLM response for relevance scoring
 */
interface RelevanceScoreResponse {
  score: number;
  reasoning: string;
}

/**
 * Rank articles by relevance to project context
 * @param papers - Array of unified papers from search results
 * @param projectContext - Project context for relevance evaluation
 * @returns Array of ranked papers sorted by composite relevance score (highest first)
 */
export async function rankArticles(
  papers: UnifiedPaper[],
  projectContext: ProjectContext
): Promise<RankedPaper[]> {
  const rankedPapers: RankedPaper[] = [];

  // Process each paper
  for (const paper of papers) {
    // Calculate LLM-based relevance score
    const llmScore = await calculateRelevanceScore(paper, projectContext);

    // Calculate recency weight
    const recencyWeight = calculateRecencyWeight(paper.year);

    // Calculate citation weight
    const citationWeight = calculateCitationWeight(paper.citation_count || 0);

    // Compute composite score
    const compositeScore = computeCompositeScore(
      llmScore,
      recencyWeight,
      citationWeight
    );

    // Create ranked paper
    const rankedPaper: RankedPaper = {
      ...paper,
      relevance_score: compositeScore,
      llm_relevance: llmScore,
      recency_weight: recencyWeight,
      citation_weight: citationWeight,
    };

    rankedPapers.push(rankedPaper);
  }

  // Sort by composite relevance score (highest first)
  rankedPapers.sort((a, b) => b.relevance_score - a.relevance_score);

  return rankedPapers;
}

/**
 * Calculate LLM-based relevance score for a paper
 * @param paper - Paper to score
 * @param projectContext - Project context for evaluation
 * @returns Relevance score from 0.0 (not relevant) to 1.0 (highly relevant)
 */
export async function calculateRelevanceScore(
  paper: UnifiedPaper,
  projectContext: ProjectContext
): Promise<number> {
  const prompt = `You are evaluating the relevance of a research article to a clinical research project.

PROJECT CONTEXT:
- Clinical Problem: ${projectContext.clinical_problem}
- Target Population: ${projectContext.target_population}
- Intended Outcomes: ${projectContext.intended_outcomes}
- Concept Description: ${projectContext.concept_description}

ARTICLE TO EVALUATE:
- Title: ${paper.title}
- Authors: ${paper.authors.join(', ')}
- Journal: ${paper.journal} (${paper.year})
- Abstract: ${paper.abstract}

TASK:
Evaluate how relevant this article is to the project context. Consider:
1. Does the article address the same or similar clinical problem?
2. Does it study the same or similar target population?
3. Does it measure relevant outcomes?
4. Does it use methods or interventions applicable to the project concept?
5. Does it provide evidence that would inform the project design?

RESPONSE FORMAT:
Return a JSON object with:
{
  "score": <number between 0.0 and 1.0>,
  "reasoning": "<brief explanation of score>"
}

SCORING SCALE:
- 0.9-1.0: Highly relevant - directly addresses the same problem, population, and outcomes
- 0.7-0.8: Very relevant - addresses similar problem with comparable population or methods
- 0.5-0.6: Moderately relevant - related area but different population or outcomes
- 0.3-0.4: Somewhat relevant - tangentially related, provides limited insights
- 0.0-0.2: Not relevant - different problem, population, or methods

Provide your evaluation:`;

  const systemPrompt = `You are an expert clinical research methodologist evaluating article relevance.
Be precise and objective in your scoring. Consider both the methodological quality and topical relevance.`;

  try {
    const response = await callLLM(prompt, {
      systemPrompt,
      temperature: 0.3, // Lower temperature for consistent scoring
      maxTokens: 500,
    });

    const parsed = parseJSONResponse<RelevanceScoreResponse>(response);

    // Validate score is in range
    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 1) {
      console.warn(
        `Invalid relevance score ${parsed.score} for paper ${paper.title}. Defaulting to 0.5.`
      );
      return 0.5;
    }

    return parsed.score;
  } catch (error) {
    console.error(
      `Error calculating relevance score for paper ${paper.title}:`,
      error
    );
    // Default to moderate relevance on error
    return 0.5;
  }
}

/**
 * Calculate recency weight based on publication year
 * More recent publications receive higher weight
 * @param year - Publication year
 * @returns Recency weight from 0.0 to 1.0
 */
export function calculateRecencyWeight(year: number): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  // Papers from current year or future get max weight
  if (age <= 0) {
    return 1.0;
  }

  // Exponential decay with half-life of 5 years
  // After 5 years, weight is 0.5
  // After 10 years, weight is 0.25
  // After 20 years, weight is ~0.06
  const halfLife = 5;
  const weight = Math.pow(0.5, age / halfLife);

  // Ensure minimum weight of 0.1 for very old papers
  return Math.max(0.1, weight);
}

/**
 * Calculate citation weight based on citation count
 * More citations = higher weight, but with diminishing returns
 * @param citationCount - Number of citations
 * @returns Citation weight from 0.0 to 1.0
 */
export function calculateCitationWeight(citationCount: number): number {
  // No citations = baseline weight
  if (citationCount <= 0) {
    return 0.3;
  }

  // Logarithmic scaling with diminishing returns
  // log10(1) = 0 → weight = 0.3
  // log10(10) = 1 → weight = 0.5
  // log10(100) = 2 → weight = 0.7
  // log10(1000) = 3 → weight = 0.9
  // log10(10000) = 4 → weight = 1.0

  const logCitations = Math.log10(citationCount);

  // Map log scale to 0.3-1.0 range
  const weight = 0.3 + (logCitations / 4) * 0.7;

  // Cap at 1.0
  return Math.min(1.0, weight);
}

/**
 * Compute composite relevance score from individual components
 * @param llmScore - LLM-assessed relevance (0.0 - 1.0)
 * @param recencyWeight - Recency weight (0.0 - 1.0)
 * @param citationWeight - Citation weight (0.0 - 1.0)
 * @returns Composite score (0.0 - 1.0)
 */
export function computeCompositeScore(
  llmScore: number,
  recencyWeight: number,
  citationWeight: number
): number {
  // Weighted average:
  // - LLM relevance: 60% (primary factor)
  // - Recency: 25% (important for current practice)
  // - Citations: 15% (indicates impact, but shouldn't dominate)

  const composite =
    llmScore * 0.6 + recencyWeight * 0.25 + citationWeight * 0.15;

  // Ensure result is in valid range
  return Math.max(0.0, Math.min(1.0, composite));
}

/**
 * Rank and deduplicate search results
 * Removes duplicate papers (same DOI or PMID) keeping highest-scored version
 * @param papers - Array of papers from search results
 * @param projectContext - Project context for relevance evaluation
 * @returns Deduplicated and ranked papers
 */
export async function rankAndDeduplicateResults(
  papers: UnifiedPaper[],
  projectContext: ProjectContext
): Promise<RankedPaper[]> {
  // First, rank all papers
  const rankedPapers = await rankArticles(papers, projectContext);

  // Deduplicate by DOI and PMID
  const seen = new Set<string>();
  const deduplicated: RankedPaper[] = [];

  for (const paper of rankedPapers) {
    // Create deduplication key
    const keys: string[] = [];

    if (paper.doi) {
      keys.push(`doi:${paper.doi.toLowerCase().trim()}`);
    }

    if (paper.pmid) {
      keys.push(`pmid:${paper.pmid.trim()}`);
    }

    // If no identifiers, use normalized title as fallback
    if (keys.length === 0) {
      const normalizedTitle = paper.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 100);
      keys.push(`title:${normalizedTitle}`);
    }

    // Check if we've seen any of these identifiers
    const isDuplicate = keys.some((key) => seen.has(key));

    if (!isDuplicate) {
      // Mark all identifiers as seen
      keys.forEach((key) => seen.add(key));
      deduplicated.push(paper);
    }
  }

  return deduplicated;
}
