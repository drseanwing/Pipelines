/**
 * Workflow configuration for n8n pipeline
 * Phase 3.12 - Workflow Configuration
 */

/**
 * n8n workflow IDs mapping
 * Maps logical stage names to n8n workflow identifiers
 */
export const WORKFLOW_IDS = {
  master: 'master-workflow-001',
  intake: 'intake-workflow-001',
  research: 'research-workflow-001',
  methods: 'methods-workflow-001',
  ethics: 'ethics-workflow-001',
  documents: 'documents-workflow-001'
} as const;

export type WorkflowStage = keyof typeof WORKFLOW_IDS;

/**
 * Stage execution order in the pipeline
 * Defines sequential flow through all stages
 */
export const STAGE_ORDER: readonly WorkflowStage[] = [
  'intake',
  'research',
  'methods',
  'ethics',
  'documents'
] as const;

/**
 * Checkpoint webhook URL suffixes
 * Used by n8n Wait nodes to construct webhook endpoints
 */
export const CHECKPOINT_SUFFIXES = {
  intake: 'intake-approved',
  research: 'research-approved',
  methods: 'methods-approved',
  ethics: 'ethics-approved',
  documents: 'documents-approved'
} as const;

/**
 * Timeout configurations for each stage (in milliseconds)
 * Defines max execution time and checkpoint wait periods
 */
export const TIMEOUT_CONFIG = {
  intake: {
    execution: 300000,      // 5 minutes
    checkpoint: 86400000    // 24 hours
  },
  research: {
    execution: 1800000,     // 30 minutes
    checkpoint: 172800000   // 48 hours
  },
  methods: {
    execution: 900000,      // 15 minutes
    checkpoint: 172800000   // 48 hours
  },
  ethics: {
    execution: 600000,      // 10 minutes
    checkpoint: 259200000   // 72 hours
  },
  documents: {
    execution: 1200000,     // 20 minutes
    checkpoint: 86400000    // 24 hours
  }
} as const;

/**
 * Get n8n workflow ID for a given stage
 *
 * @param stage - Pipeline stage name
 * @returns n8n workflow identifier
 * @throws Error if stage is invalid
 */
export function getWorkflowId(stage: string): string {
  if (!(stage in WORKFLOW_IDS)) {
    throw new Error(`Invalid workflow stage: ${stage}`);
  }
  return WORKFLOW_IDS[stage as WorkflowStage];
}

/**
 * Get checkpoint webhook suffix for a stage
 *
 * @param stage - Pipeline stage name
 * @returns Webhook URL suffix
 * @throws Error if stage is invalid
 */
export function getCheckpointSuffix(stage: string): string {
  if (!(stage in CHECKPOINT_SUFFIXES)) {
    throw new Error(`Invalid checkpoint stage: ${stage}`);
  }
  return CHECKPOINT_SUFFIXES[stage as keyof typeof CHECKPOINT_SUFFIXES];
}

/**
 * Get timeout configuration for a stage
 *
 * @param stage - Pipeline stage name
 * @returns Timeout config with execution and checkpoint durations
 * @throws Error if stage is invalid
 */
export function getTimeoutConfig(stage: string): { execution: number; checkpoint: number } {
  if (!(stage in TIMEOUT_CONFIG)) {
    throw new Error(`Invalid timeout stage: ${stage}`);
  }
  return TIMEOUT_CONFIG[stage as keyof typeof TIMEOUT_CONFIG];
}

/**
 * Get next stage in pipeline sequence
 *
 * @param currentStage - Current pipeline stage
 * @returns Next stage name, or null if at end
 */
export function getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1];
}

/**
 * Get previous stage in pipeline sequence
 *
 * @param currentStage - Current pipeline stage
 * @returns Previous stage name, or null if at beginning
 */
export function getPreviousStage(currentStage: WorkflowStage): WorkflowStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return STAGE_ORDER[currentIndex - 1];
}

/**
 * Check if stage is valid
 *
 * @param stage - Stage name to validate
 * @returns True if valid stage
 */
export function isValidStage(stage: string): stage is WorkflowStage {
  return stage in WORKFLOW_IDS && stage !== 'master';
}
