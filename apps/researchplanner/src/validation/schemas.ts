/**
 * Zod Validation Schemas
 *
 * Runtime validation schemas for document generation data flow.
 * These schemas ensure type safety at runtime and provide clear error messages
 * when data doesn't match expected structure.
 *
 * @module validation/schemas
 */

import { z } from 'zod';
import { DocumentType, DocumentStatus } from '../types/documents.js';

/**
 * =============================================================================
 * DOCUMENT GENERATION SCHEMAS
 * =============================================================================
 */

/**
 * DocumentType enum validation
 */
export const DocumentTypeSchema = z.nativeEnum(DocumentType);

/**
 * DocumentStatus enum validation
 */
export const DocumentStatusSchema = z.nativeEnum(DocumentStatus);

/**
 * DocumentMetadata validation schema
 */
export const DocumentMetadataSchema = z.object({
  project_id: z.string().uuid('project_id must be a valid UUID'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semantic version (e.g., "1.0.0")'),
  generated_at: z.string().datetime('generated_at must be ISO 8601 datetime'),
  total_pages: z.number().int().positive().optional(),
  word_count: z.number().int().positive().optional(),
});

/**
 * GeneratedDocument validation schema
 */
export const GeneratedDocumentSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  project_id: z.string().uuid('project_id must be a valid UUID'),
  document_type: DocumentTypeSchema,
  filename: z.string().min(1, 'filename cannot be empty'),
  file_path: z.string().min(1, 'file_path cannot be empty'),
  file_size: z.number().int().positive().optional(),
  mime_type: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semantic version'),
  status: DocumentStatusSchema,
  created_at: z.string().datetime('created_at must be ISO 8601 datetime'),
  metadata: DocumentMetadataSchema.optional(),
});

/**
 * DocumentsOutput validation schema
 */
export const DocumentsOutputSchema = z.object({
  generated: z.array(GeneratedDocumentSchema),
  pending_review: z.array(z.string().uuid()),
  metadata: z.object({
    total_documents: z.number().int().nonnegative(),
    submission_checklist: z.array(
      z.object({
        document_type: DocumentTypeSchema,
        required: z.boolean(),
        status: z.string(),
      })
    ),
    estimated_pages: z.number().int().positive(),
  }),
});

/**
 * =============================================================================
 * METHODOLOGY SCHEMAS
 * =============================================================================
 */

/**
 * DataCollectionSpec validation schema
 */
export const DataCollectionSpecSchema = z.object({
  data_types: z.array(
    z.enum(['CLINICAL', 'ADMINISTRATIVE', 'SURVEY', 'QUALITATIVE', 'BIOLOGICAL'])
  ),
  includes_identifiable_data: z.boolean(),
  methods: z.array(z.string()).min(1, 'At least one data collection method is required'),
  instruments: z.array(
    z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      validated: z.boolean(),
      source: z.string().optional(),
    })
  ),
  collection_timepoints: z.array(z.string()),
  missing_data_handling: z.string().min(1),
});

/**
 * StudyDesign validation schema
 */
export const StudyDesignSchema = z.object({
  type: z.string().min(1),
  subtype: z.string().optional(),
  reporting_guideline: z.string().min(1),
  is_randomised: z.boolean(),
  is_blinded: z.boolean(),
  blinding_type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'OPEN_LABEL']).optional(),
  control_type: z.enum(['PLACEBO', 'ACTIVE', 'USUAL_CARE', 'HISTORICAL', 'NONE']).optional(),
  requires_sample_size: z.boolean(),
  justification: z.string().min(1),
});

/**
 * SampleSize validation schema
 */
export const SampleSizeSchema = z.object({
  target: z.number().int().positive('Sample size must be positive'),
  calculation_method: z.string().min(1),
  assumptions: z.object({
    effect_size: z.number().positive(),
    power: z.number().min(0).max(1),
    alpha: z.number().min(0).max(1),
    attrition_rate: z.number().min(0).max(1),
  }),
  justification: z.string().min(1),
});

/**
 * =============================================================================
 * RESEARCH SCHEMAS
 * =============================================================================
 */

/**
 * ProcessedArticle validation schema
 */
export const ProcessedArticleSchema = z.object({
  pmid: z.string().optional(),
  doi: z.string().optional(),
  title: z.string().min(1, 'title cannot be empty'),
  authors: z.array(z.string()).min(1, 'At least one author is required'),
  journal: z.string().min(1, 'journal cannot be empty'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  abstract: z.string().min(1, 'abstract cannot be empty'),
  relevance_score: z.number().min(0).max(100),
  key_findings: z.array(z.string()),
  methodology_notes: z.string().min(1),
  limitations: z.array(z.string()),
  full_text_available: z.boolean(),
});

/**
 * Citation validation schema
 */
export const CitationSchema = z.object({
  id: z.string().min(1),
  authors: z.string().min(1),
  year: z.string().min(1),
  title: z.string().min(1),
  journal: z.string().min(1),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  doi: z.string().optional(),
  formatted: z.string().min(1, 'formatted citation cannot be empty'),
});

/**
 * =============================================================================
 * VALIDATION HELPERS
 * =============================================================================
 */

/**
 * Validate data against a schema and return typed result
 *
 * @template T - The expected output type
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Optional context string for error messages
 * @returns Validated and typed data
 * @throws {Error} If validation fails
 *
 * @example
 * const validated = validateData(
 *   DocumentMetadataSchema,
 *   rawMetadata,
 *   'DocumentMetadata'
 * );
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessage = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(
      `Validation failed${context ? ` for ${context}` : ''}: ${errorMessage}`
    );
  }

  return result.data;
}

/**
 * Validate data and return success/failure result
 *
 * @template T - The expected output type
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success flag and either data or errors
 *
 * @example
 * const result = tryValidateData(CitationSchema, rawCitation);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.errors);
 * }
 */
export function tryValidateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(
      issue => `${issue.path.join('.')}: ${issue.message}`
    ),
  };
}

/**
 * Type guard to check if data matches a schema
 *
 * @template T - The expected output type
 * @param schema - Zod schema to check against
 * @param data - Data to check
 * @returns True if data matches schema
 *
 * @example
 * if (isValidData(DocumentTypeSchema, value)) {
 *   // value is now typed as DocumentType
 *   console.log(value);
 * }
 */
export function isValidData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): data is T {
  return schema.safeParse(data).success;
}
