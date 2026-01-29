/**
 * LLM Client Utilities
 * Phase 3.7 - Anthropic Claude API client and helpers
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMError } from './errors.js';

/**
 * Create and configure Anthropic client
 * @returns Configured Anthropic client instance
 */
export function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return new Anthropic({
    apiKey,
  });
}

/**
 * Sleep utility for exponential backoff
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param attempt - The current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Delay in milliseconds with jitter
 */
export function calculateBackoff(attempt: number, baseDelay: number = 1000): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // Add jitter (random value between 0 and 20% of delay)
  const jitter = Math.random() * exponentialDelay * 0.2;

  // Cap at 30 seconds
  return Math.min(exponentialDelay + jitter, 30000);
}

/**
 * Call the LLM with retry logic and exponential backoff
 * @param prompt - The user prompt
 * @param options - Optional configuration
 * @returns The LLM response text
 */
export async function callLLM(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
    temperature?: number;
    maxRetries?: number;
  }
): Promise<string> {
  const client = createAnthropicClient();

  const model = options?.model || 'claude-3-5-sonnet-20241022';
  const maxTokens = options?.maxTokens || 4096;
  const systemPrompt = options?.systemPrompt;
  const temperature = options?.temperature ?? 1.0;
  const maxRetries = options?.maxRetries ?? 3;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text content from response
      const textContent = message.content.find(
        (block) => block.type === 'text'
      );

      if (!textContent || textContent.type !== 'text') {
        throw new LLMError(
          'No text content in LLM response',
          model
        );
      }

      const responseText = textContent.text;

      if (!validateLLMResponse(responseText)) {
        throw new LLMError(
          'Invalid or empty LLM response',
          model
        );
      }

      return responseText;

    } catch (error) {
      lastError = error as Error;

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      const isRetryable =
        error instanceof Error &&
        (error.message.includes('overloaded') ||
         error.message.includes('rate_limit') ||
         error.message.includes('529') ||
         error.message.includes('503'));

      if (!isRetryable) {
        throw new LLMError(
          `LLM call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          model
        );
      }

      // Calculate backoff and wait
      const delay = calculateBackoff(attempt);
      console.warn(
        `LLM call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms...`
      );
      await sleep(delay);
    }
  }

  // If we get here, all retries failed
  throw new LLMError(
    `LLM call failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
    model
  );
}

/**
 * Validate that an LLM response is not empty or invalid
 * @param response - The response text to validate
 * @returns True if response is valid
 */
export function validateLLMResponse(response: string): boolean {
  if (!response || typeof response !== 'string') {
    return false;
  }

  const trimmed = response.trim();

  if (trimmed.length === 0) {
    return false;
  }

  // Check for common error patterns
  const errorPatterns = [
    /^error:/i,
    /^invalid/i,
    /^failed/i,
    /^sorry, I (?:cannot|can't)/i,
  ];

  for (const pattern of errorPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  return true;
}

/**
 * Parse JSON from LLM response, handling markdown code blocks
 * @param response - The LLM response text
 * @returns Parsed JSON object
 * @throws Error if JSON is invalid
 */
export function parseJSONResponse<T = any>(response: string): T {
  let jsonText = response.trim();

  // Remove markdown code block if present
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(jsonText) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
