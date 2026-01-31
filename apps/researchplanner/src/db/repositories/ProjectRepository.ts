/**
 * QI Research Pipeline - Project Repository
 *
 * Repository for managing Project entities in the database.
 * Handles CRUD operations, status management, stage data updates,
 * and checkpoint approvals.
 *
 * @module db/repositories/ProjectRepository
 */

import { QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  BaseRepository,
  PaginationOptions,
  FilterOptions,
  NotFoundError,
  RepositoryError,
} from './BaseRepository.js';
import {
  Project,
  ProjectStatus,
  ProjectType,
  IntakeData,
  Classification,
  Frameworks,
  ResearchStageData,
  MethodologyStageData,
  EthicsStageData,
  DocumentsStageData,
  AuditEntry,
  Checkpoints,
} from '../../types/index.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Options for listing projects
 */
export interface ListOptions {
  /** Pagination settings */
  pagination?: PaginationOptions;
  /** Filter by status */
  status?: ProjectStatus | ProjectStatus[];
  /** Filter by project type */
  projectType?: ProjectType | ProjectType[];
  /** Filter by owner ID */
  ownerId?: string;
  /** Search in project title */
  search?: string;
  /** Include soft-deleted projects */
  includeSoftDeleted?: boolean;
  /** Filter by date range (created) */
  createdAfter?: string;
  createdBefore?: string;
  /** Filter by date range (updated) */
  updatedAfter?: string;
  updatedBefore?: string;
}

/**
 * Result of list operation
 */
export interface ListResult {
  /** List of projects */
  projects: Project[];
  /** Total count (without pagination) */
  total: number;
}

/**
 * Valid checkpoint names
 */
export type CheckpointName =
  | 'intakeApproved'
  | 'researchApproved'
  | 'methodologyApproved'
  | 'ethicsApproved'
  | 'documentsApproved';

/**
 * Valid stage names for updates
 */
export type StageName =
  | 'research'
  | 'methodology'
  | 'ethics'
  | 'documents';

/**
 * Stage data type mapping
 */
export type StageDataType<S extends StageName> =
  S extends 'research' ? ResearchStageData :
  S extends 'methodology' ? MethodologyStageData :
  S extends 'ethics' ? EthicsStageData :
  S extends 'documents' ? DocumentsStageData :
  never;

// ============================================================================
// Project Repository
// ============================================================================

/**
 * Repository for managing Project entities
 *
 * @example
 * ```typescript
 * const projectRepo = new ProjectRepository();
 *
 * // Create a new project
 * const project = await projectRepo.create(intakeData, 'user-123');
 *
 * // Update project status
 * await projectRepo.updateStatus(project.id, ProjectStatus.RESEARCH_COMPLETE);
 *
 * // Approve a checkpoint
 * await projectRepo.approveCheckpoint(project.id, 'researchApproved');
 *
 * // List projects with pagination
 * const { projects, total } = await projectRepo.list({
 *   pagination: { page: 1, limit: 10 },
 *   status: [ProjectStatus.DRAFT, ProjectStatus.INTAKE_COMPLETE],
 * });
 * ```
 */
export class ProjectRepository extends BaseRepository<Project, IntakeData, Partial<Project>> {
  constructor() {
    super('projects', 'Project');
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  /**
   * Map a database row to a Project entity
   */
  protected mapRowToEntity(row: QueryResultRow): Project {
    return {
      id: row.id,
      status: row.status as ProjectStatus,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      deletedAt: row.deleted_at?.toISOString?.() ?? row.deleted_at ?? undefined,
      ownerId: row.owner_id ?? undefined,
      intake: typeof row.intake === 'string' ? JSON.parse(row.intake) : row.intake,
      classification: typeof row.classification === 'string'
        ? JSON.parse(row.classification)
        : row.classification,
      frameworks: typeof row.frameworks === 'string'
        ? JSON.parse(row.frameworks)
        : row.frameworks,
      research: row.research
        ? (typeof row.research === 'string' ? JSON.parse(row.research) : row.research)
        : undefined,
      methodology: row.methodology
        ? (typeof row.methodology === 'string' ? JSON.parse(row.methodology) : row.methodology)
        : undefined,
      ethics: row.ethics
        ? (typeof row.ethics === 'string' ? JSON.parse(row.ethics) : row.ethics)
        : undefined,
      documents: row.documents
        ? (typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents)
        : undefined,
      auditLog: typeof row.audit_log === 'string'
        ? JSON.parse(row.audit_log)
        : (row.audit_log ?? []),
      checkpoints: typeof row.checkpoints === 'string'
        ? JSON.parse(row.checkpoints)
        : row.checkpoints,
    };
  }

  /**
   * Map IntakeData to database columns for creation
   */
  protected mapCreateDTOToColumns(dto: IntakeData): Record<string, unknown> {
    // This is overridden by the create method, but we need to implement it
    // for the abstract class contract
    return {
      intake: JSON.stringify(dto),
    };
  }

  /**
   * Map update DTO to database columns
   */
  protected mapUpdateDTOToColumns(dto: Partial<Project>): Record<string, unknown> {
    const columns: Record<string, unknown> = {};

    if (dto.status !== undefined) {
      columns.status = dto.status;
    }
    if (dto.intake !== undefined) {
      columns.intake = JSON.stringify(dto.intake);
    }
    if (dto.classification !== undefined) {
      columns.classification = JSON.stringify(dto.classification);
    }
    if (dto.frameworks !== undefined) {
      columns.frameworks = JSON.stringify(dto.frameworks);
    }
    if (dto.research !== undefined) {
      columns.research = JSON.stringify(dto.research);
    }
    if (dto.methodology !== undefined) {
      columns.methodology = JSON.stringify(dto.methodology);
    }
    if (dto.ethics !== undefined) {
      columns.ethics = JSON.stringify(dto.ethics);
    }
    if (dto.documents !== undefined) {
      columns.documents = JSON.stringify(dto.documents);
    }
    if (dto.auditLog !== undefined) {
      columns.audit_log = JSON.stringify(dto.auditLog);
    }
    if (dto.checkpoints !== undefined) {
      columns.checkpoints = JSON.stringify(dto.checkpoints);
    }
    if (dto.ownerId !== undefined) {
      columns.owner_id = dto.ownerId;
    }

    return columns;
  }

  // ============================================================================
  // Project-Specific Operations
  // ============================================================================

  /**
   * Create a new project from intake data
   *
   * @param intake - Initial intake data from the project form
   * @param ownerId - ID of the user creating the project
   * @returns Newly created project
   */
  async createFromIntake(intake: IntakeData, ownerId: string): Promise<Project> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const initialClassification: Classification = {
        projectType: intake.project_type,
        confidence: 0,
        reasoning: 'Pending classification',
        suggestedDesigns: [],
      };

      const initialFrameworks: Frameworks = {
        reportingGuideline: '',
        ethicsFramework: '',
        governanceRequirements: [],
      };

      const initialCheckpoints: Checkpoints = {
        intakeApproved: false,
        researchApproved: false,
        methodologyApproved: false,
        ethicsApproved: false,
        documentsApproved: false,
      };

      const initialAuditLog: AuditEntry[] = [
        {
          timestamp: now,
          action: 'PROJECT_CREATED',
          actor: ownerId,
          details: {
            projectTitle: intake.projectTitle,
            projectType: intake.project_type,
          },
        },
      ];

      const query = `
        INSERT INTO ${this.tableName} (
          id, status, created_at, updated_at, owner_id,
          intake, classification, frameworks, audit_log, checkpoints
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        ProjectStatus.DRAFT,
        now,
        now,
        ownerId,
        JSON.stringify(intake),
        JSON.stringify(initialClassification),
        JSON.stringify(initialFrameworks),
        JSON.stringify(initialAuditLog),
        JSON.stringify(initialCheckpoints),
      ]);

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw this.handleDatabaseError(error, 'create');
    }
  }

  /**
   * Find all projects owned by a specific user
   *
   * @param ownerId - Owner user ID
   * @returns Array of projects
   */
  async findByOwner(ownerId: string): Promise<Project[]> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE owner_id = $1 AND deleted_at IS NULL
        ORDER BY updated_at DESC
      `;
      const result = await this.pool.query(query, [ownerId]);
      return result.rows.map((row) => this.mapRowToEntity(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'findByOwner');
    }
  }

  /**
   * Update the status of a project
   *
   * @param id - Project ID
   * @param status - New status
   * @param actor - User making the change (for audit log)
   * @returns Updated project
   */
  async updateStatus(
    id: string,
    status: ProjectStatus,
    actor?: string
  ): Promise<Project> {
    try {
      // First, get the current project to update audit log
      const current = await this.findById(id);
      if (!current) {
        throw new NotFoundError(this.entityName, id);
      }

      const now = new Date().toISOString();
      const auditEntry: AuditEntry = {
        timestamp: now,
        action: 'STATUS_CHANGED',
        actor,
        details: {
          previousStatus: current.status,
          newStatus: status,
        },
        previousState: { status: current.status },
        newState: { status },
      };

      const updatedAuditLog = [...current.auditLog, auditEntry];

      const query = `
        UPDATE ${this.tableName}
        SET status = $2, audit_log = $3, updated_at = $4
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        status,
        JSON.stringify(updatedAuditLog),
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
      throw this.handleDatabaseError(error, 'updateStatus');
    }
  }

  /**
   * Update stage-specific data for a project
   *
   * @param id - Project ID
   * @param stage - Stage name (research, methodology, ethics, documents)
   * @param data - Stage data to set
   * @param actor - User making the change (for audit log)
   * @returns Updated project
   */
  async updateStageData<S extends StageName>(
    id: string,
    stage: S,
    data: StageDataType<S>,
    actor?: string
  ): Promise<Project> {
    try {
      const current = await this.findById(id);
      if (!current) {
        throw new NotFoundError(this.entityName, id);
      }

      const now = new Date().toISOString();
      const auditEntry: AuditEntry = {
        timestamp: now,
        action: `${stage.toUpperCase()}_DATA_UPDATED`,
        actor,
        details: {
          stage,
        },
      };

      const updatedAuditLog = [...current.auditLog, auditEntry];

      // Validate stage name and get column name
      const columnMap: Record<StageName, string> = {
        research: 'research',
        methodology: 'methodology',
        ethics: 'ethics',
        documents: 'documents',
      };

      const column = columnMap[stage];
      if (!column) {
        throw new RepositoryError(
          `Invalid stage name: ${stage}`,
          'INVALID_STAGE'
        );
      }

      const query = `
        UPDATE ${this.tableName}
        SET ${column} = $2, audit_log = $3, updated_at = $4
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        JSON.stringify(data),
        JSON.stringify(updatedAuditLog),
        now,
      ]);

      if (result.rows.length === 0) {
        throw new NotFoundError(this.entityName, id);
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof RepositoryError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'updateStageData');
    }
  }

  /**
   * Approve a checkpoint for a project
   *
   * @param id - Project ID
   * @param checkpoint - Checkpoint name to approve
   * @param actor - User approving the checkpoint (for audit log)
   * @returns Updated project
   */
  async approveCheckpoint(
    id: string,
    checkpoint: CheckpointName,
    actor?: string
  ): Promise<Project> {
    try {
      const current = await this.findById(id);
      if (!current) {
        throw new NotFoundError(this.entityName, id);
      }

      // Validate checkpoint name
      const validCheckpoints: CheckpointName[] = [
        'intakeApproved',
        'researchApproved',
        'methodologyApproved',
        'ethicsApproved',
        'documentsApproved',
      ];

      if (!validCheckpoints.includes(checkpoint)) {
        throw new RepositoryError(
          `Invalid checkpoint name: ${checkpoint}`,
          'INVALID_CHECKPOINT'
        );
      }

      const now = new Date().toISOString();
      const auditEntry: AuditEntry = {
        timestamp: now,
        action: 'CHECKPOINT_APPROVED',
        actor,
        details: {
          checkpoint,
        },
        previousState: { [checkpoint]: current.checkpoints[checkpoint] },
        newState: { [checkpoint]: true },
      };

      const updatedAuditLog = [...current.auditLog, auditEntry];
      const updatedCheckpoints: Checkpoints = {
        ...current.checkpoints,
        [checkpoint]: true,
      };

      const query = `
        UPDATE ${this.tableName}
        SET checkpoints = $2, audit_log = $3, updated_at = $4
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        JSON.stringify(updatedCheckpoints),
        JSON.stringify(updatedAuditLog),
        now,
      ]);

      if (result.rows.length === 0) {
        throw new NotFoundError(this.entityName, id);
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof RepositoryError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'approveCheckpoint');
    }
  }

  /**
   * Soft delete a project
   *
   * @param id - Project ID
   * @param actor - User performing the deletion (for audit log)
   */
  override async softDelete(id: string, actor?: string): Promise<void> {
    try {
      const current = await this.findById(id);
      if (!current) {
        throw new NotFoundError(this.entityName, id);
      }

      const now = new Date().toISOString();
      const auditEntry: AuditEntry = {
        timestamp: now,
        action: 'PROJECT_DELETED',
        actor,
        details: {
          deletedAt: now,
        },
      };

      const updatedAuditLog = [...current.auditLog, auditEntry];

      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = $2, audit_log = $3, updated_at = $4
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [
        id,
        now,
        JSON.stringify(updatedAuditLog),
        now,
      ]);

      if (result.rowCount === 0) {
        throw new NotFoundError(this.entityName, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'softDelete');
    }
  }

  /**
   * List projects with filtering and pagination
   *
   * @param options - List options
   * @returns Projects and total count
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    try {
      const filters: FilterOptions[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      // Build filters from options
      if (options.status) {
        if (Array.isArray(options.status)) {
          filters.push({
            field: 'status',
            operator: 'IN',
            value: options.status,
          });
        } else {
          filters.push({
            field: 'status',
            operator: '=',
            value: options.status,
          });
        }
      }

      if (options.ownerId) {
        filters.push({
          field: 'owner_id',
          operator: '=',
          value: options.ownerId,
        });
      }

      if (options.createdAfter) {
        filters.push({
          field: 'created_at',
          operator: '>=',
          value: options.createdAfter,
        });
      }

      if (options.createdBefore) {
        filters.push({
          field: 'created_at',
          operator: '<=',
          value: options.createdBefore,
        });
      }

      if (options.updatedAfter) {
        filters.push({
          field: 'updated_at',
          operator: '>=',
          value: options.updatedAfter,
        });
      }

      if (options.updatedBefore) {
        filters.push({
          field: 'updated_at',
          operator: '<=',
          value: options.updatedBefore,
        });
      }

      // Handle search (requires special handling for JSONB)
      let searchClause = '';
      if (options.search) {
        // Search in the project title within the intake JSONB column
        searchClause = ` AND intake->>'projectTitle' ILIKE $${paramIndex}`;
        params.push(`%${options.search}%`);
        paramIndex++;
      }

      // Handle projectType filter (requires JSONB query)
      let projectTypeClause = '';
      if (options.project_type) {
        if (Array.isArray(options.project_type)) {
          const placeholders = options.project_type
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          projectTypeClause = ` AND intake->>'projectType' IN (${placeholders})`;
          params.push(...options.project_type);
          paramIndex += options.project_type.length;
        } else {
          projectTypeClause = ` AND intake->>'projectType' = $${paramIndex}`;
          params.push(options.project_type);
          paramIndex++;
        }
      }

      // Build base WHERE clause
      const softDeleteClause = options.includeSoftDeleted
        ? ''
        : 'deleted_at IS NULL';

      // Build filter clauses
      const filterClauses: string[] = [];
      if (softDeleteClause) {
        filterClauses.push(softDeleteClause);
      }

      for (const filter of filters) {
        if (filter.operator === 'IN' && Array.isArray(filter.value)) {
          const placeholders = filter.value
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          filterClauses.push(`${filter.field} IN (${placeholders})`);
          params.push(...filter.value);
          paramIndex += filter.value.length;
        } else if (filter.value !== undefined) {
          filterClauses.push(`${filter.field} ${filter.operator} $${paramIndex}`);
          params.push(filter.value);
          paramIndex++;
        }
      }

      const whereClause = filterClauses.length > 0
        ? `WHERE ${filterClauses.join(' AND ')}${searchClause}${projectTypeClause}`
        : `WHERE 1=1${searchClause}${projectTypeClause}`;

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Build pagination
      const pagination = options.pagination ?? { page: 1, limit: 20 };
      const page = pagination.page ?? 1;
      const limit = pagination.limit ?? 20;
      const offset = (page - 1) * limit;
      const sortBy = pagination.sortBy ?? 'updated_at';
      const sortOrder = pagination.sortOrder ?? 'DESC';

      // Get paginated results
      const dataQuery = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        ORDER BY ${this.sanitizeColumnName(sortBy)} ${sortOrder}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const dataResult = await this.pool.query(dataQuery, params);
      const projects = dataResult.rows.map((row) => this.mapRowToEntity(row));

      return { projects, total };
    } catch (error) {
      throw this.handleDatabaseError(error, 'list');
    }
  }

  /**
   * Find projects by their current status
   *
   * @param status - Status to filter by
   * @returns Array of projects with the given status
   */
  async findByStatus(status: ProjectStatus): Promise<Project[]> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE status = $1 AND deleted_at IS NULL
        ORDER BY updated_at DESC
      `;
      const result = await this.pool.query(query, [status]);
      return result.rows.map((row) => this.mapRowToEntity(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'findByStatus');
    }
  }

  /**
   * Update classification and frameworks for a project (typically after Stage 1 processing)
   *
   * @param id - Project ID
   * @param classification - Classification results
   * @param frameworks - Framework requirements
   * @param actor - User making the change
   * @returns Updated project
   */
  async updateClassification(
    id: string,
    classification: Classification,
    frameworks: Frameworks,
    actor?: string
  ): Promise<Project> {
    try {
      const current = await this.findById(id);
      if (!current) {
        throw new NotFoundError(this.entityName, id);
      }

      const now = new Date().toISOString();
      const auditEntry: AuditEntry = {
        timestamp: now,
        action: 'CLASSIFICATION_UPDATED',
        actor,
        details: {
          projectType: classification.project_type,
          confidence: classification.confidence,
          reportingGuideline: frameworks.reportingGuideline,
        },
        previousState: {
          classification: current.classification,
          frameworks: current.frameworks,
        },
        newState: {
          classification,
          frameworks,
        },
      };

      const updatedAuditLog = [...current.auditLog, auditEntry];

      const query = `
        UPDATE ${this.tableName}
        SET classification = $2, frameworks = $3, audit_log = $4, updated_at = $5
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        JSON.stringify(classification),
        JSON.stringify(frameworks),
        JSON.stringify(updatedAuditLog),
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
      throw this.handleDatabaseError(error, 'updateClassification');
    }
  }

  /**
   * Get project summary statistics for a user
   *
   * @param ownerId - Owner user ID (optional, if not provided returns global stats)
   * @returns Object with status counts
   */
  async getStatusCounts(ownerId?: string): Promise<Record<ProjectStatus, number>> {
    try {
      const ownerClause = ownerId ? ' AND owner_id = $1' : '';
      const params = ownerId ? [ownerId] : [];

      const query = `
        SELECT status, COUNT(*) as count
        FROM ${this.tableName}
        WHERE deleted_at IS NULL${ownerClause}
        GROUP BY status
      `;

      const result = await this.pool.query(query, params);

      // Initialize all statuses to 0
      const counts: Record<string, number> = {};
      Object.values(ProjectStatus).forEach((status) => {
        counts[status] = 0;
      });

      // Fill in actual counts
      result.rows.forEach((row) => {
        counts[row.status] = parseInt(row.count, 10);
      });

      return counts as Record<ProjectStatus, number>;
    } catch (error) {
      throw this.handleDatabaseError(error, 'getStatusCounts');
    }
  }
}
