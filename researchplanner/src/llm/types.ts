/**
 * QI Research Pipeline - LLM Types
 *
 * This module defines types for the LLM (Large Language Model) integration layer.
 * These types handle completion options, results, and API-specific configurations.
 *
 * @module llm/types
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Options for LLM completion requests
 *
 * @example
 * ```typescript
 * const options: CompletionOptions = {
 *   model: 'claude-sonnet-4-20250514',
 *   maxTokens: 4096,
 *   temperature: 0.7,
 *   system: 'You are a research methodology assistant.',
 * };
 * ```
 */
export interface CompletionOptions {
  /** Claude model to use (e.g., 'claude-sonnet-4-20250514') */
  model?: string;
  /** Maximum tokens to generate in the response */
  maxTokens?: number;
  /** Temperature for response randomness (0-1, lower = more deterministic) */
  temperature?: number;
  /** System prompt to set assistant behavior */
  system?: string;
  /** Stop sequences to end generation */
  stopSequences?: string[];
}

/**
 * Result from an LLM completion request
 *
 * @example
 * ```typescript
 * const result: CompletionResult = {
 *   content: 'The analysis shows...',
 *   model: 'claude-sonnet-4-20250514',
 *   inputTokens: 1500,
 *   outputTokens: 500,
 *   stopReason: 'end_turn',
 *   requestId: 'req_abc123',
 * };
 * ```
 */
export interface CompletionResult {
  /** The generated text content */
  content: string;
  /** Model used for the completion */
  model: string;
  /** Number of input tokens consumed */
  inputTokens: number;
  /** Number of output tokens generated */
  outputTokens: number;
  /** Reason the generation stopped */
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  /** Unique request identifier for debugging */
  requestId?: string;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries in milliseconds */
  baseDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
}

/**
 * LLM client configuration loaded from environment
 */
export interface LLMConfig {
  /** Anthropic API key */
  apiKey: string;
  /** Default model to use */
  model: string;
  /** Default maximum tokens */
  maxTokens: number;
  /** Default temperature */
  temperature: number;
  /** Retry configuration */
  retry: RetryConfig;
}

/**
 * Error types specific to LLM operations
 */
export type LLMErrorType =
  | 'authentication_error'
  | 'rate_limit_error'
  | 'api_error'
  | 'invalid_request_error'
  | 'overloaded_error'
  | 'timeout_error'
  | 'network_error'
  | 'parse_error'
  | 'unknown_error';

/**
 * Custom error class for LLM-specific errors
 */
export class LLMError extends Error {
  public readonly type: LLMErrorType;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly requestId?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    type: LLMErrorType,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      requestId?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'LLMError';
    this.type = type;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
    this.requestId = options?.requestId;
    this.originalError = options?.cause;
  }
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  /** Tokens used for input/prompt */
  inputTokens: number;
  /** Tokens used for output/completion */
  outputTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

/**
 * Structured output extraction result
 */
export interface StructuredOutputResult<T> {
  /** The parsed structured data */
  data: T;
  /** Raw text response before parsing */
  rawResponse: string;
  /** Token usage for this request */
  usage: TokenUsage;
}
