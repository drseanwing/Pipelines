#!/usr/bin/env node
/**
 * Workflow Validation Script
 * Validates all N8N workflow JSON files for structural integrity and consistency
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

class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validatedCount = 0;
  }

  /**
   * Find all JSON workflow files
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
   * Validate a single workflow file
   */
  validateWorkflow(filePath) {
    const fileName = path.basename(filePath);
    console.log(`${colors.blue}Validating:${colors.reset} ${fileName}`);

    try {
      // Read and parse JSON
      const content = fs.readFileSync(filePath, 'utf8');
      let workflow;

      try {
        workflow = JSON.parse(content);
      } catch (parseError) {
        this.errors.push({
          file: fileName,
          type: 'JSON_PARSE_ERROR',
          message: `Invalid JSON: ${parseError.message}`
        });
        return false;
      }

      // Validate required N8N workflow properties
      this.validateRequiredProperties(workflow, fileName);

      // Validate nodes structure
      this.validateNodes(workflow, fileName);

      // Validate connections
      this.validateConnections(workflow, fileName);

      // Validate credentials consistency
      this.validateCredentials(workflow, fileName);

      // Check for duplicate node IDs
      this.checkDuplicateNodeIds(workflow, fileName);

      this.validatedCount++;
      console.log(`  ${colors.green}✓${colors.reset} Valid workflow structure`);
      return true;

    } catch (error) {
      this.errors.push({
        file: fileName,
        type: 'VALIDATION_ERROR',
        message: `Unexpected error: ${error.message}`
      });
      return false;
    }
  }

  /**
   * Validate required workflow properties
   */
  validateRequiredProperties(workflow, fileName) {
    const required = ['name', 'nodes', 'connections'];
    const missing = required.filter(prop => !(prop in workflow));

    if (missing.length > 0) {
      this.errors.push({
        file: fileName,
        type: 'MISSING_REQUIRED_PROPERTY',
        message: `Missing required properties: ${missing.join(', ')}`
      });
    }

    // Validate name
    if (workflow.name && typeof workflow.name !== 'string') {
      this.errors.push({
        file: fileName,
        type: 'INVALID_NAME',
        message: 'Workflow name must be a string'
      });
    }

    // Validate nodes is array
    if (workflow.nodes && !Array.isArray(workflow.nodes)) {
      this.errors.push({
        file: fileName,
        type: 'INVALID_NODES',
        message: 'Nodes must be an array'
      });
    }

    // Validate connections is object
    if (workflow.connections && typeof workflow.connections !== 'object') {
      this.errors.push({
        file: fileName,
        type: 'INVALID_CONNECTIONS',
        message: 'Connections must be an object'
      });
    }
  }

  /**
   * Validate nodes array
   */
  validateNodes(workflow, fileName) {
    if (!Array.isArray(workflow.nodes)) return;

    workflow.nodes.forEach((node, index) => {
      // Required node properties
      const requiredNodeProps = ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'];
      const missingNodeProps = requiredNodeProps.filter(prop => !(prop in node));

      if (missingNodeProps.length > 0) {
        this.errors.push({
          file: fileName,
          type: 'INVALID_NODE',
          message: `Node ${index} (${node.name || 'unnamed'}) missing: ${missingNodeProps.join(', ')}`
        });
      }

      // Validate node ID
      if (node.id && typeof node.id !== 'string') {
        this.errors.push({
          file: fileName,
          type: 'INVALID_NODE_ID',
          message: `Node ${index} has invalid ID type (must be string)`
        });
      }

      // Validate position is array with 2 numbers
      if (node.position) {
        if (!Array.isArray(node.position) || node.position.length !== 2) {
          this.errors.push({
            file: fileName,
            type: 'INVALID_POSITION',
            message: `Node ${node.name} has invalid position (must be [x, y] array)`
          });
        }
      }

      // Validate parameters is object
      if (node.parameters && typeof node.parameters !== 'object') {
        this.errors.push({
          file: fileName,
          type: 'INVALID_PARAMETERS',
          message: `Node ${node.name} has invalid parameters (must be object)`
        });
      }
    });
  }

  /**
   * Validate connections reference existing nodes
   */
  validateConnections(workflow, fileName) {
    if (!workflow.connections || !Array.isArray(workflow.nodes)) return;

    const nodeNames = new Set(workflow.nodes.map(n => n.name));
    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    Object.entries(workflow.connections).forEach(([sourceNode, connections]) => {
      // Check source node exists
      if (!nodeNames.has(sourceNode)) {
        this.errors.push({
          file: fileName,
          type: 'INVALID_CONNECTION_SOURCE',
          message: `Connection source node '${sourceNode}' does not exist`
        });
      }

      // Validate connection structure
      if (connections.main && Array.isArray(connections.main)) {
        connections.main.forEach((outputs, outputIndex) => {
          if (!Array.isArray(outputs)) return;

          outputs.forEach((connection, connIndex) => {
            if (!connection.node) {
              this.errors.push({
                file: fileName,
                type: 'MISSING_CONNECTION_TARGET',
                message: `Connection from '${sourceNode}' output ${outputIndex} index ${connIndex} missing target node`
              });
              return;
            }

            // Check target node exists
            if (!nodeNames.has(connection.node)) {
              this.errors.push({
                file: fileName,
                type: 'INVALID_CONNECTION_TARGET',
                message: `Connection target node '${connection.node}' (from ${sourceNode}) does not exist`
              });
            }

            // Validate connection properties
            if (!('type' in connection)) {
              this.warnings.push({
                file: fileName,
                type: 'MISSING_CONNECTION_TYPE',
                message: `Connection from '${sourceNode}' to '${connection.node}' missing type`
              });
            }

            if (!('index' in connection)) {
              this.warnings.push({
                file: fileName,
                type: 'MISSING_CONNECTION_INDEX',
                message: `Connection from '${sourceNode}' to '${connection.node}' missing index`
              });
            }
          });
        });
      }
    });
  }

  /**
   * Check for duplicate node IDs
   */
  checkDuplicateNodeIds(workflow, fileName) {
    if (!Array.isArray(workflow.nodes)) return;

    const nodeIds = {};
    const nodeNames = {};

    workflow.nodes.forEach(node => {
      // Check ID duplicates
      if (node.id) {
        if (nodeIds[node.id]) {
          this.errors.push({
            file: fileName,
            type: 'DUPLICATE_NODE_ID',
            message: `Duplicate node ID '${node.id}' found in nodes: '${nodeIds[node.id]}' and '${node.name}'`
          });
        } else {
          nodeIds[node.id] = node.name;
        }
      }

      // Check name duplicates (warning only)
      if (node.name) {
        if (nodeNames[node.name]) {
          this.warnings.push({
            file: fileName,
            type: 'DUPLICATE_NODE_NAME',
            message: `Duplicate node name '${node.name}' found`
          });
        } else {
          nodeNames[node.name] = true;
        }
      }
    });
  }

  /**
   * Validate credential consistency
   */
  validateCredentials(workflow, fileName) {
    if (!Array.isArray(workflow.nodes)) return;

    const credentialsByType = {};

    workflow.nodes.forEach(node => {
      if (!node.credentials) return;

      Object.entries(node.credentials).forEach(([credType, credValue]) => {
        if (!credValue || !credValue.name) return;

        if (!credentialsByType[credType]) {
          credentialsByType[credType] = new Set();
        }
        credentialsByType[credType].add(credValue.name);
      });
    });

    // Warn if multiple credential names used for same type
    Object.entries(credentialsByType).forEach(([credType, names]) => {
      if (names.size > 1) {
        this.warnings.push({
          file: fileName,
          type: 'INCONSISTENT_CREDENTIALS',
          message: `Multiple credential names for type '${credType}': ${Array.from(names).join(', ')}`
        });
      }
    });
  }

  /**
   * Print validation results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.blue}VALIDATION RESULTS${colors.reset}`);
    console.log('='.repeat(60));

    console.log(`\nWorkflows validated: ${colors.blue}${this.validatedCount}${colors.reset}`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`${colors.green}✓ All workflows are valid!${colors.reset}\n`);
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
    console.log(`${colors.blue}N8N Workflow Validator${colors.reset}\n`);
    console.log(`Scanning directory: ${baseDir}\n`);

    const files = this.findWorkflowFiles(baseDir);

    if (files.length === 0) {
      console.log(`${colors.yellow}No workflow files found!${colors.reset}`);
      return 1;
    }

    console.log(`Found ${files.length} workflow file(s)\n`);

    files.forEach(file => {
      this.validateWorkflow(file);
      console.log('');
    });

    return this.printResults();
  }
}

// Main execution
if (require.main === module) {
  const baseDir = path.resolve(__dirname, '..');
  const validator = new WorkflowValidator();
  const exitCode = validator.run(baseDir);
  process.exit(exitCode);
}

module.exports = WorkflowValidator;
