/**
 * QI Research Pipeline - Database Connection
 *
 * PostgreSQL connection pool with retry logic and helper functions.
 * Configure via environment variables:
 * - DB_HOST: Database host (default: 'localhost')
 * - DB_PORT: Database port (default: 5432)
 * - DB_NAME: Database name (default: 'qi_research')
 * - DB_USER: Database user (default: 'postgres')
 * - DB_PASSWORD: Database password (required)
 * - DB_SSL: Enable SSL (default: false)
 *
 * @module db/connection
 */

import {
  Pool,
  type PoolClient as PgPoolClient,
  type QueryResult as PgQueryResult,
  type QueryResultRow,
} from 'pg';
import { logger } from '../utils/logger.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Query result type with proper constraint
 */
export type QueryResult<T extends QueryResultRow = QueryResultRow> = PgQueryResult<T>;

/**
 * Pooled client type
 */
export type PoolClient = PgPoolClient;

/**
 * Transaction callback function type
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get database configuration from environment variables
 */
function getDatabaseConfig(): DatabaseConfig {
  const sslEnv = process.env['DB_SSL']?.toLowerCase();
  let ssl: boolean | { rejectUnauthorized: boolean } = false;

  if (sslEnv === 'true' || sslEnv === '1') {
    ssl = { rejectUnauthorized: false };
  } else if (sslEnv === 'require') {
    ssl = { rejectUnauthorized: true };
  }

  return {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    database: process.env['DB_NAME'] ?? 'qi_research',
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? '',
    ssl,
    max: parseInt(process.env['DB_POOL_SIZE'] ?? '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

// ============================================================================
// Retry Logic Utilities
// ============================================================================

/**
 * Calculate delay with exponential backoff
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );
  // Add jitter (0-25% of delay)
  const jitter = delay * Math.random() * 0.25;
  return Math.floor(delay + jitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an operation with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;

      logger.warn(`${operationName} attempt ${attempt + 1} failed`, {
        message: lastError.message,
      });

      if (attempt < config.maxRetries) {
        const delay = calculateBackoffDelay(attempt, config);
        logger.info(`Retrying ${operationName} in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `${operationName} failed after ${config.maxRetries + 1} attempts: ${lastError?.message ?? 'Unknown error'}`
  );
}

// ============================================================================
// Connection Pool
// ============================================================================

/**
 * Create the connection pool
 *
 * Note: pg.Pool creates connections lazily on first use, so this is safe
 * to call synchronously at module load time.
 */
function createPool(): Pool {
  const config = getDatabaseConfig();

  logger.debug('Creating database connection pool', {
    host: config.host,
    port: config.port,
    database: config.database,
    maxConnections: config.max,
  });

  const newPool = new Pool(config);

  // Set up error handler for unexpected disconnects
  newPool.on('error', (err: Error) => {
    logger.error('Unexpected database pool error', {
      message: err.message,
      stack: err.stack,
    });
  });

  // Log connection events
  newPool.on('connect', () => {
    logger.debug('New database client connected');
  });

  newPool.on('remove', () => {
    logger.debug('Database client removed from pool');
  });

  return newPool;
}

/**
 * The database connection pool instance
 *
 * This pool is created synchronously but connections are established lazily.
 * Use getClient() or query() for operations with automatic retry logic.
 */
export const pool: Pool = createPool();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the connection pool
 *
 * @returns The database connection pool
 */
export function getPool(): Pool {
  return pool;
}

/**
 * Get a client from the pool with retry logic
 *
 * IMPORTANT: Always release the client when done using `client.release()`
 *
 * @returns A database client from the pool
 *
 * @example
 * ```typescript
 * const client = await getClient();
 * try {
 *   const result = await client.query('SELECT * FROM projects');
 *   return result.rows;
 * } finally {
 *   client.release();
 * }
 * ```
 */
export async function getClient(): Promise<PoolClient> {
  return withRetry(
    () => pool.connect(),
    'Database connection'
  );
}

/**
 * Execute a query using the connection pool with retry logic
 *
 * @param text - SQL query string
 * @param params - Query parameters
 * @returns Query result
 *
 * @example
 * ```typescript
 * const result = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
 * const project = result.rows[0];
 * ```
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await withRetry(
      async () => {
        const client = await pool.connect();
        try {
          return await client.query<T>(text, params);
        } finally {
          client.release();
        }
      },
      'Database query'
    );

    const duration = Date.now() - start;

    logger.debug('Query executed', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rowCount: result.rowCount,
    });

    return result;
  } catch (err) {
    const error = err as Error;
    const duration = Date.now() - start;

    logger.error('Query failed', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      error: error.message,
    });

    throw err;
  }
}

/**
 * Execute a transaction
 *
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 * The callback receives a client that should be used for all queries within the transaction.
 *
 * @param callback - Async function that executes queries using the provided client
 * @returns The result of the callback function
 *
 * @example
 * ```typescript
 * const result = await transaction(async (client) => {
 *   await client.query('INSERT INTO projects (name) VALUES ($1)', ['Project A']);
 *   await client.query('INSERT INTO audit_log (action) VALUES ($1)', ['created']);
 *   return { success: true };
 * });
 * ```
 */
export async function transaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const client = await getClient();

  try {
    logger.debug('Beginning transaction');
    await client.query('BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Transaction committed');

    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.debug('Transaction rolled back');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close the database connection pool
 *
 * Should be called when shutting down the application.
 */
export async function closePool(): Promise<void> {
  logger.info('Closing database connection pool');
  await pool.end();
  logger.info('Database connection pool closed');
}

/**
 * Check if the database is healthy
 *
 * @returns true if the database is reachable and responding
 */
export async function isHealthy(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1 as health');
    return result.rows.length === 1;
  } catch {
    return false;
  }
}

/**
 * Get pool statistics
 *
 * @returns Current pool statistics
 */
export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Test the database connection with retry logic
 *
 * Use this to verify connectivity on application startup.
 *
 * @returns true if connection successful
 * @throws Error if connection fails after all retries
 */
export async function testConnection(): Promise<boolean> {
  logger.info('Testing database connection...');

  await withRetry(
    async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    },
    'Database connection test'
  );

  logger.info('Database connection test successful');
  return true;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  pool,
  getPool,
  getClient,
  query,
  transaction,
  closePool,
  isHealthy,
  getPoolStats,
  testConnection,
};
