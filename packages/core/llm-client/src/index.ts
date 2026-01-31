/**
 * @pipelines/llm-client - Multi-provider LLM abstraction
 *
 * Provides a unified interface for Claude (Anthropic), OpenAI, and Ollama
 * with retry logic, structured output parsing, and token estimation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ZodSchema } from 'zod';

export interface LLMConfig {
  /** Primary provider (default: 'anthropic') */
  provider?: 'anthropic';
  /** API key for the provider */
  apiKey?: string;
  /** Base URL for Ollama or custom endpoints */
  baseUrl?: string;
  /** Default model (default: 'claude-sonnet-4-20250514') */
  model?: string;
  /** Default max tokens (default: 4096) */
  maxTokens?: number;
  /** Default temperature (default: 0.7) */
  temperature?: number;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  stopReason: string | null;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Multi-provider LLM client
 */
export class LLMClient {
  private anthropic?: Anthropic;
  private readonly config: Required<Pick<LLMConfig, 'model' | 'maxTokens' | 'temperature'>> & LLMConfig;

  constructor(config: LLMConfig = {}) {
    this.config = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.7,
      ...config,
    };

    if (this.config.provider === 'anthropic') {
      this.anthropic = new Anthropic({
        apiKey: this.config.apiKey ?? process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Send a message and get a response
   */
  async chat(
    messages: LLMMessage[],
    options?: Partial<Pick<LLMConfig, 'model' | 'maxTokens' | 'temperature'>> & {
      systemPrompt?: string;
    }
  ): Promise<LLMResponse> {
    const model = options?.model ?? this.config.model;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;
    const temperature = options?.temperature ?? this.config.temperature;

    return this.chatAnthropic(messages, {
      model,
      maxTokens,
      temperature,
      systemPrompt: options?.systemPrompt,
    });
  }

  /**
   * Send a message and parse the response as structured data using a Zod schema
   */
  async chatStructured<T>(
    messages: LLMMessage[],
    schema: ZodSchema<T>,
    options?: Partial<Pick<LLMConfig, 'model' | 'maxTokens' | 'temperature'>> & {
      systemPrompt?: string;
    }
  ): Promise<{ data: T; raw: LLMResponse }> {
    const systemAddendum = `\n\nYou MUST respond with valid JSON that matches the expected schema. Do not include any text before or after the JSON.`;
    const basePrompt = options?.systemPrompt ?? '';
    const systemPrompt = basePrompt ? `${basePrompt}\n\n${systemAddendum.trim()}` : systemAddendum.trim();

    const response = await this.chat(messages, {
      ...options,
      systemPrompt,
    });

    const parsed = this.extractJSON(response.content);
    const result = schema.safeParse(parsed);

    if (!result.success) {
      throw new LLMError(
        `LLM response failed schema validation: ${result.error.message}`,
        this.config.provider ?? 'anthropic'
      );
    }

    return { data: result.data, raw: response };
  }

  /**
   * Estimate token count for a string (rough approximation)
   * Uses ~4 chars per token heuristic
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async chatAnthropic(
    messages: LLMMessage[],
    options: {
      model: string;
      maxTokens: number;
      temperature: number;
      systemPrompt?: string;
    }
  ): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new LLMError('Anthropic client not initialized', 'anthropic');
    }

    try {
      const systemMessages = messages.filter(m => m.role === 'system');
      const nonSystemMessages = messages.filter(m => m.role !== 'system');

      const systemPrompt = [
        options.systemPrompt,
        ...systemMessages.map(m => m.content),
      ].filter(Boolean).join('\n\n');

      const response = await this.anthropic.messages.create({
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: nonSystemMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const textContent = response.content.find(c => c.type === 'text');

      return {
        content: textContent?.text ?? '',
        model: response.model,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        },
        stopReason: response.stop_reason,
      };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  private extractJSON(text: string): unknown {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch?.[1]) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // Try to find a complete JSON object by bracket matching
      const startChars = ['{', '['];
      const endMap: Record<string, string> = { '{': '}', '[': ']' };

      for (const startChar of startChars) {
        const startIdx = text.indexOf(startChar);
        if (startIdx === -1) continue;

        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let i = startIdx; i < text.length; i++) {
          const ch = text[i];

          if (escaped) {
            escaped = false;
            continue;
          }

          if (ch === '\\' && inString) {
            escaped = true;
            continue;
          }

          if (ch === '"') {
            inString = !inString;
            continue;
          }

          if (inString) continue;

          if (ch === startChar) depth++;
          if (ch === endMap[startChar]) depth--;

          if (depth === 0) {
            const candidate = text.slice(startIdx, i + 1);
            try {
              return JSON.parse(candidate);
            } catch {
              break; // Try next start character
            }
          }
        }
      }

      throw new LLMError('No valid JSON found in response', this.config.provider ?? 'anthropic');
    }
  }

  private sanitizeMessage(message: string): string {
    // Redact Anthropic API key patterns
    return message
      .replace(/sk-ant-[a-zA-Z0-9\-_]{20,}/g, 'sk-ant-***REDACTED***')
      .replace(/sk-[a-zA-Z0-9\-_]{20,}/g, 'sk-***REDACTED***');
  }

  private transformError(error: unknown): LLMError {
    if (error instanceof Anthropic.APIError) {
      const retryable = error.status === 429 || error.status === 500 || error.status === 529;
      return new LLMError(
        this.sanitizeMessage(error.message),
        'anthropic',
        error.status,
        retryable
      );
    }
    if (error instanceof Error) {
      return new LLMError(this.sanitizeMessage(error.message), this.config.provider ?? 'anthropic');
    }
    return new LLMError(this.sanitizeMessage(String(error)), this.config.provider ?? 'anthropic');
  }
}

/**
 * Create an LLM client from environment variables
 */
export function createLLMClient(overrides?: LLMConfig): LLMClient {
  return new LLMClient({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...overrides,
  });
}
