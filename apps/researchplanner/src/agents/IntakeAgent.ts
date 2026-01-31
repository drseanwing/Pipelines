/**
 * QI Research Pipeline - Intake Agent
 *
 * Stage 1 Agent responsible for processing project intake submissions.
 * Handles validation, classification, framework determination, and
 * initial project creation in the database.
 *
 * @module agents/IntakeAgent
 */

import { z } from 'zod';
import {
  IntakeData,
  Classification,
  ClassificationSchema,
  Frameworks,
  FrameworksSchema,
  Project,
  ProjectStatus,
  ProjectType,
  safeValidateIntakeData,
} from '../types/index.js';

import {
  complete,
  LLMError,
} from '../llm/index.js';

import {
  CLASSIFICATION_SYSTEM_PROMPT,
  classifyProjectPrompt,
  parseClassificationResponse,
  getEthicsPathwayRecommendation,
  STUDY_DESIGN_MATRIX,
  type ClassificationInput,
  type ClassificationOutput,
} from '../llm/prompts/index.js';

import {
  ProjectRepository,
  AuditRepository,
  type LogActionInput,
} from '../db/repositories/index.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Result of intake data validation
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Validation errors if any */
  errors: ValidationError[];
  /** Validated data if successful */
  data?: IntakeData;
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** Field path that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
}

/**
 * Error thrown by the IntakeAgent
 */
export class IntakeAgentError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IntakeAgentError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Intake Agent
// ============================================================================

/**
 * Intake Agent for Stage 1 of the QI Research Pipeline
 *
 * Responsible for:
 * - Validating intake data against Zod schemas
 * - Classifying projects as QI, Research, or Hybrid using LLM
 * - Determining applicable reporting guidelines and frameworks
 * - Creating initial project records in the database
 * - Logging all actions to the audit trail
 *
 * @example
 * ```typescript
 * const intakeAgent = new IntakeAgent(projectRepo, auditRepo);
 *
 * // Validate intake data first
 * const validation = await intakeAgent.validateIntake(rawIntakeData);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 *   return;
 * }
 *
 * // Process the complete intake
 * const project = await intakeAgent.processIntake(validation.data!, userId);
 * console.log('Created project:', project.id);
 * console.log('Classification:', project.classification.project_type);
 * ```
 */
export class IntakeAgent {
  private readonly projectRepo: ProjectRepository;
  private readonly auditRepo: AuditRepository;

  /**
   * Create a new IntakeAgent instance
   *
   * @param projectRepo - Repository for project operations
   * @param auditRepo - Repository for audit logging
   */
  constructor(projectRepo: ProjectRepository, auditRepo: AuditRepository) {
    this.projectRepo = projectRepo;
    this.auditRepo = auditRepo;
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Process a complete intake submission
   *
   * This is the main entry point for Stage 1 processing. It:
   * 1. Validates the intake data
   * 2. Classifies the project using LLM
   * 3. Determines applicable frameworks
   * 4. Creates the project in the database
   * 5. Logs the action
   *
   * @param intakeData - The intake data to process
   * @param userId - ID of the user submitting the intake
   * @returns The created project with classification and frameworks
   * @throws IntakeAgentError if validation fails or processing errors occur
   *
   * @example
   * ```typescript
   * const project = await intakeAgent.processIntake({
   *   projectTitle: 'Improving Sepsis Recognition in ED',
   *   projectType: 'QI',
   *   conceptDescription: 'Implementing a sepsis screening protocol...',
   *   clinicalProblem: 'Delayed recognition leads to poor outcomes...',
   *   targetPopulation: 'Adult ED patients with suspected infection',
   *   setting: 'Emergency Department',
   *   principalInvestigator: { ... },
   *   coInvestigators: [],
   *   intendedOutcomes: 'Reduce time to antibiotics...',
   * }, 'user-123');
   * ```
   */
  async processIntake(intakeData: IntakeData, userId: string): Promise<Project> {
    // Step 1: Validate the intake data
    const validation = await this.validateIntake(intakeData);
    if (!validation.valid) {
      throw new IntakeAgentError(
        'Intake data validation failed',
        'VALIDATION_FAILED',
        { errors: validation.errors }
      );
    }

    const validatedData = validation.data!;

    try {
      // Step 2: Classify the project using LLM
      const classification = await this.classifyProject(validatedData);

      // Step 3: Determine applicable frameworks
      const frameworks = await this.determineFrameworks(classification, validatedData);

      // Step 4: Create the project in the database
      const project = await this.projectRepo.createFromIntake(validatedData, userId);

      // Step 5: Update the project with classification and frameworks
      const updatedProject = await this.projectRepo.updateClassification(
        project.id,
        classification,
        frameworks,
        userId
      );

      // Step 6: Update status to INTAKE_COMPLETE
      const finalProject = await this.projectRepo.updateStatus(
        updatedProject.id,
        ProjectStatus.INTAKE_COMPLETE,
        userId
      );

      // Step 7: Log the intake processing action
      await this.logIntakeAction(finalProject, userId, classification);

      return finalProject;
    } catch (error: unknown) {
      // Handle LLM errors
      if (error instanceof LLMError) {
        throw new IntakeAgentError(
          `LLM classification failed: ${error.message}`,
          'LLM_ERROR',
          { type: error.type, retryable: error.retryable }
        );
      }

      // Re-throw IntakeAgentError as-is
      if (error instanceof IntakeAgentError) {
        throw error;
      }

      // Wrap other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new IntakeAgentError(
        `Intake processing failed: ${errorMessage}`,
        'PROCESSING_ERROR',
        { originalError: errorMessage }
      );
    }
  }

  /**
   * Validate intake data against the schema
   *
   * Performs comprehensive validation using Zod schemas and returns
   * detailed error information if validation fails.
   *
   * @param intakeData - Raw intake data to validate
   * @returns Validation result with errors or validated data
   *
   * @example
   * ```typescript
   * const result = await intakeAgent.validateIntake(rawData);
   *
   * if (result.valid) {
   *   console.log('Data is valid:', result.data);
   * } else {
   *   result.errors.forEach(err => {
   *     console.error(`${err.field}: ${err.message}`);
   *   });
   * }
   * ```
   */
  async validateIntake(intakeData: IntakeData): Promise<ValidationResult> {
    const result = safeValidateIntakeData(intakeData);

    if (result.success) {
      // Additional business logic validations
      const businessErrors = this.validateBusinessRules(result.data);

      if (businessErrors.length > 0) {
        return {
          valid: false,
          errors: businessErrors,
        };
      }

      return {
        valid: true,
        errors: [],
        data: result.data,
      };
    }

    // Map Zod errors to our ValidationError format
    const errors: ValidationError[] = result.error.errors.map((err: z.ZodIssue) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Classify a project using LLM analysis
   *
   * Sends the project concept, clinical problem, and intended outcomes
   * to the LLM for classification as QI, Research, or Hybrid.
   *
   * @param intakeData - Validated intake data
   * @returns Classification result with type, confidence, and reasoning
   * @throws LLMError if the LLM request fails
   *
   * @example
   * ```typescript
   * const classification = await intakeAgent.classifyProject(intakeData);
   *
   * console.log('Type:', classification.project_type);
   * console.log('Confidence:', classification.confidence);
   * console.log('Reasoning:', classification.reasoning);
   * console.log('Suggested designs:', classification.suggestedDesigns);
   * ```
   */
  async classifyProject(intakeData: IntakeData): Promise<Classification> {
    // Prepare input for the classification prompt
    const classificationInput: ClassificationInput = {
      conceptDescription: intakeData.conceptDescription,
      clinicalProblem: intakeData.clinicalProblem,
      intendedOutcomes: intakeData.intendedOutcomes,
      targetPopulation: intakeData.targetPopulation,
      setting: intakeData.setting,
    };

    // Generate the classification prompt
    const prompt = classifyProjectPrompt(classificationInput);

    // Call LLM with structured output parsing
    const llmResponse = await complete(prompt, {
      system: CLASSIFICATION_SYSTEM_PROMPT,
      temperature: 0.3, // Lower temperature for more consistent classification
    });

    // Parse and validate the response
    const classificationOutput = parseClassificationResponse(llmResponse);

    // Map to our Classification type
    const classification: Classification = {
      projectType: classificationOutput.classification as ProjectType,
      confidence: classificationOutput.confidence,
      reasoning: classificationOutput.reasoning,
      suggestedDesigns: classificationOutput.suggestedDesigns,
    };

    // Validate against schema
    const validated = ClassificationSchema.parse(classification);

    return validated as Classification;
  }

  /**
   * Determine applicable frameworks based on classification
   *
   * Uses the classification result to determine:
   * - Appropriate reporting guideline (CONSORT, STROBE, SQUIRE, etc.)
   * - Ethics framework and approval pathway
   * - Governance requirements
   *
   * @param classification - The project classification
   * @param intakeData - The intake data for additional context
   * @returns Frameworks specification
   *
   * @example
   * ```typescript
   * const frameworks = await intakeAgent.determineFrameworks(
   *   classification,
   *   intakeData
   * );
   *
   * console.log('Reporting guideline:', frameworks.reportingGuideline);
   * console.log('Ethics framework:', frameworks.ethicsFramework);
   * console.log('Requirements:', frameworks.governanceRequirements);
   * ```
   */
  async determineFrameworks(
    classification: Classification,
    intakeData: IntakeData
  ): Promise<Frameworks> {
    // Determine reporting guideline based on project type and suggested designs
    const reportingGuideline = this.determineReportingGuideline(classification);

    // Determine ethics framework based on classification
    const ethicsFramework = this.determineEthicsFramework(
      classification,
      intakeData
    );

    // Determine governance requirements
    const governanceRequirements = this.determineGovernanceRequirements(
      classification,
      intakeData
    );

    const frameworks: Frameworks = {
      reportingGuideline,
      ethicsFramework,
      governanceRequirements,
    };

    // Validate against schema
    const validated = FrameworksSchema.parse(frameworks);

    return validated;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Validate business rules beyond schema validation
   */
  private validateBusinessRules(intakeData: IntakeData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check that concept description has sufficient detail
    const wordCount = intakeData.conceptDescription.split(/\s+/).length;
    if (wordCount < 50) {
      errors.push({
        field: 'conceptDescription',
        message: 'Concept description should contain at least 50 words for adequate detail',
        code: 'INSUFFICIENT_DETAIL',
      });
    }

    // Validate PI has at least one area of expertise
    if (intakeData.principalInvestigator.expertise.length === 0) {
      errors.push({
        field: 'principalInvestigator.expertise',
        message: 'Principal investigator should list at least one area of expertise',
        code: 'MISSING_EXPERTISE',
      });
    }

    // Check timeline constraints if grant target is specified
    if (intakeData.grant_target && !intakeData.timelineConstraint?.submissionDeadline) {
      errors.push({
        field: 'timelineConstraint.submissionDeadline',
        message: 'Submission deadline is recommended when targeting a grant',
        code: 'MISSING_DEADLINE',
      });
    }

    // Validate project type alignment with description
    // This is a soft check - the LLM classification may override
    const qiKeywords = ['improve', 'implement', 'pdsa', 'quality', 'process'];
    const researchKeywords = ['hypothesis', 'investigate', 'generalize', 'publish', 'randomize'];

    const descLower = intakeData.conceptDescription.toLowerCase();
    const hasQIKeywords = qiKeywords.some((kw) => descLower.includes(kw));
    const hasResearchKeywords = researchKeywords.some((kw) => descLower.includes(kw));

    if (intakeData.project_type === 'QI' && hasResearchKeywords && !hasQIKeywords) {
      errors.push({
        field: 'projectType',
        message: 'Project description suggests research characteristics but QI was selected. Please review classification.',
        code: 'TYPE_MISMATCH_WARNING',
      });
    }

    return errors;
  }

  /**
   * Determine the appropriate reporting guideline
   */
  private determineReportingGuideline(classification: Classification): string {
    // Check if we can map this to a known design type
    const designMatrix = STUDY_DESIGN_MATRIX;

    if (classification.project_type === 'QI') {
      return designMatrix.QI.reportingGuideline;
    }

    if (classification.project_type === 'HYBRID') {
      return designMatrix.HYBRID.reportingGuideline;
    }

    // Use the first suggested design to determine reporting guideline
    const primaryDesign = classification.suggestedDesigns[0];
    if (primaryDesign !== undefined) {
      // For research, try to map the design
      const designMappings: Record<string, string> = {
        RCT: 'CONSORT',
        CLUSTER_RCT: 'CONSORT',
        STEPPED_WEDGE: 'CONSORT',
        COHORT: 'STROBE',
        CASE_CONTROL: 'STROBE',
        CROSS_SECTIONAL: 'STROBE',
        PRE_POST: 'TREND',
        QUASI_EXPERIMENTAL: 'TREND',
        ITS: 'TREND',
        SYSTEMATIC_REVIEW: 'PRISMA',
        SCOPING_REVIEW: 'PRISMA',
        META_ANALYSIS: 'PRISMA',
        THEMATIC_ANALYSIS: 'SRQR',
        GROUNDED_THEORY: 'SRQR',
        PHENOMENOLOGY: 'SRQR',
        CONVERGENT_PARALLEL: 'GRAMMS',
        EXPLANATORY_SEQUENTIAL: 'GRAMMS',
        EXPLORATORY_SEQUENTIAL: 'GRAMMS',
      };

      // Normalize design name for lookup
      const normalizedDesign = primaryDesign
        .toUpperCase()
        .replace(/[- ]/g, '_');

      const mappedGuideline = designMappings[normalizedDesign];
      if (mappedGuideline !== undefined) {
        return mappedGuideline;
      }
    }

    // Default for research projects (QI and HYBRID already returned above)
    return 'STROBE';
  }

  /**
   * Determine the appropriate ethics framework
   */
  private determineEthicsFramework(
    classification: Classification,
    intakeData: IntakeData
  ): string {
    // Use the ethics pathway recommendation from classification prompts
    // Create a minimal classification output for the helper function
    const classificationOutput: ClassificationOutput = {
      classification: classification.project_type,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      suggestedDesigns: classification.suggestedDesigns,
      reportingGuideline: this.determineReportingGuideline(classification),
      ethicsPathwayIndicator: this.inferEthicsPathway(classification, intakeData),
    };

    const pathwayRecommendation = getEthicsPathwayRecommendation(classificationOutput);

    return pathwayRecommendation.pathway;
  }

  /**
   * Infer the ethics pathway indicator
   */
  private inferEthicsPathway(
    classification: Classification,
    intakeData: IntakeData
  ): 'QI_REGISTRATION' | 'LOW_RISK_RESEARCH' | 'FULL_HREC_REVIEW' | 'HYBRID_REVIEW' {
    // QI projects typically use QI registration
    if (classification.project_type === 'QI') {
      return 'QI_REGISTRATION';
    }

    // Hybrid projects need hybrid review
    if (classification.project_type === 'HYBRID') {
      return 'HYBRID_REVIEW';
    }

    // For research, determine based on risk indicators
    const highRiskIndicators = [
      'intervention',
      'drug',
      'device',
      'surgery',
      'invasive',
      'children',
      'pregnant',
      'vulnerable',
      'emergency',
      'consent waiver',
    ];

    const descLower = intakeData.conceptDescription.toLowerCase();
    const populationLower = intakeData.targetPopulation.toLowerCase();

    const hasHighRiskIndicators = highRiskIndicators.some(
      (indicator) =>
        descLower.includes(indicator) || populationLower.includes(indicator)
    );

    if (hasHighRiskIndicators) {
      return 'FULL_HREC_REVIEW';
    }

    // Default to low-risk research for observational studies
    return 'LOW_RISK_RESEARCH';
  }

  /**
   * Determine governance requirements
   */
  private determineGovernanceRequirements(
    classification: Classification,
    intakeData: IntakeData
  ): string[] {
    const requirements: string[] = [];

    // All projects need basic governance
    requirements.push('NHMRC_NATIONAL_STATEMENT');

    // Add QLD-specific requirements
    requirements.push('INFORMATION_PRIVACY_ACT_2009_QLD');

    if (classification.project_type === 'QI') {
      requirements.push('MN_CLINICAL_GOVERNANCE');
    }

    if (classification.project_type === 'RESEARCH' || classification.project_type === 'HYBRID') {
      requirements.push('QH_RESEARCH_GOVERNANCE');
    }

    // Check for patient data handling
    const involvesPatientData =
      intakeData.conceptDescription.toLowerCase().includes('patient data') ||
      intakeData.conceptDescription.toLowerCase().includes('medical record') ||
      intakeData.conceptDescription.toLowerCase().includes('health record');

    if (involvesPatientData) {
      requirements.push('HEALTH_RECORDS_ACT');
      requirements.push('PRIVACY_ACT_1988');
    }

    // Check for grant target requirements
    if (intakeData.grant_target) {
      switch (intakeData.grant_target) {
        case 'EMF_JUMPSTART':
        case 'EMF_LEADING_EDGE':
        case 'EMF_TRANSLATED':
          requirements.push('EMF_GRANT_CONDITIONS');
          break;
        default:
          break;
      }
    }

    return requirements;
  }

  /**
   * Log the intake processing action to audit trail
   */
  private async logIntakeAction(
    project: Project,
    userId: string,
    classification: Classification
  ): Promise<void> {
    const logEntry: LogActionInput = {
      projectId: project.id,
      action: 'INTAKE_PROCESSED',
      actor: userId,
      details: {
        projectTitle: project.intake.projectTitle,
        projectType: classification.project_type,
        confidence: classification.confidence,
        suggestedDesigns: classification.suggestedDesigns,
        reportingGuideline: project.frameworks.reportingGuideline,
        ethicsFramework: project.frameworks.ethicsFramework,
      },
      newState: {
        status: project.status,
        classification: project.classification,
        frameworks: project.frameworks,
      },
    };

    await this.auditRepo.logAction(logEntry);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new IntakeAgent instance with default repositories
 *
 * @returns Configured IntakeAgent instance
 *
 * @example
 * ```typescript
 * const agent = createIntakeAgent();
 * const project = await agent.processIntake(intakeData, userId);
 * ```
 */
export function createIntakeAgent(): IntakeAgent {
  const projectRepo = new ProjectRepository();
  const auditRepo = new AuditRepository();
  return new IntakeAgent(projectRepo, auditRepo);
}

export default IntakeAgent;
