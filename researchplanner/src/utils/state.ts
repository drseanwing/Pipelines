/**
 * State Management Utilities
 * Phase 3.2 - Project state management and status transitions
 */

import { v4 as uuidv4 } from 'uuid';
import type { Project, ProjectStatus } from '../types/index.js';
import { getProjectById, updateProject, updateProjectStatus } from '../db/queries/projects.js';

/**
 * Valid status transitions map
 * Defines which status transitions are allowed in the pipeline
 */
export const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['INTAKE_COMPLETE'],
  INTAKE_COMPLETE: ['INTAKE_APPROVED', 'DRAFT'],
  INTAKE_APPROVED: ['RESEARCH_COMPLETE', 'INTAKE_COMPLETE'],
  RESEARCH_COMPLETE: ['RESEARCH_APPROVED', 'INTAKE_APPROVED'],
  RESEARCH_APPROVED: ['METHODOLOGY_COMPLETE', 'RESEARCH_COMPLETE'],
  METHODOLOGY_COMPLETE: ['METHODOLOGY_APPROVED', 'RESEARCH_APPROVED'],
  METHODOLOGY_APPROVED: ['ETHICS_COMPLETE', 'METHODOLOGY_COMPLETE'],
  ETHICS_COMPLETE: ['ETHICS_APPROVED', 'METHODOLOGY_APPROVED'],
  ETHICS_APPROVED: ['DOCUMENTS_COMPLETE', 'ETHICS_COMPLETE'],
  DOCUMENTS_COMPLETE: ['DOCUMENTS_APPROVED', 'ETHICS_APPROVED'],
  DOCUMENTS_APPROVED: ['SUBMITTED', 'DOCUMENTS_COMPLETE'],
  SUBMITTED: ['REVISION_REQUIRED', 'COMPLETED', 'ARCHIVED'],
  REVISION_REQUIRED: ['INTAKE_COMPLETE', 'RESEARCH_COMPLETE', 'METHODOLOGY_COMPLETE', 'ETHICS_COMPLETE', 'DOCUMENTS_COMPLETE'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [], // Terminal state
};

/**
 * Generate a new project UUID
 * @returns A new UUID string
 */
export function generateProjectId(): string {
  return uuidv4();
}

/**
 * Get project state from database
 * @param projectId - The project UUID
 * @returns The project record or null if not found
 */
export async function getProjectState(projectId: string): Promise<Project | null> {
  return getProjectById(projectId);
}

/**
 * Update project state with partial updates
 * @param projectId - The project UUID
 * @param updates - Partial project updates
 * @returns The updated project record
 */
export async function updateProjectState(
  projectId: string,
  updates: Partial<Project>
): Promise<Project> {
  return updateProject(projectId, updates);
}

/**
 * Validate if a status transition is allowed
 * @param currentStatus - The current project status
 * @param newStatus - The desired new status
 * @returns True if transition is valid, false otherwise
 */
export function validateStatusTransition(
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Transition project status with validation
 * @param projectId - The project UUID
 * @param newStatus - The desired new status
 * @returns The updated project record
 * @throws Error if transition is invalid
 */
export async function transitionStatus(
  projectId: string,
  newStatus: ProjectStatus
): Promise<Project> {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  if (!validateStatusTransition(project.status, newStatus)) {
    throw new Error(
      `Invalid status transition from ${project.status} to ${newStatus}`
    );
  }

  return updateProjectStatus(projectId, newStatus);
}
