# Contributing Guide

## Prerequisites

- Node.js 20+ (use `.nvmrc`: `nvm use`)
- pnpm 9+ (`npm install -g pnpm`)
- Docker 25+ with Compose V2

## Getting Started

```bash
# Clone and install
git clone <repo-url>
cd Pipelines
pnpm install

# Build all packages
pnpm build:packages

# Run all tests
pnpm test:packages

# Start development infrastructure
cd infrastructure/docker
cp .env.example .env
# Edit .env with real values
docker compose up -d
```

## Project Structure

```
Pipelines/
├── apps/                    # Application codebases
│   ├── foam/               # Medical education content (JS/n8n)
│   ├── researchplanner/    # QI research pipeline (TypeScript)
│   ├── critlit/            # Systematic literature review (JS/n8n)
│   └── ralph/              # CLI agent tool
├── packages/core/          # Shared packages (@pipelines/*)
│   ├── config/            # Typed config loading
│   ├── logging/           # Structured JSON logging
│   ├── retry/             # Exponential backoff
│   ├── validation/        # Zod schema validation
│   ├── database/          # PostgreSQL connection pool
│   ├── llm-client/        # Multi-provider LLM client
│   ├── checkpoint/        # Quality gate state machine
│   ├── n8n-utils/         # N8N Code Node utilities
│   └── pubmed/            # PubMed API client
├── infrastructure/         # Docker, init-db, scripts
└── docs/                  # Architecture and operational docs
```

## Development Workflow

### Working on Core Packages

```bash
# Build a specific package
pnpm --filter @pipelines/retry build

# Run tests for a specific package
pnpm --filter @pipelines/retry test

# Watch mode
pnpm --filter @pipelines/retry test:watch
```

### Working on Applications

```bash
# Build researchplanner (includes core deps)
pnpm --filter qi-research-pipeline build

# Run researchplanner tests
pnpm --filter qi-research-pipeline test

# Dev mode
pnpm --filter qi-research-pipeline dev
```

### Creating a New Core Package

1. Create directory under `packages/core/<name>/`
2. Add `package.json` with `@pipelines/<name>` naming
3. Add `tsconfig.json` with `"composite": true`
4. Add `src/index.ts` and `src/index.test.ts`
5. Add to root `tsconfig.json` references
6. Add to `pnpm-workspace.yaml` if needed

## Code Standards

### TypeScript
- Target: ES2022
- Module: ES2022 with bundler resolution
- Strict mode enabled
- No implicit any, returns, or fall-through

### Testing
- Framework: Vitest
- Minimum coverage: 80% for new code
- Unit tests for all business logic
- Test files: `*.test.ts` alongside source

### Commit Convention
- Format: Conventional Commits
- Prefix: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Scope: optional, use package name (e.g., `feat(retry): add jitter config`)

## Branch Strategy

- `master` - Production-ready code
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `chore/*` - Maintenance tasks

## Pull Request Process

1. Create feature branch from `master`
2. Make changes, ensure tests pass
3. Push and create PR
4. CI runs automatically (build, test, lint, security)
5. Review required before merge
6. Squash merge to `master`
