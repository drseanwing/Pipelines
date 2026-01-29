/**
 * QI Research Pipeline - LLM Integration Layer
 *
 * This module exports the Claude API client and related types for the
 * QI/Research Project Development Pipeline. It provides functions for
 * text completion, structured output parsing, project classification,
 * and content generation.
 *
 * @module llm
 *
 * @example
 * ```typescript
 * import {
 *   complete,
 *   completeWithStructuredOutput,
 *   classifyProject,
 *   generateContent,
 *   estimateTokens,
 *   LLMError,
 * } from '@/llm';
 *
 * // Simple completion
 * const response = await complete('Summarize this research...');
 *
 * // Structured output with Zod schema
 * const data = await completeWithStructuredOutput(prompt, schema);
 *
 * // Project classification
 * const classification = await classifyProject(concept, problem, outcomes);
 *
 * // Content generation from template
 * const content = await generateContent(template, context);
 * ```
 */

// ============================================================================
// Client Functions
// ============================================================================

export {
  // Core completion functions
  complete,
  completeWithMetadata,

  // Structured output functions
  completeWithStructuredOutput,
  completeWithStructuredOutputFull,

  // Pipeline-specific functions
  classifyProject,
  generateContent,

  // Token counting utilities
  estimateTokens,
  checkTokenLimit,

  // Utility functions
  resetClient,
  getModelLimits,
} from './client.js';

// ============================================================================
// Types
// ============================================================================

export {
  // Interfaces
  type CompletionOptions,
  type CompletionResult,
  type RetryConfig,
  type LLMConfig,
  type TokenUsage,
  type StructuredOutputResult,

  // Error types
  type LLMErrorType,
  LLMError,
} from './types.js';
