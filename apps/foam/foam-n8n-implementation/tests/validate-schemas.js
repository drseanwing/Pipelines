#!/usr/bin/env node
/**
 * Schema Validation Script
 * Validates all JSON schema files using Ajv and tests sample data
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m'
};

class SchemaValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validatedCount = 0;
    this.testedCount = 0;

    // Initialize Ajv with strict mode and formats
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: true,
      strictSchema: true
    });
    addFormats(this.ajv);
  }

  /**
   * Find all schema files
   */
  findSchemaFiles(baseDir) {
    const schemaDir = path.join(baseDir, 'schemas');

    if (!fs.existsSync(schemaDir)) {
      return [];
    }

    return fs.readdirSync(schemaDir)
      .filter(file => file.endsWith('.schema.json'))
      .map(file => path.join(schemaDir, file));
  }

  /**
   * Validate a schema file itself is valid JSON Schema
   */
  validateSchemaFile(filePath) {
    const fileName = path.basename(filePath);
    console.log(`${colors.blue}Validating schema:${colors.reset} ${fileName}`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let schema;

      try {
        schema = JSON.parse(content);
      } catch (parseError) {
        this.errors.push({
          file: fileName,
          type: 'JSON_PARSE_ERROR',
          message: `Invalid JSON: ${parseError.message}`
        });
        return null;
      }

      // Check basic schema properties
      if (!schema.$schema) {
        this.warnings.push({
          file: fileName,
          type: 'MISSING_SCHEMA_VERSION',
          message: 'Schema missing $schema property'
        });
      }

      if (!schema.type) {
        this.warnings.push({
          file: fileName,
          type: 'MISSING_TYPE',
          message: 'Schema missing type property'
        });
      }

      // Try to compile the schema
      try {
        this.ajv.compile(schema);
        console.log(`  ${colors.green}✓${colors.reset} Valid JSON Schema`);
        this.validatedCount++;
        return schema;
      } catch (compileError) {
        this.errors.push({
          file: fileName,
          type: 'SCHEMA_COMPILE_ERROR',
          message: `Schema compilation failed: ${compileError.message}`
        });
        return null;
      }

    } catch (error) {
      this.errors.push({
        file: fileName,
        type: 'VALIDATION_ERROR',
        message: `Unexpected error: ${error.message}`
      });
      return null;
    }
  }

  /**
   * Get sample data for a schema
   */
  getSampleData(schemaName) {
    const samples = {
      'topic-request.schema.json': {
        valid: {
          request_id: '550e8400-e29b-41d4-a716-446655440000',
          format: 'case-based',
          topic: {
            title: 'Traumatic Brain Injury Management',
            clinical_question: 'What are the key management priorities for severe TBI?',
            case_scenario: {
              age: '45',
              sex: 'Male',
              setting: 'ED',
              chief_complaint: 'Altered consciousness following fall',
              initial_vitals: {
                hr: '110',
                bp: '160/95',
                rr: '22',
                spo2: '95%',
                temp: '36.8',
                gcs: '10'
              },
              key_history: 'Fall from height 2 hours ago',
              key_exam_findings: 'Left pupil dilated'
            },
            keywords: ['traumatic brain injury', 'TBI', 'neurosurgery']
          },
          requestor: {
            name: 'Dr. Test User',
            email: 'test@example.com',
            institution: 'Test Hospital',
            role: 'ED Registrar'
          },
          target_audience: 'registrar',
          urgency: 'routine',
          regional_context: 'australia'
        },
        invalid: [
          {
            description: 'Missing required field: format',
            data: {
              topic: { title: 'Test', clinical_question: 'Test?' },
              requestor: { name: 'Test', email: 'test@example.com' }
            }
          },
          {
            description: 'Invalid format value',
            data: {
              format: 'invalid-format',
              topic: { title: 'Test', clinical_question: 'Test?' },
              requestor: { name: 'Test', email: 'test@example.com' }
            }
          },
          {
            description: 'Invalid email format',
            data: {
              format: 'case-based',
              topic: { title: 'Test', clinical_question: 'Test?' },
              requestor: { name: 'Test', email: 'not-an-email' }
            }
          }
        ]
      },

      'draft-content.schema.json': {
        valid: {
          request_id: '550e8400-e29b-41d4-a716-446655440000',
          format: 'case-based',
          content: {
            vignette: 'A 45-year-old presents with chest pain...',
            sections: [
              {
                heading: 'Background',
                content: 'Clinical context...',
                evidence_citations: [1, 2]
              }
            ]
          },
          placeholders: [],
          validation_items: [],
          quality_checks: { tone: 'appropriate', readability: 'good' }
        },
        invalid: [
          {
            description: 'Missing content',
            data: {
              request_id: '550e8400-e29b-41d4-a716-446655440000',
              format: 'case-based'
            }
          }
        ]
      },

      'evidence-package.schema.json': {
        valid: {
          request_id: '550e8400-e29b-41d4-a716-446655440000',
          search_terms: ['sepsis', 'early goal-directed therapy'],
          sources: [
            {
              source_type: 'pubmed',
              pmid: '12345678',
              title: 'Early Goal-Directed Therapy in Sepsis',
              authors: ['Smith J', 'Jones A'],
              year: 2023,
              abstract: 'Study abstract...',
              relevance_score: 0.95,
              key_findings: ['Finding 1', 'Finding 2']
            }
          ],
          evidence_summary: 'Summary of evidence...',
          quality_grade: 'High'
        },
        invalid: [
          {
            description: 'Invalid source type',
            data: {
              request_id: '550e8400-e29b-41d4-a716-446655440000',
              search_terms: ['test'],
              sources: [
                {
                  source_type: 'invalid-type',
                  title: 'Test'
                }
              ],
              evidence_summary: 'Test',
              quality_grade: 'High'
            }
          }
        ]
      },

      'review-request.schema.json': {
        valid: {
          request_id: '550e8400-e29b-41d4-a716-446655440000',
          draft_id: 'draft-12345',
          reviewer: {
            name: 'Dr. Reviewer',
            email: 'reviewer@example.com',
            credentials: 'FACEM',
            speciality: 'Emergency Medicine'
          },
          review_type: 'peer',
          deadline: '2024-12-31T23:59:59Z'
        },
        invalid: [
          {
            description: 'Invalid review type',
            data: {
              request_id: '550e8400-e29b-41d4-a716-446655440000',
              draft_id: 'draft-12345',
              reviewer: {
                name: 'Test',
                email: 'test@example.com'
              },
              review_type: 'invalid-type'
            }
          }
        ]
      }
    };

    return samples[schemaName] || null;
  }

  /**
   * Test sample data against schema
   */
  testSampleData(schemaFile, schema) {
    const fileName = path.basename(schemaFile);
    const samples = this.getSampleData(fileName);

    if (!samples) {
      console.log(`  ${colors.dim}No sample data defined${colors.reset}`);
      return;
    }

    console.log(`${colors.blue}Testing samples:${colors.reset} ${fileName}`);

    // Test valid sample
    if (samples.valid) {
      const validate = this.ajv.compile(schema);
      const isValid = validate(samples.valid);

      if (isValid) {
        console.log(`  ${colors.green}✓${colors.reset} Valid sample passes`);
        this.testedCount++;
      } else {
        this.errors.push({
          file: fileName,
          type: 'VALID_SAMPLE_FAILED',
          message: `Valid sample should pass but failed: ${this.formatAjvErrors(validate.errors)}`
        });
      }
    }

    // Test invalid samples
    if (samples.invalid && samples.invalid.length > 0) {
      const validate = this.ajv.compile(schema);

      samples.invalid.forEach((invalidSample, index) => {
        const isValid = validate(invalidSample.data);

        if (!isValid) {
          console.log(`  ${colors.green}✓${colors.reset} Invalid sample ${index + 1} correctly rejected: ${invalidSample.description}`);
          this.testedCount++;
        } else {
          this.errors.push({
            file: fileName,
            type: 'INVALID_SAMPLE_PASSED',
            message: `Invalid sample should fail but passed: ${invalidSample.description}`
          });
        }
      });
    }

    console.log('');
  }

  /**
   * Format Ajv validation errors
   */
  formatAjvErrors(errors) {
    if (!errors || errors.length === 0) return 'Unknown error';

    return errors.map(err => {
      const path = err.instancePath || err.dataPath || '/';
      return `${path} ${err.message}`;
    }).join('; ');
  }

  /**
   * Print validation results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.blue}SCHEMA VALIDATION RESULTS${colors.reset}`);
    console.log('='.repeat(60));

    console.log(`\nSchemas validated: ${colors.blue}${this.validatedCount}${colors.reset}`);
    console.log(`Sample tests run: ${colors.blue}${this.testedCount}${colors.reset}`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`${colors.green}✓ All schemas are valid!${colors.reset}\n`);
      return 0;
    }

    // Print errors
    if (this.errors.length > 0) {
      console.log(`\n${colors.red}ERRORS (${this.errors.length}):${colors.reset}`);
      this.errors.forEach(error => {
        console.log(`  ${colors.red}✗${colors.reset} ${error.file}`);
        console.log(`    ${colors.dim}${error.type}:${colors.reset} ${error.message}`);
      });
    }

    // Print warnings
    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}WARNINGS (${this.warnings.length}):${colors.reset}`);
      this.warnings.forEach(warning => {
        console.log(`  ${colors.yellow}!${colors.reset} ${warning.file}`);
        console.log(`    ${colors.dim}${warning.type}:${colors.reset} ${warning.message}`);
      });
    }

    console.log('');
    return this.errors.length > 0 ? 1 : 0;
  }

  /**
   * Run validation
   */
  run(baseDir) {
    console.log(`${colors.blue}JSON Schema Validator${colors.reset}\n`);
    console.log(`Scanning directory: ${baseDir}\n`);

    const files = this.findSchemaFiles(baseDir);

    if (files.length === 0) {
      console.log(`${colors.yellow}No schema files found!${colors.reset}`);
      return 1;
    }

    console.log(`Found ${files.length} schema file(s)\n`);

    files.forEach(file => {
      const schema = this.validateSchemaFile(file);
      if (schema) {
        this.testSampleData(file, schema);
      }
    });

    return this.printResults();
  }
}

// Main execution
if (require.main === module) {
  const baseDir = path.resolve(__dirname, '..');
  const validator = new SchemaValidator();
  const exitCode = validator.run(baseDir);
  process.exit(exitCode);
}

module.exports = SchemaValidator;
