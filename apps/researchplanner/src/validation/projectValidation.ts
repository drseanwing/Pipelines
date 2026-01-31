/**
 * QI Research Pipeline - Project Validation
 *
 * This module provides validation functions for project status, stage completion,
 * and stage advancement in the QI/Research Project Development Pipeline.
 *
 * @module validation/projectValidation
 */

import {
  ProjectStatus,
  type Project,
} from '../types/index.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Pipeline stages in order
 */
export type PipelineStage =
  | 'intake'
  | 'research'
  | 'methodology'
  | 'ethics'
  | 'documents';

/**
 * Stage validation result
 */
export interface StageValidation {
  /** Stage being validated */
  stage: PipelineStage;
  /** Whether the stage is complete */
  isComplete: boolean;
  /** Whether the stage is approved */
  isApproved: boolean;
  /** Missing requirements for completion */
  missingRequirements: string[];
  /** Optional warnings */
  warnings: string[];
  /** Completion percentage (0-100) */
  completionPercentage: number;
}

/**
 * Stage advancement check result
 */
export interface AdvancementCheck {
  /** Target stage for advancement */
  targetStage: PipelineStage;
  /** Whether advancement is allowed */
  canAdvance: boolean;
  /** Reasons why advancement is blocked (if any) */
  blockers: string[];
  /** Prerequisites that must be met */
  prerequisites: string[];
  /** Current stage */
  currentStage: PipelineStage;
}

/**
 * Required approvals result
 */
export interface RequiredApprovalsResult {
  /** All required approvals */
  approvals: string[];
  /** Approvals that are pending */
  pendingApprovals: string[];
  /** Approvals that are complete */
  completedApprovals: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Pipeline stages in sequential order
 */
export const PIPELINE_STAGES: PipelineStage[] = [
  'intake',
  'research',
  'methodology',
  'ethics',
  'documents',
];

/**
 * Status values that indicate a stage is complete
 */
const STAGE_COMPLETE_STATUSES: Record<PipelineStage, ProjectStatus[]> = {
  intake: [
    ProjectStatus.INTAKE_COMPLETE,
    ProjectStatus.INTAKE_APPROVED,
    ProjectStatus.RESEARCH_COMPLETE,
    ProjectStatus.RESEARCH_APPROVED,
    ProjectStatus.METHODOLOGY_COMPLETE,
    ProjectStatus.METHODOLOGY_APPROVED,
    ProjectStatus.ETHICS_COMPLETE,
    ProjectStatus.ETHICS_APPROVED,
    ProjectStatus.DOCUMENTS_COMPLETE,
    ProjectStatus.DOCUMENTS_APPROVED,
    ProjectStatus.SUBMITTED,
    ProjectStatus.COMPLETED,
  ],
  research: [
    ProjectStatus.RESEARCH_COMPLETE,
    ProjectStatus.RESEARCH_APPROVED,
    ProjectStatus.METHODOLOGY_COMPLETE,
    ProjectStatus.METHODOLOGY_APPROVED,
    ProjectStatus.ETHICS_COMPLETE,
    ProjectStatus.ETHICS_APPROVED,
    ProjectStatus.DOCUMENTS_COMPLETE,
    ProjectStatus.DOCUMENTS_APPROVED,
    ProjectStatus.SUBMITTED,
    ProjectStatus.COMPLETED,
  ],
  methodology: [
    ProjectStatus.METHODOLOGY_COMPLETE,
    ProjectStatus.METHODOLOGY_APPROVED,
    ProjectStatus.ETHICS_COMPLETE,
    ProjectStatus.ETHICS_APPROVED,
    ProjectStatus.DOCUMENTS_COMPLETE,
    ProjectStatus.DOCUMENTS_APPROVED,
    ProjectStatus.SUBMITTED,
    ProjectStatus.COMPLETED,
  ],
  ethics: [
    ProjectStatus.ETHICS_COMPLETE,
    ProjectStatus.ETHICS_APPROVED,
    ProjectStatus.DOCUMENTS_COMPLETE,
    ProjectStatus.DOCUMENTS_APPROVED,
    ProjectStatus.SUBMITTED,
    ProjectStatus.COMPLETED,
  ],
  documents: [
    ProjectStatus.DOCUMENTS_COMPLETE,
    ProjectStatus.DOCUMENTS_APPROVED,
    ProjectStatus.SUBMITTED,
    ProjectStatus.COMPLETED,
  ],
};

/**
 * Required fields for each stage to be considered complete
 */
const STAGE_REQUIREMENTS: Record<PipelineStage, string[]> = {
  intake: [
    'intake.projectTitle',
    'intake.project_type',
    'intake.conceptDescription',
    'intake.clinicalProblem',
    'intake.targetPopulation',
    'intake.setting',
    'intake.principalInvestigator',
    'intake.intendedOutcomes',
    'classification',
    'frameworks',
  ],
  research: [
    'research.searchStrategy',
    'research.primaryLiterature',
    'research.gapAnalysis',
    'research.evidenceSynthesis',
    'research.citations',
  ],
  methodology: [
    'methodology.studyDesign',
    'methodology.participants',
    'methodology.outcomes',
    'methodology.procedures',
    'methodology.analysisPlan',
    'methodology.timeline',
  ],
  ethics: [
    'ethics.ethics_pathway',
    'ethics.risk_assessment',
    'ethics.consent_requirements',
    'ethics.data_governance',
    'ethics.governance_checklist',
  ],
  documents: [
    'documents.generated',
    'documents.metadata',
  ],
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that a project has the expected status
 *
 * @param project - Project to validate
 * @param expectedStatus - Expected status value
 * @returns True if project has the expected status
 *
 * @example
 * ```typescript
 * const isValid = validateProjectStatus(project, 'INTAKE_COMPLETE');
 * if (isValid) {
 *   // Project is at intake complete stage
 * }
 * ```
 */
export function validateProjectStatus(
  project: Project,
  expectedStatus: ProjectStatus
): boolean {
  return project.status === expectedStatus;
}

/**
 * Validate stage completion for a project
 *
 * Checks whether all required data for a stage is present and the stage
 * has been marked as complete.
 *
 * @param project - Project to validate
 * @param stage - Pipeline stage to check
 * @returns Stage validation result with completion details
 *
 * @example
 * ```typescript
 * const validation = validateStageCompletion(project, 'research');
 * if (!validation.isComplete) {
 *   console.log('Missing:', validation.missingRequirements);
 * }
 * ```
 */
export function validateStageCompletion(
  project: Project,
  stage: PipelineStage
): StageValidation {
  const requirements = STAGE_REQUIREMENTS[stage];
  const missingRequirements: string[] = [];
  const warnings: string[] = [];

  // Check each requirement
  for (const requirement of requirements) {
    const value = getNestedValue(project, requirement);
    if (value === undefined || value === null) {
      missingRequirements.push(requirement);
    } else if (Array.isArray(value) && value.length === 0) {
      // Empty arrays are considered incomplete for most fields
      if (!requirement.includes('coInvestigators')) {
        missingRequirements.push(`${requirement} (empty)`);
      }
    }
  }

  // Calculate completion percentage
  const completedCount = requirements.length - missingRequirements.length;
  const completionPercentage = Math.round((completedCount / requirements.length) * 100);

  // Check if stage is complete based on status
  const isComplete = STAGE_COMPLETE_STATUSES[stage].includes(project.status);

  // Check if stage is approved based on checkpoints
  const isApproved = isStageApproved(project, stage);

  // Add warnings for stages that are complete but not approved
  if (isComplete && !isApproved) {
    warnings.push(`Stage '${stage}' is complete but awaiting approval`);
  }

  // Add warnings for stages with partial data
  if (completionPercentage > 0 && completionPercentage < 100) {
    warnings.push(`Stage '${stage}' is ${completionPercentage}% complete`);
  }

  return {
    stage,
    isComplete,
    isApproved,
    missingRequirements,
    warnings,
    completionPercentage,
  };
}

/**
 * Check if a project can advance to a target stage
 *
 * Validates that all prerequisite stages are complete and approved
 * before allowing advancement.
 *
 * @param project - Project to check
 * @param targetStage - Stage to advance to
 * @returns Advancement check result with blockers if any
 *
 * @example
 * ```typescript
 * const check = canAdvanceToStage(project, 'methodology');
 * if (check.canAdvance) {
 *   // Safe to proceed to methodology stage
 * } else {
 *   console.log('Cannot advance:', check.blockers);
 * }
 * ```
 */
export function canAdvanceToStage(
  project: Project,
  targetStage: PipelineStage
): AdvancementCheck {
  const targetIndex = PIPELINE_STAGES.indexOf(targetStage);
  const currentStage = getCurrentStage(project);
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
  const blockers: string[] = [];
  const prerequisites: string[] = [];

  // Cannot go backward in the pipeline
  if (targetIndex < currentIndex) {
    blockers.push(`Cannot go backward from '${currentStage}' to '${targetStage}'`);
    return {
      targetStage,
      canAdvance: false,
      blockers,
      prerequisites,
      currentStage,
    };
  }

  // Check all prerequisite stages
  for (let i = 0; i < targetIndex; i++) {
    const stage = PIPELINE_STAGES[i];
    if (!stage) {continue;} // Skip if stage is undefined
    
    prerequisites.push(`${stage} stage must be complete and approved`);

    const validation = validateStageCompletion(project, stage);

    if (!validation.isComplete) {
      blockers.push(
        `Stage '${stage}' is not complete. Missing: ${validation.missingRequirements.join(', ')}`
      );
    }

    if (!validation.isApproved) {
      blockers.push(`Stage '${stage}' is not approved`);
    }
  }

  // Check if project is in a blocked state
  if (project.status === ProjectStatus.REVISION_REQUIRED) {
    blockers.push('Project requires revision before advancing');
  }

  if (project.status === ProjectStatus.ARCHIVED) {
    blockers.push('Archived projects cannot advance');
  }

  return {
    targetStage,
    canAdvance: blockers.length === 0,
    blockers,
    prerequisites,
    currentStage,
  };
}

/**
 * Get required approvals for a project based on its current state
 *
 * Returns all approvals needed for the project, along with which are
 * pending and which are completed.
 *
 * @param project - Project to check
 * @returns Required approvals with status
 *
 * @example
 * ```typescript
 * const approvals = getRequiredApprovals(project);
 * console.log('Pending approvals:', approvals.pendingApprovals);
 * ```
 */
export function getRequiredApprovals(project: Project): string[] {
  const approvals: string[] = [];
  const currentStage = getCurrentStage(project);
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);

  // All stages up to and including current need approval
  for (let i = 0; i <= currentIndex; i++) {
    const stage = PIPELINE_STAGES[i];
    const approvalName = `${stage}_approval`;
    approvals.push(approvalName);
  }

  // Add ethics-specific approvals if in ethics or later stage
  if (currentIndex >= PIPELINE_STAGES.indexOf('ethics')) {
    if (project.ethics?.ethics_pathway) {
      const pathway = project.ethics.ethics_pathway.pathway;

      if (pathway === 'FULL_HREC_REVIEW' || pathway === 'HYBRID_REVIEW') {
        approvals.push('hrec_approval');
      }

      if (project.ethics.ethics_pathway.requires_rgo) {
        approvals.push('rgo_approval');
      }

      // Add site-specific approvals
      if (project.ethics.site_requirements) {
        for (const site of project.ethics.site_requirements) {
          if (site.requires_local_approval) {
            approvals.push(`site_approval_${site.site_id}`);
          }
        }
      }
    }
  }

  // Add grant-specific approvals if targeting a grant
  if (project.intake.grant_target) {
    approvals.push('grant_submission_approval');
  }

  return approvals;
}

/**
 * Get detailed required approvals with completion status
 *
 * @param project - Project to check
 * @returns Detailed approvals result
 */
export function getDetailedRequiredApprovals(project: Project): RequiredApprovalsResult {
  const approvals = getRequiredApprovals(project);
  const completedApprovals: string[] = [];
  const pendingApprovals: string[] = [];

  for (const approval of approvals) {
    if (isApprovalComplete(project, approval)) {
      completedApprovals.push(approval);
    } else {
      pendingApprovals.push(approval);
    }
  }

  return {
    approvals,
    pendingApprovals,
    completedApprovals,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a nested value from an object using dot notation
 *
 * @param obj - Object to get value from
 * @param path - Dot-notation path (e.g., 'intake.projectTitle')
 * @returns Value at path or undefined
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Check if a stage is approved based on project checkpoints
 *
 * @param project - Project to check
 * @param stage - Stage to check
 * @returns True if stage is approved
 */
function isStageApproved(project: Project, stage: PipelineStage): boolean {
  const checkpoints = project.checkpoints;

  switch (stage) {
    case 'intake':
      return checkpoints.intake_approved;
    case 'research':
      return checkpoints.research_approved;
    case 'methodology':
      return checkpoints.methodology_approved;
    case 'ethics':
      return checkpoints.ethics_approved;
    case 'documents':
      return checkpoints.documents_approved;
    default:
      return false;
  }
}

/**
 * Get the current stage of a project based on its status
 *
 * @param project - Project to check
 * @returns Current pipeline stage
 */
export function getCurrentStage(project: Project): PipelineStage {
  const status = project.status;

  if (
    status === ProjectStatus.DRAFT ||
    status === ProjectStatus.INTAKE_COMPLETE ||
    status === ProjectStatus.INTAKE_APPROVED
  ) {
    return 'intake';
  }

  if (
    status === ProjectStatus.RESEARCH_COMPLETE ||
    status === ProjectStatus.RESEARCH_APPROVED
  ) {
    return 'research';
  }

  if (
    status === ProjectStatus.METHODOLOGY_COMPLETE ||
    status === ProjectStatus.METHODOLOGY_APPROVED
  ) {
    return 'methodology';
  }

  if (
    status === ProjectStatus.ETHICS_COMPLETE ||
    status === ProjectStatus.ETHICS_APPROVED
  ) {
    return 'ethics';
  }

  if (
    status === ProjectStatus.DOCUMENTS_COMPLETE ||
    status === ProjectStatus.DOCUMENTS_APPROVED ||
    status === ProjectStatus.SUBMITTED ||
    status === ProjectStatus.COMPLETED
  ) {
    return 'documents';
  }

  // Default to intake for unknown statuses
  return 'intake';
}

/**
 * Check if a specific approval is complete
 *
 * @param project - Project to check
 * @param approval - Approval name
 * @returns True if approval is complete
 */
function isApprovalComplete(project: Project, approval: string): boolean {
  // Check checkpoint-based approvals
  if (approval === 'intake_approval') {
    return project.checkpoints.intake_approved;
  }
  if (approval === 'research_approval') {
    return project.checkpoints.research_approved;
  }
  if (approval === 'methodology_approval') {
    return project.checkpoints.methodology_approved;
  }
  if (approval === 'ethics_approval') {
    return project.checkpoints.ethics_approved;
  }
  if (approval === 'documents_approval') {
    return project.checkpoints.documents_approved;
  }

  // Check ethics-specific approvals
  if (approval === 'hrec_approval' && project.ethics?.ethics_pathway) {
    return project.ethics.ethics_pathway.status === 'APPROVED';
  }

  if (approval === 'rgo_approval' && project.ethics?.ethics_pathway) {
    // RGO approval is typically granted alongside HREC
    return project.ethics.ethics_pathway.status === 'APPROVED';
  }

  // Check site-specific approvals
  if (approval.startsWith('site_approval_') && project.ethics?.site_requirements) {
    const siteId = approval.replace('site_approval_', '');
    const site = project.ethics.site_requirements.find((s: any) => s.site_id === siteId);
    return site?.status === 'APPROVED';
  }

  // Grant submission approval is based on document completion
  if (approval === 'grant_submission_approval') {
    return project.status === ProjectStatus.SUBMITTED || project.status === ProjectStatus.COMPLETED;
  }

  return false;
}

/**
 * Get the next stage in the pipeline
 *
 * @param currentStage - Current pipeline stage
 * @returns Next stage or undefined if at end
 */
export function getNextStage(currentStage: PipelineStage): PipelineStage | undefined {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === PIPELINE_STAGES.length - 1) {
    return undefined;
  }
  return PIPELINE_STAGES[currentIndex + 1];
}

/**
 * Get the previous stage in the pipeline
 *
 * @param currentStage - Current pipeline stage
 * @returns Previous stage or undefined if at start
 */
export function getPreviousStage(currentStage: PipelineStage): PipelineStage | undefined {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
  if (currentIndex <= 0) {
    return undefined;
  }
  return PIPELINE_STAGES[currentIndex - 1];
}

/**
 * Get the status value for completing a stage
 *
 * @param stage - Pipeline stage
 * @returns ProjectStatus for stage completion
 */
export function getStageCompleteStatus(stage: PipelineStage): ProjectStatus {
  const statusMap: Record<PipelineStage, ProjectStatus> = {
    intake: ProjectStatus.INTAKE_COMPLETE,
    research: ProjectStatus.RESEARCH_COMPLETE,
    methodology: ProjectStatus.METHODOLOGY_COMPLETE,
    ethics: ProjectStatus.ETHICS_COMPLETE,
    documents: ProjectStatus.DOCUMENTS_COMPLETE,
  };
  return statusMap[stage];
}

/**
 * Get the status value for approving a stage
 *
 * @param stage - Pipeline stage
 * @returns ProjectStatus for stage approval
 */
export function getStageApprovedStatus(stage: PipelineStage): ProjectStatus {
  const statusMap: Record<PipelineStage, ProjectStatus> = {
    intake: ProjectStatus.INTAKE_APPROVED,
    research: ProjectStatus.RESEARCH_APPROVED,
    methodology: ProjectStatus.METHODOLOGY_APPROVED,
    ethics: ProjectStatus.ETHICS_APPROVED,
    documents: ProjectStatus.DOCUMENTS_APPROVED,
  };
  return statusMap[stage];
}

/**
 * Validate all stages up to and including the current stage
 *
 * @param project - Project to validate
 * @returns Array of stage validations
 */
export function validateAllStages(project: Project): StageValidation[] {
  const currentStage = getCurrentStage(project);
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
  const validations: StageValidation[] = [];

  for (let i = 0; i <= currentIndex; i++) {
    const stage = PIPELINE_STAGES[i];
    if (!stage) {continue;} // Skip if stage is undefined
    validations.push(validateStageCompletion(project, stage));
  }

  return validations;
}

/**
 * Check if project has completed all stages
 *
 * @param project - Project to check
 * @returns True if all stages are complete and approved
 */
export function isProjectComplete(project: Project): boolean {
  for (const stage of PIPELINE_STAGES) {
    const validation = validateStageCompletion(project, stage);
    if (!validation.isComplete || !validation.isApproved) {
      return false;
    }
  }
  return true;
}

/**
 * Get overall project completion percentage
 *
 * @param project - Project to check
 * @returns Completion percentage (0-100)
 */
export function getProjectCompletionPercentage(project: Project): number {
  let totalPercentage = 0;

  for (const stage of PIPELINE_STAGES) {
    const validation = validateStageCompletion(project, stage);
    // Each stage contributes 20% (5 stages = 100%)
    const stageWeight = 100 / PIPELINE_STAGES.length;
    totalPercentage += (validation.completionPercentage / 100) * stageWeight;
  }

  return Math.round(totalPercentage);
}
