/**
 * Checkpoint management for pipeline stages
 * Phase 3.11 - Checkpoint Management
 */

import { updateProject, getProjectById } from '../db/queries/projects.js';
import { createAuditEntry } from '../db/queries/audit.js';
import { AuditAction } from '../types/audit.js';
import { ProjectStatus } from '../types/project.js';

/**
 * Checkpoint webhook URL suffixes for each stage
 */
export const CHECKPOINT_WEBHOOKS = {
  intake: 'intake-approved',
  research: 'research-approved',
  methods: 'methods-approved',
  ethics: 'ethics-approved',
  documents: 'documents-approved'
} as const;

export type CheckpointStage = keyof typeof CHECKPOINT_WEBHOOKS;

/**
 * Checkpoint status information
 */
export interface CheckpointStatus {
  approved: boolean;
  timestamp?: string;
  approver?: string;
  feedback?: string;
}

/**
 * Checkpoint data structure
 */
export interface Checkpoint {
  project_id: string;
  stage: CheckpointStage;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  webhook_suffix: string;
}

/**
 * Create a new checkpoint for a project stage
 * Sets up human-in-loop review point
 *
 * @param project_id - Project UUID
 * @param stage - Pipeline stage name
 * @returns Checkpoint configuration
 */
export async function createCheckpoint(
  project_id: string,
  stage: CheckpointStage
): Promise<Checkpoint> {
  // Verify project exists
  const project = await getProjectById(project_id);
  if (!project) {
    throw new Error(`Project not found: ${project_id}`);
  }

  // Create checkpoint record
  const checkpoint: Checkpoint = {
    project_id,
    stage,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    webhook_suffix: CHECKPOINT_WEBHOOKS[stage]
  };

  // Log checkpoint creation
  await createAuditEntry({
    project_id,
    action: AuditAction.STAGE_STARTED,
    actor: 'system',
    details: {
      stage,
      checkpoint_created: true,
      webhook_suffix: checkpoint.webhook_suffix
    }
  });

  return checkpoint;
}

/**
 * Approve a checkpoint and advance pipeline
 * Updates project status and checkpoints tracking
 *
 * @param project_id - Project UUID
 * @param stage - Pipeline stage name
 * @param approverEmail - Email of approver
 */
export async function approveCheckpoint(
  project_id: string,
  stage: CheckpointStage,
  approverEmail: string
): Promise<void> {
  // Fetch current project
  const project = await getProjectById(project_id);
  if (!project) {
    throw new Error(`Project not found: ${project_id}`);
  }

  // Update checkpoint tracking
  const checkpoints = { ...project.checkpoints };
  const checkpointKey = `${stage}_approved` as keyof typeof checkpoints;
  checkpoints[checkpointKey] = true;

  // Determine new status based on stage
  const statusMap: Record<CheckpointStage, ProjectStatus> = {
    intake: 'INTAKE_APPROVED',
    research: 'RESEARCH_APPROVED',
    methods: 'METHODOLOGY_APPROVED',
    ethics: 'ETHICS_APPROVED',
    documents: 'DOCUMENTS_APPROVED'
  };

  const newStatus = statusMap[stage];

  // Update project in database
  await updateProject(project_id, {
    status: newStatus,
    checkpoints,
    updated_at: new Date().toISOString()
  });

  // Log approval
  await createAuditEntry({
    project_id,
    action: AuditAction.CHECKPOINT_APPROVED,
    actor: approverEmail,
    details: {
      stage,
      previous_status: project.status,
      new_status: newStatus
    },
    previous_state: { status: project.status, checkpoints: project.checkpoints },
    new_state: { status: newStatus, checkpoints }
  });
}

/**
 * Reject a checkpoint with feedback
 * Marks project as requiring revision
 *
 * @param project_id - Project UUID
 * @param stage - Pipeline stage name
 * @param reason - Rejection reason/feedback
 */
export async function rejectCheckpoint(
  project_id: string,
  stage: CheckpointStage,
  reason: string
): Promise<void> {
  // Fetch current project
  const project = await getProjectById(project_id);
  if (!project) {
    throw new Error(`Project not found: ${project_id}`);
  }

  // Update checkpoint tracking
  const checkpoints = { ...project.checkpoints };
  const checkpointKey = `${stage}_approved` as keyof typeof checkpoints;
  checkpoints[checkpointKey] = false;

  // Set status to revision required
  const newStatus: ProjectStatus = 'REVISION_REQUIRED';

  // Update project in database
  await updateProject(project_id, {
    status: newStatus,
    checkpoints,
    updated_at: new Date().toISOString()
  });

  // Log rejection
  await createAuditEntry({
    project_id,
    action: AuditAction.CHECKPOINT_REJECTED,
    actor: 'user',
    details: {
      stage,
      reason,
      previous_status: project.status
    },
    previous_state: { status: project.status },
    new_state: { status: newStatus, feedback: reason }
  });
}

/**
 * Get current checkpoint status for a stage
 * Returns approval state and metadata
 *
 * @param project_id - Project UUID
 * @param stage - Pipeline stage name
 * @returns Checkpoint status information
 */
export async function getCheckpointStatus(
  project_id: string,
  stage: CheckpointStage
): Promise<CheckpointStatus> {
  // Fetch project
  const project = await getProjectById(project_id);
  if (!project) {
    throw new Error(`Project not found: ${project_id}`);
  }

  // Get checkpoint approval state
  const checkpointKey = `${stage}_approved` as keyof typeof project.checkpoints;
  const approved = project.checkpoints[checkpointKey] || false;

  // Return status
  return {
    approved,
    timestamp: project.updated_at
  };
}
