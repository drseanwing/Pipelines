/**
 * Participant Criteria Definition
 * Phase 6.3 - Participant Criteria Definition
 *
 * Generates participant criteria, recruitment strategies, and population assessments
 * for research protocols based on target population and study design.
 */

import { callLLM } from '../../utils/llm.js';
import type {
  ParticipantSpec,
  Criterion,
  RecruitmentStrategy,
  StudyDesign,
  Site,
} from '../../types/methodology.js';

/**
 * System prompt for participant criteria generation
 */
const PARTICIPANT_SYSTEM_PROMPT = `You are an expert in research methodology and participant selection.

Generate participant criteria that:
- Are specific, measurable, and operationalizable
- Align with the research question and study design
- Balance scientific rigor with recruitment feasibility
- Consider safety, ethics, and regulatory requirements
- Follow best practices for inclusion/exclusion criteria

Format criteria as clear, actionable statements suitable for protocol documentation.`;

/**
 * Define complete participant specification for a study
 *
 * Generates all participant-related components:
 * - Inclusion and exclusion criteria
 * - Recruitment strategy with feasibility assessment
 * - Capacity issues flag
 * - Vulnerable population flag
 *
 * @param targetPopulation - Description of the target population
 * @param studyDesign - Study design specification
 * @param evidenceBase - Summary of relevant evidence informing population selection
 * @param sites - Study sites for recruitment
 * @returns Complete participant specification
 */
export async function defineParticipantCriteria(
  targetPopulation: string,
  studyDesign: StudyDesign,
  evidenceBase: string,
  sites: Site[]
): Promise<ParticipantSpec> {
  // Generate inclusion criteria
  const inclusionCriteria = await generateInclusionCriteria(
    targetPopulation,
    studyDesign,
    evidenceBase
  );

  // Generate exclusion criteria
  const exclusionCriteria = await generateExclusionCriteria(
    targetPopulation,
    studyDesign,
    evidenceBase
  );

  // Create recruitment strategy
  const recruitmentStrategy = await createRecruitmentStrategy(
    targetPopulation,
    sites,
    studyDesign
  );

  // Assess capacity issues
  const capacityIssues = assessCapacityIssues(targetPopulation);

  // Detect vulnerable population
  const vulnerablePopulation = detectVulnerablePopulation(targetPopulation);

  return {
    inclusion_criteria: inclusionCriteria,
    exclusion_criteria: exclusionCriteria,
    recruitment_strategy: recruitmentStrategy,
    capacity_issues: capacityIssues,
    vulnerable_population: vulnerablePopulation,
  };
}

/**
 * Generate inclusion criteria for the target population
 *
 * Creates specific, measurable inclusion criteria based on:
 * - Target population characteristics
 * - Study design requirements (e.g., randomization, blinding)
 * - Evidence-based population definitions
 *
 * @param targetPopulation - Description of target population
 * @param studyDesign - Study design specification
 * @param evidenceBase - Evidence summary for population definition
 * @returns Array of inclusion criteria with rationales
 */
export async function generateInclusionCriteria(
  targetPopulation: string,
  studyDesign: StudyDesign,
  evidenceBase?: string
): Promise<Criterion[]> {
  const prompt = `Generate inclusion criteria for a research study.

TARGET POPULATION:
${targetPopulation}

STUDY DESIGN:
- Type: ${studyDesign.type}
- Subtype: ${studyDesign.subtype || 'N/A'}
- Randomized: ${studyDesign.is_randomised ? 'Yes' : 'No'}
- Blinded: ${studyDesign.is_blinded ? 'Yes' : 'No'}

${evidenceBase ? `EVIDENCE BASE:\n${evidenceBase}\n` : ''}

Generate 4-8 specific, measurable inclusion criteria.

For each criterion, provide:
1. A clear, actionable description (e.g., "Age 18-65 years")
2. A brief rationale explaining why this criterion is important (e.g., "Age range aligns with target population for intervention effectiveness")

Return ONLY a JSON array of objects with this structure:
[
  {
    "description": "Clear, specific criterion statement",
    "rationale": "Brief explanation of importance"
  }
]

Ensure criteria are:
- Specific and measurable
- Relevant to the research question
- Feasible to verify during screening
- Not overly restrictive (balance rigor with recruitment)`;

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2048,
    temperature: 0.3,
    systemPrompt: PARTICIPANT_SYSTEM_PROMPT,
  });

  return parseJSONResponse<Criterion[]>(response);
}

/**
 * Generate exclusion criteria for the target population
 *
 * Creates specific exclusion criteria based on:
 * - Safety considerations
 * - Confounding factors
 * - Study design requirements
 * - Ethical considerations
 *
 * @param targetPopulation - Description of target population
 * @param studyDesign - Study design specification
 * @param evidenceBase - Evidence summary for population definition
 * @returns Array of exclusion criteria with rationales
 */
export async function generateExclusionCriteria(
  targetPopulation: string,
  studyDesign: StudyDesign,
  evidenceBase?: string
): Promise<Criterion[]> {
  const prompt = `Generate exclusion criteria for a research study.

TARGET POPULATION:
${targetPopulation}

STUDY DESIGN:
- Type: ${studyDesign.type}
- Subtype: ${studyDesign.subtype || 'N/A'}
- Randomized: ${studyDesign.is_randomised ? 'Yes' : 'No'}
- Blinded: ${studyDesign.is_blinded ? 'Yes' : 'No'}

${evidenceBase ? `EVIDENCE BASE:\n${evidenceBase}\n` : ''}

Generate 3-6 specific exclusion criteria that identify participants who should NOT be included.

Focus on:
- Safety concerns (e.g., contraindications, high-risk conditions)
- Confounding factors that would compromise study validity
- Inability to provide informed consent
- Practical barriers (e.g., language, geographic access)
- Conditions that would affect intervention delivery or outcome measurement

For each criterion, provide:
1. A clear, actionable description
2. A brief rationale explaining why exclusion is necessary

Return ONLY a JSON array of objects with this structure:
[
  {
    "description": "Clear exclusion criterion statement",
    "rationale": "Brief explanation of why excluded"
  }
]

Ensure criteria are:
- Justified by safety, validity, or ethical concerns
- Not unnecessarily restrictive
- Clearly operationalizable during screening`;

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2048,
    temperature: 0.3,
    systemPrompt: PARTICIPANT_SYSTEM_PROMPT,
  });

  return parseJSONResponse<Criterion[]>(response);
}

/**
 * Create recruitment strategy with feasibility assessment
 *
 * Develops a practical recruitment plan considering:
 * - Target population characteristics
 * - Available study sites
 * - Study design requirements
 * - Expected enrollment rates
 *
 * @param targetPopulation - Description of target population
 * @param sites - Study sites for recruitment
 * @param studyDesign - Study design specification
 * @returns Recruitment strategy with feasibility justification
 */
export async function createRecruitmentStrategy(
  targetPopulation: string,
  sites: Site[],
  studyDesign: StudyDesign
): Promise<RecruitmentStrategy> {
  const siteDescriptions = sites
    .map((site) => `- ${site.name} (${site.type}): ${site.capacity}`)
    .join('\n');

  const prompt = `Design a recruitment strategy for a research study.

TARGET POPULATION:
${targetPopulation}

STUDY SITES:
${siteDescriptions}

STUDY DESIGN:
- Type: ${studyDesign.type}
- Requires randomization: ${studyDesign.is_randomised ? 'Yes' : 'No'}

Generate a recruitment strategy including:
1. Recruitment method (e.g., "Consecutive sampling from eligible clinic patients", "Purposive sampling via community organizations", "Random sampling from hospital registry")
2. List of specific site names to use for recruitment (from the sites provided)
3. Estimated recruitment duration (e.g., "12 months", "6-9 months")
4. Feasibility justification (2-3 sentences explaining why this strategy is realistic and achievable)

Consider:
- Site capacity and patient flow
- Enrollment rates typical for this design type
- Population accessibility
- Study requirements (randomization, blinding)

Return ONLY a JSON object with this structure:
{
  "method": "Specific recruitment method description",
  "sites": ["Site Name 1", "Site Name 2"],
  "estimated_duration": "X months",
  "feasibility_justification": "Clear explanation of why this strategy is achievable based on site capacity and population characteristics"
}`;

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1536,
    temperature: 0.4,
    systemPrompt: PARTICIPANT_SYSTEM_PROMPT,
  });

  return parseJSONResponse<RecruitmentStrategy>(response);
}

/**
 * Assess whether the target population has capacity issues
 *
 * Capacity issues flag studies where participants may have:
 * - Impaired decision-making capacity
 * - Cognitive impairments
 * - Age-related consent considerations (minors, elderly with dementia)
 * - Conditions affecting informed consent
 *
 * @param targetPopulation - Description of target population
 * @returns True if capacity issues are present
 */
export function assessCapacityIssues(targetPopulation: string): boolean {
  const normalizedPopulation = targetPopulation.toLowerCase();

  // Keywords indicating potential capacity issues
  const capacityKeywords = [
    'dementia',
    'alzheimer',
    'cognitive impairment',
    'intellectual disability',
    'developmental delay',
    'severe mental illness',
    'psychosis',
    'schizophrenia',
    'unconscious',
    'coma',
    'sedated',
    'intubated',
    'critically ill',
    'emergency',
    'acute confusion',
    'delirium',
    'stroke with aphasia',
    'severe brain injury',
  ];

  // Age-related capacity issues
  const ageRegex = /\b(?:child(?:ren)?|pediatric|infant|neonat|minor|under\s+18)\b/i;
  const elderlyWithConditionsRegex = /\b(?:elderly|geriatric|aged|older\s+adult).*(?:dementia|cognitive|impair)/i;

  // Check for capacity keywords
  const hasCapacityKeyword = capacityKeywords.some((keyword) =>
    normalizedPopulation.includes(keyword)
  );

  // Check for age-related issues
  const hasAgeIssue = ageRegex.test(normalizedPopulation);

  // Check for elderly with cognitive conditions
  const hasElderlyCognitiveIssue = elderlyWithConditionsRegex.test(targetPopulation);

  return hasCapacityKeyword || hasAgeIssue || hasElderlyCognitiveIssue;
}

/**
 * Detect whether the target population is considered vulnerable
 *
 * Vulnerable populations include:
 * - Children and minors
 * - Pregnant women
 * - Prisoners and institutionalized individuals
 * - Economically or educationally disadvantaged
 * - Ethnic/racial minorities facing discrimination
 * - Individuals with diminished autonomy
 *
 * @param targetPopulation - Description of target population
 * @returns True if vulnerable population detected
 */
export function detectVulnerablePopulation(targetPopulation: string): boolean {
  const normalizedPopulation = targetPopulation.toLowerCase();

  // Vulnerable population categories
  const vulnerableKeywords = [
    // Children
    'child', 'children', 'pediatric', 'infant', 'neonate', 'adolescent',
    'minor', 'youth', 'under 18',

    // Pregnant women
    'pregnant', 'pregnancy', 'maternal', 'prenatal', 'antenatal',

    // Prisoners
    'prisoner', 'incarcerated', 'detention', 'correctional', 'jail', 'prison',

    // Institutionalized
    'institutionalized', 'nursing home', 'residential care', 'long-term care',

    // Cognitive/decision-making impairment
    'dementia', 'alzheimer', 'cognitive impairment', 'intellectual disability',
    'diminished autonomy', 'impaired consent',

    // Economic disadvantage
    'homeless', 'economically disadvantaged', 'low income', 'impoverished',
    'underserved', 'marginalized',

    // Educational disadvantage
    'illiterate', 'low literacy', 'limited education',

    // Emergency/critically ill
    'emergency', 'critically ill', 'unconscious', 'life-threatening',

    // Ethnic/racial minorities (when explicitly mentioned as facing discrimination)
    'discriminated', 'stigmatized', 'oppressed',

    // Refugees/displaced
    'refugee', 'asylum seeker', 'displaced',

    // Substance use disorders
    'substance abuse', 'addiction', 'drug use',
  ];

  // Check for vulnerable population keywords
  return vulnerableKeywords.some((keyword) =>
    normalizedPopulation.includes(keyword)
  );
}

/**
 * Parse JSON from LLM response, handling markdown code blocks
 *
 * @param response - The LLM response text
 * @returns Parsed JSON object
 * @throws Error if JSON is invalid
 */
function parseJSONResponse<T = any>(response: string): T {
  let jsonText = response.trim();

  // Remove markdown code block if present
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(jsonText) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from LLM response: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse: ${jsonText.substring(0, 500)}`
    );
  }
}
