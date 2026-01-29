/**
 * FOAM Workflow Error Handler
 * 
 * Provides centralized error handling with graceful degradation,
 * retry logic, and fallback mechanisms for N8N workflows.
 * 
 * @module utils/error-handler
 * @version 1.0.0
 */

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Custom error types for categorization
 */
const ErrorTypes = {
  // API Errors
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  API_AUTHENTICATION: 'API_AUTHENTICATION',
  API_NOT_FOUND: 'API_NOT_FOUND',
  API_SERVER_ERROR: 'API_SERVER_ERROR',
  API_TIMEOUT: 'API_TIMEOUT',
  
  // LLM Errors
  LLM_CONTEXT_LENGTH: 'LLM_CONTEXT_LENGTH',
  LLM_CONTENT_FILTER: 'LLM_CONTENT_FILTER',
  LLM_INVALID_RESPONSE: 'LLM_INVALID_RESPONSE',
  LLM_SERVICE_UNAVAILABLE: 'LLM_SERVICE_UNAVAILABLE',
  
  // Data Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  MISSING_DATA: 'MISSING_DATA',
  
  // Workflow Errors
  WORKFLOW_TIMEOUT: 'WORKFLOW_TIMEOUT',
  NODE_EXECUTION_FAILED: 'NODE_EXECUTION_FAILED',
  
  // External Service Errors
  PUBMED_ERROR: 'PUBMED_ERROR',
  SCRAPING_ERROR: 'SCRAPING_ERROR',
  
  // Unknown
  UNKNOWN: 'UNKNOWN'
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Default retry settings
  defaultRetries: 3,
  defaultRetryDelayMs: 15000,  // 15 seconds for rate limit recovery
  
  // Exponential backoff settings
  useExponentialBackoff: true,
  maxBackoffMs: 120000,  // 2 minutes max
  backoffMultiplier: 2,
  
  // Timeout settings
  defaultTimeoutMs: 60000,  // 1 minute
  
  // Fallback models
  modelFallbacks: {
    'claude-sonnet-4-20250514': ['claude-3-5-sonnet-20241022', 'gpt-4o'],
    'gpt-4o': ['gpt-4o-mini', 'claude-sonnet-4-20250514'],
    'ollama/llama3.2': ['ollama/mistral', 'gpt-4o-mini']
  }
};

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Classify an error based on its properties
 * 
 * @param {Error|Object} error - The error to classify
 * @returns {Object} Classification with type, retryable flag, and suggested action
 */
function classifyError(error) {
  const message = (error && typeof error.message === 'string')
    ? error.message
    : (error ? String(error) : '');
  const statusCode = error.statusCode || error.status || error.code;
  
  // Rate limiting
  if (statusCode === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return {
      type: ErrorTypes.API_RATE_LIMIT,
      retryable: true,
      suggestedDelay: 30000,  // 30 seconds
      action: 'RETRY_WITH_BACKOFF'
    };
  }
  
  // Authentication errors
  if (statusCode === 401 || statusCode === 403 || message.includes('unauthorized') || message.includes('authentication')) {
    return {
      type: ErrorTypes.API_AUTHENTICATION,
      retryable: false,
      action: 'FAIL_IMMEDIATELY'
    };
  }
  
  // Not found
  if (statusCode === 404) {
    return {
      type: ErrorTypes.API_NOT_FOUND,
      retryable: false,
      action: 'SKIP_OR_FALLBACK'
    };
  }
  
  // Server errors
  if (statusCode >= 500 && statusCode < 600) {
    return {
      type: ErrorTypes.API_SERVER_ERROR,
      retryable: true,
      suggestedDelay: 10000,
      action: 'RETRY_WITH_BACKOFF'
    };
  }
  
  // Timeout
  if (message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('ECONNRESET')) {
    return {
      type: ErrorTypes.API_TIMEOUT,
      retryable: true,
      suggestedDelay: 5000,
      action: 'RETRY_WITH_BACKOFF'
    };
  }
  
  // Context length exceeded
  if (message.includes('context length') || message.includes('maximum context') || message.includes('too long')) {
    return {
      type: ErrorTypes.LLM_CONTEXT_LENGTH,
      retryable: false,
      action: 'REDUCE_INPUT_SIZE'
    };
  }
  
  // Content filter
  if (message.includes('content filter') || message.includes('content policy') || message.includes('blocked')) {
    return {
      type: ErrorTypes.LLM_CONTENT_FILTER,
      retryable: false,
      action: 'MODIFY_INPUT'
    };
  }
  
  // Invalid JSON response
  if (message.includes('JSON') || message.includes('parsing') || message.includes('unexpected token')) {
    return {
      type: ErrorTypes.PARSING_ERROR,
      retryable: true,
      suggestedDelay: 1000,
      action: 'RETRY_OR_FALLBACK_PARSER'
    };
  }
  
  // Default classification
  return {
    type: ErrorTypes.UNKNOWN,
    retryable: true,
    suggestedDelay: 5000,
    action: 'RETRY_THEN_FAIL'
  };
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

/**
 * Calculate delay for next retry attempt
 * 
 * @param {number} attemptNumber - Current attempt (1-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(attemptNumber, baseDelay = CONFIG.defaultRetryDelayMs) {
  if (!CONFIG.useExponentialBackoff) {
    return baseDelay;
  }
  
  const delay = baseDelay * Math.pow(CONFIG.backoffMultiplier, attemptNumber - 1);
  
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  
  return Math.min(delay + jitter, CONFIG.maxBackoffMs);
}

/**
 * Determine if an operation should be retried
 * 
 * @param {Object} classification - Error classification
 * @param {number} attemptNumber - Current attempt number
 * @param {number} maxRetries - Maximum retries allowed
 * @returns {Object} Decision with shouldRetry flag and delay
 */
function shouldRetry(classification, attemptNumber, maxRetries = CONFIG.defaultRetries) {
  if (!classification.retryable) {
    return { shouldRetry: false, reason: 'Error type not retryable' };
  }
  
  if (attemptNumber >= maxRetries) {
    return { shouldRetry: false, reason: 'Max retries exceeded' };
  }
  
  const delay = calculateRetryDelay(attemptNumber, classification.suggestedDelay);
  
  return {
    shouldRetry: true,
    delay: delay,
    attempt: attemptNumber + 1,
    maxAttempts: maxRetries
  };
}

// =============================================================================
// FALLBACK LOGIC
// =============================================================================

/**
 * Get fallback model for a given model
 * 
 * @param {string} currentModel - Model that failed
 * @param {number} fallbackIndex - Which fallback to try (0-indexed)
 * @returns {string|null} Fallback model or null if none available
 */
function getFallbackModel(currentModel, fallbackIndex = 0) {
  const fallbacks = CONFIG.modelFallbacks[currentModel];
  
  if (!fallbacks || fallbackIndex >= fallbacks.length) {
    return null;
  }
  
  return fallbacks[fallbackIndex];
}

// =============================================================================
// ERROR FORMATTING
// =============================================================================

/**
 * Format error for logging/storage
 * 
 * @param {Error|Object} error - The error
 * @param {Object} context - Execution context
 * @returns {Object} Formatted error object
 */
function formatError(error, context = {}) {
  const classification = classifyError(error);
  
  return {
    error_id: generateErrorId(),
    timestamp: new Date().toISOString(),
    type: classification.type,
    message: error.message || error.toString(),
    stack: error.stack,
    classification: classification,
    context: {
      request_id: context.requestId,
      workflow_name: context.workflowName,
      node_name: context.nodeName,
      attempt_number: context.attemptNumber,
      input_summary: context.inputSummary
    },
    retryable: classification.retryable,
    suggested_action: classification.action
  };
}

/**
 * Generate unique error ID
 * 
 * @returns {string} Error ID
 */
function generateErrorId() {
  return 'err_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

// =============================================================================
// GRACEFUL DEGRADATION
// =============================================================================

/**
 * Define graceful degradation strategies
 */
const DegradationStrategies = {
  // If web search fails, use cached evidence
  WEB_SEARCH_FAILS: {
    fallback: 'USE_CACHED_EVIDENCE',
    message: 'Web search unavailable, using cached evidence base',
    continueWorkflow: true
  },
  
  // If full text unavailable, proceed with abstract
  FULL_TEXT_UNAVAILABLE: {
    fallback: 'PROCEED_WITH_ABSTRACT',
    message: 'Full text not available, proceeding with abstract',
    continueWorkflow: true,
    flagForReview: true
  },
  
  // If FOAM scraping fails, skip cross-references
  FOAMED_SCRAPING_FAILS: {
    fallback: 'SKIP_CROSSREFS',
    message: 'FOAM resource scraping failed, cross-references will need manual addition',
    continueWorkflow: true,
    addPlaceholder: '[FOAMED CROSSREFS NEEDED]'
  },
  
  // If primary LLM unavailable, use fallback
  PRIMARY_LLM_UNAVAILABLE: {
    fallback: 'USE_FALLBACK_MODEL',
    message: 'Primary model unavailable, using fallback',
    continueWorkflow: true
  },
  
  // If validation fails, flag for manual review
  VALIDATION_FAILS: {
    fallback: 'FLAG_FOR_REVIEW',
    message: 'Automated validation failed, flagging for manual review',
    continueWorkflow: true,
    requiresManualReview: true
  }
};

/**
 * Apply graceful degradation strategy
 * 
 * @param {string} scenario - The failure scenario
 * @param {Object} context - Current execution context
 * @returns {Object} Degradation response
 */
function applyDegradation(scenario, context = {}) {
  const strategy = DegradationStrategies[scenario];
  
  if (!strategy) {
    return {
      applied: false,
      continueWorkflow: false,
      error: 'Unknown degradation scenario'
    };
  }
  
  return {
    applied: true,
    strategy: strategy.fallback,
    message: strategy.message,
    continueWorkflow: strategy.continueWorkflow,
    flagForReview: strategy.flagForReview || false,
    requiresManualReview: strategy.requiresManualReview || false,
    placeholder: strategy.addPlaceholder || null,
    context: context
  };
}

// =============================================================================
// N8N INTEGRATION
// =============================================================================

/**
 * Handle error in N8N Code Node
 * Returns appropriate response based on error classification
 * 
 * @param {Error|Object} error - The error
 * @param {Object} options - Handler options
 * @returns {Object} Response for N8N
 */
function handleN8NError(error, options = {}) {
  const {
    requestId,
    workflowName,
    nodeName,
    attemptNumber = 1,
    maxRetries = CONFIG.defaultRetries,
    continueOnError = false
  } = options;
  
  const classification = classifyError(error);
  const formattedError = formatError(error, {
    requestId,
    workflowName,
    nodeName,
    attemptNumber
  });
  
  const retryDecision = shouldRetry(classification, attemptNumber, maxRetries);
  
  // Build response
  const response = {
    success: false,
    error: formattedError,
    classification: classification,
    retry: retryDecision
  };
  
  // If we should retry, include retry metadata
  if (retryDecision.shouldRetry) {
    response.action = 'RETRY';
    response.retryDelay = retryDecision.delay;
    response.nextAttempt = retryDecision.attempt;
  } 
  // If we have a fallback model, suggest it
  else if (classification.action === 'RETRY_WITH_BACKOFF' && options.currentModel) {
    const fallback = getFallbackModel(options.currentModel);
    if (fallback) {
      response.action = 'USE_FALLBACK';
      response.fallbackModel = fallback;
    } else {
      response.action = continueOnError ? 'CONTINUE_WITH_ERROR' : 'FAIL';
    }
  }
  // Otherwise fail or continue based on settings
  else {
    response.action = continueOnError ? 'CONTINUE_WITH_ERROR' : 'FAIL';
  }
  
  return response;
}

// =============================================================================
// EXPORTS
// =============================================================================

const ErrorHandler = {
  ErrorTypes,
  CONFIG,
  DegradationStrategies,
  classifyError,
  calculateRetryDelay,
  shouldRetry,
  getFallbackModel,
  formatError,
  applyDegradation,
  handleN8NError
};

// For use in N8N Code nodes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}

// Return for N8N Code node usage
return ErrorHandler;
