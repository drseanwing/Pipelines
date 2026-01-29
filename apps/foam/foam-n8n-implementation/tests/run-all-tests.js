#!/usr/bin/env node
/**
 * Test Runner - Executes all validation tests and provides summary
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  /**
   * Run a single test script
   */
  runTest(name, script, description) {
    console.log(`\n${colors.blue}${colors.bold}Running: ${name}${colors.reset}`);
    console.log(`${colors.dim}${description}${colors.reset}\n`);

    const startTime = Date.now();
    let exitCode = 0;
    let output = '';

    try {
      output = execSync(`node ${script}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: __dirname
      });
      exitCode = 0;
    } catch (error) {
      output = error.stdout || error.stderr || error.message;
      exitCode = error.status || 1;
    }

    const duration = Date.now() - startTime;

    this.results.push({
      name,
      exitCode,
      duration,
      passed: exitCode === 0,
      output
    });

    // Print output
    console.log(output);

    // Print test result
    if (exitCode === 0) {
      console.log(`${colors.green}✓ ${name} passed${colors.reset} (${duration}ms)`);
    } else {
      console.log(`${colors.red}✗ ${name} failed${colors.reset} (${duration}ms)`);
    }

    console.log('\n' + '='.repeat(70));
  }

  /**
   * Print final summary
   */
  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log('\n\n' + '='.repeat(70));
    console.log(`${colors.bold}${colors.blue}TEST SUMMARY${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    this.results.forEach(result => {
      const icon = result.passed ? colors.green + '✓' : colors.red + '✗';
      const status = result.passed ? 'PASS' : 'FAIL';
      console.log(`${icon} ${result.name}${colors.reset}`);
      console.log(`  Status: ${result.passed ? colors.green : colors.red}${status}${colors.reset}`);
      console.log(`  Duration: ${result.duration}ms`);
      console.log('');
    });

    console.log('='.repeat(70));
    console.log(`Tests run: ${colors.blue}${this.results.length}${colors.reset}`);
    console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
    console.log(`Failed: ${failed > 0 ? colors.red : colors.dim}${failed}${colors.reset}`);
    console.log(`Total time: ${colors.blue}${totalDuration}ms${colors.reset}`);
    console.log('='.repeat(70));

    if (failed === 0) {
      console.log(`\n${colors.green}${colors.bold}✓ ALL TESTS PASSED!${colors.reset}\n`);
      return 0;
    } else {
      console.log(`\n${colors.red}${colors.bold}✗ SOME TESTS FAILED${colors.reset}\n`);
      return 1;
    }
  }

  /**
   * Run all tests
   */
  run() {
    console.log(`${colors.bold}${colors.blue}FOAM N8N Implementation - Test Suite${colors.reset}`);
    console.log(`${colors.dim}Comprehensive validation of workflows, schemas, and models${colors.reset}`);
    console.log('='.repeat(70));

    // Run all validation scripts
    this.runTest(
      'Workflow Validation',
      'validate-workflows.js',
      'Validates N8N workflow structure, nodes, and connections'
    );

    this.runTest(
      'Schema Validation',
      'validate-schemas.js',
      'Validates JSON schemas and tests sample data'
    );

    this.runTest(
      'Model Consistency',
      'check-model-consistency.js',
      'Checks LLM model references follow approved strategy'
    );

    // Print summary and exit
    const exitCode = this.printSummary();
    return exitCode;
  }
}

// Main execution
if (require.main === module) {
  const runner = new TestRunner();
  const exitCode = runner.run();
  process.exit(exitCode);
}

module.exports = TestRunner;
