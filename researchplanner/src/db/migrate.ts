#!/usr/bin/env node
/**
 * Database migration runner
 * Phase 2.19 - Migration Runner
 *
 * Manages database schema migrations with tracking and error handling
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClient } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MigrationRecord {
  name: string;
  executed_at: Date;
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationTable(): Promise<void> {
  const client = await getClient();

  try {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await client.query(query);
    console.log('✓ Migrations tracking table ready');
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  const client = await getClient();

  try {
    const query = 'SELECT name FROM migrations_log ORDER BY executed_at ASC';
    const result = await client.query(query);
    return result.rows.map((row: MigrationRecord) => row.name);
  } catch (error) {
    console.error('Error fetching executed migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Discover migration files in the migrations directory
 */
async function discoverMigrationFiles(): Promise<string[]> {
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');

  try {
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Alphabetical sort ensures correct order (001_, 002_, etc.)

    return sqlFiles;
  } catch (error) {
    console.error('Error reading migrations directory:', error);
    throw error;
  }
}

/**
 * Execute a single migration file
 */
async function executeMigration(filename: string): Promise<void> {
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const filePath = path.join(migrationsDir, filename);

  const client = await getClient();

  try {
    // Read migration SQL
    const sql = await fs.readFile(filePath, 'utf-8');

    // Execute migration in a transaction
    await client.query('BEGIN');

    // Execute the migration SQL
    await client.query(sql);

    // Record migration execution
    await client.query(
      'INSERT INTO migrations_log (name) VALUES ($1)',
      [filename]
    );

    await client.query('COMMIT');

    console.log(`✓ Executed migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed to execute migration: ${filename}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...\n');

  try {
    // Ensure migrations tracking table exists
    await createMigrationTable();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`Found ${executedMigrations.length} previously executed migrations`);

    // Discover available migration files
    const migrationFiles = await discoverMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration files\n`);

    // Determine pending migrations
    const pendingMigrations = migrationFiles.filter(
      (file) => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations. Database is up to date.');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migrations:\n`);

    // Execute each pending migration
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    console.log(`\n✓ Successfully executed ${pendingMigrations.length} migrations`);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Show migration status without executing
 */
async function showMigrationStatus(): Promise<void> {
  console.log('Database migration status:\n');

  try {
    await createMigrationTable();

    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = await discoverMigrationFiles();

    console.log('Executed migrations:');
    if (executedMigrations.length === 0) {
      console.log('  (none)');
    } else {
      executedMigrations.forEach((name) => {
        console.log(`  ✓ ${name}`);
      });
    }

    const pendingMigrations = migrationFiles.filter(
      (file) => !executedMigrations.includes(file)
    );

    console.log('\nPending migrations:');
    if (pendingMigrations.length === 0) {
      console.log('  (none)');
    } else {
      pendingMigrations.forEach((name) => {
        console.log(`  ○ ${name}`);
      });
    }

    console.log(`\nTotal: ${executedMigrations.length} executed, ${pendingMigrations.length} pending`);
  } catch (error) {
    console.error('Error checking migration status:', error);
    process.exit(1);
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'status':
        await showMigrationStatus();
        break;
      case 'up':
      case undefined:
        await runMigrations();
        break;
      default:
        console.log('Usage: migrate [command]');
        console.log('');
        console.log('Commands:');
        console.log('  (none)  Run all pending migrations (default)');
        console.log('  up      Run all pending migrations');
        console.log('  status  Show migration status without executing');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runMigrations, showMigrationStatus };
