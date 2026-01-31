/**
 * Type Definitions Index
 * Phase 2.12 - Central re-export of all type modules
 *
 * Re-exports all types from:
 * - project.ts: Core project types, statuses, intake data
 * - research.ts: Research stage outputs, literature, citations
 * - methodology.ts: Study design, participants, outcomes, analysis
 * - ethics.ts: Ethics pathways, risk assessment, consent, governance
 * - documents.ts: Document generation types and metadata
 * - audit.ts: Audit logging and action tracking
 */

export * from './project.js';
export * from './research.js';
export * from './methodology.js';
export * from './ethics.js';
export * from './documents.js';
export * from './audit.js';

// Re-export commonly used types from other modules
export type { CitationStyle } from '../llm/prompts/documents.js';
