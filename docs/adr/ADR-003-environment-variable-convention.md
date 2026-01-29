# ADR-003: Namespaced Environment Variable Convention

## Status
Accepted

## Date
2026-01-30

## Context
Consolidating four projects into one Docker Compose deployment creates environment variable naming conflicts. Each project currently defines its own variables independently.

## Decision
Use **project-prefixed environment variables** with the following convention:

### Shared Infrastructure (no prefix)
- `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`
- `REDIS_URL`
- `OLLAMA_URL`
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

### Per-Project Variables
| Prefix | Project | Example |
|--------|---------|---------|
| `FOAM_` | foam | `FOAM_N8N_USER`, `FOAM_N8N_PASSWORD`, `FOAM_N8N_ENCRYPTION_KEY` |
| `QI_` | researchplanner | `QI_N8N_USER`, `QI_DB_SCHEMA`, `QI_JWT_SECRET` |
| `SLR_` | critlit | `SLR_N8N_USER`, `SLR_N8N_ENCRYPTION_KEY`, `SLR_N8N_API_KEY` |

### Naming Rules
1. ALL CAPS with underscores
2. Project prefix first: `{PROJECT}_{SERVICE}_{PROPERTY}`
3. Shared infrastructure variables have NO prefix
4. Boolean values: `true`/`false` (lowercase)
5. Port variables: `{PROJECT}_{SERVICE}_PORT`

## Rationale
- **No Conflicts**: Prefix guarantees uniqueness across all projects
- **Discoverability**: `grep QI_ .env` finds all researchplanner variables
- **Docker Compose**: Easy to pass project-specific vars to specific services
- **Consistency**: Single pattern for all current and future projects

## Consequences
- Existing projects must update their environment variable references
- `.env.example` must document all variables with descriptions
- Docker Compose services need explicit environment mapping from prefixed vars to service-expected vars
