/**
 * Gap Analysis Module
 * Phase 5.10 - Research gap identification and analysis
 *
 * Analyzes processed literature to identify knowledge gaps, methodology gaps,
 * population gaps, intervention gaps, and outcome measurement gaps. Cross-references
 * findings with project context to generate actionable recommendations.
 */

import type { ProcessedArticle, GapAnalysis } from '../../types/research.js';
import type { ProjectContext } from './ranking.js';
import { callLLM, parseJSONResponse } from '../../utils/llm.js';

/**
 * Internal gap item structure with detailed metadata
 */
interface GapItem {
  gap_type: 'knowledge' | 'methodology' | 'population' | 'intervention' | 'outcome';
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  relevance_to_project: string;
  supporting_evidence: string[];
}

/**
 * LLM prompt template for knowledge gap identification
 */
const KNOWLEDGE_GAP_PROMPT = `You are an expert research methodologist and systematic reviewer. Analyze the following literature to identify KNOWLEDGE GAPS.

## Literature Summary
{literature_summary}

## Task
Identify gaps in current knowledge by analyzing:
1. What questions remain unanswered in the literature
2. What phenomena are not yet understood
3. What mechanisms are unclear or contested
4. What relationships between variables are unexplored
5. What theoretical frameworks are missing

## Response Format
Respond in JSON format with an array of gap objects:

\`\`\`json
{
  "gaps": [
    {
      "description": "Clear description of what is unknown",
      "severity": "minor | moderate | major",
      "supporting_evidence": ["Quote or citation supporting this gap", "..."]
    }
  ]
}
\`\`\`

Focus on substantive gaps that affect research design, not minor details.`;

/**
 * LLM prompt template for methodology gap identification
 */
const METHODOLOGY_GAP_PROMPT = `You are an expert research methodologist. Analyze the following literature to identify METHODOLOGY GAPS.

## Literature Summary
{literature_summary}

## Task
Identify methodological limitations and gaps by analyzing:
1. Study design limitations (e.g., lack of RCTs, only cross-sectional studies)
2. Measurement instrument gaps (e.g., no validated tools for X)
3. Sample size inadequacies
4. Follow-up duration limitations
5. Lack of control groups or comparators
6. Missing data analysis techniques
7. Lack of standardized protocols

## Response Format
Respond in JSON format with an array of gap objects:

\`\`\`json
{
  "gaps": [
    {
      "description": "Clear description of methodological limitation",
      "severity": "minor | moderate | major",
      "supporting_evidence": ["Evidence from literature", "..."]
    }
  ]
}
\`\`\`

Focus on gaps that limit causal inference and generalizability.`;

/**
 * LLM prompt template for population gap identification
 */
const POPULATION_GAP_PROMPT = `You are an expert in health equity and research methodology. Analyze the following literature to identify POPULATION GAPS.

## Literature Summary
{literature_summary}

## Target Population
{target_population}

## Task
Identify underrepresented or excluded populations by analyzing:
1. Age groups not studied (e.g., pediatric, geriatric)
2. Sex/gender disparities in research
3. Racial and ethnic minorities
4. Geographic populations (rural vs urban, specific regions)
5. Socioeconomic groups
6. Comorbidity profiles
7. Disease severity levels
8. Special populations (pregnant, immunocompromised, etc.)

## Response Format
Respond in JSON format with an array of gap objects:

\`\`\`json
{
  "gaps": [
    {
      "description": "Clear description of underrepresented population",
      "severity": "minor | moderate | major",
      "supporting_evidence": ["Evidence from literature", "..."]
    }
  ]
}
\`\`\`

Focus on gaps relevant to the target population specified above.`;

/**
 * LLM prompt template for cross-referencing with project
 */
const CROSS_REFERENCE_PROMPT = `You are evaluating research gaps in the context of a specific project.

## Project Concept
{project_concept}

## Identified Gaps
{gaps_summary}

## Task
For each gap, determine its relevance to this specific project by:
1. Assessing if the gap is directly addressed by the project
2. Evaluating if the gap creates an opportunity for novel contribution
3. Determining if the gap poses a challenge or limitation
4. Identifying if the gap is tangential and not project-relevant

## Response Format
Respond in JSON format with relevance assessments:

\`\`\`json
{
  "relevance_assessments": [
    {
      "gap_index": 0,
      "relevance_to_project": "2-3 sentence explanation of relevance to this specific project"
    }
  ]
}
\`\`\``;

/**
 * LLM prompt template for opportunity generation
 */
const OPPORTUNITIES_PROMPT = `You are a research strategist identifying opportunities based on literature gaps.

## Project Context
**Clinical Problem:** {clinical_problem}
**Target Population:** {target_population}
**Intended Outcomes:** {intended_outcomes}

## Identified Gaps
{gaps_summary}

## Task
Based on these gaps, identify specific research opportunities for this project:
1. How can this project address identified gaps?
2. What novel contributions can this project make?
3. What unique positioning does this create?
4. What competitive advantages emerge from these gaps?

## Response Format
Respond in JSON format with a list of opportunity statements:

\`\`\`json
{
  "opportunities": [
    "Specific, actionable opportunity statement",
    "..."
  ]
}
\`\`\`

Each opportunity should be concrete, specific, and tied to project goals.`;

/**
 * LLM prompt template for recommendation generation
 */
const RECOMMENDATIONS_PROMPT = `You are a research consultant providing strategic recommendations based on literature gaps.

## Identified Gaps
{gaps_summary}

## Task
Generate actionable recommendations to address these gaps:
1. Methodological recommendations (study design, measurement, analysis)
2. Population recruitment strategies
3. Intervention design considerations
4. Outcome measurement approaches
5. Risk mitigation strategies

## Response Format
Respond in JSON format with a list of recommendation statements:

\`\`\`json
{
  "recommendations": [
    "Specific, actionable recommendation",
    "..."
  ]
}
\`\`\`

Each recommendation should be practical and implementation-focused.`;

/**
 * Analyze research gaps from processed literature
 *
 * Main orchestration function that coordinates all gap analysis steps.
 *
 * @param articles - Array of processed research articles
 * @param projectContext - Project context for relevance evaluation
 * @returns Complete gap analysis with opportunities and recommendations
 *
 * @example
 * ```typescript
 * const gapAnalysis = await analyzeGaps(processedArticles, {
 *   clinical_problem: "High HbA1c despite standard therapy",
 *   target_population: "Adults 40-70 with Type 2 diabetes",
 *   intended_outcomes: "Reduce HbA1c to <7%",
 *   concept_description: "Pilot study testing intensive insulin therapy..."
 * });
 * console.log(gapAnalysis.identified_gaps.length);
 * console.log(gapAnalysis.opportunities);
 * ```
 */
export async function analyzeGaps(
  articles: ProcessedArticle[],
  projectContext: ProjectContext
): Promise<GapAnalysis> {
  // Step 1: Identify different types of gaps in parallel
  const [knowledgeGaps, methodologyGaps, populationGaps] = await Promise.all([
    identifyKnowledgeGaps(articles),
    identifyMethodologyGaps(articles),
    identifyPopulationGaps(articles, projectContext.target_population),
  ]);

  // Step 2: Combine all gaps
  let allGaps: GapItem[] = [
    ...knowledgeGaps.map(g => ({ ...g, gap_type: 'knowledge' as const })),
    ...methodologyGaps.map(g => ({ ...g, gap_type: 'methodology' as const })),
    ...populationGaps.map(g => ({ ...g, gap_type: 'population' as const })),
  ];

  // Step 3: Cross-reference gaps with project concept
  allGaps = await crossReferenceWithProject(allGaps, projectContext.concept_description);

  // Step 4: Generate opportunities and recommendations in parallel
  const [opportunities, recommendations] = await Promise.all([
    generateOpportunities(allGaps, projectContext),
    generateRecommendations(allGaps),
  ]);

  // Step 5: Generate overall summary
  const overallSummary = generateOverallSummary(allGaps, opportunities);

  // Step 6: Build final gap analysis output
  const gapAnalysis: GapAnalysis = {
    identified_gaps: allGaps.map(gap => ({
      gap_type: gap.gap_type,
      description: gap.description,
      severity: gap.severity,
      relevance_to_project: gap.relevance_to_project,
    })),
    opportunities,
    recommendations,
    overall_summary: overallSummary,
  };

  return gapAnalysis;
}

/**
 * Identify knowledge gaps from literature
 *
 * Analyzes what is currently unknown or poorly understood in the research area.
 *
 * @param articles - Array of processed research articles
 * @returns Array of knowledge gap items
 */
export async function identifyKnowledgeGaps(
  articles: ProcessedArticle[]
): Promise<Omit<GapItem, 'gap_type' | 'relevance_to_project'>[]> {
  // Create literature summary from articles
  const literatureSummary = summarizeLiterature(articles);

  // Build prompt
  const prompt = KNOWLEDGE_GAP_PROMPT.replace('{literature_summary}', literatureSummary);

  try {
    // Call LLM for gap identification
    const response = await callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7, // Higher temperature for creative gap identification
      maxTokens: 2048,
    });

    // Parse JSON response
    const parsed = parseJSONResponse<{ gaps: Array<Omit<GapItem, 'gap_type' | 'relevance_to_project'>> }>(response);

    return parsed.gaps;
  } catch (error) {
    throw new Error(`Knowledge gap identification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Identify methodology gaps from literature
 *
 * Analyzes study design limitations, measurement gaps, and methodological weaknesses.
 *
 * @param articles - Array of processed research articles
 * @returns Array of methodology gap items
 */
export async function identifyMethodologyGaps(
  articles: ProcessedArticle[]
): Promise<Omit<GapItem, 'gap_type' | 'relevance_to_project'>[]> {
  // Create literature summary emphasizing methodology
  const literatureSummary = summarizeLiteratureMethodology(articles);

  // Build prompt
  const prompt = METHODOLOGY_GAP_PROMPT.replace('{literature_summary}', literatureSummary);

  try {
    // Call LLM for gap identification
    const response = await callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Parse JSON response
    const parsed = parseJSONResponse<{ gaps: Array<Omit<GapItem, 'gap_type' | 'relevance_to_project'>> }>(response);

    return parsed.gaps;
  } catch (error) {
    throw new Error(`Methodology gap identification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Identify population gaps from literature
 *
 * Analyzes which populations are underrepresented or excluded from existing research.
 *
 * @param articles - Array of processed research articles
 * @param targetPopulation - Target population description from project
 * @returns Array of population gap items
 */
export async function identifyPopulationGaps(
  articles: ProcessedArticle[],
  targetPopulation: string
): Promise<Omit<GapItem, 'gap_type' | 'relevance_to_project'>[]> {
  // Create literature summary focusing on populations studied
  const literatureSummary = summarizeLiteraturePopulations(articles);

  // Build prompt
  const prompt = POPULATION_GAP_PROMPT
    .replace('{literature_summary}', literatureSummary)
    .replace('{target_population}', targetPopulation);

  try {
    // Call LLM for gap identification
    const response = await callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Parse JSON response
    const parsed = parseJSONResponse<{ gaps: Array<Omit<GapItem, 'gap_type' | 'relevance_to_project'>> }>(response);

    return parsed.gaps;
  } catch (error) {
    throw new Error(`Population gap identification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Cross-reference gaps with project concept to determine relevance
 *
 * @param gaps - Array of identified gaps
 * @param projectConcept - Project concept description
 * @returns Gaps with relevance_to_project field populated
 */
export async function crossReferenceWithProject(
  gaps: Omit<GapItem, 'relevance_to_project'>[],
  projectConcept: string
): Promise<GapItem[]> {
  // Create summary of gaps for prompt
  const gapsSummary = gaps
    .map((gap, idx) => `${idx}. [${gap.gap_type}] [${gap.severity}] ${gap.description}`)
    .join('\n');

  // Build prompt
  const prompt = CROSS_REFERENCE_PROMPT
    .replace('{project_concept}', projectConcept)
    .replace('{gaps_summary}', gapsSummary);

  try {
    // Call LLM for relevance assessment
    const response = await callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.5, // Moderate temperature for analytical task
      maxTokens: 3072,
    });

    // Parse JSON response
    const parsed = parseJSONResponse<{
      relevance_assessments: Array<{
        gap_index: number;
        relevance_to_project: string;
      }>;
    }>(response);

    // Merge relevance assessments back into gaps
    const gapsWithRelevance: GapItem[] = gaps.map((gap, idx) => {
      const assessment = parsed.relevance_assessments.find(a => a.gap_index === idx);
      return {
        ...gap,
        gap_type: gap.gap_type as 'knowledge' | 'methodology' | 'population' | 'intervention' | 'outcome',
        relevance_to_project: assessment?.relevance_to_project || 'Relevance not determined',
      };
    });

    return gapsWithRelevance;
  } catch (error) {
    // If cross-referencing fails, return gaps with default relevance
    console.warn(`Cross-referencing failed: ${error instanceof Error ? error.message : String(error)}`);
    return gaps.map(gap => ({
      ...gap,
      gap_type: gap.gap_type as 'knowledge' | 'methodology' | 'population' | 'intervention' | 'outcome',
      relevance_to_project: 'Project relevance could not be automatically determined',
    }));
  }
}

/**
 * Generate research opportunities from identified gaps
 *
 * @param gaps - Array of identified gaps with project relevance
 * @param projectContext - Project context for opportunity generation
 * @returns Array of opportunity statements
 */
export async function generateOpportunities(
  gaps: GapItem[],
  projectContext: ProjectContext
): Promise<string[]> {
  // Create gaps summary
  const gapsSummary = gaps
    .map(gap => `- [${gap.gap_type}] [${gap.severity}] ${gap.description}`)
    .join('\n');

  // Build prompt
  const prompt = OPPORTUNITIES_PROMPT
    .replace('{clinical_problem}', projectContext.clinical_problem)
    .replace('{target_population}', projectContext.target_population)
    .replace('{intended_outcomes}', projectContext.intended_outcomes)
    .replace('{gaps_summary}', gapsSummary);

  try {
    // Call LLM for opportunity generation
    const response = await callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.8, // Higher temperature for creative opportunity identification
      maxTokens: 2048,
    });

    // Parse JSON response
    const parsed = parseJSONResponse<{ opportunities: string[] }>(response);

    return parsed.opportunities;
  } catch (error) {
    throw new Error(`Opportunity generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate actionable recommendations from gaps
 *
 * @param gaps - Array of identified gaps
 * @returns Array of recommendation statements
 */
export async function generateRecommendations(
  gaps: GapItem[]
): Promise<string[]> {
  // Create gaps summary
  const gapsSummary = gaps
    .map(gap => `- [${gap.gap_type}] [${gap.severity}] ${gap.description}`)
    .join('\n');

  // Build prompt
  const prompt = RECOMMENDATIONS_PROMPT.replace('{gaps_summary}', gapsSummary);

  try {
    // Call LLM for recommendation generation
    const response = await callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Parse JSON response
    const parsed = parseJSONResponse<{ recommendations: string[] }>(response);

    return parsed.recommendations;
  } catch (error) {
    throw new Error(`Recommendation generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate overall summary of gap analysis
 *
 * @param gaps - All identified gaps
 * @param opportunities - Generated opportunities
 * @returns Summary text (2-3 paragraphs)
 */
function generateOverallSummary(gaps: GapItem[], opportunities: string[]): string {
  // Count gaps by type
  const gapCounts = {
    knowledge: gaps.filter(g => g.gap_type === 'knowledge').length,
    methodology: gaps.filter(g => g.gap_type === 'methodology').length,
    population: gaps.filter(g => g.gap_type === 'population').length,
    intervention: gaps.filter(g => g.gap_type === 'intervention').length,
    outcome: gaps.filter(g => g.gap_type === 'outcome').length,
  };

  // Count gaps by severity
  const severityCounts = {
    major: gaps.filter(g => g.severity === 'major').length,
    moderate: gaps.filter(g => g.severity === 'moderate').length,
    minor: gaps.filter(g => g.severity === 'minor').length,
  };

  const paragraphs: string[] = [];

  // Paragraph 1: Gap overview
  paragraphs.push(
    `Literature review identified ${gaps.length} substantive gaps across multiple domains: ` +
    `${gapCounts.knowledge} knowledge gaps, ${gapCounts.methodology} methodological gaps, ` +
    `and ${gapCounts.population} population gaps. ` +
    `Of these, ${severityCounts.major} are classified as major gaps requiring significant attention, ` +
    `${severityCounts.moderate} as moderate, and ${severityCounts.minor} as minor.`
  );

  // Paragraph 2: Opportunity summary
  if (opportunities.length > 0) {
    paragraphs.push(
      `These gaps present ${opportunities.length} distinct research opportunities for the proposed project. ` +
      `The most significant opportunities involve addressing underexplored populations, ` +
      `testing novel methodological approaches, and contributing to areas with limited existing evidence.`
    );
  }

  // Paragraph 3: Strategic positioning
  paragraphs.push(
    `Strategic positioning of this project to address identified gaps will enhance its novelty, ` +
    `scientific contribution, and potential for funding success. Priority should be given to ` +
    `major gaps that align closely with project objectives and available resources.`
  );

  return paragraphs.join('\n\n');
}

/**
 * Helper: Summarize literature focusing on key findings and limitations
 */
function summarizeLiterature(articles: ProcessedArticle[]): string {
  return articles
    .slice(0, 20) // Top 20 most relevant articles
    .map(article => {
      const findings = article.key_findings.join('; ');
      const limitations = article.limitations.join('; ');
      return `**${article.title}** (${article.year})\n` +
             `Key findings: ${findings}\n` +
             `Limitations: ${limitations}`;
    })
    .join('\n\n');
}

/**
 * Helper: Summarize literature focusing on methodology
 */
function summarizeLiteratureMethodology(articles: ProcessedArticle[]): string {
  return articles
    .slice(0, 20)
    .map(article => {
      return `**${article.title}** (${article.year})\n` +
             `Methodology: ${article.methodology_notes}\n` +
             `Limitations: ${article.limitations.join('; ')}`;
    })
    .join('\n\n');
}

/**
 * Helper: Summarize literature focusing on populations studied
 */
function summarizeLiteraturePopulations(articles: ProcessedArticle[]): string {
  return articles
    .slice(0, 20)
    .map(article => {
      // Extract population info from methodology notes or abstract
      return `**${article.title}** (${article.year})\n` +
             `Study details: ${article.methodology_notes}\n` +
             `Abstract excerpt: ${article.abstract.substring(0, 200)}...`;
    })
    .join('\n\n');
}
