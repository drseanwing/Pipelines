/**
 * QI Research Pipeline - Document Repository
 *
 * Repository for managing GeneratedDocument entities in the database.
 * Handles document creation, retrieval, and status management.
 *
 * @module db/repositories/DocumentRepository
 */

import { QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  BaseRepository,
  NotFoundError,
} from './BaseRepository.js';
import {
  GeneratedDocument,
  DocumentStatus,
  DocumentType,
  DocumentFormat,
  DocumentSection,
  DocumentValidationResult,
} from '../../types/index.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Data transfer object for creating a document
 */
export interface CreateDocumentDTO {
  /** Document type */
  type: DocumentType;
  /** Generated filename */
  filename: string;
  /** Storage path */
  path: string;
  /** File format */
  format: DocumentFormat;
  /** Initial status (defaults to DRAFT) */
  status?: DocumentStatus;
  /** Version string */
  version: string;
  /** User who created the document */
  createdBy?: string;
  /** File size in bytes */
  fileSize?: number;
  /** File checksum */
  checksum?: string;
  /** Document sections */
  sections?: DocumentSection[];
  /** Validation result */
  validationResult?: DocumentValidationResult;
}

/**
 * Options for filtering documents
 */
export interface DocumentFilterOptions {
  /** Filter by status */
  status?: DocumentStatus | DocumentStatus[];
  /** Filter by document type */
  type?: DocumentType | DocumentType[];
  /** Filter by format */
  format?: DocumentFormat | DocumentFormat[];
  /** Filter by creator */
  createdBy?: string;
  /** Include soft-deleted documents */
  includeSoftDeleted?: boolean;
}

// ============================================================================
// Document Repository
// ============================================================================

/**
 * Repository for managing GeneratedDocument entities
 *
 * @example
 * ```typescript
 * const docRepo = new DocumentRepository();
 *
 * // Create a new document
 * const doc = await docRepo.create('project-123', {
 *   type: DocumentType.RESEARCH_PROTOCOL,
 *   filename: 'protocol-v1.0.docx',
 *   path: '/outputs/protocol-v1.0.docx',
 *   format: 'DOCX',
 *   version: '1.0',
 * });
 *
 * // Find all documents for a project
 * const projectDocs = await docRepo.findByProject('project-123');
 *
 * // Update document status
 * await docRepo.updateStatus(doc.id, DocumentStatus.APPROVED);
 * ```
 */
export class DocumentRepository extends BaseRepository<
  GeneratedDocument & { projectId: string },
  CreateDocumentDTO,
  Partial<GeneratedDocument>
> {
  constructor() {
    super('documents', 'Document');
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  /**
   * Map a database row to a GeneratedDocument entity
   */
  protected mapRowToEntity(row: QueryResultRow): GeneratedDocument & { projectId: string } {
    return {
      id: row.id,
      projectId: row.project_id,
      type: row.type as DocumentType,
      filename: row.filename,
      path: row.path,
      format: row.format as DocumentFormat,
      status: row.status as DocumentStatus,
      version: row.version,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      createdBy: row.created_by ?? undefined,
      fileSize: row.file_size ?? undefined,
      checksum: row.checksum ?? undefined,
      sections: row.sections
        ? (typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections)
        : undefined,
      validationResult: row.validation_result
        ? (typeof row.validation_result === 'string'
          ? JSON.parse(row.validation_result)
          : row.validation_result)
        : undefined,
    };
  }

  /**
   * Map create DTO to database columns
   */
  protected mapCreateDTOToColumns(dto: CreateDocumentDTO): Record<string, unknown> {
    return {
      type: dto.type,
      filename: dto.filename,
      path: dto.path,
      format: dto.format,
      status: dto.status ?? DocumentStatus.DRAFT,
      version: dto.version,
      created_by: dto.createdBy,
      file_size: dto.fileSize,
      checksum: dto.checksum,
      sections: dto.sections ? JSON.stringify(dto.sections) : null,
      validation_result: dto.validationResult
        ? JSON.stringify(dto.validationResult)
        : null,
    };
  }

  /**
   * Map update DTO to database columns
   */
  protected mapUpdateDTOToColumns(
    dto: Partial<GeneratedDocument>
  ): Record<string, unknown> {
    const columns: Record<string, unknown> = {};

    if (dto.status !== undefined) {
      columns.status = dto.status;
    }
    if (dto.filename !== undefined) {
      columns.filename = dto.filename;
    }
    if (dto.path !== undefined) {
      columns.path = dto.path;
    }
    if (dto.version !== undefined) {
      columns.version = dto.version;
    }
    if (dto.fileSize !== undefined) {
      columns.file_size = dto.fileSize;
    }
    if (dto.checksum !== undefined) {
      columns.checksum = dto.checksum;
    }
    if (dto.sections !== undefined) {
      columns.sections = JSON.stringify(dto.sections);
    }
    if (dto.validationResult !== undefined) {
      columns.validation_result = JSON.stringify(dto.validationResult);
    }

    return columns;
  }

  // ============================================================================
  // Document-Specific Operations
  // ============================================================================

  /**
   * Create a new document for a project
   *
   * @param projectId - ID of the project this document belongs to
   * @param document - Document data
   * @returns Newly created document
   */
  async createForProject(
    projectId: string,
    document: CreateDocumentDTO
  ): Promise<GeneratedDocument> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO ${this.tableName} (
          id, project_id, type, filename, path, format, status, version,
          created_at, updated_at, created_by, file_size, checksum,
          sections, validation_result
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        projectId,
        document.type,
        document.filename,
        document.path,
        document.format,
        document.status ?? DocumentStatus.DRAFT,
        document.version,
        now,
        now,
        document.createdBy ?? null,
        document.fileSize ?? null,
        document.checksum ?? null,
        document.sections ? JSON.stringify(document.sections) : null,
        document.validationResult
          ? JSON.stringify(document.validationResult)
          : null,
      ]);

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw this.handleDatabaseError(error, 'create');
    }
  }

  /**
   * Find all documents belonging to a project
   *
   * @param projectId - Project ID
   * @param options - Filter options
   * @returns Array of documents
   */
  async findByProject(
    projectId: string,
    options: DocumentFilterOptions = {}
  ): Promise<GeneratedDocument[]> {
    try {
      const params: unknown[] = [projectId];
      let paramIndex = 2;
      const whereClauses: string[] = ['project_id = $1'];

      if (!options.includeSoftDeleted) {
        whereClauses.push('deleted_at IS NULL');
      }

      if (options.status) {
        if (Array.isArray(options.status)) {
          const placeholders = options.status
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          whereClauses.push(`status IN (${placeholders})`);
          params.push(...options.status);
          paramIndex += options.status.length;
        } else {
          whereClauses.push(`status = $${paramIndex}`);
          params.push(options.status);
          paramIndex++;
        }
      }

      if (options.type) {
        if (Array.isArray(options.type)) {
          const placeholders = options.type
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          whereClauses.push(`type IN (${placeholders})`);
          params.push(...options.type);
          paramIndex += options.type.length;
        } else {
          whereClauses.push(`type = $${paramIndex}`);
          params.push(options.type);
          paramIndex++;
        }
      }

      if (options.format) {
        if (Array.isArray(options.format)) {
          const placeholders = options.format
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          whereClauses.push(`format IN (${placeholders})`);
          params.push(...options.format);
          paramIndex += options.format.length;
        } else {
          whereClauses.push(`format = $${paramIndex}`);
          params.push(options.format);
          paramIndex++;
        }
      }

      if (options.createdBy) {
        whereClauses.push(`created_by = $${paramIndex}`);
        params.push(options.createdBy);
        paramIndex++;
      }

      const query = `
        SELECT * FROM ${this.tableName}
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY created_at DESC
      `;

      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToEntity(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'findByProject');
    }
  }

  /**
   * Update the status of a document
   *
   * @param id - Document ID
   * @param status - New status
   * @returns Updated document
   */
  async updateStatus(id: string, status: DocumentStatus): Promise<GeneratedDocument> {
    try {
      const now = new Date().toISOString();

      const query = `
        UPDATE ${this.tableName}
        SET status = $2, updated_at = $3
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [id, status, now]);

      if (result.rows.length === 0) {
        throw new NotFoundError(this.entityName, id);
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'updateStatus');
    }
  }

  /**
   * Find documents by type across all projects
   *
   * @param type - Document type
   * @returns Array of documents
   */
  async findByType(type: DocumentType): Promise<GeneratedDocument[]> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE type = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
      `;

      const result = await this.pool.query(query, [type]);
      return result.rows.map((row) => this.mapRowToEntity(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'findByType');
    }
  }

  /**
   * Find the latest version of a document type for a project
   *
   * @param projectId - Project ID
   * @param type - Document type
   * @returns Latest document or null if not found
   */
  async findLatestByType(
    projectId: string,
    type: DocumentType
  ): Promise<GeneratedDocument | null> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE project_id = $1 AND type = $2 AND deleted_at IS NULL
        ORDER BY version DESC, created_at DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [projectId, type]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw this.handleDatabaseError(error, 'findLatestByType');
    }
  }

  /**
   * Update document validation result
   *
   * @param id - Document ID
   * @param validationResult - Validation result
   * @returns Updated document
   */
  async updateValidationResult(
    id: string,
    validationResult: DocumentValidationResult
  ): Promise<GeneratedDocument> {
    try {
      const now = new Date().toISOString();

      const query = `
        UPDATE ${this.tableName}
        SET validation_result = $2, updated_at = $3
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        JSON.stringify(validationResult),
        now,
      ]);

      if (result.rows.length === 0) {
        throw new NotFoundError(this.entityName, id);
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'updateValidationResult');
    }
  }

  /**
   * Update document sections
   *
   * @param id - Document ID
   * @param sections - New sections array
   * @returns Updated document
   */
  async updateSections(
    id: string,
    sections: DocumentSection[]
  ): Promise<GeneratedDocument> {
    try {
      const now = new Date().toISOString();

      const query = `
        UPDATE ${this.tableName}
        SET sections = $2, updated_at = $3
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        JSON.stringify(sections),
        now,
      ]);

      if (result.rows.length === 0) {
        throw new NotFoundError(this.entityName, id);
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'updateSections');
    }
  }

  /**
   * Mark a document as superseded (when a new version is created)
   *
   * @param id - Document ID
   * @returns Updated document
   */
  async markAsSuperseded(id: string): Promise<GeneratedDocument> {
    return this.updateStatus(id, DocumentStatus.SUPERSEDED);
  }

  /**
   * Get document counts by status for a project
   *
   * @param projectId - Project ID
   * @returns Object with status counts
   */
  async getStatusCountsByProject(
    projectId: string
  ): Promise<Record<DocumentStatus, number>> {
    try {
      const query = `
        SELECT status, COUNT(*) as count
        FROM ${this.tableName}
        WHERE project_id = $1 AND deleted_at IS NULL
        GROUP BY status
      `;

      const result = await this.pool.query(query, [projectId]);

      // Initialize all statuses to 0
      const counts: Record<string, number> = {};
      Object.values(DocumentStatus).forEach((status) => {
        counts[status] = 0;
      });

      // Fill in actual counts
      result.rows.forEach((row) => {
        counts[row.status] = parseInt(row.count, 10);
      });

      return counts as Record<DocumentStatus, number>;
    } catch (error) {
      throw this.handleDatabaseError(error, 'getStatusCountsByProject');
    }
  }

  /**
   * Get document counts by type for a project
   *
   * @param projectId - Project ID
   * @returns Object with type counts
   */
  async getTypeCountsByProject(
    projectId: string
  ): Promise<Record<DocumentType, number>> {
    try {
      const query = `
        SELECT type, COUNT(*) as count
        FROM ${this.tableName}
        WHERE project_id = $1 AND deleted_at IS NULL
        GROUP BY type
      `;

      const result = await this.pool.query(query, [projectId]);

      // Initialize all types to 0
      const counts: Record<string, number> = {};
      Object.values(DocumentType).forEach((type) => {
        counts[type] = 0;
      });

      // Fill in actual counts
      result.rows.forEach((row) => {
        counts[row.type] = parseInt(row.count, 10);
      });

      return counts as Record<DocumentType, number>;
    } catch (error) {
      throw this.handleDatabaseError(error, 'getTypeCountsByProject');
    }
  }

  /**
   * Delete all documents for a project (hard delete)
   *
   * @param projectId - Project ID
   * @returns Number of deleted documents
   */
  async deleteByProject(projectId: string): Promise<number> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE project_id = $1
      `;

      const result = await this.pool.query(query, [projectId]);
      return result.rowCount ?? 0;
    } catch (error) {
      throw this.handleDatabaseError(error, 'deleteByProject');
    }
  }

  /**
   * Soft delete all documents for a project
   *
   * @param projectId - Project ID
   * @returns Number of soft-deleted documents
   */
  async softDeleteByProject(projectId: string): Promise<number> {
    try {
      const now = new Date().toISOString();

      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = $2, updated_at = $2
        WHERE project_id = $1 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [projectId, now]);
      return result.rowCount ?? 0;
    } catch (error) {
      throw this.handleDatabaseError(error, 'softDeleteByProject');
    }
  }
}
