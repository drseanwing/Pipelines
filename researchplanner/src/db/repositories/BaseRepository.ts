/**
 * QI Research Pipeline - Base Repository
 *
 * Abstract base repository providing generic CRUD operations,
 * common query patterns, and pagination support for database interactions.
 *
 * @module db/repositories/BaseRepository
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';
import { pool } from '../connection.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  /** Result items */
  data: T[];
  /** Total count of items (without pagination) */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Filter options for queries
 */
export interface FilterOptions {
  /** Field name to filter on */
  field: string;
  /** Operator for comparison */
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  /** Value to compare against */
  value?: unknown;
}

/**
 * Query options combining pagination and filtering
 */
export interface QueryOptions {
  /** Pagination settings */
  pagination?: PaginationOptions;
  /** Filter conditions */
  filters?: FilterOptions[];
  /** Include soft-deleted records */
  includeSoftDeleted?: boolean;
}

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// ============================================================================
// Repository Errors
// ============================================================================

/**
 * Custom error class for repository operations
 */
export class RepositoryError extends Error {
  public readonly code: string;
  public readonly query?: string;
  public readonly params?: unknown[];

  constructor(
    message: string,
    code: string,
    query?: string,
    params?: unknown[]
  ) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.query = query;
    this.params = params;
    Error.captureStackTrace(this, RepositoryError);
  }
}

/**
 * Error thrown when an entity is not found
 */
export class NotFoundError extends RepositoryError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id '${id}' not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Error thrown when a database constraint is violated
 */
export class ConstraintError extends RepositoryError {
  public readonly constraint: string;

  constructor(message: string, constraint: string) {
    super(message, 'CONSTRAINT_VIOLATION');
    this.name = 'ConstraintError';
    this.constraint = constraint;
  }
}

// ============================================================================
// Abstract Base Repository
// ============================================================================

/**
 * Abstract base repository providing generic CRUD operations
 *
 * @typeParam T - Entity type this repository manages
 * @typeParam CreateDTO - Data transfer object for entity creation
 * @typeParam UpdateDTO - Data transfer object for entity updates
 *
 * @example
 * ```typescript
 * class UserRepository extends BaseRepository<User, CreateUserDTO, UpdateUserDTO> {
 *   constructor() {
 *     super('users', 'User');
 *   }
 *
 *   protected mapRowToEntity(row: QueryResultRow): User {
 *     return {
 *       id: row.id,
 *       email: row.email,
 *       name: row.name,
 *       createdAt: row.created_at,
 *       updatedAt: row.updated_at,
 *     };
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<
  T extends BaseEntity,
  CreateDTO = Partial<T>,
  UpdateDTO = Partial<T>
> {
  /** Database connection pool */
  protected readonly pool: Pool;
  /** Database table name */
  protected readonly tableName: string;
  /** Human-readable entity name for error messages */
  protected readonly entityName: string;

  /**
   * Create a new repository instance
   *
   * @param tableName - Database table name
   * @param entityName - Human-readable entity name
   */
  constructor(tableName: string, entityName: string) {
    this.pool = pool;
    this.tableName = tableName;
    this.entityName = entityName;
  }

  // ============================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ============================================================================

  /**
   * Map a database row to an entity object
   *
   * @param row - Database row from query result
   * @returns Mapped entity object
   */
  protected abstract mapRowToEntity(row: QueryResultRow): T;

  /**
   * Map a create DTO to database columns
   *
   * @param dto - Create data transfer object
   * @returns Object with column names as keys and values
   */
  protected abstract mapCreateDTOToColumns(dto: CreateDTO): Record<string, unknown>;

  /**
   * Map an update DTO to database columns
   *
   * @param dto - Update data transfer object
   * @returns Object with column names as keys and values
   */
  protected abstract mapUpdateDTOToColumns(dto: UpdateDTO): Record<string, unknown>;

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Find an entity by its ID
   *
   * @param id - Entity ID
   * @param includeSoftDeleted - Whether to include soft-deleted records
   * @returns Entity if found, null otherwise
   */
  async findById(id: string, includeSoftDeleted = false): Promise<T | null> {
    try {
      const softDeleteClause = includeSoftDeleted ? '' : ' AND deleted_at IS NULL';
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1${softDeleteClause}`;
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw this.handleDatabaseError(error, 'findById');
    }
  }

  /**
   * Find an entity by ID, throwing an error if not found
   *
   * @param id - Entity ID
   * @returns Entity
   * @throws NotFoundError if entity doesn't exist
   */
  async findByIdOrFail(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new NotFoundError(this.entityName, id);
    }
    return entity;
  }

  /**
   * Find all entities matching the given options
   *
   * @param options - Query options
   * @returns Array of entities
   */
  async findAll(options: QueryOptions = {}): Promise<T[]> {
    try {
      const { query, params } = this.buildSelectQuery(options);
      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToEntity(row));
    } catch (error) {
      throw this.handleDatabaseError(error, 'findAll');
    }
  }

  /**
   * Find all entities with pagination
   *
   * @param options - Query options including pagination
   * @returns Paginated result
   */
  async findAllPaginated(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    try {
      const pagination = {
        page: options.pagination?.page ?? 1,
        limit: options.pagination?.limit ?? 20,
        sortBy: options.pagination?.sortBy ?? 'created_at',
        sortOrder: options.pagination?.sortOrder ?? 'DESC',
      };

      // Get total count
      const countQuery = this.buildCountQuery(options);
      const countResult = await this.pool.query(countQuery.query, countQuery.params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated data
      const { query, params } = this.buildSelectQuery({
        ...options,
        pagination,
      });
      const result = await this.pool.query(query, params);
      const data = result.rows.map((row) => this.mapRowToEntity(row));

      const totalPages = Math.ceil(total / pagination.limit);

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasMore: pagination.page < totalPages,
      };
    } catch (error) {
      throw this.handleDatabaseError(error, 'findAllPaginated');
    }
  }

  /**
   * Create a new entity
   *
   * @param data - Creation data
   * @returns Created entity
   */
  async create(data: CreateDTO): Promise<T> {
    try {
      const columns = this.mapCreateDTOToColumns(data);
      const columnNames = Object.keys(columns);
      const values = Object.values(columns);
      const placeholders = columnNames.map((_, i) => `$${i + 1}`);

      const query = `
        INSERT INTO ${this.tableName} (${columnNames.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw this.handleDatabaseError(error, 'create');
    }
  }

  /**
   * Update an entity by ID
   *
   * @param id - Entity ID
   * @param data - Update data
   * @returns Updated entity
   * @throws NotFoundError if entity doesn't exist
   */
  async update(id: string, data: UpdateDTO): Promise<T> {
    try {
      const columns = this.mapUpdateDTOToColumns(data);
      const columnNames = Object.keys(columns);

      if (columnNames.length === 0) {
        return this.findByIdOrFail(id);
      }

      const values = Object.values(columns);
      const setClause = columnNames
        .map((col, i) => `${col} = $${i + 2}`)
        .join(', ');

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [id, ...values]);

      if (result.rows.length === 0) {
        throw new NotFoundError(this.entityName, id);
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'update');
    }
  }

  /**
   * Delete an entity by ID (hard delete)
   *
   * @param id - Entity ID
   * @throws NotFoundError if entity doesn't exist
   */
  async delete(id: string): Promise<void> {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new NotFoundError(this.entityName, id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'delete');
    }
  }

  /**
   * Soft delete an entity by ID
   *
   * @param id - Entity ID
   * @throws NotFoundError if entity doesn't exist
   */
  async softDelete(id: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      `;
      const result = await this.pool.query(query, [id]);

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
   * Restore a soft-deleted entity
   *
   * @param id - Entity ID
   * @returns Restored entity
   * @throws NotFoundError if entity doesn't exist
   */
  async restore(id: string): Promise<T> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = NULL, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NOT NULL
        RETURNING *
      `;
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        throw new NotFoundError(this.entityName, id);
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'restore');
    }
  }

  // ============================================================================
  // Query Building Helpers
  // ============================================================================

  /**
   * Build a SELECT query with filters and pagination
   */
  protected buildSelectQuery(options: QueryOptions): { query: string; params: unknown[] } {
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    const whereClauses: string[] = [];

    // Soft delete filter
    if (!options.includeSoftDeleted) {
      whereClauses.push('deleted_at IS NULL');
    }

    // Custom filters
    if (options.filters) {
      for (const filter of options.filters) {
        const { clause, newParamIndex } = this.buildFilterClause(
          filter,
          paramIndex
        );
        whereClauses.push(clause);
        if (filter.value !== undefined && filter.operator !== 'IS NULL' && filter.operator !== 'IS NOT NULL') {
          if (filter.operator === 'IN' && Array.isArray(filter.value)) {
            params.push(...filter.value);
            paramIndex = newParamIndex;
          } else {
            params.push(filter.value);
            paramIndex++;
          }
        }
      }
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // Build ORDER BY clause
    const sortBy = options.pagination?.sortBy ?? 'created_at';
    const sortOrder = options.pagination?.sortOrder ?? 'DESC';
    const orderClause = `ORDER BY ${this.sanitizeColumnName(sortBy)} ${sortOrder}`;

    // Build LIMIT/OFFSET clause
    let limitOffsetClause = '';
    if (options.pagination) {
      const limit = options.pagination.limit ?? 20;
      const page = options.pagination.page ?? 1;
      const offset = (page - 1) * limit;
      limitOffsetClause = `LIMIT ${limit} OFFSET ${offset}`;
    }

    const query = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ${orderClause}
      ${limitOffsetClause}
    `.trim();

    return { query, params };
  }

  /**
   * Build a COUNT query with filters
   */
  protected buildCountQuery(options: QueryOptions): { query: string; params: unknown[] } {
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    const whereClauses: string[] = [];

    // Soft delete filter
    if (!options.includeSoftDeleted) {
      whereClauses.push('deleted_at IS NULL');
    }

    // Custom filters
    if (options.filters) {
      for (const filter of options.filters) {
        const { clause, newParamIndex } = this.buildFilterClause(
          filter,
          paramIndex
        );
        whereClauses.push(clause);
        if (filter.value !== undefined && filter.operator !== 'IS NULL' && filter.operator !== 'IS NOT NULL') {
          if (filter.operator === 'IN' && Array.isArray(filter.value)) {
            params.push(...filter.value);
            paramIndex = newParamIndex;
          } else {
            params.push(filter.value);
            paramIndex++;
          }
        }
      }
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const query = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;

    return { query, params };
  }

  /**
   * Build a single filter clause
   */
  protected buildFilterClause(
    filter: FilterOptions,
    paramIndex: number
  ): { clause: string; newParamIndex: number } {
    const column = this.sanitizeColumnName(filter.field);

    switch (filter.operator) {
      case 'IS NULL':
        return { clause: `${column} IS NULL`, newParamIndex: paramIndex };
      case 'IS NOT NULL':
        return { clause: `${column} IS NOT NULL`, newParamIndex: paramIndex };
      case 'IN':
        if (Array.isArray(filter.value)) {
          const placeholders = filter.value
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          return {
            clause: `${column} IN (${placeholders})`,
            newParamIndex: paramIndex + filter.value.length,
          };
        }
        return { clause: `${column} IN ($${paramIndex})`, newParamIndex: paramIndex + 1 };
      default:
        return {
          clause: `${column} ${filter.operator} $${paramIndex}`,
          newParamIndex: paramIndex + 1,
        };
    }
  }

  /**
   * Sanitize column name to prevent SQL injection
   */
  protected sanitizeColumnName(name: string): string {
    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new RepositoryError(
        `Invalid column name: ${name}`,
        'INVALID_COLUMN_NAME'
      );
    }
    return name;
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  /**
   * Execute a function within a database transaction
   *
   * @param fn - Function to execute within the transaction
   * @returns Result of the function
   */
  async withTransaction<R>(fn: (client: Pool) => Promise<R>): Promise<R> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(this.pool);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Handle database errors and convert to appropriate repository errors
   */
  protected handleDatabaseError(error: unknown, operation: string): RepositoryError {
    if (error instanceof RepositoryError) {
      return error;
    }

    const dbError = error as { code?: string; constraint?: string; message?: string };

    // Handle specific PostgreSQL error codes
    if (dbError.code === '23505') {
      // Unique violation
      return new ConstraintError(
        `Duplicate entry violates unique constraint`,
        dbError.constraint ?? 'unknown'
      );
    }

    if (dbError.code === '23503') {
      // Foreign key violation
      return new ConstraintError(
        `Foreign key constraint violated`,
        dbError.constraint ?? 'unknown'
      );
    }

    if (dbError.code === '23502') {
      // Not null violation
      return new ConstraintError(
        `Required field cannot be null`,
        dbError.constraint ?? 'unknown'
      );
    }

    // Generic database error
    return new RepositoryError(
      `Database error during ${operation}: ${dbError.message ?? 'Unknown error'}`,
      dbError.code ?? 'UNKNOWN_ERROR'
    );
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if an entity exists by ID
   *
   * @param id - Entity ID
   * @returns True if entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const query = `SELECT 1 FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL LIMIT 1`;
      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      throw this.handleDatabaseError(error, 'exists');
    }
  }

  /**
   * Count entities matching the given options
   *
   * @param options - Query options
   * @returns Count of matching entities
   */
  async count(options: Omit<QueryOptions, 'pagination'> = {}): Promise<number> {
    try {
      const { query, params } = this.buildCountQuery(options);
      const result = await this.pool.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw this.handleDatabaseError(error, 'count');
    }
  }

  /**
   * Execute a raw SQL query
   *
   * @param query - SQL query string
   * @param params - Query parameters
   * @returns Query result
   */
  protected async executeRawQuery<R extends QueryResultRow = QueryResultRow>(
    query: string,
    params: unknown[] = []
  ): Promise<QueryResult<R>> {
    try {
      return await this.pool.query<R>(query, params);
    } catch (error) {
      throw this.handleDatabaseError(error, 'executeRawQuery');
    }
  }
}
