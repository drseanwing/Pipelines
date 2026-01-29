/**
 * Classification Prompts
 *
 * Prompt templates for classifying projects as QI, RESEARCH, or HYBRID.
 * Based on the QI/Research Project Development Pipeline specification.
 */

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export interface ClassificationInput {
  conceptDescription: string;
  clinicalProblem: string;
  intendedOutcomes: string;
  targetPopulation?: string;
  setting?: string;
}

export interface ClassificationOutput {
  classification: 'QI' | 'RESEARCH' | 'HYBRID';
  confidence: number;
  reasoning: string;
  suggestedDesigns: string[];
  reportingGuideline: string;
  ethicsPathwayIndicator: 'QI_REGISTRATION' | 'LOW_RISK_RESEARCH' | 'FULL_HREC_REVIEW' | 'HYBRID_REVIEW';
}

// -----------------------------------------------------------------------------
// System Prompts
// -----------------------------------------------------------------------------

export const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert in healthcare research methodology and quality improvement, specializing in Australian healthcare regulatory frameworks including NHMRC National Statement requirements and Queensland Health governance policies.

Your role is to analyze project concepts and accurately classify them according to established criteria. You have extensive experience distinguishing between Quality Improvement initiatives and formal research projects in clinical settings.

Key principles you apply:
1. QI projects focus on local process improvement without generating generalizable knowledge
2. Research projects aim to generate new knowledge that can be applied beyond the local context
3. Hybrid projects contain elements of both and require careful pathway determination
4. Classification has significant implications for ethics approval pathways and timelines

Always provide structured JSON responses as specified. Be precise in your reasoning and conservative in confidence scores when projects have ambiguous characteristics.`;

// -----------------------------------------------------------------------------
// User Prompt Templates
// -----------------------------------------------------------------------------

/**
 * Generates the user prompt for project classification
 */
export function classifyProjectPrompt(input: ClassificationInput): string {
  return `Analyze the following project concept and classify it appropriately.

## Project Concept
${input.conceptDescription}

## Clinical Problem
${input.clinicalProblem}

## Intended Outcomes
${input.intendedOutcomes}

${input.targetPopulation ? `## Target Population\n${input.targetPopulation}\n` : ''}
${input.setting ? `## Clinical Setting\n${input.setting}\n` : ''}

## Classification Criteria

### Quality Improvement (QI)
- Primary aim is to improve local processes, outcomes, or patient experience
- No intention to generate generalizable knowledge
- Uses established QI methodologies (PDSA, Lean, Six Sigma, etc.)
- Results intended for local use and improvement
- Typically involves implementing known best practices
- Changes are made iteratively based on local data

### Research
- Primary aim is to generate new generalizable knowledge
- Systematic investigation designed to develop or contribute to knowledge
- Results intended for publication and broader application
- May involve experimental manipulation or control groups
- Hypothesis-driven with predetermined endpoints
- Findings expected to inform practice beyond the local setting

### Hybrid
- Elements of both QI and research
- Local improvement with secondary aim of generalization
- May start as QI with potential to become research
- Novel interventions being tested with intent to publish
- Requires careful consideration of both pathways

## Task
Analyze this project and provide:
1. Classification as QI, RESEARCH, or HYBRID
2. Confidence score (0.0-1.0) reflecting certainty in the classification
3. Detailed reasoning for the classification
4. Suggested study designs appropriate for this project type
5. Recommended reporting guideline (SQUIRE for QI, CONSORT/STROBE/etc. for research)
6. Indicator for likely ethics approval pathway

Respond ONLY with valid JSON in this exact format:
\`\`\`json
{
  "classification": "QI" | "RESEARCH" | "HYBRID",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of classification rationale...",
  "suggestedDesigns": ["Design1", "Design2"],
  "reportingGuideline": "GUIDELINE_NAME",
  "ethicsPathwayIndicator": "QI_REGISTRATION" | "LOW_RISK_RESEARCH" | "FULL_HREC_REVIEW" | "HYBRID_REVIEW"
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Design Matrix Reference
// -----------------------------------------------------------------------------

export const STUDY_DESIGN_MATRIX = {
  QI: {
    default: 'PDSA_CYCLE',
    options: ['PDSA_CYCLE', 'IHI_MODEL', 'LEAN_SIX_SIGMA', 'PRE_POST'],
    reportingGuideline: 'SQUIRE'
  },
  RESEARCH: {
    interventional: {
      randomised: {
        default: 'RCT',
        options: ['RCT', 'CLUSTER_RCT', 'STEPPED_WEDGE'],
        reportingGuideline: 'CONSORT'
      },
      nonRandomised: {
        default: 'QUASI_EXPERIMENTAL',
        options: ['PRE_POST', 'ITS', 'CONTROLLED_BA'],
        reportingGuideline: 'TREND'
      }
    },
    observational: {
      default: 'COHORT',
      options: ['COHORT', 'CASE_CONTROL', 'CROSS_SECTIONAL'],
      reportingGuideline: 'STROBE'
    },
    qualitative: {
      default: 'THEMATIC_ANALYSIS',
      options: ['THEMATIC', 'GROUNDED_THEORY', 'PHENOMENOLOGY'],
      reportingGuideline: 'SRQR'
    },
    mixedMethods: {
      default: 'CONVERGENT_PARALLEL',
      options: ['CONVERGENT', 'EXPLANATORY_SEQUENTIAL', 'EXPLORATORY'],
      reportingGuideline: 'GRAMMS'
    },
    systematicReview: {
      default: 'SYSTEMATIC_REVIEW',
      options: ['SYSTEMATIC_REVIEW', 'SCOPING_REVIEW', 'META_ANALYSIS'],
      reportingGuideline: 'PRISMA'
    }
  },
  HYBRID: {
    default: 'HYBRID_QI_RESEARCH',
    options: ['IMPLEMENTATION_SCIENCE', 'PRAGMATIC_TRIAL', 'QI_WITH_EVALUATION'],
    reportingGuideline: 'SQUIRE_OR_STARI'
  }
} as const;

// -----------------------------------------------------------------------------
// Validation Prompt
// -----------------------------------------------------------------------------

/**
 * Generates a follow-up prompt to validate uncertain classifications
 */
export function validateClassificationPrompt(
  input: ClassificationInput,
  initialClassification: ClassificationOutput
): string {
  return `Review the following classification and either confirm or revise it.

## Original Project Concept
${input.conceptDescription}

## Clinical Problem
${input.clinicalProblem}

## Intended Outcomes
${input.intendedOutcomes}

## Initial Classification
- Type: ${initialClassification.classification}
- Confidence: ${initialClassification.confidence}
- Reasoning: ${initialClassification.reasoning}

## Validation Questions
Consider these specific questions to validate or revise the classification:

1. **Generalizability Intent**: Is there any stated or implied intention to apply findings beyond the local setting?

2. **Methodology Novelty**: Is the project implementing known best practices (QI) or testing novel approaches (Research)?

3. **Publication Intent**: Is there mention of publishing results in peer-reviewed literature?

4. **Control Groups**: Does the design involve comparison or control groups beyond simple pre-post?

5. **Hypothesis Testing**: Is there a formal hypothesis being tested with predetermined statistical analysis?

6. **Knowledge Gap**: Is this filling a gap in the published literature or improving local performance?

Based on this review, provide your final classification:

Respond ONLY with valid JSON in this exact format:
\`\`\`json
{
  "classification": "QI" | "RESEARCH" | "HYBRID",
  "confidence": 0.0-1.0,
  "reasoning": "Updated reasoning after validation review...",
  "suggestedDesigns": ["Design1", "Design2"],
  "reportingGuideline": "GUIDELINE_NAME",
  "ethicsPathwayIndicator": "QI_REGISTRATION" | "LOW_RISK_RESEARCH" | "FULL_HREC_REVIEW" | "HYBRID_REVIEW",
  "validationNotes": "Key factors that confirmed or changed the classification..."
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Parses the LLM response and extracts the classification JSON
 */
export function parseClassificationResponse(response: string): ClassificationOutput {
  // Extract JSON from markdown code block if present
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    const parsed = JSON.parse(jsonString.trim());

    // Validate required fields
    if (!parsed.classification || !['QI', 'RESEARCH', 'HYBRID'].includes(parsed.classification)) {
      throw new Error('Invalid or missing classification field');
    }

    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      throw new Error('Invalid confidence score');
    }

    return {
      classification: parsed.classification,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning || '',
      suggestedDesigns: Array.isArray(parsed.suggestedDesigns) ? parsed.suggestedDesigns : [],
      reportingGuideline: parsed.reportingGuideline || '',
      ethicsPathwayIndicator: parsed.ethicsPathwayIndicator || 'FULL_HREC_REVIEW'
    };
  } catch (error) {
    throw new Error(`Failed to parse classification response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Returns the recommended ethics pathway based on classification
 */
export function getEthicsPathwayRecommendation(classification: ClassificationOutput): {
  pathway: string;
  approvalBody: string;
  requiresHREC: boolean;
  requiresRGO: boolean;
  estimatedTimeline: string;
  requiredForms: string[];
} {
  switch (classification.ethicsPathwayIndicator) {
    case 'QI_REGISTRATION':
      return {
        pathway: 'QI_REGISTRATION',
        approvalBody: 'UNIT_DIRECTOR',
        requiresHREC: false,
        requiresRGO: false,
        estimatedTimeline: '2-4 weeks',
        requiredForms: ['QI_PROJECT_PLAN']
      };

    case 'LOW_RISK_RESEARCH':
      return {
        pathway: 'LOW_RISK_RESEARCH',
        approvalBody: 'HOSPITAL_LNR_COMMITTEE',
        requiresHREC: false,
        requiresRGO: true,
        estimatedTimeline: '4-6 weeks',
        requiredForms: ['LNR_APPLICATION', 'RESEARCH_PROTOCOL', 'SITE_ASSESSMENT']
      };

    case 'FULL_HREC_REVIEW':
      return {
        pathway: 'FULL_HREC_REVIEW',
        approvalBody: 'MN_HREC',
        requiresHREC: true,
        requiresRGO: true,
        estimatedTimeline: '8-16 weeks',
        requiredForms: ['HREC_APPLICATION', 'RESEARCH_PROTOCOL', 'PICF', 'SITE_ASSESSMENT', 'INVESTIGATOR_CV', 'COVER_LETTER']
      };

    case 'HYBRID_REVIEW':
      return {
        pathway: 'HYBRID_REVIEW',
        approvalBody: 'DUAL_REVIEW',
        requiresHREC: true,
        requiresRGO: true,
        estimatedTimeline: '10-16 weeks',
        requiredForms: ['HREC_APPLICATION', 'QI_PROJECT_PLAN', 'RESEARCH_PROTOCOL']
      };

    default:
      return {
        pathway: 'FULL_HREC_REVIEW',
        approvalBody: 'MN_HREC',
        requiresHREC: true,
        requiresRGO: true,
        estimatedTimeline: '8-16 weeks',
        requiredForms: ['HREC_APPLICATION', 'RESEARCH_PROTOCOL', 'PICF']
      };
  }
}
