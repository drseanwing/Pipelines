# Architecture

## System Overview

The Pipeline Orchestrator is a monorepo consolidating four medical research pipeline applications that share common infrastructure, utilities, and operational patterns.

### Applications

| App | Purpose | Technology | Port Range |
|-----|---------|-----------|------------|
| FOAM | Medical education content generation | JavaScript, N8N | 5815-5819 |
| ResearchPlanner (QI) | QI research document automation | TypeScript, Express | 5820-5829 |
| CritLit (SLR) | Systematic literature review | JavaScript, N8N | 5830-5839 |
| Ralph | CLI coding agent | JavaScript | N/A |

### Shared Infrastructure

| Service | Purpose | Port | Image |
|---------|---------|------|-------|
| PostgreSQL | Shared database with per-project schemas | 5810 | pgvector/pgvector:pg16 |
| Redis | Queue backend for N8N instances | 5811 | redis:7-alpine |
| Ollama | Local LLM inference | 5812 | ollama/ollama:latest |

### Core Packages

```
@pipelines/config      → Typed config loading from env vars (Zod)
@pipelines/logging     → Structured JSON logging with stage lifecycle
@pipelines/retry       → Exponential backoff with jitter and error classification
@pipelines/validation  → Schema validation with JSON Schema export
@pipelines/database    → PostgreSQL pool, transactions, schema isolation
@pipelines/llm-client  → Multi-provider LLM abstraction (Claude primary)
@pipelines/checkpoint  → Quality gate state machine (approve/reject)
@pipelines/n8n-utils   → N8N Code Node helpers and prompt templates
@pipelines/pubmed      → PubMed eSearch/eFetch with rate limiting
```

## Dependency Graph

```
config (standalone)
validation (standalone, uses zod)
logging (standalone)
retry (standalone)
database (uses pg)
llm-client (uses @anthropic-ai/sdk, zod)
checkpoint (standalone)
n8n-utils (standalone)
pubmed (standalone, uses native fetch)
```

## Data Flow

### PostgreSQL Schema Isolation
```
pipelines (database)
├── foam (schema)         ← FOAM app data
├── qi (schema)           ← ResearchPlanner app data
├── slr (schema)          ← CritLit app data
├── foam_n8n (schema)     ← FOAM N8N internal metadata
├── qi_n8n (schema)       ← QI N8N internal metadata
└── slr_n8n (schema)      ← SLR N8N internal metadata
```

### Redis Queue Isolation
```
Redis DB 0 (prefix: foam)  ← FOAM N8N queue
Redis DB 1 (prefix: qi)    ← QI N8N queue
Redis DB 2 (prefix: slr)   ← SLR N8N queue
```

## Network Topology

```
┌─────────────────────────────────────────────────────────┐
│                    pipelines-shared                       │
│  ┌──────────┐  ┌───────┐  ┌────────┐                   │
│  │ postgres │  │ redis │  │ ollama │                    │
│  └──────────┘  └───────┘  └────────┘                    │
│  ┌──────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │
│  │ foam-n8n │  │ qi-n8n │  │ qi-app │  │ slr-n8n│     │
│  └──────────┘  └────────┘  └────────┘  └────────┘     │
└─────────────────────────────────────────────────────────┘

┌────────────────┐  ┌───────────────┐  ┌────────────────────┐
│ foam-internal  │  │ qi-internal   │  │ slr-internal       │
│ └─ foam-n8n    │  │ └─ qi-n8n     │  │ ├─ slr-n8n         │
│                │  │ └─ qi-app     │  │ ├─ slr-n8n-worker   │
│                │  │               │  │ ├─ slr-n8n-mcp      │
│                │  │               │  │ └─ i-librarian       │
└────────────────┘  └───────────────┘  └────────────────────┘
```

## Architecture Decision Records

| ADR | Decision | Status |
|-----|----------|--------|
| [ADR-001](adr/ADR-001-separate-n8n-instances.md) | Separate N8N instances per project | Accepted |
| [ADR-002](adr/ADR-002-single-postgresql-with-schemas.md) | Single PostgreSQL with per-project schemas | Accepted |
| [ADR-003](adr/ADR-003-environment-variable-convention.md) | Namespaced environment variables | Accepted |
