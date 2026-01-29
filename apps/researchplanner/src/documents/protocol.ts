/**
 * Research Protocol Document Generation
 * Phase 8.3 - Protocol Document Generation
 *
 * Implements protocol document generation per spec section 3.6.3.
 * Orchestrates all protocol sections including title, synopsis, methods,
 * ethics, and references into a complete DOCX document.
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
} from 'docx';
import {
  Project,
  ResearchResults,
  Methodology,
  EthicsEvaluation,
  ParticipantSpec,
  OutcomeSpec,
  Criterion,
} from '../types/index.js';
import { callLLM } from '../utils/llm.js';
import {
  buildTitlePage,
  buildVersionHistory,
  buildSection,
  buildSynopsis,
  buildReferences,
  buildBulletList,
  buildNumberedList,
} from './sections.js';

/**
 * Protocol content mapping per spec section 3.6.3
 */
const PROTOCOL_CONTENT_MAP = {
  title_page: {
    source: ['project.intake.project_title', 'project.intake.principal_investigator'],
    template_section: 'header',
  },
  version_history: {
    source: ['document.metadata'],
    template_section: 'version_table',
  },
  protocol_synopsis: {
    source: ['project.intake', 'methodology'],
    template_section: 'synopsis_table',
    word_limit: 500,
  },
  introduction: {
    source: ['research.background_draft'],
    template_section: 'section_1',
    word_limit: 250,
  },
  background: {
    source: ['research.literature_summary', 'research.gap_analysis'],
    template_section: 'section_2',
    word_limit: 1500,
  },
  aims_objectives: {
    source: ['methodology.outcomes'],
    template_section: 'section_3',
    word_limit: 300,
  },
  methods: {
    source: ['methodology'],
    template_section: 'section_4',
    word_limit: 2000,
  },
  participants: {
    source: ['methodology.participants'],
    template_section: 'section_5',
  },
  outcomes: {
    source: ['methodology.outcomes'],
    template_section: 'section_6',
  },
  procedures: {
    source: ['methodology.procedures'],
    template_section: 'section_7',
  },
  data_management: {
    source: ['ethics.data_governance'],
    template_section: 'section_10',
  },
  ethical_considerations: {
    source: ['ethics'],
    template_section: 'section_11',
  },
  dissemination: {
    source: ['project.intake.intended_outcomes'],
    template_section: 'section_12',
    word_limit: 250,
  },
  references: {
    source: ['research.citations'],
    template_section: 'section_13',
  },
  timeline: {
    source: ['methodology.timeline'],
    template_section: 'figure_1',
  },
};

/**
 * Generate complete research protocol document
 * Orchestrates all sections per spec section 3.6.3
 *
 * @param project - Complete project record
 * @param research - Research results from Stage 2
 * @param methodology - Methodology specification from Stage 3
 * @param ethics - Ethics evaluation from Stage 4
 * @returns DOCX buffer ready for saving
 */
export async function generateProtocol(
  project: Project,
  research: ResearchResults,
  methodology: Methodology,
  ethics: EthicsEvaluation
): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // 1. Title page
  const titlePageContent = buildTitlePage(
    project.intake.project_title,
    `${project.intake.principal_investigator.name}, ${project.intake.principal_investigator.title}`,
    new Date().toLocaleDateString()
  );
  sections.push(...titlePageContent);

  // 2. Version history table
  const versionTable = buildVersionHistory('1.0', ['Initial version']);
  sections.push(
    new Paragraph({
      text: 'Version History',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  sections.push(new Paragraph({ children: [versionTable] }));
  sections.push(
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // 3. Protocol synopsis table
  sections.push(
    new Paragraph({
      text: 'Protocol Synopsis',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const synopsisData = {
    'Project Title': project.intake.project_title,
    'Principal Investigator': project.intake.principal_investigator.name,
    'Study Design': methodology.study_design.type,
    'Target Population': project.intake.target_population,
    Setting: project.intake.setting,
    'Sample Size': methodology.participants.sample_size
      ? `${methodology.participants.sample_size.target}`
      : 'Not applicable',
    'Primary Outcome': methodology.outcomes.primary.name,
    'Ethics Pathway': ethics.ethics_pathway.pathway,
    'Estimated Duration': methodology.timeline.total_duration,
  };
  const synopsisTable = buildSynopsis(synopsisData);
  sections.push(new Paragraph({ children: [synopsisTable] }));
  sections.push(
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // 4. Introduction (250 words)
  sections.push(
    new Paragraph({
      text: 'Introduction',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const introductionParagraphs = await generateIntroduction(project);
  sections.push(...introductionParagraphs);

  // 5. Background (from research.evidence_synthesis, 1500 words)
  sections.push(
    new Paragraph({
      text: 'Background',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const backgroundContent = research.evidence_synthesis || research.background_draft || '';
  sections.push(...buildSection(backgroundContent));

  // 6. Aims and objectives
  sections.push(
    new Paragraph({
      text: 'Aims and Objectives',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const aimsObjectivesParagraphs = formatAimsObjectives(methodology);
  sections.push(...aimsObjectivesParagraphs);

  // 7. Methods (2000 words)
  sections.push(
    new Paragraph({
      text: 'Methods',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const methodsParagraphs = await generateMethods(methodology);
  sections.push(...methodsParagraphs);

  // 8. Participants (inclusion/exclusion)
  sections.push(
    new Paragraph({
      text: 'Participants',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const participantsParagraphs = formatParticipants(methodology.participants);
  sections.push(...participantsParagraphs);

  // 9. Outcomes (primary/secondary)
  sections.push(
    new Paragraph({
      text: 'Outcomes',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const outcomesParagraphs = formatOutcomes(methodology.outcomes);
  sections.push(...outcomesParagraphs);

  // 10. Procedures
  sections.push(
    new Paragraph({
      text: 'Procedures',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  if (methodology.procedures) {
    sections.push(...buildSection(methodology.procedures.overview));
    if (methodology.procedures.step_by_step_protocol) {
      sections.push(
        new Paragraph({
          text: 'Step-by-Step Protocol',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      const steps = methodology.procedures.step_by_step_protocol.map(
        (step) => `**Step ${step.step_number}:** ${step.description}`
      );
      sections.push(...buildNumberedList(steps));
    }
  }

  // 11. Data management
  sections.push(
    new Paragraph({
      text: 'Data Management',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  if (ethics.data_governance) {
    const dataManagementContent = [
      `**Data Types:** ${ethics.data_governance.data_types.join(', ')}`,
      `**Storage Location:** ${ethics.data_governance.storage_requirements.location}`,
      `**Encryption:** ${ethics.data_governance.storage_requirements.encryption ? 'Yes' : 'No'}`,
      `**Retention Period:** ${ethics.data_governance.retention_period}`,
      `**Disposal Method:** ${ethics.data_governance.disposal_method}`,
    ];
    sections.push(...buildSection(dataManagementContent.join('\n\n')));
  }

  // 12. Ethical considerations
  sections.push(
    new Paragraph({
      text: 'Ethical Considerations',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const ethicsParagraphs = formatEthics(ethics);
  sections.push(...ethicsParagraphs);

  // 13. Dissemination (250 words)
  sections.push(
    new Paragraph({
      text: 'Dissemination',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    })
  );
  const disseminationParagraphs = await generateDissemination(project);
  sections.push(...disseminationParagraphs);

  // 14. References
  if (research.citations && research.citations.length > 0) {
    const formattedCitations = research.citations.map((c) => c.formatted_citation);
    sections.push(...buildReferences(formattedCitations));
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch in twips (1440 DXA)
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: sections,
      },
    ],
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Generate introduction section (250 words)
 * Uses LLM to create concise introduction from project concept
 *
 * @param project - Project record
 * @returns Array of Paragraph elements
 */
export async function generateIntroduction(project: Project): Promise<Paragraph[]> {
  const prompt = `You are a medical research writer. Generate a concise introduction (maximum 250 words) for a research protocol based on the following project information:

Project Title: ${project.intake.project_title}
Clinical Problem: ${project.intake.clinical_problem}
Target Population: ${project.intake.target_population}
Setting: ${project.intake.setting}

The introduction should:
1. Briefly state the clinical problem
2. Introduce the target population
3. Explain the significance of the research
4. Preview the study's purpose

Write in clear, academic prose. Maximum 250 words.`;

  const introText = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1024,
    temperature: 0.7,
  });

  return buildSection(introText);
}

/**
 * Format aims and objectives section
 * Structures outcomes into clear aims and objectives
 *
 * @param methodology - Methodology specification
 * @returns Array of Paragraph elements
 */
export function formatAimsObjectives(methodology: Methodology): Paragraph[] {
  const sections: Paragraph[] = [];

  // Primary aim
  sections.push(
    new Paragraph({
      text: 'Primary Aim',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  sections.push(
    new Paragraph({
      text: methodology.outcomes.primary.definition,
      spacing: { after: 120 },
    })
  );

  // Secondary objectives
  if (methodology.outcomes.secondary.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Secondary Objectives',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );
    const objectives = methodology.outcomes.secondary.map((obj) => obj.definition);
    sections.push(...buildNumberedList(objectives));
  }

  return sections;
}

/**
 * Generate methods section (2000 words)
 * Uses LLM to create comprehensive methods description
 *
 * @param methodology - Methodology specification
 * @returns Array of Paragraph elements
 */
export async function generateMethods(methodology: Methodology): Promise<Paragraph[]> {
  const prompt = `You are a medical research writer. Generate a comprehensive methods section (maximum 2000 words) for a research protocol with the following methodology:

Study Design: ${methodology.study_design.type} (${methodology.study_design.subtype || 'standard'})
Reporting Guideline: ${methodology.study_design.reporting_guideline}
Randomised: ${methodology.study_design.is_randomised ? 'Yes' : 'No'}
Blinded: ${methodology.study_design.is_blinded ? 'Yes' : 'No'}
${methodology.study_design.blinding_type ? `Blinding Type: ${methodology.study_design.blinding_type}` : ''}

Study Sites:
${methodology.setting_sites.map((site) => `- ${site.name} (${site.type}): ${site.location}`).join('\n')}

Sample Size: ${methodology.participants.sample_size ? `${methodology.participants.sample_size.target} participants (${methodology.participants.sample_size.calculation_method})` : 'Not applicable'}

Primary Outcome: ${methodology.outcomes.primary.name}
Measurement: ${methodology.outcomes.primary.measurement_tool}
Timing: ${methodology.outcomes.primary.measurement_timing}

Analysis Plan:
Primary Analysis: ${methodology.analysis_plan.primary_analysis_method}
Statistical Software: ${methodology.analysis_plan.statistical_software}
Significance Level: ${methodology.analysis_plan.significance_level}

The methods section should:
1. Describe the study design and rationale
2. Explain the study setting and sites
3. Detail the sample size calculation (if applicable)
4. Describe outcome measurement approach
5. Explain the statistical analysis plan
6. Follow ${methodology.study_design.reporting_guideline} guidelines

Write in clear, academic prose. Maximum 2000 words.`;

  const methodsText = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.5,
  });

  return buildSection(methodsText);
}

/**
 * Format participants section (inclusion/exclusion criteria)
 *
 * @param participants - Participant specification
 * @returns Array of Paragraph elements
 */
export function formatParticipants(participants: ParticipantSpec): Paragraph[] {
  const sections: Paragraph[] = [];

  // Inclusion criteria
  sections.push(
    new Paragraph({
      text: 'Inclusion Criteria',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  const inclusionCriteria = participants.inclusion_criteria.map((c) => c.description);
  sections.push(...buildNumberedList(inclusionCriteria));

  // Exclusion criteria
  sections.push(
    new Paragraph({
      text: 'Exclusion Criteria',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  const exclusionCriteria = participants.exclusion_criteria.map((c) => c.description);
  sections.push(...buildNumberedList(exclusionCriteria));

  // Recruitment strategy
  sections.push(
    new Paragraph({
      text: 'Recruitment Strategy',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  const recruitmentDetails = [
    `**Method:** ${participants.recruitment_strategy.method}`,
    `**Duration:** ${participants.recruitment_strategy.estimated_duration}`,
    `**Sites:** ${participants.recruitment_strategy.sites.join(', ')}`,
    `**Feasibility:** ${participants.recruitment_strategy.feasibility_justification}`,
  ];
  sections.push(...buildSection(recruitmentDetails.join('\n\n')));

  // Sample size (if applicable)
  if (participants.sample_size) {
    sections.push(
      new Paragraph({
        text: 'Sample Size Calculation',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );
    const sampleSizeDetails = [
      `**Target Sample Size:** ${participants.sample_size.target}`,
      `**Calculation Method:** ${participants.sample_size.calculation_method}`,
      `**Effect Size:** ${participants.sample_size.assumptions.effect_size}`,
      `**Power:** ${participants.sample_size.assumptions.power}`,
      `**Alpha:** ${participants.sample_size.assumptions.alpha}`,
      `**Attrition Rate:** ${participants.sample_size.assumptions.attrition_rate}`,
      `**Justification:** ${participants.sample_size.justification}`,
    ];
    sections.push(...buildSection(sampleSizeDetails.join('\n\n')));
  }

  return sections;
}

/**
 * Format outcomes section (primary/secondary)
 *
 * @param outcomes - Outcome specification
 * @returns Array of Paragraph elements
 */
export function formatOutcomes(outcomes: OutcomeSpec): Paragraph[] {
  const sections: Paragraph[] = [];

  // Primary outcome
  sections.push(
    new Paragraph({
      text: 'Primary Outcome',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  const primaryDetails = [
    `**Outcome:** ${outcomes.primary.name}`,
    `**Definition:** ${outcomes.primary.definition}`,
    `**Measurement Tool:** ${outcomes.primary.measurement_tool}`,
    `**Timing:** ${outcomes.primary.measurement_timing}`,
  ];
  if (outcomes.primary.clinically_meaningful_difference !== undefined) {
    primaryDetails.push(
      `**Clinically Meaningful Difference:** ${outcomes.primary.clinically_meaningful_difference}`
    );
  }
  sections.push(...buildSection(primaryDetails.join('\n\n')));

  // Secondary outcomes
  if (outcomes.secondary.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Secondary Outcomes',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    outcomes.secondary.forEach((outcome, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. ${outcome.name}`, bold: true }),
          ],
          spacing: { before: 120, after: 60 },
        })
      );
      const secondaryDetails = [
        `**Definition:** ${outcome.definition}`,
        `**Measurement Tool:** ${outcome.measurement_tool}`,
        `**Timing:** ${outcome.measurement_timing}`,
      ];
      sections.push(...buildSection(secondaryDetails.join('\n\n')));
    });
  }

  return sections;
}

/**
 * Format ethics section
 * Describes ethics pathway, risk assessment, consent, and governance
 *
 * @param ethics - Ethics evaluation
 * @returns Array of Paragraph elements
 */
export function formatEthics(ethics: EthicsEvaluation): Paragraph[] {
  const sections: Paragraph[] = [];

  // Ethics pathway
  sections.push(
    new Paragraph({
      text: 'Ethics Approval Pathway',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  const pathwayDetails = [
    `**Pathway:** ${ethics.ethics_pathway.pathway}`,
    `**Approval Body:** ${ethics.ethics_pathway.approval_body}`,
    `**HREC Required:** ${ethics.ethics_pathway.requires_hrec ? 'Yes' : 'No'}`,
    `**RGO Required:** ${ethics.ethics_pathway.requires_rgo ? 'Yes' : 'No'}`,
    `**Estimated Timeline:** ${ethics.ethics_pathway.estimated_timeline}`,
  ];
  sections.push(...buildSection(pathwayDetails.join('\n\n')));

  // Risk assessment
  sections.push(
    new Paragraph({
      text: 'Risk Assessment',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Overall Risk Level: ', bold: true }),
        new TextRun({ text: ethics.risk_assessment.level }),
      ],
      spacing: { after: 120 },
    })
  );
  sections.push(
    new Paragraph({
      text: ethics.risk_assessment.overall_justification,
      spacing: { after: 120 },
    })
  );

  if (ethics.risk_assessment.factors.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Risk Factors and Mitigation:',
        bold: true,
        spacing: { before: 120, after: 60 },
      })
    );
    ethics.risk_assessment.factors.forEach((factor) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${factor.category}: `, bold: true }),
            new TextRun({ text: `${factor.risk_level} - ${factor.mitigation}` }),
          ],
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    });
  }

  // Consent requirements
  sections.push(
    new Paragraph({
      text: 'Consent Requirements',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  const consentDetails = [
    `**Consent Type:** ${ethics.consent_requirements.consent_type}`,
    `**Capacity Assessment Required:** ${ethics.consent_requirements.capacity_assessment_required ? 'Yes' : 'No'}`,
    `**Opt-out Available:** ${ethics.consent_requirements.opt_out_available ? 'Yes' : 'No'}`,
    `**Process:** ${ethics.consent_requirements.consent_process_description}`,
  ];
  if (ethics.consent_requirements.waiver_justified && ethics.consent_requirements.waiver_justification) {
    consentDetails.push(`**Waiver Justification:** ${ethics.consent_requirements.waiver_justification}`);
  }
  sections.push(...buildSection(consentDetails.join('\n\n')));

  return sections;
}

/**
 * Generate dissemination section (250 words)
 * Uses LLM to create dissemination plan
 *
 * @param project - Project record
 * @returns Array of Paragraph elements
 */
export async function generateDissemination(project: Project): Promise<Paragraph[]> {
  const prompt = `You are a medical research writer. Generate a concise dissemination plan (maximum 250 words) for a research project based on the following:

Project Title: ${project.intake.project_title}
Intended Outcomes: ${project.intake.intended_outcomes}
${project.intake.grant_target ? `Grant Target: ${project.intake.grant_target}` : ''}

The dissemination section should:
1. Describe planned publication venues (journals, conferences)
2. Identify target audiences (clinicians, patients, policymakers)
3. Outline knowledge translation strategies
4. Mention any community/stakeholder engagement plans

Write in clear, academic prose. Maximum 250 words.`;

  const disseminationText = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1024,
    temperature: 0.7,
  });

  return buildSection(disseminationText);
}
