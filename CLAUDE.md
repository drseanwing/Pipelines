# CLAUDE.md - Agent Instructions

## Project Overview
Pipeline Orchestrator - a monorepo consolidating four medical research pipeline applications (FOAM, ResearchPlanner, CritLit, Ralph) with shared infrastructure, core packages, and unified deployment.

## Tech Stack
- **Language:** TypeScript 5.7+ (ESM), JavaScript (N8N Code Nodes)
- **Framework:** Express (ResearchPlanner), N8N (FOAM/CritLit), Node CLI (Ralph)
- **Database:** PostgreSQL 16 with pgvector (single instance, per-project schemas)
- **Infrastructure:** Docker Compose, Redis 7, Ollama, Prometheus/Grafana
- **Package Manager:** pnpm 9+ with workspaces

## Development Standards

### Code Style
- TypeScript: ES2022 target, bundler module resolution, strict mode
- Maximum line length: 120 characters
- Use meaningful variable/function names
- All public functions require JSDoc comments

### Logging Requirements
- Use @pipelines/logging for structured JSON logging
- Log levels: debug, info, warn, error
- Include stage lifecycle events (stageStart, stageComplete, stageFailed)
- Never log sensitive data (API keys, credentials, PII)

### Error Handling
- Use @pipelines/retry for exponential backoff with jitter
- Classify errors as transient/permanent via classifyError()
- Sanitize error messages to prevent API key leakage
- Always provide meaningful error context

### Testing Requirements
- Framework: Vitest
- Minimum 80% code coverage for new code
- Unit tests for all business logic
- Test files: `*.test.ts` alongside source

## File Naming Conventions
- TypeScript: `camelCase.ts` (packages) or `kebab-case.ts` (apps)
- Tests: `*.test.ts`
- Config: `*.config.ts` or `*.config.js`

## Git Workflow
- Branch naming: `feature/`, `bugfix/`, `hotfix/`, `chore/`, `docs/`
- Commit messages: Conventional Commits format
- Squash commits on merge to master

## Key Files
- `infrastructure/docker/docker-compose.yml` - Unified Docker infrastructure
- `infrastructure/docker/.env.example` - Required environment variables
- `docs/ARCHITECTURE.md` - System architecture documentation
- `docs/RUNBOOK.md` - Operational procedures
- `docs/CONTRIBUTING.md` - Development workflow
- `MONOREPO_PLAN.md` - Implementation plan and progress

## Prohibited Actions
- Do not commit secrets or credentials
- Do not modify CI/CD workflows without explicit approval
- Do not bypass pre-commit hooks
- Do not add phantom dependencies (declared but unused)
- Do not use greedy regex for JSON extraction

## Common Commands
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Test all packages
pnpm test:packages

# Lint
pnpm lint

# Docker infrastructure
cd infrastructure/docker
cp .env.example .env  # Edit with real values
docker compose up -d
```
