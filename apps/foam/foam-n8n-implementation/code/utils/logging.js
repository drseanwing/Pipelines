/**
 * FOAM Workflow Logging Utility
 * 
 * Provides structured logging for N8N workflow debugging and monitoring.
 * Supports console, file, and database output with configurable levels.
 * 
 * @module utils/logging
 * @version 1.0.0
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CONFIG = {
  // Default log level - can be overridden by environment
  level: process.env.LOG_LEVEL || 'INFO',
  
  // Output destinations
  outputs: {
    console: true,
    file: process.env.LOG_FILE_PATH || null,
    database: process.env.LOG_TO_DATABASE === 'true'
  },
  
  // Formatting options
  includeTimestamp: true,
  includeRequestId: true,
  includeNodeName: true,
  
  // Rotation (for file output)
  maxFileSizeMB: 100,
  maxFiles: 10
};

// =============================================================================
// CORE LOGGING FUNCTIONS
// =============================================================================

/**
 * Format a log entry with consistent structure
 * 
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} message - Log message
 * @param {Object} context - Additional context data
 * @returns {Object} Formatted log entry
 */
function formatLogEntry(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level,
    message: message
  };
  
  // Add request context if available
  if (context.requestId) {
    entry.request_id = context.requestId;
  }
  
  // Add node context if available
  if (context.nodeName) {
    entry.node_name = context.nodeName;
  }
  
  // Add workflow context if available
  if (context.workflowName) {
    entry.workflow_name = context.workflowName;
  }
  
  // Add any additional data
  if (context.data) {
    entry.data = context.data;
  }
  
  // Add execution metrics if available
  if (context.executionTime) {
    entry.execution_time_ms = context.executionTime;
  }
  
  if (context.tokensUsed) {
    entry.tokens_used = context.tokensUsed;
  }
  
  if (context.modelUsed) {
    entry.model_used = context.modelUsed;
  }
  
  return entry;
}

/**
 * Format log entry as string for console/file output
 * 
 * @param {Object} entry - Log entry object
 * @returns {string} Formatted string
 */
function formatLogString(entry) {
  const parts = [];
  
  // Timestamp
  if (CONFIG.includeTimestamp) {
    parts.push(`[${entry.timestamp}]`);
  }
  
  // Level
  parts.push(`[${entry.level}]`);
  
  // Request ID
  if (CONFIG.includeRequestId && entry.request_id) {
    parts.push(`[${entry.request_id.substring(0, 8)}]`);
  }
  
  // Node name
  if (CONFIG.includeNodeName && entry.node_name) {
    parts.push(`[${entry.node_name}]`);
  }
  
  // Message
  parts.push(entry.message);
  
  // Metrics
  const metrics = [];
  if (entry.model_used) {
    metrics.push(`Model: ${entry.model_used}`);
  }
  if (entry.tokens_used) {
    metrics.push(`Tokens: ${entry.tokens_used}`);
  }
  if (entry.execution_time_ms) {
    metrics.push(`Time: ${entry.execution_time_ms}ms`);
  }
  
  if (metrics.length > 0) {
    parts.push(`| ${metrics.join(' | ')}`);
  }
  
  return parts.join(' ');
}

/**
 * Check if a message should be logged based on current level
 * 
 * @param {string} messageLevel - Level of the message
 * @returns {boolean} Whether to log
 */
function shouldLog(messageLevel) {
  const configLevel = LOG_LEVELS[CONFIG.level] || LOG_LEVELS.INFO;
  const msgLevel = LOG_LEVELS[messageLevel] || LOG_LEVELS.INFO;
  return msgLevel >= configLevel;
}

/**
 * Output log entry to configured destinations
 * 
 * @param {Object} entry - Log entry
 */
function outputLog(entry) {
  const logString = formatLogString(entry);
  
  // Console output
  if (CONFIG.outputs.console) {
    switch (entry.level) {
      case 'ERROR':
        console.error(logString);
        break;
      case 'WARN':
        console.warn(logString);
        break;
      default:
        console.log(logString);
    }
  }
  
  // File output would be handled by N8N's file node or external logger
  // Database output would be handled by returning the entry for storage
}

// =============================================================================
// PUBLIC LOGGING FUNCTIONS
// =============================================================================

/**
 * Log a debug message
 * 
 * @param {string} message - Debug message
 * @param {Object} context - Additional context
 */
function debug(message, context = {}) {
  if (!shouldLog('DEBUG')) return;
  const entry = formatLogEntry('DEBUG', message, context);
  outputLog(entry);
  return entry;
}

/**
 * Log an info message
 * 
 * @param {string} message - Info message
 * @param {Object} context - Additional context
 */
function info(message, context = {}) {
  if (!shouldLog('INFO')) return;
  const entry = formatLogEntry('INFO', message, context);
  outputLog(entry);
  return entry;
}

/**
 * Log a warning message
 * 
 * @param {string} message - Warning message
 * @param {Object} context - Additional context
 */
function warn(message, context = {}) {
  if (!shouldLog('WARN')) return;
  const entry = formatLogEntry('WARN', message, context);
  outputLog(entry);
  return entry;
}

/**
 * Log an error message
 * 
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 */
function error(message, context = {}) {
  if (!shouldLog('ERROR')) return;
  const entry = formatLogEntry('ERROR', message, context);
  outputLog(entry);
  return entry;
}

// =============================================================================
// SPECIALIZED LOGGING FUNCTIONS
// =============================================================================

/**
 * Log the start of a workflow stage
 * 
 * @param {string} stageName - Name of the stage
 * @param {Object} context - Request context
 */
function stageStart(stageName, context = {}) {
  return info(`Stage started: ${stageName}`, {
    ...context,
    data: { stage: stageName, event: 'start' }
  });
}

/**
 * Log the completion of a workflow stage
 * 
 * @param {string} stageName - Name of the stage
 * @param {Object} context - Request context including execution metrics
 */
function stageComplete(stageName, context = {}) {
  return info(`Stage completed: ${stageName}`, {
    ...context,
    data: { stage: stageName, event: 'complete' }
  });
}

/**
 * Log an LLM call with token usage
 * 
 * @param {string} model - Model used
 * @param {string} purpose - Purpose of the call
 * @param {number} tokensUsed - Tokens consumed
 * @param {number} executionTime - Time in milliseconds
 * @param {Object} context - Additional context
 */
function llmCall(model, purpose, tokensUsed, executionTime, context = {}) {
  return info(`LLM call: ${purpose}`, {
    ...context,
    modelUsed: model,
    tokensUsed: tokensUsed,
    executionTime: executionTime
  });
}

/**
 * Log an external API call
 * 
 * @param {string} service - Service name (e.g., 'PubMed', 'SerpAPI')
 * @param {string} endpoint - Endpoint called
 * @param {number} statusCode - HTTP status code
 * @param {number} executionTime - Time in milliseconds
 * @param {Object} context - Additional context
 */
function apiCall(service, endpoint, statusCode, executionTime, context = {}) {
  const level = statusCode >= 400 ? 'WARN' : 'INFO';
  const entry = formatLogEntry(level, `API call to ${service}: ${endpoint}`, {
    ...context,
    executionTime: executionTime,
    data: { service, endpoint, statusCode }
  });
  outputLog(entry);
  return entry;
}

// =============================================================================
// N8N CODE NODE USAGE
// =============================================================================

/**
 * Example usage in N8N Code Node:
 * 
 * // Import or define the logging functions in the code node
 * const requestId = $('Trigger').first().json.request_id;
 * const nodeName = $node.name;
 * 
 * // Log stage start
 * const startLog = {
 *   timestamp: new Date().toISOString(),
 *   level: 'INFO',
 *   request_id: requestId,
 *   node_name: nodeName,
 *   message: 'Evidence synthesis started'
 * };
 * 
 * // Process data...
 * 
 * // Log completion with metrics
 * const endLog = {
 *   timestamp: new Date().toISOString(),
 *   level: 'INFO',
 *   request_id: requestId,
 *   node_name: nodeName,
 *   message: 'Evidence synthesis completed',
 *   tokens_used: 2341,
 *   model_used: 'claude-sonnet-4',
 *   execution_time_ms: 4200
 * };
 * 
 * // Return data with logs for storage
 * return {
 *   json: {
 *     ...processedData,
 *     _logs: [startLog, endLog]
 *   }
 * };
 */

// =============================================================================
// EXPORTS
// =============================================================================

// For use in N8N Code nodes, export as object
const Logger = {
  debug,
  info,
  warn,
  error,
  stageStart,
  stageComplete,
  llmCall,
  apiCall,
  formatLogEntry,
  formatLogString,
  LOG_LEVELS,
  CONFIG
};

// If running in Node.js module context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
}

// Return for N8N Code node usage
return Logger;
