/**
 * QI Research Pipeline - Logger Utility
 *
 * Simple logger utility with support for different log levels.
 * Configure via LOG_LEVEL environment variable (debug, info, warn, error).
 *
 * @module utils/logger
 */

/**
 * Available log levels in order of priority
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Numeric priority for each log level
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
} as const;

/**
 * Color mapping for each log level
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.gray,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
};

/**
 * Get the current log level from environment variable
 */
function getCurrentLogLevel(): LogLevel {
  const envLevel = process.env['LOG_LEVEL']?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel as LogLevel;
  }
  return 'info';
}

/**
 * Check if a log level should be output based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = getCurrentLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
}

/**
 * Format a timestamp for log output
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * Format a log level label with padding
 */
function formatLevel(level: LogLevel): string {
  return level.toUpperCase().padEnd(5);
}

/**
 * Format the log message with timestamp, level, and content
 */
function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = formatTimestamp();
  const levelStr = formatLevel(level);
  const color = LEVEL_COLORS[level];

  let output = `${COLORS.gray}[${timestamp}]${COLORS.reset} ${color}${levelStr}${COLORS.reset} ${message}`;

  if (data !== undefined) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    output += `\n${COLORS.gray}${dataStr}${COLORS.reset}`;
  }

  return output;
}

/**
 * Internal log function
 */
function log(level: LogLevel, message: string, data?: unknown): void {
  if (!shouldLog(level)) {
    return;
  }

  const formattedMessage = formatMessage(level, message, data);

  switch (level) {
    case 'debug':
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
  }
}

/**
 * Log a debug message
 *
 * @param message - The message to log
 * @param data - Optional additional data to log
 *
 * @example
 * ```typescript
 * debug('Processing started', { itemCount: 42 });
 * ```
 */
export function debug(message: string, data?: unknown): void {
  log('debug', message, data);
}

/**
 * Log an info message
 *
 * @param message - The message to log
 * @param data - Optional additional data to log
 *
 * @example
 * ```typescript
 * info('Server started on port 3000');
 * ```
 */
export function info(message: string, data?: unknown): void {
  log('info', message, data);
}

/**
 * Log a warning message
 *
 * @param message - The message to log
 * @param data - Optional additional data to log
 *
 * @example
 * ```typescript
 * warn('Deprecated API endpoint used', { endpoint: '/api/v1/old' });
 * ```
 */
export function warn(message: string, data?: unknown): void {
  log('warn', message, data);
}

/**
 * Log an error message
 *
 * @param message - The message to log
 * @param data - Optional additional data to log (can be an Error object)
 *
 * @example
 * ```typescript
 * error('Database connection failed', { host: 'localhost', error: err.message });
 * ```
 */
export function error(message: string, data?: unknown): void {
  log('error', message, data);
}

/**
 * Logger object for convenience
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  getCurrentLogLevel,
} as const;

export default logger;
