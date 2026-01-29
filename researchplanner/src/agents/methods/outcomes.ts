/**
 * Outcome Definition Module
 * Phase 6.5 - Define primary and secondary outcomes with validated measurement tools
 */

import { callLLM, parseJSONResponse } from '../../utils/llm.js';
import type {
  OutcomeSpec,
  PrimaryOutcome,
  SecondaryOutcome,
  StudyDesign,
} from '../../types/methodology.js';

/**
 * Validated measurement tool mappings for common healthcare outcomes
 * Maps outcome domains to validated instruments
 */
export const VALIDATED_MEASUREMENT_TOOLS: Record<string, string[]> = {
  // Pain measures
  pain: [
    'Visual Analog Scale (VAS)',
    'Numeric Rating Scale (NRS)',
    'McGill Pain Questionnaire',
    'Brief Pain Inventory (BPI)',
    'PROMIS Pain Intensity Scale',
  ],

  // Quality of Life
  quality_of_life: [
    'SF-36 Health Survey',
    'EQ-5D-5L',
    'WHO Quality of Life (WHOQOL-BREF)',
    'PROMIS Global Health',
  ],

  // Mental Health
  depression: [
    'Patient Health Questionnaire-9 (PHQ-9)',
    'Beck Depression Inventory (BDI-II)',
    'Hamilton Depression Rating Scale (HDRS)',
    'Geriatric Depression Scale (GDS)',
  ],

  anxiety: [
    'Generalized Anxiety Disorder-7 (GAD-7)',
    'Beck Anxiety Inventory (BAI)',
    'Hamilton Anxiety Rating Scale (HAM-A)',
    'State-Trait Anxiety Inventory (STAI)',
  ],

  // Functional outcomes
  functional_status: [
    'Barthel Index',
    'Functional Independence Measure (FIM)',
    'Karnofsky Performance Status',
    'WHO Performance Status',
    'PROMIS Physical Function Scale',
  ],

  mobility: [
    'Timed Up and Go Test (TUG)',
    '6-Minute Walk Test (6MWT)',
    'Berg Balance Scale',
    'Tinetti Mobility Test',
  ],

  // Clinical measures
  blood_pressure: [
    'Automated office blood pressure measurement',
    '24-hour ambulatory blood pressure monitoring',
    'Home blood pressure monitoring',
  ],

  glycemic_control: [
    'HbA1c',
    'Fasting blood glucose',
    'Continuous glucose monitoring (CGM)',
  ],

  mortality: [
    'All-cause mortality',
    'Disease-specific mortality',
  ],

  // Patient satisfaction
  satisfaction: [
    'Patient Satisfaction Questionnaire (PSQ-18)',
    'Hospital Consumer Assessment of Healthcare Providers (HCAHPS)',
    'Net Promoter Score (NPS)',
  ],

  // Readmission
  readmission: [
    '30-day hospital readmission rate',
    '90-day hospital readmission rate',
  ],

  // Infection
  infection: [
    'CDC/NHSN Surveillance Definitions',
    'Clinical diagnosis per protocol',
  ],
};

/**
 * Clinically meaningful difference estimates for common outcomes
 * Based on published minimal clinically important differences (MCIDs)
 */
export const CLINICAL_DIFFERENCE_ESTIMATES: Record<string, number> = {
  // Pain scales (0-10)
  pain_vas: 1.5,
  pain_nrs: 2.0,

  // Quality of life
  sf36_pcs: 5.0,
  sf36_mcs: 5.0,
  eq5d: 0.074,

  // Mental health
  phq9: 5.0,
  gad7: 4.0,
  bdi: 5.0,

  // Functional measures
  barthel_index: 2.0,
  fim: 22.0,
  '6mwt': 50.0, // meters

  // Clinical measures
  hba1c: 0.5, // percentage points
  systolic_bp: 5.0, // mmHg

  // Relative risk reductions
  mortality_rrr: 0.2, // 20% relative risk reduction
  readmission_rrr: 0.15, // 15% relative risk reduction
};

/**
 * Determine appropriate reporting guideline based on study design
 * @param studyDesign - The study design specification
 * @returns Reporting guideline name (e.g., CONSORT, STROBE, SQUIRE)
 */
export function determineReportingGuideline(studyDesign: StudyDesign): string {
  // If already specified, return it
  if (studyDesign.reporting_guideline) {
    return studyDesign.reporting_guideline;
  }

  const designType = studyDesign.type.toUpperCase();

  // Randomized controlled trials
  if (studyDesign.is_randomised) {
    return 'CONSORT';
  }

  // Observational studies
  if (designType.includes('COHORT') || designType.includes('CASE_CONTROL') ||
      designType.includes('CROSS_SECTIONAL')) {
    return 'STROBE';
  }

  // Quality improvement
  if (designType.includes('QI') || designType.includes('PDSA') ||
      designType.includes('QUALITY_IMPROVEMENT')) {
    return 'SQUIRE';
  }

  // Implementation science
  if (designType.includes('IMPLEMENTATION')) {
    return 'StaRI';
  }

  // Diagnostic accuracy
  if (designType.includes('DIAGNOSTIC')) {
    return 'STARD';
  }

  // Default to STROBE for observational designs
  return 'STROBE';
}

/**
 * Suggest validated measurement tool for an outcome
 * @param outcomeName - Name or description of the outcome
 * @param outcomeType - Type of outcome (e.g., 'pain', 'quality_of_life')
 * @returns Suggested measurement tool
 */
export function suggestMeasurementTool(
  outcomeName: string,
  outcomeType?: string
): string {
  const lowerName = outcomeName.toLowerCase();

  // Try explicit outcome type first
  if (outcomeType && VALIDATED_MEASUREMENT_TOOLS[outcomeType]) {
    return VALIDATED_MEASUREMENT_TOOLS[outcomeType][0];
  }

  // Pattern matching on outcome name
  for (const [domain, tools] of Object.entries(VALIDATED_MEASUREMENT_TOOLS)) {
    if (lowerName.includes(domain.replace('_', ' ')) ||
        lowerName.includes(domain)) {
      return tools[0];
    }
  }

  // Specific keyword matching
  if (lowerName.includes('pain')) return VALIDATED_MEASUREMENT_TOOLS.pain[0];
  if (lowerName.includes('depress')) return VALIDATED_MEASUREMENT_TOOLS.depression[0];
  if (lowerName.includes('anxiety')) return VALIDATED_MEASUREMENT_TOOLS.anxiety[0];
  if (lowerName.includes('quality') && lowerName.includes('life')) {
    return VALIDATED_MEASUREMENT_TOOLS.quality_of_life[0];
  }
  if (lowerName.includes('function')) return VALIDATED_MEASUREMENT_TOOLS.functional_status[0];
  if (lowerName.includes('mobility') || lowerName.includes('walk')) {
    return VALIDATED_MEASUREMENT_TOOLS.mobility[0];
  }
  if (lowerName.includes('blood pressure') || lowerName.includes('bp')) {
    return VALIDATED_MEASUREMENT_TOOLS.blood_pressure[0];
  }
  if (lowerName.includes('glucose') || lowerName.includes('hba1c') ||
      lowerName.includes('diabetes')) {
    return VALIDATED_MEASUREMENT_TOOLS.glycemic_control[0];
  }
  if (lowerName.includes('mortality') || lowerName.includes('death')) {
    return VALIDATED_MEASUREMENT_TOOLS.mortality[0];
  }
  if (lowerName.includes('satisfaction')) return VALIDATED_MEASUREMENT_TOOLS.satisfaction[0];
  if (lowerName.includes('readmission')) return VALIDATED_MEASUREMENT_TOOLS.readmission[0];
  if (lowerName.includes('infection')) return VALIDATED_MEASUREMENT_TOOLS.infection[0];

  // Default: prompt for clinical measure
  return 'Clinical measurement per protocol (specify validated tool)';
}

/**
 * Determine measurement timing based on study design and duration
 * @param studyDesign - The study design specification
 * @param duration - Study duration (e.g., '6 months', '1 year')
 * @returns Measurement timing description
 */
export function determineMeasurementTiming(
  studyDesign: StudyDesign,
  duration?: string
): string {
  const designType = studyDesign.type.toUpperCase();

  // For RCTs and interventional studies
  if (studyDesign.is_randomised || designType.includes('RCT') ||
      designType.includes('EXPERIMENTAL')) {
    // Parse duration if provided
    if (duration) {
      const months = parseDurationInMonths(duration);
      if (months <= 3) {
        return 'Baseline, end of intervention (week 12)';
      } else if (months <= 6) {
        return 'Baseline, 3 months, end of intervention (6 months)';
      } else if (months <= 12) {
        return 'Baseline, 3 months, 6 months, 12 months';
      } else {
        return 'Baseline, quarterly assessments, end of study';
      }
    }
    return 'Baseline, mid-intervention, end of intervention, follow-up';
  }

  // For cohort studies
  if (designType.includes('COHORT')) {
    return 'Baseline, annual follow-up assessments';
  }

  // For cross-sectional studies
  if (designType.includes('CROSS_SECTIONAL')) {
    return 'Single time point (enrollment)';
  }

  // For QI/PDSA cycles
  if (designType.includes('PDSA') || designType.includes('QI')) {
    return 'Pre-intervention baseline, monthly during implementation, post-intervention';
  }

  // Default
  return 'Baseline and follow-up per protocol';
}

/**
 * Helper to parse duration string to months
 * @param duration - Duration string (e.g., '6 months', '1 year')
 * @returns Duration in months
 */
function parseDurationInMonths(duration: string): number {
  const lowerDuration = duration.toLowerCase();

  // Extract number
  const numberMatch = lowerDuration.match(/(\d+)/);
  if (!numberMatch) return 12; // default to 12 months

  const value = parseInt(numberMatch[1], 10);

  if (lowerDuration.includes('year')) {
    return value * 12;
  } else if (lowerDuration.includes('week')) {
    return Math.ceil(value / 4);
  } else if (lowerDuration.includes('month')) {
    return value;
  }

  return 12; // default
}

/**
 * Estimate clinically meaningful difference for an outcome
 * @param outcomeName - Name of the outcome
 * @param evidenceBase - Optional evidence base description
 * @returns Estimated clinically meaningful difference
 */
export function estimateClinicallyMeaningfulDifference(
  outcomeName: string,
  evidenceBase?: string
): number | undefined {
  const lowerName = outcomeName.toLowerCase();

  // Try exact matches first
  for (const [key, value] of Object.entries(CLINICAL_DIFFERENCE_ESTIMATES)) {
    if (lowerName.includes(key.replace('_', ' '))) {
      return value;
    }
  }

  // Pattern matching
  if (lowerName.includes('pain')) return CLINICAL_DIFFERENCE_ESTIMATES.pain_nrs;
  if (lowerName.includes('sf-36') || lowerName.includes('sf36')) {
    return CLINICAL_DIFFERENCE_ESTIMATES.sf36_pcs;
  }
  if (lowerName.includes('eq-5d') || lowerName.includes('eq5d')) {
    return CLINICAL_DIFFERENCE_ESTIMATES.eq5d;
  }
  if (lowerName.includes('phq-9') || lowerName.includes('phq9')) {
    return CLINICAL_DIFFERENCE_ESTIMATES.phq9;
  }
  if (lowerName.includes('gad-7') || lowerName.includes('gad7')) {
    return CLINICAL_DIFFERENCE_ESTIMATES.gad7;
  }
  if (lowerName.includes('hba1c')) return CLINICAL_DIFFERENCE_ESTIMATES.hba1c;
  if (lowerName.includes('mortality')) return CLINICAL_DIFFERENCE_ESTIMATES.mortality_rrr;
  if (lowerName.includes('readmission')) return CLINICAL_DIFFERENCE_ESTIMATES.readmission_rrr;

  // If evidence base mentions MCID, suggest it should be specified
  if (evidenceBase && evidenceBase.toLowerCase().includes('mcid')) {
    return undefined; // Let LLM determine from literature
  }

  return undefined;
}

/**
 * Generate primary outcome using LLM
 * @param intendedOutcomes - Description of intended outcomes
 * @param design - Study design specification
 * @returns Generated primary outcome
 */
export async function generatePrimaryOutcome(
  intendedOutcomes: string,
  design: StudyDesign
): Promise<PrimaryOutcome> {
  const reportingGuideline = determineReportingGuideline(design);

  const systemPrompt = `You are a clinical research methodologist specializing in outcome definition.
Your task is to define a single, well-specified PRIMARY outcome for a research study.

Key principles:
- Primary outcome should be the MOST important outcome for answering the research question
- Must be specific, measurable, achievable, relevant, time-bound (SMART)
- Should use validated measurement tools where possible
- Definition must be clear enough for reproducibility
- Only ONE primary outcome (as per ${reportingGuideline} guidelines)

Respond with valid JSON matching this structure:
{
  "name": "string (concise name)",
  "definition": "string (precise operational definition)",
  "measurement_tool": "string (validated instrument/scale)",
  "measurement_timing": "string (when it will be measured)",
  "clinically_meaningful_difference": number (optional, if applicable)
}`;

  const prompt = `Define the PRIMARY outcome for this study:

INTENDED OUTCOMES:
${intendedOutcomes}

STUDY DESIGN:
- Type: ${design.type}
- Randomised: ${design.is_randomised}
- Reporting guideline: ${reportingGuideline}

REQUIREMENTS:
1. Select the SINGLE most important outcome
2. Provide a precise operational definition
3. Specify a validated measurement tool (if available)
4. Define measurement timing
5. Estimate clinically meaningful difference (if applicable)

Return JSON only.`;

  const response = await callLLM(prompt, {
    systemPrompt,
    temperature: 0.3,
    model: 'claude-3-5-sonnet-20241022',
  });

  const primaryOutcome = parseJSONResponse<PrimaryOutcome>(response);

  // Enhance with automated suggestions if not provided
  if (!primaryOutcome.measurement_tool ||
      primaryOutcome.measurement_tool.includes('specify')) {
    primaryOutcome.measurement_tool = suggestMeasurementTool(
      primaryOutcome.name
    );
  }

  if (!primaryOutcome.measurement_timing) {
    primaryOutcome.measurement_timing = determineMeasurementTiming(design);
  }

  if (!primaryOutcome.clinically_meaningful_difference) {
    primaryOutcome.clinically_meaningful_difference =
      estimateClinicallyMeaningfulDifference(primaryOutcome.name);
  }

  return primaryOutcome;
}

/**
 * Generate secondary outcomes using LLM
 * @param intendedOutcomes - Description of intended outcomes
 * @param design - Study design specification
 * @param count - Number of secondary outcomes to generate (default: 2-4)
 * @returns Array of generated secondary outcomes
 */
export async function generateSecondaryOutcomes(
  intendedOutcomes: string,
  design: StudyDesign,
  count?: number
): Promise<SecondaryOutcome[]> {
  const reportingGuideline = determineReportingGuideline(design);
  const targetCount = count || 3;

  const systemPrompt = `You are a clinical research methodologist specializing in outcome definition.
Your task is to define SECONDARY outcomes for a research study.

Key principles:
- Secondary outcomes provide supporting evidence beyond the primary outcome
- Should be specific, measurable, and relevant
- Typically include safety outcomes, mechanistic measures, or exploratory endpoints
- Number of secondary outcomes should be reasonable (2-5 typically)
- Each must use validated measurement tools where possible

Respond with valid JSON array matching this structure:
[
  {
    "name": "string (concise name)",
    "definition": "string (precise operational definition)",
    "measurement_tool": "string (validated instrument/scale)",
    "measurement_timing": "string (when it will be measured)"
  }
]`;

  const prompt = `Define ${targetCount} SECONDARY outcomes for this study:

INTENDED OUTCOMES:
${intendedOutcomes}

STUDY DESIGN:
- Type: ${design.type}
- Randomised: ${design.is_randomised}
- Reporting guideline: ${reportingGuideline}

REQUIREMENTS:
1. Generate ${targetCount} secondary outcomes
2. Each should complement the primary outcome
3. Include diverse outcome types (e.g., clinical, patient-reported, safety)
4. Provide precise operational definitions
5. Specify validated measurement tools
6. Define measurement timing

Return JSON array only.`;

  const response = await callLLM(prompt, {
    systemPrompt,
    temperature: 0.3,
    model: 'claude-3-5-sonnet-20241022',
  });

  const secondaryOutcomes = parseJSONResponse<SecondaryOutcome[]>(response);

  // Enhance each outcome with automated suggestions
  for (const outcome of secondaryOutcomes) {
    if (!outcome.measurement_tool || outcome.measurement_tool.includes('specify')) {
      outcome.measurement_tool = suggestMeasurementTool(outcome.name);
    }

    if (!outcome.measurement_timing) {
      outcome.measurement_timing = determineMeasurementTiming(design);
    }
  }

  return secondaryOutcomes;
}

/**
 * Define complete outcomes specification
 * @param intendedOutcomes - Description of intended outcomes from Stage 1
 * @param studyDesign - Study design specification
 * @param reportingGuideline - Optional reporting guideline override
 * @returns Complete outcome specification
 */
export async function defineOutcomes(
  intendedOutcomes: string,
  studyDesign: StudyDesign,
  reportingGuideline?: string
): Promise<OutcomeSpec> {
  // Override reporting guideline if provided
  const design = reportingGuideline
    ? { ...studyDesign, reporting_guideline: reportingGuideline }
    : studyDesign;

  // Generate primary outcome
  const primary = await generatePrimaryOutcome(intendedOutcomes, design);

  // Generate secondary outcomes
  const secondary = await generateSecondaryOutcomes(intendedOutcomes, design);

  return {
    primary,
    secondary,
  };
}
