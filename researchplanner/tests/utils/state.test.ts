/**
 * Tests for state management utilities
 * Phase 3.17.3-3.17.4 - State Transition Tests
 *
 * Test coverage:
 * - Valid status transitions succeed
 * - Invalid status transitions fail
 * - validateStatusTransition function
 */

import { describe, it, expect } from 'vitest';
import type { ProjectStatus } from '../../src/types/index.js';

// Mock state validation function - to be implemented later
// Based on spec Section 4.1.1, valid transitions are:
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['INTAKE_COMPLETE'],
  INTAKE_COMPLETE: ['INTAKE_APPROVED', 'REVISION_REQUIRED'],
  INTAKE_APPROVED: ['RESEARCH_COMPLETE', 'REVISION_REQUIRED'],
  RESEARCH_COMPLETE: ['RESEARCH_APPROVED', 'REVISION_REQUIRED'],
  RESEARCH_APPROVED: ['METHODOLOGY_COMPLETE', 'REVISION_REQUIRED'],
  METHODOLOGY_COMPLETE: ['METHODOLOGY_APPROVED', 'REVISION_REQUIRED'],
  METHODOLOGY_APPROVED: ['ETHICS_COMPLETE', 'REVISION_REQUIRED'],
  ETHICS_COMPLETE: ['ETHICS_APPROVED', 'REVISION_REQUIRED'],
  ETHICS_APPROVED: ['DOCUMENTS_COMPLETE', 'REVISION_REQUIRED'],
  DOCUMENTS_COMPLETE: ['DOCUMENTS_APPROVED', 'REVISION_REQUIRED'],
  DOCUMENTS_APPROVED: ['SUBMITTED'],
  SUBMITTED: ['COMPLETED', 'REVISION_REQUIRED'],
  REVISION_REQUIRED: [
    'INTAKE_COMPLETE',
    'RESEARCH_COMPLETE',
    'METHODOLOGY_COMPLETE',
    'ETHICS_COMPLETE',
    'DOCUMENTS_COMPLETE',
  ],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

const validateStatusTransition = (
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus
): { valid: boolean; error?: string } => {
  if (currentStatus === newStatus) {
    return {
      valid: false,
      error: 'Cannot transition to the same status',
    };
  }

  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid transition from ${currentStatus} to ${newStatus}`,
    };
  }

  return { valid: true };
};

describe('Status Transitions', () => {
  describe('Valid transitions', () => {
    it('should allow DRAFT to INTAKE_COMPLETE', () => {
      const result = validateStatusTransition('DRAFT', 'INTAKE_COMPLETE');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow INTAKE_COMPLETE to INTAKE_APPROVED', () => {
      const result = validateStatusTransition('INTAKE_COMPLETE', 'INTAKE_APPROVED');
      expect(result.valid).toBe(true);
    });

    it('should allow INTAKE_APPROVED to RESEARCH_COMPLETE', () => {
      const result = validateStatusTransition('INTAKE_APPROVED', 'RESEARCH_COMPLETE');
      expect(result.valid).toBe(true);
    });

    it('should allow RESEARCH_COMPLETE to RESEARCH_APPROVED', () => {
      const result = validateStatusTransition('RESEARCH_COMPLETE', 'RESEARCH_APPROVED');
      expect(result.valid).toBe(true);
    });

    it('should allow RESEARCH_APPROVED to METHODOLOGY_COMPLETE', () => {
      const result = validateStatusTransition('RESEARCH_APPROVED', 'METHODOLOGY_COMPLETE');
      expect(result.valid).toBe(true);
    });

    it('should allow METHODOLOGY_COMPLETE to METHODOLOGY_APPROVED', () => {
      const result = validateStatusTransition('METHODOLOGY_COMPLETE', 'METHODOLOGY_APPROVED');
      expect(result.valid).toBe(true);
    });

    it('should allow METHODOLOGY_APPROVED to ETHICS_COMPLETE', () => {
      const result = validateStatusTransition('METHODOLOGY_APPROVED', 'ETHICS_COMPLETE');
      expect(result.valid).toBe(true);
    });

    it('should allow ETHICS_COMPLETE to ETHICS_APPROVED', () => {
      const result = validateStatusTransition('ETHICS_COMPLETE', 'ETHICS_APPROVED');
      expect(result.valid).toBe(true);
    });

    it('should allow ETHICS_APPROVED to DOCUMENTS_COMPLETE', () => {
      const result = validateStatusTransition('ETHICS_APPROVED', 'DOCUMENTS_COMPLETE');
      expect(result.valid).toBe(true);
    });

    it('should allow DOCUMENTS_COMPLETE to DOCUMENTS_APPROVED', () => {
      const result = validateStatusTransition('DOCUMENTS_COMPLETE', 'DOCUMENTS_APPROVED');
      expect(result.valid).toBe(true);
    });

    it('should allow DOCUMENTS_APPROVED to SUBMITTED', () => {
      const result = validateStatusTransition('DOCUMENTS_APPROVED', 'SUBMITTED');
      expect(result.valid).toBe(true);
    });

    it('should allow SUBMITTED to COMPLETED', () => {
      const result = validateStatusTransition('SUBMITTED', 'COMPLETED');
      expect(result.valid).toBe(true);
    });

    it('should allow COMPLETED to ARCHIVED', () => {
      const result = validateStatusTransition('COMPLETED', 'ARCHIVED');
      expect(result.valid).toBe(true);
    });

    it('should allow any stage to REVISION_REQUIRED', () => {
      expect(validateStatusTransition('INTAKE_COMPLETE', 'REVISION_REQUIRED').valid).toBe(
        true
      );
      expect(validateStatusTransition('RESEARCH_COMPLETE', 'REVISION_REQUIRED').valid).toBe(
        true
      );
      expect(
        validateStatusTransition('METHODOLOGY_COMPLETE', 'REVISION_REQUIRED').valid
      ).toBe(true);
      expect(validateStatusTransition('ETHICS_COMPLETE', 'REVISION_REQUIRED').valid).toBe(
        true
      );
      expect(validateStatusTransition('DOCUMENTS_COMPLETE', 'REVISION_REQUIRED').valid).toBe(
        true
      );
    });

    it('should allow REVISION_REQUIRED to return to any COMPLETE status', () => {
      expect(validateStatusTransition('REVISION_REQUIRED', 'INTAKE_COMPLETE').valid).toBe(
        true
      );
      expect(validateStatusTransition('REVISION_REQUIRED', 'RESEARCH_COMPLETE').valid).toBe(
        true
      );
      expect(
        validateStatusTransition('REVISION_REQUIRED', 'METHODOLOGY_COMPLETE').valid
      ).toBe(true);
      expect(validateStatusTransition('REVISION_REQUIRED', 'ETHICS_COMPLETE').valid).toBe(
        true
      );
      expect(validateStatusTransition('REVISION_REQUIRED', 'DOCUMENTS_COMPLETE').valid).toBe(
        true
      );
    });
  });

  describe('Invalid transitions', () => {
    it('should reject transition to the same status', () => {
      const result = validateStatusTransition('DRAFT', 'DRAFT');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot transition to the same status');
    });

    it('should reject skipping intake stage', () => {
      const result = validateStatusTransition('DRAFT', 'RESEARCH_COMPLETE');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject backwards transition without REVISION_REQUIRED', () => {
      const result = validateStatusTransition('RESEARCH_APPROVED', 'INTAKE_COMPLETE');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject skipping approval stages', () => {
      const result = validateStatusTransition('INTAKE_COMPLETE', 'RESEARCH_COMPLETE');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject jumping to SUBMITTED without going through all stages', () => {
      const result = validateStatusTransition('INTAKE_APPROVED', 'SUBMITTED');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject jumping to COMPLETED from early stages', () => {
      const result = validateStatusTransition('RESEARCH_APPROVED', 'COMPLETED');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject any transition from ARCHIVED', () => {
      const result = validateStatusTransition('ARCHIVED', 'COMPLETED');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject direct jump from COMPLETE to APPROVED without checkpoint', () => {
      // This is already tested but making it explicit
      const result = validateStatusTransition('INTAKE_COMPLETE', 'RESEARCH_APPROVED');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateStatusTransition function', () => {
    it('should return valid=true for allowed transitions', () => {
      const result = validateStatusTransition('DRAFT', 'INTAKE_COMPLETE');
      expect(result).toHaveProperty('valid');
      expect(result.error).toBeUndefined();
      expect(result.valid).toBe(true);
    });

    it('should return valid=false with error message for invalid transitions', () => {
      const result = validateStatusTransition('DRAFT', 'SUBMITTED');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should provide descriptive error messages', () => {
      const result = validateStatusTransition('INTAKE_COMPLETE', 'SUBMITTED');
      expect(result.error).toMatch(/Invalid transition/i);
      expect(result.error).toContain('INTAKE_COMPLETE');
      expect(result.error).toContain('SUBMITTED');
    });
  });

  describe('Edge cases', () => {
    it('should handle all status values defined in ProjectStatus type', () => {
      const allStatuses: ProjectStatus[] = [
        'DRAFT',
        'INTAKE_COMPLETE',
        'INTAKE_APPROVED',
        'RESEARCH_COMPLETE',
        'RESEARCH_APPROVED',
        'METHODOLOGY_COMPLETE',
        'METHODOLOGY_APPROVED',
        'ETHICS_COMPLETE',
        'ETHICS_APPROVED',
        'DOCUMENTS_COMPLETE',
        'DOCUMENTS_APPROVED',
        'SUBMITTED',
        'REVISION_REQUIRED',
        'COMPLETED',
        'ARCHIVED',
      ];

      // Verify all statuses are in the transition map
      allStatuses.forEach((status) => {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
      });
    });

    it('should reject transition from COMPLETED to anything except ARCHIVED', () => {
      expect(validateStatusTransition('COMPLETED', 'DRAFT').valid).toBe(false);
      expect(validateStatusTransition('COMPLETED', 'INTAKE_COMPLETE').valid).toBe(false);
      expect(validateStatusTransition('COMPLETED', 'SUBMITTED').valid).toBe(false);
      expect(validateStatusTransition('COMPLETED', 'ARCHIVED').valid).toBe(true);
    });
  });
});
