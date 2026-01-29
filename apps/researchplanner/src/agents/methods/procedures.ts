/**
 * Procedure Design Module
 * Phase 6.6 - Study Procedures Design
 *
 * Generates detailed step-by-step study procedures including:
 * - Intervention descriptions (for interventional studies)
 * - Control/comparator descriptions
 * - Step-by-step protocols with timings and responsibilities
 * - Blinding specifications
 * - Quality assurance measures
 */

import { callLLM } from '../../utils/llm.js';
import type {
  StudyDesign,
  OutcomeSpec,
  Site,
  ProcedureSpec,
} from '../../types/methodology.js';

/**
 * Protocol step structure
 */
export interface ProtocolStep {
  step_number: number;
  description: string;
  duration?: string;
  responsible_party?: string;
}

/**
 * Blinding specification result
 */
export interface BlindingSpec {
  type: string;
  description: string;
}

/**
 * Design study procedures from study design, outcomes, and setting
 *
 * Main entry point for procedure design. Orchestrates:
 * 1. Intervention and control descriptions (if interventional)
 * 2. Step-by-step protocol generation
 * 3. Quality assurance measures
 *
 * @param studyDesign - Study design specification
 * @param outcomes - Primary and secondary outcomes
 * @param sites - Study sites/setting information
 * @returns Complete procedure specification
 */
export async function designProcedures(
  studyDesign: StudyDesign,
  outcomes: OutcomeSpec,
  sites: Site[]
): Promise<ProcedureSpec> {
  // Generate intervention description if interventional study
  let interventionDescription: string | undefined;
  if (isInterventionalStudy(studyDesign.type)) {
    interventionDescription = await describeIntervention(
      studyDesign,
      outcomes
    );
  }

  // Generate control description if applicable
  let controlDescription: string | undefined;
  if (studyDesign.control_type && studyDesign.control_type !== 'NONE') {
    controlDescription = await describeControl(
      studyDesign.control_type,
      studyDesign
    );
  }

  // Generate step-by-step protocol
  const protocolSteps = await generateProtocolSteps(
    studyDesign,
    outcomes,
    sites
  );

  // Generate quality assurance measures
  const qaMeasures = generateQAMeasures(studyDesign, outcomes);

  // Generate overview using LLM
  const overview = await generateProcedureOverview(
    studyDesign,
    outcomes,
    interventionDescription,
    controlDescription
  );

  return {
    overview,
    intervention_description: interventionDescription,
    control_description: controlDescription,
    step_by_step_protocol: protocolSteps,
    quality_assurance_measures: qaMeasures,
  };
}

/**
 * Generate step-by-step protocol with timings and responsibilities
 *
 * Creates detailed protocol steps covering:
 * - Participant screening and enrollment
 * - Baseline assessments
 * - Randomization (if applicable)
 * - Intervention/control delivery
 * - Follow-up assessments
 * - Data collection and management
 * - Study completion
 *
 * @param design - Study design specification
 * @param outcomes - Outcomes specification
 * @param sites - Study sites
 * @returns Array of protocol steps
 */
export async function generateProtocolSteps(
  design: StudyDesign,
  outcomes: OutcomeSpec,
  sites: Site[]
): Promise<ProtocolStep[]> {
  const prompt = `
You are designing a detailed step-by-step protocol for a ${design.type} study.

# Study Design Context
Study Type: ${design.type}
${design.subtype ? `Subtype: ${design.subtype}` : ''}
Randomised: ${design.is_randomised ? 'Yes' : 'No'}
Blinded: ${design.is_blinded ? 'Yes' : 'No'}
${design.blinding_type ? `Blinding Type: ${design.blinding_type}` : ''}
Control Type: ${design.control_type || 'None'}
Reporting Guideline: ${design.reporting_guideline}

# Primary Outcome
${outcomes.primary.name}: ${outcomes.primary.definition}
Measurement Tool: ${outcomes.primary.measurement_tool}
Measurement Timing: ${outcomes.primary.measurement_timing}

# Secondary Outcomes
${outcomes.secondary.map(o => `- ${o.name}: ${o.definition}`).join('\n')}

# Study Sites
${sites.map(s => `- ${s.name} (${s.type}): ${s.location}`).join('\n')}

# Task
Generate a comprehensive step-by-step protocol covering all phases of the study from screening to completion.

For each step, provide:
1. Step number (sequential)
2. Clear description of what occurs in this step
3. Estimated duration or timeframe (where applicable)
4. Responsible party (e.g., "Research Nurse", "PI", "Site Coordinator")

# Required Steps to Include

## Screening and Enrollment
- Participant identification and screening
- Eligibility verification
- Informed consent process
- Baseline assessments

${design.is_randomised ? `## Randomization
- Randomization process and allocation concealment
- Group assignment
- Blinding procedures (if applicable)
` : ''}

## Intervention/Data Collection
${isInterventionalStudy(design.type)
  ? '- Intervention delivery process\n- Control group management (if applicable)\n- Treatment fidelity monitoring'
  : '- Data collection procedures\n- Assessment timing\n- Data quality checks'
}

## Follow-up and Assessment
- Follow-up schedule aligned with measurement timing
- Outcome assessments
- Adverse event monitoring (if applicable)

## Data Management
- Data entry and verification
- Data security and storage
- Data quality assurance

## Study Completion
- Final assessments
- Participant debriefing (if applicable)
- Study closeout procedures

# Output Format
Return a JSON array of steps with this exact structure:
[
  {
    "step_number": 1,
    "description": "Clear description of the step",
    "duration": "Estimated time (e.g., '30 minutes', '2 weeks', 'Ongoing')",
    "responsible_party": "Role responsible for this step"
  }
]

Ensure steps are:
- Sequential and logically ordered
- Specific and actionable
- Aligned with the study design and outcomes
- Practical for implementation at the study sites
- Comprehensive (typically 15-25 steps for a full protocol)

Return ONLY the JSON array, no additional commentary.
`.trim();

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.3, // Lower temperature for structured protocol
    systemPrompt: PROCEDURE_SYSTEM_PROMPT,
  });

  // Parse JSON response
  const steps = parseProtocolSteps(response);

  return steps;
}

/**
 * Describe intervention for interventional studies
 *
 * Generates detailed description covering:
 * - What the intervention is
 * - How it will be delivered
 * - Who will deliver it
 * - Duration and frequency
 * - Theoretical or evidence-based rationale
 *
 * @param design - Study design specification
 * @param outcomes - Outcomes being measured
 * @returns Intervention description
 */
export async function describeIntervention(
  design: StudyDesign,
  outcomes: OutcomeSpec
): Promise<string> {
  const prompt = `
You are describing an intervention for a ${design.type} study.

# Study Design Context
Study Type: ${design.type}
${design.subtype ? `Subtype: ${design.subtype}` : ''}
Justification: ${design.justification}

# Primary Outcome
${outcomes.primary.name}: ${outcomes.primary.definition}
Measurement: ${outcomes.primary.measurement_tool}

# Secondary Outcomes
${outcomes.secondary.map(o => `- ${o.name}: ${o.definition}`).join('\n')}

# Task
Based on the study design and outcomes, infer and describe a plausible intervention that would:
1. Be appropriate for this study design type
2. Target the primary and secondary outcomes
3. Be feasible to deliver in a clinical setting

# Required Components

Your description must include:

## What (2-3 sentences)
Clear description of what the intervention consists of. What will participants receive or experience?

## How (2-3 sentences)
Method of delivery. What is the procedure for delivering the intervention? What materials or resources are needed?

## Who (1-2 sentences)
Who will deliver the intervention? What qualifications or training do they need?

## When/Duration (1-2 sentences)
Duration of the intervention (per session and total). Frequency of delivery (e.g., weekly, daily).

## Rationale (2-3 sentences)
Why is this intervention expected to work? Cite theoretical framework or evidence base if applicable to this type of intervention.

## Fidelity (1-2 sentences)
How will you ensure the intervention is delivered consistently as intended?

# Output Format
Provide flowing prose paragraphs organized by the above sections. Use section headers (##).

Write in future tense ("Participants will receive...", "The intervention will be delivered...").

Target length: 300-400 words total.

Return ONLY the intervention description, no preamble or meta-commentary.
`.trim();

  const description = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2048,
    temperature: 0.5,
    systemPrompt: PROCEDURE_SYSTEM_PROMPT,
  });

  return description.trim();
}

/**
 * Describe control or comparator group
 *
 * Generates description of:
 * - What the control group receives
 * - How it differs from intervention
 * - Why this control is appropriate
 *
 * @param controlType - Type of control (PLACEBO, ACTIVE, USUAL_CARE, HISTORICAL)
 * @param design - Study design specification
 * @returns Control description
 */
export async function describeControl(
  controlType: string,
  design: StudyDesign
): Promise<string> {
  const prompt = `
You are describing the control/comparator group for a ${design.type} study.

# Study Design Context
Study Type: ${design.type}
Control Type: ${controlType}
Blinded: ${design.is_blinded ? 'Yes' : 'No'}
${design.blinding_type ? `Blinding Type: ${design.blinding_type}` : ''}
Justification: ${design.justification}

# Control Type Definitions
- PLACEBO: Inactive treatment that appears identical to intervention
- ACTIVE: Alternative active treatment for comparison
- USUAL_CARE: Standard care that would normally be provided
- HISTORICAL: Comparison to historical data or pre-intervention period

# Task
Describe what the control group will receive based on the control type.

# Required Components

## What Control Participants Receive (2-3 sentences)
Clear description of what control group participants will receive or experience.

## Rationale for Control Choice (1-2 sentences)
Why is this control appropriate for this study? What comparison does it enable?

${controlType === 'PLACEBO' || design.is_blinded
  ? `## Blinding and Matching (1-2 sentences)
How will the control be made indistinguishable from the intervention to maintain blinding?`
  : ''}

${controlType === 'ACTIVE'
  ? `## Equipoise Justification (1-2 sentences)
Why is it ethical to compare these two treatments? What is uncertain that this study will address?`
  : ''}

# Output Format
Provide flowing prose paragraphs organized by the above sections. Use section headers (##).

Write in future tense ("Control participants will receive...").

Target length: 150-250 words total.

Return ONLY the control description, no preamble or meta-commentary.
`.trim();

  const description = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1536,
    temperature: 0.5,
    systemPrompt: PROCEDURE_SYSTEM_PROMPT,
  });

  return description.trim();
}

/**
 * Determine blinding specification based on design
 *
 * Logic-based function that determines:
 * - Type of blinding (single, double, triple, open-label)
 * - Who is blinded (participants, clinicians, assessors)
 * - Rationale for blinding approach
 *
 * @param design - Study design specification
 * @param intervention - Intervention description for context
 * @returns Blinding specification
 */
export function determineBlinding(
  design: StudyDesign,
  intervention?: string
): BlindingSpec {
  if (!design.is_blinded || !design.blinding_type) {
    return {
      type: 'OPEN_LABEL',
      description: 'This is an open-label study. Participants, clinicians, and outcome assessors will be aware of group allocation. This is appropriate given the nature of the intervention and outcomes being measured.',
    };
  }

  switch (design.blinding_type) {
    case 'SINGLE':
      return {
        type: 'SINGLE_BLIND',
        description: 'Single-blind design: Participants will be blinded to group allocation, but the research team and treating clinicians will not be blinded. Outcome assessors will be blinded where feasible to minimize assessment bias.',
      };

    case 'DOUBLE':
      return {
        type: 'DOUBLE_BLIND',
        description: 'Double-blind design: Both participants and treating clinicians/research staff will be blinded to group allocation. Allocation will be concealed using opaque sealed envelopes or a centralized randomization system. Blinding will be maintained until all participants have completed the study or in case of medical emergency requiring knowledge of allocation.',
      };

    case 'TRIPLE':
      return {
        type: 'TRIPLE_BLIND',
        description: 'Triple-blind design: Participants, treating clinicians, and outcome assessors will all be blinded to group allocation. Additionally, the statistician conducting data analysis will be blinded until the analysis plan is finalized. This approach minimizes all potential sources of bias in measurement, treatment, and analysis.',
      };

    case 'OPEN_LABEL':
      return {
        type: 'OPEN_LABEL',
        description: 'Open-label design: All parties (participants, clinicians, assessors) will be aware of group allocation. This is appropriate given the nature of the intervention, which cannot be practically blinded, though efforts will be made to use objective outcome measures to minimize bias.',
      };

    default:
      return {
        type: 'OPEN_LABEL',
        description: 'Blinding approach to be determined based on the nature of the intervention and feasibility considerations.',
      };
  }
}

/**
 * Generate quality assurance measures
 *
 * Logic-based function that generates QA measures appropriate for:
 * - Study design type
 * - Outcomes being measured
 * - Level of risk/complexity
 *
 * @param design - Study design specification
 * @param outcomes - Outcomes specification
 * @returns Array of QA measures
 */
export function generateQAMeasures(
  design: StudyDesign,
  outcomes: OutcomeSpec
): string[] {
  const measures: string[] = [];

  // Data quality measures (universal)
  measures.push(
    'Data quality checks: All data entries will be reviewed for completeness and plausibility by a second team member within 48 hours of collection.'
  );

  measures.push(
    'Missing data monitoring: Weekly reports will track missing data rates by site and participant. Sites exceeding 10% missing data will receive immediate feedback and support.'
  );

  // Protocol adherence (for all designs)
  measures.push(
    'Protocol adherence monitoring: Monthly audits of a random sample (10%) of participants will verify adherence to the protocol, with deviations documented and reported to the principal investigator.'
  );

  // Intervention fidelity (for interventional studies)
  if (isInterventionalStudy(design.type)) {
    measures.push(
      'Intervention fidelity: A random sample (20%) of intervention sessions will be observed or recorded for fidelity assessment using a standardized checklist. All intervention providers will receive initial training and quarterly refresher sessions.'
    );

    if (design.control_type && design.control_type !== 'NONE') {
      measures.push(
        'Control group monitoring: Control group participants will be monitored to ensure they do not receive the intervention and that care is standardized according to the protocol.'
      );
    }
  }

  // Blinding integrity (for blinded studies)
  if (design.is_blinded) {
    measures.push(
      'Blinding integrity: A random sample of participants and outcome assessors will be surveyed at study midpoint and completion to assess blinding success. Any unblinding events will be documented with reasons and timing.'
    );
  }

  // Outcome measurement quality
  if (outcomes.primary.measurement_tool.toLowerCase().includes('validated')) {
    measures.push(
      `Measurement standardization: All outcome assessors will be trained in the use of the ${outcomes.primary.measurement_tool} and demonstrate competency before assessing participants. Inter-rater reliability will be assessed quarterly.`
    );
  } else {
    measures.push(
      `Measurement standardization: Outcome assessors will follow a standardized protocol for the ${outcomes.primary.measurement_tool}. Regular calibration sessions will ensure consistency across assessors and sites.`
    );
  }

  // Multi-site specific (if applicable)
  // Note: This would ideally check sites array, but we add it conditionally
  measures.push(
    'Site monitoring: Each site will receive at least one monitoring visit (in-person or virtual) during active recruitment to verify protocol adherence, data quality, and regulatory compliance.'
  );

  // Adverse event tracking (for interventional studies)
  if (isInterventionalStudy(design.type)) {
    measures.push(
      'Adverse event monitoring: All adverse events will be documented using standardized forms and reviewed weekly by the principal investigator. Serious adverse events will be reported to the ethics committee within 24 hours.'
    );
  }

  // Randomization integrity (for randomized studies)
  if (design.is_randomised) {
    measures.push(
      'Randomization integrity: The randomization sequence will be generated by an independent statistician and concealed until allocation. Regular audits will verify that the allocation sequence is followed correctly.'
    );
  }

  // Data security
  measures.push(
    'Data security: All data will be stored securely with access restricted to authorized study personnel. Regular backups will be performed, and data will be de-identified for analysis. An audit trail will track all data access and modifications.'
  );

  return measures;
}

/**
 * Generate procedure overview summary using LLM
 *
 * Creates a high-level narrative overview of the study procedures
 * that integrates all components (intervention, control, protocol steps).
 *
 * @param design - Study design specification
 * @param outcomes - Outcomes specification
 * @param interventionDesc - Intervention description (if applicable)
 * @param controlDesc - Control description (if applicable)
 * @returns Overview narrative
 */
async function generateProcedureOverview(
  design: StudyDesign,
  outcomes: OutcomeSpec,
  interventionDesc?: string,
  controlDesc?: string
): Promise<string> {
  const prompt = `
You are writing a high-level overview of study procedures for a ${design.type} study.

# Study Design Context
Study Type: ${design.type}
${design.subtype ? `Subtype: ${design.subtype}` : ''}
Randomised: ${design.is_randomised ? 'Yes' : 'No'}
Blinded: ${design.is_blinded ? 'Yes' : 'No'}
Reporting Guideline: ${design.reporting_guideline}

# Primary Outcome
${outcomes.primary.name}: measured using ${outcomes.primary.measurement_tool} at ${outcomes.primary.measurement_timing}

${interventionDesc ? `# Intervention
${interventionDesc}
` : ''}

${controlDesc ? `# Control
${controlDesc}
` : ''}

# Task
Write a concise overview (2-3 paragraphs, 150-200 words) that:
1. Summarizes the overall study procedures at a high level
2. Describes the participant journey from screening to completion
3. Highlights key procedural elements (randomization, blinding, intervention delivery, outcome assessment)

This overview will appear at the beginning of the detailed procedures section to orient readers.

# Output Format
Provide flowing prose paragraphs (no bullet points, no section headers).

Write in future tense ("Participants will be screened...", "The study will follow...").

Return ONLY the overview text, no preamble or meta-commentary.
`.trim();

  const overview = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1024,
    temperature: 0.5,
    systemPrompt: PROCEDURE_SYSTEM_PROMPT,
  });

  return overview.trim();
}

/**
 * Parse protocol steps from LLM JSON response
 *
 * Handles potential JSON formatting issues and validates structure.
 *
 * @param response - LLM response containing JSON
 * @returns Parsed protocol steps
 */
function parseProtocolSteps(response: string): ProtocolStep[] {
  let jsonText = response.trim();

  // Remove markdown code block if present
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonText);

    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Protocol steps must be a JSON array');
    }

    for (const step of parsed) {
      if (
        typeof step.step_number !== 'number' ||
        typeof step.description !== 'string'
      ) {
        throw new Error(
          'Each step must have step_number (number) and description (string)'
        );
      }
    }

    return parsed as ProtocolStep[];
  } catch (error) {
    throw new Error(
      `Failed to parse protocol steps JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if study design is interventional
 *
 * @param studyType - Study design type
 * @returns True if interventional
 */
function isInterventionalStudy(studyType: string): boolean {
  const interventionalTypes = [
    'RCT',
    'CLUSTER_RCT',
    'STEPPED_WEDGE',
    'QUASI_EXPERIMENTAL',
    'ITS',
    'CONTROLLED_BA',
    'PDSA_CYCLE',
    'PRE_POST',
  ];

  return interventionalTypes.includes(studyType.toUpperCase());
}

/**
 * System prompt for procedure design
 */
const PROCEDURE_SYSTEM_PROMPT = `
You are an expert clinical research methodologist specializing in study protocol development.

Your task is to design detailed, practical study procedures that are:
- Rigorous and methodologically sound
- Feasible to implement in real clinical settings
- Aligned with reporting guidelines (CONSORT, STROBE, SQUIRE, etc.)
- Clear and specific enough for research staff to follow
- Comprehensive but not unnecessarily complex

You have expertise in:
- Clinical trial design and conduct
- Quality improvement methodology (PDSA, Lean Six Sigma)
- Good Clinical Practice (GCP) guidelines
- Intervention fidelity and protocol adherence
- Outcome measurement and data quality
- Multi-site research coordination
- Research ethics and governance

When designing procedures, always consider:
- Participant burden and retention
- Staff training and competency requirements
- Data quality and completeness
- Protocol adherence and monitoring
- Ethical considerations and safety
`.trim();
