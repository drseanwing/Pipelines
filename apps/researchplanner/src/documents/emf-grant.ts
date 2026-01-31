/**
 * EMF Grant Application Generation
 *
 * Generates complete Emergency Medicine Foundation (EMF) R44 grant applications
 * with all required sections from project data.
 *
 * Phase 8.4: EMF Grant Application Generation
 *
 * EMF R44 Grant Structure:
 * - Part A: Project Summary (A1-A7)
 * - Part B: Scientific Merit (B1-B5)
 * - Part C: Ethics and Governance (C1-C2)
 * - Part D: Health Economics (conditional)
 * - Part E: Budget
 * - Part F: Principal Investigator
 * - Part G: Research Team
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
} from 'docx';
import { DocumentGenerator } from './engine.js';
import { buildSection, markdownToParagraphs, buildSimpleTable, buildBulletList } from './sections.js';
import { callLLM } from '../utils/llm.js';
import type { IntakeData } from '../types/project.js';
import type { ResearchResults } from '../types/research.js';
import type { Methodology } from '../types/methodology.js';
import type { EthicsEvaluation } from '../types/ethics.js';

/**
 * EMF Application section mapping
 * Maps project data fields to EMF application sections
 */
export const EMF_APPLICATION_MAP = {
  PART_A: {
    A1_project_title: 'intake.project_title',
    A2_principal_investigator: 'intake.principal_investigator',
    A3_co_investigators: 'intake.co_investigators',
    A4_plain_language_summary: 'generated', // 250 words
    A5_scientific_abstract: 'generated', // 450 words
    A6_em_relevance: 'generated', // 100 words
    A7_research_themes: 'generated', // Checkbox selection
  },
  PART_B: {
    B1_background_rationale: 'generated', // 1500 words
    B2_aims_objectives: 'generated', // 300 words
    B3_design_methods: 'generated', // 2000 words
    B4_innovation_impact: 'generated', // 750 words
    B5_translation_plan: 'generated', // 400 words
  },
  PART_C: {
    C1_ethics_status: 'ethics.ethics_pathway',
    C2_indigenous_relevance: 'generated',
  },
  PART_D: {
    health_economics: 'conditional', // Only if relevant
  },
  PART_E: {
    budget: 'generated',
  },
  PART_F: {
    principal_investigator: 'intake.principal_investigator',
  },
  PART_G: {
    research_team: 'intake.co_investigators',
  },
};

/**
 * EMF research themes for checkbox selection
 */
const EMF_RESEARCH_THEMES = [
  'Emergency care delivery and systems',
  'Clinical decision-making and diagnostics',
  'Patient safety and quality improvement',
  'Resuscitation and critical care',
  'Trauma and injury prevention',
  'Mental health and toxicology',
  'Paediatric emergency medicine',
  'Pre-hospital and disaster medicine',
  'Health services and workforce research',
  'Implementation science and knowledge translation',
];

/**
 * EMF Grant Application Generator
 *
 * Extends DocumentGenerator to create EMF-specific grant applications
 * with all required sections and formatting.
 */
export class EMFGrantGenerator extends DocumentGenerator {
  /**
   * Generate complete EMF R44 grant application
   *
   * @param intake - Project intake data
   * @param research - Research results
   * @param methodology - Study methodology
   * @param ethics - Ethics evaluation
   * @returns Promise resolving to DOCX buffer
   */
  async generateEMFApplication(
    intake: IntakeData,
    research: ResearchResults,
    methodology: Methodology,
    ethics: EthicsEvaluation
  ): Promise<Buffer> {
    // Generate all LLM content sections in parallel
    const [
      plainLanguageSummary,
      scientificAbstract,
      emRelevance,
      backgroundRationale,
      aimsObjectives,
      designMethods,
      innovationImpact,
      translationPlan,
      indigenousRelevance,
    ] = await Promise.all([
      this.generatePlainLanguageSummary(intake),
      this.generateScientificAbstract(intake, methodology),
      this.generateEMRelevance(intake),
      this.generateBackgroundRationale(research),
      this.generateAimsObjectives(methodology),
      this.generateDesignMethods(methodology),
      this.generateInnovationImpact(intake, research),
      this.generateTranslationPlan(intake),
      this.assessIndigenousRelevance(intake, methodology),
    ]);

    const researchThemes = this.selectResearchThemes(intake);

    // Build document sections
    const sections: Paragraph[] = [];

    // Title page
    sections.push(
      new Paragraph({
        text: 'Emergency Medicine Foundation',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'Research Grant Application Form',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: intake.project_title,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    );

    // PART A: Project Summary
    sections.push(
      new Paragraph({
        text: 'PART A: PROJECT SUMMARY',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: 'A1. Project Title',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        text: intake.project_title,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'A2. Principal Investigator',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...this.formatPrincipalInvestigator(intake.principal_investigator),
      new Paragraph({
        text: 'A3. Co-Investigators',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...this.formatResearchTeam(intake.co_investigators),
      new Paragraph({
        text: 'A4. Plain Language Summary (250 words)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(plainLanguageSummary),
      new Paragraph({
        text: 'A5. Scientific Abstract (450 words)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(scientificAbstract),
      new Paragraph({
        text: 'A6. Emergency Medicine Relevance (100 words)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(emRelevance),
      new Paragraph({
        text: 'A7. Research Themes',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...this.formatResearchThemes(researchThemes)
    );

    // PART B: Scientific Merit
    sections.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      }),
      new Paragraph({
        text: 'PART B: SCIENTIFIC MERIT',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: 'B1. Background and Rationale (1500 words)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(backgroundRationale),
      new Paragraph({
        text: 'B2. Aims and Objectives (300 words)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(aimsObjectives),
      new Paragraph({
        text: 'B3. Study Design and Methods (2000 words)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(designMethods),
      new Paragraph({
        text: 'B4. Innovation and Impact (750 words)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(innovationImpact),
      new Paragraph({
        text: 'B5. Translation and Dissemination Plan (400 words)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(translationPlan)
    );

    // PART C: Ethics and Governance
    sections.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      }),
      new Paragraph({
        text: 'PART C: ETHICS AND GOVERNANCE',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: 'C1. Ethics Status',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        text: this.formatEthicsStatus(ethics),
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'C2. Indigenous Engagement and Relevance',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...markdownToParagraphs(indigenousRelevance)
    );

    // PART D: Health Economics (conditional)
    if (this.requiresHealthEconomics(intake, methodology)) {
      sections.push(
        new Paragraph({
          text: '',
          pageBreakBefore: true,
        }),
        new Paragraph({
          text: 'PART D: HEALTH ECONOMICS',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: 'This project includes a health economics component. Details are provided below.',
          spacing: { after: 200 },
        }),
        // Health economics content would be generated here if available
        new Paragraph({
          text: '[Health economics analysis to be provided]',
          spacing: { after: 200 },
        })
      );
    }

    // PART E: Budget
    sections.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      }),
      new Paragraph({
        text: 'PART E: BUDGET',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      ...this.generateBudgetSection(intake)
    );

    // PART F: Principal Investigator
    sections.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      }),
      new Paragraph({
        text: 'PART F: PRINCIPAL INVESTIGATOR',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      ...this.formatPrincipalInvestigator(intake.principal_investigator)
    );

    // PART G: Research Team
    sections.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      }),
      new Paragraph({
        text: 'PART G: RESEARCH TEAM',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      ...this.formatResearchTeam(intake.co_investigators)
    );

    // Create document
    const doc = new Document({
      styles: this.getDocumentStyles(),
      sections: [
        {
          ...this.getPageProperties(),
          children: sections,
        },
      ],
    });

    return this.generateDocument(doc);
  }

  /**
   * Generate plain language summary (250 words)
   *
   * @param intake - Project intake data
   * @returns Promise resolving to plain language summary
   */
  async generatePlainLanguageSummary(intake: IntakeData): Promise<string> {
    const prompt = `Generate a plain language summary (exactly 250 words) for the following emergency medicine research project:

Project Title: ${intake.project_title}
Clinical Problem: ${intake.clinical_problem}
Target Population: ${intake.target_population}
Setting: ${intake.setting}
Intended Outcomes: ${intake.intended_outcomes}

Requirements:
- Write for a general audience (no jargon)
- Explain why the research is important
- Describe what you will do
- Explain the expected benefits
- Exactly 250 words
- Use simple, clear language
- Focus on real-world impact

Format as flowing prose paragraphs.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1000,
      temperature: 0.7,
      systemPrompt: 'You are an expert at writing plain language summaries for medical research.',
    });
  }

  /**
   * Generate scientific abstract (450 words)
   *
   * @param intake - Project intake data
   * @param methodology - Study methodology
   * @returns Promise resolving to scientific abstract
   */
  async generateScientificAbstract(
    intake: IntakeData,
    methodology: Methodology
  ): Promise<string> {
    const prompt = `Generate a scientific abstract (exactly 450 words) for the following emergency medicine research project:

Project Title: ${intake.project_title}
Clinical Problem: ${intake.clinical_problem}
Study Design: ${methodology.study_design.type} - ${methodology.study_design.justification}
Target Population: ${intake.target_population}
Setting: ${intake.setting}
Primary Outcome: ${methodology.outcomes.primary.name} - ${methodology.outcomes.primary.definition}
Intended Outcomes: ${intake.intended_outcomes}

Requirements:
- Background and rationale (100 words)
- Aims and objectives (50 words)
- Methods and design (200 words)
- Expected outcomes and impact (100 words)
- Total exactly 450 words
- Use structured format with clear sections
- Include technical details appropriate for scientific audience

Format as flowing prose with section headings.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1500,
      temperature: 0.7,
      systemPrompt: 'You are an expert at writing scientific abstracts for medical research grant applications.',
    });
  }

  /**
   * Generate emergency medicine relevance statement (100 words)
   *
   * @param intake - Project intake data
   * @returns Promise resolving to EM relevance statement
   */
  async generateEMRelevance(intake: IntakeData): Promise<string> {
    const prompt = `Generate an Emergency Medicine relevance statement (exactly 100 words) explaining why this research is important for emergency medicine:

Project Title: ${intake.project_title}
Clinical Problem: ${intake.clinical_problem}
Target Population: ${intake.target_population}
Setting: ${intake.setting}

Requirements:
- Explain specific relevance to emergency medicine practice
- Connect to ED workflows, decision-making, or patient care
- Highlight time-sensitive nature or acute care focus
- Exactly 100 words
- Clear and compelling

Format as a single focused paragraph.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 400,
      temperature: 0.7,
      systemPrompt: 'You are an expert in emergency medicine research.',
    });
  }

  /**
   * Select appropriate research themes from EMF list
   *
   * @param intake - Project intake data
   * @returns Array of selected theme names
   */
  selectResearchThemes(intake: IntakeData): string[] {
    const themes: string[] = [];

    const description = `${intake.concept_description} ${intake.clinical_problem}`.toLowerCase();

    // Simple keyword matching for theme selection
    if (description.includes('system') || description.includes('workflow') || description.includes('delivery')) {
      themes.push('Emergency care delivery and systems');
    }

    if (description.includes('decision') || description.includes('diagnostic') || description.includes('triage')) {
      themes.push('Clinical decision-making and diagnostics');
    }

    if (description.includes('safety') || description.includes('quality') || description.includes('qi')) {
      themes.push('Patient safety and quality improvement');
    }

    if (description.includes('resuscitation') || description.includes('critical') || description.includes('icu')) {
      themes.push('Resuscitation and critical care');
    }

    if (description.includes('trauma') || description.includes('injury')) {
      themes.push('Trauma and injury prevention');
    }

    if (description.includes('mental health') || description.includes('toxicology') || description.includes('substance')) {
      themes.push('Mental health and toxicology');
    }

    if (description.includes('paediatric') || description.includes('pediatric') || description.includes('child')) {
      themes.push('Paediatric emergency medicine');
    }

    if (description.includes('pre-hospital') || description.includes('ambulance') || description.includes('disaster')) {
      themes.push('Pre-hospital and disaster medicine');
    }

    if (description.includes('workforce') || description.includes('training') || description.includes('service')) {
      themes.push('Health services and workforce research');
    }

    if (description.includes('implementation') || description.includes('translation') || description.includes('knowledge')) {
      themes.push('Implementation science and knowledge translation');
    }

    // Default to at least one theme
    if (themes.length === 0) {
      themes.push('Emergency care delivery and systems');
    }

    return themes;
  }

  /**
   * Generate background and rationale section (1500 words)
   *
   * @param research - Research results
   * @returns Promise resolving to background section
   */
  async generateBackgroundRationale(research: ResearchResults): Promise<string> {
    const prompt = `Generate a comprehensive background and rationale section (exactly 1500 words) for an emergency medicine research grant application:

Evidence Synthesis: ${research.evidence_synthesis}

Gap Analysis:
${research.gap_analysis.identified_gaps.map(g => `- ${g.description} (${g.gap_type})`).join('\n')}

Requirements:
- Current state of knowledge (500 words)
- Evidence gaps and limitations (400 words)
- Rationale for the proposed study (400 words)
- Significance and urgency (200 words)
- Total exactly 1500 words
- Include citations where appropriate
- Use academic tone
- Build compelling case for research

Format as flowing prose with clear structure.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4000,
      temperature: 0.7,
      systemPrompt: 'You are an expert at writing grant application background sections.',
    });
  }

  /**
   * Generate aims and objectives section (300 words)
   *
   * @param methodology - Study methodology
   * @returns Promise resolving to aims section
   */
  async generateAimsObjectives(methodology: Methodology): Promise<string> {
    const prompt = `Generate an aims and objectives section (exactly 300 words) for an emergency medicine research grant application:

Study Design: ${methodology.study_design.type}
Primary Outcome: ${methodology.outcomes.primary.name} - ${methodology.outcomes.primary.definition}
Secondary Outcomes: ${methodology.outcomes.secondary.map(o => o.name).join(', ')}
Timeline: ${methodology.timeline.total_duration}

Requirements:
- Primary aim (100 words)
- 2-3 specific objectives (200 words)
- Each objective should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Total exactly 300 words
- Clear and concise
- Directly addresses the research gap

Format with clear aim statement followed by numbered objectives.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1000,
      temperature: 0.7,
      systemPrompt: 'You are an expert at writing research aims and objectives.',
    });
  }

  /**
   * Generate design and methods section (2000 words)
   *
   * @param methodology - Study methodology
   * @returns Promise resolving to methods section
   */
  async generateDesignMethods(methodology: Methodology): Promise<string> {
    const prompt = `Generate a comprehensive study design and methods section (exactly 2000 words) for an emergency medicine research grant application:

Study Design: ${methodology.study_design.type} (${methodology.study_design.reporting_guideline})
Justification: ${methodology.study_design.justification}

Setting: ${methodology.setting_sites.map(s => s.name).join(', ')}

Participants:
- Sample size: ${methodology.participants.sample_size?.target || 'Not specified'}
- Inclusion criteria: ${methodology.participants.inclusion_criteria.map(c => c.description).join('; ')}
- Exclusion criteria: ${methodology.participants.exclusion_criteria.map(c => c.description).join('; ')}
- Recruitment: ${methodology.participants.recruitment_strategy.method}

Primary Outcome: ${methodology.outcomes.primary.name}
- Definition: ${methodology.outcomes.primary.definition}
- Measurement: ${methodology.outcomes.primary.measurement_tool}
- Timing: ${methodology.outcomes.primary.measurement_timing}

Secondary Outcomes: ${methodology.outcomes.secondary.map(o => `${o.name} (${o.measurement_tool})`).join('; ')}

Procedures: ${methodology.procedures.overview}

Data Collection: ${methodology.data_collection.instruments.map(i => i.name).join(', ')}

Analysis Plan: ${methodology.analysis_plan.primary_analysis_method}

Requirements:
- Study design and rationale (300 words)
- Setting and participants (400 words)
- Procedures and intervention (500 words)
- Outcome measures (300 words)
- Data collection and management (300 words)
- Statistical analysis (200 words)
- Total exactly 2000 words
- Include sufficient detail for replication
- Reference reporting guidelines (${methodology.study_design.reporting_guideline})

Format as flowing prose with clear subsections.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 5000,
      temperature: 0.7,
      systemPrompt: 'You are an expert at writing detailed research methodology sections.',
    });
  }

  /**
   * Generate innovation and impact section (750 words)
   *
   * @param intake - Project intake data
   * @param research - Research results
   * @returns Promise resolving to innovation section
   */
  async generateInnovationImpact(
    intake: IntakeData,
    research: ResearchResults
  ): Promise<string> {
    const prompt = `Generate an innovation and impact section (exactly 750 words) for an emergency medicine research grant application:

Project: ${intake.project_title}
Clinical Problem: ${intake.clinical_problem}
Intended Outcomes: ${intake.intended_outcomes}

Knowledge Gaps Addressed:
${research.gap_analysis.identified_gaps.map(g => `- ${g.description}`).join('\n')}

Opportunities:
${research.gap_analysis.opportunities.join('\n')}

Requirements:
- What is novel or innovative about this research? (250 words)
- How will this advance emergency medicine practice? (250 words)
- What is the potential impact on patient care? (250 words)
- Total exactly 750 words
- Be specific about innovation
- Quantify impact where possible
- Connect to broader emergency medicine challenges

Format as flowing prose with clear structure.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 2000,
      temperature: 0.7,
      systemPrompt: 'You are an expert at articulating research innovation and impact.',
    });
  }

  /**
   * Generate translation and dissemination plan (400 words)
   *
   * @param intake - Project intake data
   * @returns Promise resolving to translation plan
   */
  async generateTranslationPlan(intake: IntakeData): Promise<string> {
    const prompt = `Generate a translation and dissemination plan (exactly 400 words) for an emergency medicine research project:

Project: ${intake.project_title}
Setting: ${intake.setting}
Intended Outcomes: ${intake.intended_outcomes}

Requirements:
- How will findings be shared with clinicians? (150 words)
- What is the plan for implementation? (150 words)
- How will you measure translation success? (100 words)
- Total exactly 400 words
- Include specific dissemination strategies
- Consider different audiences (clinicians, patients, policymakers)
- Include timelines
- Be realistic and achievable

Format as flowing prose with clear dissemination strategies.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1200,
      temperature: 0.7,
      systemPrompt: 'You are an expert in knowledge translation and research dissemination.',
    });
  }

  /**
   * Format ethics status information
   *
   * @param ethics - Ethics evaluation
   * @returns Formatted ethics status string
   */
  formatEthicsStatus(ethics: EthicsEvaluation): string {
    const pathway = ethics.ethics_pathway.pathway;
    const approvalBody = ethics.ethics_pathway.approval_body;
    const status = ethics.ethics_pathway.status;
    const refNumber = ethics.ethics_pathway.reference_number;

    let statusText = `Ethics Pathway: ${pathway}\n`;
    statusText += `Approval Body: ${approvalBody}\n`;
    statusText += `Status: ${status}\n`;

    if (refNumber) {
      statusText += `Reference Number: ${refNumber}\n`;
    }

    statusText += `\nRequires HREC Review: ${ethics.ethics_pathway.requires_hrec ? 'Yes' : 'No'}\n`;
    statusText += `Requires RGO Review: ${ethics.ethics_pathway.requires_rgo ? 'Yes' : 'No'}\n`;
    statusText += `Risk Level: ${ethics.risk_assessment.level}\n`;
    statusText += `Estimated Timeline: ${ethics.ethics_pathway.estimated_timeline}`;

    return statusText;
  }

  /**
   * Assess indigenous engagement and relevance
   *
   * @param intake - Project intake data
   * @param methodology - Study methodology
   * @returns Promise resolving to indigenous relevance assessment
   */
  async assessIndigenousRelevance(
    intake: IntakeData,
    methodology: Methodology
  ): Promise<string> {
    const prompt = `Assess indigenous engagement and relevance for this emergency medicine research project:

Project: ${intake.project_title}
Target Population: ${intake.target_population}
Setting: ${intake.setting}
Clinical Problem: ${intake.clinical_problem}

Requirements:
- Does this research involve Aboriginal and Torres Strait Islander peoples? (Yes/No/Potentially)
- If yes or potentially, describe engagement strategy
- If no, explain why not applicable
- Address cultural safety considerations
- Maximum 200 words
- Be respectful and specific

Format as a clear assessment with appropriate detail.`;

    return callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 600,
      temperature: 0.7,
      systemPrompt: 'You are knowledgeable about indigenous health research and cultural safety in Australia.',
    });
  }

  /**
   * Generate budget section
   *
   * @param intake - Project intake data
   * @returns Array of paragraphs for budget section
   */
  generateBudgetSection(intake: IntakeData): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        text: 'Budget Summary',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        text: '[Budget details to be provided based on project requirements]',
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'Budget categories typically include:',
        spacing: { after: 120 },
      }),
      new Paragraph({
        text: '• Personnel costs (research staff, investigators)',
        bullet: { level: 0 },
        spacing: { after: 60 },
      }),
      new Paragraph({
        text: '• Equipment and consumables',
        bullet: { level: 0 },
        spacing: { after: 60 },
      }),
      new Paragraph({
        text: '• Travel and conference attendance',
        bullet: { level: 0 },
        spacing: { after: 60 },
      }),
      new Paragraph({
        text: '• Publication and dissemination costs',
        bullet: { level: 0 },
        spacing: { after: 60 },
      }),
      new Paragraph({
        text: '• Other direct costs',
        bullet: { level: 0 },
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'Budget Justification',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        text: '[Detailed justification for each budget line item to be provided]',
        spacing: { after: 200 },
      })
    );

    return paragraphs;
  }

  /**
   * Format principal investigator section
   *
   * @param pi - Principal investigator data
   * @returns Array of paragraphs
   */
  formatPrincipalInvestigator(pi: {
    name: string;
    title: string;
    institution: string;
    department: string;
    email: string;
    phone?: string;
    orcid?: string;
    expertise: string[];
  }): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Name: ', bold: true }),
          new TextRun({ text: `${pi.title} ${pi.name}` }),
        ],
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Institution: ', bold: true }),
          new TextRun({ text: pi.institution }),
        ],
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Department: ', bold: true }),
          new TextRun({ text: pi.department }),
        ],
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Email: ', bold: true }),
          new TextRun({ text: pi.email }),
        ],
        spacing: { after: 120 },
      })
    );

    if (pi.phone) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Phone: ', bold: true }),
            new TextRun({ text: pi.phone }),
          ],
          spacing: { after: 120 },
        })
      );
    }

    if (pi.orcid) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'ORCID: ', bold: true }),
            new TextRun({ text: pi.orcid }),
          ],
          spacing: { after: 120 },
        })
      );
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Expertise: ', bold: true }),
          new TextRun({ text: pi.expertise.join(', ') }),
        ],
        spacing: { after: 200 },
      })
    );

    return paragraphs;
  }

  /**
   * Format research team section
   *
   * @param team - Array of co-investigators
   * @returns Array of paragraphs
   */
  formatResearchTeam(
    team: {
      name: string;
      role: string;
      title: string;
      institution: string;
      department: string;
      email: string;
      expertise: string[];
    }[]
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    if (team.length === 0) {
      paragraphs.push(
        new Paragraph({
          text: 'No co-investigators listed.',
          spacing: { after: 200 },
        })
      );
      return paragraphs;
    }

    team.forEach((member, index) => {
      if (index > 0) {
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { before: 240 },
          })
        );
      }

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${member.title} ${member.name}`,
              bold: true,
              size: 26,
            }),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Role: ', bold: true }),
            new TextRun({ text: member.role }),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Institution: ', bold: true }),
            new TextRun({ text: member.institution }),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Department: ', bold: true }),
            new TextRun({ text: member.department }),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Expertise: ', bold: true }),
            new TextRun({ text: member.expertise.join(', ') }),
          ],
          spacing: { after: 120 },
        })
      );
    });

    return paragraphs;
  }

  /**
   * Format research themes as checkbox list
   *
   * @param selectedThemes - Array of selected theme names
   * @returns Array of paragraphs with checkbox formatting
   */
  private formatResearchThemes(selectedThemes: string[]): Paragraph[] {
    return EMF_RESEARCH_THEMES.map((theme) => {
      const isSelected = selectedThemes.includes(theme);
      return new Paragraph({
        children: [
          new TextRun({
            text: isSelected ? '☑ ' : '☐ ',
            size: 28,
          }),
          new TextRun({
            text: theme,
            bold: isSelected,
          }),
        ],
        spacing: { after: 80 },
      });
    });
  }

  /**
   * Determine if health economics section is required
   *
   * @param intake - Project intake data
   * @param methodology - Study methodology
   * @returns True if health economics is relevant
   */
  private requiresHealthEconomics(
    intake: IntakeData,
    methodology: Methodology
  ): boolean {
    // Check if project mentions cost, economics, or health services
    const description = `${intake.concept_description} ${intake.intended_outcomes}`.toLowerCase();

    return (
      description.includes('cost') ||
      description.includes('economic') ||
      description.includes('health service') ||
      description.includes('resource') ||
      methodology.outcomes.secondary.some(
        (o) => o.name.toLowerCase().includes('cost') || o.name.toLowerCase().includes('economic')
      )
    );
  }
}
