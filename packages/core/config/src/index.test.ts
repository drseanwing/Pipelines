import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { loadConfig, ConfigError, requiredString } from './index.js';

describe('@pipelines/config', () => {
  describe('loadConfig', () => {
    it('loads valid config from env', () => {
      const schema = z.object({
        PORT: z.coerce.number().default(3000),
        HOST: z.string().default('localhost'),
      });

      const config = loadConfig(schema, {
        env: { PORT: '8080', HOST: 'example.com' },
      });

      expect(config.PORT).toBe(8080);
      expect(config.HOST).toBe('example.com');
    });

    it('applies defaults for missing optional vars', () => {
      const schema = z.object({
        PORT: z.coerce.number().default(3000),
        HOST: z.string().default('localhost'),
      });

      const config = loadConfig(schema, { env: {} });

      expect(config.PORT).toBe(3000);
      expect(config.HOST).toBe('localhost');
    });

    it('throws ConfigError for missing required vars', () => {
      const schema = z.object({
        DATABASE_URL: z.string().min(1),
      });

      expect(() => loadConfig(schema, { env: {} })).toThrow(ConfigError);
    });

    it('strips prefix from env vars', () => {
      const schema = z.object({
        N8N_USER: z.string(),
        N8N_PASSWORD: z.string(),
      });

      const config = loadConfig(schema, {
        env: {
          FOAM_N8N_USER: 'admin',
          FOAM_N8N_PASSWORD: 'secret',
        },
        prefix: 'FOAM',
      });

      expect(config.N8N_USER).toBe('admin');
      expect(config.N8N_PASSWORD).toBe('secret');
    });

    it('ConfigError contains error details', () => {
      const schema = z.object({
        REQUIRED_VAR: z.string().min(1),
        ANOTHER_VAR: z.number(),
      });

      try {
        loadConfig(schema, { env: {} });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigError);
        const configErr = err as ConfigError;
        expect(configErr.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
