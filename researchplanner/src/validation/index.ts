/**
 * QI Research Pipeline - Validation Module
 *
 * This module provides validation functionality for the QI/Research Project
 * Development Pipeline. It includes document validation rules, project
 * validation, and stage completion checking.
 *
 * @module validation
 *
 * @example
 * ```typescript
 * import {
 *   // Document validation
 *   VALIDATION_RULES,
 *   validateDocument,
 *   checkWordLimits,
 *   checkRequiredSections,
 *   checkCrossReferences,
 *
 *   // Project validation
 *   validateProjectStatus,
 *   validateStageCompletion,
 *   canAdvanceToStage,
 *   getRequiredApprovals,
 * } from '@/validation';
 *
 * // Validate a protocol document
 * const docResult = validateDocument(protocolDocument, 'protocol');
 * if (!docResult.isValid) {
 *   console.log('Document errors:', docResult.errors);
 * }
 *
 * // Check if project can advance to methodology stage
 * const advanceCheck = canAdvanceToStage(project, 'methodology');
 * if (advanceCheck.canAdvance) {
 *   // Safe to proceed
 * }
 * ```
 */

// ============================================================================
// Document Validation Rules
// ============================================================================

export {
  // Constants
  VALIDATION_RULES,
  CROSS_REFERENCE_FIELDS,

  // Types
  type FormattingRequirements,
  type DocumentValidationRule,
  type WordLimitValidation,
  type SectionValidation,
  type CrossReferenceValidation,
  type CrossReferenceIssue,
  type ValidationResult,

  // Validation Functions
  validateDocument,
  checkWordLimits,
  checkRequiredSections,
  checkCrossReferences,

  // Utility Functions
  countWords,
  getValidationRules,
  getWordLimit,
  isSectionRequired,
  validateSectionWordCount,
  getRequiredSections,
  getFormattingRequirements,
} from './rules.js';

// ============================================================================
// Project Validation
// ============================================================================

export {
  // Constants
  PIPELINE_STAGES,

  // Types
  type PipelineStage,
  type StageValidation,
  type AdvancementCheck,
  type RequiredApprovalsResult,

  // Validation Functions
  validateProjectStatus,
  validateStageCompletion,
  canAdvanceToStage,
  getRequiredApprovals,
  getDetailedRequiredApprovals,

  // Utility Functions
  getCurrentStage,
  getNextStage,
  getPreviousStage,
  getStageCompleteStatus,
  getStageApprovedStatus,
  validateAllStages,
  isProjectComplete,
  getProjectCompletionPercentage,
} from './projectValidation.js';
