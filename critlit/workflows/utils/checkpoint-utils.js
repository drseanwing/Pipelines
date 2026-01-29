/**
 * Checkpoint Management Utility Functions
 *
 * This module provides utilities for creating, updating, and validating workflow checkpoints
 * in systematic review workflows. Checkpoints enable graceful recovery from failures and
 * allow long-running workflows to resume from their last known good state.
 *
 * CHECKPOINT STRUCTURE:
 * {
 *   execution_id: "uuid-v4",
 *   workflow_name: "fetch-pubmed-articles",
 *   stage: "fetch_pmids" | "fetch_metadata" | "parse_metadata" | "completed",
 *   status: "in_progress" | "completed" | "failed",
 *   last_processed: { pmid: "12345678", index: 42 },
 *   progress: { processed: 150, total: 500, failed: 2 },
 *   created_at: "2025-01-25T10:30:00Z",
 *   updated_at: "2025-01-25T10:35:00Z",
 *   error_count: 0,
 *   context: { review_id: 123, search_id: 456, api_key: "..." }
 * }
 *
 * USAGE IN n8n:
 * 1. At workflow start: createCheckpoint() to initialize state
 * 2. During workflow: updateCheckpoint() after each batch/stage
 * 3. Before resume: canResume() to check if resumption is safe
 * 4. On resume: getResumeContext() to extract continuation parameters
 * 5. Before save: validateCheckpoint() to ensure data integrity
 *
 * WORKFLOW STAGES:
 * - fetch_pmids: Retrieving PubMed IDs from search query
 * - fetch_metadata: Downloading article metadata by PMID
 * - parse_metadata: Extracting structured fields from XML/JSON
 * - completed: All work finished successfully
 *
 * DATABASE STORAGE:
 * Checkpoints are stored as JSONB in workflow_checkpoints table:
 * CREATE TABLE workflow_checkpoints (
 *   id SERIAL PRIMARY KEY,
 *   execution_id UUID NOT NULL,
 *   workflow_name TEXT NOT NULL,
 *   checkpoint_data JSONB NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */

// Constants
const VALID_STAGES = ['fetch_pmids', 'fetch_metadata', 'parse_metadata', 'completed'];
const VALID_STATUSES = ['in_progress', 'completed', 'failed'];
const MAX_RETRIES = 3;
const MAX_CHECKPOINT_AGE_HOURS = 24;

/**
 * Generate a UUID v4
 *
 * Simple UUID v4 generator for execution IDs. Uses crypto.randomUUID() if available,
 * falls back to manual implementation for older Node versions.
 *
 * @returns {string} UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
function generateUUID() {
  // Use built-in crypto.randomUUID() if available (Node.js 14.17.0+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create a new checkpoint data structure
 *
 * Initializes a checkpoint with required fields and sensible defaults.
 * Automatically generates execution_id if not provided in context.
 *
 * @param {string} stage - Workflow stage (must be in VALID_STAGES)
 * @param {Object} context - Workflow context and parameters
 * @param {string} [context.execution_id] - Existing execution ID (auto-generated if omitted)
 * @param {string} context.workflow_name - Name of the workflow (e.g., "fetch-pubmed-articles")
 * @param {number} [context.review_id] - Review ID from database (optional)
 * @param {number} [context.search_id] - Search ID from database (optional)
 * @param {any} [context.*] - Any additional workflow-specific data
 * @returns {Object} Initialized checkpoint object
 * @throws {Error} If stage is invalid or workflow_name is missing
 *
 * @example
 * // Create new checkpoint at workflow start
 * const checkpoint = createCheckpoint('fetch_pmids', {
 *   workflow_name: 'fetch-pubmed-articles',
 *   review_id: 123,
 *   search_id: 456,
 *   api_key: 'abc123',
 *   query: 'depression AND exercise'
 * });
 * // Returns:
 * // {
 * //   execution_id: "550e8400-...",
 * //   workflow_name: "fetch-pubmed-articles",
 * //   stage: "fetch_pmids",
 * //   status: "in_progress",
 * //   last_processed: null,
 * //   progress: { processed: 0, total: 0, failed: 0 },
 * //   created_at: "2025-01-25T10:30:00.000Z",
 * //   updated_at: "2025-01-25T10:30:00.000Z",
 * //   error_count: 0,
 * //   context: { review_id: 123, search_id: 456, api_key: "abc123", query: "..." }
 * // }
 *
 * @example
 * // Resume existing workflow
 * const checkpoint = createCheckpoint('fetch_metadata', {
 *   execution_id: '550e8400-...', // Existing ID
 *   workflow_name: 'fetch-pubmed-articles',
 *   review_id: 123
 * });
 */
function createCheckpoint(stage, context = {}) {
  // Validate stage
  if (!stage || !VALID_STAGES.includes(stage)) {
    throw new Error(`Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`);
  }

  // Validate workflow_name
  if (!context.workflow_name) {
    throw new Error('context.workflow_name is required');
  }

  const now = new Date().toISOString();

  return {
    execution_id: context.execution_id || generateUUID(),
    workflow_name: context.workflow_name,
    stage,
    status: 'in_progress',
    last_processed: null,
    progress: {
      processed: 0,
      total: 0,
      failed: 0
    },
    created_at: context.created_at || now,
    updated_at: now,
    error_count: 0,
    context: {
      review_id: context.review_id || null,
      search_id: context.search_id || null,
      ...context
    }
  };
}

/**
 * Update an existing checkpoint with new data
 *
 * Merges updates into existing checkpoint. Automatically increments error_count
 * if status changes to 'failed'. Sets updated_at timestamp.
 *
 * Common update patterns:
 * - Stage transition: { stage: 'fetch_metadata' }
 * - Progress update: { progress: { processed: 150, total: 500 } }
 * - Last processed: { last_processed: { pmid: '12345678', index: 42 } }
 * - Completion: { stage: 'completed', status: 'completed' }
 * - Error: { status: 'failed', error_count: checkpoint.error_count + 1 }
 *
 * @param {Object} existing - Existing checkpoint object
 * @param {Object} updates - Fields to update
 * @param {string} [updates.stage] - New stage (must be in VALID_STAGES)
 * @param {string} [updates.status] - New status (must be in VALID_STATUSES)
 * @param {Object} [updates.last_processed] - Last processed item reference
 * @param {Object} [updates.progress] - Progress counters (merged, not replaced)
 * @param {number} [updates.error_count] - Error count (usually auto-incremented)
 * @param {Object} [updates.context] - Context updates (merged, not replaced)
 * @returns {Object} Updated checkpoint object
 * @throws {Error} If stage or status is invalid
 *
 * @example
 * // Update progress after processing a batch
 * const updated = updateCheckpoint(checkpoint, {
 *   progress: {
 *     processed: checkpoint.progress.processed + 50,
 *     total: 500
 *   },
 *   last_processed: {
 *     pmid: '12345678',
 *     index: 150
 *   }
 * });
 *
 * @example
 * // Transition to next stage
 * const updated = updateCheckpoint(checkpoint, {
 *   stage: 'fetch_metadata',
 *   progress: {
 *     processed: 0, // Reset for new stage
 *     total: checkpoint.progress.total
 *   }
 * });
 *
 * @example
 * // Mark as failed
 * const updated = updateCheckpoint(checkpoint, {
 *   status: 'failed',
 *   error_count: checkpoint.error_count + 1
 * });
 *
 * @example
 * // Mark as completed
 * const updated = updateCheckpoint(checkpoint, {
 *   stage: 'completed',
 *   status: 'completed'
 * });
 */
function updateCheckpoint(existing, updates = {}) {
  // Validate existing checkpoint
  if (!existing || typeof existing !== 'object') {
    throw new Error('Existing checkpoint must be an object');
  }

  // Validate stage if provided
  if (updates.stage && !VALID_STAGES.includes(updates.stage)) {
    throw new Error(`Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`);
  }

  // Validate status if provided
  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  // Auto-increment error_count if status changed to failed
  let errorCount = existing.error_count || 0;
  if (updates.status === 'failed' && existing.status !== 'failed') {
    errorCount = (updates.error_count !== undefined) ? updates.error_count : errorCount + 1;
  } else if (updates.error_count !== undefined) {
    errorCount = updates.error_count;
  }

  // Merge progress (don't replace entire object)
  const progress = {
    ...existing.progress,
    ...updates.progress
  };

  // Merge context (don't replace entire object)
  const context = {
    ...existing.context,
    ...updates.context
  };

  return {
    ...existing,
    ...updates,
    progress,
    context,
    error_count: errorCount,
    updated_at: new Date().toISOString()
  };
}

/**
 * Validate checkpoint data structure
 *
 * Checks that checkpoint has all required fields with correct types and values.
 * Returns validation result with detailed error messages.
 *
 * Required fields:
 * - execution_id: non-empty string (UUID format recommended)
 * - workflow_name: non-empty string
 * - stage: string, one of VALID_STAGES
 * - status: string, one of VALID_STATUSES
 * - progress: object with numeric counters
 * - created_at: ISO date string
 * - updated_at: ISO date string
 * - error_count: number >= 0
 * - context: object
 *
 * @param {Object} checkpoint - Checkpoint object to validate
 * @returns {Object} Validation result
 * @returns {boolean} return.valid - True if valid
 * @returns {Array<string>} return.errors - Array of error messages (empty if valid)
 *
 * @example
 * const validation = validateCheckpoint(checkpoint);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 *   throw new Error(`Invalid checkpoint: ${validation.errors.join(', ')}`);
 * }
 *
 * @example
 * // n8n usage - validate before saving to database
 * const checkpoint = $json.checkpoint;
 * const validation = validateCheckpoint(checkpoint);
 *
 * if (!validation.valid) {
 *   throw new Error(`Cannot save invalid checkpoint: ${validation.errors.join(', ')}`);
 * }
 *
 * // Proceed to Postgres node
 * return { json: { checkpoint } };
 */
function validateCheckpoint(checkpoint) {
  const errors = [];

  // Check if checkpoint is an object
  if (!checkpoint || typeof checkpoint !== 'object') {
    return {
      valid: false,
      errors: ['Checkpoint must be an object']
    };
  }

  // Validate execution_id
  if (!checkpoint.execution_id || typeof checkpoint.execution_id !== 'string') {
    errors.push('execution_id is required and must be a string');
  } else if (checkpoint.execution_id.trim().length === 0) {
    errors.push('execution_id must be a non-empty string');
  }

  // Validate workflow_name
  if (!checkpoint.workflow_name || typeof checkpoint.workflow_name !== 'string') {
    errors.push('workflow_name is required and must be a string');
  } else if (checkpoint.workflow_name.trim().length === 0) {
    errors.push('workflow_name must be a non-empty string');
  }

  // Validate stage
  if (!checkpoint.stage || typeof checkpoint.stage !== 'string') {
    errors.push('stage is required and must be a string');
  } else if (!VALID_STAGES.includes(checkpoint.stage)) {
    errors.push(`stage must be one of: ${VALID_STAGES.join(', ')}`);
  }

  // Validate status
  if (!checkpoint.status || typeof checkpoint.status !== 'string') {
    errors.push('status is required and must be a string');
  } else if (!VALID_STATUSES.includes(checkpoint.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  // Validate progress
  if (!checkpoint.progress) {
    errors.push('progress field is required');
  } else if (typeof checkpoint.progress !== 'object' || Array.isArray(checkpoint.progress)) {
    errors.push('progress must be an object');
  } else {
    // Check progress counters
    if (typeof checkpoint.progress.processed !== 'number') {
      errors.push('progress.processed must be a number');
    }
    if (typeof checkpoint.progress.total !== 'number') {
      errors.push('progress.total must be a number');
    }
    if (typeof checkpoint.progress.failed !== 'number') {
      errors.push('progress.failed must be a number');
    }
  }

  // Validate created_at
  if (!checkpoint.created_at || typeof checkpoint.created_at !== 'string') {
    errors.push('created_at is required and must be a string');
  } else if (isNaN(Date.parse(checkpoint.created_at))) {
    errors.push('created_at must be a valid ISO date string');
  }

  // Validate updated_at
  if (!checkpoint.updated_at || typeof checkpoint.updated_at !== 'string') {
    errors.push('updated_at is required and must be a string');
  } else if (isNaN(Date.parse(checkpoint.updated_at))) {
    errors.push('updated_at must be a valid ISO date string');
  }

  // Validate error_count
  if (checkpoint.error_count === undefined || checkpoint.error_count === null) {
    errors.push('error_count is required');
  } else if (typeof checkpoint.error_count !== 'number') {
    errors.push('error_count must be a number');
  } else if (checkpoint.error_count < 0) {
    errors.push('error_count must be >= 0');
  }

  // Validate context
  if (!checkpoint.context) {
    errors.push('context field is required');
  } else if (typeof checkpoint.context !== 'object' || Array.isArray(checkpoint.context)) {
    errors.push('context must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Determine if checkpoint is resumable
 *
 * Checks multiple conditions to ensure safe workflow resumption:
 * 1. Checkpoint is not already completed
 * 2. Error count is below max retries threshold
 * 3. Checkpoint age is within acceptable window
 * 4. Checkpoint passes validation
 *
 * @param {Object} checkpoint - Checkpoint object to check
 * @param {Object} [options] - Configuration options
 * @param {number} [options.maxRetries=3] - Maximum error count before blocking resume
 * @param {number} [options.maxAgeHours=24] - Maximum checkpoint age in hours
 * @returns {Object} Resumability result
 * @returns {boolean} return.canResume - True if checkpoint can be resumed
 * @returns {Array<string>} return.reasons - Array of reasons blocking resume (empty if resumable)
 *
 * @example
 * // Check if checkpoint can be resumed
 * const result = canResume(checkpoint);
 * if (!result.canResume) {
 *   console.log('Cannot resume:', result.reasons);
 *   // Start fresh workflow instead
 * } else {
 *   // Proceed with resume
 *   const resumeParams = getResumeContext(checkpoint);
 * }
 *
 * @example
 * // Custom thresholds
 * const result = canResume(checkpoint, {
 *   maxRetries: 5,
 *   maxAgeHours: 48
 * });
 *
 * @example
 * // n8n usage - route to resume or fresh start
 * const checkpoint = $json.checkpoint;
 * const result = canResume(checkpoint);
 *
 * if (result.canResume) {
 *   // Route to resume workflow
 *   return { json: { action: 'resume', checkpoint } };
 * } else {
 *   // Route to fresh start
 *   return { json: { action: 'start_fresh', reasons: result.reasons } };
 * }
 */
function canResume(checkpoint, options = {}) {
  const {
    maxRetries = MAX_RETRIES,
    maxAgeHours = MAX_CHECKPOINT_AGE_HOURS
  } = options;

  const reasons = [];

  // Validate checkpoint structure first
  const validation = validateCheckpoint(checkpoint);
  if (!validation.valid) {
    reasons.push(`Invalid checkpoint structure: ${validation.errors.join(', ')}`);
    return { canResume: false, reasons };
  }

  // Check if already completed
  if (checkpoint.status === 'completed' || checkpoint.stage === 'completed') {
    reasons.push('Checkpoint is already completed');
  }

  // Check error count
  if (checkpoint.error_count >= maxRetries) {
    reasons.push(`Error count (${checkpoint.error_count}) exceeds max retries (${maxRetries})`);
  }

  // Check age
  const createdAt = new Date(checkpoint.created_at);
  const now = new Date();
  const ageHours = (now - createdAt) / (1000 * 60 * 60);

  if (ageHours > maxAgeHours) {
    reasons.push(`Checkpoint age (${ageHours.toFixed(1)}h) exceeds max age (${maxAgeHours}h)`);
  }

  return {
    canResume: reasons.length === 0,
    reasons
  };
}

/**
 * Extract context for workflow resume
 *
 * Builds parameters needed to resume workflow from checkpoint.
 * Includes continuation offsets, last processed items, and workflow context.
 *
 * @param {Object} checkpoint - Checkpoint object
 * @returns {Object} Resume context
 * @returns {string} return.execution_id - Execution ID to continue
 * @returns {string} return.stage - Current stage to resume from
 * @returns {Object} return.last_processed - Last processed item (for offset/continuation)
 * @returns {Object} return.progress - Current progress counters
 * @returns {Object} return.context - Full workflow context
 * @returns {number} return.start_index - Index to resume from (progress.processed)
 *
 * @example
 * // Resume PubMed fetch workflow
 * const resumeParams = getResumeContext(checkpoint);
 *
 * // Use in HTTP request
 * const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`;
 * const params = {
 *   db: 'pubmed',
 *   retstart: resumeParams.start_index, // Resume from this offset
 *   retmax: 100,
 *   api_key: resumeParams.context.api_key
 * };
 *
 * @example
 * // Resume processing with last PMID
 * const resumeParams = getResumeContext(checkpoint);
 * const lastPMID = resumeParams.last_processed?.pmid;
 *
 * // Query database for unprocessed records
 * const query = `
 *   SELECT * FROM articles
 *   WHERE search_id = $1
 *   AND pmid > $2
 *   ORDER BY pmid ASC
 * `;
 * const params = [resumeParams.context.search_id, lastPMID || '0'];
 *
 * @example
 * // n8n usage - setup HTTP request node
 * const resumeParams = getResumeContext($json.checkpoint);
 *
 * return {
 *   json: {
 *     url: 'https://eutils.ncbi.nlm.nih.gov/...',
 *     qs: {
 *       retstart: resumeParams.start_index,
 *       retmax: 100,
 *       api_key: resumeParams.context.api_key
 *     },
 *     execution_id: resumeParams.execution_id
 *   }
 * };
 */
function getResumeContext(checkpoint) {
  // Validate checkpoint first
  const validation = validateCheckpoint(checkpoint);
  if (!validation.valid) {
    throw new Error(`Cannot extract resume context from invalid checkpoint: ${validation.errors.join(', ')}`);
  }

  return {
    execution_id: checkpoint.execution_id,
    stage: checkpoint.stage,
    last_processed: checkpoint.last_processed,
    progress: checkpoint.progress,
    context: checkpoint.context,
    start_index: checkpoint.progress.processed || 0
  };
}

/**
 * Serialize checkpoint for JSONB storage
 *
 * Converts checkpoint object to JSON string for PostgreSQL JSONB column.
 * Ensures proper formatting and escaping.
 *
 * @param {Object} checkpoint - Checkpoint object
 * @returns {string} JSON string ready for JSONB storage
 * @throws {Error} If checkpoint cannot be serialized
 *
 * @example
 * // Prepare checkpoint for database insertion
 * const jsonb = serializeCheckpoint(checkpoint);
 *
 * // Insert into PostgreSQL
 * const query = `
 *   INSERT INTO workflow_checkpoints (execution_id, workflow_name, checkpoint_data)
 *   VALUES ($1, $2, $3)
 * `;
 * const params = [checkpoint.execution_id, checkpoint.workflow_name, jsonb];
 *
 * @example
 * // n8n Postgres node - prepare data
 * const checkpoint = $json.checkpoint;
 * const jsonb = serializeCheckpoint(checkpoint);
 *
 * return {
 *   json: {
 *     execution_id: checkpoint.execution_id,
 *     workflow_name: checkpoint.workflow_name,
 *     checkpoint_data: jsonb
 *   }
 * };
 */
function serializeCheckpoint(checkpoint) {
  try {
    return JSON.stringify(checkpoint);
  } catch (error) {
    throw new Error(`Failed to serialize checkpoint: ${error.message}`);
  }
}

/**
 * Deserialize checkpoint from JSONB storage
 *
 * Parses JSON string from PostgreSQL JSONB column back to object.
 * Validates structure after parsing.
 *
 * @param {string} jsonString - JSON string from database
 * @returns {Object} Parsed checkpoint object
 * @throws {Error} If JSON cannot be parsed or is invalid
 *
 * @example
 * // Parse checkpoint from database query result
 * const row = $json; // From Postgres node
 * const checkpoint = deserializeCheckpoint(row.checkpoint_data);
 *
 * // Check if resumable
 * const result = canResume(checkpoint);
 *
 * @example
 * // n8n Postgres query result processing
 * const rows = $json.rows;
 *
 * const checkpoints = rows.map(row => {
 *   try {
 *     return deserializeCheckpoint(row.checkpoint_data);
 *   } catch (error) {
 *     console.error(`Failed to parse checkpoint ${row.execution_id}:`, error);
 *     return null;
 *   }
 * }).filter(Boolean); // Remove nulls
 *
 * return { json: { checkpoints } };
 */
function deserializeCheckpoint(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('JSON string must be a non-empty string');
  }

  try {
    const checkpoint = JSON.parse(jsonString);

    // Validate structure
    const validation = validateCheckpoint(checkpoint);
    if (!validation.valid) {
      throw new Error(`Invalid checkpoint structure: ${validation.errors.join(', ')}`);
    }

    return checkpoint;
  } catch (error) {
    throw new Error(`Failed to deserialize checkpoint: ${error.message}`);
  }
}

/**
 * EXAMPLE n8n WORKFLOW USAGE:
 *
 * Node 1: Create Checkpoint at Workflow Start
 * --------------------------------------------
 * const checkpoint = createCheckpoint('fetch_pmids', {
 *   workflow_name: 'fetch-pubmed-articles',
 *   review_id: $json.review_id,
 *   search_id: $json.search_id,
 *   api_key: $json.api_key,
 *   query: $json.query
 * });
 *
 * // Save to database
 * const jsonb = serializeCheckpoint(checkpoint);
 * return {
 *   json: {
 *     execution_id: checkpoint.execution_id,
 *     workflow_name: checkpoint.workflow_name,
 *     checkpoint_data: jsonb
 *   }
 * };
 *
 *
 * Node 2: Update Checkpoint After Batch Processing
 * -------------------------------------------------
 * const checkpoint = deserializeCheckpoint($node["Load Checkpoint"].json.checkpoint_data);
 * const processedCount = $json.processed_count;
 *
 * const updated = updateCheckpoint(checkpoint, {
 *   progress: {
 *     processed: checkpoint.progress.processed + processedCount,
 *     total: checkpoint.progress.total
 *   },
 *   last_processed: {
 *     pmid: $json.last_pmid,
 *     index: checkpoint.progress.processed + processedCount
 *   }
 * });
 *
 * const jsonb = serializeCheckpoint(updated);
 * return { json: { checkpoint_data: jsonb } };
 *
 *
 * Node 3: Check If Resumable
 * ---------------------------
 * const checkpoint = deserializeCheckpoint($json.checkpoint_data);
 * const result = canResume(checkpoint);
 *
 * if (!result.canResume) {
 *   throw new Error(`Cannot resume: ${result.reasons.join(', ')}`);
 * }
 *
 * // Get resume parameters
 * const resumeParams = getResumeContext(checkpoint);
 * return { json: resumeParams };
 *
 *
 * Node 4: Transition to Next Stage
 * ---------------------------------
 * const checkpoint = deserializeCheckpoint($json.checkpoint_data);
 *
 * const updated = updateCheckpoint(checkpoint, {
 *   stage: 'fetch_metadata',
 *   progress: {
 *     processed: 0, // Reset for new stage
 *     total: checkpoint.progress.total,
 *     failed: checkpoint.progress.failed
 *   }
 * });
 *
 * const jsonb = serializeCheckpoint(updated);
 * return { json: { checkpoint_data: jsonb } };
 *
 *
 * Node 5: Mark as Completed
 * --------------------------
 * const checkpoint = deserializeCheckpoint($json.checkpoint_data);
 *
 * const completed = updateCheckpoint(checkpoint, {
 *   stage: 'completed',
 *   status: 'completed'
 * });
 *
 * const jsonb = serializeCheckpoint(completed);
 * return { json: { checkpoint_data: jsonb } };
 *
 *
 * Node 6: Handle Error
 * --------------------
 * const checkpoint = deserializeCheckpoint($json.checkpoint_data);
 *
 * const failed = updateCheckpoint(checkpoint, {
 *   status: 'failed',
 *   error_count: checkpoint.error_count + 1,
 *   context: {
 *     ...checkpoint.context,
 *     last_error: $json.error_message
 *   }
 * });
 *
 * const jsonb = serializeCheckpoint(failed);
 * return { json: { checkpoint_data: jsonb } };
 */

// Export all utilities
module.exports = {
  // Constants
  VALID_STAGES,
  VALID_STATUSES,
  MAX_RETRIES,
  MAX_CHECKPOINT_AGE_HOURS,

  // Functions
  createCheckpoint,
  updateCheckpoint,
  validateCheckpoint,
  canResume,
  getResumeContext,
  serializeCheckpoint,
  deserializeCheckpoint,

  // Internal utilities (exported for testing)
  generateUUID
};
