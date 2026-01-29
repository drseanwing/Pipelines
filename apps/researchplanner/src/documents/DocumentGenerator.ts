/**
 * REdI (Resuscitation EDucation Initiative) - Document Generator
 *
 * Main document generator class for creating DOCX documents for the
 * REdI Research Pipeline. Supports multiple document types including
 * research protocols, QI project plans, EMF grant applications,
 * HREC cover letters, PICFs, and data management plans.
 *
 * @module documents/DocumentGenerator
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  HeadingLevel,
  AlignmentType,
  Footer,
  PageNumber,
  Header,
} from 'docx';

import type {
  Project,
  ResearchStageData,
  MethodologyStageData,
  EthicsStageData,
} from '../types/index.js';

import {
  getDocumentStyles,
  getPageProperties,
  FONT_CONFIG,
  FONT_SIZES,
  COLORS,
  getBulletListNumbering,
  getNumberedListNumbering,
} from './styles.js';

import {
  buildTitlePage,
  buildVersionHistorySection,
  buildSynopsisSection,
  buildSection,
  buildSubsection,
  buildReferencesSection,
  buildPageBreak,
  buildInvestigatorTable,
  buildKeyValueTable,
  buildCriteriaSection,
  type VersionHistoryEntry,
} from './sections.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Document generation options
 */
export interface DocumentGenerationOptions {
  /** Document version string */
  version?: string;
  /** Include table of contents */
  includeToc?: boolean;
  /** Include version history */
  includeVersionHistory?: boolean;
  /** Custom version history entries */
  versionHistory?: VersionHistoryEntry[];
  /** Author name for metadata */
  author?: string;
}

/**
 * Document type enum (re-exported for convenience)
 */
export type DocumentTypeValue =
  | 'ResearchProtocol'
  | 'QIProjectPlan'
  | 'EMFApplication'
  | 'HRECCoverLetter'
  | 'PICF'
  | 'DataManagementPlan';

// ============================================================================
// Document Generator Class
// ============================================================================

/**
 * Main document generator class for creating DOCX documents
 *
 * Provides methods for generating various document types required for
 * QI and research projects, including protocols, grant applications,
 * ethics documents, and consent forms.
 *
 * @example
 * ```typescript
 * const generator = new DocumentGenerator();
 *
 * const protocolBuffer = await generator.generateProtocol(
 *   project,
 *   researchData,
 *   methodologyData,
 *   ethicsData
 * );
 *
 * // Save or send the buffer
 * fs.writeFileSync('protocol.docx', protocolBuffer);
 * ```
 */
export class DocumentGenerator {
  private readonly defaultOptions: Required<DocumentGenerationOptions>;

  /**
   * Create a new DocumentGenerator instance
   *
   * @param options - Default options for document generation
   */
  constructor(options: DocumentGenerationOptions = {}) {
    this.defaultOptions = {
      version: options.version ?? '1.0',
      includeToc: options.includeToc ?? false,
      includeVersionHistory: options.includeVersionHistory ?? true,
      versionHistory: options.versionHistory ?? [],
      author: options.author ?? 'REdI Research Pipeline',
    };
  }

  // ==========================================================================
  // Research Protocol Generation
  // ==========================================================================

  /**
   * Generate a Research Protocol document
   *
   * Creates a comprehensive research protocol document following institutional
   * templates with all required sections including background, methodology,
   * ethics, and references.
   *
   * @param project - Project data including intake and classification
   * @param research - Research stage data with literature review results
   * @param methodology - Methodology stage data with study design
   * @param ethics - Ethics stage data with governance information
   * @param options - Optional generation options
   * @returns Promise resolving to Buffer containing the DOCX document
   */
  async generateProtocol(
    project: Project,
    research: ResearchStageData,
    methodology: MethodologyStageData,
    ethics: EthicsStageData,
    options: DocumentGenerationOptions = {}
  ): Promise<Buffer> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const children: (Paragraph | Table)[] = [];

    // Title Page
    children.push(
      ...buildTitlePage(project, 'Research Protocol', mergedOptions.version)
    );

    // Version History
    if (mergedOptions.includeVersionHistory) {
      const versionHistory = mergedOptions.versionHistory.length > 0
        ? mergedOptions.versionHistory
        : this.getDefaultVersionHistory(project, mergedOptions.version);
      children.push(...buildVersionHistorySection(versionHistory));
    }

    // Protocol Synopsis
    children.push(...buildSynopsisSection(project, methodology));
    children.push(buildPageBreak());

    // 1. Introduction
    const introContent = this.generateIntroductionContent(project);
    children.push(...buildSection('1. Introduction', introContent));

    // 2. Background
    const backgroundContent = research.evidenceSynthesis ||
      this.generateBackgroundContent(project, research);
    children.push(...buildSection('2. Background and Rationale', backgroundContent));

    // 3. Aims and Objectives
    const aimsContent = this.generateAimsContent(methodology);
    children.push(...buildSection('3. Aims and Objectives', aimsContent));

    // 4. Study Design
    const designContent = this.generateStudyDesignContent(methodology);
    children.push(...buildSection('4. Study Design', designContent));

    // 5. Participants
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '5. Participants',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );

    // 5.1 Eligibility Criteria
    const inclusionCriteria = methodology.participants.inclusionCriteria.map(
      (c) => c.criterion
    );
    const exclusionCriteria = methodology.participants.exclusionCriteria.map(
      (c) => c.criterion
    );
    children.push(...buildCriteriaSection(inclusionCriteria, exclusionCriteria));

    // 5.2 Sample Size
    if (methodology.participants.sampleSize) {
      const sampleSizeContent = this.generateSampleSizeContent(methodology);
      children.push(...buildSubsection('5.3 Sample Size', sampleSizeContent));
    }

    // 5.3 Recruitment
    const recruitmentContent = this.generateRecruitmentContent(methodology);
    children.push(...buildSubsection('5.4 Recruitment', recruitmentContent));

    // 6. Outcomes
    const outcomesContent = this.generateOutcomesContent(methodology);
    children.push(...buildSection('6. Study Outcomes', outcomesContent));

    // 7. Procedures
    const proceduresContent = this.generateProceduresContent(methodology);
    children.push(...buildSection('7. Study Procedures', proceduresContent));

    // 8. Data Collection
    const dataCollectionContent = this.generateDataCollectionContent(methodology);
    children.push(...buildSection('8. Data Collection', dataCollectionContent));

    // 9. Statistical Analysis
    const analysisContent = this.generateAnalysisContent(methodology);
    children.push(...buildSection('9. Statistical Analysis Plan', analysisContent));

    // 10. Data Management
    const dataManagementContent = this.generateDataManagementContent(ethics);
    children.push(...buildSection('10. Data Management', dataManagementContent));

    // 11. Ethical Considerations
    const ethicsContent = this.generateEthicsContent(ethics);
    children.push(...buildSection('11. Ethical Considerations', ethicsContent));

    // 12. Dissemination
    const disseminationContent = this.generateDisseminationContent(project);
    children.push(...buildSection('12. Dissemination Plan', disseminationContent));

    // 13. Timeline
    const timelineContent = this.generateTimelineContent(methodology);
    children.push(...buildSection('13. Project Timeline', timelineContent));

    // 14. Research Team
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '14. Research Team',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );
    const investigators = [
      project.intake.principalInvestigator,
      ...project.intake.coInvestigators,
    ];
    children.push(buildInvestigatorTable(investigators));
    children.push(new Paragraph({ spacing: { after: 400 } }));

    // References
    children.push(buildPageBreak());
    children.push(...buildReferencesSection(research.citations));

    // Create document
    const doc = this.createDocument(
      children,
      project,
      'Research Protocol',
      mergedOptions
    );

    return Packer.toBuffer(doc);
  }

  // ==========================================================================
  // QI Project Plan Generation
  // ==========================================================================

  /**
   * Generate a QI Project Plan document
   *
   * Creates a Quality Improvement project plan following QI methodology
   * frameworks (PDSA, IHI Model, etc.).
   *
   * @param project - Project data
   * @param options - Optional generation options
   * @returns Promise resolving to Buffer containing the DOCX document
   */
  async generateQIProjectPlan(
    project: Project,
    options: DocumentGenerationOptions = {}
  ): Promise<Buffer> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const children: (Paragraph | Table)[] = [];

    // Title Page
    children.push(
      ...buildTitlePage(project, 'Quality Improvement Project Plan', mergedOptions.version)
    );

    // Version History
    if (mergedOptions.includeVersionHistory) {
      const versionHistory = mergedOptions.versionHistory.length > 0
        ? mergedOptions.versionHistory
        : this.getDefaultVersionHistory(project, mergedOptions.version);
      children.push(...buildVersionHistorySection(versionHistory));
    }

    // Project Summary Table
    const summaryRows = [
      { label: 'Project Title', value: project.intake.projectTitle },
      { label: 'Project Type', value: 'Quality Improvement' },
      { label: 'Setting', value: project.intake.setting },
      { label: 'Target Population', value: project.intake.targetPopulation },
      { label: 'Project Lead', value: `${project.intake.principalInvestigator.title} ${project.intake.principalInvestigator.name}` },
      { label: 'Department', value: project.intake.principalInvestigator.department },
      { label: 'Institution', value: project.intake.principalInvestigator.institution },
    ];

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '1. Project Summary',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );
    children.push(buildKeyValueTable(summaryRows));
    children.push(new Paragraph({ spacing: { after: 400 } }));

    // Problem Statement
    const problemContent = `${project.intake.clinicalProblem}\n\nThis quality improvement initiative aims to address this problem through systematic process improvement methods.`;
    children.push(...buildSection('2. Problem Statement', problemContent));

    // Aim Statement
    const aimContent = project.intake.intendedOutcomes;
    children.push(...buildSection('3. Aim Statement', aimContent));

    // Background and Rationale
    const backgroundContent = project.intake.conceptDescription;
    children.push(...buildSection('4. Background and Rationale', backgroundContent));

    // Measures
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '5. Measures',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );

    if (project.methodology) {
      const measuresContent = this.generateQIMeasuresContent(project.methodology);
      children.push(...buildSubsection('5.1 Outcome Measures', measuresContent.outcome));
      children.push(...buildSubsection('5.2 Process Measures', measuresContent.process));
      children.push(...buildSubsection('5.3 Balancing Measures', measuresContent.balancing));
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '[Measures to be defined during methodology development]',
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.NORMAL,
              italics: true,
            }),
          ],
        })
      );
    }

    // Change Ideas
    const changeContent = `Based on the identified problem and aims, the following change ideas will be tested:\n\n[Change ideas to be developed based on team input and analysis]`;
    children.push(...buildSection('6. Change Ideas', changeContent));

    // PDSA Cycles
    const pdsaContent = `This project will use the Plan-Do-Study-Act (PDSA) cycle methodology to test and implement changes.\n\n- Plan: Define the change, predict outcomes, and plan the test\n- Do: Implement the change on a small scale\n- Study: Analyze results and compare to predictions\n- Act: Adopt, adapt, or abandon the change based on results`;
    children.push(...buildSection('7. Improvement Methodology', pdsaContent));

    // Timeline
    if (project.methodology?.timeline) {
      const timelineContent = this.generateTimelineContent(project.methodology);
      children.push(...buildSection('8. Timeline', timelineContent));
    } else {
      children.push(...buildSection('8. Timeline', '[Timeline to be developed]'));
    }

    // Team
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '9. Project Team',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );
    const investigators = [
      project.intake.principalInvestigator,
      ...project.intake.coInvestigators,
    ];
    children.push(buildInvestigatorTable(investigators));

    // Create document
    const doc = this.createDocument(
      children,
      project,
      'QI Project Plan',
      mergedOptions
    );

    return Packer.toBuffer(doc);
  }

  // ==========================================================================
  // EMF Application Generation
  // ==========================================================================

  /**
   * Generate an EMF Grant Application document
   *
   * Creates an Emergency Medicine Foundation grant application following
   * the EMF application format and requirements.
   *
   * @param project - Project data
   * @param research - Research stage data
   * @param methodology - Methodology stage data
   * @param options - Optional generation options
   * @returns Promise resolving to Buffer containing the DOCX document
   */
  async generateEMFApplication(
    project: Project,
    research: ResearchStageData,
    methodology: MethodologyStageData,
    options: DocumentGenerationOptions = {}
  ): Promise<Buffer> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const children: (Paragraph | Table)[] = [];

    // Title
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'EMF Research Grant Application',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.TITLE,
            bold: true,
            color: COLORS.HEADING,
          }),
        ],
        spacing: { after: 800 },
      })
    );

    // Part A: Administrative Information
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'PART A: Administrative Information',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );

    // A1: Project Title
    children.push(...buildSubsection('A1. Project Title', project.intake.projectTitle));

    // A2: Principal Investigator
    const piInfo = `${project.intake.principalInvestigator.title} ${project.intake.principalInvestigator.name}\n${project.intake.principalInvestigator.department}\n${project.intake.principalInvestigator.institution}\nEmail: ${project.intake.principalInvestigator.email}`;
    children.push(...buildSubsection('A2. Principal Investigator', piInfo));

    // A3: Administering Institution
    children.push(...buildSubsection('A3. Administering Institution', project.intake.principalInvestigator.institution));

    // A4: Plain Language Summary
    const plainLanguage = this.generatePlainLanguageSummary(project, methodology);
    children.push(...buildSubsection('A4. Plain Language Summary (250 words max)', plainLanguage));

    // A5: Scientific Abstract
    const scientificAbstract = this.generateScientificAbstract(project, research, methodology);
    children.push(...buildSubsection('A5. Scientific Abstract (450 words max)', scientificAbstract));

    // A6: EM Relevance
    const emRelevance = `This research addresses a critical issue in emergency medicine practice: ${project.intake.clinicalProblem.substring(0, 100)}...`;
    children.push(...buildSubsection('A6. Emergency Medicine Relevance (100 words max)', emRelevance));

    // Part B: Research Plan
    children.push(buildPageBreak());
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'PART B: Research Plan',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );

    // B1: Background and Rationale
    const backgroundRationale = research.evidenceSynthesis ||
      this.generateBackgroundContent(project, research);
    children.push(...buildSubsection('B1. Background and Rationale (1500 words max)', backgroundRationale));

    // B2: Aims and Objectives
    const aims = this.generateAimsContent(methodology);
    children.push(...buildSubsection('B2. Aims and Objectives (300 words max)', aims));

    // B3: Design and Methods
    const methods = this.generateDetailedMethodsContent(methodology);
    children.push(...buildSubsection('B3. Design and Methods (2000 words max)', methods));

    // B4: Innovation and Impact
    const innovation = this.generateInnovationContent(project, research);
    children.push(...buildSubsection('B4. Innovation and Impact (750 words max)', innovation));

    // B5: Translation Plan
    const translation = this.generateTranslationContent(project);
    children.push(...buildSubsection('B5. Translation Plan (400 words max)', translation));

    // B6: References
    children.push(buildPageBreak());
    children.push(...buildReferencesSection(research.citations));

    // Part C: Ethics
    children.push(buildPageBreak());
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'PART C: Ethics and Governance',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );

    if (project.ethics) {
      const ethicsStatus = `Ethics Pathway: ${project.ethics.ethicsPathway.pathway}\nStatus: ${project.ethics.ethicsPathway.status}\nEstimated Timeline: ${project.ethics.ethicsPathway.estimatedTimeline}`;
      children.push(...buildSubsection('C1. Ethics Status', ethicsStatus));
    } else {
      children.push(...buildSubsection('C1. Ethics Status', '[Ethics review pending]'));
    }

    // Part D: Research Team
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'PART D: Research Team',
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
      })
    );
    const investigators = [
      project.intake.principalInvestigator,
      ...project.intake.coInvestigators,
    ];
    children.push(buildInvestigatorTable(investigators));

    // Create document
    const doc = this.createDocument(
      children,
      project,
      'EMF Application',
      mergedOptions
    );

    return Packer.toBuffer(doc);
  }

  // ==========================================================================
  // HREC Cover Letter Generation
  // ==========================================================================

  /**
   * Generate an HREC Cover Letter document
   *
   * Creates a cover letter for HREC (Human Research Ethics Committee)
   * submissions.
   *
   * @param project - Project data
   * @param ethics - Ethics stage data
   * @param options - Optional generation options
   * @returns Promise resolving to Buffer containing the DOCX document
   */
  async generateHRECCoverLetter(
    project: Project,
    ethics: EthicsStageData,
    options: DocumentGenerationOptions = {}
  ): Promise<Buffer> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const children: (Paragraph | Table)[] = [];
    const currentDate = new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Letterhead
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: project.intake.principalInvestigator.institution,
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.HEADING2,
            bold: true,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: project.intake.principalInvestigator.department,
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { after: 600 },
      })
    );

    // Date
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: currentDate,
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // Addressee
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Chair, ${ethics.ethicsPathway.approvalBody}`,
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Human Research Ethics Committee',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // Subject
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'RE: ',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
            bold: true,
          }),
          new TextRun({
            text: `Ethics Application for "${project.intake.projectTitle}"`,
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // Salutation
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Dear Chair and Committee Members,',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // Body paragraphs
    const bodyParagraphs = this.generateHRECCoverLetterBody(project, ethics);
    for (const para of bodyParagraphs) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: para,
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.NORMAL,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Closing
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Yours sincerely,',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { before: 400, after: 600 },
      })
    );

    // Signature block
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${project.intake.principalInvestigator.title} ${project.intake.principalInvestigator.name}`,
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Principal Investigator',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: project.intake.principalInvestigator.email,
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
      })
    );

    // Enclosures
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Enclosures:',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
            bold: true,
          }),
        ],
        spacing: { before: 600 },
      })
    );

    for (const form of ethics.ethicsPathway.forms) {
      children.push(
        new Paragraph({
          bullet: {
            level: 0,
          },
          children: [
            new TextRun({
              text: form.replace(/_/g, ' '),
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.NORMAL,
            }),
          ],
        })
      );
    }

    // Create document
    const doc = this.createDocument(
      children,
      project,
      'HREC Cover Letter',
      mergedOptions
    );

    return Packer.toBuffer(doc);
  }

  // ==========================================================================
  // PICF Generation
  // ==========================================================================

  /**
   * Generate a Participant Information and Consent Form (PICF)
   *
   * Creates a PICF following NHMRC guidelines for informed consent.
   *
   * @param project - Project data
   * @param ethics - Ethics stage data
   * @param options - Optional generation options
   * @returns Promise resolving to Buffer containing the DOCX document
   */
  async generatePICF(
    project: Project,
    ethics: EthicsStageData,
    options: DocumentGenerationOptions = {}
  ): Promise<Buffer> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const children: (Paragraph | Table)[] = [];

    // Title
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'PARTICIPANT INFORMATION AND CONSENT FORM',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.HEADING1,
            bold: true,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // Study Title
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: project.intake.projectTitle,
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.HEADING2,
            bold: true,
          }),
        ],
        spacing: { after: 600 },
      })
    );

    // Introduction
    const introContent = `You are invited to participate in a research study. Before you decide whether or not to participate, it is important for you to understand why the research is being done and what it will involve. Please take time to read the following information carefully and discuss it with others if you wish.`;
    children.push(...buildSection('Introduction', introContent));

    // What is the purpose of this study?
    const purposeContent = project.intake.conceptDescription;
    children.push(...buildSection('What is the purpose of this study?', purposeContent));

    // Why have I been invited?
    const invitedContent = `You have been invited because ${project.intake.targetPopulation.toLowerCase()}. We are seeking to recruit participants who meet specific eligibility criteria for this study.`;
    children.push(...buildSection('Why have I been invited to participate?', invitedContent));

    // What will participation involve?
    let participationContent = 'If you agree to participate, you will be asked to:\n\n';
    if (project.methodology?.procedures) {
      participationContent += project.methodology.procedures.description;
    } else {
      participationContent += '[Participation details to be confirmed]';
    }
    children.push(...buildSection('What does participation involve?', participationContent));

    // Possible benefits
    const benefitsContent = `The potential benefits of this study include:\n\n${project.intake.intendedOutcomes}`;
    children.push(...buildSection('What are the possible benefits?', benefitsContent));

    // Possible risks
    const risksContent = this.generateRisksContent(ethics);
    children.push(...buildSection('What are the possible risks?', risksContent));

    // Privacy and confidentiality
    const privacyContent = this.generatePrivacyContent(ethics);
    children.push(...buildSection('Privacy and Confidentiality', privacyContent));

    // Voluntary participation
    const voluntaryContent = `Participation in this study is entirely voluntary. You are free to withdraw at any time without giving a reason and without any negative consequences. ${ethics.consentRequirements.withdrawalProcess}`;
    children.push(...buildSection('Voluntary Participation', voluntaryContent));

    // Contact information
    const contactContent = `If you have any questions about this study, please contact:\n\nPrincipal Investigator: ${project.intake.principalInvestigator.title} ${project.intake.principalInvestigator.name}\nEmail: ${project.intake.principalInvestigator.email}\n${project.intake.principalInvestigator.phone ? `Phone: ${project.intake.principalInvestigator.phone}` : ''}`;
    children.push(...buildSection('Contact Information', contactContent));

    // Consent form section
    children.push(buildPageBreak());
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'CONSENT FORM',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.HEADING1,
            bold: true,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // Consent statements
    const consentStatements = [
      'I have read and understood the Participant Information Sheet.',
      'I have had the opportunity to ask questions and have had them answered satisfactorily.',
      'I understand that my participation is voluntary and that I am free to withdraw at any time.',
      'I understand how my personal information will be stored and used.',
      'I agree to participate in this study.',
    ];

    for (const statement of consentStatements) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '[ ] ',
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.NORMAL,
            }),
            new TextRun({
              text: statement,
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.NORMAL,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Signature blocks
    children.push(
      new Paragraph({
        spacing: { before: 600 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Participant Name: _________________________________',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Participant Signature: _____________________________  Date: _______________',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { after: 600 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Researcher Name: _________________________________',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
        spacing: { after: 400 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Researcher Signature: _____________________________  Date: _______________',
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          }),
        ],
      })
    );

    // Create document
    const doc = this.createDocument(children, project, 'PICF', mergedOptions);

    return Packer.toBuffer(doc);
  }

  // ==========================================================================
  // Data Management Plan Generation
  // ==========================================================================

  /**
   * Generate a Data Management Plan document
   *
   * Creates a data management plan following institutional and NHMRC requirements.
   *
   * @param project - Project data
   * @param ethics - Ethics stage data
   * @param options - Optional generation options
   * @returns Promise resolving to Buffer containing the DOCX document
   */
  async generateDataManagementPlan(
    project: Project,
    ethics: EthicsStageData,
    options: DocumentGenerationOptions = {}
  ): Promise<Buffer> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const children: (Paragraph | Table)[] = [];

    // Title Page
    children.push(
      ...buildTitlePage(project, 'Data Management Plan', mergedOptions.version)
    );

    // Overview
    const overviewContent = `This Data Management Plan describes how data will be collected, stored, secured, and shared for the project "${project.intake.projectTitle}".`;
    children.push(...buildSection('1. Overview', overviewContent));

    // Data Description
    const dataDescription = this.generateDataDescriptionContent(ethics);
    children.push(...buildSection('2. Data Description', dataDescription));

    // Data Collection
    let dataCollectionContent = 'Data will be collected using the following methods and instruments:\n\n';
    if (project.methodology?.dataCollection) {
      dataCollectionContent += project.methodology.dataCollection.methods.join('\n');
    } else {
      dataCollectionContent += '[Data collection methods to be defined]';
    }
    children.push(...buildSection('3. Data Collection', dataCollectionContent));

    // Data Storage and Security
    const storageContent = this.generateDataStorageContent(ethics);
    children.push(...buildSection('4. Data Storage and Security', storageContent));

    // Access Control
    const accessContent = `Access to research data will be controlled through the following measures:\n\n${ethics.dataGovernance.accessControls.map(ac => `- ${ac}`).join('\n')}`;
    children.push(...buildSection('5. Access Control', accessContent));

    // Data Retention
    const retentionContent = `Data Retention Period: ${ethics.dataGovernance.retentionPeriod}\n\nDisposal Method: ${ethics.dataGovernance.disposalMethod}`;
    children.push(...buildSection('6. Data Retention and Disposal', retentionContent));

    // Data Sharing
    const sharingContent = this.generateDataSharingContent(ethics);
    children.push(...buildSection('7. Data Sharing', sharingContent));

    // Responsibilities
    const responsibilitiesContent = `The Principal Investigator (${project.intake.principalInvestigator.title} ${project.intake.principalInvestigator.name}) is responsible for:\n\n- Overall management of research data\n- Ensuring compliance with this Data Management Plan\n- Training team members on data handling procedures\n- Responding to data breach incidents`;
    children.push(...buildSection('8. Responsibilities', responsibilitiesContent));

    // Compliance
    const complianceContent = `This Data Management Plan complies with:\n\n- NHMRC National Statement on Ethical Conduct in Human Research\n- Privacy Act 1988 (Cth)\n- Information Privacy Act 2009 (Qld)\n- Institutional data governance policies`;
    children.push(...buildSection('9. Regulatory Compliance', complianceContent));

    // Create document
    const doc = this.createDocument(
      children,
      project,
      'Data Management Plan',
      mergedOptions
    );

    return Packer.toBuffer(doc);
  }

  // ==========================================================================
  // Helper Methods - Document Creation
  // ==========================================================================

  /**
   * Create a Document with standard configuration
   */
  private createDocument(
    children: (Paragraph | Table)[],
    project: Project,
    documentType: string,
    options: Required<DocumentGenerationOptions>
  ): Document {
    return new Document({
      title: project.intake.projectTitle,
      subject: documentType,
      creator: options.author,
      description: `${documentType} for ${project.intake.projectTitle}`,
      styles: getDocumentStyles(),
      numbering: {
        config: [
          {
            reference: 'bullet-list',
            levels: getBulletListNumbering(),
          },
          {
            reference: 'numbered-list',
            levels: getNumberedListNumbering(),
          },
        ],
      },
      sections: [
        {
          properties: getPageProperties(),
          headers: {
            default: this.createHeader(project.intake.projectTitle),
          },
          footers: {
            default: this.createFooter(),
          },
          children,
        },
      ],
    });
  }

  /**
   * Create document header
   */
  private createHeader(projectTitle: string): Header {
    return new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: projectTitle.substring(0, 60) + (projectTitle.length > 60 ? '...' : ''),
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.FOOTER,
              color: COLORS.CAPTION,
            }),
          ],
        }),
      ],
    });
  }

  /**
   * Create document footer with page numbers
   */
  private createFooter(): Footer {
    return new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Page ',
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.FOOTER,
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.FOOTER,
            }),
            new TextRun({
              text: ' of ',
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.FOOTER,
            }),
            new TextRun({
              children: [PageNumber.TOTAL_PAGES],
              font: FONT_CONFIG.PRIMARY_FONT,
              size: FONT_SIZES.FOOTER,
            }),
          ],
        }),
      ],
    });
  }

  /**
   * Get default version history entries
   */
  private getDefaultVersionHistory(
    project: Project,
    version: string
  ): VersionHistoryEntry[] {
    const currentDate = new Date().toLocaleDateString('en-AU');
    return [
      {
        version,
        date: currentDate,
        author: `${project.intake.principalInvestigator.title} ${project.intake.principalInvestigator.name}`,
        description: 'Initial draft',
      },
    ];
  }

  // ==========================================================================
  // Helper Methods - Content Generation
  // ==========================================================================

  private generateIntroductionContent(project: Project): string {
    return `${project.intake.clinicalProblem}\n\nThis study aims to address this problem by ${project.intake.intendedOutcomes.toLowerCase()}.`;
  }

  private generateBackgroundContent(
    project: Project,
    research: ResearchStageData
  ): string {
    let content = project.intake.conceptDescription + '\n\n';

    if (research.gapAnalysis) {
      content += 'Current gaps in the literature include:\n\n';
      for (const gap of research.gapAnalysis.identifiedGaps.slice(0, 5)) {
        content += `- ${gap.description}\n`;
      }
      content += '\n';
    }

    if (research.gapAnalysis?.summary) {
      content += research.gapAnalysis.summary;
    }

    return content;
  }

  private generateAimsContent(methodology: MethodologyStageData): string {
    let content = 'Primary Aim:\n\n';
    content += `To ${methodology.outcomes.primary.name.toLowerCase()}.\n\n`;

    if (methodology.outcomes.secondary.length > 0) {
      content += 'Secondary Aims:\n\n';
      for (const outcome of methodology.outcomes.secondary) {
        content += `- To ${outcome.name.toLowerCase()}\n`;
      }
    }

    return content;
  }

  private generateStudyDesignContent(methodology: MethodologyStageData): string {
    let content = `This study will use a ${methodology.studyDesign.type.toLowerCase().replace(/_/g, ' ')} design.\n\n`;
    content += `Justification: ${methodology.studyDesign.justification}\n\n`;
    content += `Reporting Guideline: ${methodology.studyDesign.reportingGuideline}`;

    if (methodology.studyDesign.isRandomised) {
      content += '\n\nRandomisation will be used to allocate participants to study groups.';
    }

    if (methodology.studyDesign.isBlinded && methodology.studyDesign.blindingType) {
      content += `\n\nBlinding: ${methodology.studyDesign.blindingType.replace(/_/g, ' ').toLowerCase()}`;
    }

    return content;
  }

  private generateSampleSizeContent(methodology: MethodologyStageData): string {
    const ss = methodology.participants.sampleSize;
    if (!ss) {return 'Sample size calculation not applicable.';}

    let content = `Target Sample Size: ${ss.target} participants\n\n`;
    content += `Calculation Method: ${ss.calculationMethod}\n\n`;
    content += 'Assumptions:\n';
    content += `- Effect size: ${ss.assumptions.effectSize}\n`;
    content += `- Power: ${(ss.assumptions.power * 100).toFixed(0)}%\n`;
    content += `- Alpha: ${ss.assumptions.alpha}\n`;
    content += `- Anticipated attrition: ${(ss.assumptions.attritionRate * 100).toFixed(0)}%\n\n`;
    content += `Justification: ${ss.justification}`;

    return content;
  }

  private generateRecruitmentContent(methodology: MethodologyStageData): string {
    const rs = methodology.participants.recruitmentStrategy;
    let content = `Method: ${rs.method}\n\n`;
    content += `Sites: ${rs.sites.join(', ')}\n\n`;
    content += `Estimated Duration: ${rs.estimatedDuration}\n\n`;
    content += `Feasibility: ${rs.feasibilityJustification}`;

    return content;
  }

  private generateOutcomesContent(methodology: MethodologyStageData): string {
    let content = 'Primary Outcome:\n\n';
    const primary = methodology.outcomes.primary;
    content += `${primary.name}\n`;
    content += `- Definition: ${primary.definition}\n`;
    content += `- Measurement: ${primary.measurementTool}\n`;
    content += `- Timing: ${primary.measurementTiming}\n\n`;

    if (methodology.outcomes.secondary.length > 0) {
      content += 'Secondary Outcomes:\n\n';
      for (const outcome of methodology.outcomes.secondary) {
        content += `${outcome.name}\n`;
        content += `- Definition: ${outcome.definition}\n`;
        content += `- Measurement: ${outcome.measurementTool}\n`;
        content += `- Timing: ${outcome.measurementTiming}\n\n`;
      }
    }

    return content;
  }

  private generateProceduresContent(methodology: MethodologyStageData): string {
    let content = methodology.procedures.description + '\n\n';

    if (methodology.procedures.steps.length > 0) {
      content += 'Study procedures:\n\n';
      for (const step of methodology.procedures.steps) {
        content += `${step.stepNumber}. ${step.name}: ${step.description}\n`;
      }
    }

    return content;
  }

  private generateDataCollectionContent(methodology: MethodologyStageData): string {
    const dc = methodology.dataCollection;
    let content = `Data types: ${dc.dataTypes.join(', ')}\n\n`;
    content += `Collection methods: ${dc.methods.join(', ')}\n\n`;
    content += `Instruments: ${dc.instruments.join(', ')}\n\n`;
    content += `Quality assurance: ${dc.qualityAssurance.join(', ')}`;

    return content;
  }

  private generateAnalysisContent(methodology: MethodologyStageData): string {
    const ap = methodology.analysisPlan;
    let content = 'Primary Analysis:\n\n';
    content += `${ap.primaryAnalysis.method}: ${ap.primaryAnalysis.description}\n\n`;

    if (ap.secondaryAnalyses.length > 0) {
      content += 'Secondary Analyses:\n\n';
      for (const analysis of ap.secondaryAnalyses) {
        content += `- ${analysis.name}: ${analysis.description}\n`;
      }
      content += '\n';
    }

    content += `Missing data handling: ${ap.missingDataHandling}`;

    return content;
  }

  private generateDataManagementContent(ethics: EthicsStageData): string {
    const dg = ethics.dataGovernance;
    let content = `Data will be stored at: ${dg.storageDetails}\n\n`;
    content += `Storage location: ${dg.storageLocation}\n\n`;
    content += `Encryption: ${dg.encryptionMethods}\n\n`;
    content += `Retention period: ${dg.retentionPeriod}\n\n`;
    content += `Disposal method: ${dg.disposalMethod}`;

    return content;
  }

  private generateEthicsContent(ethics: EthicsStageData): string {
    let content = `Ethics pathway: ${ethics.ethicsPathway.pathway.replace(/_/g, ' ')}\n\n`;
    content += `Approval body: ${ethics.ethicsPathway.approvalBody}\n\n`;
    content += `Risk level: ${ethics.riskAssessment.level}\n\n`;
    content += `Consent type: ${ethics.consentRequirements.type.replace(/_/g, ' ')}\n\n`;
    content += ethics.riskAssessment.overallJustification;

    return content;
  }

  private generateDisseminationContent(_project: Project): string {
    return `Results of this study will be disseminated through:\n\n- Peer-reviewed publication in relevant journals\n- Presentation at scientific conferences\n- Reports to funding bodies and institutional stakeholders\n- Translation into clinical practice where appropriate`;
  }

  private generateTimelineContent(methodology: MethodologyStageData): string {
    let content = `Total duration: ${methodology.timeline.totalDuration}\n\n`;

    content += 'Phases:\n\n';
    for (const phase of methodology.timeline.phases) {
      content += `${phase.name}: ${phase.startDate} to ${phase.endDate}\n`;
      for (const milestone of phase.milestones) {
        content += `  - ${milestone}\n`;
      }
      content += '\n';
    }

    return content;
  }

  private generateQIMeasuresContent(methodology: MethodologyStageData): {
    outcome: string;
    process: string;
    balancing: string;
  } {
    return {
      outcome: methodology.outcomes.primary.name + '\n\n' + methodology.outcomes.primary.definition,
      process: methodology.outcomes.secondary.map(o => `- ${o.name}`).join('\n') || '[Process measures to be defined]',
      balancing: '[Balancing measures to be defined to ensure no unintended consequences]',
    };
  }

  private generatePlainLanguageSummary(
    project: Project,
    methodology: MethodologyStageData
  ): string {
    return `${project.intake.clinicalProblem} This study will ${project.intake.intendedOutcomes.toLowerCase()}. We will include ${project.intake.targetPopulation} in ${project.intake.setting}. The study uses a ${methodology.studyDesign.type.toLowerCase().replace(/_/g, ' ')} design. Results will help improve care for patients in emergency settings.`;
  }

  private generateScientificAbstract(
    project: Project,
    research: ResearchStageData,
    methodology: MethodologyStageData
  ): string {
    let content = 'Background: ';
    content += project.intake.clinicalProblem + '\n\n';

    content += 'Aims: ';
    content += project.intake.intendedOutcomes + '\n\n';

    content += 'Methods: ';
    content += `This ${methodology.studyDesign.type.toLowerCase().replace(/_/g, ' ')} study will include ${project.intake.targetPopulation}. `;
    if (methodology.participants.sampleSize) {
      content += `Target sample size is ${methodology.participants.sampleSize.target}. `;
    }
    content += `The primary outcome is ${methodology.outcomes.primary.name.toLowerCase()}.\n\n`;

    content += 'Expected Outcomes: ';
    content += `This research will provide evidence to ${project.intake.intendedOutcomes.toLowerCase()}.`;

    return content;
  }

  private generateInnovationContent(
    project: Project,
    research: ResearchStageData
  ): string {
    let content = 'Innovation:\n\n';
    content += 'This research is innovative because it addresses key gaps in current knowledge:\n\n';

    if (research.gapAnalysis) {
      for (const gap of research.gapAnalysis.identifiedGaps.slice(0, 3)) {
        content += `- ${gap.description}\n`;
      }
    }

    content += '\n\nPotential Impact:\n\n';
    content += project.intake.intendedOutcomes;

    return content;
  }

  private generateTranslationContent(_project: Project): string {
    return `The findings from this research will be translated into practice through:\n\n1. Development of clinical guidelines and protocols\n2. Education and training programs for clinical staff\n3. Integration into existing quality improvement frameworks\n4. Collaboration with implementation science experts\n5. Engagement with key stakeholders throughout the research process`;
  }

  private generateDetailedMethodsContent(methodology: MethodologyStageData): string {
    let content = '';

    // Study Design
    content += `Study Design: ${methodology.studyDesign.type.replace(/_/g, ' ')}\n\n`;
    content += `${methodology.studyDesign.justification}\n\n`;

    // Participants
    content += 'Participants:\n\n';
    content += `Setting: ${methodology.participants.recruitmentStrategy.sites.join(', ')}\n\n`;

    content += 'Inclusion Criteria:\n';
    for (const criterion of methodology.participants.inclusionCriteria) {
      content += `- ${criterion.criterion}\n`;
    }
    content += '\n';

    content += 'Exclusion Criteria:\n';
    for (const criterion of methodology.participants.exclusionCriteria) {
      content += `- ${criterion.criterion}\n`;
    }
    content += '\n';

    // Sample Size
    if (methodology.participants.sampleSize) {
      const ss = methodology.participants.sampleSize;
      content += `Sample Size: ${ss.target} participants\n`;
      content += `Calculation based on: effect size ${ss.assumptions.effectSize}, power ${(ss.assumptions.power * 100).toFixed(0)}%, alpha ${ss.assumptions.alpha}\n\n`;
    }

    // Recruitment
    content += `Recruitment: ${methodology.participants.recruitmentStrategy.method}\n`;
    content += `Duration: ${methodology.participants.recruitmentStrategy.estimatedDuration}\n\n`;

    // Outcomes
    content += 'Outcomes:\n\n';
    content += `Primary: ${methodology.outcomes.primary.name}\n`;
    content += `Definition: ${methodology.outcomes.primary.definition}\n`;
    content += `Measurement: ${methodology.outcomes.primary.measurementTool}\n\n`;

    if (methodology.outcomes.secondary.length > 0) {
      content += 'Secondary:\n';
      for (const outcome of methodology.outcomes.secondary) {
        content += `- ${outcome.name}: ${outcome.definition}\n`;
      }
      content += '\n';
    }

    // Procedures
    content += 'Procedures:\n\n';
    content += methodology.procedures.description + '\n\n';

    // Analysis
    content += 'Analysis Plan:\n\n';
    content += `Primary Analysis: ${methodology.analysisPlan.primaryAnalysis.method}\n`;
    content += methodology.analysisPlan.primaryAnalysis.description + '\n\n';
    content += `Missing Data: ${methodology.analysisPlan.missingDataHandling}`;

    return content;
  }

  private generateHRECCoverLetterBody(
    project: Project,
    ethics: EthicsStageData
  ): string[] {
    return [
      `I am writing to submit an ethics application for the research study titled "${project.intake.projectTitle}".`,
      `This ${project.classification.projectType.toLowerCase()} project aims to ${project.intake.intendedOutcomes.toLowerCase()}. The study will be conducted at ${project.intake.setting}.`,
      `The study has been assessed as ${ethics.riskAssessment.level.toLowerCase()} risk. ${ethics.riskAssessment.overallJustification}`,
      `Consent will be obtained through ${ethics.consentRequirements.type.replace(/_/g, ' ').toLowerCase()}. ${ethics.consentRequirements.justification}`,
      `Please find enclosed all required documentation for your review. I am available to address any questions or concerns the Committee may have.`,
      `Thank you for considering this application.`,
    ];
  }

  private generateRisksContent(ethics: EthicsStageData): string {
    let content = `Overall risk level: ${ethics.riskAssessment.level}\n\n`;

    if (ethics.riskAssessment.factors.length > 0) {
      content += 'Identified risks and mitigations:\n\n';
      for (const factor of ethics.riskAssessment.factors) {
        content += `${factor.category}: ${factor.description}\n`;
        content += `Mitigation: ${factor.mitigation}\n\n`;
      }
    }

    return content;
  }

  private generatePrivacyContent(ethics: EthicsStageData): string {
    const dg = ethics.dataGovernance;
    let content = `All information collected about you will be kept strictly confidential.\n\n`;
    content += `Data will be stored securely at ${dg.storageDetails} with ${dg.encryptionMethods}.\n\n`;
    content += `Access to your data will be limited to the research team through ${dg.accessControls.join(', ')}.\n\n`;
    content += `Data will be retained for ${dg.retentionPeriod}.`;

    return content;
  }

  private generateDataDescriptionContent(ethics: EthicsStageData): string {
    const dg = ethics.dataGovernance;
    let content = `Data types to be collected: ${dg.dataTypes.join(', ')}\n\n`;
    content += `Data sensitivity classification: ${dg.sensitivity}\n\n`;
    content += `Identifiable data: ${dg.sensitivity === 'HIGHLY_SENSITIVE' || dg.sensitivity === 'SENSITIVE' ? 'Yes' : 'No'}`;

    return content;
  }

  private generateDataStorageContent(ethics: EthicsStageData): string {
    const dg = ethics.dataGovernance;
    let content = `Storage location: ${dg.storageLocation}\n\n`;
    content += `Storage details: ${dg.storageDetails}\n\n`;
    content += `Encryption: ${dg.encryptionMethods}\n\n`;
    content += `Breach response: ${dg.breachResponsePlan}`;

    return content;
  }

  private generateDataSharingContent(ethics: EthicsStageData): string {
    const ds = ethics.dataGovernance.dataSharing;
    if (!ds || !ds.planned) {
      return 'No data sharing is planned for this project.';
    }

    let content = 'Data sharing is planned with the following parties:\n\n';
    if (ds.recipients) {
      content += ds.recipients.map(r => `- ${r}`).join('\n');
    }

    if (ds.agreements && ds.agreements.length > 0) {
      content += '\n\nData sharing agreements: ' + ds.agreements.join(', ');
    }

    return content;
  }
}

// ============================================================================
// Export Default Instance
// ============================================================================

/**
 * Default document generator instance
 */
export const documentGenerator = new DocumentGenerator();

export default DocumentGenerator;
