# FOAM N8N Test Suite

Comprehensive validation suite for the FOAM N8N implementation. These tests ensure workflow integrity, schema compliance, and model consistency across the entire project.

## Quick Start

```bash
# Install dependencies
cd tests
npm install

# Run all tests
npm test

# Run individual tests
npm run validate-workflows
npm run validate-schemas
npm run check-models

# Quick test (skip schema validation)
npm run test:quick
```

## Test Scripts

### 1. `validate-workflows.js`

Validates all N8N workflow JSON files for structural integrity and consistency.

**What it checks:**
- ✅ Valid JSON syntax
- ✅ Required N8N workflow properties (name, nodes, connections)
- ✅ Node structure (id, name, type, typeVersion, position, parameters)
- ✅ Connection integrity (all connections reference existing nodes)
- ✅ No duplicate node IDs within a workflow
- ✅ Credential consistency (warns if multiple credential names used for same type)

**Exit codes:**
- `0` - All workflows valid
- `1` - Validation errors found

**Example output:**
```
N8N Workflow Validator

Scanning directory: /path/to/foam-n8n-implementation

Found 14 workflow file(s)

Validating: orchestrator.json
  ✓ Valid workflow structure

Validating: case-based.json
  ✓ Valid workflow structure

==========================================================
VALIDATION RESULTS
==========================================================

Workflows validated: 14
✓ All workflows are valid!
```

### 2. `validate-schemas.js`

Validates JSON schema files using Ajv and tests sample data against schemas.

**What it checks:**
- ✅ Valid JSON syntax
- ✅ Valid JSON Schema format (Draft 7)
- ✅ Schema compilation succeeds
- ✅ Sample valid data passes validation
- ✅ Sample invalid data correctly fails validation

**Schemas tested:**
- `topic-request.schema.json` - Incoming content requests
- `draft-content.schema.json` - Generated draft content
- `evidence-package.schema.json` - Evidence search results
- `review-request.schema.json` - Peer review requests

**Exit codes:**
- `0` - All schemas valid and tests pass
- `1` - Validation errors found

**Example output:**
```
JSON Schema Validator

Scanning directory: /path/to/foam-n8n-implementation

Found 4 schema file(s)

Validating schema: topic-request.schema.json
  ✓ Valid JSON Schema
Testing samples: topic-request.schema.json
  ✓ Valid sample passes
  ✓ Invalid sample 1 correctly rejected: Missing required field: format
  ✓ Invalid sample 2 correctly rejected: Invalid format value

==========================================================
SCHEMA VALIDATION RESULTS
==========================================================

Schemas validated: 4
Sample tests run: 12
✓ All schemas are valid!
```

### 3. `check-model-consistency.js`

Validates that all LLM model references follow the documented model strategy.

**What it checks:**
- ✅ All model references use approved model identifiers
- ✅ Consistency across workflows
- ⚠️ Warns about model variants (e.g., `llama3.2` vs `llama3.2:latest`)
- ❌ Errors on unapproved/unknown models

**Approved models:**
- `claude-sonnet-4-20250514` - Primary Claude model
- `gpt-4o` - Primary GPT-4 fallback
- `gpt-4o-mini` - Secondary GPT-4 fallback
- `llama3.2:latest` - Ollama Llama
- `mistral:latest` - Ollama Mistral

**Exit codes:**
- `0` - All models follow approved strategy
- `1` - Unapproved models found

**Example output:**
```
LLM Model Consistency Checker

Scanning directory: /path/to/foam-n8n-implementation

==========================================================
APPROVED MODEL STRATEGY
==========================================================

Claude:
  claude-sonnet-4-20250514
  Use for: Primary LLM tasks, content generation

GPT-4o:
  gpt-4o
  Use for: Fallback when Claude fails

...

==========================================================
MODEL USAGE ANALYSIS
==========================================================

✓ claude-sonnet-4-20250514 (claude)
  Used 12 time(s) across 3 file(s)
    - case-based.json > Claude for Decision Points
    - case-based.json > Claude for Vignette
    ...

==========================================================
VALIDATION RESULTS
==========================================================

Workflow files scanned: 14
Unique models found: 2
Total model references: 15
✓ All model references follow the approved strategy!
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Validate N8N Workflows

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd tests && npm install

      - name: Run tests
        run: cd tests && npm test
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

cd tests
npm run test:quick

if [ $? -ne 0 ]; then
    echo "❌ Validation failed! Please fix errors before committing."
    exit 1
fi
```

## Common Issues and Solutions

### Issue: "No workflow files found"
**Solution:** Make sure you're running from the `tests/` directory, or check that `workflows/` directory exists at parent level.

### Issue: "ajv is not defined" or module errors
**Solution:** Run `npm install` in the tests directory to install dependencies.

### Issue: Schema validation fails on valid data
**Solution:** Check that the schema file uses Draft 7 format and all referenced formats are supported by `ajv-formats`.

### Issue: Model warnings about variants
**Solution:** Update workflow to use the exact approved model identifier (e.g., use `llama3.2:latest` instead of `llama3.2`).

## Adding New Test Cases

### Add Schema Sample Data

Edit `validate-schemas.js` and add to the `getSampleData()` method:

```javascript
'my-new.schema.json': {
  valid: {
    // Your valid sample data
  },
  invalid: [
    {
      description: 'What makes this invalid',
      data: {
        // Your invalid sample data
      }
    }
  ]
}
```

### Add Model Approval

Edit `check-model-consistency.js` and update the `APPROVED_MODELS` object:

```javascript
const APPROVED_MODELS = {
  // ... existing models ...
  'new-model': 'model-identifier-here'
};
```

## Development

### Running in Verbose Mode

All scripts output detailed information by default. For even more detail during development:

```bash
# Run with Node inspector
node --inspect validate-workflows.js

# Run with debugging output (if implemented)
DEBUG=* node validate-workflows.js
```

### Testing Individual Files

```bash
# Modify scripts to accept file path argument (future enhancement)
node validate-workflows.js ../workflows/orchestrator.json
```

## Continuous Improvement

These tests should evolve with the project:

1. **Add new validations** as patterns emerge
2. **Update sample data** to cover edge cases
3. **Extend model checking** for new LLM providers
4. **Add performance benchmarks** for large workflows

## License

MIT - Part of the FOAM N8N Implementation project
