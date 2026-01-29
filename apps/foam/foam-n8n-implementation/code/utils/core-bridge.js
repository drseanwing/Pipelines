/**
 * FOAM Core Package Bridge
 *
 * Maps FOAM's existing utilities to @pipelines/* core packages.
 *
 * Migration Guide:
 *   - logging.js -> @pipelines/logging (createLogger)
 *   - error-handler.js -> @pipelines/retry (withRetry, classifyError)
 *   - schema-validator.js -> @pipelines/validation (validate, validateOrThrow)
 *
 * Note: FOAM's n8n Code Nodes run in a sandboxed environment
 * that may not support ESM imports from workspace packages.
 * The n8n-utils package provides CJS-compatible helpers.
 *
 * For n8n Code Node usage, import from bundled utilities:
 *   const { withErrorHandling, renderPrompt } = require('@pipelines/n8n-utils');
 */

// Re-export core utilities for direct Node.js usage (not n8n Code Nodes)
export { createLogger } from '@pipelines/logging';
export { withRetry, classifyError } from '@pipelines/retry';
export { validate, validateOrThrow } from '@pipelines/validation';
export { withErrorHandling, renderPrompt, successOutput, errorOutput } from '@pipelines/n8n-utils';
