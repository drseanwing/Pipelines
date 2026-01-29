/**
 * QI Research Pipeline - Claude API Client
 *
 * This module provides a wrapper around the Anthropic Claude API with retry logic,
 * structured output parsing, and specialized functions for the research pipeline.
 *
 * @module llm/client
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ClassificationSchema, type Classification } from '../types/index.js';
import type {
  CompletionOptions,
  CompletionResult,
  LLMConfig,
  RetryConfig,
  StructuredOutputResult,
} from './types.js';
import { LLMError } from './types.js';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Load LLM configuration from environment variables
 */
function loadConfig(): LLMConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new LLMError(
      'ANTHROPIC_API_KEY environment variable is required',
      'authentication_error',
      { retryable: false }
    );
  }

  return {
    apiKey,
    model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    retry: DEFAULT_RETRY_CONFIG,
  };
}

// ============================================================================
// Client Singleton
// ============================================================================

let anthropicClient: Anthropic | null = null;
let config: LLMConfig | null = null;

/**
 * Get or create the Anthropic client instance
 */
function getClient(): Anthropic {
  if (!anthropicClient) {
    config = loadConfig();
    anthropicClient = new Anthropic({
      apiKey: config.apiKey,
    });
  }
  return anthropicClient;
}

/**
 * Get the current configuration
 */
function getConfig(): LLMConfig {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential backoff: base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add random jitter (0-25% of the delay)
  const jitter = exponentialDelay * Math.random() * 0.25;
  // Cap at max delay
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // Rate limits and server errors are retryable
    const retryableStatuses = [429, 500, 502, 503, 504];
    return error.status !== undefined && retryableStatuses.includes(error.status);
  }

  if (error instanceof Error) {
    // Network errors are typically retryable
    const networkErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
    return networkErrors.some(code => error.message.includes(code));
  }

  return false;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if it's the last attempt or not retryable
      if (attempt >= retryConfig.maxRetries || !isRetryableError(error)) {
        break;
      }

      // Calculate delay and wait before retrying
      const delay = calculateBackoffDelay(
        attempt,
        retryConfig.baseDelayMs,
        retryConfig.maxDelayMs
      );

      console.warn(
        `LLM request failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), ` +
        `retrying in ${Math.round(delay)}ms: ${lastError.message}`
      );

      await sleep(delay);
    }
  }

  // Transform the error into an LLMError
  throw transformError(lastError!);
}

/**
 * Transform an error into an LLMError
 */
function transformError(error: Error): LLMError {
  if (error instanceof LLMError) {
    return error;
  }

  if (error instanceof Anthropic.APIError) {
    const typeMap: Record<number, { type: LLMError['type']; retryable: boolean }> = {
      400: { type: 'invalid_request_error', retryable: false },
      401: { type: 'authentication_error', retryable: false },
      403: { type: 'authentication_error', retryable: false },
      404: { type: 'invalid_request_error', retryable: false },
      429: { type: 'rate_limit_error', retryable: true },
      500: { type: 'api_error', retryable: true },
      502: { type: 'api_error', retryable: true },
      503: { type: 'overloaded_error', retryable: true },
      504: { type: 'timeout_error', retryable: true },
    };

    const status = error.status ?? 0;
    const errorInfo = typeMap[status] || { type: 'unknown_error' as const, retryable: false };

    return new LLMError(error.message, errorInfo.type, {
      statusCode: error.status,
      retryable: errorInfo.retryable,
      cause: error,
    });
  }

  // Network or other errors
  if (error.message.includes('ECONNRESET') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')) {
    return new LLMError(error.message, 'network_error', {
      retryable: true,
      cause: error,
    });
  }

  return new LLMError(error.message, 'unknown_error', {
    retryable: false,
    cause: error,
  });
}

// ============================================================================
// Token Counting Utility
// ============================================================================

/**
 * Estimate token count for a string
 *
 * This is a rough estimate. For accurate counts, use the Anthropic tokenizer.
 * Generally, 1 token is approximately 4 characters for English text.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) {return 0;}

  // Basic heuristic: ~4 characters per token for English
  // Adjust for whitespace and punctuation
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  // Use a weighted average of character and word-based estimates
  const charBasedEstimate = charCount / 4;
  const wordBasedEstimate = wordCount * 1.3;

  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Check if content will exceed token limit
 *
 * @param text - The text to check
 * @param limit - Maximum token limit
 * @returns Object with exceeds flag and estimated count
 */
export function checkTokenLimit(
  text: string,
  limit: number
): { exceeds: boolean; estimated: number; remaining: number } {
  const estimated = estimateTokens(text);
  return {
    exceeds: estimated > limit,
    estimated,
    remaining: Math.max(0, limit - estimated),
  };
}

// ============================================================================
// Core Completion Functions
// ============================================================================

/**
 * Send a completion request to Claude
 *
 * @param prompt - The user prompt to send
 * @param options - Optional completion parameters
 * @returns The completion result with content and metadata
 *
 * @example
 * ```typescript
 * const result = await complete(
 *   'Summarize the key findings from this research...',
 *   { temperature: 0.5, maxTokens: 2000 }
 * );
 * console.log(result); // 'The key findings include...'
 * ```
 */
export async function complete(
  prompt: string,
  options?: CompletionOptions
): Promise<string> {
  const result = await completeWithMetadata(prompt, options);
  return result.content;
}

/**
 * Send a completion request and return full metadata
 *
 * @param prompt - The user prompt to send
 * @param options - Optional completion parameters
 * @returns Full completion result with token usage and metadata
 */
export async function completeWithMetadata(
  prompt: string,
  options?: CompletionOptions
): Promise<CompletionResult> {
  const client = getClient();
  const cfg = getConfig();

  const model = options?.model || cfg.model;
  const maxTokens = options?.maxTokens || cfg.maxTokens;
  const temperature = options?.temperature ?? cfg.temperature;
  const system = options?.system;

  const response = await withRetry(async () => {
    return await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: system,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
    });
  });

  // Extract text content from response
  const textContent = response.content.find(block => block.type === 'text');
  const content = textContent && textContent.type === 'text' ? textContent.text : '';

  return {
    content,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    stopReason: response.stop_reason,
    requestId: response.id,
  };
}

// ============================================================================
// Structured Output Functions
// ============================================================================

/**
 * Extract JSON from a text response
 *
 * Handles responses that may have JSON embedded in markdown code blocks
 * or directly as text.
 */
function extractJSON(text: string): string {
  // Try to extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a JSON object or array directly
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }

  // Return as-is and let JSON.parse handle it
  return text.trim();
}

/**
 * Complete with structured output parsing using Zod schema
 *
 * Sends a prompt requesting JSON output and parses the response
 * according to the provided Zod schema for type-safe structured data.
 *
 * @param prompt - The user prompt requesting structured data
 * @param schema - Zod schema to validate and parse the response
 * @returns Parsed and validated data of type T
 *
 * @example
 * ```typescript
 * const resultSchema = z.object({
 *   summary: z.string(),
 *   keyPoints: z.array(z.string()),
 *   confidence: z.number(),
 * });
 *
 * const result = await completeWithStructuredOutput(
 *   'Analyze this article and return a JSON summary...',
 *   resultSchema
 * );
 * // result is typed as { summary: string; keyPoints: string[]; confidence: number }
 * ```
 */
export async function completeWithStructuredOutput<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: CompletionOptions
): Promise<T> {
  const result = await completeWithStructuredOutputFull(prompt, schema, options);
  return result.data;
}

/**
 * Complete with structured output and return full metadata
 *
 * @param prompt - The user prompt requesting structured data
 * @param schema - Zod schema to validate and parse the response
 * @param options - Optional completion parameters
 * @returns Structured output result with data, raw response, and usage
 */
export async function completeWithStructuredOutputFull<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: CompletionOptions
): Promise<StructuredOutputResult<T>> {
  // Add JSON instruction to the system prompt
  const systemPrompt = `${options?.system || 'You are a helpful assistant.'}\n\nIMPORTANT: You MUST respond with valid JSON only. Do not include any explanation or text outside the JSON object.`;

  const result = await completeWithMetadata(prompt, {
    ...options,
    system: systemPrompt,
    // Use lower temperature for structured output
    temperature: options?.temperature ?? 0.3,
  });

  try {
    const jsonStr = extractJSON(result.content);
    const parsed = JSON.parse(jsonStr);
    const validated = schema.parse(parsed);

    return {
      data: validated,
      rawResponse: result.content,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new LLMError(
        `Failed to parse structured output: ${error.errors.map(e => e.message).join(', ')}`,
        'parse_error',
        { retryable: false, cause: error }
      );
    }

    if (error instanceof SyntaxError) {
      throw new LLMError(
        `Invalid JSON in response: ${error.message}`,
        'parse_error',
        { retryable: false, cause: error }
      );
    }

    throw error;
  }
}

// ============================================================================
// Pipeline-Specific Functions
// ============================================================================

/**
 * Classify a project based on concept, problem, and outcomes
 *
 * Analyzes the project details and determines whether it should be
 * classified as QI, Research, or Hybrid, along with suggested designs.
 *
 * @param concept - Description of the project concept
 * @param problem - The clinical problem being addressed
 * @param outcomes - The intended outcomes of the project
 * @returns Classification result with type, confidence, reasoning, and suggestions
 *
 * @example
 * ```typescript
 * const classification = await classifyProject(
 *   'Implementing a sepsis screening protocol in the ED...',
 *   'Delayed recognition of sepsis leading to increased mortality...',
 *   'Reduced time to antibiotics and improved patient outcomes...'
 * );
 *
 * console.log(classification.projectType); // 'QI' | 'RESEARCH' | 'HYBRID'
 * console.log(classification.confidence);   // 0.85
 * ```
 */
export async function classifyProject(
  concept: string,
  problem: string,
  outcomes: string
): Promise<Classification> {
  const prompt = `You are an expert in distinguishing between Quality Improvement (QI) projects and Research projects in healthcare settings.

Analyze the following project details and classify it as QI, RESEARCH, or HYBRID:

## Project Concept
${concept}

## Clinical Problem
${problem}

## Intended Outcomes
${outcomes}

## Classification Criteria

**Quality Improvement (QI):**
- Primary goal is to improve local processes or outcomes
- Applies existing evidence to a specific context
- Does not aim to generate generalizable knowledge
- Results intended for local use
- Uses PDSA cycles, process mapping, or similar methods
- Examples: Reducing wait times, improving hand hygiene compliance

**Research:**
- Primary goal is to generate new, generalizable knowledge
- Tests hypotheses about cause-and-effect relationships
- Results intended for publication and broader application
- Uses controlled study designs (RCT, cohort, etc.)
- Systematic data collection with statistical analysis
- Examples: Testing a new treatment, validating a diagnostic tool

**Hybrid:**
- Contains significant elements of both QI and Research
- May start as QI with research questions emerging
- Local improvement with broader implications
- Requires careful ethics and governance navigation

Respond with a JSON object containing:
- projectType: "QI", "RESEARCH", or "HYBRID"
- confidence: A number between 0 and 1 indicating confidence in the classification
- reasoning: A brief explanation (2-3 sentences) of why this classification was chosen
- suggestedDesigns: An array of 2-4 suggested study/project designs appropriate for this type

Provide only the JSON object, no additional text.`;

  const result = await completeWithStructuredOutput(prompt, ClassificationSchema, {
    system: 'You are an expert healthcare research methodologist specializing in distinguishing QI from research projects. Provide accurate, evidence-based classifications.',
    temperature: 0.3,
  });

  // The schema guarantees all required fields are present after validation
  return result as Classification;
}

/**
 * Generate content from a template with context variables
 *
 * Expands a template string with the provided context values and
 * generates polished content suitable for documents.
 *
 * @param template - Template string with placeholders (e.g., {{variable}})
 * @param context - Key-value pairs to substitute into the template
 * @returns Generated content with template variables expanded
 *
 * @example
 * ```typescript
 * const content = await generateContent(
 *   'The {{projectType}} project titled "{{title}}" aims to {{objective}}.',
 *   {
 *     projectType: 'quality improvement',
 *     title: 'ED Sepsis Screening Enhancement',
 *     objective: 'reduce time to antibiotic administration',
 *   }
 * );
 * ```
 */
export async function generateContent(
  template: string,
  context: Record<string, unknown>
): Promise<string> {
  // Build context description
  const contextDescription = Object.entries(context)
    .map(([key, value]) => {
      const displayValue = typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value);
      return `${key}: ${displayValue}`;
    })
    .join('\n');

  const prompt = `You are a medical/scientific writing assistant. Generate content based on the following template and context.

## Template
${template}

## Context Variables
${contextDescription}

## Instructions
1. Replace all template placeholders ({{variable}}) with appropriate content from the context
2. Expand brief context values into well-written prose where appropriate
3. Maintain a professional, scientific writing style
4. Ensure the output is coherent and flows naturally
5. Do not add information not present or implied in the context
6. Return only the generated content, no additional commentary

Generate the content now:`;

  return complete(prompt, {
    system: 'You are an expert medical and scientific writer. Generate clear, accurate, and well-structured content based on templates and context. Use formal academic language appropriate for research protocols and grant applications.',
    temperature: 0.5,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Reset the client instance (useful for testing or config changes)
 */
export function resetClient(): void {
  anthropicClient = null;
  config = null;
}

/**
 * Get current token usage statistics
 * Note: This returns estimated limits, not actual usage tracking
 */
export function getModelLimits(model?: string): { contextWindow: number; maxOutput: number } {
  const modelName = model || getConfig().model;

  // Claude model context windows and max output tokens
  const limits: Record<string, { contextWindow: number; maxOutput: number }> = {
    'claude-opus-4-20250514': { contextWindow: 200000, maxOutput: 32000 },
    'claude-sonnet-4-20250514': { contextWindow: 200000, maxOutput: 64000 },
    'claude-3-5-sonnet-20241022': { contextWindow: 200000, maxOutput: 8192 },
    'claude-3-opus-20240229': { contextWindow: 200000, maxOutput: 4096 },
    'claude-3-sonnet-20240229': { contextWindow: 200000, maxOutput: 4096 },
    'claude-3-haiku-20240307': { contextWindow: 200000, maxOutput: 4096 },
  };

  return limits[modelName] || { contextWindow: 200000, maxOutput: 4096 };
}
