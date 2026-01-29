/**
 * Methodology Output Assembly and Document Generation
 * Phase 6.10 - Transforms methodology components into various output formats
 */

import type {
  Methodology,
  StudyDesign,
  ParticipantSpec,
  OutcomeSpec,
  AnalysisPlan,
  ProjectTimeline,
  Site,
} from '../../types/methodology.js';
import { callLLM } from '../../utils/llm.js';

/**
 * Generate comprehensive methodology summary in Markdown format
 * Target length: 1-2 pages
 * @param methodology - Complete methodology specification
 * @returns Markdown formatted summary
 */
export function generateMethodologySummary(methodology: Methodology): string {
  const { study_design, setting_sites, participants, outcomes, procedures, data_collection, analysis_plan, timeline } = methodology;

  let summary = '# Methodology Summary\n\n';

  // Study Design Section
  summary += '## Study Design\n\n';
  summary += `**Design Type:** ${study_design.type}${study_design.subtype ? ` (${study_design.subtype})` : ''}\n\n`;
  summary += `**Reporting Guideline:** ${study_design.reporting_guideline}\n\n`;

  if (study_design.is_randomised) {
    summary += `**Randomisation:** Yes\n\n`;
  }

  if (study_design.is_blinded) {
    summary += `**Blinding:** ${study_design.blinding_type || 'Yes'}\n\n`;
  }

  if (study_design.control_type) {
    summary += `**Control Type:** ${study_design.control_type}\n\n`;
  }

  summary += `**Justification:** ${study_design.justification}\n\n`;

  // Setting and Sites Section
  summary += '## Setting and Sites\n\n';
  setting_sites.forEach((site) => {
    summary += `- **${site.name}** (${site.type}): ${site.location}\n`;
    summary += `  - Capacity: ${site.capacity}\n`;
    if (site.contact_person) {
      summary += `  - Contact: ${site.contact_person}\n`;
    }
  });
  summary += '\n';

  // Participants Section
  summary += '## Participants\n\n';

  summary += '**Inclusion Criteria:**\n';
  participants.inclusion_criteria.forEach((criterion, idx) => {
    summary += `${idx + 1}. ${criterion.description}\n`;
  });
  summary += '\n';

  summary += '**Exclusion Criteria:**\n';
  participants.exclusion_criteria.forEach((criterion, idx) => {
    summary += `${idx + 1}. ${criterion.description}\n`;
  });
  summary += '\n';

  if (participants.sample_size) {
    summary += `**Sample Size:** ${participants.sample_size.target} participants\n`;
    summary += `- Calculation Method: ${participants.sample_size.calculation_method}\n`;
    summary += `- Power: ${participants.sample_size.assumptions.power}\n`;
    summary += `- Alpha: ${participants.sample_size.assumptions.alpha}\n`;
    summary += `- Expected Attrition: ${(participants.sample_size.assumptions.attrition_rate * 100).toFixed(0)}%\n\n`;
  }

  summary += `**Recruitment Method:** ${participants.recruitment_strategy.method}\n`;
  summary += `**Recruitment Duration:** ${participants.recruitment_strategy.estimated_duration}\n\n`;

  // Outcomes Section
  summary += '## Outcomes\n\n';

  summary += '### Primary Outcome\n\n';
  summary += `**${outcomes.primary.name}**\n`;
  summary += `- Definition: ${outcomes.primary.definition}\n`;
  summary += `- Measurement: ${outcomes.primary.measurement_tool}\n`;
  summary += `- Timing: ${outcomes.primary.measurement_timing}\n`;
  if (outcomes.primary.clinically_meaningful_difference) {
    summary += `- Clinically Meaningful Difference: ${outcomes.primary.clinically_meaningful_difference}\n`;
  }
  summary += '\n';

  if (outcomes.secondary.length > 0) {
    summary += '### Secondary Outcomes\n\n';
    outcomes.secondary.forEach((outcome) => {
      summary += `**${outcome.name}**\n`;
      summary += `- Definition: ${outcome.definition}\n`;
      summary += `- Measurement: ${outcome.measurement_tool}\n`;
      summary += `- Timing: ${outcome.measurement_timing}\n\n`;
    });
  }

  // Procedures Section
  summary += '## Study Procedures\n\n';
  summary += `${procedures.overview}\n\n`;

  if (procedures.intervention_description) {
    summary += '**Intervention:**\n';
    summary += `${procedures.intervention_description}\n\n`;
  }

  if (procedures.control_description) {
    summary += '**Control:**\n';
    summary += `${procedures.control_description}\n\n`;
  }

  // Data Collection Section
  summary += '## Data Collection\n\n';
  summary += `**Data Types:** ${data_collection.data_types.join(', ')}\n\n`;
  summary += `**Identifiable Data:** ${data_collection.includes_identifiable_data ? 'Yes' : 'No'}\n\n`;

  summary += '**Instruments:**\n';
  data_collection.instruments.forEach((instrument) => {
    summary += `- ${instrument.name} (${instrument.type})${instrument.validated ? ' - Validated' : ''}\n`;
  });
  summary += '\n';

  summary += `**Collection Timepoints:** ${data_collection.collection_timepoints.join(', ')}\n\n`;
  summary += `**Missing Data Handling:** ${data_collection.missing_data_handling}\n\n`;

  // Analysis Section
  summary += '## Statistical Analysis\n\n';
  summary += `**Primary Analysis:** ${analysis_plan.primary_analysis_method}\n\n`;

  if (analysis_plan.secondary_analysis_methods.length > 0) {
    summary += `**Secondary Analyses:** ${analysis_plan.secondary_analysis_methods.join(', ')}\n\n`;
  }

  if (analysis_plan.sensitivity_analyses && analysis_plan.sensitivity_analyses.length > 0) {
    summary += `**Sensitivity Analyses:** ${analysis_plan.sensitivity_analyses.join(', ')}\n\n`;
  }

  summary += `**Missing Data Approach:** ${analysis_plan.missing_data_approach}\n\n`;
  summary += `**Software:** ${analysis_plan.statistical_software}\n\n`;
  summary += `**Significance Level:** α = ${analysis_plan.significance_level}\n\n`;

  // Timeline Section
  summary += '## Project Timeline\n\n';
  summary += `**Total Duration:** ${timeline.total_duration}\n\n`;

  if (timeline.recruitment_period) {
    summary += `**Recruitment Period:** ${timeline.recruitment_period}\n\n`;
  }

  if (timeline.data_collection_period) {
    summary += `**Data Collection Period:** ${timeline.data_collection_period}\n\n`;
  }

  if (timeline.analysis_period) {
    summary += `**Analysis Period:** ${timeline.analysis_period}\n\n`;
  }

  summary += '**Key Milestones:**\n';
  timeline.milestones.forEach((milestone) => {
    summary += `- **${milestone.name}** (${milestone.target_date}): ${milestone.deliverable}\n`;
  });

  return summary;
}

/**
 * Generate study design rationale document in Markdown format
 * Explains and justifies the chosen study design
 * @param studyDesign - Study design specification
 * @param context - Additional context (project type, aims, constraints)
 * @returns Markdown formatted rationale
 */
export function generateDesignRationale(
  studyDesign: StudyDesign,
  context: {
    projectType: string;
    aims: string[];
    constraints?: string[];
  }
): string {
  let rationale = '# Study Design Rationale\n\n';

  rationale += '## Project Context\n\n';
  rationale += `**Project Type:** ${context.projectType}\n\n`;

  rationale += '**Study Aims:**\n';
  context.aims.forEach((aim, idx) => {
    rationale += `${idx + 1}. ${aim}\n`;
  });
  rationale += '\n';

  if (context.constraints && context.constraints.length > 0) {
    rationale += '**Constraints:**\n';
    context.constraints.forEach((constraint) => {
      rationale += `- ${constraint}\n`;
    });
    rationale += '\n';
  }

  rationale += '## Selected Design\n\n';
  rationale += `**Design Type:** ${studyDesign.type}\n\n`;

  if (studyDesign.subtype) {
    rationale += `**Design Subtype:** ${studyDesign.subtype}\n\n`;
  }

  rationale += '## Design Characteristics\n\n';

  const characteristics: string[] = [];

  if (studyDesign.is_randomised) {
    characteristics.push('Randomised allocation to groups');
  }

  if (studyDesign.is_blinded) {
    characteristics.push(`Blinding (${studyDesign.blinding_type || 'specified'})`);
  }

  if (studyDesign.control_type) {
    characteristics.push(`Control type: ${studyDesign.control_type}`);
  }

  characteristics.push(`Follows ${studyDesign.reporting_guideline} reporting guideline`);

  characteristics.forEach((char) => {
    rationale += `- ${char}\n`;
  });
  rationale += '\n';

  rationale += '## Justification\n\n';
  rationale += `${studyDesign.justification}\n\n`;

  rationale += '## Methodological Strengths\n\n';

  // Add design-specific strengths
  if (studyDesign.is_randomised) {
    rationale += '- **Randomisation** minimises selection bias and balances known and unknown confounders between groups\n';
  }

  if (studyDesign.is_blinded) {
    rationale += '- **Blinding** reduces performance and detection bias\n';
  }

  if (studyDesign.requires_sample_size) {
    rationale += '- **Sample size calculation** ensures adequate statistical power to detect meaningful effects\n';
  }

  rationale += `- **${studyDesign.reporting_guideline} compliance** ensures transparent and complete reporting\n\n`;

  rationale += '## Methodological Limitations\n\n';
  rationale += '*To be completed based on specific design considerations and context.*\n\n';

  rationale += '## Alternative Designs Considered\n\n';
  rationale += '*To be completed if alternative designs were evaluated.*\n\n';

  return rationale;
}

/**
 * Format participant specification as annotated JSON
 * @param participants - Participant specification
 * @returns JSON string with comments
 */
export function formatParticipantSpec(participants: ParticipantSpec): string {
  const spec = {
    _comment: 'Participant Specification - Eligibility criteria and recruitment strategy',

    inclusion_criteria: participants.inclusion_criteria.map((criterion) => ({
      description: criterion.description,
      rationale: criterion.rationale || null,
    })),

    exclusion_criteria: participants.exclusion_criteria.map((criterion) => ({
      description: criterion.description,
      rationale: criterion.rationale || null,
    })),

    sample_size: participants.sample_size ? {
      target: participants.sample_size.target,
      calculation_method: participants.sample_size.calculation_method,
      assumptions: {
        effect_size: participants.sample_size.assumptions.effect_size,
        power: participants.sample_size.assumptions.power,
        alpha: participants.sample_size.assumptions.alpha,
        attrition_rate: participants.sample_size.assumptions.attrition_rate,
      },
      justification: participants.sample_size.justification,
    } : null,

    recruitment_strategy: {
      method: participants.recruitment_strategy.method,
      sites: participants.recruitment_strategy.sites,
      estimated_duration: participants.recruitment_strategy.estimated_duration,
      feasibility_justification: participants.recruitment_strategy.feasibility_justification,
    },

    flags: {
      capacity_issues: participants.capacity_issues,
      vulnerable_population: participants.vulnerable_population,
    },
  };

  return JSON.stringify(spec, null, 2);
}

/**
 * Format outcome definitions as structured JSON table format
 * @param outcomes - Outcome specification
 * @returns JSON string formatted for table display
 */
export function formatOutcomeDefinitions(outcomes: OutcomeSpec): string {
  const formatted = {
    _comment: 'Outcome Definitions - Primary and secondary outcomes with measurement details',

    primary_outcome: {
      name: outcomes.primary.name,
      definition: outcomes.primary.definition,
      measurement_tool: outcomes.primary.measurement_tool,
      measurement_timing: outcomes.primary.measurement_timing,
      clinically_meaningful_difference: outcomes.primary.clinically_meaningful_difference || null,
    },

    secondary_outcomes: outcomes.secondary.map((outcome) => ({
      name: outcome.name,
      definition: outcome.definition,
      measurement_tool: outcome.measurement_tool,
      measurement_timing: outcome.measurement_timing,
    })),

    outcome_count: {
      primary: 1,
      secondary: outcomes.secondary.length,
      total: 1 + outcomes.secondary.length,
    },
  };

  return JSON.stringify(formatted, null, 2);
}

/**
 * Generate analysis plan in narrative Markdown format
 * @param analysis - Analysis plan specification
 * @returns Markdown formatted analysis plan
 */
export function generateAnalysisPlanMarkdown(analysis: AnalysisPlan): string {
  let plan = '# Statistical Analysis Plan\n\n';

  plan += '## Analysis Software\n\n';
  plan += `All statistical analyses will be conducted using ${analysis.statistical_software}.\n\n`;

  plan += '## Significance Level\n\n';
  plan += `A two-sided significance level of α = ${analysis.significance_level} will be used for all hypothesis tests.\n\n`;

  plan += '## Primary Analysis\n\n';
  plan += `The primary analysis will use **${analysis.primary_analysis_method}**. `;
  plan += 'This analysis will address the primary research question and evaluate the primary outcome.\n\n';

  if (analysis.secondary_analysis_methods.length > 0) {
    plan += '## Secondary Analyses\n\n';
    plan += 'The following secondary analyses will be performed:\n\n';
    analysis.secondary_analysis_methods.forEach((method, idx) => {
      plan += `${idx + 1}. ${method}\n`;
    });
    plan += '\n';
    plan += 'Secondary analyses will be clearly labeled as exploratory and will not be used for definitive conclusions.\n\n';
  }

  if (analysis.sensitivity_analyses && analysis.sensitivity_analyses.length > 0) {
    plan += '## Sensitivity Analyses\n\n';
    plan += 'To assess the robustness of the primary findings, the following sensitivity analyses will be conducted:\n\n';
    analysis.sensitivity_analyses.forEach((method, idx) => {
      plan += `${idx + 1}. ${method}\n`;
    });
    plan += '\n';
  }

  if (analysis.subgroup_analyses && analysis.subgroup_analyses.length > 0) {
    plan += '## Subgroup Analyses\n\n';
    plan += 'Exploratory subgroup analyses will be performed for:\n\n';
    analysis.subgroup_analyses.forEach((subgroup, idx) => {
      plan += `${idx + 1}. ${subgroup}\n`;
    });
    plan += '\n';
    plan += 'Subgroup analyses are hypothesis-generating and will be interpreted with caution.\n\n';
  }

  plan += '## Missing Data\n\n';
  plan += `Missing data will be handled using **${analysis.missing_data_approach}**. `;

  if (analysis.missing_data_approach.toLowerCase().includes('complete case')) {
    plan += 'Only participants with complete data for the relevant analysis will be included. ';
    plan += 'The amount and pattern of missing data will be reported, and sensitivity to the missing data assumptions will be assessed.\n\n';
  } else if (analysis.missing_data_approach.toLowerCase().includes('multiple imputation')) {
    plan += 'Multiple imputation will be used to account for missing data under a missing at random (MAR) assumption. ';
    plan += 'Imputation models will include relevant baseline and outcome variables. ';
    plan += 'Results will be pooled across imputed datasets using Rubin\'s rules.\n\n';
  } else {
    plan += 'The rationale for this approach and its assumptions will be clearly stated.\n\n';
  }

  plan += '## Sample Size and Power\n\n';
  plan += 'Sample size calculations are detailed in the Participants section. ';
  plan += 'The study is powered to detect the specified effect size with adequate statistical power.\n\n';

  plan += '## Reporting Standards\n\n';
  plan += 'All analyses will be reported following appropriate statistical reporting guidelines. ';
  plan += 'Effect sizes and their confidence intervals will be reported alongside p-values. ';
  plan += 'Multiple testing corrections will be applied where appropriate.\n\n';

  return plan;
}

/**
 * Format project timeline as JSON suitable for Gantt chart visualization
 * @param timeline - Project timeline specification
 * @returns JSON string formatted for Gantt chart tools
 */
export function formatTimelineJSON(timeline: ProjectTimeline): string {
  const formatted = {
    _comment: 'Project Timeline - Formatted for Gantt chart visualization',

    project: {
      total_duration: timeline.total_duration,
      recruitment_period: timeline.recruitment_period || null,
      data_collection_period: timeline.data_collection_period || null,
      analysis_period: timeline.analysis_period || null,
    },

    grant_alignment: timeline.grant_alignment || null,

    milestones: timeline.milestones.map((milestone) => ({
      id: milestone.name.toLowerCase().replace(/\s+/g, '_'),
      name: milestone.name,
      target_date: milestone.target_date,
      deliverable: milestone.deliverable,
      responsible_party: milestone.responsible_party || null,
    })),

    phases: generateTimelinePhases(timeline),
  };

  return JSON.stringify(formatted, null, 2);
}

/**
 * Helper function to generate timeline phases from milestones
 */
function generateTimelinePhases(timeline: ProjectTimeline): Array<{
  name: string;
  start_date: string | null;
  end_date: string | null;
}> {
  const phases: Array<{ name: string; start_date: string | null; end_date: string | null }> = [];

  // Extract dates from milestones to define phases
  const sortedMilestones = [...timeline.milestones].sort((a, b) =>
    new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
  );

  if (sortedMilestones.length > 0) {
    // Setup phase
    phases.push({
      name: 'Setup and Ethics',
      start_date: sortedMilestones[0].target_date,
      end_date: null, // To be determined
    });

    // Recruitment phase
    if (timeline.recruitment_period) {
      phases.push({
        name: 'Recruitment',
        start_date: null,
        end_date: null,
      });
    }

    // Data collection phase
    if (timeline.data_collection_period) {
      phases.push({
        name: 'Data Collection',
        start_date: null,
        end_date: null,
      });
    }

    // Analysis phase
    if (timeline.analysis_period) {
      phases.push({
        name: 'Analysis and Reporting',
        start_date: null,
        end_date: null,
      });
    }
  }

  return phases;
}

/**
 * Generate publication-ready methods section draft using LLM
 * Target length: 1500-2000 words
 * Follows appropriate reporting guidelines (CONSORT, STROBE, SQUIRE, etc.)
 * @param methodology - Complete methodology specification
 * @returns Promise resolving to Markdown formatted methods section
 */
export async function generateMethodsDraft(methodology: Methodology): Promise<string> {
  const { study_design, setting_sites, participants, outcomes, procedures, data_collection, analysis_plan } = methodology;

  const prompt = `You are a medical research methodologist writing a Methods section for a research protocol.

Generate a publication-ready Methods section (1500-2000 words) following the ${study_design.reporting_guideline} reporting guideline.

## Study Details

**Study Design:** ${study_design.type}${study_design.subtype ? ` (${study_design.subtype})` : ''}
**Reporting Guideline:** ${study_design.reporting_guideline}
**Randomised:** ${study_design.is_randomised}
**Blinded:** ${study_design.is_blinded ? study_design.blinding_type : 'No'}
${study_design.control_type ? `**Control:** ${study_design.control_type}` : ''}

## Setting

${setting_sites.map(site => `${site.name} (${site.type}), ${site.location} - ${site.capacity}`).join('\n')}

## Participants

**Inclusion Criteria:**
${participants.inclusion_criteria.map((c, i) => `${i + 1}. ${c.description}`).join('\n')}

**Exclusion Criteria:**
${participants.exclusion_criteria.map((c, i) => `${i + 1}. ${c.description}`).join('\n')}

${participants.sample_size ? `
**Sample Size:** ${participants.sample_size.target} (${participants.sample_size.calculation_method})
- Effect size: ${participants.sample_size.assumptions.effect_size}
- Power: ${participants.sample_size.assumptions.power}
- Alpha: ${participants.sample_size.assumptions.alpha}
- Attrition: ${participants.sample_size.assumptions.attrition_rate}
- Justification: ${participants.sample_size.justification}
` : ''}

**Recruitment:** ${participants.recruitment_strategy.method} over ${participants.recruitment_strategy.estimated_duration}

## Outcomes

**Primary:** ${outcomes.primary.name}
- Definition: ${outcomes.primary.definition}
- Measurement: ${outcomes.primary.measurement_tool}
- Timing: ${outcomes.primary.measurement_timing}

${outcomes.secondary.length > 0 ? `**Secondary Outcomes:**
${outcomes.secondary.map(o => `- ${o.name}: ${o.definition} (${o.measurement_tool})`).join('\n')}` : ''}

## Procedures

${procedures.overview}

${procedures.intervention_description ? `**Intervention:** ${procedures.intervention_description}` : ''}
${procedures.control_description ? `**Control:** ${procedures.control_description}` : ''}

## Data Collection

**Data Types:** ${data_collection.data_types.join(', ')}
**Identifiable Data:** ${data_collection.includes_identifiable_data}

**Instruments:**
${data_collection.instruments.map(i => `- ${i.name} (${i.type})${i.validated ? ' - Validated' : ''}`).join('\n')}

**Timepoints:** ${data_collection.collection_timepoints.join(', ')}
**Missing Data:** ${data_collection.missing_data_handling}

## Statistical Analysis

**Primary Analysis:** ${analysis_plan.primary_analysis_method}
${analysis_plan.secondary_analysis_methods.length > 0 ? `**Secondary Analyses:** ${analysis_plan.secondary_analysis_methods.join(', ')}` : ''}
${analysis_plan.sensitivity_analyses && analysis_plan.sensitivity_analyses.length > 0 ? `**Sensitivity Analyses:** ${analysis_plan.sensitivity_analyses.join(', ')}` : ''}
${analysis_plan.subgroup_analyses && analysis_plan.subgroup_analyses.length > 0 ? `**Subgroup Analyses:** ${analysis_plan.subgroup_analyses.join(', ')}` : ''}
**Missing Data Approach:** ${analysis_plan.missing_data_approach}
**Software:** ${analysis_plan.statistical_software}
**Significance:** α = ${analysis_plan.significance_level}

## Instructions

Write a cohesive, professional Methods section that:

1. **Follows the ${study_design.reporting_guideline} structure** (appropriate headings)
2. **Uses past/future tense appropriately** (if protocol vs completed study)
3. **Provides sufficient detail** for replication
4. **Is written in clear, professional prose** (not bullet points)
5. **Is 1500-2000 words in length**
6. **Includes all required reporting elements** for ${study_design.reporting_guideline}
7. **Cites measurement instruments** where appropriate
8. **Explains rationale** for key methodological choices
9. **Uses appropriate subsections** (Study Design, Setting, Participants, Interventions, Outcomes, Sample Size, Statistical Methods, etc.)

Return ONLY the Methods section in Markdown format with appropriate headings. Do not include a title or preamble.`;

  const systemPrompt = `You are an expert medical research methodologist and biostatistician. You write clear, precise, and comprehensive Methods sections for research protocols and manuscripts. You are familiar with all major reporting guidelines (CONSORT, STROBE, SQUIRE, PRISMA, etc.) and write in formal academic English suitable for publication in peer-reviewed medical journals.`;

  const draft = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    systemPrompt,
    temperature: 0.3, // Lower temperature for more consistent, formal writing
  });

  return draft;
}
