#!/usr/bin/env node
/**
 * Model Consistency Checker
 * Validates that all LLM model references follow the documented model strategy
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m'
};

// Documented model strategy
const APPROVED_MODELS = {
  claude: 'claude-sonnet-4-20250514',
  gpt4o: 'gpt-4o',
  'gpt4o-mini': 'gpt-4o-mini',
  'ollama-llama': 'llama3.2:latest',
  'ollama-mistral': 'mistral:latest'
};

const MODEL_CATEGORIES = {
  'claude-sonnet-4-20250514': 'claude',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'llama3.2:latest': 'ollama-llama',
  'llama3.2': 'ollama-llama',
  'mistral:latest': 'ollama-mistral',
  'mistral': 'ollama-mistral'
};

class ModelConsistencyChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.modelReferences = {};
    this.fileCount = 0;
  }

  /**
   * Find all workflow files
   */
  findWorkflowFiles(baseDir) {
    const workflowDirs = [
      path.join(baseDir, 'workflows'),
      path.join(baseDir, 'workflows', 'common')
    ];

    const files = [];
    workflowDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const dirFiles = fs.readdirSync(dir)
          .filter(file => file.endsWith('.json'))
          .map(file => path.join(dir, file));
        files.push(...dirFiles);
      }
    });

    return files;
  }

  /**
   * Extract model references from workflow
   */
  extractModelReferences(filePath) {
    const fileName = path.basename(filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let workflow;

      try {
        workflow = JSON.parse(content);
      } catch (parseError) {
        this.warnings.push({
          file: fileName,
          type: 'JSON_PARSE_ERROR',
          message: `Could not parse JSON: ${parseError.message}`
        });
        return;
      }

      if (!Array.isArray(workflow.nodes)) {
        return;
      }

      // Search for model references in nodes
      workflow.nodes.forEach((node, nodeIndex) => {
        this.searchNodeForModels(node, fileName, nodeIndex);
      });

      this.fileCount++;

    } catch (error) {
      this.warnings.push({
        file: fileName,
        type: 'READ_ERROR',
        message: `Could not read file: ${error.message}`
      });
    }
  }

  /**
   * Recursively search object for model references
   */
  searchNodeForModels(obj, fileName, nodeIndex, path = '') {
    if (!obj || typeof obj !== 'object') return;

    // Check for 'model' property
    if ('model' in obj && typeof obj.model === 'string') {
      const modelValue = obj.model;
      const nodeName = obj.name || `node-${nodeIndex}`;
      const fullPath = path ? `${path}.model` : 'model';

      this.recordModelReference(modelValue, fileName, nodeName, fullPath);
    }

    // Recursively search nested objects and arrays
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        const newPath = path ? `${path}.${key}` : key;
        this.searchNodeForModels(value, fileName, nodeIndex, newPath);
      }
    });
  }

  /**
   * Record and validate a model reference
   */
  recordModelReference(model, fileName, nodeName, path) {
    // Initialize tracking
    if (!this.modelReferences[model]) {
      this.modelReferences[model] = [];
    }

    this.modelReferences[model].push({
      file: fileName,
      node: nodeName,
      path: path
    });

    // Validate against approved models
    const isApproved = Object.values(APPROVED_MODELS).includes(model);
    const category = MODEL_CATEGORIES[model];

    if (!isApproved) {
      // Check if it's a known variant
      if (category) {
        const approvedModel = APPROVED_MODELS[category];
        this.warnings.push({
          file: fileName,
          type: 'MODEL_VARIANT',
          message: `Node '${nodeName}' uses model variant '${model}'. Consider using standard '${approvedModel}'`,
          node: nodeName,
          path: path
        });
      } else {
        this.errors.push({
          file: fileName,
          type: 'UNAPPROVED_MODEL',
          message: `Node '${nodeName}' uses unapproved model '${model}'`,
          node: nodeName,
          path: path
        });
      }
    }
  }

  /**
   * Analyze model usage patterns
   */
  analyzeModelUsage() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.blue}MODEL USAGE ANALYSIS${colors.reset}`);
    console.log('='.repeat(60) + '\n');

    const sortedModels = Object.entries(this.modelReferences)
      .sort((a, b) => b[1].length - a[1].length);

    sortedModels.forEach(([model, references]) => {
      const isApproved = Object.values(APPROVED_MODELS).includes(model);
      const icon = isApproved ? colors.green + '✓' : colors.yellow + '!';
      const category = MODEL_CATEGORIES[model] || 'unknown';

      console.log(`${icon}${colors.reset} ${colors.blue}${model}${colors.reset} (${category})`);
      console.log(`  Used ${references.length} time(s) across ${new Set(references.map(r => r.file)).size} file(s)`);

      if (references.length <= 5) {
        references.forEach(ref => {
          console.log(`    - ${ref.file} > ${ref.node}`);
        });
      } else {
        const fileCount = new Set(references.map(r => r.file)).size;
        console.log(`    (${references.length} references in ${fileCount} files)`);
      }
      console.log('');
    });
  }

  /**
   * Print approved models reference
   */
  printApprovedModels() {
    console.log('='.repeat(60));
    console.log(`${colors.blue}APPROVED MODEL STRATEGY${colors.reset}`);
    console.log('='.repeat(60) + '\n');

    console.log(`${colors.green}Claude:${colors.reset}`);
    console.log(`  ${APPROVED_MODELS.claude}`);
    console.log(`  Use for: Primary LLM tasks, content generation\n`);

    console.log(`${colors.green}GPT-4o:${colors.reset}`);
    console.log(`  ${APPROVED_MODELS.gpt4o}`);
    console.log(`  Use for: Fallback when Claude fails\n`);

    console.log(`${colors.green}GPT-4o Mini:${colors.reset}`);
    console.log(`  ${APPROVED_MODELS['gpt4o-mini']}`);
    console.log(`  Use for: Secondary fallback, simple tasks\n`);

    console.log(`${colors.green}Ollama Llama:${colors.reset}`);
    console.log(`  ${APPROVED_MODELS['ollama-llama']}`);
    console.log(`  Use for: Local/offline processing\n`);

    console.log(`${colors.green}Ollama Mistral:${colors.reset}`);
    console.log(`  ${APPROVED_MODELS['ollama-mistral']}`);
    console.log(`  Use for: Local/offline processing\n`);
  }

  /**
   * Print validation results
   */
  printResults() {
    console.log('='.repeat(60));
    console.log(`${colors.blue}VALIDATION RESULTS${colors.reset}`);
    console.log('='.repeat(60));

    console.log(`\nWorkflow files scanned: ${colors.blue}${this.fileCount}${colors.reset}`);
    console.log(`Unique models found: ${colors.blue}${Object.keys(this.modelReferences).length}${colors.reset}`);
    console.log(`Total model references: ${colors.blue}${Object.values(this.modelReferences).reduce((sum, refs) => sum + refs.length, 0)}${colors.reset}`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`\n${colors.green}✓ All model references follow the approved strategy!${colors.reset}\n`);
      return 0;
    }

    // Print errors
    if (this.errors.length > 0) {
      console.log(`\n${colors.red}ERRORS (${this.errors.length}):${colors.reset}`);
      this.errors.forEach(error => {
        console.log(`  ${colors.red}✗${colors.reset} ${error.file}`);
        console.log(`    ${colors.dim}${error.type}:${colors.reset} ${error.message}`);
        if (error.path) {
          console.log(`    ${colors.dim}Path:${colors.reset} ${error.path}`);
        }
      });
    }

    // Print warnings
    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}WARNINGS (${this.warnings.length}):${colors.reset}`);
      this.warnings.forEach(warning => {
        console.log(`  ${colors.yellow}!${colors.reset} ${warning.file}`);
        console.log(`    ${colors.dim}${warning.type}:${colors.reset} ${warning.message}`);
        if (warning.path) {
          console.log(`    ${colors.dim}Path:${colors.reset} ${warning.path}`);
        }
      });
    }

    console.log('');
    return this.errors.length > 0 ? 1 : 0;
  }

  /**
   * Run consistency check
   */
  run(baseDir) {
    console.log(`${colors.blue}LLM Model Consistency Checker${colors.reset}\n`);
    console.log(`Scanning directory: ${baseDir}\n`);

    this.printApprovedModels();

    const files = this.findWorkflowFiles(baseDir);

    if (files.length === 0) {
      console.log(`${colors.yellow}No workflow files found!${colors.reset}`);
      return 1;
    }

    console.log(`\nScanning ${files.length} workflow file(s)...\n`);

    files.forEach(file => {
      this.extractModelReferences(file);
    });

    this.analyzeModelUsage();

    return this.printResults();
  }
}

// Main execution
if (require.main === module) {
  const baseDir = path.resolve(__dirname, '..');
  const checker = new ModelConsistencyChecker();
  const exitCode = checker.run(baseDir);
  process.exit(exitCode);
}

module.exports = ModelConsistencyChecker;
