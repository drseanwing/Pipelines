# CLAUDE.md - Agent Instructions

## Project Overview
[Brief description of the project, its purpose, and key technologies]

## Tech Stack
- **Language:** [e.g., Python 3.11+, Node.js 20+, PHP 8.2+]
- **Framework:** [e.g., FastAPI, Next.js, Laravel]
- **Database:** [e.g., PostgreSQL, MySQL, SQLite]
- **Infrastructure:** Docker, [cloud provider if applicable]

## Development Standards

### Code Style
- Follow [language-specific style guide, e.g., PEP 8, PSR-12, Airbnb]
- Maximum line length: 120 characters
- Use meaningful variable/function names (no abbreviations except common ones)
- All functions require docstrings/JSDoc comments

### Logging Requirements
- Use structured logging (JSON format preferred)
- Log to external files in `/var/log/app/` or `./logs/`
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Include correlation IDs for request tracing
- Never log sensitive data (credentials, PII, tokens)

### Error Handling
- Implement graceful degradation for all external dependencies
- Use custom exception classes for domain-specific errors
- Always provide meaningful error messages
- Include retry logic with exponential backoff for network operations
- Log all errors with full context (stack trace, request details)

### Testing Requirements
- Minimum 80% code coverage for new code
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user journeys

## File Naming Conventions
- Python: `snake_case.py`
- JavaScript/TypeScript: `camelCase.ts` or `kebab-case.ts` (be consistent)
- CSS/SCSS: `kebab-case.scss`
- Tests: `*.test.ts`, `*_test.py`, `*.spec.ts`

## Git Workflow
- Branch naming: `feature/`, `bugfix/`, `hotfix/`, `chore/`, `docs/`
- Commit messages: Conventional Commits format
- Always rebase before merging
- Squash commits on merge to main

## Key Files
- `docker/docker-compose.yml` - Local development environment
- `docs/ARCHITECTURE.md` - System architecture documentation
- `.env.example` - Required environment variables
- `TASKS.md` - Current project tasks and progress

## Prohibited Actions
- Do not commit secrets or credentials
- Do not modify CI/CD workflows without explicit approval
- Do not remove or weaken security configurations
- Do not bypass pre-commit hooks

## Common Commands
```bash
# Development
docker compose -f docker/docker-compose.yml up -d
./scripts/setup.sh

# Testing
./scripts/test.sh
docker compose exec app pytest --cov

# Linting
pre-commit run --all-files
```
