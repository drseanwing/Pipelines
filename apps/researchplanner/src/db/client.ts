/**
 * Database client for PostgreSQL connection management
 * Phase 2.13 - Database Client
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config();

let pool: pg.Pool | null = null;

/**
 * Create and return a PostgreSQL connection pool
 * Uses environment variables for configuration
 */
export function createPool(): pg.Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    host: process.env.DB_POSTGRESDB_HOST || 'localhost',
    port: parseInt(process.env.DB_POSTGRESDB_PORT || '5432', 10),
    database: process.env.DB_POSTGRESDB_DATABASE || 'research_planner',
    user: process.env.DB_POSTGRESDB_USER || 'research_user',
    password: process.env.DB_POSTGRESDB_PASSWORD,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
    // Log the error but don't immediately kill the process
    // Let the application handle the error gracefully
    throw new Error(`Database pool error: ${err.message}`);
  });

  return pool;
}

/**
 * Get a single client connection from the pool
 * Caller is responsible for releasing the client back to the pool
 *
 * @returns Promise resolving to a PoolClient
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   // ... do work
 *   await client.query('COMMIT');
 * } catch (e) {
 *   await client.query('ROLLBACK');
 *   throw e;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient(): Promise<pg.PoolClient> {
  const activePool = pool || createPool();
  return await activePool.connect();
}

/**
 * Close the connection pool and all active connections
 * Should be called during application shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Export the pool instance for direct access if needed
 * Use createPool() to ensure pool is initialized
 */
export function getPool(): pg.Pool {
  return pool || createPool();
}
