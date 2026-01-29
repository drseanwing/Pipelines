/**
 * Search Strategy Generation Module
 * Phase 5.1 - LLM-based literature search strategy generation
 *
 * Uses Claude API to parse clinical problems into structured search strategies
 * for PubMed, Semantic Scholar, and Cochrane Library. Generates PICO components,
 * MeSH terms, keywords, and platform-specific query strings.
 */

import type { SearchStrategy } from '../../types/research.js';
import { callLLM, parseJSONResponse } from '../../utils/index.js';

/**
 * Search strategy generation prompt template
 * Spec reference: Section 4.1.2
 */
const SEARCH_STRATEGY_PROMPT = `You are an expert medical librarian and systematic review specialist. Generate a comprehensive literature search strategy for the following clinical problem.

## Clinical Problem
{clinical_problem}

## Target Population
{target_population}

## Intended Outcomes
{intended_outcomes}

## Task
1. Parse the clinical problem into PICO components (Population, Intervention, Comparison, Outcome)
2. Generate relevant MeSH (Medical Subject Headings) terms for PubMed
3. Generate a comprehensive list of keywords and synonyms
4. Build a PubMed query string using Boolean operators (AND, OR, NOT) and MeSH terms
5. Build a Semantic Scholar query string optimized for their API
6. Build a Cochrane Library query string if applicable
7. Set appropriate date range (default: last 10 years from today)

## Search Strategy Requirements

### PubMed Query
- Use MeSH terms with [MeSH] qualifier where appropriate
- Use text words with [tiab] qualifier for title/abstract searching
- Combine synonyms with OR operators
- Combine PICO components with AND operators
- Include appropriate study design filters (e.g., Clinical Trial[pt], Meta-Analysis[pt])
- Example: "(diabetes mellitus[MeSH] OR diabetes[tiab]) AND (insulin therapy[MeSH] OR insulin[tiab]) AND (glycemic control[tiab] OR HbA1c[tiab])"

### Semantic Scholar Query
- Use natural language queries optimized for semantic search
- Focus on key concepts and relationships
- Keep query concise but comprehensive
- Example: "insulin therapy diabetes glycemic control HbA1c outcomes"

### Cochrane Library Query
- Use Cochrane-specific MeSH terms and qualifiers
- Focus on systematic reviews and controlled trials
- Use Title Abstract Keyword (TAK) field searching
- Example: "(diabetes mellitus):ti,ab,kw AND (insulin therapy):ti,ab,kw"

### Date Range
- Default: Last 10 years from current date
- Format: ISO 8601 (YYYY-MM-DD)
- Can be adjusted based on research question maturity

## Response Format
Respond in JSON format with the following structure:

\`\`\`json
{
  "pico": {
    "population": "...",
    "intervention": "...",
    "comparison": "...",
    "outcome": "..."
  },
  "mesh_terms": ["...", "..."],
  "keywords": ["...", "..."],
  "pubmed_query": "...",
  "semantic_query": "...",
  "cochrane_query": "...",
  "date_range_years": 10,
  "reasoning": "Brief explanation of search strategy choices"
}
\`\`\``;

/**
 * Interface for PICO components
 */
interface PICOComponents {
  population: string;
  intervention: string;
  comparison: string;
  outcome: string;
}

/**
 * Interface for raw LLM search strategy response
 */
interface SearchStrategyResponse {
  pico: PICOComponents;
  mesh_terms: string[];
  keywords: string[];
  pubmed_query: string;
  semantic_query: string;
  cochrane_query?: string;
  date_range_years: number;
  reasoning: string;
}

/**
 * Generate search strategy using LLM analysis
 *
 * @param clinicalProblem - Clinical problem statement from project intake
 * @param targetPopulation - Target population description
 * @param intendedOutcomes - Intended outcomes description
 * @returns SearchStrategy with query strings and metadata
 *
 * @example
 * ```typescript
 * const strategy = await generateSearchStrategy(
 *   "High HbA1c levels in Type 2 diabetes patients despite standard oral therapy",
 *   "Adults aged 40-70 with Type 2 diabetes on metformin for 6+ months",
 *   "Reduce HbA1c to <7% within 6 months using intensive insulin therapy"
 * );
 * console.log(strategy.pubmed_query);
 * console.log(strategy.mesh_terms); // ["Diabetes Mellitus, Type 2", "Insulin", ...]
 * ```
 */
export async function generateSearchStrategy(
  clinicalProblem: string,
  targetPopulation: string,
  intendedOutcomes: string
): Promise<SearchStrategy> {
  // Build the prompt with template substitution
  const prompt = SEARCH_STRATEGY_PROMPT
    .replace('{clinical_problem}', clinicalProblem)
    .replace('{target_population}', targetPopulation)
    .replace('{intended_outcomes}', intendedOutcomes);

  try {
    // Call LLM with search strategy generation prompt
    const response = await callLLM(prompt, {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.5, // Moderate temperature for creative but consistent search strategies
      maxTokens: 2000,
    });

    // Parse JSON response from LLM
    const parsed = parseJSONResponse<SearchStrategyResponse>(response);

    // Calculate date range (default: last 10 years)
    const currentDate = new Date();
    const yearsAgo = parsed.date_range_years || 10;
    const startDate = new Date(currentDate);
    startDate.setFullYear(currentDate.getFullYear() - yearsAgo);

    // Build search strategy with calculated dates
    const strategy: SearchStrategy = {
      pubmed_query: parsed.pubmed_query,
      semantic_query: parsed.semantic_query,
      cochrane_query: parsed.cochrane_query,
      mesh_terms: parsed.mesh_terms,
      keywords: parsed.keywords,
      date_range: {
        start: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        end: currentDate.toISOString().split('T')[0],
      },
      search_date: currentDate.toISOString(), // Full ISO timestamp
      results_count: 0, // Will be populated during search execution
    };

    // Validate required fields
    validateSearchStrategy(strategy);

    return strategy;

  } catch (error) {
    // If LLM call or parsing fails, throw with context
    throw new Error(`Search strategy generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate search strategy completeness
 *
 * Ensures all required fields are present and non-empty.
 * Throws error if validation fails.
 *
 * @param strategy - Search strategy to validate
 * @throws Error if validation fails
 */
function validateSearchStrategy(strategy: SearchStrategy): void {
  const errors: string[] = [];

  // Check required query strings
  if (!strategy.pubmed_query || strategy.pubmed_query.trim().length === 0) {
    errors.push('PubMed query is empty');
  }

  if (!strategy.semantic_query || strategy.semantic_query.trim().length === 0) {
    errors.push('Semantic Scholar query is empty');
  }

  // Check MeSH terms
  if (!strategy.mesh_terms || strategy.mesh_terms.length === 0) {
    errors.push('No MeSH terms generated');
  }

  // Check keywords
  if (!strategy.keywords || strategy.keywords.length === 0) {
    errors.push('No keywords generated');
  }

  // Check date range
  if (!strategy.date_range?.start || !strategy.date_range?.end) {
    errors.push('Date range is incomplete');
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (strategy.date_range?.start && !dateRegex.test(strategy.date_range.start)) {
    errors.push('Invalid start date format (expected YYYY-MM-DD)');
  }
  if (strategy.date_range?.end && !dateRegex.test(strategy.date_range.end)) {
    errors.push('Invalid end date format (expected YYYY-MM-DD)');
  }

  // Check search date timestamp
  if (!strategy.search_date) {
    errors.push('Search date timestamp is missing');
  }

  // Throw if any validation errors
  if (errors.length > 0) {
    throw new Error(`Search strategy validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Build PubMed eSearch API URL from search strategy
 *
 * Helper function to construct PubMed API URL with query parameters.
 * Spec reference: Section 4.1.2
 *
 * @param strategy - Search strategy with query string
 * @param maxResults - Maximum number of results to retrieve (default: 100)
 * @returns PubMed eSearch API URL
 *
 * @example
 * ```typescript
 * const url = buildPubMedSearchURL(strategy, 50);
 * // Returns: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=...&retmax=50
 * ```
 */
export function buildPubMedSearchURL(
  strategy: SearchStrategy,
  maxResults: number = 100
): string {
  const baseURL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';

  const params = new URLSearchParams({
    db: 'pubmed',
    term: strategy.pubmed_query,
    retmax: maxResults.toString(),
    retmode: 'json',
    datetype: 'pdat', // Publication date
    mindate: strategy.date_range.start.replace(/-/g, '/'), // Format: YYYY/MM/DD
    maxdate: strategy.date_range.end.replace(/-/g, '/'),
    sort: 'relevance',
  });

  return `${baseURL}?${params.toString()}`;
}

/**
 * Build Semantic Scholar API query parameters
 *
 * Helper function to construct Semantic Scholar API query parameters.
 * Spec reference: Section 4.1.2
 *
 * @param strategy - Search strategy with query string
 * @param maxResults - Maximum number of results to retrieve (default: 100)
 * @returns Query parameters object
 *
 * @example
 * ```typescript
 * const params = buildSemanticScholarParams(strategy, 50);
 * // Returns: { query: "...", limit: 50, fields: "...", year: "2015-2025" }
 * ```
 */
export function buildSemanticScholarParams(
  strategy: SearchStrategy,
  maxResults: number = 100
): Record<string, string> {
  const startYear = strategy.date_range.start.substring(0, 4);
  const endYear = strategy.date_range.end.substring(0, 4);

  return {
    query: strategy.semantic_query,
    limit: maxResults.toString(),
    fields: 'paperId,title,abstract,authors,year,citationCount,journal,publicationDate,openAccessPdf',
    year: `${startYear}-${endYear}`,
  };
}

/**
 * Format search strategy summary for display
 *
 * Creates a human-readable summary of the search strategy.
 *
 * @param strategy - Search strategy to summarize
 * @returns Formatted summary string
 *
 * @example
 * ```typescript
 * const summary = formatSearchStrategySummary(strategy);
 * console.log(summary);
 * // Outputs:
 * // Search Strategy Summary
 * // ======================
 * // Search Date: 2025-01-28
 * // Date Range: 2015-01-28 to 2025-01-28
 * // ...
 * ```
 */
export function formatSearchStrategySummary(strategy: SearchStrategy): string {
  const lines: string[] = [
    'Search Strategy Summary',
    '======================',
    '',
    `Search Date: ${strategy.search_date.substring(0, 10)}`,
    `Date Range: ${strategy.date_range.start} to ${strategy.date_range.end}`,
    '',
    `MeSH Terms (${strategy.mesh_terms.length}):`,
    ...strategy.mesh_terms.map(term => `  - ${term}`),
    '',
    `Keywords (${strategy.keywords.length}):`,
    ...strategy.keywords.map(kw => `  - ${kw}`),
    '',
    'PubMed Query:',
    `  ${strategy.pubmed_query}`,
    '',
    'Semantic Scholar Query:',
    `  ${strategy.semantic_query}`,
  ];

  if (strategy.cochrane_query) {
    lines.push('', 'Cochrane Query:', `  ${strategy.cochrane_query}`);
  }

  if (strategy.results_count > 0) {
    lines.push('', `Results Retrieved: ${strategy.results_count}`);
  }

  return lines.join('\n');
}
