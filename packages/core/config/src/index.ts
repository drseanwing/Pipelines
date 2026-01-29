/**
 * @pipelines/config - Typed configuration loader from environment variables
 *
 * Provides type-safe environment variable loading with Zod validation,
 * default values, and clear error messages for missing required vars.
 */

import { z, ZodSchema, ZodError } from 'zod';

/**
 * Configuration loading error with details about which variables failed
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Load and validate configuration from environment variables.
 *
 * @param schema - Zod schema defining the expected configuration shape
 * @param options - Optional configuration for the loader
 * @returns Validated configuration object
 * @throws ConfigError if validation fails
 *
 * @example
 * ```typescript
 * const AppConfig = z.object({
 *   PORT: z.coerce.number().default(3000),
 *   DATABASE_URL: z.string().url(),
 *   LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
 *   ANTHROPIC_API_KEY: z.string().min(1),
 * });
 *
 * const config = loadConfig(AppConfig);
 * // config.PORT is number, config.DATABASE_URL is string, etc.
 * ```
 */
export function loadConfig<T extends ZodSchema>(
  schema: T,
  options: {
    /** Custom environment source (defaults to process.env) */
    env?: Record<string, string | undefined>;
    /** Prefix to strip from env var names before matching */
    prefix?: string;
  } = {}
): z.infer<T> {
  const env = options.env ?? (process.env as Record<string, string | undefined>);

  let source: Record<string, string | undefined> = env;

  if (options.prefix) {
    // Strip prefix from matching env vars
    const prefix = options.prefix.endsWith('_') ? options.prefix : `${options.prefix}_`;
    source = {};
    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith(prefix)) {
        source[key.slice(prefix.length)] = value as string | undefined;
      } else {
        source[key] = value as string | undefined;
      }
    }
  }

  const result = schema.safeParse(source);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
    }));

    const missingVars = errors
      .map(e => `  - ${e.path}: ${e.message}`)
      .join('\n');

    throw new ConfigError(
      `Configuration validation failed:\n${missingVars}`,
      errors
    );
  }

  return result.data;
}

/**
 * Helper to create a required string env var
 */
export function requiredString(envVar: string): z.ZodString {
  return z.string({
    required_error: `Environment variable ${envVar} is required`,
  }).min(1, `Environment variable ${envVar} cannot be empty`);
}

/**
 * Helper to create an optional string with a default
 */
export function optionalString(defaultValue: string): z.ZodDefault<z.ZodString> {
  return z.string().default(defaultValue);
}

/**
 * Helper to create a port number (1-65535)
 */
export function portNumber(defaultPort?: number) {
  const base = z.string().transform(Number).pipe(z.number().int().min(1).max(65535));
  return defaultPort !== undefined
    ? z.string().default(String(defaultPort)).transform(Number).pipe(z.number().int().min(1).max(65535))
    : base;
}

/**
 * Pre-built schema for common shared infrastructure config
 */
export const SharedInfraSchema = z.object({
  POSTGRES_USER: z.string().default('pipelines'),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().default('pipelines'),
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),
  OLLAMA_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TZ: z.string().default('Australia/Brisbane'),
});

export type SharedInfraConfig = z.infer<typeof SharedInfraSchema>;

// Re-export zod for convenience
export { z } from 'zod';
