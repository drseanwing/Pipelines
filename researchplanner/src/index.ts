/**
 * Main Entry Point for QI/Research Pipeline
 * Phase 3.15 - Main Entry Point
 *
 * This module provides the main API for interacting with the pipeline:
 * - startPipeline: Initialize a new project from intake data
 * - getProjectStatus: Retrieve current project state
 * - approveCheckpoint: Approve a stage checkpoint to continue
 * - rejectCheckpoint: Reject a checkpoint with feedback
 */

import { createPool, closePool } from './db/index.js';
import {
  createProject,
  getProjectById,
  updateProject,
  updateProjectStatus,
} from './db/index.js';
import type { IntakeData, Project, Checkpoints } from './types/index.js';

// Initialize database connection on module load
const pool = createPool();

/**
 * Start the pipeline with intake data
 * Creates a new project record and returns it in DRAFT status
 *
 * @param intakeData - Initial project intake data
 * @param ownerId - Optional owner/user ID
 * @returns Promise resolving to created project
 * @throws Error if creation fails
 */
export async function startPipeline(
  intakeData: IntakeData,
  ownerId?: string
): Promise<Project> {
  try {
    const project = await createProject(intakeData, ownerId);
    console.log(`Project created with ID: ${project.id}`);
    return project;
  } catch (error) {
    console.error('Failed to start pipeline:', error);
    throw new Error(
      `Pipeline start failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get current project status and data
 *
 * @param projectId - Project UUID
 * @returns Promise resolving to project or null if not found
 * @throws Error if database query fails
 */
export async function getProjectStatus(projectId: string): Promise<Project | null> {
  try {
    const project = await getProjectById(projectId);
    return project;
  } catch (error) {
    console.error('Failed to get project status:', error);
    throw new Error(
      `Failed to retrieve project: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Approve a checkpoint to allow pipeline to continue to next stage
 *
 * @param projectId - Project UUID
 * @param stage - Stage name (intake, research, methodology, ethics, documents)
 * @returns Promise resolving when approval is recorded
 * @throws Error if project not found or update fails
 */
export async function approveCheckpoint(
  projectId: string,
  stage: 'intake' | 'research' | 'methodology' | 'ethics' | 'documents'
): Promise<void> {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Update checkpoint flag
    const checkpointKey = `${stage}_approved` as keyof Checkpoints;
    const updatedCheckpoints: Checkpoints = {
      ...project.checkpoints,
      [checkpointKey]: true,
    };

    // Update project status based on stage
    const statusMap: Record<typeof stage, string> = {
      intake: 'INTAKE_APPROVED',
      research: 'RESEARCH_APPROVED',
      methodology: 'METHODOLOGY_APPROVED',
      ethics: 'ETHICS_APPROVED',
      documents: 'DOCUMENTS_APPROVED',
    };

    await updateProject(projectId, {
      checkpoints: updatedCheckpoints,
      status: statusMap[stage] as any,
    });

    console.log(`Checkpoint approved: ${projectId} - ${stage}`);
  } catch (error) {
    console.error('Failed to approve checkpoint:', error);
    throw new Error(
      `Checkpoint approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reject a checkpoint with feedback
 * Sets status to REVISION_REQUIRED and stores rejection reason
 *
 * @param projectId - Project UUID
 * @param stage - Stage name
 * @param reason - Rejection reason/feedback
 * @returns Promise resolving when rejection is recorded
 * @throws Error if project not found or update fails
 */
export async function rejectCheckpoint(
  projectId: string,
  stage: 'intake' | 'research' | 'methodology' | 'ethics' | 'documents',
  reason: string
): Promise<void> {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Update status to require revision
    await updateProjectStatus(projectId, 'REVISION_REQUIRED');

    // TODO: Store rejection reason in audit log when audit utilities are implemented
    console.log(`Checkpoint rejected: ${projectId} - ${stage}: ${reason}`);
  } catch (error) {
    console.error('Failed to reject checkpoint:', error);
    throw new Error(
      `Checkpoint rejection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Graceful shutdown handler
 * Closes database connections when process terminates
 */
async function shutdown(): Promise<void> {
  console.log('Shutting down pipeline...');
  try {
    await closePool();
    console.log('Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Export types for consumers
export type {
  IntakeData,
  Project,
  ProjectStatus,
  ProjectType,
  GrantType,
  Investigator,
  TimelineConstraint,
  Classification,
  Frameworks,
  Checkpoints,
} from './types/index.js';
