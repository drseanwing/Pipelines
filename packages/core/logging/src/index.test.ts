import { describe, it, expect, vi } from 'vitest';
import { createLogger, Logger } from './index.js';
import type { LogEntry } from './index.js';

describe('@pipelines/logging', () => {
  const captureOutput = () => {
    const entries: LogEntry[] = [];
    const logger = createLogger({
      level: 'debug',
      output: (entry) => entries.push(entry),
    });
    return { logger, entries };
  };

  describe('createLogger', () => {
    it('creates a logger with default options', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('logging levels', () => {
    it('logs at all levels when set to debug', () => {
      const { logger, entries } = captureOutput();

      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(entries.length).toBe(4);
      expect(entries.map(e => e.level)).toEqual(['debug', 'info', 'warn', 'error']);
    });

    it('filters below minimum level', () => {
      const entries: LogEntry[] = [];
      const logger = createLogger({
        level: 'warn',
        output: (entry) => entries.push(entry),
      });

      logger.debug('filtered');
      logger.info('filtered');
      logger.warn('included');
      logger.error('included');

      expect(entries.length).toBe(2);
    });
  });

  describe('structured data', () => {
    it('includes stage and correlationId', () => {
      const { entries } = (() => {
        const entries: LogEntry[] = [];
        const logger = createLogger({
          level: 'debug',
          stage: 'test-stage',
          correlationId: 'req-123',
          output: (entry) => entries.push(entry),
        });
        logger.info('test');
        return { entries };
      })();

      expect(entries[0].stage).toBe('test-stage');
      expect(entries[0].correlationId).toBe('req-123');
    });

    it('includes extra data', () => {
      const { logger, entries } = captureOutput();
      logger.info('test', { userId: '123', action: 'login' });

      expect(entries[0].data).toEqual({ userId: '123', action: 'login' });
    });

    it('formats errors correctly', () => {
      const { logger, entries } = captureOutput();
      const err = new Error('test error');
      logger.error('failed', err);

      expect(entries[0].error?.name).toBe('Error');
      expect(entries[0].error?.message).toBe('test error');
    });
  });

  describe('child logger', () => {
    it('inherits parent context', () => {
      const entries: LogEntry[] = [];
      const parent = createLogger({
        level: 'debug',
        stage: 'parent',
        output: (entry) => entries.push(entry),
      });

      const child = parent.child({ stage: 'child', correlationId: 'child-123' });
      child.info('child message');

      expect(entries[0].stage).toBe('child');
      expect(entries[0].correlationId).toBe('child-123');
    });
  });

  describe('pipeline events', () => {
    it('logs stage lifecycle', () => {
      const { logger, entries } = captureOutput();

      logger.stageStart('extraction');
      logger.stageComplete('extraction', 1500);

      expect(entries[0].data?._event).toBe('stage_start');
      expect(entries[1].data?._event).toBe('stage_complete');
      expect(entries[1].data?._durationMs).toBe(1500);
    });

    it('logs stage failure', () => {
      const { logger, entries } = captureOutput();

      logger.stageFailed('extraction', new Error('timeout'));

      expect(entries[0].level).toBe('error');
      expect(entries[0].data?._event).toBe('stage_failed');
      expect(entries[0].error?.message).toBe('timeout');
    });

    it('logs LLM calls', () => {
      const { logger, entries } = captureOutput();

      logger.llmCall({
        provider: 'anthropic',
        model: 'claude-3-opus',
        tokensUsed: 1500,
        durationMs: 2000,
        success: true,
      });

      expect(entries[0].data?._event).toBe('llm_call');
      expect(entries[0].data?.provider).toBe('anthropic');
      expect(entries[0].data?.tokensUsed).toBe(1500);
    });
  });
});
