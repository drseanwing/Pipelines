/**
 * Project database queries
 * Phase 2.14 - Database Queries - Projects
 */

import { getPool } from '../client.js';
import type { Project, IntakeData, ProjectStatus } from '../../types/index.js';

/**
 * Create a new project record
 * @param intake - Intake data for the project
 * @param ownerId - Optional owner ID (user ID)
 * @returns Promise resolving to the created project
 */
export async function createProject(
  intake: IntakeData,
  ownerId?: string
): Promise<Project> {
  const pool = getPool();

  const query = `
    INSERT INTO projects (
      status,
      intake,
      classification,
      frameworks,
      checkpoints,
      owner_id
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, status, created_at, updated_at, intake, classification,
              frameworks, research, methodology, ethics, documents,
              checkpoints, owner_id, deleted_at
  `;

  const values = [
    'DRAFT' as ProjectStatus,
    JSON.stringify(intake),
    null, // classification will be set by intake agent
    null, // frameworks will be set by intake agent
    JSON.stringify({
      intake_approved: false,
      research_approved: false,
      methodology_approved: false,
      ethics_approved: false,
      documents_approved: false,
    }),
    ownerId || null,
  ];

  try {
    const result = await pool.query(query, values);
    return mapRowToProject(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a project by ID
 * @param id - Project UUID
 * @returns Promise resolving to the project or null if not found
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const pool = getPool();

  const query = `
    SELECT id, status, created_at, updated_at, intake, classification,
           frameworks, research, methodology, ethics, documents,
           checkpoints, owner_id, deleted_at
    FROM projects
    WHERE id = $1 AND deleted_at IS NULL
  `;

  try {
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToProject(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    throw new Error(`Failed to fetch project: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update a project with partial data
 * @param id - Project UUID
 * @param updates - Partial project data to update
 * @returns Promise resolving to the updated project
 */
export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project> {
  const pool = getPool();

  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build dynamic update query based on provided fields
  if (updates.status) {
    updateFields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (updates.intake) {
    updateFields.push(`intake = $${paramIndex++}`);
    values.push(JSON.stringify(updates.intake));
  }

  if (updates.classification) {
    updateFields.push(`classification = $${paramIndex++}`);
    values.push(JSON.stringify(updates.classification));
  }

  if (updates.frameworks) {
    updateFields.push(`frameworks = $${paramIndex++}`);
    values.push(JSON.stringify(updates.frameworks));
  }

  if (updates.research) {
    updateFields.push(`research = $${paramIndex++}`);
    values.push(JSON.stringify(updates.research));
  }

  if (updates.methodology) {
    updateFields.push(`methodology = $${paramIndex++}`);
    values.push(JSON.stringify(updates.methodology));
  }

  if (updates.ethics) {
    updateFields.push(`ethics = $${paramIndex++}`);
    values.push(JSON.stringify(updates.ethics));
  }

  if (updates.documents) {
    updateFields.push(`documents = $${paramIndex++}`);
    values.push(JSON.stringify(updates.documents));
  }

  if (updates.checkpoints) {
    updateFields.push(`checkpoints = $${paramIndex++}`);
    values.push(JSON.stringify(updates.checkpoints));
  }

  // Always update updated_at
  updateFields.push('updated_at = CURRENT_TIMESTAMP');

  if (updateFields.length === 1) {
    // Only updated_at was set, no actual updates
    throw new Error('No fields to update');
  }

  values.push(id);

  const query = `
    UPDATE projects
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING id, status, created_at, updated_at, intake, classification,
              frameworks, research, methodology, ethics, documents,
              checkpoints, owner_id, deleted_at
  `;

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Project not found or already deleted');
    }
    return mapRowToProject(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    throw new Error(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update project status
 * @param id - Project UUID
 * @param status - New project status
 * @returns Promise resolving to the updated project
 */
export async function updateProjectStatus(
  id: string,
  status: ProjectStatus
): Promise<Project> {
  const pool = getPool();

  const query = `
    UPDATE projects
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND deleted_at IS NULL
    RETURNING id, status, created_at, updated_at, intake, classification,
              frameworks, research, methodology, ethics, documents,
              checkpoints, owner_id, deleted_at
  `;

  try {
    const result = await pool.query(query, [status, id]);
    if (result.rows.length === 0) {
      throw new Error('Project not found or already deleted');
    }
    return mapRowToProject(result.rows[0]);
  } catch (error) {
    console.error('Error updating project status:', error);
    throw new Error(`Failed to update project status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update a specific stage's data in the project
 * @param id - Project UUID
 * @param stage - Stage name (research, methodology, ethics, documents)
 * @param data - Stage data to store
 * @returns Promise resolving to the updated project
 */
export async function updateProjectStage(
  id: string,
  stage: 'research' | 'methodology' | 'ethics' | 'documents',
  data: any
): Promise<Project> {
  const pool = getPool();

  const query = `
    UPDATE projects
    SET ${stage} = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND deleted_at IS NULL
    RETURNING id, status, created_at, updated_at, intake, classification,
              frameworks, research, methodology, ethics, documents,
              checkpoints, owner_id, deleted_at
  `;

  try {
    const result = await pool.query(query, [JSON.stringify(data), id]);
    if (result.rows.length === 0) {
      throw new Error('Project not found or already deleted');
    }
    return mapRowToProject(result.rows[0]);
  } catch (error) {
    console.error(`Error updating project ${stage}:`, error);
    throw new Error(`Failed to update project ${stage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all projects for a specific owner
 * @param ownerId - Owner UUID
 * @returns Promise resolving to array of projects
 */
export async function getProjectsByOwner(ownerId: string): Promise<Project[]> {
  const pool = getPool();

  const query = `
    SELECT id, status, created_at, updated_at, intake, classification,
           frameworks, research, methodology, ethics, documents,
           checkpoints, owner_id, deleted_at
    FROM projects
    WHERE owner_id = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [ownerId]);
    return result.rows.map(mapRowToProject);
  } catch (error) {
    console.error('Error fetching projects by owner:', error);
    throw new Error(`Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all projects with a specific status
 * @param status - Project status
 * @returns Promise resolving to array of projects
 */
export async function getProjectsByStatus(status: ProjectStatus): Promise<Project[]> {
  const pool = getPool();

  const query = `
    SELECT id, status, created_at, updated_at, intake, classification,
           frameworks, research, methodology, ethics, documents,
           checkpoints, owner_id, deleted_at
    FROM projects
    WHERE status = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [status]);
    return result.rows.map(mapRowToProject);
  } catch (error) {
    console.error('Error fetching projects by status:', error);
    throw new Error(`Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Soft delete a project
 * @param id - Project UUID
 */
export async function softDeleteProject(id: string): Promise<void> {
  const pool = getPool();

  const query = `
    UPDATE projects
    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NULL
  `;

  try {
    const result = await pool.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error('Project not found or already deleted');
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Map database row to Project type
 * @param row - Database row
 * @returns Project object
 */
function mapRowToProject(row: any): Project {
  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    intake: row.intake,
    classification: row.classification || undefined,
    frameworks: row.frameworks || undefined,
    research: row.research || undefined,
    methodology: row.methodology || undefined,
    ethics: row.ethics || undefined,
    documents: row.documents || undefined,
    checkpoints: row.checkpoints,
    owner_id: row.owner_id || undefined,
    deleted_at: row.deleted_at ? row.deleted_at.toISOString() : undefined,
  };
}
