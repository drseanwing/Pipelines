/**
 * QI Research Pipeline - Ethics Agent
 *
 * Stage 4 agent responsible for Ethics & Governance evaluation.
 * Handles ethics pathway determination, risk assessment, consent requirements,
 * data governance planning, site-specific requirements, and governance checklist generation.
 *
 * Based on NHMRC National Statement on Ethical Conduct in Human Research
 * and Queensland Health Research Governance Framework.
 *
 * @module agents/EthicsAgent
 */

import { z } from 'zod';
import {
  // Project types
  Project,
  ProjectStatus,
  MethodologyStageData,
  EthicsStageData,
  // Ethics types
  EthicsPathway,
  EthicsPathwayType,
  EthicsStatus,
  RiskAssessment,
  RiskLevel,
  RiskFactor,
  ConsentSpec,
  ConsentType,
  DataGovernanceSpec,
  DataSensitivity,
  StorageLocation,
  SiteRequirement,
  ChecklistItem,
  GovernanceFramework,
  // Utility functions
  requiresHrecReview,
  determineEthicsPathway as determineEthicsPathwayUtil,
  getEstimatedTimeline,
  getRequiredForms,
  generateDefaultChecklist,
} from '../types/index.js';

import {
  completeWithStructuredOutput,
  LLMError,
} from '../llm/index.js';

import {
  ETHICS_SYSTEM_PROMPT,
  determineEthicsPathwayPrompt,
  assessRiskPrompt,
  determineConsentRequirementsPrompt,
  planDataGovernancePrompt,
  getStandardRetentionPeriod,
  type EthicsPathwayInput,
  type RiskAssessmentInput,
  type DataGovernanceInput,
} from '../llm/prompts/index.js';

import {
  ProjectRepository,
  AuditRepository,
} from '../db/repositories/index.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Error class for Ethics Agent specific errors
 */
export class EthicsAgentError extends Error {
  public readonly code: string;
  public override readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message, { cause });
    this.name = 'EthicsAgentError';
    this.code = code;
  }
}

/**
 * Zod schema for ethics pathway LLM response
 */
const EthicsPathwayResponseSchema = z.object({
  pathway: z.enum(['QI_REGISTRATION', 'LOW_RISK_RESEARCH', 'FULL_HREC_REVIEW', 'HYBRID_REVIEW']),
  approvalBody: z.string(),
  requiresHREC: z.boolean(),
  requiresRGO: z.boolean(),
  estimatedTimeline: z.string(),
  requiredForms: z.array(z.string()),
  justification: z.string(),
  keyConsiderations: z.array(z.string()),
});

/**
 * Zod schema for risk assessment LLM response
 */
const RiskAssessmentResponseSchema = z.object({
  overallLevel: z.enum(['NEGLIGIBLE', 'LOW', 'MODERATE', 'HIGH']),
  factors: z.array(z.object({
    category: z.string(),
    riskLevel: z.enum(['NEGLIGIBLE', 'LOW', 'MODERATE', 'HIGH']),
    description: z.string(),
    mitigation: z.string(),
  })),
  overallJustification: z.string(),
  nationalStatementReference: z.string(),
  riskMinimisationStrategies: z.array(z.string()),
  monitoringRequirements: z.array(z.string()),
});

/**
 * Zod schema for consent requirements LLM response
 */
const ConsentRequirementsResponseSchema = z.object({
  consentType: z.enum(['FULL_WRITTEN', 'SIMPLIFIED', 'OPT_OUT', 'WAIVER', 'THIRD_PARTY']),
  justification: z.string(),
  picfRequirements: z.object({
    required: z.boolean(),
    format: z.string(),
    keyElements: z.array(z.string()),
    readingLevel: z.string(),
  }),
  consentProcess: z.object({
    whoObtains: z.string(),
    when: z.string(),
    howDocumented: z.string(),
    coolingOffPeriod: z.string().optional(),
  }),
  specialConsiderations: z.array(z.object({
    issue: z.string(),
    approach: z.string(),
  })),
  waiverJustification: z.string().optional(),
});

/**
 * Zod schema for data governance LLM response
 */
const DataGovernanceResponseSchema = z.object({
  dataManagementPlan: z.object({
    dataDescription: z.string(),
    collectionMethods: z.array(z.string()),
    storageAndSecurity: z.object({
      location: z.string(),
      accessControls: z.string(),
      encryptionRequirements: z.string(),
      backupProcedures: z.string(),
    }),
    retention: z.object({
      period: z.string(),
      justification: z.string(),
      disposalMethod: z.string(),
    }),
    sharing: z.object({
      plan: z.string(),
      restrictions: z.string(),
      deidentificationMethod: z.string().optional(),
    }),
  }),
  privacyConsiderations: z.array(z.string()),
  regulatoryCompliance: z.array(z.object({
    regulation: z.string(),
    requirements: z.string(),
    complianceApproach: z.string(),
  })),
  dataBreachProtocol: z.string(),
});

// ============================================================================
// Ethics Agent Class
// ============================================================================

/**
 * Ethics Agent for Stage 4 of the QI Research Pipeline
 *
 * Handles ethics pathway determination, risk assessment, consent requirements,
 * data governance planning, and governance checklist generation.
 *
 * @example
 * ```typescript
 * const ethicsAgent = new EthicsAgent(projectRepo, auditRepo);
 *
 * // Evaluate complete ethics requirements
 * const ethicsData = await ethicsAgent.evaluateEthics('project-123');
 *
 * // Or run individual components
 * const pathway = await ethicsAgent.determineEthicsPathway(project, methodology);
 * const risk = await ethicsAgent.assessRisk(project, methodology);
 * const consent = await ethicsAgent.determineConsentRequirements(risk, methodology);
 * ```
 */
export class EthicsAgent {
  private readonly projectRepo: ProjectRepository;
  private readonly auditRepo: AuditRepository;

  /**
   * Create a new EthicsAgent instance
   *
   * @param projectRepo - Repository for project data operations
   * @param auditRepo - Repository for audit logging
   */
  constructor(projectRepo: ProjectRepository, auditRepo: AuditRepository) {
    this.projectRepo = projectRepo;
    this.auditRepo = auditRepo;
  }

  // ============================================================================
  // Main Evaluation Method
  // ============================================================================

  /**
   * Evaluate complete ethics and governance requirements for a project
   *
   * This is the main entry point for Stage 4 processing. It orchestrates
   * all ethics evaluation components and updates the project record.
   *
   * @param projectId - Project ID to evaluate
   * @returns Complete ethics stage data
   * @throws EthicsAgentError if project not found or methodology incomplete
   */
  async evaluateEthics(projectId: string): Promise<EthicsStageData> {
    // Fetch the project
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new EthicsAgentError(
        `Project not found: ${projectId}`,
        'PROJECT_NOT_FOUND'
      );
    }

    // Verify methodology is complete
    if (!project.methodology) {
      throw new EthicsAgentError(
        'Methodology stage must be completed before ethics evaluation',
        'METHODOLOGY_INCOMPLETE'
      );
    }

    // Log the start of ethics evaluation
    await this.auditRepo.logAction({
      projectId,
      action: 'ETHICS_EVALUATION_STARTED',
      details: {
        projectType: project.classification.projectType,
        studyDesign: project.methodology.studyDesign.type,
      },
    });

    try {
      // Step 1: Determine ethics pathway
      const ethicsPathway = await this.determineEthicsPathway(project, project.methodology);

      // Step 2: Conduct risk assessment
      const riskAssessment = await this.assessRisk(project, project.methodology);

      // Step 3: Determine consent requirements based on risk
      const consentRequirements = await this.determineConsentRequirements(
        riskAssessment,
        project.methodology
      );

      // Step 4: Plan data governance
      const dataGovernance = await this.planDataGovernance(project.methodology);

      // Step 5: Identify site-specific requirements
      const siteRequirements = await this.identifySiteRequirements(
        project,
        project.methodology,
        ethicsPathway
      );

      // Step 6: Generate governance checklist
      const governanceChecklist = await this.generateGovernanceChecklist(ethicsPathway);

      // Assemble ethics stage data
      const ethicsStageData: EthicsStageData = {
        ethicsPathway,
        riskAssessment,
        consentRequirements,
        dataGovernance,
        siteRequirements,
        governanceChecklist,
      };

      // Update project with ethics data
      await this.projectRepo.updateStageData(projectId, 'ethics', ethicsStageData);

      // Update project status
      await this.projectRepo.updateStatus(projectId, ProjectStatus.ETHICS_COMPLETE);

      // Log successful completion
      await this.auditRepo.logAction({
        projectId,
        action: 'ETHICS_EVALUATION_COMPLETED',
        details: {
          pathway: ethicsPathway.pathway,
          riskLevel: riskAssessment.level,
          consentType: consentRequirements.type,
          siteCount: siteRequirements.length,
          checklistItems: governanceChecklist.length,
        },
      });

      return ethicsStageData;
    } catch (error) {
      // Log failure
      await this.auditRepo.logAction({
        projectId,
        action: 'ETHICS_EVALUATION_FAILED',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (error instanceof EthicsAgentError) {
        throw error;
      }

      throw new EthicsAgentError(
        `Ethics evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EVALUATION_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ============================================================================
  // Ethics Pathway Determination
  // ============================================================================

  /**
   * Determine the appropriate ethics approval pathway
   *
   * Analyzes project characteristics to determine whether QI registration,
   * low-risk research, full HREC review, or hybrid review is required.
   *
   * @param project - Project to evaluate
   * @param methodology - Methodology stage data
   * @returns Ethics pathway specification
   */
  async determineEthicsPathway(
    project: Project,
    methodology: MethodologyStageData
  ): Promise<EthicsPathway> {
    // Build input for LLM prompt
    const pathwayInput: EthicsPathwayInput = {
      projectType: project.classification.projectType as 'QI' | 'RESEARCH' | 'HYBRID',
      involvesHumanParticipants: this.involvesHumanParticipants(methodology),
      involvesPatientData: this.involvesPatientData(methodology),
      dataIsIdentifiable: methodology.dataCollection.includesIdentifiableData,
      isMultisite: methodology.settingSites.length > 1,
      institution: project.intake.principalInvestigator.institution,
      interventionDescription: methodology.procedures.interventionDetails,
      dataCollectionMethods: methodology.dataCollection.methods,
    };

    try {
      // Generate the prompt
      const prompt = determineEthicsPathwayPrompt(pathwayInput);

      // Call LLM with structured output
      const response = await completeWithStructuredOutput(
        prompt,
        EthicsPathwayResponseSchema,
        {
          system: ETHICS_SYSTEM_PROMPT,
          temperature: 0.3,
        }
      );

      // Map LLM response to EthicsPathway interface
      const pathway: EthicsPathway = {
        pathway: response.pathway as EthicsPathwayType,
        approvalBody: response.approvalBody,
        requiresHrec: response.requiresHREC,
        requiresRgo: response.requiresRGO,
        estimatedTimeline: response.estimatedTimeline,
        forms: response.requiredForms,
        status: EthicsStatus.NOT_STARTED,
      };

      return pathway;
    } catch (error) {
      // Fallback to rule-based determination if LLM fails
      if (error instanceof LLMError) {
        console.warn('LLM error in pathway determination, using fallback:', error.message);
        return this.fallbackPathwayDetermination(project, methodology);
      }
      throw error;
    }
  }

  /**
   * Fallback rule-based pathway determination
   */
  private fallbackPathwayDetermination(
    project: Project,
    methodology: MethodologyStageData
  ): EthicsPathway {
    const isMultiSite = methodology.settingSites.length > 1;
    const hasVulnerablePopulation = methodology.participants.vulnerablePopulation;

    // Use utility function for basic pathway determination
    const pathwayType = determineEthicsPathwayUtil({
      projectType: project.classification.projectType,
      riskLevel: hasVulnerablePopulation ? RiskLevel.MODERATE : RiskLevel.LOW,
      involvesHumanParticipants: this.involvesHumanParticipants(methodology),
      involvesPatientData: this.involvesPatientData(methodology),
      isMultiSite,
    });

    return {
      pathway: pathwayType,
      approvalBody: this.getApprovalBody(pathwayType, project.intake.principalInvestigator.institution),
      requiresHrec: requiresHrecReview(
        hasVulnerablePopulation ? RiskLevel.MODERATE : RiskLevel.LOW,
        project.classification.projectType
      ),
      requiresRgo: pathwayType !== 'QI_REGISTRATION',
      estimatedTimeline: getEstimatedTimeline(pathwayType),
      forms: getRequiredForms(pathwayType),
      status: EthicsStatus.NOT_STARTED,
    };
  }

  /**
   * Get the appropriate approval body for the pathway
   */
  private getApprovalBody(pathway: EthicsPathwayType, institution: string): string {
    const approvalBodies: Record<EthicsPathwayType, string> = {
      QI_REGISTRATION: `${institution} Quality and Safety Unit`,
      LOW_RISK_RESEARCH: `${institution} Low and Negligible Risk Committee`,
      FULL_HREC_REVIEW: 'Metro North Human Research Ethics Committee',
      HYBRID_REVIEW: 'Metro North Human Research Ethics Committee',
    };
    return approvalBodies[pathway];
  }

  // ============================================================================
  // Risk Assessment
  // ============================================================================

  /**
   * Conduct a formal risk assessment per NHMRC National Statement
   *
   * Evaluates physical, psychological, social, economic, and privacy risks
   * associated with the project methodology.
   *
   * @param project - Project to assess
   * @param methodology - Methodology stage data
   * @returns Risk assessment with factors and mitigations
   */
  async assessRisk(
    project: Project,
    methodology: MethodologyStageData
  ): Promise<RiskAssessment> {
    // Build input for LLM prompt
    const riskInput: RiskAssessmentInput = {
      methodology: {
        studyType: methodology.studyDesign.type,
        interventionDescription: methodology.procedures.interventionDetails,
        dataCollectionMethods: methodology.dataCollection.methods,
        proceduresDescription: methodology.procedures.description,
      },
      participants: {
        population: project.intake.targetPopulation,
        vulnerableGroups: methodology.participants.vulnerablePopulation,
        vulnerabilityDetails: methodology.participants.vulnerabilityDetails,
        capacityIssues: methodology.participants.capacityIssues,
      },
      dataHandling: {
        dataTypes: methodology.dataCollection.dataTypes,
        includesIdentifiableData: methodology.dataCollection.includesIdentifiableData,
        dataSensitivity: this.determineSensitivity(methodology),
        storageMethod: methodology.dataCollection.instruments.join(', '),
      },
    };

    try {
      // Generate the prompt
      const prompt = assessRiskPrompt(riskInput);

      // Call LLM with structured output
      const response = await completeWithStructuredOutput(
        prompt,
        RiskAssessmentResponseSchema,
        {
          system: ETHICS_SYSTEM_PROMPT,
          temperature: 0.3,
        }
      );

      // Map LLM response to RiskAssessment interface
      const factors: RiskFactor[] = response.factors.map(f => ({
        category: f.category,
        description: f.description,
        riskLevel: f.riskLevel as RiskLevel,
        mitigation: f.mitigation,
      }));

      const riskAssessment: RiskAssessment = {
        level: response.overallLevel as RiskLevel,
        factors,
        overallJustification: response.overallJustification,
        nationalStatementReference: response.nationalStatementReference,
        benefitRiskBalance: `Risk minimisation strategies: ${response.riskMinimisationStrategies.join('; ')}`,
        monitoringPlan: response.monitoringRequirements.join('; '),
      };

      return riskAssessment;
    } catch (error) {
      if (error instanceof LLMError) {
        console.warn('LLM error in risk assessment, using fallback:', error.message);
        return this.fallbackRiskAssessment(project, methodology);
      }
      throw error;
    }
  }

  /**
   * Fallback rule-based risk assessment
   */
  private fallbackRiskAssessment(
    project: Project,
    methodology: MethodologyStageData
  ): RiskAssessment {
    const factors: RiskFactor[] = [];

    // Physical risk assessment
    const hasIntervention = !!methodology.procedures.interventionDetails;
    factors.push({
      category: 'Physical',
      description: hasIntervention
        ? 'Study involves intervention that may have physical effects'
        : 'No physical intervention - observational study only',
      riskLevel: hasIntervention ? RiskLevel.LOW : RiskLevel.NEGLIGIBLE,
      mitigation: hasIntervention
        ? 'Standardized procedures with trained staff and emergency protocols'
        : 'N/A - no physical intervention',
    });

    // Psychological risk assessment
    factors.push({
      category: 'Psychological',
      description: 'Potential for emotional response to study procedures',
      riskLevel: methodology.participants.vulnerablePopulation ? RiskLevel.LOW : RiskLevel.NEGLIGIBLE,
      mitigation: 'Support resources available; participants can withdraw at any time',
    });

    // Privacy risk assessment
    factors.push({
      category: 'Privacy',
      description: methodology.dataCollection.includesIdentifiableData
        ? 'Collection and storage of identifiable participant data'
        : 'Collection of de-identified or aggregate data only',
      riskLevel: methodology.dataCollection.includesIdentifiableData ? RiskLevel.LOW : RiskLevel.NEGLIGIBLE,
      mitigation: 'Data encryption, access controls, and secure storage protocols',
    });

    // Determine overall risk level
    const riskLevels = factors.map(f => f.riskLevel);
    let overallLevel: RiskLevel;
    if (riskLevels.includes(RiskLevel.HIGH)) {
      overallLevel = RiskLevel.HIGH;
    } else if (riskLevels.includes(RiskLevel.MODERATE)) {
      overallLevel = RiskLevel.MODERATE;
    } else if (riskLevels.includes(RiskLevel.LOW)) {
      overallLevel = RiskLevel.LOW;
    } else {
      overallLevel = RiskLevel.NEGLIGIBLE;
    }

    return {
      level: overallLevel,
      factors,
      overallJustification: `Based on assessment of ${factors.length} risk categories, the overall risk level is ${overallLevel.toLowerCase()}.`,
      nationalStatementReference: 'National Statement Chapter 2.1',
      benefitRiskBalance: 'Benefits of the research are expected to outweigh the identified risks.',
      monitoringPlan: 'Regular review of adverse events and protocol deviations.',
    };
  }

  // ============================================================================
  // Consent Requirements
  // ============================================================================

  /**
   * Determine consent requirements based on risk assessment and methodology
   *
   * Evaluates the appropriate consent type and process based on
   * NHMRC National Statement guidelines.
   *
   * @param riskAssessment - Completed risk assessment
   * @param methodology - Methodology stage data
   * @returns Consent specification
   */
  async determineConsentRequirements(
    riskAssessment: RiskAssessment,
    methodology: MethodologyStageData
  ): Promise<ConsentSpec> {
    // Build input for LLM prompt
    const consentInput = {
      riskLevel: riskAssessment.level,
      participantPopulation: methodology.participants.recruitmentStrategy.method,
      capacityIssues: methodology.participants.capacityIssues,
      dataUse: methodology.dataCollection.dataTypes.join(', '),
      interventionType: methodology.procedures.interventionDetails,
    };

    try {
      // Generate the prompt
      const prompt = determineConsentRequirementsPrompt(consentInput);

      // Call LLM with structured output
      const response = await completeWithStructuredOutput(
        prompt,
        ConsentRequirementsResponseSchema,
        {
          system: ETHICS_SYSTEM_PROMPT,
          temperature: 0.3,
        }
      );

      // Map consent type from LLM response to ConsentType
      const consentTypeMap: Record<string, ConsentType> = {
        'FULL_WRITTEN': ConsentType.WRITTEN_CONSENT,
        'SIMPLIFIED': ConsentType.VERBAL_CONSENT,
        'OPT_OUT': ConsentType.OPT_OUT,
        'WAIVER': ConsentType.WAIVER,
        'THIRD_PARTY': ConsentType.WRITTEN_CONSENT,
      };

      const consentSpec: ConsentSpec = {
        type: consentTypeMap[response.consentType] || ConsentType.WRITTEN_CONSENT,
        justification: response.justification,
        processDescription: `${response.consentProcess.whoObtains} will obtain consent ${response.consentProcess.when}. ${response.consentProcess.howDocumented}`,
        capacityAssessment: methodology.participants.capacityIssues
          ? 'Formal capacity assessment will be conducted prior to consent'
          : undefined,
        proxyConsent: response.consentType === 'THIRD_PARTY'
          ? {
              required: true,
              relationship: 'Legally authorized representative',
              process: 'Consent obtained from substitute decision-maker',
            }
          : undefined,
        withdrawalProcess: 'Participants may withdraw at any time without giving a reason and without any adverse consequences.',
        informationProvided: response.picfRequirements.keyElements,
        documentVersion: response.picfRequirements.required
          ? `PICF v1.0 (${response.picfRequirements.format})`
          : undefined,
        languageRequirements: ['English'],
      };

      return consentSpec;
    } catch (error) {
      if (error instanceof LLMError) {
        console.warn('LLM error in consent determination, using fallback:', error.message);
        return this.fallbackConsentRequirements(riskAssessment, methodology);
      }
      throw error;
    }
  }

  /**
   * Fallback rule-based consent determination
   */
  private fallbackConsentRequirements(
    riskAssessment: RiskAssessment,
    methodology: MethodologyStageData
  ): ConsentSpec {
    // Determine consent type based on risk level and methodology
    let consentType: ConsentType;
    let justification: string;

    if (riskAssessment.level === RiskLevel.NEGLIGIBLE && !methodology.dataCollection.includesIdentifiableData) {
      consentType = ConsentType.WAIVER;
      justification = 'Research involves negligible risk and uses non-identifiable data only.';
    } else if (riskAssessment.level === RiskLevel.LOW) {
      consentType = ConsentType.OPT_OUT;
      justification = 'Low risk research where opt-out consent is appropriate and obtaining explicit consent is impracticable.';
    } else {
      consentType = ConsentType.WRITTEN_CONSENT;
      justification = 'Research involves more than low risk or requires identifiable data collection.';
    }

    return {
      type: consentType,
      justification,
      processDescription: consentType === ConsentType.WRITTEN_CONSENT
        ? 'Written informed consent will be obtained by a member of the research team prior to any study procedures.'
        : consentType === ConsentType.OPT_OUT
        ? 'Participants will be provided with information about the study and given the opportunity to opt-out.'
        : 'Waiver of consent has been approved based on the nature of the research.',
      capacityAssessment: methodology.participants.capacityIssues
        ? 'Capacity assessment will be conducted using standardized tools.'
        : undefined,
      withdrawalProcess: 'Participants may withdraw at any time without penalty.',
      informationProvided: [
        'Study purpose and procedures',
        'Risks and benefits',
        'Voluntary participation',
        'Confidentiality measures',
        'Contact information for questions',
      ],
    };
  }

  // ============================================================================
  // Data Governance
  // ============================================================================

  /**
   * Plan data governance including storage, security, retention, and disposal
   *
   * Creates a comprehensive data management plan addressing regulatory
   * requirements including Privacy Act 1988 and Queensland Health policies.
   *
   * @param methodology - Methodology stage data
   * @returns Data governance specification
   */
  async planDataGovernance(methodology: MethodologyStageData): Promise<DataGovernanceSpec> {
    // Build input for LLM prompt
    const governanceInput: DataGovernanceInput = {
      dataTypes: methodology.dataCollection.dataTypes,
      includesIdentifiableData: methodology.dataCollection.includesIdentifiableData,
      storageLocation: methodology.dataCollection.instruments[0] || 'Institutional secure storage',
      accessRequirements: 'Research team only',
      retentionRequirements: getStandardRetentionPeriod(
        methodology.studyDesign.type,
        methodology.participants.vulnerablePopulation
      ).period,
      institution: 'Metro North Health',
    };

    try {
      // Generate the prompt
      const prompt = planDataGovernancePrompt(governanceInput);

      // Call LLM with structured output
      const response = await completeWithStructuredOutput(
        prompt,
        DataGovernanceResponseSchema,
        {
          system: ETHICS_SYSTEM_PROMPT,
          temperature: 0.3,
        }
      );

      // Determine sensitivity level
      const sensitivity = this.mapSensitivity(methodology);

      // Determine storage location
      const storageLocation = this.mapStorageLocation(response.dataManagementPlan.storageAndSecurity.location);

      const dataGovernance: DataGovernanceSpec = {
        dataTypes: methodology.dataCollection.dataTypes,
        sensitivity,
        storageLocation,
        storageDetails: response.dataManagementPlan.storageAndSecurity.location,
        accessControls: [
          response.dataManagementPlan.storageAndSecurity.accessControls,
          ...response.privacyConsiderations,
        ],
        encryptionMethods: response.dataManagementPlan.storageAndSecurity.encryptionRequirements,
        retentionPeriod: response.dataManagementPlan.retention.period,
        disposalMethod: response.dataManagementPlan.retention.disposalMethod,
        transferRequirements: response.dataManagementPlan.sharing.restrictions,
        breachResponsePlan: response.dataBreachProtocol,
        dataSharing: {
          planned: response.dataManagementPlan.sharing.plan !== 'No data sharing planned',
          recipients: response.dataManagementPlan.sharing.plan !== 'No data sharing planned'
            ? ['As specified in data sharing agreements']
            : undefined,
          agreements: response.dataManagementPlan.sharing.plan !== 'No data sharing planned'
            ? ['Data Transfer Agreement required']
            : undefined,
        },
        fullText: this.generateDataManagementPlanText(response),
      };

      return dataGovernance;
    } catch (error) {
      if (error instanceof LLMError) {
        console.warn('LLM error in data governance planning, using fallback:', error.message);
        return this.fallbackDataGovernance(methodology);
      }
      throw error;
    }
  }

  /**
   * Fallback rule-based data governance plan
   */
  private fallbackDataGovernance(methodology: MethodologyStageData): DataGovernanceSpec {
    const sensitivity = this.mapSensitivity(methodology);
    const retentionInfo = getStandardRetentionPeriod(
      methodology.studyDesign.type,
      methodology.participants.vulnerablePopulation
    );

    return {
      dataTypes: methodology.dataCollection.dataTypes,
      sensitivity,
      storageLocation: StorageLocation.ON_PREMISES,
      storageDetails: 'Institutional secure research drive with role-based access',
      accessControls: [
        'Password-protected database',
        'Role-based access control',
        'Audit logging enabled',
        'Multi-factor authentication required',
      ],
      encryptionMethods: 'AES-256 encryption at rest and TLS 1.3 in transit',
      retentionPeriod: retentionInfo.period,
      disposalMethod: 'Secure deletion with certificate of destruction',
      breachResponsePlan: 'Immediate notification to Privacy Officer and HREC within 24 hours of breach identification',
      dataSharing: {
        planned: false,
      },
    };
  }

  /**
   * Generate full text data management plan from LLM response
   */
  private generateDataManagementPlanText(response: z.infer<typeof DataGovernanceResponseSchema>): string {
    return `
DATA MANAGEMENT PLAN

1. DATA DESCRIPTION
${response.dataManagementPlan.dataDescription}

2. DATA COLLECTION
Methods: ${response.dataManagementPlan.collectionMethods.join(', ')}

3. STORAGE AND SECURITY
Location: ${response.dataManagementPlan.storageAndSecurity.location}
Access Controls: ${response.dataManagementPlan.storageAndSecurity.accessControls}
Encryption: ${response.dataManagementPlan.storageAndSecurity.encryptionRequirements}
Backup: ${response.dataManagementPlan.storageAndSecurity.backupProcedures}

4. DATA RETENTION AND DISPOSAL
Retention Period: ${response.dataManagementPlan.retention.period}
Justification: ${response.dataManagementPlan.retention.justification}
Disposal Method: ${response.dataManagementPlan.retention.disposalMethod}

5. DATA SHARING
Plan: ${response.dataManagementPlan.sharing.plan}
Restrictions: ${response.dataManagementPlan.sharing.restrictions}

6. REGULATORY COMPLIANCE
${response.regulatoryCompliance.map(r => `- ${r.regulation}: ${r.complianceApproach}`).join('\n')}

7. DATA BREACH PROTOCOL
${response.dataBreachProtocol}
    `.trim();
  }

  // ============================================================================
  // Site Requirements
  // ============================================================================

  /**
   * Identify site-specific ethics and governance requirements
   *
   * @param project - Project being evaluated
   * @param methodology - Methodology stage data
   * @param pathway - Determined ethics pathway
   * @returns Array of site-specific requirements
   */
  async identifySiteRequirements(
    project: Project,
    methodology: MethodologyStageData,
    pathway: EthicsPathway
  ): Promise<SiteRequirement[]> {
    const siteRequirements: SiteRequirement[] = [];

    for (const site of methodology.settingSites) {
      const requirement: SiteRequirement = {
        siteId: site.id,
        siteName: site.name,
        requiresLocalApproval: pathway.pathway !== 'QI_REGISTRATION',
        approvalBody: pathway.pathway !== 'QI_REGISTRATION'
          ? `${site.institution} Research Governance Office`
          : undefined,
        additionalForms: this.getSiteSpecificForms(pathway.pathway, site.institution),
        siteSpecificConsiderations: this.getSiteConsiderations(site, methodology),
        status: EthicsStatus.NOT_STARTED,
      };

      siteRequirements.push(requirement);
    }

    return siteRequirements;
  }

  /**
   * Get site-specific forms required
   */
  private getSiteSpecificForms(pathway: EthicsPathwayType, _institution: string): string[] {
    const baseForms = ['Site-Specific Assessment (SSA) Form'];

    if (pathway === 'FULL_HREC_REVIEW' || pathway === 'HYBRID_REVIEW') {
      baseForms.push('Local Research Agreement');
      baseForms.push('Resource Impact Statement');
    }

    return baseForms;
  }

  /**
   * Get site-specific considerations
   */
  private getSiteConsiderations(
    site: { id: string; name: string; institution: string; department: string },
    methodology: MethodologyStageData
  ): string[] {
    const considerations: string[] = [];

    considerations.push(`Local investigator: Confirm site investigator availability`);
    considerations.push(`Resources: Verify availability of required equipment and facilities`);

    if (methodology.participants.recruitmentStrategy.sites.length > 1) {
      considerations.push('Multi-site coordination: Establish communication protocols');
    }

    return considerations;
  }

  // ============================================================================
  // Governance Checklist
  // ============================================================================

  /**
   * Generate a comprehensive governance compliance checklist
   *
   * Creates a checklist of all items required for governance compliance
   * based on the ethics pathway and applicable frameworks.
   *
   * @param pathway - Determined ethics pathway
   * @returns Array of checklist items
   */
  async generateGovernanceChecklist(pathway: EthicsPathway): Promise<ChecklistItem[]> {
    // Get applicable frameworks based on pathway
    const frameworks: GovernanceFramework[] = [
      GovernanceFramework.NHMRC_NATIONAL_STATEMENT,
    ];

    if (pathway.requiresRgo) {
      frameworks.push(GovernanceFramework.QH_RESEARCH_GOVERNANCE);
    }

    if (pathway.requiresHrec) {
      frameworks.push(GovernanceFramework.PRIVACY_ACT_1988);
    }

    // Generate default checklist based on frameworks
    const baseChecklist = generateDefaultChecklist(frameworks);

    // Add pathway-specific items
    const pathwayItems = this.getPathwaySpecificItems(pathway);

    // Combine and deduplicate
    const allItems = [...baseChecklist, ...pathwayItems];

    // Add required forms as checklist items
    const formItems = pathway.forms.map((form, index) => ({
      id: `FORM-${index + 1}`,
      category: 'Forms',
      requirement: form,
      description: `Complete and submit ${form}`,
      completed: false,
      framework: GovernanceFramework.QH_RESEARCH_GOVERNANCE,
    }));

    return [...allItems, ...formItems];
  }

  /**
   * Get pathway-specific checklist items
   */
  private getPathwaySpecificItems(pathway: EthicsPathway): ChecklistItem[] {
    const items: ChecklistItem[] = [];
    let itemId = 100;

    switch (pathway.pathway) {
      case 'QI_REGISTRATION':
        items.push({
          id: `GC-${itemId++}`,
          category: 'QI Registration',
          requirement: 'Unit Director Approval',
          description: 'Obtain written approval from Unit Director',
          completed: false,
          framework: GovernanceFramework.MN_CLINICAL_GOVERNANCE,
        });
        break;

      case 'LOW_RISK_RESEARCH':
        items.push({
          id: `GC-${itemId++}`,
          category: 'LNR Application',
          requirement: 'LNR Committee Submission',
          description: 'Submit application to Low and Negligible Risk Committee',
          completed: false,
          framework: GovernanceFramework.NHMRC_NATIONAL_STATEMENT,
        });
        items.push({
          id: `GC-${itemId++}`,
          category: 'Governance',
          requirement: 'RGO Review',
          description: 'Complete Research Governance Office review process',
          completed: false,
          framework: GovernanceFramework.QH_RESEARCH_GOVERNANCE,
        });
        break;

      case 'FULL_HREC_REVIEW':
        items.push({
          id: `GC-${itemId++}`,
          category: 'HREC Application',
          requirement: 'HREC Submission',
          description: 'Submit full application to Human Research Ethics Committee',
          completed: false,
          framework: GovernanceFramework.NHMRC_NATIONAL_STATEMENT,
        });
        items.push({
          id: `GC-${itemId++}`,
          category: 'PICF',
          requirement: 'Participant Information and Consent Form',
          description: 'Develop PICF following institutional template',
          completed: false,
          framework: GovernanceFramework.NHMRC_NATIONAL_STATEMENT,
        });
        items.push({
          id: `GC-${itemId++}`,
          category: 'Insurance',
          requirement: 'Insurance Confirmation',
          description: 'Confirm appropriate insurance coverage for research activities',
          completed: false,
        });
        break;

      case 'HYBRID_REVIEW':
        items.push({
          id: `GC-${itemId++}`,
          category: 'Dual Pathway',
          requirement: 'QI Registration',
          description: 'Complete QI project registration for improvement component',
          completed: false,
          framework: GovernanceFramework.MN_CLINICAL_GOVERNANCE,
        });
        items.push({
          id: `GC-${itemId++}`,
          category: 'Dual Pathway',
          requirement: 'Research Ethics Approval',
          description: 'Obtain ethics approval for research component',
          completed: false,
          framework: GovernanceFramework.NHMRC_NATIONAL_STATEMENT,
        });
        break;
    }

    return items;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Check if methodology involves human participants
   */
  private involvesHumanParticipants(methodology: MethodologyStageData): boolean {
    return methodology.participants.inclusionCriteria.length > 0;
  }

  /**
   * Check if methodology involves patient data
   */
  private involvesPatientData(methodology: MethodologyStageData): boolean {
    const patientDataTypes = ['clinical', 'health', 'medical', 'patient'];
    return methodology.dataCollection.dataTypes.some(
      type => patientDataTypes.some(p => type.toLowerCase().includes(p))
    );
  }

  /**
   * Determine data sensitivity level
   */
  private determineSensitivity(methodology: MethodologyStageData): string {
    if (methodology.dataCollection.includesIdentifiableData) {
      return 'HIGHLY_SENSITIVE';
    }
    if (this.involvesPatientData(methodology)) {
      return 'SENSITIVE';
    }
    return 'INTERNAL';
  }

  /**
   * Map sensitivity string to DataSensitivity enum
   */
  private mapSensitivity(methodology: MethodologyStageData): DataSensitivity {
    if (methodology.dataCollection.includesIdentifiableData) {
      return DataSensitivity.HIGHLY_SENSITIVE;
    }
    if (this.involvesPatientData(methodology)) {
      return DataSensitivity.SENSITIVE;
    }
    return DataSensitivity.INTERNAL;
  }

  /**
   * Map storage location string to StorageLocation enum
   */
  private mapStorageLocation(location: string): StorageLocation {
    const locationLower = location.toLowerCase();
    if (locationLower.includes('cloud') && locationLower.includes('au')) {
      return StorageLocation.CLOUD_AU;
    }
    if (locationLower.includes('cloud')) {
      return StorageLocation.CLOUD_INTERNATIONAL;
    }
    if (locationLower.includes('hybrid')) {
      return StorageLocation.HYBRID;
    }
    return StorageLocation.ON_PREMISES;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new EthicsAgent instance with default repositories
 *
 * @returns Configured EthicsAgent instance
 */
export function createEthicsAgent(): EthicsAgent {
  const projectRepo = new ProjectRepository();
  const auditRepo = new AuditRepository();
  return new EthicsAgent(projectRepo, auditRepo);
}

// ============================================================================
// Exports
// ============================================================================

export default EthicsAgent;
