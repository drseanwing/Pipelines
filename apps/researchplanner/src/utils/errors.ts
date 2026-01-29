/**
 * Error Handling Utilities
 * Phase 3.5 - Custom error classes and error handling
 */

/**
 * Base pipeline error class
 */
export class PipelineError extends Error {
  code: string;
  details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'PipelineError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PipelineError);
    }
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends PipelineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Stage-specific error with stage context
 */
export class StageError extends PipelineError {
  stage: string;

  constructor(message: string, stage: string, details?: Record<string, any>) {
    super(message, 'STAGE_ERROR', { ...details, stage });
    this.name = 'StageError';
    this.stage = stage;
  }
}

/**
 * LLM-specific error with model and prompt context
 */
export class LLMError extends PipelineError {
  model: string;
  promptHash?: string;

  constructor(
    message: string,
    model: string,
    promptHash?: string,
    details?: Record<string, any>
  ) {
    super(message, 'LLM_ERROR', { ...details, model, promptHash });
    this.name = 'LLMError';
    this.model = model;
    this.promptHash = promptHash;
  }
}

/**
 * Database error for database operation failures
 */
export class DatabaseError extends PipelineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

/**
 * Format an error into a consistent structure
 * @param error - The error to format
 * @returns Formatted error object
 */
export function formatError(error: Error): {
  message: string;
  code: string;
  details?: Record<string, any>;
} {
  if (error instanceof PipelineError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  return {
    message: error.message,
    code: 'UNKNOWN_ERROR',
    details: {
      name: error.name,
      stack: error.stack,
    },
  };
}

/**
 * Determine if an error is retryable
 * @param error - The error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Network errors are retryable
  if (error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')) {
    return true;
  }

  // Rate limiting errors are retryable
  if (error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('Too Many Requests')) {
    return true;
  }

  // Temporary service unavailability is retryable
  if (error.message.includes('503') ||
      error.message.includes('Service Unavailable')) {
    return true;
  }

  // LLM overloaded errors are retryable
  if (error instanceof LLMError &&
      (error.message.includes('overloaded') ||
       error.message.includes('capacity'))) {
    return true;
  }

  // Database connection errors are retryable
  if (error instanceof DatabaseError &&
      (error.message.includes('connection') ||
       error.message.includes('timeout'))) {
    return true;
  }

  return false;
}
