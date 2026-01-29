/**
 * Validation Rules Test Suite
 *
 * Tests for validation rules including:
 * - Word limit validation
 * - Required sections validation
 * - Cross-reference validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockProject,
  createMockProjectAtStage,
  createMockDocumentSection,
  createMockDocumentContent,
  createMockGeneratedDocument,
  createMockIntakeData,
  createMockResearchData,
  createMockMethodologyData,
  createMockEthicsData,
} from '../fixtures/mockProject.js';
import type {
  Project,
  DocumentSection,
} from '../../src/types/index.js';

// ============================================================================
// Validation Rule Implementations (for testing)
// In actual implementation, these would be imported from src/validation/rules
// ============================================================================

/**
 * Word limit validation result
 */
interface WordLimitValidationResult {
  isValid: boolean;
  sectionName: string;
  wordCount: number;
  wordLimit: number;
  overage: number;
  message: string;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Validate word limits for a document section
 */
function validateWordLimit(
  section: DocumentSection
): WordLimitValidationResult {
  const wordCount = section.wordCount || countWords(section.content);
  const wordLimit = section.wordLimit || Infinity;
  const overage = Math.max(0, wordCount - wordLimit);
  const isValid = wordCount <= wordLimit;

  return {
    isValid,
    sectionName: section.title,
    wordCount,
    wordLimit: wordLimit === Infinity ? -1 : wordLimit,
    overage,
    message: isValid
      ? `Section "${section.title}" is within word limit (${wordCount}/${wordLimit})`
      : `Section "${section.title}" exceeds word limit by ${overage} words (${wordCount}/${wordLimit})`,
  };
}

/**
 * Validate word limits for multiple sections
 */
function validateAllWordLimits(
  sections: DocumentSection[]
): WordLimitValidationResult[] {
  return sections.map(validateWordLimit);
}

/**
 * EMF Application word limits
 */
const EMF_WORD_LIMITS: Record<string, number> = {
  A4_plain_language_summary: 250,
  A5_scientific_abstract: 450,
  A6_em_relevance: 100,
  B1_background_rationale: 1500,
  B2_aims_objectives: 300,
  B3_design_methods: 2000,
  B4_innovation_impact: 750,
  B5_translation_plan: 400,
};

/**
 * Protocol word limits
 */
const PROTOCOL_WORD_LIMITS: Record<string, number> = {
  synopsis: 500,
  introduction: 250,
  background: 2000,
  methods: 3000,
  discussion: 1500,
};

/**
 * Required sections validation result
 */
interface RequiredSectionsValidationResult {
  isValid: boolean;
  missingRequiredSections: string[];
  presentSections: string[];
  message: string;
}

/**
 * Define required sections by document type
 */
const REQUIRED_SECTIONS: Record<string, string[]> = {
  RESEARCH_PROTOCOL: [
    'TITLE_PAGE',
    'SYNOPSIS',
    'BACKGROUND',
    'AIMS_OBJECTIVES',
    'METHODS',
    'PARTICIPANTS',
    'OUTCOMES',
    'PROCEDURES',
    'DATA_MANAGEMENT',
    'ETHICAL_CONSIDERATIONS',
    'REFERENCES',
  ],
  QI_PROJECT_PLAN: [
    'TITLE_PAGE',
    'SYNOPSIS',
    'BACKGROUND',
    'AIMS_OBJECTIVES',
    'METHODS',
    'DATA_MANAGEMENT',
  ],
  EMF_APPLICATION: [
    'TITLE_PAGE',
    'SYNOPSIS',
    'BACKGROUND',
    'AIMS_OBJECTIVES',
    'METHODS',
    'BUDGET',
    'TIMELINE',
  ],
  PICF: [
    'TITLE_PAGE',
    'INTRODUCTION',
    'PROCEDURES',
    'DATA_MANAGEMENT',
  ],
};

/**
 * Validate required sections for a document
 */
function validateRequiredSections(
  documentType: string,
  sections: DocumentSection[]
): RequiredSectionsValidationResult {
  const requiredSections = REQUIRED_SECTIONS[documentType] || [];
  const presentSectionTypes = sections.map((s) => s.type);
  const presentSections = sections.map((s) => s.title);

  const missingRequiredSections = requiredSections.filter(
    (required) => !presentSectionTypes.includes(required as never)
  );

  const isValid = missingRequiredSections.length === 0;

  return {
    isValid,
    missingRequiredSections,
    presentSections,
    message: isValid
      ? 'All required sections are present'
      : `Missing required sections: ${missingRequiredSections.join(', ')}`,
  };
}

/**
 * Cross-reference validation result
 */
interface CrossReferenceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate cross-references in a project
 */
function validateCrossReferences(project: Project): CrossReferenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that research stage references exist if methodology references them
  if (project.methodology && !project.research) {
    errors.push('Methodology stage references research stage, but research stage is not complete');
  }

  // Check that intake population matches methodology participant spec
  if (project.methodology?.participants) {
    const intakePopulation = project.intake.targetPopulation.toLowerCase();
    const methodologyInclusion = project.methodology.participants.inclusionCriteria
      .map((c) => c.criterion.toLowerCase())
      .join(' ');

    // Simple check - in practice would be more sophisticated
    const populationTerms = intakePopulation.split(' ').filter((t) => t.length > 4);
    const hasMatchingTerms = populationTerms.some((term) =>
      methodologyInclusion.includes(term)
    );

    if (!hasMatchingTerms) {
      warnings.push(
        'Intake target population may not align with methodology inclusion criteria'
      );
    }
  }

  // Check that setting in intake matches sites in methodology
  if (project.methodology?.settingSites) {
    const intakeSetting = project.intake.setting.toLowerCase();
    const methodologySites = project.methodology.settingSites
      .map((s) => s.name.toLowerCase())
      .join(' ');

    const settingTerms = intakeSetting.split(' ').filter((t) => t.length > 4);
    const hasMatchingSites = settingTerms.some((term) =>
      methodologySites.includes(term)
    );

    if (!hasMatchingSites) {
      warnings.push('Intake setting may not align with methodology sites');
    }
  }

  // Check that ethics pathway matches project classification
  if (project.ethics?.ethicsPathway && project.classification) {
    const { projectType } = project.classification;
    const { pathway } = project.ethics.ethicsPathway;

    if (projectType === 'QI' && pathway !== 'QI_REGISTRATION') {
      errors.push(
        `Project classified as QI but ethics pathway is ${pathway}, expected QI_REGISTRATION`
      );
    }

    if (projectType === 'RESEARCH' && pathway === 'QI_REGISTRATION') {
      errors.push(
        'Project classified as RESEARCH but using QI_REGISTRATION pathway'
      );
    }
  }

  // Check that documents reference correct stages
  if (project.documents?.generated) {
    for (const doc of project.documents.generated) {
      if (doc.type === 'RESEARCH_PROTOCOL' && !project.methodology) {
        errors.push(
          'Research protocol generated but methodology stage is not complete'
        );
      }

      if (
        (doc.type === 'PICF' || doc.type === 'LNR_APPLICATION') &&
        !project.ethics
      ) {
        errors.push(
          `${doc.type} generated but ethics stage is not complete`
        );
      }
    }
  }

  // Check citation references
  if (project.research?.citations && project.documents?.generated) {
    const citationIds = project.research.citations.map((c) => c.id);
    // In practice, would parse document content for citation references
    // This is a simplified check
    if (citationIds.length === 0) {
      warnings.push('No citations found in research stage');
    }
  }

  // Check framework consistency
  if (project.frameworks && project.ethics?.ethicsPathway) {
    if (
      project.frameworks.ethicsFramework === 'NHMRC_NATIONAL_STATEMENT' &&
      project.ethics.ethicsPathway.pathway === 'QI_REGISTRATION'
    ) {
      errors.push(
        'Framework specifies NHMRC_NATIONAL_STATEMENT but ethics pathway is QI_REGISTRATION'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate overall project consistency
 */
function validateProjectConsistency(project: Project): CrossReferenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check status matches completed stages
  const status = project.status;
  const checkpoints = project.checkpoints;

  if (status === 'RESEARCH_COMPLETE' && !checkpoints.intakeApproved) {
    errors.push('Project status is RESEARCH_COMPLETE but intake is not approved');
  }

  if (status === 'METHODOLOGY_COMPLETE' && !checkpoints.researchApproved) {
    errors.push('Project status is METHODOLOGY_COMPLETE but research is not approved');
  }

  if (status === 'ETHICS_COMPLETE' && !checkpoints.methodologyApproved) {
    errors.push('Project status is ETHICS_COMPLETE but methodology is not approved');
  }

  if (status === 'DOCUMENTS_COMPLETE' && !checkpoints.ethicsApproved) {
    errors.push('Project status is DOCUMENTS_COMPLETE but ethics is not approved');
  }

  // Check that completed stages have data
  if (checkpoints.researchApproved && !project.research) {
    errors.push('Research is approved but research data is missing');
  }

  if (checkpoints.methodologyApproved && !project.methodology) {
    errors.push('Methodology is approved but methodology data is missing');
  }

  if (checkpoints.ethicsApproved && !project.ethics) {
    errors.push('Ethics is approved but ethics data is missing');
  }

  if (checkpoints.documentsApproved && !project.documents) {
    errors.push('Documents is approved but documents data is missing');
  }

  // Check grant target consistency
  if (project.intake.grantTarget && project.documents?.generated) {
    const grantType = project.intake.grantTarget;
    const hasGrantDocument = project.documents.generated.some((doc) =>
      doc.type.includes('EMF_APPLICATION')
    );

    if (grantType.startsWith('EMF_') && !hasGrantDocument) {
      warnings.push(
        `Grant target is ${grantType} but no EMF application document generated`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Validation Rules', () => {
  // ==========================================================================
  // Word Limit Validation Tests
  // ==========================================================================

  describe('Word Limit Validation', () => {
    describe('countWords', () => {
      it('should count words correctly', () => {
        expect(countWords('one two three')).toBe(3);
      });

      it('should handle multiple spaces', () => {
        expect(countWords('one   two    three')).toBe(3);
      });

      it('should handle leading and trailing spaces', () => {
        expect(countWords('  one two three  ')).toBe(3);
      });

      it('should return 0 for empty string', () => {
        expect(countWords('')).toBe(0);
      });

      it('should return 0 for whitespace only', () => {
        expect(countWords('   ')).toBe(0);
      });

      it('should return 0 for null/undefined', () => {
        expect(countWords(null as unknown as string)).toBe(0);
        expect(countWords(undefined as unknown as string)).toBe(0);
      });

      it('should handle newlines and tabs', () => {
        expect(countWords('one\ntwo\tthree')).toBe(3);
      });
    });

    describe('validateWordLimit', () => {
      it('should pass when word count is under limit', () => {
        const section = createMockDocumentSection({
          title: 'Background',
          content: 'This is a short section.',
          wordCount: 5,
          wordLimit: 100,
        });

        const result = validateWordLimit(section);

        expect(result.isValid).toBe(true);
        expect(result.overage).toBe(0);
      });

      it('should pass when word count equals limit', () => {
        const section = createMockDocumentSection({
          title: 'Background',
          content: 'word '.repeat(100).trim(),
          wordCount: 100,
          wordLimit: 100,
        });

        const result = validateWordLimit(section);

        expect(result.isValid).toBe(true);
        expect(result.overage).toBe(0);
      });

      it('should fail when word count exceeds limit', () => {
        const section = createMockDocumentSection({
          title: 'Background',
          content: 'word '.repeat(150).trim(),
          wordCount: 150,
          wordLimit: 100,
        });

        const result = validateWordLimit(section);

        expect(result.isValid).toBe(false);
        expect(result.overage).toBe(50);
      });

      it('should calculate correct overage', () => {
        const section = createMockDocumentSection({
          title: 'Methods',
          wordCount: 2500,
          wordLimit: 2000,
        });

        const result = validateWordLimit(section);

        expect(result.overage).toBe(500);
        expect(result.message).toContain('exceeds word limit by 500 words');
      });

      it('should handle sections without word limit', () => {
        const section = createMockDocumentSection({
          title: 'Appendix',
          wordCount: 5000,
          wordLimit: undefined,
        });

        const result = validateWordLimit(section);

        expect(result.isValid).toBe(true);
        expect(result.wordLimit).toBe(-1);
      });

      it('should include section name in result', () => {
        const section = createMockDocumentSection({
          title: 'Introduction',
          wordCount: 100,
          wordLimit: 250,
        });

        const result = validateWordLimit(section);

        expect(result.sectionName).toBe('Introduction');
      });
    });

    describe('validateAllWordLimits', () => {
      it('should validate multiple sections', () => {
        const sections = [
          createMockDocumentSection({
            title: 'Section 1',
            wordCount: 100,
            wordLimit: 200,
          }),
          createMockDocumentSection({
            title: 'Section 2',
            wordCount: 300,
            wordLimit: 200,
          }),
          createMockDocumentSection({
            title: 'Section 3',
            wordCount: 150,
            wordLimit: 200,
          }),
        ] as DocumentSection[];

        const results = validateAllWordLimits(sections);

        expect(results).toHaveLength(3);
        expect(results[0]?.isValid).toBe(true);
        expect(results[1]?.isValid).toBe(false);
        expect(results[2]?.isValid).toBe(true);
      });

      it('should handle empty sections array', () => {
        const results = validateAllWordLimits([]);

        expect(results).toHaveLength(0);
      });
    });

    describe('EMF Word Limits', () => {
      it('should have correct limits for EMF sections', () => {
        expect(EMF_WORD_LIMITS['A4_plain_language_summary']).toBe(250);
        expect(EMF_WORD_LIMITS['A5_scientific_abstract']).toBe(450);
        expect(EMF_WORD_LIMITS['B1_background_rationale']).toBe(1500);
        expect(EMF_WORD_LIMITS['B3_design_methods']).toBe(2000);
      });

      it('should validate EMF sections correctly', () => {
        const sections = [
          createMockDocumentSection({
            title: 'Plain Language Summary',
            type: 'SYNOPSIS',
            wordCount: 260,
            wordLimit: EMF_WORD_LIMITS['A4_plain_language_summary'],
          }),
        ] as DocumentSection[];

        const results = validateAllWordLimits(sections);

        expect(results[0]?.isValid).toBe(false);
        expect(results[0]?.overage).toBe(10);
      });
    });

    describe('Protocol Word Limits', () => {
      it('should have correct limits for protocol sections', () => {
        expect(PROTOCOL_WORD_LIMITS['synopsis']).toBe(500);
        expect(PROTOCOL_WORD_LIMITS['background']).toBe(2000);
        expect(PROTOCOL_WORD_LIMITS['methods']).toBe(3000);
      });
    });
  });

  // ==========================================================================
  // Required Sections Validation Tests
  // ==========================================================================

  describe('Required Sections Validation', () => {
    describe('validateRequiredSections', () => {
      it('should pass when all required sections are present', () => {
        const sections = [
          createMockDocumentSection({ type: 'TITLE_PAGE', title: 'Title' }),
          createMockDocumentSection({ type: 'SYNOPSIS', title: 'Synopsis' }),
          createMockDocumentSection({ type: 'BACKGROUND', title: 'Background' }),
          createMockDocumentSection({ type: 'AIMS_OBJECTIVES', title: 'Aims' }),
          createMockDocumentSection({ type: 'METHODS', title: 'Methods' }),
          createMockDocumentSection({ type: 'PARTICIPANTS', title: 'Participants' }),
          createMockDocumentSection({ type: 'OUTCOMES', title: 'Outcomes' }),
          createMockDocumentSection({ type: 'PROCEDURES', title: 'Procedures' }),
          createMockDocumentSection({ type: 'DATA_MANAGEMENT', title: 'Data Management' }),
          createMockDocumentSection({ type: 'ETHICAL_CONSIDERATIONS', title: 'Ethics' }),
          createMockDocumentSection({ type: 'REFERENCES', title: 'References' }),
        ] as DocumentSection[];

        const result = validateRequiredSections('RESEARCH_PROTOCOL', sections);

        expect(result.isValid).toBe(true);
        expect(result.missingRequiredSections).toHaveLength(0);
      });

      it('should fail when required sections are missing', () => {
        const sections = [
          createMockDocumentSection({ type: 'TITLE_PAGE', title: 'Title' }),
          createMockDocumentSection({ type: 'SYNOPSIS', title: 'Synopsis' }),
        ] as DocumentSection[];

        const result = validateRequiredSections('RESEARCH_PROTOCOL', sections);

        expect(result.isValid).toBe(false);
        expect(result.missingRequiredSections.length).toBeGreaterThan(0);
        expect(result.missingRequiredSections).toContain('BACKGROUND');
        expect(result.missingRequiredSections).toContain('METHODS');
      });

      it('should list all missing sections', () => {
        const sections = [
          createMockDocumentSection({ type: 'TITLE_PAGE', title: 'Title' }),
        ] as DocumentSection[];

        const result = validateRequiredSections('RESEARCH_PROTOCOL', sections);

        expect(result.missingRequiredSections).toContain('SYNOPSIS');
        expect(result.missingRequiredSections).toContain('BACKGROUND');
        expect(result.missingRequiredSections).toContain('AIMS_OBJECTIVES');
      });

      it('should handle QI project plan requirements', () => {
        const sections = [
          createMockDocumentSection({ type: 'TITLE_PAGE', title: 'Title' }),
          createMockDocumentSection({ type: 'SYNOPSIS', title: 'Synopsis' }),
          createMockDocumentSection({ type: 'BACKGROUND', title: 'Background' }),
          createMockDocumentSection({ type: 'AIMS_OBJECTIVES', title: 'Aims' }),
          createMockDocumentSection({ type: 'METHODS', title: 'Methods' }),
          createMockDocumentSection({ type: 'DATA_MANAGEMENT', title: 'Data' }),
        ] as DocumentSection[];

        const result = validateRequiredSections('QI_PROJECT_PLAN', sections);

        expect(result.isValid).toBe(true);
      });

      it('should handle unknown document types', () => {
        const sections = [
          createMockDocumentSection({ type: 'TITLE_PAGE', title: 'Title' }),
        ] as DocumentSection[];

        const result = validateRequiredSections('UNKNOWN_TYPE', sections);

        expect(result.isValid).toBe(true);
        expect(result.missingRequiredSections).toHaveLength(0);
      });

      it('should track present sections', () => {
        const sections = [
          createMockDocumentSection({ type: 'TITLE_PAGE', title: 'Title Page' }),
          createMockDocumentSection({ type: 'SYNOPSIS', title: 'Synopsis' }),
        ] as DocumentSection[];

        const result = validateRequiredSections('RESEARCH_PROTOCOL', sections);

        expect(result.presentSections).toContain('Title Page');
        expect(result.presentSections).toContain('Synopsis');
      });
    });
  });

  // ==========================================================================
  // Cross-Reference Validation Tests
  // ==========================================================================

  describe('Cross-Reference Validation', () => {
    describe('validateCrossReferences', () => {
      it('should pass for valid project with all stages', () => {
        const project = createMockProjectAtStage('ETHICS');

        const result = validateCrossReferences(project);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when methodology exists without research', () => {
        const project = createMockProject({
          methodology: createMockMethodologyData(),
          research: undefined,
        });

        const result = validateCrossReferences(project);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Methodology stage references research stage, but research stage is not complete'
        );
      });

      it('should warn when intake population does not match methodology', () => {
        // Create methodology with completely different inclusion criteria
        const customMethodology = createMockMethodologyData();
        customMethodology.participants.inclusionCriteria = [
          {
            criterion: 'Neonates in NICU',
            rationale: 'Focus on neonatal population',
            measurementMethod: 'Age verification',
          },
        ];

        const project = createMockProject({
          intake: createMockIntakeData({
            targetPopulation: 'Elderly geriatric patients over 85 years in nursing homes',
          }),
          research: createMockResearchData(),
          methodology: customMethodology,
        });

        const result = validateCrossReferences(project);

        expect(result.warnings.length).toBeGreaterThan(0);
      });

      it('should fail when QI project has non-QI ethics pathway', () => {
        const project = createMockProject({
          classification: {
            projectType: 'QI',
            confidence: 0.95,
            reasoning: 'QI project',
            suggestedDesigns: ['PDSA_CYCLE'],
          },
          ethics: {
            ...createMockEthicsData(),
            ethicsPathway: {
              ...createMockEthicsData().ethicsPathway,
              pathway: 'FULL_HREC_REVIEW',
            },
          },
        });

        const result = validateCrossReferences(project);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('QI') && e.includes('pathway'))).toBe(true);
      });

      it('should fail when research project uses QI pathway', () => {
        const project = createMockProject({
          classification: {
            projectType: 'RESEARCH',
            confidence: 0.92,
            reasoning: 'Research project',
            suggestedDesigns: ['RCT'],
          },
          ethics: {
            ...createMockEthicsData(),
            ethicsPathway: {
              ...createMockEthicsData().ethicsPathway,
              pathway: 'QI_REGISTRATION',
            },
          },
        });

        const result = validateCrossReferences(project);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) =>
          e.includes('RESEARCH') && e.includes('QI_REGISTRATION')
        )).toBe(true);
      });

      it('should fail when research protocol generated without methodology', () => {
        const project = createMockProject({
          methodology: undefined,
          documents: {
            generated: [createMockGeneratedDocument({ type: 'RESEARCH_PROTOCOL' })],
            pendingReview: [],
            metadata: {
              projectId: 'test',
              totalDocuments: 1,
              generatedAt: new Date().toISOString(),
              submissionChecklist: [],
            },
          },
        });

        const result = validateCrossReferences(project);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) =>
          e.includes('Research protocol') && e.includes('methodology')
        )).toBe(true);
      });

      it('should fail when PICF generated without ethics stage', () => {
        const project = createMockProject({
          ethics: undefined,
          documents: {
            generated: [createMockGeneratedDocument({ type: 'PICF' })],
            pendingReview: [],
            metadata: {
              projectId: 'test',
              totalDocuments: 1,
              generatedAt: new Date().toISOString(),
              submissionChecklist: [],
            },
          },
        });

        const result = validateCrossReferences(project);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('PICF'))).toBe(true);
      });

      it('should warn when no citations in research stage', () => {
        const project = createMockProject({
          research: {
            ...createMockResearchData(),
            citations: [],
          },
          documents: {
            generated: [createMockGeneratedDocument()],
            pendingReview: [],
            metadata: {
              projectId: 'test',
              totalDocuments: 1,
              generatedAt: new Date().toISOString(),
              submissionChecklist: [],
            },
          },
        });

        const result = validateCrossReferences(project);

        expect(result.warnings.some((w) => w.includes('citations'))).toBe(true);
      });
    });

    describe('validateProjectConsistency', () => {
      it('should pass for consistent project', () => {
        const project = createMockProjectAtStage('METHODOLOGY');

        const result = validateProjectConsistency(project);

        expect(result.isValid).toBe(true);
      });

      it('should fail when status does not match checkpoints', () => {
        const project = createMockProject({
          status: 'RESEARCH_COMPLETE',
          checkpoints: {
            intakeApproved: false,
            researchApproved: false,
            methodologyApproved: false,
            ethicsApproved: false,
            documentsApproved: false,
          },
        });

        const result = validateProjectConsistency(project);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) =>
          e.includes('RESEARCH_COMPLETE') && e.includes('intake')
        )).toBe(true);
      });

      it('should fail when checkpoint approved but data missing', () => {
        const project = createMockProject({
          checkpoints: {
            intakeApproved: true,
            researchApproved: true,
            methodologyApproved: false,
            ethicsApproved: false,
            documentsApproved: false,
          },
          research: undefined,
        });

        const result = validateProjectConsistency(project);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) =>
          e.includes('Research is approved') && e.includes('missing')
        )).toBe(true);
      });

      it('should warn when EMF grant target but no EMF application', () => {
        const project = createMockProject({
          intake: createMockIntakeData({ grantTarget: 'EMF_LEADING_EDGE' }),
          documents: {
            generated: [createMockGeneratedDocument({ type: 'RESEARCH_PROTOCOL' })],
            pendingReview: [],
            metadata: {
              projectId: 'test',
              totalDocuments: 1,
              generatedAt: new Date().toISOString(),
              submissionChecklist: [],
            },
          },
        });

        const result = validateProjectConsistency(project);

        expect(result.warnings.some((w) =>
          w.includes('EMF') && w.includes('application')
        )).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should validate a complete project through all rules', () => {
      const project = createMockProjectAtStage('DOCUMENTS');

      const crossRefResult = validateCrossReferences(project);
      const consistencyResult = validateProjectConsistency(project);

      expect(crossRefResult.isValid).toBe(true);
      expect(consistencyResult.isValid).toBe(true);
    });

    it('should catch multiple validation errors', () => {
      const project = createMockProject({
        status: 'DOCUMENTS_COMPLETE',
        checkpoints: {
          intakeApproved: false,
          researchApproved: false,
          methodologyApproved: false,
          ethicsApproved: false,
          documentsApproved: true,
        },
        methodology: createMockMethodologyData(),
        research: undefined,
        documents: {
          generated: [
            createMockGeneratedDocument({ type: 'RESEARCH_PROTOCOL' }),
            createMockGeneratedDocument({ type: 'PICF' }),
          ],
          pendingReview: [],
          metadata: {
            projectId: 'test',
            totalDocuments: 2,
            generatedAt: new Date().toISOString(),
            submissionChecklist: [],
          },
        },
      });

      const crossRefResult = validateCrossReferences(project);
      const consistencyResult = validateProjectConsistency(project);

      const totalErrors = crossRefResult.errors.length + consistencyResult.errors.length;

      expect(totalErrors).toBeGreaterThan(2);
    });

    it('should generate meaningful error messages', () => {
      const project = createMockProject({
        methodology: createMockMethodologyData(),
        research: undefined,
      });

      const result = validateCrossReferences(project);

      expect(result.errors[0]).toContain('Methodology');
      expect(result.errors[0]).toContain('research');
    });
  });
});
