import { describe, it, expect } from 'vitest';
import {
  withErrorHandling,
  createStageLog,
  renderPrompt,
  getInputJson,
  mergeInputItems,
  successOutput,
  errorOutput,
  parseLLMJson,
} from './index.js';

describe('@pipelines/n8n-utils', () => {
  describe('withErrorHandling', () => {
    it('passes through successful results', async () => {
      const fn = withErrorHandling(() => [{ json: { result: 'ok' } }]);
      const result = await fn([{ json: { input: 'test' } }]);
      expect(result[0]!.json.result).toBe('ok');
    });

    it('catches errors and returns structured error', async () => {
      const fn = withErrorHandling(() => { throw new Error('boom'); });
      const result = await fn([{ json: {} }]);
      expect(result[0]!.json.success).toBe(false);
      expect((result[0]!.json.error as Record<string, unknown>).message).toBe('boom');
    });
  });

  describe('createStageLog', () => {
    it('creates started log', () => {
      const log = createStageLog('extraction', 'started');
      expect(log.json.stage).toBe('extraction');
      expect(log.json.status).toBe('started');
      expect(log.json._type).toBe('stage_log');
    });
  });

  describe('renderPrompt', () => {
    it('substitutes variables', () => {
      const result = renderPrompt('Hello {name}, you are {age}', { name: 'World', age: 30 });
      expect(result).toBe('Hello World, you are 30');
    });

    it('leaves unknown variables unchanged', () => {
      const result = renderPrompt('Hello {name} and {unknown}', { name: 'World' });
      expect(result).toBe('Hello World and {unknown}');
    });
  });

  describe('getInputJson', () => {
    it('returns first item json', () => {
      const result = getInputJson([{ json: { key: 'value' } }]);
      expect(result).toEqual({ key: 'value' });
    });

    it('throws on empty input', () => {
      expect(() => getInputJson([])).toThrow('No input items');
    });
  });

  describe('mergeInputItems', () => {
    it('merges multiple items', () => {
      const result = mergeInputItems([
        { json: { a: 1 } },
        { json: { b: 2 } },
      ]);
      expect(result.json).toEqual({ a: 1, b: 2 });
    });

    it('groups under key when provided', () => {
      const result = mergeInputItems(
        [{ json: { a: 1 } }, { json: { b: 2 } }],
        'items'
      );
      expect(result.json.items).toEqual([{ a: 1 }, { b: 2 }]);
    });
  });

  describe('parseLLMJson', () => {
    it('parses raw JSON', () => {
      expect(parseLLMJson('{"key": "value"}')).toEqual({ key: 'value' });
    });

    it('parses JSON from code blocks', () => {
      const input = '```json\n{"key": "value"}\n```';
      expect(parseLLMJson(input)).toEqual({ key: 'value' });
    });

    it('removes trailing commas', () => {
      const input = '{"a": 1, "b": 2,}';
      expect(parseLLMJson(input)).toEqual({ a: 1, b: 2 });
    });

    it('throws on unparseable input', () => {
      expect(() => parseLLMJson('not json at all')).toThrow('Failed to parse');
    });
  });

  describe('successOutput / errorOutput', () => {
    it('creates success output', () => {
      const result = successOutput({ count: 5 });
      expect(result.json.success).toBe(true);
      expect(result.json.count).toBe(5);
    });

    it('creates error output', () => {
      const result = errorOutput('Something failed', { code: 'ERR_001' });
      expect(result.json.success).toBe(false);
      expect(result.json.error).toBe('Something failed');
      expect(result.json.code).toBe('ERR_001');
    });
  });
});
