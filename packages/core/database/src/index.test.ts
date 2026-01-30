import { describe, it, expect, vi, afterEach } from 'vitest';
import { Database, createDatabase } from './index.js';

// Note: These tests validate the API surface without requiring a real database.
// Integration tests with a real database are in the apps/ tests.

describe('@pipelines/database', () => {
  const dbInstances: Database[] = [];

  // Clean up all database connections after each test
  afterEach(async () => {
    await Promise.all(dbInstances.map(db => db.close().catch(() => {})));
    dbInstances.length = 0;
  });

  describe('Database constructor', () => {
    it('creates a Database instance', () => {
      // This will create a pool but won't connect until a query is made
      const db = new Database({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      });
      dbInstances.push(db);
      expect(db).toBeInstanceOf(Database);
    });

    it('accepts schema option', () => {
      const db = new Database({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        schema: 'foam',
      });
      dbInstances.push(db);
      expect(db).toBeInstanceOf(Database);
    });
  });

  describe('createDatabase', () => {
    it('creates from env with defaults', () => {
      const db = createDatabase({
        host: 'testhost',
        port: 5433,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      });
      dbInstances.push(db);
      expect(db).toBeInstanceOf(Database);
    });
  });

  describe('getPoolStats', () => {
    it('returns pool statistics', () => {
      const db = new Database({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      });
      dbInstances.push(db);

      const stats = db.getPoolStats();
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('idleCount');
      expect(stats).toHaveProperty('waitingCount');
    });
  });

  describe('validateSchemaName', () => {
    it('should accept valid schema names', () => {
      // Valid names should not throw during Database construction
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'foam' })).not.toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'qi' })).not.toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'slr' })).not.toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'my_schema' })).not.toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: '_private' })).not.toThrow();
    });

    it('should reject SQL injection payloads', () => {
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: "'; DROP TABLE users; --" })).toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'schema name' })).toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'schema;' })).toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: "schema'" })).toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'schema"' })).toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'schema-name' })).toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: '' })).toThrow();
      expect(() => new Database({ host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test', schema: 'a'.repeat(64) })).toThrow();
    });
  });
});
