/**
 * Data Collection Planning Module
 * Phase 6.7 - Data collection specification and planning
 *
 * Determines data types, instruments, collection timepoints, and missing data handling
 * based on study design, outcomes, and procedures.
 */

import type {
  DataCollectionSpec,
  OutcomeSpec,
  ProcedureSpec,
  StudyDesign,
  ProjectTimeline,
} from '../../types/methodology.js';
import { callLLM, parseJSONResponse } from '../../utils/llm.js';

/**
 * Valid data types for data collection
 */
type DataType = 'CLINICAL' | 'ADMINISTRATIVE' | 'SURVEY' | 'QUALITATIVE' | 'BIOLOGICAL';

/**
 * Data collection instrument
 */
interface Instrument {
  name: string;
  type: string;
  validated: boolean;
  source?: string;
}

/**
 * LLM response interface for data collection planning
 */
interface DataCollectionResponse {
  data_types: DataType[];
  includes_identifiable_data: boolean;
  instruments: Instrument[];
  collection_timepoints: string[];
  missing_data_handling: string;
  reasoning: string;
}

/**
 * Data collection planning prompt template
 * Spec reference: Section 3.4.2
 */
const DATA_COLLECTION_PROMPT = `You are an expert in healthcare research methodology and data collection planning. Plan the data collection strategy for this study.

## Study Design
Type: {design_type}
Subtype: {design_subtype}
Randomised: {is_randomised}
Blinded: {is_blinded}
Reporting Guideline: {reporting_guideline}

## Primary Outcome
Name: {primary_outcome_name}
Definition: {primary_outcome_definition}
Measurement Tool: {primary_outcome_tool}
Timing: {primary_outcome_timing}

## Secondary Outcomes
{secondary_outcomes}

## Study Procedures
{procedures_overview}

## Timeline
Duration: {total_duration}
{timeline_milestones}

## Task
Plan the data collection strategy by determining:

1. **Data Types** - Select all applicable types:
   - CLINICAL: Clinical measurements, vitals, diagnoses, lab results
   - ADMINISTRATIVE: Hospital records, admission data, length of stay
   - SURVEY: Questionnaires, patient-reported outcomes, satisfaction surveys
   - QUALITATIVE: Interviews, focus groups, observation notes
   - BIOLOGICAL: Biological samples, specimens, genetic data

2. **Identifiable Data** - Determine if the study collects personally identifiable information (names, MRN, DOB, contact details)

3. **Instruments** - List data collection instruments:
   - Name: Full instrument name
   - Type: Type of instrument (e.g., clinical scale, lab test, survey)
   - Validated: Whether it's a validated instrument (true/false)
   - Source: Reference or citation if validated

4. **Collection Timepoints** - Define when data will be collected (e.g., "Baseline", "Week 4", "Week 12", "6 months")

5. **Missing Data Handling** - Describe strategy for handling missing data (e.g., "Complete case analysis", "Multiple imputation", "Last observation carried forward")

Respond in JSON format:
\`\`\`json
{
  "data_types": ["CLINICAL", "SURVEY", ...],
  "includes_identifiable_data": true/false,
  "instruments": [
    {
      "name": "Instrument name",
      "type": "Type of instrument",
      "validated": true/false,
      "source": "Citation or reference (optional)"
    }
  ],
  "collection_timepoints": ["Baseline", "Week 4", ...],
  "missing_data_handling": "Strategy for missing data",
  "reasoning": "Brief explanation of data collection approach"
}
\`\`\`

Consider:
- Align instruments with outcome measures
- Ensure timepoints match study design and timeline
- Use validated instruments where available
- Consider participant burden
- Plan for realistic attrition rates
- Address privacy and identifiability requirements`;

/**
 * Plan comprehensive data collection strategy
 *
 * Uses LLM to analyze study design, outcomes, and procedures to generate
 * a complete data collection specification.
 *
 * @param outcomes - Study outcomes specification
 * @param procedures - Study procedures specification
 * @param design - Study design specification
 * @param timeline - Optional project timeline
 * @returns Complete data collection specification
 *
 * @example
 * ```typescript
 * const dataCollection = await planDataCollection(
 *   outcomes,
 *   procedures,
 *   studyDesign,
 *   timeline
 * );
 * console.log(dataCollection.data_types); // ['CLINICAL', 'SURVEY']
 * console.log(dataCollection.instruments.length); // 3
 * ```
 */
export async function planDataCollection(
  outcomes: OutcomeSpec,
  procedures: ProcedureSpec,
  design: StudyDesign,
  timeline?: ProjectTimeline
): Promise<DataCollectionSpec> {
  // Format secondary outcomes for prompt
  const secondaryOutcomesText = outcomes.secondary
    .map(
      (outcome, idx) =>
        `${idx + 1}. ${outcome.name}\n   Definition: ${outcome.definition}\n   Tool: ${outcome.measurement_tool}\n   Timing: ${outcome.measurement_timing}`
    )
    .join('\n\n');

  // Format timeline milestones if available
  const timelineMilestonesText = timeline
    ? timeline.milestones
        .map((m) => `- ${m.name}: ${m.target_date}`)
        .join('\n')
    : 'Not specified';

  // Build prompt with all context
  const prompt = DATA_COLLECTION_PROMPT.replace('{design_type}', design.type)
    .replace('{design_subtype}', design.subtype || 'Not specified')
    .replace('{is_randomised}', design.is_randomised ? 'Yes' : 'No')
    .replace('{is_blinded}', design.is_blinded ? `Yes (${design.blinding_type})` : 'No')
    .replace('{reporting_guideline}', design.reporting_guideline)
    .replace('{primary_outcome_name}', outcomes.primary.name)
    .replace('{primary_outcome_definition}', outcomes.primary.definition)
    .replace('{primary_outcome_tool}', outcomes.primary.measurement_tool)
    .replace('{primary_outcome_timing}', outcomes.primary.measurement_timing)
    .replace('{secondary_outcomes}', secondaryOutcomesText || 'None specified')
    .replace('{procedures_overview}', procedures.overview)
    .replace('{total_duration}', timeline?.total_duration || 'Not specified')
    .replace('{timeline_milestones}', timelineMilestonesText);

  // Call LLM with structured prompt
  const responseText = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2048,
    temperature: 0.7,
    systemPrompt: 'You are an expert healthcare research methodologist specializing in data collection planning.',
  });

  // Parse and validate response
  const response = parseJSONResponse<DataCollectionResponse>(responseText);

  // Validate data types
  const validDataTypes = ['CLINICAL', 'ADMINISTRATIVE', 'SURVEY', 'QUALITATIVE', 'BIOLOGICAL'];
  const dataTypes = response.data_types.filter((type) =>
    validDataTypes.includes(type)
  ) as DataType[];

  if (dataTypes.length === 0) {
    throw new Error('No valid data types returned from LLM');
  }

  // Return structured data collection spec
  return {
    data_types: dataTypes,
    includes_identifiable_data: response.includes_identifiable_data,
    instruments: response.instruments.map((inst) => ({
      name: inst.name,
      type: inst.type,
      validated: inst.validated,
      source: inst.source,
    })),
    collection_timepoints: response.collection_timepoints,
    missing_data_handling: response.missing_data_handling,
  };
}

/**
 * Determine data types based on outcomes and study design
 *
 * Uses heuristic rules to identify required data types:
 * - Clinical outcomes → CLINICAL data
 * - Patient-reported outcomes → SURVEY data
 * - Qualitative outcomes → QUALITATIVE data
 * - Administrative outcomes → ADMINISTRATIVE data
 *
 * @param outcomes - Study outcomes specification
 * @param design - Study design specification
 * @returns Array of required data types
 *
 * @example
 * ```typescript
 * const dataTypes = determineDataTypes(outcomes, design);
 * // ['CLINICAL', 'SURVEY', 'ADMINISTRATIVE']
 * ```
 */
export function determineDataTypes(
  outcomes: OutcomeSpec,
  design: StudyDesign
): DataType[] {
  const dataTypes = new Set<DataType>();

  // Check primary outcome
  const primaryTool = outcomes.primary.measurement_tool.toLowerCase();
  if (
    primaryTool.includes('clinical') ||
    primaryTool.includes('lab') ||
    primaryTool.includes('vital') ||
    primaryTool.includes('diagnostic')
  ) {
    dataTypes.add('CLINICAL');
  }

  if (
    primaryTool.includes('survey') ||
    primaryTool.includes('questionnaire') ||
    primaryTool.includes('patient-reported') ||
    primaryTool.includes('scale') ||
    primaryTool.includes('score')
  ) {
    dataTypes.add('SURVEY');
  }

  if (
    primaryTool.includes('interview') ||
    primaryTool.includes('focus group') ||
    primaryTool.includes('qualitative')
  ) {
    dataTypes.add('QUALITATIVE');
  }

  // Check secondary outcomes
  for (const outcome of outcomes.secondary) {
    const tool = outcome.measurement_tool.toLowerCase();

    if (
      tool.includes('clinical') ||
      tool.includes('lab') ||
      tool.includes('vital')
    ) {
      dataTypes.add('CLINICAL');
    }

    if (
      tool.includes('survey') ||
      tool.includes('questionnaire') ||
      tool.includes('patient-reported')
    ) {
      dataTypes.add('SURVEY');
    }

    if (tool.includes('interview') || tool.includes('qualitative')) {
      dataTypes.add('QUALITATIVE');
    }

    if (
      tool.includes('length of stay') ||
      tool.includes('admission') ||
      tool.includes('discharge') ||
      tool.includes('cost')
    ) {
      dataTypes.add('ADMINISTRATIVE');
    }

    if (
      tool.includes('biological') ||
      tool.includes('specimen') ||
      tool.includes('sample')
    ) {
      dataTypes.add('BIOLOGICAL');
    }
  }

  // Add administrative data for most study types (common requirement)
  if (
    design.type !== 'QUALITATIVE' &&
    !design.type.includes('INTERVIEW')
  ) {
    dataTypes.add('ADMINISTRATIVE');
  }

  return Array.from(dataTypes);
}

/**
 * Check if study involves identifiable data
 *
 * Determines if data collection will include personally identifiable information
 * based on data types and procedures.
 *
 * @param dataTypes - Array of data types being collected
 * @param procedures - Study procedures specification
 * @returns True if study includes identifiable data
 *
 * @example
 * ```typescript
 * const hasIdentifiable = checkIdentifiableData(
 *   ['CLINICAL', 'ADMINISTRATIVE'],
 *   procedures
 * );
 * // true (clinical/admin data typically includes identifiers)
 * ```
 */
export function checkIdentifiableData(
  dataTypes: DataType[],
  procedures: ProcedureSpec
): boolean {
  // Clinical and biological data typically require identifiers for linkage
  if (
    dataTypes.includes('CLINICAL') ||
    dataTypes.includes('BIOLOGICAL')
  ) {
    return true;
  }

  // Administrative data often includes identifiers
  if (dataTypes.includes('ADMINISTRATIVE')) {
    return true;
  }

  // Check procedures for mention of identifiable data
  const proceduresText = (
    procedures.overview +
    ' ' +
    (procedures.intervention_description || '') +
    ' ' +
    procedures.step_by_step_protocol.map((s) => s.description).join(' ')
  ).toLowerCase();

  const identifierKeywords = [
    'name',
    'mrn',
    'medical record number',
    'date of birth',
    'dob',
    'contact',
    'phone',
    'email',
    'address',
    'identifier',
  ];

  return identifierKeywords.some((keyword) =>
    proceduresText.includes(keyword)
  );
}

/**
 * Suggest data collection instruments based on outcomes
 *
 * Maps outcome measures to appropriate validated instruments where available.
 *
 * @param outcomes - Study outcomes specification
 * @returns Array of suggested instruments
 *
 * @example
 * ```typescript
 * const instruments = suggestInstruments(outcomes);
 * // [{ name: 'VAS Pain Scale', type: 'Clinical scale', validated: true, ... }]
 * ```
 */
export function suggestInstruments(outcomes: OutcomeSpec): Instrument[] {
  const instruments: Instrument[] = [];

  // Map common outcome measures to validated instruments
  const instrumentMap: Record<string, Instrument> = {
    pain: {
      name: 'Visual Analog Scale (VAS) for Pain',
      type: 'Clinical scale',
      validated: true,
      source: 'Hawker et al., 2011, J Rheumatol',
    },
    'quality of life': {
      name: 'EQ-5D-5L',
      type: 'Quality of life questionnaire',
      validated: true,
      source: 'EuroQol Group',
    },
    anxiety: {
      name: 'Generalized Anxiety Disorder 7 (GAD-7)',
      type: 'Psychological scale',
      validated: true,
      source: 'Spitzer et al., 2006, Arch Intern Med',
    },
    depression: {
      name: 'Patient Health Questionnaire (PHQ-9)',
      type: 'Psychological scale',
      validated: true,
      source: 'Kroenke et al., 2001, J Gen Intern Med',
    },
    satisfaction: {
      name: 'Patient Satisfaction Questionnaire (PSQ-18)',
      type: 'Patient-reported outcome',
      validated: true,
      source: 'Marshall & Hays, 1994',
    },
  };

  // Check primary outcome
  const primaryName = outcomes.primary.name.toLowerCase();
  for (const [keyword, instrument] of Object.entries(instrumentMap)) {
    if (primaryName.includes(keyword)) {
      instruments.push(instrument);
    }
  }

  // Check secondary outcomes
  for (const outcome of outcomes.secondary) {
    const outcomeName = outcome.name.toLowerCase();
    for (const [keyword, instrument] of Object.entries(instrumentMap)) {
      if (
        outcomeName.includes(keyword) &&
        !instruments.some((i) => i.name === instrument.name)
      ) {
        instruments.push(instrument);
      }
    }
  }

  // Add instruments from outcome measurement tools
  if (outcomes.primary.measurement_tool) {
    instruments.push({
      name: outcomes.primary.measurement_tool,
      type: 'Outcome measure',
      validated: true, // Assume specified tools are validated
    });
  }

  for (const outcome of outcomes.secondary) {
    if (
      outcome.measurement_tool &&
      !instruments.some((i) => i.name === outcome.measurement_tool)
    ) {
      instruments.push({
        name: outcome.measurement_tool,
        type: 'Outcome measure',
        validated: true,
      });
    }
  }

  return instruments;
}

/**
 * Define data collection timepoints based on design and timeline
 *
 * Generates appropriate timepoints for data collection based on study design
 * type and duration.
 *
 * @param design - Study design specification
 * @param timeline - Project timeline specification
 * @returns Array of collection timepoint descriptions
 *
 * @example
 * ```typescript
 * const timepoints = defineCollectionTimepoints(design, timeline);
 * // ['Baseline', 'Week 4', 'Week 12', '6 months', '12 months']
 * ```
 */
export function defineCollectionTimepoints(
  design: StudyDesign,
  timeline?: ProjectTimeline
): string[] {
  const timepoints: string[] = ['Baseline'];

  // Determine follow-up timepoints based on study design
  if (design.type === 'RCT' || design.type.includes('TRIAL')) {
    // Typical trial timepoints
    timepoints.push(
      'Post-intervention (immediate)',
      '3 months',
      '6 months',
      '12 months'
    );
  } else if (design.type === 'COHORT') {
    // Cohort study timepoints
    timepoints.push('6 months', '12 months', '24 months');
  } else if (design.type === 'CROSS_SECTIONAL') {
    // Single timepoint only
    return ['Single assessment'];
  } else if (design.type === 'CASE_CONTROL') {
    // Retrospective single assessment
    return ['Baseline (retrospective)'];
  } else if (design.type.includes('PDSA')) {
    // PDSA cycles
    timepoints.push('End of Cycle 1', 'End of Cycle 2', 'End of Cycle 3');
  } else if (design.type.includes('ITS') || design.type.includes('TIME_SERIES')) {
    // Time series - multiple regular intervals
    timepoints.push(
      'Month 1',
      'Month 2',
      'Month 3',
      'Month 6',
      'Month 12'
    );
  } else {
    // Default follow-up timepoints
    timepoints.push('Mid-study', 'End of study');
  }

  // Adjust based on timeline if available
  if (timeline?.data_collection_period) {
    const period = timeline.data_collection_period.toLowerCase();
    if (period.includes('week')) {
      // Weekly collection
      const match = period.match(/(\d+)\s*week/);
      if (match) {
        const weeks = parseInt(match[1]);
        if (weeks <= 12) {
          timepoints.push(
            ...Array.from({ length: Math.floor(weeks / 4) }, (_, i) =>
              `Week ${(i + 1) * 4}`
            )
          );
        }
      }
    }
  }

  return timepoints;
}

/**
 * Plan missing data handling strategy
 *
 * Recommends appropriate missing data handling approach based on study design
 * and data types.
 *
 * @param design - Study design specification
 * @param dataTypes - Array of data types being collected
 * @returns Missing data handling strategy description
 *
 * @example
 * ```typescript
 * const strategy = planMissingDataHandling(design, ['CLINICAL', 'SURVEY']);
 * // "Multiple imputation for missing survey data; complete case analysis for clinical outcomes"
 * ```
 */
export function planMissingDataHandling(
  design: StudyDesign,
  dataTypes: DataType[]
): string {
  const strategies: string[] = [];

  // Base strategy on study design
  if (design.type === 'RCT' || design.type.includes('TRIAL')) {
    strategies.push(
      'Intention-to-treat analysis with multiple imputation for missing outcome data'
    );
    strategies.push('Sensitivity analyses using complete case analysis');
  } else if (design.type === 'COHORT' || design.type === 'LONGITUDINAL') {
    strategies.push(
      'Mixed-effects models to handle missing longitudinal data'
    );
    strategies.push('Multiple imputation for baseline covariates');
  } else if (design.type.includes('QI') || design.type.includes('PDSA')) {
    strategies.push(
      'Run charts with missing data points excluded'
    );
    strategies.push('Document reasons for missing data at each cycle');
  } else {
    strategies.push('Complete case analysis as primary approach');
    strategies.push(
      'Sensitivity analysis using multiple imputation if >10% missing data'
    );
  }

  // Add data-type specific strategies
  if (dataTypes.includes('SURVEY')) {
    strategies.push(
      'Item-level imputation for survey data using mean substitution or predictive modeling'
    );
  }

  if (dataTypes.includes('QUALITATIVE')) {
    strategies.push(
      'Qualitative data: document missing interviews and assess impact on thematic saturation'
    );
  }

  // Add attrition handling
  strategies.push(
    `Expected attrition rate: ${design.type.includes('TRIAL') ? '15-20%' : '10-15%'}`
  );
  strategies.push('Document reasons for withdrawal/loss to follow-up');

  return strategies.join('; ');
}
