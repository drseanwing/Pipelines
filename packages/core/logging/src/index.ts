/**
 * @pipelines/logging - Structured JSON logging for pipeline systems
 *
 * Provides structured logging with pipeline stage lifecycle events,
 * LLM call tracking, and JSON output for aggregation.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  /** Pipeline stage name */
  stage?: string;
  /** Correlation/request ID for tracing */
  correlationId?: string;
  /** Additional structured data */
  data?: Record<string, unknown>;
  /** Error details */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Default stage name */
  stage?: string;
  /** Default correlation ID */
  correlationId?: string;
  /** Custom output function (defaults to console) */
  output?: (entry: LogEntry) => void;
  /** Whether to use JSON output format */
  json?: boolean;
}

/**
 * Creates a structured logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}

export class Logger {
  private readonly minLevel: number;
  private readonly stage?: string;
  private readonly correlationId?: string;
  private readonly outputFn: (entry: LogEntry) => void;
  private readonly jsonMode: boolean;

  constructor(options: LoggerOptions = {}) {
    const envLevel = (typeof process !== 'undefined' && process.env?.LOG_LEVEL) as LogLevel | undefined;
    this.minLevel = LOG_LEVELS[options.level ?? envLevel ?? 'info'];
    this.stage = options.stage;
    this.correlationId = options.correlationId;
    this.jsonMode = options.json ?? (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
    this.outputFn = options.output ?? this.defaultOutput.bind(this);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: { stage?: string; correlationId?: string }): Logger {
    return new Logger({
      level: Object.entries(LOG_LEVELS).find(([, v]) => v === this.minLevel)?.[0] as LogLevel,
      stage: context.stage ?? this.stage,
      correlationId: context.correlationId ?? this.correlationId,
      output: this.outputFn,
      json: this.jsonMode,
    });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
        ? { name: 'UnknownError', message: String(error) }
        : undefined;

    this.log('error', message, data, errorData);
  }

  /**
   * Log a pipeline stage start event
   */
  stageStart(stageName: string, data?: Record<string, unknown>): void {
    this.log('info', `Stage started: ${stageName}`, {
      ...data,
      _event: 'stage_start',
      _stage: stageName,
    });
  }

  /**
   * Log a pipeline stage completion event
   */
  stageComplete(stageName: string, durationMs: number, data?: Record<string, unknown>): void {
    this.log('info', `Stage completed: ${stageName} (${durationMs}ms)`, {
      ...data,
      _event: 'stage_complete',
      _stage: stageName,
      _durationMs: durationMs,
    });
  }

  /**
   * Log a pipeline stage failure event
   */
  stageFailed(stageName: string, error: Error | unknown, data?: Record<string, unknown>): void {
    const errorData = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: 'UnknownError', message: String(error) };

    this.log('error', `Stage failed: ${stageName}`, {
      ...data,
      _event: 'stage_failed',
      _stage: stageName,
    }, errorData);
  }

  /**
   * Log an LLM API call
   */
  llmCall(data: {
    provider: string;
    model: string;
    tokensUsed?: number;
    durationMs?: number;
    success: boolean;
    error?: string;
  }): void {
    this.log(data.success ? 'info' : 'warn', `LLM call: ${data.provider}/${data.model}`, {
      _event: 'llm_call',
      ...data,
    });
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: LogEntry['error']
  ): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(this.stage && { stage: this.stage }),
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...(data && { data }),
      ...(error && { error }),
    };

    this.outputFn(entry);
  }

  private defaultOutput(entry: LogEntry): void {
    if (this.jsonMode) {
      const stream = entry.level === 'error' ? console.error : console.log;
      stream(JSON.stringify(entry));
    } else {
      const prefix = `[${entry.timestamp}] ${entry.level.toUpperCase().padEnd(5)}`;
      const stage = entry.stage ? ` [${entry.stage}]` : '';
      const corrId = entry.correlationId ? ` (${entry.correlationId})` : '';
      const msg = `${prefix}${stage}${corrId} ${entry.message}`;

      if (entry.level === 'error') {
        console.error(msg);
        if (entry.error?.stack) console.error(entry.error.stack);
      } else if (entry.level === 'warn') {
        console.warn(msg);
      } else {
        console.log(msg);
      }

      if (entry.data) {
        const displayData = Object.fromEntries(
          Object.entries(entry.data).filter(([k]) => !k.startsWith('_'))
        );
        if (Object.keys(displayData).length > 0) {
          console.log('  ', JSON.stringify(displayData, null, 2));
        }
      }
    }
  }
}

/** Default logger instance */
export const logger = createLogger();
