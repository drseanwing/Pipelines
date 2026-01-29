/**
 * PubMed/NCBI API Rate Limiter Utility
 *
 * NCBI Rate Limit Policies (as of 2025):
 * - With API Key: 10 requests per second
 * - Without API Key: 3 requests per second
 * - Exceeding limits results in 429 (Too Many Requests) or temporary IP blocks
 *
 * Best Practices:
 * - Always include api_key parameter when available
 * - Implement exponential backoff for retries
 * - Respect X-RateLimit-* headers if present
 * - Consider off-peak hours for large batch operations
 *
 * @see https://www.ncbi.nlm.nih.gov/books/NBK25497/#chapter2.Usage_Guidelines_and_Requiremen
 */

// Rate limit constants
const PUBMED_RATE_LIMIT_WITH_KEY = 10; // requests per second
const PUBMED_RATE_LIMIT_WITHOUT_KEY = 3; // requests per second
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

/**
 * Parse rate limit information from response headers
 *
 * @param {Object} response - HTTP response object
 * @param {Object} response.headers - Response headers
 * @returns {Object|null} Rate limit info or null if headers not present
 * @returns {number} return.limit - Maximum requests allowed
 * @returns {number} return.remaining - Remaining requests in current window
 * @returns {number} return.reset - Timestamp when the rate limit resets
 */
function checkRateLimitHeaders(response) {
  if (!response || !response.headers) {
    return null;
  }

  const headers = response.headers;

  // Check for standard X-RateLimit headers
  // Note: PubMed may not always return these, but we check for compatibility
  const limit = headers['x-ratelimit-limit'] || headers['X-RateLimit-Limit'];
  const remaining = headers['x-ratelimit-remaining'] || headers['X-RateLimit-Remaining'];
  const reset = headers['x-ratelimit-reset'] || headers['X-RateLimit-Reset'];

  if (limit || remaining || reset) {
    return {
      limit: parseInt(limit, 10) || null,
      remaining: parseInt(remaining, 10) || null,
      reset: parseInt(reset, 10) || null
    };
  }

  return null;
}

/**
 * Calculate delay in milliseconds based on rate limit headers
 *
 * @param {Object} headers - Rate limit headers from checkRateLimitHeaders()
 * @param {boolean} hasApiKey - Whether an API key is being used
 * @returns {number} Delay in milliseconds (0 if no delay needed)
 */
function calculateDelay(headers, hasApiKey = false) {
  // If no headers available, use conservative default delay
  if (!headers) {
    const rateLimit = hasApiKey ? PUBMED_RATE_LIMIT_WITH_KEY : PUBMED_RATE_LIMIT_WITHOUT_KEY;
    return Math.ceil(1000 / rateLimit); // ms between requests
  }

  // If we have remaining requests, no delay needed
  if (headers.remaining && headers.remaining > 0) {
    return 0;
  }

  // If we have a reset timestamp, wait until then
  if (headers.reset) {
    const now = Math.floor(Date.now() / 1000);
    const waitSeconds = Math.max(0, headers.reset - now);
    return waitSeconds * 1000;
  }

  // Fallback to default delay
  const rateLimit = hasApiKey ? PUBMED_RATE_LIMIT_WITH_KEY : PUBMED_RATE_LIMIT_WITHOUT_KEY;
  return Math.ceil(1000 / rateLimit);
}

/**
 * Check if response indicates rate limiting
 *
 * @param {Object} response - HTTP response object
 * @param {number} response.statusCode - HTTP status code
 * @returns {boolean} True if rate limited
 */
function isRateLimited(response) {
  if (!response) {
    return false;
  }

  // 429 is standard "Too Many Requests" status
  return response.statusCode === 429;
}

/**
 * Calculate exponential backoff delay with jitter
 *
 * Strategy:
 * - Exponential growth: 2^attempt seconds
 * - Jitter: ±25% randomization to prevent thundering herd
 * - Max cap to prevent excessive waits
 *
 * @param {number} attempt - Retry attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds (default: BASE_DELAY_MS)
 * @returns {number} Delay in milliseconds
 */
function exponentialBackoff(attempt, baseDelay = BASE_DELAY_MS) {
  // Calculate exponential delay: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // Cap maximum delay at 60 seconds
  const cappedDelay = Math.min(exponentialDelay, 60000);

  // Add jitter: ±25% randomization
  const jitter = cappedDelay * 0.25;
  const randomJitter = (Math.random() * 2 - 1) * jitter; // Random between -jitter and +jitter

  return Math.floor(cappedDelay + randomJitter);
}

/**
 * Determine if error is retryable
 *
 * @param {Error|Object} error - Error object or response
 * @returns {boolean} True if should retry
 */
function isRetryableError(error) {
  if (!error) {
    return false;
  }

  // Check for rate limiting
  if (error.statusCode === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
    return true;
  }

  // Check for server errors (5xx)
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  // Check for network timeouts
  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    return true;
  }

  // Check for connection errors
  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with rate limit handling and retries
 *
 * Usage in n8n Code node:
 * ```javascript
 * const result = await withRateLimit(
 *   async () => {
 *     const response = await $http.get('https://eutils.ncbi.nlm.nih.gov/...');
 *     return response;
 *   },
 *   { hasApiKey: true, maxRetries: 5 }
 * );
 * ```
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {boolean} options.hasApiKey - Whether API key is being used
 * @param {number} options.maxRetries - Maximum retry attempts (default: MAX_RETRIES)
 * @param {Function} options.onRetry - Callback function called on retry (optional)
 * @returns {Promise<any>} Result of fn()
 * @throws {Error} If max retries exceeded
 */
async function withRateLimit(fn, options = {}) {
  const {
    hasApiKey = false,
    maxRetries = MAX_RETRIES,
    onRetry = null
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the function
      const result = await fn();

      // Check if we got rate limited (some APIs return 429 without throwing)
      if (isRateLimited(result)) {
        throw {
          statusCode: 429,
          message: 'Rate limit exceeded',
          response: result
        };
      }

      // Success - return result
      return result;

    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error; // Non-retryable error, fail immediately
      }

      // Max retries exceeded
      if (attempt >= maxRetries) {
        throw new Error(
          `Max retries (${maxRetries}) exceeded. Last error: ${error.message || JSON.stringify(error)}`
        );
      }

      // Calculate delay
      let delay;
      if (error.statusCode === 429) {
        // For rate limiting, check headers first
        const rateLimitInfo = checkRateLimitHeaders(error.response);
        delay = calculateDelay(rateLimitInfo, hasApiKey);

        // If no header info, use exponential backoff
        if (delay === 0 || !rateLimitInfo) {
          delay = exponentialBackoff(attempt);
        }
      } else {
        // For other errors, use exponential backoff
        delay = exponentialBackoff(attempt);
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry({
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error.message || error
        });
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  // Should never reach here, but just in case
  throw lastError;
}

// Export all utilities
module.exports = {
  // Constants
  PUBMED_RATE_LIMIT_WITH_KEY,
  PUBMED_RATE_LIMIT_WITHOUT_KEY,
  MAX_RETRIES,
  BASE_DELAY_MS,

  // Functions
  checkRateLimitHeaders,
  calculateDelay,
  isRateLimited,
  exponentialBackoff,
  isRetryableError,
  sleep,
  withRateLimit
};
