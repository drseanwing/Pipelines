/**
 * CritLit Core Package Bridge
 *
 * Maps CritLit's existing utilities to @pipelines/* core packages.
 *
 * Migration Guide:
 *   - rate-limiter.js -> @pipelines/retry (withRetry) + @pipelines/pubmed (PubMedClient with built-in rate limiting)
 *   - checkpoint-utils.js -> @pipelines/checkpoint (CheckpointManager)
 *   - screening-utils.js -> kept as app-specific (SLR-specific screening logic)
 *
 * Note: CritLit's n8n Code Nodes run in a sandboxed environment.
 * Use @pipelines/n8n-utils for n8n-compatible helpers.
 */

// Re-export core utilities for direct Node.js usage
export { withRetry, classifyError } from '@pipelines/retry';
export { CheckpointManager } from '@pipelines/checkpoint';
export { PubMedClient, createPubMedClient } from '@pipelines/pubmed';
export { withErrorHandling, renderPrompt, successOutput, errorOutput } from '@pipelines/n8n-utils';
export { createLogger } from '@pipelines/logging';
export { Database, createDatabase } from '@pipelines/database';
