/**
 * Evidence Synthesis for Literature Review
 * Phase 5.9 - Evidence Synthesis
 *
 * Synthesizes processed articles into a coherent narrative review
 * that forms the basis for the protocol's background section.
 */

import { callLLM } from '../../utils/llm.js';
import type { ProcessedArticle, GapAnalysis } from '../../types/research.js';
import type { ProjectContext } from './ranking.js';

/**
 * Synthesis validation result
 */
export interface SynthesisValidation {
  valid: boolean;
  wordCount: number;
  issues: string[];
}

/**
 * Synthesize evidence from processed articles into a narrative review
 *
 * Creates a flowing prose synthesis that:
 * - Summarizes the current state of evidence
 * - Highlights key methodological approaches
 * - Identifies consistent findings across studies
 * - Notes areas of disagreement or conflicting evidence
 * - Connects gaps to the proposed project
 *
 * @param articles - Processed articles to synthesize
 * @param gapAnalysis - Gap analysis results
 * @returns Evidence synthesis narrative (max 1500 words)
 */
export async function synthesizeEvidence(
  articles: ProcessedArticle[],
  gapAnalysis: GapAnalysis
): Promise<string> {
  if (articles.length === 0) {
    throw new Error('Cannot synthesize evidence from empty article list');
  }

  // Generate the synthesis prompt
  const prompt = generateSynthesisPrompt(articles, gapAnalysis);

  // Call LLM with Claude Sonnet for nuanced writing
  const synthesis = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7, // Slightly creative for better prose
    systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
  });

  // Validate the synthesis
  const validation = validateSynthesis(synthesis);

  if (!validation.valid) {
    throw new Error(
      `Invalid synthesis: ${validation.issues.join(', ')}`
    );
  }

  // Warn if over word limit (but don't fail)
  if (validation.wordCount > 1500) {
    console.warn(
      `Synthesis exceeds 1500 word limit (${validation.wordCount} words). Consider editing.`
    );
  }

  return synthesis;
}

/**
 * Generate the LLM prompt for evidence synthesis
 *
 * @param articles - Processed articles to synthesize
 * @param gapAnalysis - Gap analysis results
 * @returns Formatted prompt for LLM
 */
export function generateSynthesisPrompt(
  articles: ProcessedArticle[],
  gapAnalysis: GapAnalysis
): string {
  // Sort articles by relevance score (highest first)
  const sortedArticles = [...articles].sort(
    (a, b) => b.relevance_score - a.relevance_score
  );

  // Separate primary (>0.7) and secondary (0.4-0.7) literature
  const primaryLiterature = sortedArticles.filter(
    (a) => a.relevance_score > 0.7
  );
  const secondaryLiterature = sortedArticles.filter(
    (a) => a.relevance_score >= 0.4 && a.relevance_score <= 0.7
  );

  // Build article summaries
  const primarySummaries = primaryLiterature
    .map((article, index) => formatArticleForPrompt(article, index + 1))
    .join('\n\n');

  const secondarySummaries = secondaryLiterature
    .map((article, index) =>
      formatArticleForPrompt(article, primaryLiterature.length + index + 1)
    )
    .join('\n\n');

  // Format gap analysis
  const gapsSummary = gapAnalysis.identified_gaps
    .map((gap) => `- ${gap.gap_type.toUpperCase()}: ${gap.description} (${gap.severity})`)
    .join('\n');

  const prompt = `
You are synthesizing research literature into a narrative evidence review for a clinical quality improvement or research project proposal.

# Task
Create a flowing prose synthesis (NOT bullet points) that integrates findings from multiple studies into a coherent narrative. This will form the background section of a research protocol.

# Structure Required
Your synthesis MUST follow this exact structure:

## 1. Overview (2-3 paragraphs)
Summarize the current state of knowledge on the topic. What is known? What is the general consensus? Set the context for why this research area matters.

## 2. Key Findings (4-5 paragraphs)
Synthesize the most important findings across studies. Group related findings together. Highlight:
- Consistent findings across multiple studies
- Areas of disagreement or conflicting evidence
- Strength of evidence (number of studies, sample sizes, study quality)
- Clinical or practical implications

## 3. Methodological Approaches (2-3 paragraphs)
Describe the methods commonly used in this research area. What study designs are typical? What are the strengths and limitations of current approaches?

## 4. Knowledge Gaps and Opportunities (2-3 paragraphs)
Connect the identified gaps to the synthesis. Why do these gaps matter? What research questions remain unanswered? How do current limitations point to future research directions?

# Writing Guidelines
- Use flowing prose paragraphs (NO bullet points, NO numbered lists in the body)
- Write in formal academic style suitable for a protocol
- Use past tense for study findings ("Smith et al. found that...")
- Integrate findings across studies rather than listing study-by-study
- Maximum 1500 words total
- Use clear topic sentences for each paragraph
- Maintain logical flow between paragraphs and sections

# Primary Literature (Highly Relevant, Score > 0.7)
${primarySummaries}

# Secondary Literature (Moderately Relevant, Score 0.4-0.7)
${secondarySummaries}

# Identified Knowledge Gaps
${gapsSummary}

Overall Gap Summary: ${gapAnalysis.overall_summary}

# Output Format
Provide ONLY the synthesis text with section headers as shown above. Do NOT include any meta-commentary, preamble, or conclusion beyond the four required sections.
`.trim();

  return prompt;
}

/**
 * Format a single article for inclusion in the synthesis prompt
 *
 * @param article - Article to format
 * @param index - Article number for reference
 * @returns Formatted article summary
 */
function formatArticleForPrompt(article: ProcessedArticle, index: number): string {
  const authors = article.authors.length > 3
    ? `${article.authors.slice(0, 3).join(', ')}, et al.`
    : article.authors.join(', ');

  const id = article.pmid ? `PMID: ${article.pmid}` : article.doi ? `DOI: ${article.doi}` : `Article ${index}`;

  const findings = article.key_findings.length > 0
    ? article.key_findings.map((f) => `  - ${f}`).join('\n')
    : '  (No key findings extracted)';

  const limitations = article.limitations.length > 0
    ? article.limitations.map((l) => `  - ${l}`).join('\n')
    : '  (No limitations noted)';

  return `
[${index}] ${article.title}
${authors} (${article.year}). ${article.journal}.
${id}
Relevance Score: ${article.relevance_score.toFixed(2)}

Abstract: ${article.abstract}

Key Findings:
${findings}

Methodology Notes: ${article.methodology_notes || 'Not specified'}

Limitations:
${limitations}
`.trim();
}

/**
 * Validate synthesis output against constraints
 *
 * Checks:
 * - Not empty
 * - Word count <= 1500
 * - Contains required section headers
 * - Is prose (not bullet points)
 *
 * @param synthesis - Synthesis text to validate
 * @returns Validation result with issues
 */
export function validateSynthesis(synthesis: string): SynthesisValidation {
  const issues: string[] = [];

  // Check not empty
  const trimmed = synthesis.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      wordCount: 0,
      issues: ['Synthesis is empty'],
    };
  }

  // Count words
  const wordCount = trimmed.split(/\s+/).length;

  // Check for required sections (case insensitive)
  const requiredSections = [
    'overview',
    'key findings',
    'methodological approaches',
    'knowledge gaps',
  ];

  const lowerSynthesis = trimmed.toLowerCase();

  for (const section of requiredSections) {
    if (!lowerSynthesis.includes(section)) {
      issues.push(`Missing required section: "${section}"`);
    }
  }

  // Check for excessive bullet points (should be prose)
  const bulletPointLines = trimmed.split('\n').filter((line) =>
    /^\s*[-*•]\s/.test(line)
  ).length;

  if (bulletPointLines > 5) {
    issues.push(
      `Too many bullet points (${bulletPointLines}). Use flowing prose instead.`
    );
  }

  // Check for numbered lists in body (allow in section headers)
  const numberedListLines = trimmed.split('\n').filter((line) =>
    /^\s*\d+\.\s/.test(line) && !line.includes('#')
  ).length;

  if (numberedListLines > 3) {
    issues.push(
      `Too many numbered lists (${numberedListLines}). Use flowing prose instead.`
    );
  }

  return {
    valid: issues.length === 0,
    wordCount,
    issues,
  };
}

/**
 * Generate a draft background section for the protocol
 *
 * Takes the evidence synthesis and formats it for direct inclusion
 * in the protocol document's background section.
 *
 * @param synthesis - Evidence synthesis narrative
 * @param projectContext - Project context for framing
 * @returns Formatted background section draft
 */
export async function generateBackgroundDraft(
  synthesis: string,
  projectContext: ProjectContext
): Promise<string> {
  const prompt = `
You are formatting an evidence synthesis into a protocol background section.

# Task
Reformat the provided synthesis into a polished background section suitable for a clinical research protocol or quality improvement proposal. Add an introductory paragraph that frames the synthesis in terms of the specific project context.

# Project Context
Clinical Problem: ${projectContext.clinical_problem}
Target Population: ${projectContext.target_population}
Intended Outcomes: ${projectContext.intended_outcomes}
Project Concept: ${projectContext.concept_description}

# Evidence Synthesis
${synthesis}

# Output Format
Provide a complete background section with:
1. An opening paragraph (3-4 sentences) that introduces the clinical problem and its significance in the context of this project
2. The evidence synthesis content, slightly reformatted for protocol style if needed
3. A brief concluding paragraph (2-3 sentences) that transitions from the evidence review to the proposed project

Maintain academic tone and formal style. Use past tense for study findings. Keep the total word count under 1800 words.
`.trim();

  const backgroundDraft = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7,
    systemPrompt: 'You are an expert medical writer specializing in research protocols and quality improvement proposals.',
  });

  return backgroundDraft.trim();
}

/**
 * System prompt for synthesis generation
 */
const SYNTHESIS_SYSTEM_PROMPT = `
You are an expert medical writer and clinical researcher specializing in evidence synthesis and systematic reviews.

Your task is to synthesize research literature into a coherent narrative review that will form the background section of a clinical research protocol or quality improvement proposal.

Key principles:
- Integrate findings across studies (don't just summarize study-by-study)
- Use flowing prose paragraphs, not bullet points or lists
- Highlight both consensus and areas of disagreement
- Connect evidence to gaps and research opportunities
- Maintain formal academic style
- Be concise but comprehensive
- Focus on clinical relevance and implications

You have expertise in:
- Evidence synthesis and systematic review methodology
- Clinical research and quality improvement
- Medical writing and scientific communication
- Critical appraisal of research literature
`.trim();
