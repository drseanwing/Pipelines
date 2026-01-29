/**
 * IntakeAgent Test Suite
 *
 * Tests for the IntakeAgent which handles:
 * - Intake data validation
 * - Project classification (QI vs Research vs Hybrid)
 * - Framework determination (reporting guidelines, ethics pathways)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockIntakeData,
  createMockInvestigator,
  createMockClassification,
  createMockFrameworks,
} from '../fixtures/mockProject.js';
import {
  mockAnthropicClient,
  createMockLLMResponse,
} from '../setup.js';
import type {
  IntakeData,
  Classification,
  Frameworks,
  ProjectType,
} from '../../src/types/index.js';

// ============================================================================
// Mock IntakeAgent Implementation (for testing purposes)
// In actual implementation, this would be imported from src/agents/IntakeAgent
// ============================================================================

/**
 * Mock IntakeAgent class for testing
 * This simulates the expected behavior of the actual IntakeAgent
 */
class IntakeAgent {
  private llmClient: typeof mockAnthropicClient;

  constructor(llmClient: typeof mockAnthropicClient) {
    this.llmClient = llmClient;
  }

  /**
   * Validate intake data structure and required fields
   */
  async validateIntake(data: unknown): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const intake = data as Partial<IntakeData>;

    // Required field validation
    if (!intake.projectTitle || intake.projectTitle.length < 10) {
      errors.push('Project title is required and must be at least 10 characters');
    }

    if (!intake.conceptDescription || intake.conceptDescription.length < 500) {
      errors.push('Concept description must be at least 500 characters');
    }

    if (intake.conceptDescription && intake.conceptDescription.length > 2000) {
      errors.push('Concept description must not exceed 2000 characters');
    }

    if (!intake.clinicalProblem) {
      errors.push('Clinical problem is required');
    }

    if (!intake.targetPopulation) {
      errors.push('Target population is required');
    }

    if (!intake.setting) {
      errors.push('Setting is required');
    }

    if (!intake.principalInvestigator) {
      errors.push('Principal investigator is required');
    } else {
      if (!intake.principalInvestigator.email?.includes('@')) {
        errors.push('Principal investigator must have a valid email');
      }
    }

    if (!intake.intendedOutcomes) {
      errors.push('Intended outcomes are required');
    }

    // Warnings for optional but recommended fields
    if (!intake.grantTarget) {
      warnings.push('No grant target specified - framework determination may be limited');
    }

    if (!intake.timelineConstraint?.submissionDeadline) {
      warnings.push('No submission deadline specified');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Classify project as QI, Research, or Hybrid using LLM
   */
  async classifyProject(intake: IntakeData): Promise<Classification> {
    const response = await this.llmClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Classify this project based on the following intake data:\n\n${JSON.stringify(intake, null, 2)}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    try {
      return JSON.parse(content.text) as Classification;
    } catch {
      throw new Error('Failed to parse classification response');
    }
  }

  /**
   * Determine applicable frameworks based on classification
   */
  async determineFrameworks(
    intake: IntakeData,
    classification: Classification
  ): Promise<Frameworks> {
    // Determine reporting guideline based on project type and suggested designs
    let reportingGuideline = 'STROBE'; // default

    if (classification.projectType === 'QI') {
      reportingGuideline = 'SQUIRE';
    } else if (classification.suggestedDesigns.includes('RCT') ||
               classification.suggestedDesigns.includes('CLUSTER_RCT') ||
               classification.suggestedDesigns.includes('STEPPED_WEDGE')) {
      reportingGuideline = 'CONSORT';
    } else if (classification.suggestedDesigns.includes('SYSTEMATIC_REVIEW')) {
      reportingGuideline = 'PRISMA';
    } else if (classification.suggestedDesigns.includes('COHORT') ||
               classification.suggestedDesigns.includes('CASE_CONTROL')) {
      reportingGuideline = 'STROBE';
    }

    // Determine ethics framework
    let ethicsFramework = 'NHMRC_NATIONAL_STATEMENT';
    if (classification.projectType === 'QI') {
      ethicsFramework = 'QI_REGISTRATION';
    } else if (classification.projectType === 'HYBRID') {
      ethicsFramework = 'HYBRID_REVIEW';
    }

    // Determine governance requirements
    const governanceRequirements = ['MN_CLINICAL_GOVERNANCE'];

    if (classification.projectType === 'RESEARCH' ||
        classification.projectType === 'HYBRID') {
      governanceRequirements.push('QH_RESEARCH_GOVERNANCE');
    }

    // Add privacy requirements based on data collection
    governanceRequirements.push('PRIVACY_ACT_1988');

    if (intake.setting?.toLowerCase().includes('queensland') ||
        intake.setting?.toLowerCase().includes('qld')) {
      governanceRequirements.push('INFORMATION_PRIVACY_ACT_2009_QLD');
    }

    return {
      reportingGuideline,
      ethicsFramework,
      governanceRequirements,
    };
  }

  /**
   * Process complete intake workflow
   */
  async processIntake(data: unknown): Promise<{
    intake: IntakeData;
    classification: Classification;
    frameworks: Frameworks;
    validation: { isValid: boolean; errors: string[]; warnings: string[] };
  }> {
    // Validate intake
    const validation = await this.validateIntake(data);
    if (!validation.isValid) {
      throw new Error(`Intake validation failed: ${validation.errors.join(', ')}`);
    }

    const intake = data as IntakeData;

    // Classify project
    const classification = await this.classifyProject(intake);

    // Determine frameworks
    const frameworks = await this.determineFrameworks(intake, classification);

    return {
      intake,
      classification,
      frameworks,
      validation,
    };
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('IntakeAgent', () => {
  let agent: IntakeAgent;

  beforeEach(() => {
    agent = new IntakeAgent(mockAnthropicClient);
  });

  // ==========================================================================
  // Intake Validation Tests
  // ==========================================================================

  describe('validateIntake', () => {
    it('should validate a complete intake data object', async () => {
      const intakeData = createMockIntakeData();

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject intake with missing project title', async () => {
      const intakeData = createMockIntakeData({ projectTitle: '' });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Project title is required and must be at least 10 characters'
      );
    });

    it('should reject intake with short project title', async () => {
      const intakeData = createMockIntakeData({ projectTitle: 'Short' });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Project title is required and must be at least 10 characters'
      );
    });

    it('should reject intake with concept description under 500 characters', async () => {
      const intakeData = createMockIntakeData({
        conceptDescription: 'This is a short description.',
      });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Concept description must be at least 500 characters'
      );
    });

    it('should reject intake with concept description over 2000 characters', async () => {
      const longDescription = 'A'.repeat(2001);
      const intakeData = createMockIntakeData({
        conceptDescription: longDescription,
      });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Concept description must not exceed 2000 characters'
      );
    });

    it('should reject intake with missing clinical problem', async () => {
      const intakeData = createMockIntakeData({ clinicalProblem: '' });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clinical problem is required');
    });

    it('should reject intake with missing target population', async () => {
      const intakeData = createMockIntakeData({ targetPopulation: '' });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Target population is required');
    });

    it('should reject intake with missing setting', async () => {
      const intakeData = createMockIntakeData({ setting: '' });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Setting is required');
    });

    it('should reject intake with invalid PI email', async () => {
      const intakeData = createMockIntakeData({
        principalInvestigator: createMockInvestigator({ email: 'invalid-email' }),
      });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Principal investigator must have a valid email'
      );
    });

    it('should reject intake with missing intended outcomes', async () => {
      const intakeData = createMockIntakeData({ intendedOutcomes: '' });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Intended outcomes are required');
    });

    it('should warn when no grant target is specified', async () => {
      const intakeData = createMockIntakeData({ grantTarget: undefined });

      const result = await agent.validateIntake(intakeData);

      expect(result.warnings).toContain(
        'No grant target specified - framework determination may be limited'
      );
    });

    it('should warn when no submission deadline is specified', async () => {
      const intakeData = createMockIntakeData({
        timelineConstraint: { submissionDeadline: undefined },
      });

      const result = await agent.validateIntake(intakeData);

      expect(result.warnings).toContain('No submission deadline specified');
    });

    it('should collect multiple validation errors', async () => {
      const intakeData = createMockIntakeData({
        projectTitle: '',
        conceptDescription: 'Short',
        clinicalProblem: '',
      });

      const result = await agent.validateIntake(intakeData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // Project Classification Tests
  // ==========================================================================

  describe('classifyProject', () => {
    it('should classify a research project correctly', async () => {
      const intakeData = createMockIntakeData({
        projectType: 'RESEARCH' as ProjectType,
      });

      const mockResponse = createMockLLMResponse(
        JSON.stringify({
          projectType: 'RESEARCH',
          confidence: 0.92,
          reasoning: 'This project aims to generate generalizable knowledge through systematic investigation.',
          suggestedDesigns: ['STEPPED_WEDGE', 'CLUSTER_RCT'],
        })
      );
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      const classification = await agent.classifyProject(intakeData);

      expect(classification.projectType).toBe('RESEARCH');
      expect(classification.confidence).toBeGreaterThan(0.8);
      expect(classification.suggestedDesigns).toContain('STEPPED_WEDGE');
    });

    it('should classify a QI project correctly', async () => {
      const intakeData = createMockIntakeData({
        projectType: 'QI' as ProjectType,
        conceptDescription:
          'This quality improvement project aims to improve sepsis recognition at our ' +
          'local emergency department through a Plan-Do-Study-Act cycle approach. We will ' +
          'implement small tests of change to optimize our triage workflow. The focus is ' +
          'on local process improvement without intention to publish or generalize findings ' +
          'beyond our institution. We aim to reduce time to antibiotics by implementing ' +
          'a simple checklist-based approach integrated into existing workflows. The project ' +
          'will run for 3 PDSA cycles over 6 months with continuous monitoring of key ' +
          'process metrics.',
      });

      const mockResponse = createMockLLMResponse(
        JSON.stringify({
          projectType: 'QI',
          confidence: 0.95,
          reasoning: 'This project focuses on local process improvement using PDSA methodology without intent to generalize.',
          suggestedDesigns: ['PDSA_CYCLE', 'PRE_POST'],
        })
      );
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      const classification = await agent.classifyProject(intakeData);

      expect(classification.projectType).toBe('QI');
      expect(classification.confidence).toBeGreaterThan(0.9);
      expect(classification.suggestedDesigns).toContain('PDSA_CYCLE');
    });

    it('should classify a hybrid project correctly', async () => {
      const intakeData = createMockIntakeData({
        projectType: 'HYBRID' as ProjectType,
      });

      const mockResponse = createMockLLMResponse(
        JSON.stringify({
          projectType: 'HYBRID',
          confidence: 0.85,
          reasoning: 'This project has elements of both QI and research.',
          suggestedDesigns: ['QUASI_EXPERIMENTAL', 'PRE_POST'],
        })
      );
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      const classification = await agent.classifyProject(intakeData);

      expect(classification.projectType).toBe('HYBRID');
    });

    it('should handle LLM response parsing errors', async () => {
      const intakeData = createMockIntakeData();

      const mockResponse = createMockLLMResponse('Invalid JSON response');
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      await expect(agent.classifyProject(intakeData)).rejects.toThrow(
        'Failed to parse classification response'
      );
    });

    it('should include reasoning in classification', async () => {
      const intakeData = createMockIntakeData();

      const mockResponse = createMockLLMResponse(
        JSON.stringify({
          projectType: 'RESEARCH',
          confidence: 0.88,
          reasoning: 'The project involves formal hypothesis testing and intends to publish findings for broader application.',
          suggestedDesigns: ['RCT'],
        })
      );
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      const classification = await agent.classifyProject(intakeData);

      expect(classification.reasoning).toBeTruthy();
      expect(classification.reasoning.length).toBeGreaterThan(20);
    });

    it('should provide suggested study designs', async () => {
      const intakeData = createMockIntakeData();

      const mockResponse = createMockLLMResponse(
        JSON.stringify({
          projectType: 'RESEARCH',
          confidence: 0.90,
          reasoning: 'Systematic investigation requiring rigorous methodology.',
          suggestedDesigns: ['RCT', 'COHORT', 'STEPPED_WEDGE'],
        })
      );
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      const classification = await agent.classifyProject(intakeData);

      expect(classification.suggestedDesigns).toBeInstanceOf(Array);
      expect(classification.suggestedDesigns.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Framework Determination Tests
  // ==========================================================================

  describe('determineFrameworks', () => {
    it('should determine SQUIRE guideline for QI projects', async () => {
      const intakeData = createMockIntakeData({ projectType: 'QI' as ProjectType });
      const classification = createMockClassification({
        projectType: 'QI' as ProjectType,
        suggestedDesigns: ['PDSA_CYCLE'],
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.reportingGuideline).toBe('SQUIRE');
    });

    it('should determine CONSORT guideline for RCT designs', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification({
        projectType: 'RESEARCH' as ProjectType,
        suggestedDesigns: ['RCT', 'PARALLEL'],
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.reportingGuideline).toBe('CONSORT');
    });

    it('should determine CONSORT guideline for stepped-wedge designs', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification({
        projectType: 'RESEARCH' as ProjectType,
        suggestedDesigns: ['STEPPED_WEDGE'],
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.reportingGuideline).toBe('CONSORT');
    });

    it('should determine STROBE guideline for cohort studies', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification({
        projectType: 'RESEARCH' as ProjectType,
        suggestedDesigns: ['COHORT'],
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.reportingGuideline).toBe('STROBE');
    });

    it('should determine PRISMA guideline for systematic reviews', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification({
        projectType: 'RESEARCH' as ProjectType,
        suggestedDesigns: ['SYSTEMATIC_REVIEW'],
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.reportingGuideline).toBe('PRISMA');
    });

    it('should set QI_REGISTRATION ethics framework for QI projects', async () => {
      const intakeData = createMockIntakeData({ projectType: 'QI' as ProjectType });
      const classification = createMockClassification({
        projectType: 'QI' as ProjectType,
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.ethicsFramework).toBe('QI_REGISTRATION');
    });

    it('should set NHMRC framework for research projects', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification({
        projectType: 'RESEARCH' as ProjectType,
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.ethicsFramework).toBe('NHMRC_NATIONAL_STATEMENT');
    });

    it('should set HYBRID_REVIEW ethics framework for hybrid projects', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification({
        projectType: 'HYBRID' as ProjectType,
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.ethicsFramework).toBe('HYBRID_REVIEW');
    });

    it('should include clinical governance requirements', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification();

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.governanceRequirements).toContain('MN_CLINICAL_GOVERNANCE');
    });

    it('should include research governance for research projects', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification({
        projectType: 'RESEARCH' as ProjectType,
      });

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.governanceRequirements).toContain('QH_RESEARCH_GOVERNANCE');
    });

    it('should include privacy requirements', async () => {
      const intakeData = createMockIntakeData();
      const classification = createMockClassification();

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.governanceRequirements).toContain('PRIVACY_ACT_1988');
    });

    it('should include QLD privacy act for Queensland settings', async () => {
      const intakeData = createMockIntakeData({
        setting: 'Emergency Department, Royal Brisbane Hospital, Queensland',
      });
      const classification = createMockClassification();

      const frameworks = await agent.determineFrameworks(intakeData, classification);

      expect(frameworks.governanceRequirements).toContain(
        'INFORMATION_PRIVACY_ACT_2009_QLD'
      );
    });
  });

  // ==========================================================================
  // Complete Intake Processing Tests
  // ==========================================================================

  describe('processIntake', () => {
    it('should process valid intake data completely', async () => {
      const intakeData = createMockIntakeData();

      const mockResponse = createMockLLMResponse(
        JSON.stringify({
          projectType: 'RESEARCH',
          confidence: 0.92,
          reasoning: 'Systematic investigation for generalizable knowledge.',
          suggestedDesigns: ['STEPPED_WEDGE'],
        })
      );
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      const result = await agent.processIntake(intakeData);

      expect(result.intake).toBeDefined();
      expect(result.classification).toBeDefined();
      expect(result.frameworks).toBeDefined();
      expect(result.validation.isValid).toBe(true);
    });

    it('should throw error for invalid intake data', async () => {
      const invalidData = { projectTitle: '' };

      await expect(agent.processIntake(invalidData)).rejects.toThrow(
        'Intake validation failed'
      );
    });

    it('should call LLM for classification', async () => {
      const intakeData = createMockIntakeData();

      const mockResponse = createMockLLMResponse(
        JSON.stringify({
          projectType: 'RESEARCH',
          confidence: 0.90,
          reasoning: 'Test reasoning',
          suggestedDesigns: ['RCT'],
        })
      );
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      await agent.processIntake(intakeData);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalled();
    });

    it('should propagate classification to framework determination', async () => {
      const intakeData = createMockIntakeData();

      const mockResponse = createMockLLMResponse(
        JSON.stringify({
          projectType: 'QI',
          confidence: 0.95,
          reasoning: 'Local process improvement.',
          suggestedDesigns: ['PDSA_CYCLE'],
        })
      );
      mockAnthropicClient.messages.create.mockResolvedValueOnce(mockResponse);

      const result = await agent.processIntake(intakeData);

      expect(result.classification.projectType).toBe('QI');
      expect(result.frameworks.reportingGuideline).toBe('SQUIRE');
      expect(result.frameworks.ethicsFramework).toBe('QI_REGISTRATION');
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty intake object', async () => {
      const result = await agent.validateIntake({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null values in intake', async () => {
      const result = await agent.validateIntake({
        projectTitle: null,
        conceptDescription: null,
      });

      expect(result.isValid).toBe(false);
    });

    it('should handle concept description at exact minimum length', async () => {
      const intakeData = createMockIntakeData({
        conceptDescription: 'A'.repeat(500),
      });

      const result = await agent.validateIntake(intakeData);

      // Should pass the length check
      const descErrors = result.errors.filter(e =>
        e.includes('500 characters')
      );
      expect(descErrors).toHaveLength(0);
    });

    it('should handle concept description at exact maximum length', async () => {
      const intakeData = createMockIntakeData({
        conceptDescription: 'A'.repeat(2000),
      });

      const result = await agent.validateIntake(intakeData);

      // Should pass the length check
      const descErrors = result.errors.filter(e =>
        e.includes('2000 characters')
      );
      expect(descErrors).toHaveLength(0);
    });
  });
});
