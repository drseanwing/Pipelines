/**
 * Audit log database queries
 * Phase 2.15 - Database Queries - Audit Log
 */

import { getPool } from '../client.js';
import type { AuditEntry, AuditAction } from '../../types/index.js';

/**
 * Create a new audit log entry
 * @param entry - Audit entry data (without id and timestamp which are auto-generated)
 * @returns Promise resolving to the created audit entry
 */
export async function createAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'timestamp'>
): Promise<AuditEntry> {
  const pool = getPool();

  const query = `
    INSERT INTO audit_log (
      project_id,
      action,
      actor,
      details,
      previous_state,
      new_state,
      ip_address,
      session_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, project_id, timestamp, action, actor, details,
              previous_state, new_state, ip_address, session_id
  `;

  const values = [
    entry.project_id,
    entry.action,
    entry.actor || null,
    entry.details ? JSON.stringify(entry.details) : null,
    entry.previous_state ? JSON.stringify(entry.previous_state) : null,
    entry.new_state ? JSON.stringify(entry.new_state) : null,
    entry.ip_address || null,
    entry.session_id || null,
  ];

  try {
    const result = await pool.query(query, values);
    return mapRowToAuditEntry(result.rows[0]);
  } catch (error) {
    console.error('Error creating audit entry:', error);
    throw new Error(`Failed to create audit entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all audit log entries for a specific project
 * @param projectId - Project UUID
 * @returns Promise resolving to array of audit entries
 */
export async function getAuditLogByProject(projectId: string): Promise<AuditEntry[]> {
  const pool = getPool();

  const query = `
    SELECT id, project_id, timestamp, action, actor, details,
           previous_state, new_state, ip_address, session_id
    FROM audit_log
    WHERE project_id = $1
    ORDER BY timestamp ASC
  `;

  try {
    const result = await pool.query(query, [projectId]);
    return result.rows.map(mapRowToAuditEntry);
  } catch (error) {
    console.error('Error fetching audit log by project:', error);
    throw new Error(`Failed to fetch audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all audit log entries for a specific action type
 * @param action - Audit action type
 * @returns Promise resolving to array of audit entries
 */
export async function getAuditLogByAction(action: AuditAction): Promise<AuditEntry[]> {
  const pool = getPool();

  const query = `
    SELECT id, project_id, timestamp, action, actor, details,
           previous_state, new_state, ip_address, session_id
    FROM audit_log
    WHERE action = $1
    ORDER BY timestamp DESC
  `;

  try {
    const result = await pool.query(query, [action]);
    return result.rows.map(mapRowToAuditEntry);
  } catch (error) {
    console.error('Error fetching audit log by action:', error);
    throw new Error(`Failed to fetch audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get audit log entries for a project within a time range
 * @param projectId - Project UUID
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Promise resolving to array of audit entries
 */
export async function getAuditLogByDateRange(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<AuditEntry[]> {
  const pool = getPool();

  const query = `
    SELECT id, project_id, timestamp, action, actor, details,
           previous_state, new_state, ip_address, session_id
    FROM audit_log
    WHERE project_id = $1
      AND timestamp >= $2
      AND timestamp <= $3
    ORDER BY timestamp ASC
  `;

  try {
    const result = await pool.query(query, [projectId, startDate, endDate]);
    return result.rows.map(mapRowToAuditEntry);
  } catch (error) {
    console.error('Error fetching audit log by date range:', error);
    throw new Error(`Failed to fetch audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get recent audit log entries across all projects
 * @param limit - Maximum number of entries to return (default: 100)
 * @returns Promise resolving to array of audit entries
 */
export async function getRecentAuditEntries(limit: number = 100): Promise<AuditEntry[]> {
  const pool = getPool();

  const query = `
    SELECT id, project_id, timestamp, action, actor, details,
           previous_state, new_state, ip_address, session_id
    FROM audit_log
    ORDER BY timestamp DESC
    LIMIT $1
  `;

  try {
    const result = await pool.query(query, [limit]);
    return result.rows.map(mapRowToAuditEntry);
  } catch (error) {
    console.error('Error fetching recent audit entries:', error);
    throw new Error(`Failed to fetch audit entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Map database row to AuditEntry type
 * @param row - Database row
 * @returns AuditEntry object
 */
function mapRowToAuditEntry(row: any): AuditEntry {
  return {
    id: row.id,
    project_id: row.project_id,
    timestamp: row.timestamp.toISOString(),
    action: row.action,
    actor: row.actor || undefined,
    details: row.details || undefined,
    previous_state: row.previous_state || undefined,
    new_state: row.new_state || undefined,
    ip_address: row.ip_address || undefined,
    session_id: row.session_id || undefined,
  };
}
