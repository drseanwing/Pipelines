import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMClient, LLMError, createLLMClient } from './index.js';
import { z } from 'zod';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

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

  describe('chat', () => {
    let client: LLMClient;
    let mockCreate: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default as any;
      client = new LLMClient({ apiKey: 'test-key' });
      mockCreate = (client as any).anthropic?.messages.create;
      mockCreate.mockClear();
    });

    it('sends messages and returns response', async () => {
      mockCreate.mockResolvedValueOnce({
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Hello! How can I help?' }],
        usage: { input_tokens: 10, output_tokens: 15 },
        stop_reason: 'end_turn',
      });

      const response = await client.chat([
        { role: 'user', content: 'Hello' },
      ]);

      expect(response.content).toBe('Hello! How can I help?');
      expect(response.model).toBe('claude-sonnet-4-20250514');
      expect(response.tokensUsed.total).toBe(25);
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('handles system prompts', async () => {
      mockCreate.mockResolvedValueOnce({
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Understood' }],
        usage: { input_tokens: 20, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await client.chat(
        [{ role: 'user', content: 'Be concise' }],
        { systemPrompt: 'You are a helpful assistant.' }
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant.',
        })
      );
    });

    it('merges system messages into system prompt', async () => {
      mockCreate.mockResolvedValueOnce({
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'OK' }],
        usage: { input_tokens: 10, output_tokens: 2 },
        stop_reason: 'end_turn',
      });

      await client.chat([
        { role: 'system', content: 'Be helpful' },
        { role: 'user', content: 'Hi' },
        { role: 'system', content: 'Be concise' },
      ]);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'Be helpful\n\nBe concise',
        })
      );
    });

    it('applies custom options', async () => {
      mockCreate.mockResolvedValueOnce({
        model: 'custom-model',
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 10 },
        stop_reason: 'end_turn',
      });

      await client.chat(
        [{ role: 'user', content: 'Test' }],
        { model: 'custom-model', maxTokens: 500, temperature: 0.3 }
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom-model',
          max_tokens: 500,
          temperature: 0.3,
        })
      );
    });
  });

  describe('chatStructured', () => {
    let client: LLMClient;
    let mockCreate: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default as any;
      client = new LLMClient({ apiKey: 'test-key' });
      mockCreate = (client as any).anthropic?.messages.create;
      mockCreate.mockClear();
    });

    it('parses and validates JSON response', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockCreate.mockResolvedValueOnce({
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '{"name": "Alice", "age": 30}' }],
        usage: { input_tokens: 20, output_tokens: 10 },
        stop_reason: 'end_turn',
      });

      const result = await client.chatStructured(
        [{ role: 'user', content: 'Get user info' }],
        schema
      );

      expect(result.data).toEqual({ name: 'Alice', age: 30 });
      expect(result.raw.content).toBe('{"name": "Alice", "age": 30}');
    });

    it('extracts JSON from markdown code blocks', async () => {
      const schema = z.object({ value: z.number() });

      mockCreate.mockResolvedValueOnce({
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '```json\n{"value": 42}\n```' }],
        usage: { input_tokens: 10, output_tokens: 15 },
        stop_reason: 'end_turn',
      });

      const result = await client.chatStructured(
        [{ role: 'user', content: 'Return number' }],
        schema
      );

      expect(result.data).toEqual({ value: 42 });
    });

    it('throws on schema validation failure', async () => {
      const schema = z.object({
        required: z.string(),
      });

      mockCreate.mockResolvedValueOnce({
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '{"wrong": "field"}' }],
        usage: { input_tokens: 10, output_tokens: 10 },
        stop_reason: 'end_turn',
      });

      await expect(
        client.chatStructured([{ role: 'user', content: 'Test' }], schema)
      ).rejects.toThrow(LLMError);
    });

    it('appends JSON instruction to system prompt', async () => {
      const schema = z.object({ value: z.boolean() });

      mockCreate.mockResolvedValueOnce({
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '{"value": true}' }],
        usage: { input_tokens: 15, output_tokens: 8 },
        stop_reason: 'end_turn',
      });

      await client.chatStructured(
        [{ role: 'user', content: 'Test' }],
        schema,
        { systemPrompt: 'Custom prompt' }
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Custom prompt'),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('valid JSON'),
        })
      );
    });
  });
});
