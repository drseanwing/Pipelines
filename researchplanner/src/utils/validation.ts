/**
 * Validation Utilities
 * Phase 3.4 - Input validation and sanitization
 */

import { z } from 'zod';
import type { IntakeData } from '../types/index.js';
import { ProjectType, GrantType } from '../types/index.js';

/**
 * Investigator schema
 */
const investigatorSchema = z.object({
  name: z.string().min(1, 'Investigator name is required'),
  role: z.enum(['PI', 'CO_I', 'ASSOCIATE']),
  title: z.string().min(1, 'Title is required'),
  institution: z.string().min(1, 'Institution is required'),
  department: z.string().min(1, 'Department is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  orcid: z.string().optional(),
  expertise: z.array(z.string()).default([]),
});

/**
 * Timeline constraint schema
 */
const timelineConstraintSchema = z.object({
  submission_deadline: z.string().datetime().optional(),
  completion_deadline: z.string().datetime().optional(),
  grant_deadline: z.string().datetime().optional(),
  notes: z.string().optional(),
});

/**
 * Zod schema for intake data validation
 * Spec reference: Section 3.2.1
 */
export const intakeDataSchema = z.object({
  project_title: z.string().min(5, 'Project title must be at least 5 characters').max(200, 'Project title must be less than 200 characters'),
  project_type: z.nativeEnum(ProjectType),
  concept_description: z.string().min(500, 'Concept description must be at least 500 characters').max(2000, 'Concept description must be less than 2000 characters'),
  clinical_problem: z.string().min(100, 'Clinical problem must be at least 100 characters'),
  target_population: z.string().min(50, 'Target population must be at least 50 characters'),
  setting: z.string().min(20, 'Setting must be at least 20 characters'),
  principal_investigator: investigatorSchema,
  co_investigators: z.array(investigatorSchema).default([]),
  intended_outcomes: z.string().min(100, 'Intended outcomes must be at least 100 characters'),
  grant_target: z.nativeEnum(GrantType).optional(),
  timeline_constraint: timelineConstraintSchema.optional(),
});

/**
 * Validate intake data against schema
 * @param data - The data to validate
 * @returns Validated and typed intake data
 * @throws ZodError if validation fails
 */
export function validateIntakeData(data: unknown): IntakeData {
  return intakeDataSchema.parse(data);
}

/**
 * Validate that required fields are present in an object
 * @param data - The data object to validate
 * @param fields - Array of required field names
 * @throws Error if any required field is missing or empty
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  fields: string[]
): void {
  const missingFields: string[] = [];

  for (const field of fields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
}

/**
 * Sanitize user input by trimming whitespace and removing potentially harmful characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}
