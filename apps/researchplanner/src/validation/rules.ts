/**
 * QI Research Pipeline - Document Validation Rules
 *
 * This module defines validation rules for document types in the QI/Research
 * Project Development Pipeline. It provides constants and functions for
 * validating document structure, word limits, required sections, and
 * cross-references.
 *
 * @module validation/rules
 */

import type {
  DocumentSection,
  DocumentValidationResult,
} from '../types/index.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Formatting requirements for a document type
 */
export interface FormattingRequirements {
  /** Required font family */
  font: string;
  /** Font size in points */
  size: number;
  /** Line spacing multiplier */
  lineSpacing: number;
}

/**
 * Validation rule configuration for a document type
 */
export interface DocumentValidationRule {
  /** Required sections that must be present */
  requiredSections: string[];
  /** Word limits by section */
  wordLimits: Record<string, number>;
  /** Formatting requirements */
  formatting: FormattingRequirements;
}

/**
 * Word limit validation result for a single section
 */
export interface WordLimitValidation {
  /** Section identifier */
  section: string;
  /** Current word count */
  wordCount: number;
  /** Maximum allowed word count */
  limit: number;
  /** Whether the section is within limit */
  isValid: boolean;
  /** Number of words over the limit (0 if within limit) */
  overage: number;
  /** Warning if approaching limit (>90% used) */
  warning?: string;
}

/**
 * Section validation result
 */
export interface SectionValidation {
  /** Section identifier */
  section: string;
  /** Whether the section is present */
  isPresent: boolean;
  /** Whether the section is required */
  isRequired: boolean;
  /** Validation message */
  message: string;
}

/**
 * Cross-reference validation result
 */
export interface CrossReferenceValidation {
  /** Whether all cross-references are valid */
  isValid: boolean;
  /** List of cross-reference issues found */
  issues: CrossReferenceIssue[];
  /** Documents that were validated */
  documentsChecked: string[];
}

/**
 * Individual cross-reference issue
 */
export interface CrossReferenceIssue {
  /** Source document type */
  sourceDocument: string;
  /** Target document type */
  targetDocument: string;
  /** Field with inconsistency */
  field: string;
  /** Value in source document */
  sourceValue: string;
  /** Value in target document */
  targetValue: string;
  /** Description of the issue */
  description: string;
}

/**
 * Complete validation result for a document
 */
export interface ValidationResult extends DocumentValidationResult {
  /** Document type validated */
  documentType: string;
  /** Section validations */
  sectionValidations: SectionValidation[];
  /** Word limit validations */
  wordLimitValidations: WordLimitValidation[];
  /** Timestamp of validation */
  validatedAt: string;
}

// ============================================================================
// Validation Rules Constants
// ============================================================================

/**
 * Validation rules for each document type
 *
 * These rules are derived from the QI Research Pipeline specification
 * and define the structure, word limits, and formatting requirements
 * for each document type.
 */
export const VALIDATION_RULES: Record<string, DocumentValidationRule> = {
  /**
   * Research protocol validation rules
   * Based on MNH protocol template and SPIRIT guidelines
   */
  protocol: {
    requiredSections: [
      'title',
      'synopsis',
      'introduction',
      'background',
      'aims',
      'methods',
      'participants',
      'outcomes',
      'procedures',
      'data_management',
      'ethics',
      'references',
    ],
    wordLimits: {
      synopsis: 500,
      introduction: 250,
      background: 2000,
      aims: 300,
      methods: 3000,
      participants: 500,
      outcomes: 400,
      procedures: 1000,
      data_management: 750,
      ethics: 500,
      dissemination: 250,
      discussion: 1500,
    },
    formatting: {
      font: 'Arial',
      size: 12,
      lineSpacing: 1.5,
    },
  },

  /**
   * EMF Application validation rules
   * Based on EMF R44 Application form requirements
   */
  emf_application: {
    requiredSections: [
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'A6',
      'A7',
      'A8',
      'A9',
      'B1',
      'B2',
      'B3',
      'B4',
      'B5',
      'B6',
      'B7',
      'C1',
      'C2',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
    ],
    wordLimits: {
      A1: 30, // Project title (word limit for title)
      A4: 250, // Plain language summary
      A5: 450, // Scientific abstract
      A6: 100, // EM relevance
      B1: 1500, // Background/rationale
      B2: 300, // Aims/objectives
      B3: 2000, // Design/methods
      B4: 750, // Innovation/impact
      B5: 400, // Translation plan
    },
    formatting: {
      font: 'Arial',
      size: 11,
      lineSpacing: 1.15,
    },
  },

  /**
   * QI Project Plan validation rules
   */
  qi_project_plan: {
    requiredSections: [
      'title',
      'summary',
      'problem_statement',
      'aim',
      'measures',
      'change_ideas',
      'methodology',
      'team',
      'timeline',
      'resources',
    ],
    wordLimits: {
      summary: 300,
      problem_statement: 500,
      aim: 200,
      measures: 400,
      change_ideas: 600,
      methodology: 800,
      timeline: 300,
      resources: 300,
    },
    formatting: {
      font: 'Arial',
      size: 12,
      lineSpacing: 1.5,
    },
  },

  /**
   * HREC Cover Letter validation rules
   */
  hrec_cover_letter: {
    requiredSections: [
      'addressee',
      'project_title',
      'introduction',
      'study_summary',
      'key_points',
      'attachments',
      'closing',
    ],
    wordLimits: {
      study_summary: 500,
      key_points: 400,
    },
    formatting: {
      font: 'Arial',
      size: 12,
      lineSpacing: 1.5,
    },
  },

  /**
   * Participant Information and Consent Form (PICF) validation rules
   */
  picf: {
    requiredSections: [
      'title',
      'invitation',
      'purpose',
      'procedures',
      'risks',
      'benefits',
      'alternatives',
      'confidentiality',
      'voluntary_participation',
      'withdrawal',
      'contact_information',
      'consent_declaration',
    ],
    wordLimits: {
      invitation: 200,
      purpose: 300,
      procedures: 500,
      risks: 400,
      benefits: 300,
      confidentiality: 400,
    },
    formatting: {
      font: 'Arial',
      size: 12,
      lineSpacing: 1.5,
    },
  },

  /**
   * Data Management Plan validation rules
   */
  data_management_plan: {
    requiredSections: [
      'overview',
      'data_collection',
      'data_storage',
      'access_controls',
      'data_security',
      'retention',
      'disposal',
      'sharing',
      'responsibilities',
    ],
    wordLimits: {
      overview: 300,
      data_collection: 500,
      data_storage: 400,
      access_controls: 400,
      data_security: 500,
      retention: 300,
      disposal: 200,
      sharing: 400,
    },
    formatting: {
      font: 'Arial',
      size: 12,
      lineSpacing: 1.5,
    },
  },
};

// ============================================================================
// Cross-Reference Field Mappings
// ============================================================================

/**
 * Fields that should be consistent across documents
 */
export const CROSS_REFERENCE_FIELDS: Record<string, string[]> = {
  projectTitle: ['protocol', 'emf_application', 'hrec_cover_letter', 'picf'],
  principalInvestigator: ['protocol', 'emf_application', 'hrec_cover_letter'],
  primaryOutcome: ['protocol', 'emf_application'],
  sampleSize: ['protocol', 'emf_application'],
  studyDesign: ['protocol', 'emf_application'],
  ethicsStatus: ['protocol', 'emf_application', 'hrec_cover_letter'],
  dataRetention: ['protocol', 'data_management_plan'],
  consentProcess: ['protocol', 'picf'],
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Count words in a text string
 *
 * @param text - Text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Validate a document against its validation rules
 *
 * @param document - Document to validate (with sections property)
 * @param documentType - Type of document ('protocol', 'emf_application', etc.)
 * @returns Complete validation result
 *
 * @example
 * ```typescript
 * const result = validateDocument(myDocument, 'protocol');
 * if (!result.isValid) {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateDocument(
  document: { sections?: Record<string, string | DocumentSection> },
  documentType: string
): ValidationResult {
  const rules = VALIDATION_RULES[documentType];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rules) {
    return {
      isValid: false,
      errors: [`Unknown document type: ${documentType}`],
      warnings: [],
      documentType,
      sectionValidations: [],
      wordLimitValidations: [],
      validatedAt: new Date().toISOString(),
    };
  }

  // Check required sections
  const sectionValidations = checkRequiredSections(document, rules.requiredSections);
  const missingSections = sectionValidations.filter((sv) => sv.isRequired && !sv.isPresent);
  for (const missing of missingSections) {
    errors.push(missing.message);
  }

  // Build sections map for word limit checking
  const sectionsMap: Record<string, string> = {};
  if (document.sections) {
    for (const [key, value] of Object.entries(document.sections)) {
      if (typeof value === 'string') {
        sectionsMap[key] = value;
      } else if (value && typeof value === 'object' && 'content' in value) {
        sectionsMap[key] = value.content;
      }
    }
  }

  // Check word limits
  const wordLimitValidations = checkWordLimits(sectionsMap, rules.wordLimits);
  for (const wlv of wordLimitValidations) {
    if (!wlv.isValid) {
      errors.push(
        `Section '${wlv.section}' exceeds word limit: ${wlv.wordCount}/${wlv.limit} words (${wlv.overage} over)`
      );
    } else if (wlv.warning) {
      warnings.push(wlv.warning);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    documentType,
    sectionValidations,
    wordLimitValidations,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Check word limits for document sections
 *
 * @param sections - Map of section names to content
 * @param limits - Map of section names to word limits
 * @returns Array of word limit validation results
 *
 * @example
 * ```typescript
 * const sections = {
 *   background: 'Lorem ipsum...',
 *   methods: 'Study design...',
 * };
 * const limits = {
 *   background: 2000,
 *   methods: 3000,
 * };
 * const results = checkWordLimits(sections, limits);
 * ```
 */
export function checkWordLimits(
  sections: Record<string, string>,
  limits: Record<string, number>
): WordLimitValidation[] {
  const results: WordLimitValidation[] = [];

  for (const [sectionName, limit] of Object.entries(limits)) {
    const content = sections[sectionName] || '';
    const wordCount = countWords(content);
    const isValid = wordCount <= limit;
    const overage = isValid ? 0 : wordCount - limit;
    const usagePercent = limit > 0 ? (wordCount / limit) * 100 : 0;

    let warning: string | undefined;
    if (isValid && usagePercent >= 90) {
      warning = `Section '${sectionName}' is approaching word limit: ${wordCount}/${limit} words (${usagePercent.toFixed(0)}% used)`;
    }

    results.push({
      section: sectionName,
      wordCount,
      limit,
      isValid,
      overage,
      warning,
    });
  }

  return results;
}

/**
 * Check that all required sections are present in a document
 *
 * @param document - Document to check
 * @param required - Array of required section names
 * @returns Array of section validation results
 *
 * @example
 * ```typescript
 * const document = {
 *   sections: {
 *     title: 'My Study',
 *     background: 'Lorem ipsum...',
 *   },
 * };
 * const required = ['title', 'background', 'methods'];
 * const results = checkRequiredSections(document, required);
 * // results will show 'methods' as missing
 * ```
 */
export function checkRequiredSections(
  document: { sections?: Record<string, unknown> },
  required: string[]
): SectionValidation[] {
  const results: SectionValidation[] = [];
  const documentSections = document.sections || {};

  for (const sectionName of required) {
    const sectionContent = documentSections[sectionName];
    const isPresent = sectionContent !== undefined && sectionContent !== null && sectionContent !== '';

    results.push({
      section: sectionName,
      isPresent,
      isRequired: true,
      message: isPresent
        ? `Required section '${sectionName}' is present`
        : `Missing required section: ${sectionName}`,
    });
  }

  // Also check for any sections that exist but aren't required
  for (const sectionName of Object.keys(documentSections)) {
    if (!required.includes(sectionName)) {
      results.push({
        section: sectionName,
        isPresent: true,
        isRequired: false,
        message: `Optional section '${sectionName}' is present`,
      });
    }
  }

  return results;
}

/**
 * Check cross-references between multiple documents for consistency
 *
 * This function validates that shared fields (like project title, PI name,
 * sample size, etc.) are consistent across all related documents.
 *
 * @param documents - Array of documents to check for cross-reference consistency
 * @returns Cross-reference validation result with any inconsistencies found
 *
 * @example
 * ```typescript
 * const documents = [
 *   { type: 'protocol', fields: { projectTitle: 'My Study', sampleSize: 100 } },
 *   { type: 'emf_application', fields: { projectTitle: 'My Study', sampleSize: 100 } },
 * ];
 * const result = checkCrossReferences(documents);
 * if (!result.isValid) {
 *   console.log('Inconsistencies found:', result.issues);
 * }
 * ```
 */
export function checkCrossReferences(
  documents: Array<{
    type: string;
    fields: Record<string, unknown>;
  }>
): CrossReferenceValidation {
  const issues: CrossReferenceIssue[] = [];
  const documentsChecked: string[] = [];

  // Build a map of document types to their fields
  const documentFieldMap = new Map<string, Record<string, unknown>>();
  for (const doc of documents) {
    documentFieldMap.set(doc.type, doc.fields);
    documentsChecked.push(doc.type);
  }

  // Check each cross-reference field
  for (const [fieldName, documentTypes] of Object.entries(CROSS_REFERENCE_FIELDS)) {
    // Get values for this field from each relevant document
    const fieldValues = new Map<string, string>();

    for (const docType of documentTypes) {
      const docFields = documentFieldMap.get(docType);
      if (docFields && docFields[fieldName] !== undefined) {
        fieldValues.set(docType, String(docFields[fieldName]));
      }
    }

    // If we have values from multiple documents, check for consistency
    if (fieldValues.size > 1) {
      const values = Array.from(fieldValues.entries());
      const firstEntry = values[0];
      if (!firstEntry) {continue;} // Skip if first entry is undefined
      
      const [firstDocType, firstValue] = firstEntry;

      for (let i = 1; i < values.length; i++) {
        const entry = values[i];
        if (!entry) {continue;} // Skip if entry is undefined
        
        const [docType, value] = entry;

        // Normalize values for comparison (trim, lowercase)
        const normalizedFirst = normalizeValue(firstValue);
        const normalizedCurrent = normalizeValue(value);

        if (normalizedFirst !== normalizedCurrent) {
          issues.push({
            sourceDocument: firstDocType,
            targetDocument: docType,
            field: fieldName,
            sourceValue: firstValue,
            targetValue: value,
            description: `Inconsistent '${fieldName}' between ${firstDocType} ("${truncateValue(firstValue)}") and ${docType} ("${truncateValue(value)}")`,
          });
        }
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    documentsChecked,
  };
}

/**
 * Normalize a value for comparison
 */
function normalizeValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Truncate a value for display in error messages
 */
function truncateValue(value: string, maxLength: number = 50): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength - 3) + '...';
}

/**
 * Get validation rules for a specific document type
 *
 * @param documentType - Type of document
 * @returns Validation rules or undefined if not found
 */
export function getValidationRules(documentType: string): DocumentValidationRule | undefined {
  return VALIDATION_RULES[documentType];
}

/**
 * Get word limit for a specific section in a document type
 *
 * @param documentType - Type of document
 * @param section - Section name
 * @returns Word limit or undefined if not specified
 */
export function getWordLimit(documentType: string, section: string): number | undefined {
  const rules = VALIDATION_RULES[documentType];
  if (!rules) {
    return undefined;
  }
  return rules.wordLimits[section];
}

/**
 * Check if a section is required for a document type
 *
 * @param documentType - Type of document
 * @param section - Section name
 * @returns True if section is required, false otherwise
 */
export function isSectionRequired(documentType: string, section: string): boolean {
  const rules = VALIDATION_RULES[documentType];
  if (!rules) {
    return false;
  }
  return rules.requiredSections.includes(section);
}

/**
 * Validate a single section's word count
 *
 * @param content - Section content
 * @param documentType - Type of document
 * @param section - Section name
 * @returns Word limit validation result
 */
export function validateSectionWordCount(
  content: string,
  documentType: string,
  section: string
): WordLimitValidation {
  const limit = getWordLimit(documentType, section);
  const wordCount = countWords(content);

  if (limit === undefined) {
    return {
      section,
      wordCount,
      limit: 0,
      isValid: true,
      overage: 0,
    };
  }

  const isValid = wordCount <= limit;
  const overage = isValid ? 0 : wordCount - limit;
  const usagePercent = limit > 0 ? (wordCount / limit) * 100 : 0;

  let warning: string | undefined;
  if (isValid && usagePercent >= 90) {
    warning = `Section '${section}' is approaching word limit: ${wordCount}/${limit} words`;
  }

  return {
    section,
    wordCount,
    limit,
    isValid,
    overage,
    warning,
  };
}

/**
 * Get all required sections for a document type
 *
 * @param documentType - Type of document
 * @returns Array of required section names
 */
export function getRequiredSections(documentType: string): string[] {
  const rules = VALIDATION_RULES[documentType];
  if (!rules) {
    return [];
  }
  return [...rules.requiredSections];
}

/**
 * Get formatting requirements for a document type
 *
 * @param documentType - Type of document
 * @returns Formatting requirements or undefined
 */
export function getFormattingRequirements(documentType: string): FormattingRequirements | undefined {
  const rules = VALIDATION_RULES[documentType];
  if (!rules) {
    return undefined;
  }
  return { ...rules.formatting };
}
