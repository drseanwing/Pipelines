/**
 * QI Research Pipeline - Audit Repository
 *
 * Repository for managing audit log entries. Handles logging of actions
 * and retrieval of project history for compliance and tracking purposes.
 *
 * @module db/repositories/AuditRepository
 */

import { Pool, QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../connection.js';
import { AuditEntry } from '../../types/index.js';
import { RepositoryError } from './BaseRepository.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Extended audit entry with database-specific fields
 */
export interface AuditRecord extends AuditEntry {
  /** Unique record identifier */
  id: string;
  /** Associated project ID */
  projectId: string;
}

/**
 * Input for creating an audit entry
 */
export interface LogActionInput {
  /** Associated project ID */
  projectId: string;
  /** Action type (e.g., 'STATUS_CHANGED', 'DOCUMENT_CREATED') */
  action: string;
  /** User or system that performed the action */
  actor?: string;
  /** Additional details about the action */
  details?: Record<string, unknown>;
  /** State before the action */
  previousState?: Record<string, unknown>;
  /** State after the action */
  newState?: Record<string, unknown>;
  /** IP address of the actor */
  ipAddress?: string;
  /** Session identifier */
  sessionId?: string;
}

/**
 * Options for filtering audit entries
 */
export interface AuditFilterOptions {
  /** Filter by action type */
  action?: string | string[];
  /** Filter by actor */
  actor?: string;
  /** Filter by date range (start) */
  startDate?: string;
  /** Filter by date range (end) */
  endDate?: string;
  /** Filter by session ID */
  sessionId?: string;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order (ASC or DESC by timestamp) */
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Audit statistics for a project
 */
export interface AuditStatistics {
  /** Total number of audit entries */
  totalEntries: number;
  /** Count of entries by action type */
  actionCounts: Record<string, number>;
  /** Count of entries by actor */
  actorCounts: Record<string, number>;
  /** First audit entry timestamp */
  firstEntry?: string;
  /** Last audit entry timestamp */
  lastEntry?: string;
}

// ============================================================================
// Audit Repository
// ============================================================================

/**
 * Repository for managing audit log entries
 *
 * Note: This repository does not extend BaseRepository because audit logs
 * are append-only and have different access patterns. They should never
 * be updated or deleted.
 *
 * @example
 * ```typescript
 * const auditRepo = new AuditRepository();
 *
 * // Log an action
 * await auditRepo.logAction({
 *   projectId: 'project-123',
 *   action: 'STATUS_CHANGED',
 *   actor: 'user-456',
 *   details: {
 *     previousStatus: 'DRAFT',
 *     newStatus: 'INTAKE_COMPLETE',
 *   },
 * });
 *
 * // Get project history
 * const history = await auditRepo.getProjectHistory('project-123');
 *
 * // Get filtered history
 * const statusChanges = await auditRepo.getProjectHistory('project-123', {
 *   action: 'STATUS_CHANGED',
 *   startDate: '2026-01-01T00:00:00Z',
 * });
 * ```
 */
export class AuditRepository {
  /** Database connection pool */
  protected readonly pool: Pool;
  /** Database table name */
  protected readonly tableName = 'audit_logs';

  constructor() {
    this.pool = pool;
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Log an action to the audit trail
   *
   * @param entry - Audit entry data
   */
  async logAction(entry: LogActionInput): Promise<void> {
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();

      const query = `
        INSERT INTO ${this.tableName} (
          id, project_id, timestamp, action, actor,
          details, previous_state, new_state, ip_address, session_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      await this.pool.query(query, [
        id,
        entry.projectId,
        timestamp,
        entry.action,
        entry.actor ?? null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.previousState ? JSON.stringify(entry.previousState) : null,
        entry.newState ? JSON.stringify(entry.newState) : null,
        entry.ipAddress ?? null,
        entry.sessionId ?? null,
      ]);
    } catch (error) {
      throw this.handleDatabaseError(error, 'logAction');
    }
  }

  /**
   * Log multiple actions in a batch (transactional)
   *
   * @param entries - Array of audit entries
   */
  async logActionsBatch(entries: LogActionInput[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const timestamp = new Date().toISOString();

      for (const entry of entries) {
        const id = uuidv4();

        await client.query(
          `
          INSERT INTO ${this.tableName} (
            id, project_id, timestamp, action, actor,
            details, previous_state, new_state, ip_address, session_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            id,
            entry.projectId,
            timestamp,
            entry.action,
            entry.actor ?? null,
            entry.details ? JSON.stringify(entry.details) : null,
            entry.previousState ? JSON.stringify(entry.previousState) : null,
            entry.newState ? JSON.stringify(entry.newState) : null,
            entry.ipAddress ?? null,
            entry.sessionId ?? null,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.handleDatabaseError(error, 'logActionsBatch');
    } finally {
      client.release();
    }
  }

  /**
   * Get the complete audit history for a project
   *
   * @param projectId - Project ID
   * @param options - Filter options
   * @returns Array of audit entries
   */
  async getProjectHistory(
    projectId: string,
    options: AuditFilterOptions = {}
  ): Promise<AuditEntry[]> {
    try {
      const params: unknown[] = [projectId];
      let paramIndex = 2;
      const whereClauses: string[] = ['project_id = $1'];

      // Apply filters
      if (options.action) {
        if (Array.isArray(options.action)) {
          const placeholders = options.action
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          whereClauses.push(`action IN (${placeholders})`);
          params.push(...options.action);
          paramIndex += options.action.length;
        } else {
          whereClauses.push(`action = $${paramIndex}`);
          params.push(options.action);
          paramIndex++;
        }
      }

      if (options.actor) {
        whereClauses.push(`actor = $${paramIndex}`);
        params.push(options.actor);
        paramIndex++;
      }

      if (options.startDate) {
        whereClauses.push(`timestamp >= $${paramIndex}`);
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        whereClauses.push(`timestamp <= $${paramIndex}`);
        params.push(options.endDate);
        paramIndex++;
      }

      if (options.sessionId) {
        whereClauses.push(`session_id = $${paramIndex}`);
        params.push(options.sessionId);
        paramIndex++;
      }

      const sortOrder = options.sortOrder ?? 'DESC';
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
      const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

      const query = `
        SELECT * FROM ${this.tableName}
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY timestamp ${sortOrder}
        ${limitClause}
        ${offsetClause}
      `;

      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToAuditEntry(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'getProjectHistory');
    }
  }

  /**
   * Get audit entries by action type across all projects
   *
   * @param action - Action type to filter by
   * @param options - Filter options
   * @returns Array of audit records (includes project ID)
   */
  async getByAction(
    action: string,
    options: Omit<AuditFilterOptions, 'action'> = {}
  ): Promise<AuditRecord[]> {
    try {
      const params: unknown[] = [action];
      let paramIndex = 2;
      const whereClauses: string[] = ['action = $1'];

      if (options.actor) {
        whereClauses.push(`actor = $${paramIndex}`);
        params.push(options.actor);
        paramIndex++;
      }

      if (options.startDate) {
        whereClauses.push(`timestamp >= $${paramIndex}`);
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        whereClauses.push(`timestamp <= $${paramIndex}`);
        params.push(options.endDate);
        paramIndex++;
      }

      const sortOrder = options.sortOrder ?? 'DESC';
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
      const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

      const query = `
        SELECT * FROM ${this.tableName}
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY timestamp ${sortOrder}
        ${limitClause}
        ${offsetClause}
      `;

      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToAuditRecord(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'getByAction');
    }
  }

  /**
   * Get audit entries by actor across all projects
   *
   * @param actor - Actor to filter by
   * @param options - Filter options
   * @returns Array of audit records (includes project ID)
   */
  async getByActor(
    actor: string,
    options: Omit<AuditFilterOptions, 'actor'> = {}
  ): Promise<AuditRecord[]> {
    try {
      const params: unknown[] = [actor];
      let paramIndex = 2;
      const whereClauses: string[] = ['actor = $1'];

      if (options.action) {
        if (Array.isArray(options.action)) {
          const placeholders = options.action
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          whereClauses.push(`action IN (${placeholders})`);
          params.push(...options.action);
          paramIndex += options.action.length;
        } else {
          whereClauses.push(`action = $${paramIndex}`);
          params.push(options.action);
          paramIndex++;
        }
      }

      if (options.startDate) {
        whereClauses.push(`timestamp >= $${paramIndex}`);
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        whereClauses.push(`timestamp <= $${paramIndex}`);
        params.push(options.endDate);
        paramIndex++;
      }

      const sortOrder = options.sortOrder ?? 'DESC';
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
      const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

      const query = `
        SELECT * FROM ${this.tableName}
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY timestamp ${sortOrder}
        ${limitClause}
        ${offsetClause}
      `;

      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToAuditRecord(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'getByActor');
    }
  }

  /**
   * Get audit statistics for a project
   *
   * @param projectId - Project ID
   * @returns Audit statistics
   */
  async getProjectStatistics(projectId: string): Promise<AuditStatistics> {
    try {
      // Get total count and date range
      const countQuery = `
        SELECT
          COUNT(*) as total,
          MIN(timestamp) as first_entry,
          MAX(timestamp) as last_entry
        FROM ${this.tableName}
        WHERE project_id = $1
      `;
      const countResult = await this.pool.query(countQuery, [projectId]);

      // Get action counts
      const actionQuery = `
        SELECT action, COUNT(*) as count
        FROM ${this.tableName}
        WHERE project_id = $1
        GROUP BY action
      `;
      const actionResult = await this.pool.query(actionQuery, [projectId]);

      // Get actor counts
      const actorQuery = `
        SELECT COALESCE(actor, 'system') as actor, COUNT(*) as count
        FROM ${this.tableName}
        WHERE project_id = $1
        GROUP BY actor
      `;
      const actorResult = await this.pool.query(actorQuery, [projectId]);

      // Build statistics object
      const actionCounts: Record<string, number> = {};
      actionResult.rows.forEach((row) => {
        actionCounts[row.action] = parseInt(row.count, 10);
      });

      const actorCounts: Record<string, number> = {};
      actorResult.rows.forEach((row) => {
        actorCounts[row.actor] = parseInt(row.count, 10);
      });

      const stats = countResult.rows[0];
      return {
        totalEntries: parseInt(stats.total, 10),
        actionCounts,
        actorCounts,
        firstEntry: stats.first_entry?.toISOString?.() ?? stats.first_entry ?? undefined,
        lastEntry: stats.last_entry?.toISOString?.() ?? stats.last_entry ?? undefined,
      };
    } catch (error) {
      throw this.handleDatabaseError(error, 'getProjectStatistics');
    }
  }

  /**
   * Get the most recent audit entry for a project
   *
   * @param projectId - Project ID
   * @returns Most recent audit entry or null
   */
  async getLatestEntry(projectId: string): Promise<AuditEntry | null> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE project_id = $1
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [projectId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAuditEntry(result.rows[0]);
    } catch (error) {
      throw this.handleDatabaseError(error, 'getLatestEntry');
    }
  }

  /**
   * Get audit entries within a time range across all projects
   *
   * @param startDate - Start of time range (ISO 8601)
   * @param endDate - End of time range (ISO 8601)
   * @param options - Additional filter options
   * @returns Array of audit records
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    options: Omit<AuditFilterOptions, 'startDate' | 'endDate'> = {}
  ): Promise<AuditRecord[]> {
    try {
      const params: unknown[] = [startDate, endDate];
      let paramIndex = 3;
      const whereClauses: string[] = [
        'timestamp >= $1',
        'timestamp <= $2',
      ];

      if (options.action) {
        if (Array.isArray(options.action)) {
          const placeholders = options.action
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          whereClauses.push(`action IN (${placeholders})`);
          params.push(...options.action);
          paramIndex += options.action.length;
        } else {
          whereClauses.push(`action = $${paramIndex}`);
          params.push(options.action);
          paramIndex++;
        }
      }

      if (options.actor) {
        whereClauses.push(`actor = $${paramIndex}`);
        params.push(options.actor);
        paramIndex++;
      }

      const sortOrder = options.sortOrder ?? 'DESC';
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
      const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

      const query = `
        SELECT * FROM ${this.tableName}
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY timestamp ${sortOrder}
        ${limitClause}
        ${offsetClause}
      `;

      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToAuditRecord(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'getByDateRange');
    }
  }

  /**
   * Count audit entries for a project
   *
   * @param projectId - Project ID
   * @param options - Filter options
   * @returns Count of matching entries
   */
  async countByProject(
    projectId: string,
    options: Omit<AuditFilterOptions, 'limit' | 'offset' | 'sortOrder'> = {}
  ): Promise<number> {
    try {
      const params: unknown[] = [projectId];
      let paramIndex = 2;
      const whereClauses: string[] = ['project_id = $1'];

      if (options.action) {
        if (Array.isArray(options.action)) {
          const placeholders = options.action
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          whereClauses.push(`action IN (${placeholders})`);
          params.push(...options.action);
          paramIndex += options.action.length;
        } else {
          whereClauses.push(`action = $${paramIndex}`);
          params.push(options.action);
          paramIndex++;
        }
      }

      if (options.actor) {
        whereClauses.push(`actor = $${paramIndex}`);
        params.push(options.actor);
        paramIndex++;
      }

      if (options.startDate) {
        whereClauses.push(`timestamp >= $${paramIndex}`);
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        whereClauses.push(`timestamp <= $${paramIndex}`);
        params.push(options.endDate);
        paramIndex++;
      }

      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE ${whereClauses.join(' AND ')}
      `;

      const result = await this.pool.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw this.handleDatabaseError(error, 'countByProject');
    }
  }

  /**
   * Search audit entries by details content
   *
   * @param projectId - Project ID
   * @param searchKey - Key to search for in details
   * @param searchValue - Value to match (optional)
   * @returns Array of matching audit entries
   */
  async searchByDetails(
    projectId: string,
    searchKey: string,
    searchValue?: unknown
  ): Promise<AuditEntry[]> {
    try {
      let query: string;
      let params: unknown[];

      if (searchValue !== undefined) {
        // Search for specific key-value pair
        query = `
          SELECT * FROM ${this.tableName}
          WHERE project_id = $1 AND details->>$2 = $3
          ORDER BY timestamp DESC
        `;
        params = [projectId, searchKey, String(searchValue)];
      } else {
        // Search for entries that have the key
        query = `
          SELECT * FROM ${this.tableName}
          WHERE project_id = $1 AND details ? $2
          ORDER BY timestamp DESC
        `;
        params = [projectId, searchKey];
      }

      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToAuditEntry(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'searchByDetails');
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Map a database row to an AuditEntry
   */
  private mapRowToAuditEntry(row: QueryResultRow): AuditEntry {
    return {
      timestamp: row.timestamp?.toISOString?.() ?? row.timestamp,
      action: row.action,
      actor: row.actor ?? undefined,
      details: row.details
        ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details)
        : undefined,
      previousState: row.previous_state
        ? (typeof row.previous_state === 'string'
          ? JSON.parse(row.previous_state)
          : row.previous_state)
        : undefined,
      newState: row.new_state
        ? (typeof row.new_state === 'string' ? JSON.parse(row.new_state) : row.new_state)
        : undefined,
      ipAddress: row.ip_address ?? undefined,
      sessionId: row.session_id ?? undefined,
    };
  }

  /**
   * Map a database row to an AuditRecord (includes id and projectId)
   */
  private mapRowToAuditRecord(row: QueryResultRow): AuditRecord {
    return {
      id: row.id,
      projectId: row.project_id,
      ...this.mapRowToAuditEntry(row),
    };
  }

  /**
   * Handle database errors
   */
  private handleDatabaseError(error: unknown, operation: string): RepositoryError {
    const dbError = error as { code?: string; message?: string };

    return new RepositoryError(
      `Database error during ${operation}: ${dbError.message ?? 'Unknown error'}`,
      dbError.code ?? 'UNKNOWN_ERROR'
    );
  }
}
