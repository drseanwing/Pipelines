/**
 * @pipelines/validation - Zod-based validation with JSON Schema generation
 *
 * Provides validation utilities compatible with both TypeScript apps and
 * N8N Code Nodes (via JSON Schema export).
 */

import { z, ZodSchema, ZodType, ZodObject, ZodRawShape } from 'zod';

/**
 * Validation result with typed errors
 */
export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validate data against a Zod schema
 * Returns a ValidationResult instead of throwing
 */
export function validate<T extends ZodSchema>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      valid: true,
      data: result.data,
      errors: [],
    };
  }

  return {
    valid: false,
    errors: result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}

/**
 * Validate and throw if invalid (for use in code where you want exceptions)
 */
export function validateOrThrow<T extends ZodSchema>(
  schema: T,
  data: unknown,
  context?: string
): z.infer<T> {
  const result = validate(schema, data);

  if (!result.valid) {
    const prefix = context ? `${context}: ` : '';
    const errorMessages = result.errors
      .map(e => `  - ${e.path || 'root'}: ${e.message}`)
      .join('\n');
    throw new Error(`${prefix}Validation failed:\n${errorMessages}`);
  }

  return result.data!;
}

/**
 * Convert a Zod schema to a basic JSON Schema representation.
 * This is useful for N8N Code Nodes that need JSON Schema validation.
 *
 * NOTE: This is a simplified converter that handles common types.
 * For complex schemas, consider using zod-to-json-schema package.
 */
export function zodToJsonSchema(schema: ZodType): Record<string, unknown> {
  const def = schema._def as any;
  const typeName = def.typeName;

  switch (typeName) {
    case 'ZodString': {
      const result: Record<string, unknown> = { type: 'string' };
      if (def.checks) {
        for (const check of def.checks) {
          if (check.kind === 'min') result.minLength = check.value;
          if (check.kind === 'max') result.maxLength = check.value;
          if (check.kind === 'email') result.format = 'email';
          if (check.kind === 'url') result.format = 'uri';
          if (check.kind === 'uuid') result.format = 'uuid';
          if (check.kind === 'regex') result.pattern = check.regex.source;
        }
      }
      return result;
    }

    case 'ZodNumber': {
      const result: Record<string, unknown> = { type: 'number' };
      if (def.checks) {
        for (const check of def.checks) {
          if (check.kind === 'min') result.minimum = check.value;
          if (check.kind === 'max') result.maximum = check.value;
          if (check.kind === 'int') result.type = 'integer';
        }
      }
      return result;
    }

    case 'ZodBoolean':
      return { type: 'boolean' };

    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchema((def as any).type),
      };

    case 'ZodObject': {
      const shape = (schema as ZodObject<ZodRawShape>).shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value as ZodType);
        if (!(value as ZodType).isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }

    case 'ZodEnum':
      return {
        type: 'string',
        enum: (def as any).values,
      };

    case 'ZodOptional':
      return zodToJsonSchema((def as any).innerType);

    case 'ZodDefault':
      return {
        ...zodToJsonSchema((def as any).innerType),
        default: (def as any).defaultValue(),
      };

    case 'ZodNullable':
      return {
        oneOf: [
          zodToJsonSchema((def as any).innerType),
          { type: 'null' },
        ],
      };

    default:
      return {};
  }
}

/**
 * Common validation schemas for pipeline data
 */
export const CommonSchemas = {
  /** UUID v4 format */
  uuid: z.string().uuid(),

  /** Non-empty string */
  nonEmpty: z.string().min(1),

  /** Email address */
  email: z.string().email(),

  /** URL */
  url: z.string().url(),

  /** ISO 8601 date string */
  isoDate: z.string().datetime(),

  /** Positive integer */
  positiveInt: z.number().int().positive(),

  /** Pipeline status */
  pipelineStatus: z.enum([
    'pending', 'in_progress', 'completed', 'failed', 'cancelled'
  ]),

  /** Log level */
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
};

// Re-export zod for convenience
export { z } from 'zod';
export type { ZodSchema, ZodType } from 'zod';
