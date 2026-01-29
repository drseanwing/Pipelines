import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate, validateOrThrow, zodToJsonSchema, CommonSchemas } from './index.js';

describe('@pipelines/validation', () => {
  describe('validate', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().int().positive(),
    });

    it('returns valid result for correct data', () => {
      const result = validate(schema, { name: 'John', age: 30 });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
      expect(result.errors).toEqual([]);
    });

    it('returns errors for invalid data', () => {
      const result = validate(schema, { name: '', age: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns errors for missing fields', () => {
      const result = validate(schema, {});
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'name')).toBe(true);
    });
  });

  describe('validateOrThrow', () => {
    const schema = z.object({ id: z.string().uuid() });

    it('returns data for valid input', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const result = validateOrThrow(schema, { id });
      expect(result.id).toBe(id);
    });

    it('throws with context for invalid input', () => {
      expect(() => validateOrThrow(schema, { id: 'not-uuid' }, 'Test'))
        .toThrow('Test: Validation failed');
    });
  });

  describe('zodToJsonSchema', () => {
    it('converts string schema', () => {
      const result = zodToJsonSchema(z.string().email());
      expect(result).toEqual({ type: 'string', format: 'email' });
    });

    it('converts number schema', () => {
      const result = zodToJsonSchema(z.number().int().min(0).max(100));
      expect(result).toEqual({ type: 'integer', minimum: 0, maximum: 100 });
    });

    it('converts object schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = zodToJsonSchema(schema);
      expect(result.type).toBe('object');
      expect(result.properties).toBeDefined();
      expect(result.required).toContain('name');
    });

    it('converts enum schema', () => {
      const result = zodToJsonSchema(z.enum(['a', 'b', 'c']));
      expect(result).toEqual({ type: 'string', enum: ['a', 'b', 'c'] });
    });
  });

  describe('CommonSchemas', () => {
    it('validates UUID', () => {
      expect(CommonSchemas.uuid.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
      expect(CommonSchemas.uuid.safeParse('not-a-uuid').success).toBe(false);
    });

    it('validates pipeline status', () => {
      expect(CommonSchemas.pipelineStatus.safeParse('pending').success).toBe(true);
      expect(CommonSchemas.pipelineStatus.safeParse('invalid').success).toBe(false);
    });
  });
});
