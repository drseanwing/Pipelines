/**
 * QI Research Pipeline - Methodology Agent
 *
 * This agent handles Stage 3 (Methodology Development) of the QI/Research
 * Project Development Pipeline. It determines study design, defines
 * participant criteria, calculates sample sizes, specifies outcomes,
 * develops analysis plans, and generates project timelines.
 *
 * @module agents/MethodologyAgent
 */

import {
  Project,
  ProjectStatus,
  ResearchStageData,
  MethodologyStageData,
  StudyDesign,
  StudyDesignType,
  ParticipantSpec,
  OutcomeSpec,
  AnalysisPlan,
  ProjectTimeline,
  ProcedureSpec,
  DataCollectionSpec,
  Site,
  Criterion,
  SampleSizeCalculation,
  RecruitmentStrategy,
  PrimaryOutcome,
  SecondaryOutcome,
  SafetyOutcome,
  ExploratoryOutcome,
  ProcedureStep,
  DataVariable,
  DataType,
  TimelinePhase,
  ReportingGuideline,
  BlindingType,
  ControlType,
  SampleSizeMethod,
} from '../types/index.js';

import {
  complete,
} from '../llm/index.js';

import {
  METHODOLOGY_SYSTEM_PROMPT,
  determineStudyDesignPrompt,
  defineParticipantsPrompt,
  defineOutcomesPrompt,
  developAnalysisPlanPrompt,
  parseStudyDesignResponse,
  parseParticipantCriteriaResponse,
  parseOutcomeDefinitionResponse,
  parseAnalysisPlanResponse,
  type StudyDesignInput,
  type StudyDesignOutput,
  type ParticipantCriteriaInput,
  type ParticipantCriteriaOutput,
  type OutcomeDefinitionInput,
  type OutcomeDefinitionOutput,
  type AnalysisPlanInput,
  type AnalysisPlanOutput,
} from '../llm/prompts/index.js';

import { ProjectRepository } from '../db/repositories/ProjectRepository.js';
import { AuditRepository, type LogActionInput } from '../db/repositories/AuditRepository.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Error thrown by the MethodologyAgent
 */
export class MethodologyAgentError extends Error {
  public readonly code: string;
  public readonly originalCause?: Error;

  constructor(
    message: string,
    code: string,
    originalCause?: Error
  ) {
    super(message);
    this.name = 'MethodologyAgentError';
    this.code = code;
    this.originalCause = originalCause;
  }
}

/**
 * Options for methodology development
 */
export interface MethodologyDevelopmentOptions {
  /** Actor/user ID for audit logging */
  actor?: string;
  /** Session ID for audit tracking */
  sessionId?: string;
  /** Skip updating project status after completion */
  skipStatusUpdate?: boolean;
  /** Custom feasibility constraints */
  feasibilityConstraints?: {
    timeline?: string;
    budget?: string;
    sampleAccess?: string;
    resources?: string;
  };
}

/**
 * Timeline generation options
 */
export interface TimelineOptions {
  /** Target start date (ISO 8601) */
  startDate?: string;
  /** Target end date (ISO 8601) */
  endDate?: string;
  /** Grant submission deadline (ISO 8601) */
  submissionDeadline?: string;
}

// ============================================================================
// Methodology Agent
// ============================================================================

/**
 * Agent for handling Stage 3 - Methodology Development
 *
 * This agent orchestrates the methodology development process, including:
 * - Study design selection based on project classification and evidence gaps
 * - Participant criteria definition with sample size calculations
 * - Primary and secondary outcome specification
 * - Statistical analysis plan development
 * - Project timeline generation
 *
 * @example
 * ```typescript
 * const projectRepo = new ProjectRepository();
 * const auditRepo = new AuditRepository();
 * const agent = new MethodologyAgent(projectRepo, auditRepo);
 *
 * // Develop complete methodology for a project
 * const methodology = await agent.developMethodology('project-123', {
 *   actor: 'user-456',
 * });
 *
 * // Or develop components individually
 * const studyDesign = await agent.determineStudyDesign(project, researchData);
 * const participants = await agent.defineParticipants(project, studyDesign);
 * const outcomes = await agent.defineOutcomes(project, studyDesign);
 * ```
 */
export class MethodologyAgent {
  private readonly projectRepo: ProjectRepository;
  private readonly auditRepo: AuditRepository;

  /**
   * Create a new MethodologyAgent instance
   *
   * @param projectRepo - Repository for project data access
   * @param auditRepo - Repository for audit logging
   */
  constructor(projectRepo: ProjectRepository, auditRepo: AuditRepository) {
    this.projectRepo = projectRepo;
    this.auditRepo = auditRepo;
  }

  // ============================================================================
  // Main Orchestration Method
  // ============================================================================

  /**
   * Develop complete methodology for a project
   *
   * This is the main entry point that orchestrates the entire methodology
   * development process. It retrieves the project, validates prerequisites,
   * and sequentially develops all methodology components.
   *
   * @param projectId - The project ID to develop methodology for
   * @param options - Optional configuration for the development process
   * @returns The complete methodology stage data
   * @throws MethodologyAgentError if prerequisites are not met or development fails
   */
  async developMethodology(
    projectId: string,
    options: MethodologyDevelopmentOptions = {}
  ): Promise<MethodologyStageData> {
    logger.info(`Starting methodology development for project ${projectId}`);

    // Retrieve and validate project
    const project = await this.getAndValidateProject(projectId);

    // Log start of methodology development
    await this.logAction({
      projectId,
      action: 'METHODOLOGY_DEVELOPMENT_STARTED',
      actor: options.actor,
      sessionId: options.sessionId,
      details: {
        projectType: project.classification.project_type,
        hasResearchData: !!project.research,
      },
    });

    try {
      // Step 1: Determine study design
      logger.info('Determining study design...');
      const studyDesign = await this.determineStudyDesign(
        project,
        project.research!,
        options.feasibilityConstraints
      );

      // Step 2: Define sites/settings
      logger.info('Defining study sites...');
      const settingSites = this.defineSettingSites(project);

      // Step 3: Define participants with sample size
      logger.info('Defining participant criteria...');
      const participants = await this.defineParticipants(project, studyDesign);

      // Step 4: Define outcomes
      logger.info('Defining study outcomes...');
      const outcomes = await this.defineOutcomes(project, studyDesign);

      // Step 5: Define procedures
      logger.info('Defining study procedures...');
      const procedures = await this.defineProcedures(project, studyDesign, outcomes);

      // Step 6: Define data collection
      logger.info('Defining data collection plan...');
      const dataCollection = await this.defineDataCollection(
        project,
        studyDesign,
        outcomes,
        procedures
      );

      // Step 7: Develop analysis plan
      logger.info('Developing analysis plan...');
      const analysisPlan = await this.developAnalysisPlan(studyDesign, outcomes, participants);

      // Assemble partial methodology for timeline generation
      const partialMethodology: Omit<MethodologyStageData, 'timeline'> = {
        studyDesign,
        settingSites,
        participants,
        outcomes,
        procedures,
        dataCollection,
        analysisPlan,
      };

      // Step 8: Generate timeline
      logger.info('Generating project timeline...');
      const timeline = await this.generateTimeline(
        partialMethodology as MethodologyStageData,
        {
          startDate: project.intake.timelineConstraint?.targetStartDate,
          endDate: project.intake.timelineConstraint?.targetEndDate,
          submissionDeadline: project.intake.timelineConstraint?.submissionDeadline,
        }
      );

      // Assemble complete methodology
      const methodology: MethodologyStageData = {
        ...partialMethodology,
        timeline,
      };

      // Update project with methodology data
      await this.projectRepo.updateStageData(projectId, 'methodology', methodology, options.actor);

      // Update status if not skipped
      if (!options.skipStatusUpdate) {
        await this.projectRepo.updateStatus(
          projectId,
          ProjectStatus.METHODOLOGY_COMPLETE,
          options.actor
        );
      }

      // Log successful completion
      await this.logAction({
        projectId,
        action: 'METHODOLOGY_DEVELOPMENT_COMPLETED',
        actor: options.actor,
        sessionId: options.sessionId,
        details: {
          studyDesignType: studyDesign.type,
          reportingGuideline: studyDesign.reportingGuideline,
          sampleSize: participants.sampleSize?.target,
          primaryOutcome: outcomes.primary.name,
          secondaryOutcomeCount: outcomes.secondary.length,
          timelineDuration: timeline.totalDuration,
        },
      });

      logger.info(`Methodology development completed for project ${projectId}`);
      return methodology;
    } catch (error) {
      // Log failure
      await this.logAction({
        projectId,
        action: 'METHODOLOGY_DEVELOPMENT_FAILED',
        actor: options.actor,
        sessionId: options.sessionId,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (error instanceof MethodologyAgentError) {
        throw error;
      }

      throw new MethodologyAgentError(
        `Methodology development failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DEVELOPMENT_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ============================================================================
  // Study Design Determination
  // ============================================================================

  /**
   * Determine the appropriate study design based on project and research data
   *
   * Analyzes the project classification, research gaps, and feasibility
   * constraints to recommend an optimal study design with appropriate
   * reporting guidelines.
   *
   * @param project - The project to determine design for
   * @param researchData - Research stage data with literature review results
   * @param feasibilityConstraints - Optional constraints affecting design choice
   * @returns The recommended study design specification
   */
  async determineStudyDesign(
    project: Project,
    researchData: ResearchStageData,
    feasibilityConstraints?: MethodologyDevelopmentOptions['feasibilityConstraints']
  ): Promise<StudyDesign> {
    logger.debug('Determining study design', {
      projectType: project.classification.project_type,
      gapCount: researchData.gapAnalysis.identifiedGaps.length,
    });

    // Prepare input for LLM
    const input: StudyDesignInput = {
      projectType: project.classification.project_type,
      researchQuestion: project.intake.conceptDescription,
      evidenceGaps: this.formatGapsForPrompt(researchData),
      feasibilityConstraints,
      setting: project.intake.setting,
      intendedOutcomes: project.intake.intendedOutcomes,
    };

    // Generate study design prompt and get LLM response
    const prompt = determineStudyDesignPrompt(input);
    const response = await complete(prompt, {
      system: METHODOLOGY_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    // Parse and validate response
    const parsedOutput = parseStudyDesignResponse(response);

    // Convert to StudyDesign type with proper type assertions
    const studyDesign = this.convertToStudyDesign(parsedOutput, project);

    logger.debug('Study design determined', {
      type: studyDesign.type,
      reportingGuideline: studyDesign.reportingGuideline,
      requiresSampleSize: studyDesign.requiresSampleSize,
    });

    return studyDesign;
  }

  // ============================================================================
  // Participant Definition
  // ============================================================================

  /**
   * Define participant criteria including sample size calculation
   *
   * Generates comprehensive inclusion/exclusion criteria, calculates
   * required sample size (when applicable), and develops recruitment strategy.
   *
   * @param project - The project to define participants for
   * @param studyDesign - The determined study design
   * @returns Participant specification with criteria and sample size
   */
  async defineParticipants(
    project: Project,
    studyDesign: StudyDesign
  ): Promise<ParticipantSpec> {
    logger.debug('Defining participant criteria', {
      targetPopulation: project.intake.targetPopulation,
      requiresSampleSize: studyDesign.requiresSampleSize,
    });

    // Convert StudyDesign to StudyDesignOutput format for prompt
    const studyDesignOutput: StudyDesignOutput = {
      studyType: studyDesign.type,
      subtype: studyDesign.subtype,
      reportingGuideline: studyDesign.reportingGuideline,
      isRandomised: studyDesign.isRandomised,
      isBlinded: studyDesign.isBlinded,
      blindingType: studyDesign.blindingType,
      controlType: studyDesign.controlType,
      requiresSampleSize: studyDesign.requiresSampleSize,
      justification: studyDesign.justification,
      alternativeDesigns: [],
    };

    // Prepare evidence summary
    const evidenceBase = project.research
      ? project.research.evidenceSynthesis
      : 'No prior literature review available.';

    // Prepare input for LLM
    const input: ParticipantCriteriaInput = {
      targetPopulation: project.intake.targetPopulation,
      studyDesign: studyDesignOutput,
      evidenceBase,
      setting: project.intake.setting,
      researchQuestion: project.intake.conceptDescription,
    };

    // Generate participant criteria prompt and get LLM response
    const prompt = defineParticipantsPrompt(input);
    const response = await complete(prompt, {
      system: METHODOLOGY_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    // Parse response
    const parsedOutput = parseParticipantCriteriaResponse(response);

    // Convert to ParticipantSpec type
    const participantSpec = this.convertToParticipantSpec(parsedOutput, studyDesign);

    logger.debug('Participant criteria defined', {
      inclusionCriteriaCount: participantSpec.inclusionCriteria.length,
      exclusionCriteriaCount: participantSpec.exclusionCriteria.length,
      sampleSize: participantSpec.sampleSize?.target,
      vulnerablePopulation: participantSpec.vulnerablePopulation,
    });

    return participantSpec;
  }

  // ============================================================================
  // Outcome Definition
  // ============================================================================

  /**
   * Define primary and secondary outcomes with measurement specifications
   *
   * Specifies the primary outcome, secondary outcomes, and any safety
   * or exploratory outcomes with clear operational definitions and
   * measurement methods.
   *
   * @param project - The project to define outcomes for
   * @param studyDesign - The determined study design
   * @returns Outcome specification with primary and secondary outcomes
   */
  async defineOutcomes(
    project: Project,
    studyDesign: StudyDesign
  ): Promise<OutcomeSpec> {
    logger.debug('Defining study outcomes', {
      intendedOutcomes: project.intake.intendedOutcomes.substring(0, 100),
      reportingGuideline: studyDesign.reportingGuideline,
    });

    // Convert StudyDesign to StudyDesignOutput format for prompt
    const studyDesignOutput: StudyDesignOutput = {
      studyType: studyDesign.type,
      subtype: studyDesign.subtype,
      reportingGuideline: studyDesign.reportingGuideline,
      isRandomised: studyDesign.isRandomised,
      isBlinded: studyDesign.isBlinded,
      blindingType: studyDesign.blindingType,
      controlType: studyDesign.controlType,
      requiresSampleSize: studyDesign.requiresSampleSize,
      justification: studyDesign.justification,
      alternativeDesigns: [],
    };

    // Prepare input for LLM
    const input: OutcomeDefinitionInput = {
      intendedOutcomes: project.intake.intendedOutcomes,
      studyDesign: studyDesignOutput,
      reportingGuideline: studyDesign.reportingGuideline,
      clinicalProblem: project.intake.clinicalProblem,
    };

    // Generate outcomes prompt and get LLM response
    const prompt = defineOutcomesPrompt(input);
    const response = await complete(prompt, {
      system: METHODOLOGY_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    // Parse response
    const parsedOutput = parseOutcomeDefinitionResponse(response);

    // Convert to OutcomeSpec type
    const outcomeSpec = this.convertToOutcomeSpec(parsedOutput);

    logger.debug('Study outcomes defined', {
      primaryOutcome: outcomeSpec.primary.name,
      secondaryCount: outcomeSpec.secondary.length,
      hasSafetyOutcomes: !!outcomeSpec.safetyOutcomes?.length,
    });

    return outcomeSpec;
  }

  // ============================================================================
  // Analysis Plan Development
  // ============================================================================

  /**
   * Develop a comprehensive statistical analysis plan
   *
   * Creates the primary analysis approach, secondary analyses,
   * sensitivity analyses, and strategies for handling missing data.
   *
   * @param studyDesign - The study design specification
   * @param outcomes - The outcome specification
   * @param participants - Optional participant specification for sample size info
   * @returns The statistical analysis plan
   */
  async developAnalysisPlan(
    studyDesign: StudyDesign,
    outcomes: OutcomeSpec,
    participants?: ParticipantSpec
  ): Promise<AnalysisPlan> {
    logger.debug('Developing analysis plan', {
      studyType: studyDesign.type,
      primaryOutcome: outcomes.primary.name,
    });

    // Convert types for prompt
    const studyDesignOutput: StudyDesignOutput = {
      studyType: studyDesign.type,
      subtype: studyDesign.subtype,
      reportingGuideline: studyDesign.reportingGuideline,
      isRandomised: studyDesign.isRandomised,
      isBlinded: studyDesign.isBlinded,
      blindingType: studyDesign.blindingType,
      controlType: studyDesign.controlType,
      requiresSampleSize: studyDesign.requiresSampleSize,
      justification: studyDesign.justification,
      alternativeDesigns: [],
    };

    const outcomesOutput: OutcomeDefinitionOutput = {
      primaryOutcome: {
        name: outcomes.primary.name,
        definition: outcomes.primary.definition,
        measurementTool: outcomes.primary.measurementTool,
        measurementTiming: outcomes.primary.measurementTiming,
        clinicallyMeaningfulDifference: outcomes.primary.clinicallyMeaningfulDifference,
        dataType: 'continuous', // Default, will be determined by LLM
      },
      secondaryOutcomes: outcomes.secondary.map((o) => ({
        name: o.name,
        definition: o.definition,
        measurementTool: o.measurementTool,
        measurementTiming: o.measurementTiming,
        dataType: 'continuous',
      })),
      exploratoryOutcomes: outcomes.exploratoryOutcomes?.map((o) => ({
        name: o.name,
        definition: o.definition,
        rationale: 'Exploratory analysis',
      })),
      safetyOutcomes: outcomes.safetyOutcomes?.map((o) => ({
        name: o.name,
        definition: o.definition,
        monitoringPlan: o.monitoringPlan,
      })),
    };

    // Prepare input for LLM
    const input: AnalysisPlanInput = {
      studyDesign: studyDesignOutput,
      outcomes: outcomesOutput,
      sampleSize: participants?.sampleSize?.target,
      participantCriteria: {
        inclusionCriteria: participants?.inclusionCriteria.map((c) => ({
          criterion: c.criterion,
          rationale: c.rationale || '',
          operationalDefinition: c.measurementMethod || '',
        })) || [],
        exclusionCriteria: participants?.exclusionCriteria.map((c) => ({
          criterion: c.criterion,
          rationale: c.rationale || '',
          operationalDefinition: c.measurementMethod || '',
        })) || [],
        recruitmentStrategy: participants?.recruitmentStrategy || {
          method: 'To be determined',
          sites: [],
          estimatedDuration: 'To be determined',
          feasibilityJustification: 'To be determined',
        },
        vulnerablePopulation: participants?.vulnerablePopulation || false,
        capacityIssues: participants?.capacityIssues || false,
      },
    };

    // Generate analysis plan prompt and get LLM response
    const prompt = developAnalysisPlanPrompt(input);
    const response = await complete(prompt, {
      system: METHODOLOGY_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    // Parse response
    const parsedOutput = parseAnalysisPlanResponse(response);

    // Convert to AnalysisPlan type
    const analysisPlan = this.convertToAnalysisPlan(parsedOutput);

    logger.debug('Analysis plan developed', {
      primaryMethod: analysisPlan.primaryAnalysis.method,
      secondaryAnalysesCount: analysisPlan.secondaryAnalyses.length,
      sensitivityAnalysesCount: analysisPlan.sensitivityAnalyses.length,
    });

    return analysisPlan;
  }

  // ============================================================================
  // Timeline Generation
  // ============================================================================

  /**
   * Generate a project timeline based on methodology components
   *
   * Creates a structured timeline with phases, milestones, and
   * deliverables based on the study design and methodology.
   *
   * @param methodology - The methodology data (without timeline)
   * @param options - Optional timeline configuration
   * @returns The project timeline
   */
  async generateTimeline(
    methodology: MethodologyStageData,
    options: TimelineOptions = {}
  ): Promise<ProjectTimeline> {
    logger.debug('Generating project timeline', {
      studyType: methodology.studyDesign.type,
      hasDeadline: !!options.submissionDeadline,
    });

    // Build timeline prompt
    const prompt = this.buildTimelinePrompt(methodology, options);

    // Get LLM response
    const response = await complete(prompt, {
      system: METHODOLOGY_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    // Parse timeline from response
    const timeline = this.parseTimelineResponse(response, options);

    logger.debug('Project timeline generated', {
      totalDuration: timeline.totalDuration,
      phaseCount: timeline.phases.length,
      milestoneCount: timeline.milestones.length,
    });

    return timeline;
  }

  // ============================================================================
  // Helper Methods - Project Validation
  // ============================================================================

  /**
   * Get and validate a project for methodology development
   */
  private async getAndValidateProject(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findById(projectId);

    if (!project) {
      throw new MethodologyAgentError(
        `Project not found: ${projectId}`,
        'PROJECT_NOT_FOUND'
      );
    }

    // Check that research stage is complete
    if (!project.research) {
      throw new MethodologyAgentError(
        'Research stage must be completed before methodology development',
        'PREREQUISITE_NOT_MET'
      );
    }

    // Check project status allows methodology development
    const allowedStatuses: ProjectStatus[] = [
      ProjectStatus.RESEARCH_COMPLETE,
      ProjectStatus.RESEARCH_APPROVED,
      ProjectStatus.METHODOLOGY_COMPLETE, // Allow re-running
    ];

    if (!allowedStatuses.includes(project.status)) {
      throw new MethodologyAgentError(
        `Invalid project status for methodology development: ${project.status}`,
        'INVALID_STATUS'
      );
    }

    return project;
  }

  // ============================================================================
  // Helper Methods - Conversion Functions
  // ============================================================================

  /**
   * Convert LLM output to StudyDesign type
   */
  private convertToStudyDesign(
    output: StudyDesignOutput,
    project: Project
  ): StudyDesign {
    // Determine appropriate reporting guideline
    const reportingGuideline = this.mapToReportingGuideline(output.reportingGuideline);

    // Map blinding type
    const blindingType = output.blindingType
      ? this.mapToBlindingType(output.blindingType)
      : undefined;

    // Map control type
    const controlType = output.controlType
      ? this.mapToControlType(output.controlType)
      : undefined;

    return {
      type: output.studyType as StudyDesignType,
      subtype: output.subtype,
      reportingGuideline,
      isRandomised: output.isRandomised,
      isBlinded: output.isBlinded,
      blindingType,
      controlType,
      requiresSampleSize: output.requiresSampleSize,
      justification: output.justification,
      phases: this.determineStudyPhases(output.studyType, project.classification.project_type),
      arms: this.determineStudyArms(output),
    };
  }

  /**
   * Convert LLM output to ParticipantSpec type
   */
  private convertToParticipantSpec(
    output: ParticipantCriteriaOutput,
    studyDesign: StudyDesign
  ): ParticipantSpec {
    // Type for criteria from LLM output
    type CriterionOutput = {
      criterion: string;
      rationale: string;
      operationalDefinition: string;
    };

    // Convert inclusion criteria
    const inclusionCriteria: Criterion[] = output.inclusionCriteria.map((c: CriterionOutput) => ({
      criterion: c.criterion,
      rationale: c.rationale,
      measurementMethod: c.operationalDefinition,
    }));

    // Convert exclusion criteria
    const exclusionCriteria: Criterion[] = output.exclusionCriteria.map((c: CriterionOutput) => ({
      criterion: c.criterion,
      rationale: c.rationale,
      measurementMethod: c.operationalDefinition,
    }));

    // Convert sample size if applicable
    let sampleSize: SampleSizeCalculation | undefined;
    if (studyDesign.requiresSampleSize && output.sampleSizeEstimate) {
      sampleSize = {
        target: output.sampleSizeEstimate.target,
        calculationMethod: output.sampleSizeEstimate.calculationMethod as SampleSizeMethod,
        assumptions: {
          effectSize: output.sampleSizeEstimate.assumptions.effectSize,
          power: output.sampleSizeEstimate.assumptions.power,
          alpha: output.sampleSizeEstimate.assumptions.alpha,
          attritionRate: output.sampleSizeEstimate.assumptions.attritionRate,
        },
        justification: output.sampleSizeEstimate.justification,
      };
    }

    // Convert recruitment strategy
    const recruitmentStrategy: RecruitmentStrategy = {
      method: output.recruitmentStrategy.method,
      sites: output.recruitmentStrategy.sites,
      estimatedDuration: output.recruitmentStrategy.estimatedDuration,
      feasibilityJustification: output.recruitmentStrategy.feasibilityJustification,
    };

    return {
      inclusionCriteria,
      exclusionCriteria,
      sampleSize,
      recruitmentStrategy,
      capacityIssues: output.capacityIssues,
      vulnerablePopulation: output.vulnerablePopulation,
    };
  }

  /**
   * Convert LLM output to OutcomeSpec type
   */
  private convertToOutcomeSpec(output: OutcomeDefinitionOutput): OutcomeSpec {
    // Convert primary outcome
    const primary: PrimaryOutcome = {
      name: output.primaryOutcome.name,
      definition: output.primaryOutcome.definition,
      measurementTool: output.primaryOutcome.measurementTool,
      measurementTiming: output.primaryOutcome.measurementTiming,
      clinicallyMeaningfulDifference: output.primaryOutcome.clinicallyMeaningfulDifference,
      validationStatus: output.primaryOutcome.validationReference,
    };

    // Type definitions for outcome outputs
    type SecondaryOutcomeOutput = {
      name: string;
      definition: string;
      measurementTool: string;
      measurementTiming: string;
      dataType: string;
    };

    type ExploratoryOutcomeOutput = {
      name: string;
      definition: string;
      rationale: string;
    };

    type SafetyOutcomeOutput = {
      name: string;
      definition: string;
      monitoringPlan: string;
    };

    // Convert secondary outcomes
    const secondary: SecondaryOutcome[] = output.secondaryOutcomes.map(
      (o: SecondaryOutcomeOutput) => ({
        name: o.name,
        definition: o.definition,
        measurementTool: o.measurementTool,
        measurementTiming: o.measurementTiming,
      })
    );

    // Convert exploratory outcomes if present
    const exploratoryOutcomes: ExploratoryOutcome[] | undefined = output.exploratoryOutcomes?.map(
      (o: ExploratoryOutcomeOutput) => ({
        name: o.name,
        definition: o.definition,
        measurementTool: o.rationale,
      })
    );

    // Convert safety outcomes if present
    const safetyOutcomes: SafetyOutcome[] | undefined = output.safetyOutcomes?.map(
      (o: SafetyOutcomeOutput) => ({
        name: o.name,
        definition: o.definition,
        monitoringPlan: o.monitoringPlan,
      })
    );

    return {
      primary,
      secondary,
      exploratoryOutcomes,
      safetyOutcomes,
    };
  }

  /**
   * Convert LLM output to AnalysisPlan type
   */
  private convertToAnalysisPlan(output: AnalysisPlanOutput): AnalysisPlan {
    // Type definitions for analysis outputs
    type SecondaryAnalysisOutput = {
      outcome: string;
      method: string;
      description: string;
    };

    type SensitivityAnalysisOutput = {
      name: string;
      purpose: string;
      method: string;
    };

    type SubgroupAnalysisOutput = {
      subgroup: string;
      rationale: string;
      method: string;
    };

    return {
      primaryAnalysis: {
        method: output.primaryAnalysis.method,
        description: output.primaryAnalysis.description,
        software: output.primaryAnalysis.software,
      },
      secondaryAnalyses: output.secondaryAnalyses.map((a: SecondaryAnalysisOutput) => ({
        name: a.outcome,
        method: a.method,
        description: a.description,
      })),
      sensitivityAnalyses: output.sensitivityAnalyses.map((a: SensitivityAnalysisOutput) => ({
        name: a.name,
        description: a.method,
        rationale: a.purpose,
      })),
      subgroupAnalyses: output.subgroupAnalyses?.map((a: SubgroupAnalysisOutput) => ({
        subgroup: a.subgroup,
        justification: a.rationale,
      })),
      missingDataHandling: output.missingDataStrategy.approach,
      multipleTesting: output.multipleTesting?.adjustmentMethod,
    };
  }

  // ============================================================================
  // Helper Methods - Procedures and Data Collection
  // ============================================================================

  /**
   * Define study procedures based on design and outcomes
   */
  private async defineProcedures(
    project: Project,
    studyDesign: StudyDesign,
    outcomes: OutcomeSpec
  ): Promise<ProcedureSpec> {
    logger.debug('Defining study procedures');

    const prompt = `Define the study procedures for a ${studyDesign.type} study.

## Study Design
${JSON.stringify(studyDesign, null, 2)}

## Primary Outcome
${outcomes.primary.name}: ${outcomes.primary.definition}

## Setting
${project.intake.setting}

## Clinical Problem
${project.intake.clinicalProblem}

Generate a detailed procedure specification including:
1. Overall description of the study procedures
2. Step-by-step protocol (5-10 key steps)
3. Intervention details (if applicable)
4. Fidelity measures
5. Protocol deviation handling

Respond with valid JSON:
\`\`\`json
{
  "description": "Overall description of study procedures",
  "steps": [
    {
      "stepNumber": 1,
      "name": "Step name",
      "description": "Detailed description",
      "responsible": "Role/person responsible",
      "timing": "When this occurs",
      "materials": ["Material 1"],
      "qualityChecks": ["Check 1"]
    }
  ],
  "interventionDetails": "Details of the intervention if applicable",
  "fidelityMeasures": ["Measure 1", "Measure 2"],
  "protocolDeviationHandling": "How protocol deviations will be handled"
}
\`\`\``;

    const response = await complete(prompt, {
      system: METHODOLOGY_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    // Parse response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch && jsonMatch[1] ? jsonMatch[1] : response;
    const parsed = JSON.parse(jsonString.trim());

    const steps: ProcedureStep[] = (parsed.steps || []).map((s: Record<string, unknown>) => ({
      stepNumber: s.stepNumber as number,
      name: s.name as string,
      description: s.description as string,
      responsible: s.responsible as string,
      timing: s.timing as string | undefined,
      materials: s.materials as string[] | undefined,
      qualityChecks: s.qualityChecks as string[] | undefined,
    }));

    return {
      description: parsed.description || '',
      steps,
      interventionDetails: parsed.interventionDetails,
      fidelityMeasures: parsed.fidelityMeasures,
      protocolDeviationHandling: parsed.protocolDeviationHandling,
    };
  }

  /**
   * Define data collection plan
   */
  private async defineDataCollection(
    project: Project,
    studyDesign: StudyDesign,
    outcomes: OutcomeSpec,
    procedures: ProcedureSpec
  ): Promise<DataCollectionSpec> {
    logger.debug('Defining data collection plan');

    const prompt = `Define the data collection plan for a ${studyDesign.type} study.

## Outcomes to Measure
Primary: ${outcomes.primary.name} (${outcomes.primary.measurementTool})
Secondary: ${outcomes.secondary.map((o) => o.name).join(', ')}

## Procedures Overview
${procedures.description}

## Setting
${project.intake.setting}

Generate a data collection specification including:
1. Data types to collect
2. Variables with definitions
3. Collection methods and instruments
4. Quality assurance measures

Respond with valid JSON:
\`\`\`json
{
  "dataTypes": ["QUANTITATIVE", "QUALITATIVE", "MIXED"],
  "variables": [
    {
      "name": "Variable name",
      "type": "continuous | categorical | binary",
      "description": "Description",
      "source": "Data source",
      "timing": "When collected"
    }
  ],
  "methods": ["Method 1", "Method 2"],
  "instruments": ["Instrument 1", "Instrument 2"],
  "includesIdentifiableData": true,
  "qualityAssurance": ["QA measure 1", "QA measure 2"]
}
\`\`\``;

    const response = await complete(prompt, {
      system: METHODOLOGY_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    // Parse response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch && jsonMatch[1] ? jsonMatch[1] : response;
    const parsed = JSON.parse(jsonString.trim());

    const dataTypes: DataType[] = (parsed.dataTypes || ['QUANTITATIVE']).map(
      (dt: string) => dt as DataType
    );

    const variables: DataVariable[] = (parsed.variables || []).map(
      (v: Record<string, unknown>) => ({
        name: v.name as string,
        type: v.type as string,
        description: v.description as string,
        source: v.source as string,
        timing: v.timing as string,
      })
    );

    return {
      dataTypes,
      variables,
      methods: parsed.methods || [],
      instruments: parsed.instruments || [],
      includesIdentifiableData: parsed.includesIdentifiableData ?? true,
      qualityAssurance: parsed.qualityAssurance || [],
    };
  }

  /**
   * Define study sites from project data
   */
  private defineSettingSites(project: Project): Site[] {
    // Extract site information from project setting
    // In a real implementation, this might involve more sophisticated parsing
    // or additional user input
    const site: Site = {
      id: 'site-001',
      name: project.intake.setting,
      institution: project.intake.principalInvestigator.institution,
      department: project.intake.principalInvestigator.department,
      siteInvestigator: project.intake.principalInvestigator.name,
      expectedRecruitment: 0, // Will be updated with sample size
    };

    return [site];
  }

  // ============================================================================
  // Helper Methods - Timeline Generation
  // ============================================================================

  /**
   * Build prompt for timeline generation
   */
  private buildTimelinePrompt(
    methodology: MethodologyStageData,
    options: TimelineOptions
  ): string {
    const startDate = options.startDate || new Date().toISOString().split('T')[0];

    return `Generate a project timeline for a ${methodology.studyDesign.type} study.

## Study Details
- Design: ${methodology.studyDesign.type}
- Sample Size: ${methodology.participants.sampleSize?.target || 'Not applicable'}
- Recruitment Duration: ${methodology.participants.recruitmentStrategy.estimatedDuration}
- Sites: ${methodology.settingSites.map((s) => s.name).join(', ')}

## Constraints
- Start Date: ${startDate}
${options.endDate ? `- Target End Date: ${options.endDate}` : ''}
${options.submissionDeadline ? `- Submission Deadline: ${options.submissionDeadline}` : ''}

## Required Phases
Based on the study design, include appropriate phases such as:
- Ethics/Regulatory Approval
- Site Setup and Training
- Recruitment
- Data Collection
- Data Analysis
- Manuscript Preparation/Reporting

Generate a realistic timeline with phases and milestones.

Respond with valid JSON:
\`\`\`json
{
  "totalDuration": "X months",
  "phases": [
    {
      "name": "Phase name",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "milestones": ["Milestone 1", "Milestone 2"],
      "deliverables": ["Deliverable 1"]
    }
  ],
  "milestones": [
    {
      "name": "Milestone name",
      "targetDate": "YYYY-MM-DD",
      "description": "Description",
      "dependencies": ["Other milestone name"]
    }
  ]
}
\`\`\``;
  }

  /**
   * Parse timeline response from LLM
   */
  private parseTimelineResponse(response: string, options: TimelineOptions): ProjectTimeline {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch && jsonMatch[1] ? jsonMatch[1] : response;

    try {
      const parsed = JSON.parse(jsonString.trim());

      const phases: TimelinePhase[] = (parsed.phases || []).map(
        (p: Record<string, unknown>) => ({
          name: p.name as string,
          startDate: p.startDate as string,
          endDate: p.endDate as string,
          milestones: (p.milestones as string[]) || [],
          deliverables: p.deliverables as string[] | undefined,
        })
      );

      const milestones = (parsed.milestones || []).map(
        (m: Record<string, unknown>) => ({
          name: m.name as string,
          targetDate: m.targetDate as string,
          description: m.description as string | undefined,
          dependencies: m.dependencies as string[] | undefined,
        })
      );

      return {
        totalDuration: parsed.totalDuration || 'To be determined',
        phases,
        milestones,
      };
    } catch {
      logger.warn('Failed to parse timeline response, using defaults');
      return this.generateDefaultTimeline(options);
    }
  }

  /**
   * Generate a default timeline if parsing fails
   */
  private generateDefaultTimeline(options: TimelineOptions): ProjectTimeline {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const startDate: string = options.startDate ?? today;
    const baseDate = new Date(startDate);

    // Generate reasonable default phases
    const phases: TimelinePhase[] = [
      {
        name: 'Ethics and Regulatory Approval',
        startDate: startDate,
        endDate: this.addMonths(baseDate, 3),
        milestones: ['Ethics submission', 'Ethics approval'],
      },
      {
        name: 'Site Setup',
        startDate: this.addMonths(baseDate, 2),
        endDate: this.addMonths(baseDate, 4),
        milestones: ['Site initiation'],
      },
      {
        name: 'Recruitment and Data Collection',
        startDate: this.addMonths(baseDate, 4),
        endDate: this.addMonths(baseDate, 16),
        milestones: ['First participant enrolled', 'Recruitment complete'],
      },
      {
        name: 'Data Analysis',
        startDate: this.addMonths(baseDate, 16),
        endDate: this.addMonths(baseDate, 20),
        milestones: ['Analysis complete'],
      },
      {
        name: 'Reporting and Dissemination',
        startDate: this.addMonths(baseDate, 20),
        endDate: this.addMonths(baseDate, 24),
        milestones: ['Manuscript submission'],
        deliverables: ['Final report', 'Manuscript'],
      },
    ];

    return {
      totalDuration: '24 months',
      phases,
      milestones: [
        { name: 'Ethics submission', targetDate: this.addMonths(baseDate, 1) },
        { name: 'Ethics approval', targetDate: this.addMonths(baseDate, 3) },
        { name: 'First participant enrolled', targetDate: this.addMonths(baseDate, 5) },
        { name: 'Recruitment complete', targetDate: this.addMonths(baseDate, 16) },
        { name: 'Analysis complete', targetDate: this.addMonths(baseDate, 20) },
        { name: 'Manuscript submission', targetDate: this.addMonths(baseDate, 24) },
      ],
    };
  }

  /**
   * Add months to a date and return ISO date string
   */
  private addMonths(date: Date, months: number): string {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    const dateString = result.toISOString().split('T')[0];
    return dateString ?? result.toISOString().substring(0, 10);
  }

  // ============================================================================
  // Helper Methods - Mapping Functions
  // ============================================================================

  /**
   * Format research gaps for prompt
   */
  private formatGapsForPrompt(researchData: ResearchStageData): string {
    const gaps = researchData.gapAnalysis;
    const parts: string[] = [];

    if (gaps.identifiedGaps.length > 0) {
      parts.push(
        'Identified Knowledge Gaps:\n' +
          gaps.identifiedGaps
            .map((g) => `- ${g.description} (Priority: ${g.priority})`)
            .join('\n')
      );
    }

    if (gaps.methodologicalLimitations.length > 0) {
      parts.push(
        'Methodological Limitations in Current Literature:\n' +
          gaps.methodologicalLimitations.map((l) => `- ${l}`).join('\n')
      );
    }

    if (gaps.populationGaps.length > 0) {
      parts.push('Population Gaps:\n' + gaps.populationGaps.map((p) => `- ${p}`).join('\n'));
    }

    parts.push('\nSummary: ' + gaps.summary);

    return parts.join('\n\n');
  }

  /**
   * Map string to ReportingGuideline enum
   */
  private mapToReportingGuideline(guideline: string): ReportingGuideline {
    const mapping: Record<string, ReportingGuideline> = {
      CONSORT: 'CONSORT' as ReportingGuideline,
      STROBE: 'STROBE' as ReportingGuideline,
      PRISMA: 'PRISMA' as ReportingGuideline,
      SQUIRE: 'SQUIRE' as ReportingGuideline,
      TREND: 'TREND' as ReportingGuideline,
      SRQR: 'SRQR' as ReportingGuideline,
      GRAMMS: 'GRAMMS' as ReportingGuideline,
      STARD: 'STARD' as ReportingGuideline,
      CARE: 'CARE' as ReportingGuideline,
      SPIRIT: 'SPIRIT' as ReportingGuideline,
      CHEERS: 'CHEERS' as ReportingGuideline,
    };

    return mapping[guideline.toUpperCase()] || ('STROBE' as ReportingGuideline);
  }

  /**
   * Map string to BlindingType enum
   */
  private mapToBlindingType(blinding: string): BlindingType {
    const normalised = blinding.toUpperCase().replace(/[\s-]/g, '_');
    const mapping: Record<string, BlindingType> = {
      OPEN_LABEL: 'OPEN_LABEL' as BlindingType,
      SINGLE_BLIND: 'SINGLE_BLIND' as BlindingType,
      SINGLE: 'SINGLE_BLIND' as BlindingType,
      DOUBLE_BLIND: 'DOUBLE_BLIND' as BlindingType,
      DOUBLE: 'DOUBLE_BLIND' as BlindingType,
      TRIPLE_BLIND: 'TRIPLE_BLIND' as BlindingType,
      TRIPLE: 'TRIPLE_BLIND' as BlindingType,
      NONE: 'OPEN_LABEL' as BlindingType,
      NOT_APPLICABLE: 'OPEN_LABEL' as BlindingType,
    };

    return mapping[normalised] || ('OPEN_LABEL' as BlindingType);
  }

  /**
   * Map string to ControlType enum
   */
  private mapToControlType(control: string): ControlType {
    const normalised = control.toUpperCase().replace(/[\s-]/g, '_');
    const mapping: Record<string, ControlType> = {
      PLACEBO: 'PLACEBO' as ControlType,
      ACTIVE_CONTROL: 'ACTIVE_CONTROL' as ControlType,
      ACTIVE_COMPARATOR: 'ACTIVE_CONTROL' as ControlType,
      USUAL_CARE: 'USUAL_CARE' as ControlType,
      STANDARD_CARE: 'USUAL_CARE' as ControlType,
      WAITLIST: 'WAITLIST' as ControlType,
      NO_TREATMENT: 'NO_TREATMENT' as ControlType,
      NONE: 'NO_TREATMENT' as ControlType,
      HISTORICAL: 'HISTORICAL' as ControlType,
    };

    return mapping[normalised] || ('USUAL_CARE' as ControlType);
  }

  /**
   * Determine study phases based on design type
   */
  private determineStudyPhases(studyType: string, projectType: string): string[] {
    if (projectType === 'QI') {
      return ['Plan', 'Do', 'Study', 'Act'];
    }

    const phaseMapping: Record<string, string[]> = {
      RCT: ['Setup', 'Recruitment', 'Intervention', 'Follow-up', 'Analysis'],
      CLUSTER_RCT: ['Setup', 'Cluster Randomisation', 'Implementation', 'Follow-up', 'Analysis'],
      STEPPED_WEDGE: ['Setup', 'Sequential Rollout', 'Data Collection', 'Analysis'],
      COHORT: ['Baseline', 'Follow-up', 'Analysis'],
      CASE_CONTROL: ['Case Identification', 'Control Selection', 'Data Collection', 'Analysis'],
      CROSS_SECTIONAL: ['Sampling', 'Data Collection', 'Analysis'],
      THEMATIC_ANALYSIS: ['Data Collection', 'Coding', 'Theme Development', 'Review'],
      SYSTEMATIC_REVIEW: ['Protocol', 'Search', 'Screening', 'Data Extraction', 'Synthesis'],
    };

    return phaseMapping[studyType] || ['Setup', 'Data Collection', 'Analysis', 'Reporting'];
  }

  /**
   * Determine study arms based on design output
   */
  private determineStudyArms(output: StudyDesignOutput): StudyDesign['arms'] {
    if (!output.isRandomised) {
      return undefined;
    }

    // Default arms for randomised studies
    if (output.controlType) {
      return [
        { name: 'Intervention', description: 'Intervention group', allocation: 1 },
        {
          name: 'Control',
          description: output.controlType || 'Control group',
          allocation: 1,
        },
      ];
    }

    return undefined;
  }

  // ============================================================================
  // Helper Methods - Audit Logging
  // ============================================================================

  /**
   * Log an action to the audit trail
   */
  private async logAction(input: LogActionInput): Promise<void> {
    try {
      await this.auditRepo.logAction(input);
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      logger.warn('Failed to log audit action', {
        action: input.action,
        projectId: input.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default MethodologyAgent;
