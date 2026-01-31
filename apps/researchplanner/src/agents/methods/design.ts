/**
 * Study Design Selection Module
 * Phase 6.2 - Study Design Selection
 *
 * Implements the DESIGN_MATRIX constant and study design determination logic
 * with LLM-powered decision making and justification generation.
 */

import { StudyDesign } from '../../types/methodology.js';
import { callLLM, parseJSONResponse } from '../../utils/llm.js';

/**
 * Study Design Decision Matrix
 * Spec reference: Section 3.4.3 (lines 426-467)
 */
export const DESIGN_MATRIX = {
  QI: {
    default: 'PDSA_CYCLE',
    options: ['PDSA_CYCLE', 'IHI_MODEL', 'LEAN_SIX_SIGMA', 'PRE_POST'],
    reporting_guideline: 'SQUIRE',
  },
  RESEARCH: {
    interventional: {
      randomised: {
        default: 'RCT',
        options: ['RCT', 'CLUSTER_RCT', 'STEPPED_WEDGE'],
        reporting_guideline: 'CONSORT',
      },
      non_randomised: {
        default: 'QUASI_EXPERIMENTAL',
        options: ['QUASI_EXPERIMENTAL', 'PRE_POST', 'ITS', 'CONTROLLED_BA'],
        reporting_guideline: 'TREND',
      },
    },
    observational: {
      default: 'COHORT',
      options: ['COHORT', 'CASE_CONTROL', 'CROSS_SECTIONAL'],
      reporting_guideline: 'STROBE',
    },
    qualitative: {
      default: 'THEMATIC_ANALYSIS',
      options: ['THEMATIC_ANALYSIS', 'GROUNDED_THEORY', 'PHENOMENOLOGY'],
      reporting_guideline: 'SRQR',
    },
    mixed_methods: {
      default: 'CONVERGENT_PARALLEL',
      options: ['CONVERGENT_PARALLEL', 'EXPLANATORY_SEQUENTIAL', 'EXPLORATORY'],
      reporting_guideline: 'GRAMMS',
    },
    systematic_review: {
      default: 'SYSTEMATIC_REVIEW',
      options: ['SYSTEMATIC_REVIEW', 'SCOPING_REVIEW', 'META_ANALYSIS'],
      reporting_guideline: 'PRISMA',
    },
  },
} as const;

/**
 * Design type to reporting guideline mapping
 */
const REPORTING_GUIDELINES: Record<string, string> = {
  // QI Designs
  PDSA_CYCLE: 'SQUIRE',
  IHI_MODEL: 'SQUIRE',
  LEAN_SIX_SIGMA: 'SQUIRE',

  // Interventional Randomised
  RCT: 'CONSORT',
  CLUSTER_RCT: 'CONSORT',
  STEPPED_WEDGE: 'CONSORT',

  // Interventional Non-Randomised
  QUASI_EXPERIMENTAL: 'TREND',
  ITS: 'TREND',
  CONTROLLED_BA: 'TREND',

  // Observational
  COHORT: 'STROBE',
  CASE_CONTROL: 'STROBE',
  CROSS_SECTIONAL: 'STROBE',

  // Qualitative
  THEMATIC_ANALYSIS: 'SRQR',
  GROUNDED_THEORY: 'SRQR',
  PHENOMENOLOGY: 'SRQR',

  // Mixed Methods
  CONVERGENT_PARALLEL: 'GRAMMS',
  EXPLANATORY_SEQUENTIAL: 'GRAMMS',
  EXPLORATORY: 'GRAMMS',

  // Systematic Review
  SYSTEMATIC_REVIEW: 'PRISMA',
  SCOPING_REVIEW: 'PRISMA',
  META_ANALYSIS: 'PRISMA',

  // Additional common designs
  PRE_POST: 'SQUIRE', // Can be QI or research, default to SQUIRE
};

/**
 * Design types that are randomised
 */
const RANDOMISED_DESIGNS = new Set(['RCT', 'CLUSTER_RCT', 'STEPPED_WEDGE']);

/**
 * Design types that require sample size calculations
 */
const REQUIRES_SAMPLE_SIZE = new Set([
  'RCT',
  'CLUSTER_RCT',
  'STEPPED_WEDGE',
  'QUASI_EXPERIMENTAL',
  'COHORT',
  'CASE_CONTROL',
  'CROSS_SECTIONAL',
]);

/**
 * Context for study design determination
 */
interface DesignContext {
  projectType: 'QI' | 'RESEARCH' | 'HYBRID';
  researchQuestion: string;
  evidenceGaps?: string[];
  feasibilityConstraints?: {
    timeline?: string;
    budget?: string;
    site_capacity?: string;
    randomisation_feasible?: boolean;
    intervention_feasible?: boolean;
  };
  methodology?: 'interventional' | 'observational' | 'qualitative' | 'mixed_methods' | 'systematic_review';
}

/**
 * Get available design options for a given project type and methodology
 *
 * @param projectType - The project type (QI, RESEARCH, HYBRID)
 * @param methodology - Optional methodology type for research projects
 * @returns Array of valid design option strings
 */
export function getDesignOptions(
  projectType: 'QI' | 'RESEARCH' | 'HYBRID',
  methodology?: 'interventional' | 'observational' | 'qualitative' | 'mixed_methods' | 'systematic_review'
): string[] {
  if (projectType === 'QI') {
    return [...DESIGN_MATRIX.QI.options];
  }

  if (projectType === 'RESEARCH' || projectType === 'HYBRID') {
    if (!methodology) {
      // Return all research options if no methodology specified
      const allOptions: string[] = [];
      allOptions.push(...DESIGN_MATRIX.RESEARCH.interventional.randomised.options);
      allOptions.push(...DESIGN_MATRIX.RESEARCH.interventional.non_randomised.options);
      allOptions.push(...DESIGN_MATRIX.RESEARCH.observational.options);
      allOptions.push(...DESIGN_MATRIX.RESEARCH.qualitative.options);
      allOptions.push(...DESIGN_MATRIX.RESEARCH.mixed_methods.options);
      allOptions.push(...DESIGN_MATRIX.RESEARCH.systematic_review.options);
      return allOptions;
    }

    switch (methodology) {
      case 'interventional':
        return [
          ...DESIGN_MATRIX.RESEARCH.interventional.randomised.options,
          ...DESIGN_MATRIX.RESEARCH.interventional.non_randomised.options,
        ];
      case 'observational':
        return [...DESIGN_MATRIX.RESEARCH.observational.options];
      case 'qualitative':
        return [...DESIGN_MATRIX.RESEARCH.qualitative.options];
      case 'mixed_methods':
        return [...DESIGN_MATRIX.RESEARCH.mixed_methods.options];
      case 'systematic_review':
        return [...DESIGN_MATRIX.RESEARCH.systematic_review.options];
      default:
        return [];
    }
  }

  return [];
}

/**
 * Get the reporting guideline for a specific design type
 *
 * @param designType - The study design type
 * @returns The reporting guideline name (e.g., 'CONSORT', 'STROBE')
 */
export function getReportingGuideline(designType: string): string {
  return REPORTING_GUIDELINES[designType] || 'UNKNOWN';
}

/**
 * Determine the appropriate study design using LLM
 *
 * @param context - The design determination context
 * @returns Promise resolving to complete StudyDesign specification
 */
export async function determineStudyDesign(context: DesignContext): Promise<StudyDesign> {
  const {
    projectType,
    researchQuestion,
    evidenceGaps = [],
    feasibilityConstraints = {},
    methodology,
  } = context;

  // Get available design options
  const availableDesigns = getDesignOptions(projectType, methodology);

  // Build the LLM prompt
  const prompt = buildDesignPrompt(
    projectType,
    researchQuestion,
    evidenceGaps,
    feasibilityConstraints,
    availableDesigns
  );

  // Call LLM for design determination
  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2048,
    temperature: 0.3,
    systemPrompt: DESIGN_DETERMINATION_SYSTEM_PROMPT,
  });

  // Parse the response
  const designDecision = parseJSONResponse<DesignDecisionResponse>(response);

  // Validate design is in available options
  if (!availableDesigns.includes(designDecision.design_type)) {
    throw new Error(
      `LLM selected invalid design type: ${designDecision.design_type}. Must be one of: ${availableDesigns.join(', ')}`
    );
  }

  // Build the StudyDesign object
  const studyDesign: StudyDesign = {
    type: designDecision.design_type,
    subtype: designDecision.subtype,
    reporting_guideline: getReportingGuideline(designDecision.design_type),
    is_randomised: RANDOMISED_DESIGNS.has(designDecision.design_type),
    is_blinded: designDecision.is_blinded,
    blinding_type: designDecision.blinding_type,
    control_type: designDecision.control_type,
    requires_sample_size: REQUIRES_SAMPLE_SIZE.has(designDecision.design_type),
    justification: designDecision.justification,
  };

  return studyDesign;
}

/**
 * Generate a detailed justification for a study design
 *
 * @param design - The study design to justify
 * @param context - Additional context for justification
 * @returns Promise resolving to justification text
 */
export async function generateDesignJustification(
  design: StudyDesign,
  context: {
    researchQuestion: string;
    evidenceGaps?: string[];
    feasibilityConstraints?: Record<string, any>;
    projectType: 'QI' | 'RESEARCH' | 'HYBRID';
  }
): Promise<string> {
  const prompt = `You are a research methodologist tasked with providing a detailed justification for a study design choice.

Research Question: ${context.researchQuestion}

Project Type: ${context.project_type}

Evidence Gaps: ${context.evidenceGaps?.length ? context.evidenceGaps.join('; ') : 'Not specified'}

Feasibility Constraints: ${JSON.stringify(context.feasibilityConstraints || {}, null, 2)}

Selected Study Design:
- Type: ${design.type}
- Subtype: ${design.subtype || 'None'}
- Randomised: ${design.is_randomised ? 'Yes' : 'No'}
- Blinded: ${design.is_blinded ? 'Yes' : 'No'}
- Blinding Type: ${design.blinding_type || 'N/A'}
- Control Type: ${design.control_type || 'N/A'}
- Reporting Guideline: ${design.reporting_guideline}

Write a comprehensive 2-3 paragraph justification that addresses:
1. Why this design is most appropriate for the research question
2. How this design addresses the identified evidence gaps
3. How this design balances scientific rigor with feasibility constraints
4. Why the selected control type and blinding approach are appropriate
5. How this design aligns with reporting standards (${design.reporting_guideline})

Your justification should be suitable for inclusion in a research protocol or grant application.

Respond with ONLY the justification text, no additional commentary.`;

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1024,
    temperature: 0.5,
  });

  return response.trim();
}

/**
 * Build the LLM prompt for design determination
 */
function buildDesignPrompt(
  projectType: string,
  researchQuestion: string,
  evidenceGaps: string[],
  feasibilityConstraints: Record<string, any>,
  availableDesigns: string[]
): string {
  return `You are selecting the most appropriate study design for a research project.

Project Type: ${projectType}

Research Question: ${researchQuestion}

Evidence Gaps: ${evidenceGaps.length > 0 ? evidenceGaps.join('; ') : 'Not specified'}

Feasibility Constraints: ${JSON.stringify(feasibilityConstraints, null, 2)}

Available Design Options: ${availableDesigns.join(', ')}

Instructions:
1. Analyze the research question to determine what type of study would best answer it
2. Consider the evidence gaps that need to be addressed
3. Evaluate feasibility constraints (timeline, budget, randomisation feasibility, etc.)
4. Select the MOST APPROPRIATE design from the available options
5. Determine if the design should be blinded (if applicable)
6. Determine the appropriate control type (if applicable)
7. Provide a brief justification for your choice (2-3 sentences)

Respond with a JSON object in this exact format:
{
  "design_type": "SELECTED_DESIGN",
  "subtype": "OPTIONAL_SUBTYPE",
  "is_blinded": true/false,
  "blinding_type": "SINGLE"|"DOUBLE"|"TRIPLE"|"OPEN_LABEL"|null,
  "control_type": "PLACEBO"|"ACTIVE"|"USUAL_CARE"|"HISTORICAL"|"NONE"|null,
  "justification": "Brief justification for design choice"
}

Important:
- design_type MUST be one of the available options: ${availableDesigns.join(', ')}
- For non-interventional designs, set control_type to null
- For unblinded designs, set blinding_type to "OPEN_LABEL" or null
- Keep justification concise (2-3 sentences)`;
}

/**
 * System prompt for design determination
 */
const DESIGN_DETERMINATION_SYSTEM_PROMPT = `You are an expert research methodologist specializing in study design selection for healthcare research and quality improvement projects.

Your expertise includes:
- Randomized controlled trials (RCTs) and cluster RCTs
- Quasi-experimental designs
- Observational studies (cohort, case-control, cross-sectional)
- Qualitative research methods
- Mixed methods research
- Quality improvement methodologies (PDSA cycles, IHI model, Lean Six Sigma)
- Systematic reviews and meta-analyses

You understand:
- The hierarchy of evidence and when each design is appropriate
- Practical constraints in healthcare settings
- Ethical considerations in study design
- Reporting guidelines (CONSORT, STROBE, SQUIRE, PRISMA, etc.)

You always:
- Match design to research question
- Consider feasibility constraints
- Balance rigor with pragmatism
- Consider ethical implications
- Select designs that can produce actionable evidence

You respond ONLY with valid JSON matching the requested format.`;

/**
 * Interface for LLM design decision response
 */
interface DesignDecisionResponse {
  design_type: string;
  subtype?: string;
  is_blinded: boolean;
  blinding_type?: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'OPEN_LABEL';
  control_type?: 'PLACEBO' | 'ACTIVE' | 'USUAL_CARE' | 'HISTORICAL' | 'NONE';
  justification: string;
}
