/**
 * QI Research Pipeline - Agents
 *
 * This module exports all pipeline agents for the QI/Research Project
 * Development Pipeline. Each agent handles a specific stage of the pipeline.
 *
 * @module agents
 *
 * @example
 * ```typescript
 * import {
 *   IntakeAgent,
 *   ResearchAgent,
 *   MethodologyAgent,
 *   EthicsAgent,
 *   DocumentAgent,
 * } from '@/agents';
 *
 * // Create agents with repositories
 * const methodologyAgent = new MethodologyAgent(projectRepo, auditRepo);
 *
 * // Develop methodology for a project
 * const methodology = await methodologyAgent.developMethodology('project-123');
 * ```
 */

// ============================================================================
// Stage 1: Intake Agent
// ============================================================================

export {
  IntakeAgent,
  IntakeAgentError,
  createIntakeAgent,
  type ValidationResult as IntakeValidationResult,
  type ValidationError,
} from './IntakeAgent.js';

// ============================================================================
// Stage 2: Research Agent
// ============================================================================

export {
  ResearchAgent,
  ResearchAgentError,
  type ResearchAgentConfig,
  type RawArticle,
  type DatabaseSearchResults,
} from './ResearchAgent.js';

// ============================================================================
// Stage 3: Methodology Agent
// ============================================================================

export {
  MethodologyAgent,
  MethodologyAgentError,
  type MethodologyDevelopmentOptions,
  type TimelineOptions,
} from './MethodologyAgent.js';

// ============================================================================
// Stage 4: Ethics Agent
// ============================================================================

export {
  EthicsAgent,
  EthicsAgentError,
  createEthicsAgent,
} from './EthicsAgent.js';

// ============================================================================
// Stage 5: Document Agent
// ============================================================================

export {
  DocumentAgent,
  type DocumentContent,
  type DocumentSectionContent,
  type ValidationResult as DocumentValidationResult,
  type DocumentGenerationConfig,
} from './DocumentAgent.js';
