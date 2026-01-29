# FOAM N8N Test Suite - Quick Start Guide

## Installation

```bash
cd foam-n8n-implementation/tests
npm install
```

## Run Tests

```bash
# All tests (recommended)
npm test

# Individual tests
npm run test:workflows    # Validate workflow structure
npm run test:schemas      # Validate JSON schemas
npm run test:models       # Check model consistency

# Quick test (skip schema validation)
npm run test:quick
```

## What Gets Validated

### ✅ Workflow Validation (`validate-workflows.js`)
- Valid JSON syntax
- N8N workflow structure (name, nodes, connections)
- Node integrity (id, name, type, position, parameters)
- Connection validity (all connections point to existing nodes)
- No duplicate node IDs
- Credential naming consistency

### ✅ Schema Validation (`validate-schemas.js`)
- JSON Schema Draft 7 compliance
- Schema compilation succeeds
- Sample data passes validation
- Format validators (email, uuid, date-time)

### ✅ Model Consistency (`check-model-consistency.js`)
- All LLM models use approved identifiers:
  - `claude-sonnet-4-20250514` (primary)
  - `gpt-4o` (fallback)
  - `gpt-4o-mini` (secondary fallback)
  - `llama3.2:latest` (local Ollama)
  - `mistral:latest` (local Ollama)
- Model usage analytics
- Detects unapproved models

## Exit Codes

- `0` = Success (safe to commit/deploy)
- `1` = Failures found (fix before committing)

## Example Output

```
✓ Workflow Validation
  Workflows validated: 14
  ✓ All workflows are valid!

✓ Model Consistency
  Workflow files scanned: 13
  Total model references: 23
  ✓ All model references follow the approved strategy!
```

## Pre-commit Hook

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
cd foam-n8n-implementation/tests && npm run test:quick
if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Fix errors before committing."
    exit 1
fi
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Install test dependencies
  run: cd foam-n8n-implementation/tests && npm install
- name: Run validation tests
  run: cd foam-n8n-implementation/tests && npm test
```

## Troubleshooting

**"No workflow files found"**
→ Make sure you're in the tests/ directory and workflows/ exists at parent level

**Module errors**
→ Run `npm install` in the tests directory

**Schema validation failures**
→ Check that sample data in validate-schemas.js matches your schema definitions

## Files

```
tests/
├── validate-workflows.js       # Workflow validator (11KB)
├── validate-schemas.js         # Schema validator (12KB)
├── check-model-consistency.js  # Model validator (9KB)
├── run-all-tests.js           # Test runner (4KB)
├── package.json               # Dependencies
├── README.md                  # Full documentation
├── QUICK_START.md            # This file
└── TEST_SUITE_SUMMARY.md     # Implementation details
```

## Need Help?

See **README.md** for comprehensive documentation including:
- Detailed validation rules
- Adding new test cases
- CI/CD examples
- Common issues and solutions
