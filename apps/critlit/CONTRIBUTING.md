# Contributing to CritLit

Thank you for your interest in contributing to CritLit! This guide will help you get started with development, testing, and submitting your contributions.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)
- [Pull Request Process](#pull-request-process)
- [License](#license)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Git** installed and configured
- **Docker Desktop** (v20.10+) with Docker Compose (v2.0+)
- **16GB RAM minimum** (32GB recommended)
- **50GB free disk space**
- A **GitHub account**
- Required API keys (see [README.md](README.md) for details)

### Fork the Repository

1. Navigate to [https://github.com/drseanwing/CritLit](https://github.com/drseanwing/CritLit)
2. Click the **Fork** button in the top-right corner
3. Clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/CritLit.git
cd CritLit
```

4. Add the upstream repository as a remote:

```bash
git remote add upstream https://github.com/drseanwing/CritLit.git
git remote -v
```

## Development Setup

### 1. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your development credentials
# Windows: notepad .env
# Mac/Linux: nano .env
```

**Development-specific configuration:**

- Use `N8N_USER=dev` and a simple password for local testing
- Generate `N8N_ENCRYPTION_KEY` with: `openssl rand -base64 32`
- Add your API keys (required for testing workflows)

### 2. Start Services

```bash
# Start all services
./scripts/startup.sh

# OR manually:
docker compose up -d

# Verify all services are healthy
docker compose ps
```

### 3. Verify Installation

```bash
# Run verification scripts
bash scripts/verify-postgres.sh
bash scripts/verify-ollama.sh
bash scripts/verify-vector.sh
```

### 4. Access Development Interface

- **n8n Workflow UI**: http://localhost:5678
- **i-Librarian**: http://localhost:8080
- **PostgreSQL**: localhost:5432 (use database client of choice)

## Project Structure

Understanding the project layout will help you navigate the codebase:

```
CritLit/
├── docker-compose.yml          # Service orchestration
├── .env.example                # Environment template
├── README.md                   # User documentation
├── CONTRIBUTING.md             # This file
├── Specifications.md           # Project requirements
│
├── init-scripts/               # PostgreSQL initialization (run on first start)
│   ├── 000-init.sql            # Master script (documentation)
│   ├── 001-extensions.sql      # pgvector, pg_trgm setup
│   ├── 002-reviews.sql         # Core SLR tables
│   ├── 003-search-executions.sql
│   ├── 004-documents.sql       # Article metadata
│   ├── 005-document-embeddings.sql  # Vector storage
│   ├── 006-hnsw-index.sql      # Similarity search index
│   ├── 007-screening-decisions.sql
│   ├── 008-workflow-state.sql
│   ├── 009-audit-log.sql
│   ├── 010-prisma-flow.sql
│   ├── 011-text-search-config.sql   # Medical/scientific tokenization
│   ├── 012-fulltext-index.sql
│   └── 013-trigram-index.sql   # Fuzzy matching
│
├── scripts/                    # Utility scripts
│   ├── startup.sh              # Orchestrated startup with health checks
│   ├── verify-postgres.sh      # Database verification
│   ├── verify-ollama.sh        # Ollama GPU check
│   └── verify-vector.sh        # Vector extension check
│
├── workflows/                  # n8n workflow templates
│   ├── prompts/                # AI prompts for screening
│   └── utils/                  # Workflow utilities
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # System architecture
│   ├── USER_GUIDE.md           # User documentation
│   ├── QUICKSTART.md           # Quick start guide
│   ├── LIMITATIONS.md          # Known limitations
│   ├── checkpoint-schema.md    # Checkpoint system
│   └── n8n-credentials-setup.md # API credential setup
│
└── tests/                      # Integration tests
    └── test-data/              # Sample data for testing
```

### Key Directories

| Directory | Purpose | When to Modify |
|-----------|---------|----------------|
| `init-scripts/` | Database schema and initialization | Adding new tables, indexes, or database features |
| `scripts/` | Utility and verification scripts | Adding new deployment or verification steps |
| `workflows/` | n8n workflow templates | Creating new SLR automation workflows |
| `docs/` | Documentation | Improving user guides or architecture docs |
| `tests/` | Integration tests | Adding test cases for new features |

## Making Changes

### 1. Create a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# OR for bug fixes:
git checkout -b fix/issue-description
```

### 2. Make Your Changes

Follow the [Code Style Guidelines](#code-style-guidelines) below.

### 3. Test Your Changes

Run all relevant tests before committing (see [Testing](#testing)).

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "Add feature: Brief description of change

- Detailed point about what changed
- Why it changed
- Any relevant context"
```

**Commit message conventions:**
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issue numbers when applicable: `Fixes #123`

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Submit a Pull Request

See [Pull Request Process](#pull-request-process) below.

## Code Style Guidelines

### SQL Conventions

**Database schema files (`init-scripts/*.sql`):**

```sql
-- Use uppercase for SQL keywords
CREATE TABLE table_name (
    id SERIAL PRIMARY KEY,
    column_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Include comments explaining purpose
-- Use snake_case for table and column names
-- Add NOT NULL constraints where appropriate
-- Always include created_at/updated_at timestamps
```

**Formatting standards:**
- Indent with 4 spaces (not tabs)
- Uppercase SQL keywords (`SELECT`, `FROM`, `WHERE`, `CREATE TABLE`)
- Snake_case for identifiers (`document_id`, `screening_decision`)
- Include header comments explaining script purpose
- Use `BEGIN;` and `COMMIT;` for transactions
- Add `IF NOT EXISTS` where appropriate

### JavaScript Conventions

**n8n workflow code and utilities:**

```javascript
// Use const/let, not var
const apiKey = process.env.ANTHROPIC_API_KEY;

// Use descriptive variable names
const screeningDecision = evaluateInclusion(document);

// Add JSDoc comments for functions
/**
 * Evaluates whether a document meets inclusion criteria
 * @param {Object} document - The document to evaluate
 * @returns {boolean} True if document should be included
 */
function evaluateInclusion(document) {
    // Implementation
}
```

**Standards:**
- Use ES6+ syntax (arrow functions, destructuring, template literals)
- Use `async/await` instead of raw promises
- Add error handling with try/catch
- Use descriptive variable names (no single-letter variables except loop counters)
- Add comments explaining complex logic

### n8n Workflow Conventions

**Workflow design principles:**

1. **Node naming**: Use descriptive names (`Extract PubMed IDs`, not `HTTP Request 1`)
2. **Error handling**: Add error-handling branches for all external API calls
3. **Credentials**: Use n8n credential system, never hardcode API keys
4. **Documentation**: Add sticky notes explaining complex workflow sections
5. **Checkpointing**: Save intermediate results to database for crash recovery

**Workflow structure:**
```
Trigger → Validate Input → Process Data → Handle Errors → Save Results → Notify
```

### Bash Script Conventions

**Shell scripts (`scripts/*.sh`):**

```bash
#!/usr/bin/env bash
set -e  # Exit on error

# Use descriptive variable names in UPPERCASE
MAX_WAIT=60
ELAPSED=0

# Add comments explaining what each section does
# Check if PostgreSQL is responding
while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Implementation
done

# Use color codes for output (see startup.sh for examples)
echo -e "${GREEN}✓${NC} Service is healthy"
```

**Standards:**
- Start with `#!/usr/bin/env bash` shebang
- Use `set -e` to exit on errors
- Quote variables: `"$VARIABLE"` not `$VARIABLE`
- Add header comments explaining script purpose
- Use meaningful exit codes (0 = success, non-zero = error)

## Testing

### Running Integration Tests

```bash
# Run all tests
bash tests/integration-test.sh

# Expected output: All checks pass with ✓ symbols
```

### Adding New Tests

When adding new features, include tests in `tests/`:

```bash
# Create a new test file
touch tests/test-feature-name.sh
chmod +x tests/test-feature-name.sh

# Add test logic (see existing tests for examples)
```

**Test structure:**
```bash
#!/usr/bin/env bash
set -e

echo "Testing feature XYZ..."

# Setup (if needed)
# Perform test operation
# Verify expected outcome
# Cleanup

echo "✓ Test passed"
```

### Manual Testing Checklist

Before submitting a PR, manually verify:

- [ ] All Docker services start successfully
- [ ] Database migrations apply without errors
- [ ] n8n workflows can be imported and executed
- [ ] API integrations work with test credentials
- [ ] Documentation accurately reflects changes
- [ ] No new errors in service logs

### Testing Database Changes

```bash
# Reset database to test initialization scripts
docker compose down
docker volume rm critlit_postgres_data
docker compose up -d postgres

# Verify schema changes
bash scripts/verify-postgres.sh
```

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Environment details:**
   - Operating system (Windows/Mac/Linux)
   - Docker version (`docker --version`)
   - Available RAM and disk space

2. **Steps to reproduce:**
   - Exact commands run
   - Expected behavior
   - Actual behavior

3. **Logs:**
   ```bash
   # Include relevant logs
   docker compose logs postgres
   docker compose logs n8n
   ```

4. **Screenshots** (if applicable)

**Use this template:**

```markdown
**Bug Description:**
Brief description of the issue.

**Environment:**
- OS: Windows 11 / macOS 14 / Ubuntu 22.04
- Docker: v24.0.5
- RAM: 16GB

**Steps to Reproduce:**
1. Run `docker compose up -d`
2. Access n8n at http://localhost:5678
3. Import workflow X
4. Execute workflow

**Expected Behavior:**
Workflow should complete successfully.

**Actual Behavior:**
Workflow fails with error "XYZ".

**Logs:**
```
[Paste relevant log output]
```

**Screenshots:**
[Attach if applicable]
```

### Feature Requests

For feature requests, provide:

1. **Use case**: Why is this feature needed?
2. **Proposed solution**: How should it work?
3. **Alternatives considered**: What other approaches were considered?
4. **Impact**: How would this benefit the project?

## Pull Request Process

### Before Submitting

1. **Sync with upstream:**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run tests:**
   ```bash
   bash tests/integration-test.sh
   bash scripts/verify-postgres.sh
   ```

3. **Update documentation:**
   - Update `README.md` if user-facing features changed
   - Update relevant docs in `docs/`
   - Add comments to code where necessary

4. **Review your changes:**
   ```bash
   git diff main
   ```

### Submitting the PR

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to [https://github.com/drseanwing/CritLit/pulls](https://github.com/drseanwing/CritLit/pulls)

3. Click **New Pull Request**

4. Select your fork and branch

5. Fill out the PR template:

```markdown
## Description
Brief description of changes.

## Related Issue
Fixes #123 (if applicable)

## Changes Made
- Added feature X
- Modified Y to support Z
- Updated documentation

## Testing Performed
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Database migrations verified
- [ ] Workflow imports successfully

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Commits are descriptive
```

### PR Review Process

1. **Automated checks**: GitHub Actions will run automated tests
2. **Code review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, maintainers will merge your PR

**What reviewers look for:**
- Code quality and style adherence
- Test coverage
- Documentation completeness
- Backward compatibility
- Security considerations (no hardcoded credentials, SQL injection prevention)

### After Your PR is Merged

1. **Update your fork:**
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

2. **Delete your feature branch:**
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

## Development Tips

### Database Development

```bash
# Connect to PostgreSQL for interactive queries
docker exec -it slr_postgres psql -U slr_user -d slr_database

# View tables
\dt

# View table structure
\d+ documents

# Run a query
SELECT COUNT(*) FROM documents;
```

### n8n Workflow Development

1. Make changes in the n8n UI (http://localhost:5678)
2. Export workflow as JSON: **Menu → Download**
3. Save to `workflows/` directory
4. Add to git and commit

### Viewing Logs

```bash
# View logs for specific service
docker compose logs -f postgres
docker compose logs -f n8n
docker compose logs -f ollama

# View all logs
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100 postgres
```

### Debugging Database Issues

```bash
# Check database status
docker compose exec postgres pg_isready

# View running queries
docker exec -it slr_postgres psql -U slr_user -d slr_database -c "SELECT * FROM pg_stat_activity;"

# Check table sizes
docker exec -it slr_postgres psql -U slr_user -d slr_database -c "\dt+"
```

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help newcomers get started
- Follow the project's established patterns

## Getting Help

If you need help:

1. Check existing documentation in `docs/`
2. Search [existing issues](https://github.com/drseanwing/CritLit/issues)
3. Ask in a new issue with the `question` label
4. Review verification scripts in `scripts/` for diagnostic approaches

## License

By contributing to CritLit, you agree that your contributions will be licensed under the same license as the project (TBD - license to be determined).

---

**Thank you for contributing to CritLit!** Your efforts help advance systematic literature review automation for the research community.
