/**
 * Tests for intake validation utilities
 * Phase 3.17.1-3.17.2 - Validation Tests
 *
 * Test coverage:
 * - Valid intake data passes validation
 * - Missing required fields fails validation
 * - Invalid project_type fails validation
 * - Concept description length validation
 */

import { describe, it, expect } from 'vitest';
import { ProjectType, GrantType } from '../../src/types/index.js';
import type { IntakeData, Investigator } from '../../src/types/index.js';

// Mock validation functions - these will be implemented later
// For now, we'll test against expected behavior
const validateIntakeData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check required fields
  if (!data.project_title || typeof data.project_title !== 'string') {
    errors.push('project_title is required and must be a string');
  }

  if (!data.project_type || !Object.values(ProjectType).includes(data.project_type)) {
    errors.push('project_type must be one of: QI, RESEARCH, HYBRID');
  }

  if (!data.concept_description || typeof data.concept_description !== 'string') {
    errors.push('concept_description is required and must be a string');
  } else if (data.concept_description.length < 500 || data.concept_description.length > 2000) {
    errors.push('concept_description must be between 500 and 2000 characters');
  }

  if (!data.clinical_problem || typeof data.clinical_problem !== 'string') {
    errors.push('clinical_problem is required and must be a string');
  }

  if (!data.target_population || typeof data.target_population !== 'string') {
    errors.push('target_population is required and must be a string');
  }

  if (!data.setting || typeof data.setting !== 'string') {
    errors.push('setting is required and must be a string');
  }

  if (!data.principal_investigator || typeof data.principal_investigator !== 'object') {
    errors.push('principal_investigator is required and must be an object');
  }

  if (!data.intended_outcomes || typeof data.intended_outcomes !== 'string') {
    errors.push('intended_outcomes is required and must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

describe('Intake Validation', () => {
  const validPrincipalInvestigator: Investigator = {
    name: 'Dr. Jane Smith',
    role: 'PI',
    title: 'Senior Consultant',
    institution: 'Metro North Hospital',
    department: 'Emergency Medicine',
    email: 'jane.smith@example.com',
    phone: '+61 7 1234 5678',
    expertise: ['Emergency Medicine', 'Quality Improvement'],
  };

  const validIntakeData: IntakeData = {
    project_title: 'Improving Emergency Department Wait Times',
    project_type: ProjectType.QI,
    concept_description:
      'This quality improvement project aims to reduce emergency department wait times by implementing a new triage system. ' +
      'The project will focus on streamlining patient flow and improving resource allocation to decrease the average wait time ' +
      'from 4 hours to 2 hours over a 6-month period. We will use PDSA cycles to test and refine interventions, with primary ' +
      'outcome measures including median wait time, patient satisfaction scores, and staff workload metrics. The intervention ' +
      'involves restructuring triage processes, improving communication systems, and optimizing staff scheduling during peak periods.',
    clinical_problem:
      'Emergency department overcrowding leads to extended wait times, affecting patient outcomes and satisfaction.',
    target_population: 'Adult patients presenting to the emergency department',
    setting: 'Metro North Hospital Emergency Department',
    principal_investigator: validPrincipalInvestigator,
    co_investigators: [],
    intended_outcomes: 'Reduce median wait time by 50% within 6 months',
    grant_target: GrantType.INTERNAL,
  };

  describe('Valid intake data', () => {
    it('should pass validation with all required fields', () => {
      const result = validateIntakeData(validIntakeData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass with optional co_investigators array', () => {
      const dataWithCoInvestigators: IntakeData = {
        ...validIntakeData,
        co_investigators: [
          {
            name: 'Dr. John Doe',
            role: 'CO_I',
            title: 'Registrar',
            institution: 'Metro North Hospital',
            department: 'Emergency Medicine',
            email: 'john.doe@example.com',
            expertise: ['Emergency Medicine'],
          },
        ],
      };
      const result = validateIntakeData(dataWithCoInvestigators);
      expect(result.valid).toBe(true);
    });

    it('should pass with optional grant_target', () => {
      const dataWithGrant: IntakeData = {
        ...validIntakeData,
        grant_target: GrantType.EMF_JUMPSTART,
      };
      const result = validateIntakeData(dataWithGrant);
      expect(result.valid).toBe(true);
    });
  });

  describe('Missing required fields', () => {
    it('should fail when project_title is missing', () => {
      const invalidData = { ...validIntakeData };
      delete (invalidData as any).project_title;
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('project_title is required and must be a string');
    });

    it('should fail when project_type is missing', () => {
      const invalidData = { ...validIntakeData };
      delete (invalidData as any).project_type;
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('project_type'))).toBe(true);
    });

    it('should fail when concept_description is missing', () => {
      const invalidData = { ...validIntakeData };
      delete (invalidData as any).concept_description;
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('concept_description'))).toBe(true);
    });

    it('should fail when clinical_problem is missing', () => {
      const invalidData = { ...validIntakeData };
      delete (invalidData as any).clinical_problem;
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('clinical_problem is required and must be a string');
    });

    it('should fail when target_population is missing', () => {
      const invalidData = { ...validIntakeData };
      delete (invalidData as any).target_population;
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('target_population is required and must be a string');
    });

    it('should fail when setting is missing', () => {
      const invalidData = { ...validIntakeData };
      delete (invalidData as any).setting;
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('setting is required and must be a string');
    });

    it('should fail when principal_investigator is missing', () => {
      const invalidData = { ...validIntakeData };
      delete (invalidData as any).principal_investigator;
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'principal_investigator is required and must be an object'
      );
    });

    it('should fail when intended_outcomes is missing', () => {
      const invalidData = { ...validIntakeData };
      delete (invalidData as any).intended_outcomes;
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('intended_outcomes is required and must be a string');
    });
  });

  describe('Invalid project_type', () => {
    it('should fail with invalid project_type string', () => {
      const invalidData = {
        ...validIntakeData,
        project_type: 'INVALID_TYPE' as any,
      };
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('project_type'))).toBe(true);
    });

    it('should fail with numeric project_type', () => {
      const invalidData = {
        ...validIntakeData,
        project_type: 123 as any,
      };
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('project_type'))).toBe(true);
    });

    it('should accept valid QI project_type', () => {
      const validData = {
        ...validIntakeData,
        project_type: ProjectType.QI,
      };
      const result = validateIntakeData(validData);
      expect(result.valid).toBe(true);
    });

    it('should accept valid RESEARCH project_type', () => {
      const validData = {
        ...validIntakeData,
        project_type: ProjectType.RESEARCH,
      };
      const result = validateIntakeData(validData);
      expect(result.valid).toBe(true);
    });

    it('should accept valid HYBRID project_type', () => {
      const validData = {
        ...validIntakeData,
        project_type: ProjectType.HYBRID,
      };
      const result = validateIntakeData(validData);
      expect(result.valid).toBe(true);
    });
  });

  describe('Concept description length validation', () => {
    it('should fail when concept_description is too short (< 500 chars)', () => {
      const invalidData = {
        ...validIntakeData,
        concept_description: 'Too short description.',
      };
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('must be between 500 and 2000 characters'))
      ).toBe(true);
    });

    it('should fail when concept_description is too long (> 2000 chars)', () => {
      const longDescription = 'A'.repeat(2001);
      const invalidData = {
        ...validIntakeData,
        concept_description: longDescription,
      };
      const result = validateIntakeData(invalidData);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('must be between 500 and 2000 characters'))
      ).toBe(true);
    });

    it('should pass when concept_description is exactly 500 chars', () => {
      const minDescription = 'A'.repeat(500);
      const validData = {
        ...validIntakeData,
        concept_description: minDescription,
      };
      const result = validateIntakeData(validData);
      expect(result.valid).toBe(true);
    });

    it('should pass when concept_description is exactly 2000 chars', () => {
      const maxDescription = 'A'.repeat(2000);
      const validData = {
        ...validIntakeData,
        concept_description: maxDescription,
      };
      const result = validateIntakeData(validData);
      expect(result.valid).toBe(true);
    });

    it('should pass when concept_description is within range', () => {
      const validData = {
        ...validIntakeData,
        concept_description: 'A'.repeat(1000),
      };
      const result = validateIntakeData(validData);
      expect(result.valid).toBe(true);
    });
  });
});
