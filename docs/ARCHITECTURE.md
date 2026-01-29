# Architecture

## Overview

The Pipeline Orchestrator is a monorepo consolidating four medical research/education pipeline tools for Metro North Health / REdI (Resuscitation Education Initiative).

## System Components

### Applications
| App | Purpose | Key Tech |
|-----|---------|----------|
| foam | FOAM medical education content creation | N8N, Ollama, PostgreSQL |
| researchplanner | QI/Research document generation | Express, Claude SDK, PostgreSQL |
| critlit | Systematic Literature Review (PRISMA 2020) | N8N, pgvector, Redis, I-Librarian |
| ralph | Autonomous coding agent CLI | Node.js CLI, bash scripts |

### Shared Packages (@pipelines/*)
| Package | Purpose |
|---------|---------|
| @pipelines/config | Typed environment config with Zod validation |
| @pipelines/logging | Structured JSON logging |
| @pipelines/retry | Exponential backoff with jitter |
| @pipelines/validation | Zod schemas + JSON Schema for N8N |
| @pipelines/database | PostgreSQL connection pool and utilities |
| @pipelines/llm-client | Multi-provider LLM abstraction |
| @pipelines/checkpoint | Quality gate state machine |
| @pipelines/n8n-utils | N8N Code Node utilities |
| @pipelines/pubmed | PubMed API client |

### Infrastructure
- **PostgreSQL 16** (pgvector) - Unified database with per-project schemas
- **Redis 7** - Queue management and caching
- **Ollama** - Local LLM inference
- **N8N** - Workflow orchestration (separate instances per project)
- **Prometheus + Grafana** - Monitoring

## Data Flow
TODO: Add detailed data flow diagrams per application

## Network Topology
See [NETWORK_TOPOLOGY.md](./NETWORK_TOPOLOGY.md)

## Port Allocation
See [PORT_MAP.md](./PORT_MAP.md)
