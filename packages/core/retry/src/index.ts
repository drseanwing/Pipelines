/**
 * @pipelines/retry - Exponential backoff with jitter and retryable error detection
 *
 * Consolidated retry logic extracted from all 4 pipeline projects.
 * Provides a generic withRetry<T> wrapper for any async operation.
 */

/**
 * Error types for classification
 */
export const ErrorTypes = {
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Jitter factor 0-1 (default: 0.25) */
  jitter?: number;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback on each retry attempt */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/**
 * Classify an error into a standard type
 */
export function classifyError(error: unknown): ErrorType {
  if (!(error instanceof Error)) return ErrorTypes.UNKNOWN;

  const message = error.message.toLowerCase();
  const errAny = error as Record<string, unknown>;

  // HTTP status code based classification
  const status = errAny.status ?? errAny.statusCode ?? errAny.code;
  if (typeof status === 'number') {
    if (status === 429) return ErrorTypes.RATE_LIMIT;
    if (status === 401 || status === 403) return ErrorTypes.AUTH_ERROR;
    if (status === 408) return ErrorTypes.TIMEOUT;
    if (status >= 500) return ErrorTypes.SERVER_ERROR;
    if (status === 400 || status === 422) return ErrorTypes.VALIDATION_ERROR;
  }

  // Network error codes
  if (typeof errAny.code === 'string') {
    const code = errAny.code as string;
    if (['ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'EPIPE', 'EHOSTUNREACH', 'EAI_AGAIN'].includes(code)) {
      return ErrorTypes.NETWORK_ERROR;
    }
    if (['ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(code)) {
      return ErrorTypes.TIMEOUT;
    }
  }

  // Message based classification
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return ErrorTypes.RATE_LIMIT;
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorTypes.TIMEOUT;
  }
  if (message.includes('econnreset') || message.includes('fetch failed') || message.includes('network')) {
    return ErrorTypes.NETWORK_ERROR;
  }
  if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('invalid api key')) {
    return ErrorTypes.AUTH_ERROR;
  }

  return ErrorTypes.UNKNOWN;
}

/**
 * Default check for whether an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const errorType = classifyError(error);
  return [
    ErrorTypes.RATE_LIMIT,
    ErrorTypes.TIMEOUT,
    ErrorTypes.SERVER_ERROR,
    ErrorTypes.NETWORK_ERROR,
  ].includes(errorType);
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoff(
  attempt: number,
  options: Pick<RetryOptions, 'baseDelay' | 'maxDelay' | 'jitter'> = {}
): number {
  const { baseDelay = 1000, maxDelay = 30000, jitter = 0.25 } = options;

  // Exponential backoff: baseDelay * 2^attempt
  const exponential = baseDelay * Math.pow(2, attempt);

  // Cap at maxDelay
  const capped = Math.min(exponential, maxDelay);

  // Add jitter: random value in range [1-jitter, 1+jitter]
  const jitterFactor = 1 + (Math.random() * 2 - 1) * jitter;

  return Math.round(capped * jitterFactor);
}

/**
 * Sleep for the specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Custom error class for retry failures
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: unknown
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Execute an async function with automatic retry on failure.
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     onRetry: (err, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    isRetryable: customIsRetryable,
    onRetry,
  } = options;

  const checkRetryable = customIsRetryable ?? isRetryableError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxRetries || !checkRetryable(error)) {
        throw error;
      }

      const delay = calculateBackoff(attempt, options);

      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      }

      await sleep(delay);
    }
  }

  // Should not reach here, but TypeScript needs this
  throw new RetryError(
    `Failed after ${maxRetries + 1} attempts`,
    maxRetries + 1,
    lastError
  );
}
