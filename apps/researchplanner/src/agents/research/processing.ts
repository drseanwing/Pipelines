/**
 * Research Article Processing
 * Phase 5.8 - Article Processing and Extraction
 */

import { callLLM, parseJSONResponse } from '../../utils/llm.js';
import type { ProcessedArticle } from '../../types/research.js';
import type { RankedPaper } from './ranking.js';

/**
 * LLM response format for key findings extraction
 */
interface KeyFindingsResponse {
  key_findings: string[];
}

/**
 * LLM response format for methodology notes extraction
 */
interface MethodologyNotesResponse {
  methodology_notes: string;
}

/**
 * LLM response format for limitations extraction
 */
interface LimitationsResponse {
  limitations: string[];
}

/**
 * Process a ranked article into structured ProcessedArticle format
 * Extracts key findings, methodology notes, and limitations using LLM
 * @param paper - Ranked paper to process
 * @returns ProcessedArticle with extracted information
 */
export async function processArticle(paper: RankedPaper): Promise<ProcessedArticle> {
  const abstract = paper.abstract?.trim() || '';

  // Skip LLM extraction for papers with insufficient abstracts
  if (abstract.length < 50) {
    return {
      pmid: paper.pmid,
      doi: paper.doi,
      title: paper.title,
      authors: paper.authors,
      journal: paper.journal,
      year: paper.year,
      abstract: abstract,
      relevance_score: paper.relevance_score,
      key_findings: ['Abstract too short for extraction'],
      methodology_notes: 'Methodology could not be extracted from abstract',
      limitations: ['Limited abstract information available'],
      full_text_available: await checkFullTextAvailability(paper.doi, paper.pmid),
    };
  }

  // Run extraction tasks in parallel for efficiency
  const [keyFindings, methodologyNotes, limitations, fullTextAvailable] = await Promise.all([
    extractKeyFindings(paper.abstract, paper.title),
    extractMethodologyNotes(paper.abstract),
    extractLimitations(paper.abstract),
    checkFullTextAvailability(paper.doi, paper.pmid),
  ]);

  // Build ProcessedArticle object
  const processedArticle: ProcessedArticle = {
    pmid: paper.pmid,
    doi: paper.doi,
    title: paper.title,
    authors: paper.authors,
    journal: paper.journal,
    year: paper.year,
    abstract: paper.abstract,
    relevance_score: paper.relevance_score,
    key_findings: keyFindings,
    methodology_notes: methodologyNotes,
    limitations: limitations,
    full_text_available: fullTextAvailable,
  };

  return processedArticle;
}

/**
 * Extract key findings from article abstract and title using LLM
 * @param abstract - Article abstract text
 * @param title - Article title
 * @returns Array of key findings (3-5 bullet points)
 */
export async function extractKeyFindings(
  abstract: string,
  title: string
): Promise<string[]> {
  const prompt = `Extract the key findings from this research article.

ARTICLE TITLE:
${title}

ARTICLE ABSTRACT:
${abstract}

TASK:
Identify and extract 3-5 key findings from this article. Focus on:
1. Main results or outcomes reported
2. Significant discoveries or insights
3. Clinical or practical implications
4. Quantitative results (effect sizes, statistics) when available
5. Novel contributions to the field

RESPONSE FORMAT:
Return a JSON object with:
{
  "key_findings": [
    "Finding 1 (concise, specific)",
    "Finding 2 (concise, specific)",
    "Finding 3 (concise, specific)"
  ]
}

Each finding should be:
- One clear, complete sentence
- Specific and quantitative when possible
- Focused on results, not methods or background
- Maximum 100 words per finding

Provide your extraction:`;

  const systemPrompt = `You are an expert clinical researcher extracting key findings from research articles.
Focus on concrete results and outcomes. Be precise and objective.`;

  try {
    const response = await callLLM(prompt, {
      model: 'claude-3-5-haiku-20241022', // Faster model for simpler extraction
      systemPrompt,
      temperature: 0.3, // Lower temperature for consistent extraction
      maxTokens: 800,
    });

    const parsed = parseJSONResponse<KeyFindingsResponse>(response);

    // Validate response structure
    if (!Array.isArray(parsed.key_findings) || parsed.key_findings.length === 0) {
      console.warn(
        `Invalid key findings extraction for article "${title}". Using fallback.`
      );
      return [`Main findings: ${abstract.substring(0, 200)}...`];
    }

    return parsed.key_findings;
  } catch (error) {
    console.error(`Error extracting key findings for article "${title}":`, error);
    // Fallback: Return truncated abstract
    return [`Main findings: ${abstract.substring(0, 200)}...`];
  }
}

/**
 * Extract methodology notes from article abstract using LLM
 * @param abstract - Article abstract text
 * @returns Methodology summary (1-2 paragraphs)
 */
export async function extractMethodologyNotes(abstract: string): Promise<string> {
  const prompt = `Extract and summarize the research methodology from this article abstract.

ARTICLE ABSTRACT:
${abstract}

TASK:
Identify and summarize the research methodology described in the abstract. Focus on:
1. Study design (RCT, cohort, case-control, qualitative, etc.)
2. Sample size and population characteristics
3. Intervention or exposure (if applicable)
4. Comparison/control group (if applicable)
5. Primary outcomes or measurements
6. Analysis methods (if mentioned)

RESPONSE FORMAT:
Return a JSON object with:
{
  "methodology_notes": "Concise methodology summary in 1-2 paragraphs"
}

The summary should:
- Be 100-200 words
- Focus on "how" the study was conducted
- Use clear, technical language
- Include sample size if available
- Mention study design explicitly

Provide your extraction:`;

  const systemPrompt = `You are an expert methodologist summarizing research methods.
Be concise and focus on study design, population, and measurement approach.`;

  try {
    const response = await callLLM(prompt, {
      model: 'claude-3-5-haiku-20241022', // Faster model for simpler extraction
      systemPrompt,
      temperature: 0.3,
      maxTokens: 600,
    });

    const parsed = parseJSONResponse<MethodologyNotesResponse>(response);

    // Validate response structure
    if (
      typeof parsed.methodology_notes !== 'string' ||
      parsed.methodology_notes.trim().length === 0
    ) {
      console.warn('Invalid methodology notes extraction. Using fallback.');
      return `Methodology: ${abstract.substring(0, 150)}...`;
    }

    return parsed.methodology_notes;
  } catch (error) {
    console.error('Error extracting methodology notes:', error);
    // Fallback: Return truncated abstract
    return `Methodology: ${abstract.substring(0, 150)}...`;
  }
}

/**
 * Extract study limitations from article abstract using LLM
 * @param abstract - Article abstract text
 * @returns Array of identified limitations (2-4 points)
 */
export async function extractLimitations(abstract: string): Promise<string[]> {
  const prompt = `Identify study limitations from this article abstract.

ARTICLE ABSTRACT:
${abstract}

TASK:
Identify 2-4 limitations or potential weaknesses of this study. Consider:
1. Explicit limitations mentioned in the abstract
2. Methodological constraints (e.g., sample size, study design)
3. Generalizability issues (e.g., specific population, setting)
4. Measurement or data limitations
5. Potential biases or confounders

RESPONSE FORMAT:
Return a JSON object with:
{
  "limitations": [
    "Limitation 1 (specific, actionable)",
    "Limitation 2 (specific, actionable)"
  ]
}

Each limitation should be:
- One clear, complete sentence
- Specific to the study design or execution
- Maximum 75 words
- Constructive (not just criticism)

If no limitations are explicitly stated in the abstract, infer reasonable methodological limitations based on the study design.

Provide your extraction:`;

  const systemPrompt = `You are an expert research methodologist identifying study limitations.
Be objective and constructive. Focus on methodological rigor and generalizability.`;

  try {
    const response = await callLLM(prompt, {
      model: 'claude-3-5-haiku-20241022', // Faster model for simpler extraction
      systemPrompt,
      temperature: 0.3,
      maxTokens: 600,
    });

    const parsed = parseJSONResponse<LimitationsResponse>(response);

    // Validate response structure
    if (!Array.isArray(parsed.limitations) || parsed.limitations.length === 0) {
      console.warn('Invalid limitations extraction. Using fallback.');
      return ['Limitations not explicitly stated in abstract.'];
    }

    return parsed.limitations;
  } catch (error) {
    console.error('Error extracting limitations:', error);
    // Fallback: Generic limitation
    return ['Limitations not explicitly stated in abstract.'];
  }
}

/**
 * Check if full text is available for an article
 * Uses DOI and PMID to check open access status
 * @param doi - Article DOI (optional)
 * @param pmid - Article PubMed ID (optional)
 * @returns True if full text is likely available via open access
 */
export async function checkFullTextAvailability(
  doi?: string,
  pmid?: string
): Promise<boolean> {
  // For now, implement basic heuristic checking
  // Future enhancement: Call Unpaywall API or PubMed Central API

  // If we have a DOI, assume we can attempt full text retrieval
  // This is a placeholder - in production, would call Unpaywall API
  if (doi) {
    // Placeholder: Assume DOI presence indicates potential full text access
    // In real implementation, would check:
    // - Unpaywall API: https://api.unpaywall.org/v2/{doi}
    // - PubMed Central API for PMC availability
    return true; // Conservative estimate
  }

  // If we have PMID, check if it's in PubMed Central
  // Placeholder: Would call PubMed E-utilities to check PMC status
  if (pmid) {
    // In real implementation:
    // - Call PubMed E-utilities to check if article has PMC ID
    // - PMC ID indicates free full text available
    return false; // Conservative estimate without API call
  }

  // No identifiers = assume full text not available
  return false;
}

/**
 * Categorize processed articles into primary and secondary literature
 * Based on relevance score thresholds
 * @param articles - Array of processed articles
 * @returns Object with primary (>0.7) and secondary (0.4-0.7) article arrays
 */
export function categorizeByRelevance(articles: ProcessedArticle[]): {
  primary: ProcessedArticle[];
  secondary: ProcessedArticle[];
} {
  const primary: ProcessedArticle[] = [];
  const secondary: ProcessedArticle[] = [];

  for (const article of articles) {
    if (article.relevance_score > 0.7) {
      // High relevance = primary literature
      primary.push(article);
    } else if (article.relevance_score > 0.4) {
      // Moderate relevance = secondary literature
      secondary.push(article);
    }
    // Below 0.4 = exclude (not included in either category)
  }

  // Sort both arrays by relevance score (highest first)
  primary.sort((a, b) => b.relevance_score - a.relevance_score);
  secondary.sort((a, b) => b.relevance_score - a.relevance_score);

  return { primary, secondary };
}
