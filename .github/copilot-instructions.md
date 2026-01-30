# Copilot AI Agent Instructions for Pipelines Monorepo

## Monorepo Overview

This monorepo contains four major medical research pipeline applications:
- **FOAM**: Clinical review and medical writing automation
- **ResearchPlanner**: QI/research project automation (Express, Claude API, n8n)
- **CritLit**: Autonomous systematic literature review (n8n, multi-agent, PRISMA 2020)
- **Ralph**: Minimal file-based agent loop for autonomous coding (CLI, agent runner)

Shared infrastructure includes PostgreSQL 16+ (with pgvector), Redis, Ollama, and Docker Compose. Core logic and utilities are in `packages/core/`.

## Architecture & Patterns

- **Service Boundaries**: Each app is isolated in `apps/`, sharing core packages via pnpm workspaces.
- **Data Flow**: PostgreSQL is the central state store. Vector search via pgvector. n8n orchestrates multi-agent workflows (CritLit, FOAM).
- **Agent Loops**: Ralph and CritLit use coordinator/sub-agent patterns. Ralph uses file-based PRD JSONs and `.ralph/` state; CritLit uses n8n and PostgreSQL for checkpoints and recovery.
- **Logging**: Use `@pipelines/logging` for structured JSON logs. Never log secrets or PII.
- **Testing**: Use Vitest for TypeScript, `npm test` for Ralph, and workflow-specific scripts for CritLit/ResearchPlanner.

## Developer Workflows

- **Build/Run**: Use `pnpm install` at root. Each app has its own `README.md` for start/test commands. Docker Compose is used for local orchestration.
- **Testing**: Run `pnpm test` at root for all packages. For Ralph: `npm test`, `npm run test:ping`, `npm run test:real`.
- **Database**: All schemas auto-migrate on startup via `init-scripts/` in each app. Use `./scripts/verify-*.sh` to check service health.
- **Environment**: Copy `.env.example` to `.env` in each app and fill required secrets. See each app's README for details.

## Project-Specific Conventions

- **TypeScript**: ES2022, strict mode, max 120 chars/line. Public functions require JSDoc. Test files: `*.test.ts` next to source.
- **Python (CritLit)**: Async DB/API, use `structlog`, all public classes/functions documented. See CritLit copilot-instructions for naming/database patterns.
- **n8n**: Workflows and nodes use descriptive, title-case names. All workflow state is checkpointed in PostgreSQL.
- **Ralph**: Templates in `.agents/ralph/`, state in `.ralph/`. Agent runner set via `.agents/ralph/config.sh` (`AGENT_CMD`).

## Integration Points

- **LLMs**: Ollama (local), Claude, OpenAI (cloud) for CritLit/ResearchPlanner
- **External APIs**: PubMed, Unpaywall, I-Librarian, UQ Primo
- **Vector Search**: pgvector (HNSW)
- **Orchestration**: n8n (CritLit, FOAM), Express (ResearchPlanner), CLI (Ralph)

## Key Files & Directories

- `apps/critlit/.github/copilot-instructions.md`: CritLit-specific agent guidance
- `apps/ralph/README.md`, `AGENTS.md`: Ralph agent loop, skills, and CLI
- `apps/researchplanner/README.md`: ResearchPlanner architecture, API, and workflow
- `CLAUDE.md`: Monorepo-wide agent and coding standards
- `packages/core/`: Shared logic/utilities
- `infrastructure/`: Docker, DB, and infra scripts

## Examples
- To run CritLit: `cd apps/critlit && ./start.sh`
- To run Ralph: `cd apps/ralph && npm test`
- To run ResearchPlanner: `cd apps/researchplanner && npm run dev`

---
For app-specific agent instructions, see the corresponding `copilot-instructions.md` or `README.md` in each app directory.
