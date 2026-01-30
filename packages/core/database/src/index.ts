/**
 * @pipelines/database - PostgreSQL connection pool, transactions, and utilities
 *
 * Provides a type-safe database connection layer with retry logic,
 * transaction support, health checks, and schema-qualified queries.
 */

import pg from 'pg';
const { Pool } = pg;
import type { PoolConfig, PoolClient, QueryResult, QueryConfig } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema?: string;
  /** Max pool size (default: 20) */
  maxConnections?: number;
  /** Idle timeout in ms (default: 30000) */
  idleTimeout?: number;
  /** Connection timeout in ms (default: 5000) */
  connectionTimeout?: number;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Database connection wrapper with pool management
 */
export class Database {
  private pool: InstanceType<typeof Pool>;
  private readonly schema?: string;

  constructor(config: DatabaseConfig) {
    this.schema = config.schema;

    // Validate schema name to prevent SQL injection
    if (this.schema !== undefined) {
      this.validateSchemaName(this.schema);
    }

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections ?? 20,
      idleTimeoutMillis: config.idleTimeout ?? 30000,
      connectionTimeoutMillis: config.connectionTimeout ?? 5000,
    };

    this.pool = new Pool(poolConfig);

    // Set search path for schema on each new connection
    if (this.schema) {
      this.pool.on('connect', (client) => {
        client.query(`SELECT set_config('search_path', $1 || ', public', false)`, [this.schema]);
      });
    }
  }

  /**
   * Validate schema name to prevent SQL injection
   * Only allows alphanumeric characters and underscores
   */
  private validateSchemaName(schema: string): void {
    if (!schema || schema.length > 63 || !/^[a-z_][a-z0-9_]*$/i.test(schema)) {
      throw new Error(
        `Invalid schema name: "${schema}". Must be 1-63 alphanumeric/underscore characters.`
      );
    }
  }

  /**
   * Execute a SQL query
   */
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /**
   * Execute a parameterized query config
   */
  async queryConfig<T extends Record<string, unknown> = Record<string, unknown>>(
    config: QueryConfig
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(config);
  }

  /**
   * Get a single row or null
   */
  async queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] ?? null;
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(
    fn: (client: TransactionClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txClient = new TransactionClient(client);
      const result = await fn(txClient);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database connectivity
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): PoolStats {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Gracefully close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Transaction-scoped client
 */
export class TransactionClient {
  constructor(private client: PoolClient) {}

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.client.query<T>(text, params);
  }

  async queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] ?? null;
  }
}

/**
 * Create a Database instance from environment variables
 */
export function createDatabase(overrides?: Partial<DatabaseConfig>): Database {
  return new Database({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? process.env.POSTGRES_DB ?? 'pipelines',
    user: process.env.DB_USER ?? process.env.POSTGRES_USER ?? 'pipelines',
    password: process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD ?? undefined,
    schema: process.env.DB_SCHEMA,
    ...overrides,
  });
}

export type { PoolClient, QueryResult, QueryConfig } from 'pg';
