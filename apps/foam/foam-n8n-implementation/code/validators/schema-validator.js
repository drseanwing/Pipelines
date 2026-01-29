/**
 * FOAM Workflow Schema Validator
 * 
 * Validates data against JSON schemas for the FOAM workflow.
 * Provides detailed error messages for debugging.
 * 
 * @module validators/schema-validator
 * @version 1.0.0
 */

// =============================================================================
// SCHEMA DEFINITIONS (Inline for N8N Code Node usage)
// =============================================================================

/**
 * Simplified schema definitions for validation
 * Full schemas are in /schemas/ directory
 */
const SCHEMAS = {
  topicRequest: {
    required: ['format', 'topic', 'requestor'],
    properties: {
      format: { type: 'string', enum: ['case-based', 'journal-club', 'clinical-review'] },
      topic: { type: 'object', required: ['title', 'clinical_question'] },
      requestor: { type: 'object', required: ['name', 'email'] }
    }
  },
  
  evidencePackage: {
    required: ['request_id', 'sources', 'synthesis', 'generated_at'],
    properties: {
      request_id: { type: 'string', format: 'uuid' },
      sources: { type: 'array', minItems: 1 },
      synthesis: { type: 'object', required: ['evidence_summary', 'evidence_quality'] }
    }
  },
  
  draftContent: {
    required: ['request_id', 'format', 'content', 'metadata'],
    properties: {
      format: { type: 'string', enum: ['case-based', 'journal-club', 'clinical-review'] },
      content: { type: 'object', required: ['title', 'body_markdown'] },
      metadata: { type: 'object', required: ['generated_by', 'generation_timestamp'] }
    }
  },
  
  reviewRequest: {
    required: ['request_id', 'draft_id', 'reviewer', 'checklist'],
    properties: {
      reviewer: { type: 'object', required: ['name', 'email'] },
      checklist: { type: 'object' }
    }
  }
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate a value against a type
 * 
 * @param {*} value - Value to validate
 * @param {string} expectedType - Expected type
 * @returns {boolean} Whether valid
 */
function validateType(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return true;
  }
}

/**
 * Validate email format
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} Whether valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 * 
 * @param {string} uuid - UUID to validate
 * @returns {boolean} Whether valid
 */
function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate data against a schema
 * 
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema to validate against
 * @param {string} path - Current path (for error messages)
 * @returns {Object} Validation result with errors array
 */
function validate(data, schema, path = '') {
  const errors = [];
  
  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === null) {
        errors.push({
          path: path ? `${path}.${field}` : field,
          message: `Required field '${field}' is missing`,
          type: 'required'
        });
      }
    }
  }
  
  // Check properties
  if (schema.properties && data) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = data[key];
      const propPath = path ? `${path}.${key}` : key;
      
      // Skip if undefined and not required
      if (value === undefined) continue;
      
      // Type validation
      if (propSchema.type && !validateType(value, propSchema.type)) {
        errors.push({
          path: propPath,
          message: `Expected type '${propSchema.type}', got '${typeof value}'`,
          type: 'type'
        });
        continue;
      }
      
      // Enum validation
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        errors.push({
          path: propPath,
          message: `Value '${value}' not in allowed values: ${propSchema.enum.join(', ')}`,
          type: 'enum'
        });
      }
      
      // Format validation
      if (propSchema.format) {
        if (propSchema.format === 'email' && !validateEmail(value)) {
          errors.push({
            path: propPath,
            message: `Invalid email format`,
            type: 'format'
          });
        }
        if (propSchema.format === 'uuid' && !validateUUID(value)) {
          errors.push({
            path: propPath,
            message: `Invalid UUID format`,
            type: 'format'
          });
        }
      }
      
      // Array validation
      if (propSchema.type === 'array' && Array.isArray(value)) {
        if (propSchema.minItems && value.length < propSchema.minItems) {
          errors.push({
            path: propPath,
            message: `Array must have at least ${propSchema.minItems} items`,
            type: 'minItems'
          });
        }
      }
      
      // Nested object validation
      if (propSchema.type === 'object' && propSchema.required) {
        const nestedResult = validate(value, propSchema, propPath);
        errors.push(...nestedResult.errors);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// =============================================================================
// PUBLIC VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate a topic request
 * 
 * @param {Object} data - Topic request data
 * @returns {Object} Validation result
 */
function validateTopicRequest(data) {
  const result = validate(data, SCHEMAS.topicRequest);
  
  // Additional format-specific validation
  if (data.format === 'journal-club' && !data.topic?.trial_reference) {
    result.errors.push({
      path: 'topic.trial_reference',
      message: 'Journal club format requires trial_reference',
      type: 'conditional'
    });
    result.valid = false;
  }
  
  if (data.format === 'case-based' && !data.topic?.case_scenario) {
    result.errors.push({
      path: 'topic.case_scenario',
      message: 'Case-based format requires case_scenario',
      type: 'conditional'
    });
    result.valid = false;
  }
  
  return result;
}

/**
 * Validate an evidence package
 * 
 * @param {Object} data - Evidence package data
 * @returns {Object} Validation result
 */
function validateEvidencePackage(data) {
  return validate(data, SCHEMAS.evidencePackage);
}

/**
 * Validate draft content
 * 
 * @param {Object} data - Draft content data
 * @returns {Object} Validation result
 */
function validateDraftContent(data) {
  const result = validate(data, SCHEMAS.draftContent);
  
  // Word count validation based on format
  if (data.content?.word_count && data.format) {
    const ranges = {
      'case-based': { min: 1500, max: 2500 },
      'journal-club': { min: 1000, max: 2000 },
      'clinical-review': { min: 3000, max: 5000 }
    };
    
    const range = ranges[data.format];
    if (range) {
      if (data.content.word_count < range.min) {
        result.errors.push({
          path: 'content.word_count',
          message: `Word count (${data.content.word_count}) below minimum (${range.min}) for ${data.format}`,
          type: 'range',
          severity: 'warning'
        });
      }
      if (data.content.word_count > range.max) {
        result.errors.push({
          path: 'content.word_count',
          message: `Word count (${data.content.word_count}) above maximum (${range.max}) for ${data.format}`,
          type: 'range',
          severity: 'warning'
        });
      }
    }
  }
  
  return result;
}

/**
 * Validate a review request
 * 
 * @param {Object} data - Review request data
 * @returns {Object} Validation result
 */
function validateReviewRequest(data) {
  return validate(data, SCHEMAS.reviewRequest);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format validation errors for logging/display
 * 
 * @param {Array} errors - Array of validation errors
 * @returns {string} Formatted error message
 */
function formatValidationErrors(errors) {
  if (errors.length === 0) return 'No validation errors';
  
  return errors.map(err => {
    const severity = err.severity || 'error';
    return `[${severity.toUpperCase()}] ${err.path}: ${err.message}`;
  }).join('\n');
}

/**
 * Check if validation has critical errors (not just warnings)
 * 
 * @param {Object} result - Validation result
 * @returns {boolean} Whether there are critical errors
 */
function hasCriticalErrors(result) {
  return result.errors.some(err => err.severity !== 'warning');
}

// =============================================================================
// EXPORTS
// =============================================================================

const SchemaValidator = {
  SCHEMAS,
  validate,
  validateTopicRequest,
  validateEvidencePackage,
  validateDraftContent,
  validateReviewRequest,
  formatValidationErrors,
  hasCriticalErrors,
  validateType,
  validateEmail,
  validateUUID
};

// For use in N8N Code nodes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SchemaValidator;
}

// Return for N8N Code node usage
return SchemaValidator;
