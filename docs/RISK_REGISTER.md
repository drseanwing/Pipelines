# Risk Register

## Critical Risks

| ID | Risk | Severity | Likelihood | Mitigation | Status |
|----|------|----------|------------|------------|--------|
| R1 | GPU access in rootless Docker for Ollama | Critical | Very Likely | Run Ollama as host service or use CDI in Docker 25.0+ | Open |
| R2 | PostgreSQL version fragmentation (14/15/16) | Critical | Very Likely | Standardize on pgvector/pg16 (superset) | Mitigated |
| R3 | Schema namespace collisions | Critical | Very Likely | Per-project schemas (foam/qi/slr) | Mitigated |
| R4 | Healthcare data governance | Critical | Very Likely | Privacy Impact Assessment required | Open |
| R5 | N8N credential encryption key management | Critical | Likely | Backup keys before migration; Docker secrets | Open |

## High Risks

| ID | Risk | Severity | Likelihood | Mitigation | Status |
|----|------|----------|------------|------------|--------|
| R6 | Redis queue conflicts | High | Very Likely | Distinct QUEUE_BULL_REDIS_DB per project | Mitigated |
| R7 | Volume permissions in rootless Docker | High | Likely | Explicit user: directives; verify PGDATA | Open |
| R8 | Service startup cascade failures | High | Very Likely | Health checks; startup orchestration | Open |
| R9 | CI/CD is Python-only | High | Very Likely | Rewrite CI with Node.js matrix builds | Open |
| R10 | Secret management across projects | High | Very Likely | Namespaced env vars; Docker secrets | Mitigated |
| R11 | Migration rollback gap | High | Likely | Unified migration tool; down-migrations | Open |
| R12 | Resource contention (20-40GB RAM) | High | Likely | Capacity planning; share services | Open |

## Medium Risks

| ID | Risk | Severity | Likelihood | Mitigation | Status |
|----|------|----------|------------|------------|--------|
| R13 | Network isolation | Medium | Possible | Per-project networks; internal:true | Mitigated |
| R14 | Log aggregation complexity | Medium | Likely | Standardize JSON format; log rotation | Open |
| R15 | N8N MCP wrong instance | Medium | Possible | Project-specific service names | Mitigated |
| R16 | TypeScript config divergence | Medium | Possible | TS project references | Mitigated |
| R17 | npm version conflicts | Medium | Possible | pnpm workspaces strict isolation | Mitigated |
