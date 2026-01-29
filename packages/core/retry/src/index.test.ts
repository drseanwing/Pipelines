import { describe, it, expect, vi } from 'vitest';
import {
  withRetry,
  classifyError,
  isRetryableError,
  calculateBackoff,
  RetryError,
  ErrorTypes,
} from './index.js';

describe('@pipelines/retry', () => {
  describe('classifyError', () => {
    it('classifies rate limit errors', () => {
      const err = Object.assign(new Error('Rate limit exceeded'), { status: 429 });
      expect(classifyError(err)).toBe(ErrorTypes.RATE_LIMIT);
    });

    it('classifies network errors by code', () => {
      const err = Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' });
      expect(classifyError(err)).toBe(ErrorTypes.NETWORK_ERROR);
    });

    it('classifies timeout errors', () => {
      const err = Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' });
      expect(classifyError(err)).toBe(ErrorTypes.TIMEOUT);
    });

    it('classifies server errors by status', () => {
      const err = Object.assign(new Error('Internal server error'), { status: 500 });
      expect(classifyError(err)).toBe(ErrorTypes.SERVER_ERROR);
    });

    it('classifies auth errors', () => {
      const err = Object.assign(new Error('Unauthorized'), { status: 401 });
      expect(classifyError(err)).toBe(ErrorTypes.AUTH_ERROR);
    });

    it('classifies unknown errors', () => {
      expect(classifyError(new Error('Something weird'))).toBe(ErrorTypes.UNKNOWN);
    });
  });

  describe('isRetryableError', () => {
    it('returns true for retryable errors', () => {
      expect(isRetryableError(Object.assign(new Error(), { status: 429 }))).toBe(true);
      expect(isRetryableError(Object.assign(new Error(), { status: 500 }))).toBe(true);
      expect(isRetryableError(Object.assign(new Error(), { code: 'ECONNRESET' }))).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      expect(isRetryableError(Object.assign(new Error(), { status: 401 }))).toBe(false);
      expect(isRetryableError(Object.assign(new Error(), { status: 400 }))).toBe(false);
    });
  });

  describe('calculateBackoff', () => {
    it('increases exponentially', () => {
      const d0 = calculateBackoff(0, { baseDelay: 1000, jitter: 0 });
      const d1 = calculateBackoff(1, { baseDelay: 1000, jitter: 0 });
      const d2 = calculateBackoff(2, { baseDelay: 1000, jitter: 0 });

      expect(d0).toBe(1000);
      expect(d1).toBe(2000);
      expect(d2).toBe(4000);
    });

    it('respects maxDelay cap', () => {
      const delay = calculateBackoff(10, { baseDelay: 1000, maxDelay: 5000, jitter: 0 });
      expect(delay).toBe(5000);
    });

    it('adds jitter within expected range', () => {
      const delays = Array.from({ length: 100 }, () =>
        calculateBackoff(0, { baseDelay: 1000, jitter: 0.25 })
      );

      // All should be within [750, 1250]
      expect(delays.every(d => d >= 750 && d <= 1250)).toBe(true);
      // Not all should be the same (jitter is random)
      expect(new Set(delays).size).toBeGreaterThan(1);
    });
  });

  describe('withRetry', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-retryable errors', async () => {
      const fn = vi.fn()
        .mockRejectedValue(Object.assign(new Error('auth'), { status: 401 }));

      await expect(withRetry(fn, { baseDelay: 10 })).rejects.toThrow('auth');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws after max retries', async () => {
      const fn = vi.fn()
        .mockRejectedValue(Object.assign(new Error('server error'), { status: 500 }));

      await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10 }))
        .rejects.toThrow('server error');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('calls onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('err'), { status: 500 }))
        .mockResolvedValue('ok');

      await withRetry(fn, { baseDelay: 10, onRetry });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number));
    });
  });
});
