import { describe, it, expect } from 'vitest';
import { LLMClient, LLMError, createLLMClient } from './index.js';

describe('@pipelines/llm-client', () => {
  describe('LLMClient constructor', () => {
    it('creates with default config', () => {
      const client = new LLMClient({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(LLMClient);
    });

    it('accepts custom config', () => {
      const client = new LLMClient({
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-haiku-20240307',
        maxTokens: 1000,
        temperature: 0.5,
      });
      expect(client).toBeInstanceOf(LLMClient);
    });
  });

  describe('estimateTokens', () => {
    it('estimates token count', () => {
      const client = new LLMClient({ apiKey: 'test-key' });
      expect(client.estimateTokens('Hello world')).toBe(3); // 11 chars / 4
      expect(client.estimateTokens('')).toBe(0);
    });
  });

  describe('LLMError', () => {
    it('creates with provider info', () => {
      const err = new LLMError('test', 'anthropic', 429, true);
      expect(err.provider).toBe('anthropic');
      expect(err.statusCode).toBe(429);
      expect(err.retryable).toBe(true);
      expect(err.name).toBe('LLMError');
    });
  });

  describe('createLLMClient', () => {
    it('creates client with overrides', () => {
      const client = createLLMClient({ apiKey: 'test-key', model: 'claude-3-haiku-20240307' });
      expect(client).toBeInstanceOf(LLMClient);
    });
  });
});
