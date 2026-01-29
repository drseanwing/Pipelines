/**
 * LLM Prompt Templates
 *
 * Barrel export for all prompt templates used in the QI/Research Pipeline.
 * Each module provides system prompts, user prompt generators, and response parsers
 * for a specific stage of the pipeline.
 *
 * Usage:
 * ```typescript
 * import {
 *   classifyProjectPrompt,
 *   CLASSIFICATION_SYSTEM_PROMPT,
 *   parseClassificationResponse
 * } from '@/llm/prompts';
 * ```
 */

// -----------------------------------------------------------------------------
// Classification Prompts (Stage 1: Intake)
// -----------------------------------------------------------------------------

export {
  // System prompt
  CLASSIFICATION_SYSTEM_PROMPT,

  // User prompt generators
  classifyProjectPrompt,
  validateClassificationPrompt,

  // Response parsers
  parseClassificationResponse,

  // Helper functions
  getEthicsPathwayRecommendation,

  // Reference data
  STUDY_DESIGN_MATRIX,

  // Types
  type ClassificationInput,
  type ClassificationOutput
} from './classification';

// -----------------------------------------------------------------------------
// Research Prompts (Stage 2: Literature Review)
// -----------------------------------------------------------------------------

export {
  // System prompt
  RESEARCH_SYSTEM_PROMPT,

  // User prompt generators
  generateSearchStrategyPrompt,
  rankArticlesPrompt,
  synthesizeEvidencePrompt,
  identifyGapsPrompt,

  // Response parsers
  parseSearchStrategyResponse,
  parseRankedArticlesResponse,
  parseEvidenceSynthesisResponse,
  parseGapAnalysisResponse,

  // Helper functions
  formatVancouverCitation,

  // Types
  type SearchStrategyInput,
  type SearchStrategyOutput,
  type ArticleRankingInput,
  type RankedArticle,
  type EvidenceSynthesisInput,
  type GapAnalysisInput
} from './research';

// -----------------------------------------------------------------------------
// Methodology Prompts (Stage 3: Methodology Development)
// -----------------------------------------------------------------------------

export {
  // System prompt
  METHODOLOGY_SYSTEM_PROMPT,

  // User prompt generators
  determineStudyDesignPrompt,
  defineParticipantsPrompt,
  defineOutcomesPrompt,
  developAnalysisPlanPrompt,

  // Response parsers
  parseStudyDesignResponse,
  parseParticipantCriteriaResponse,
  parseOutcomeDefinitionResponse,
  parseAnalysisPlanResponse,

  // Helper functions
  getReportingGuidelineRequirements,

  // Types
  type StudyDesignInput,
  type StudyDesignOutput,
  type ParticipantCriteriaInput,
  type ParticipantCriteriaOutput,
  type OutcomeDefinitionInput,
  type OutcomeDefinitionOutput,
  type AnalysisPlanInput,
  type AnalysisPlanOutput
} from './methodology';

// -----------------------------------------------------------------------------
// Ethics Prompts (Stage 4: Ethics & Governance)
// -----------------------------------------------------------------------------

export {
  // System prompt
  ETHICS_SYSTEM_PROMPT,

  // User prompt generators
  determineEthicsPathwayPrompt,
  assessRiskPrompt,
  determineConsentRequirementsPrompt,
  planDataGovernancePrompt,

  // Response parsers
  parseEthicsPathwayResponse,
  parseRiskAssessmentResponse,
  parseDataGovernanceResponse,

  // Helper functions
  getStandardRetentionPeriod,
  getRequiredFormsForPathway,

  // Types
  type EthicsPathwayInput,
  type EthicsPathwayOutput,
  type RiskAssessmentInput,
  type RiskAssessmentOutput,
  type DataGovernanceInput,
  type DataGovernanceOutput
} from './ethics';

// -----------------------------------------------------------------------------
// Document Generation Prompts (Stage 5: Documents)
// -----------------------------------------------------------------------------

export {
  // System prompt
  DOCUMENT_GENERATION_SYSTEM_PROMPT,

  // User prompt generators
  generateSectionOutlinePrompt,
  convertToProseStylePrompt,
  generatePlainLanguageSummaryPrompt,
  generateEMFSectionPrompt,
  generateProtocolSectionPrompt,

  // Response parsers
  parseDocumentOutlineResponse,

  // Helper functions
  countWords,
  checkWordLimit,
  getDocumentContentMapping,

  // Types
  type DocumentType,
  type WritingStyle,
  type CitationStyle,
  type DocumentSectionInput,
  type DocumentOutlineOutput,
  type ProseConversionInput,
  type PlainLanguageSummaryInput
} from './documents';

// -----------------------------------------------------------------------------
// Convenience Re-exports for Common Patterns
// -----------------------------------------------------------------------------

/**
 * All system prompts in one object for easy access
 */
export const SYSTEM_PROMPTS = {
  classification: () => import('./classification').then(m => m.CLASSIFICATION_SYSTEM_PROMPT),
  research: () => import('./research').then(m => m.RESEARCH_SYSTEM_PROMPT),
  methodology: () => import('./methodology').then(m => m.METHODOLOGY_SYSTEM_PROMPT),
  ethics: () => import('./ethics').then(m => m.ETHICS_SYSTEM_PROMPT),
  documents: () => import('./documents').then(m => m.DOCUMENT_GENERATION_SYSTEM_PROMPT)
} as const;

/**
 * Pipeline stages with their associated prompts
 */
export const PIPELINE_STAGES = {
  INTAKE: {
    name: 'Project Intake',
    prompts: ['classifyProjectPrompt', 'validateClassificationPrompt'],
    systemPrompt: 'CLASSIFICATION_SYSTEM_PROMPT'
  },
  RESEARCH: {
    name: 'Research & Literature Review',
    prompts: ['generateSearchStrategyPrompt', 'rankArticlesPrompt', 'synthesizeEvidencePrompt', 'identifyGapsPrompt'],
    systemPrompt: 'RESEARCH_SYSTEM_PROMPT'
  },
  METHODOLOGY: {
    name: 'Methodology Development',
    prompts: ['determineStudyDesignPrompt', 'defineParticipantsPrompt', 'defineOutcomesPrompt', 'developAnalysisPlanPrompt'],
    systemPrompt: 'METHODOLOGY_SYSTEM_PROMPT'
  },
  ETHICS: {
    name: 'Ethics & Governance',
    prompts: ['determineEthicsPathwayPrompt', 'assessRiskPrompt', 'determineConsentRequirementsPrompt', 'planDataGovernancePrompt'],
    systemPrompt: 'ETHICS_SYSTEM_PROMPT'
  },
  DOCUMENTS: {
    name: 'Document Generation',
    prompts: ['generateSectionOutlinePrompt', 'convertToProseStylePrompt', 'generatePlainLanguageSummaryPrompt', 'generateEMFSectionPrompt', 'generateProtocolSectionPrompt'],
    systemPrompt: 'DOCUMENT_GENERATION_SYSTEM_PROMPT'
  }
} as const;
