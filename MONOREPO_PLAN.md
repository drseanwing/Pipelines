# Pipeline Orchestrator Monorepo - Implementation Plan

## Executive Summary

Four medical education and clinical research pipeline tools (foam, researchplanner, ralph, critlit) from Metro North Health / REdI are being consolidated into a monorepo. All share common infrastructure (N8N, PostgreSQL, Redis, LLM integration) and domain overlap (medical research pipelines). This plan covers the complete lifecycle from analysis through deployment in a Docker rootless environment with ports 5810-5850.

## 1. Architecture Analysis Summary

### 1.1 Codebase Profiles

| Project | Purpose | Stack | Services |
|---------|---------|-------|----------|
| **foam** | FOAM medical education content creation via multi-LLM orchestration | N8N workflows + JS utilities + JSON schemas + prompts | n8n, postgres:14, ollama |
| **researchplanner** | QI/Research pipeline for document generation (protocols, ethics, grants) | TypeScript/Node.js (ESM), Express API, Anthropic SDK, Zod, docx | n8n, postgres:15, redis, custom app |
| **ralph** | Autonomous coding agent loop (CLI tool) | Node.js CLI + bash shell scripts, file-based state | Docker optional, no services |
| **critlit** | Systematic Literature Review automation (PRISMA 2020) | N8N workflows + JS utilities + SQL schemas | pgvector/pg16, n8n+worker, redis, ollama, i-librarian |

### 1.2 Common Architecture Patterns Identified

9 extractable core modules identified from code duplication across projects:

1. **@pipelines/retry** - Exponential backoff with jitter (duplicated 4 times across all projects)
2. **@pipelines/llm-client** - Multi-provider LLM abstraction (Claude, OpenAI, Ollama)
3. **@pipelines/database** - PostgreSQL connection pool, transactions, BaseRepository, migrations
4. **@pipelines/checkpoint** - Quality gate/checkpoint state machine with approve/reject flows
5. **@pipelines/n8n-utils** - N8N Code Node error handling, stage lifecycle logging, prompt templates
6. **@pipelines/pubmed** - PubMed eSearch/eFetch API client with XML parsing (duplicated in researchplanner + critlit)
7. **@pipelines/validation** - Zod-based validation with JSON Schema generation for n8n compatibility
8. **@pipelines/logging** - Structured JSON logging with pipeline stage lifecycle events
9. **@pipelines/config** - Typed configuration from environment variables with validation

### 1.3 Key Duplication Evidence

| Pattern | foam | researchplanner | ralph | critlit |
|---------|------|-----------------|-------|---------|
| Retry with backoff | error-handler.js | llm/client.ts + db/connection.ts | (implicit in loop.sh) | rate-limiter.js |
| Error classification | error-handler.js | llm/client.ts | - | rate-limiter.js |
| JSON extraction from LLM | - | llm/client.ts | - | screening-utils.js |
| PubMed API | - | agents/research/pubmed.ts | - | pubmed-parser.js |
| Checkpoint/gates | quality-checkpoint.md | index.ts (approve/reject) | loop.sh (story status) | checkpoint-utils.js |
| Schema validation | schema-validator.js | Zod schemas | - | - |
| Structured logging | logging.js | utils/logger.ts | - | - |

## 2. Target Monorepo Structure

```
Pipelines/
├── packages/
│   └── core/
│       ├── retry/           # @pipelines/retry
│       ├── llm-client/      # @pipelines/llm-client
│       ├── database/        # @pipelines/database
│       ├── checkpoint/      # @pipelines/checkpoint
│       ├── n8n-utils/       # @pipelines/n8n-utils
│       ├── pubmed/          # @pipelines/pubmed
│       ├── validation/      # @pipelines/validation
│       ├── logging/         # @pipelines/logging
│       └── config/          # @pipelines/config
├── apps/
│   ├── foam/                # FOAM content creation
│   ├── researchplanner/     # QI Research Pipeline
│   ├── critlit/             # Systematic Literature Review
│   └── ralph/               # Autonomous coding agent
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml          # Full stack
│   │   ├── docker-compose.dev.yml      # Dev overrides
│   │   ├── docker-compose.monitoring.yml # Prometheus/Grafana
│   │   └── .env.example
│   ├── init-db/
│   │   ├── 00_common_extensions.sql
│   │   ├── 01_foam_schema.sql
│   │   ├── 02_qi_schema.sql
│   │   └── 03_slr_schema.sql
│   └── nginx/               # Reverse proxy config
├── .github/
│   └── workflows/
│       ├── ci.yml           # Monorepo CI pipeline
│       ├── security.yml     # CodeQL + dependency scanning
│       └── deploy.yml       # Docker deployment
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PORT_MAP.md
│   ├── NETWORK_TOPOLOGY.md
│   ├── RISK_REGISTER.md
│   └── DEPLOYMENT.md
├── package.json             # Root workspace config
├── pnpm-workspace.yaml      # Workspace definitions
├── tsconfig.json            # Root TS config with references
└── MONOREPO_PLAN.md         # This file
```

## 3. Port Allocation Map (5810-5850)

### Shared Infrastructure (5810-5814)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5810 | PostgreSQL (pgvector/pg16) | 5432 | Single instance, 3 schemas: foam, qi, slr |
| 5811 | Redis 7 Alpine | 6379 | Key-prefixed per app (foam:*, qi:*, slr:*) |
| 5812 | Ollama | 11434 | Shared GPU instance |
| 5813 | Prometheus | 9090 | Monorepo-wide metrics |
| 5814 | Grafana | 3000 | Unified dashboards |

### foam (5815-5819)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5815 | n8n (foam) | 5678 | FOAM workflow orchestration |
| 5816-5819 | Reserved | - | Future foam services |

### researchplanner (5820-5829)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5820 | n8n (qi-pipeline) | 5678 | QI workflow orchestration |
| 5821 | Express API app | 3000 | QI pipeline application |
| 5822 | Node.js debugger | 9229 | Dev only |
| 5823 | Adminer | 8080 | Dev only - DB management |
| 5824 | Redis Commander | 8081 | Dev only |
| 5825 | MailHog Web | 8025 | Dev only - email testing |
| 5826 | MailHog SMTP | 1025 | Dev only |
| 5827-5829 | Reserved | - | Future QI services |

### critlit (5830-5839)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5830 | n8n (slr) | 5678 | SLR workflow orchestration |
| 5831 | n8n-worker | - | Queue worker (no external port needed) |
| 5832 | I-Librarian | 80 | PDF management |
| 5833 | n8n-mcp | - | MCP stdio (no external port) |
| 5834-5839 | Reserved | - | Future SLR services |

### Monitoring & DevOps (5840-5850)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5840 | Node Exporter | 9100 | Host metrics |
| 5841 | Postgres Exporter | 9187 | DB metrics |
| 5842 | cAdvisor | 8080 | Container metrics |
| 5843-5850 | Reserved | - | Future monitoring/tools |

## 4. Risk Register

### Critical Risks

| ID | Risk | Severity | Likelihood | Mitigation |
|----|------|----------|------------|------------|
| R1 | GPU access in rootless Docker for Ollama | Critical | Very Likely | Run Ollama as host service or use CDI in Docker 25.0+; validate before committing |
| R2 | PostgreSQL version fragmentation (14/15/16) | Critical | Very Likely | Standardize on pgvector/pg16 (superset); validate all schemas against PG16 |
| R3 | Schema namespace collisions (audit_log, documents) | Critical | Very Likely | Use per-project schemas (foam/qi/slr); update all application code to use schema-qualified names |
| R4 | Healthcare data governance (Queensland Privacy Act) | Critical | Very Likely | Conduct Privacy Impact Assessment; ensure DB encryption at rest; separate DB users per project |
| R5 | N8N credential encryption key management | Critical | Likely | Back up all keys before migration; use Docker secrets for production |

### High Risks

| ID | Risk | Severity | Likelihood | Mitigation |
|----|------|----------|------------|------------|
| R6 | Redis queue conflicts between n8n instances | High | Very Likely | Assign distinct QUEUE_BULL_REDIS_DB and QUEUE_BULL_PREFIX per project |
| R7 | Volume permissions in rootless Docker | High | Likely | Test with target rootless config; set explicit user: directives; verify PGDATA permissions |
| R8 | Service startup cascade failures | High | Very Likely | Add health checks to all services; generous start_period; startup orchestration script |
| R9 | CI/CD pipeline is Python-only, doesn't test Node.js | High | Very Likely | Rewrite CI with matrix builds; add Node.js test jobs; fix Dockerfile path references |
| R10 | Secret management across 3 projects | High | Very Likely | Namespace env vars (FOAM_*, QI_*, SLR_*); use per-project .env files; implement Docker secrets |
| R11 | Migration ordering and rollback (no rollback scripts exist) | High | Likely | Adopt unified migration tool; create down-migrations; add schema_migrations tracking table |
| R12 | Resource contention (20-40GB RAM total across all services) | High | Likely | Capacity planning; share Ollama/Redis; right-size resource limits based on actual usage |

### Medium Risks

| ID | Risk | Severity | Likelihood | Mitigation |
|----|------|----------|------------|------------|
| R13 | Network isolation between services | Medium | Possible | Define explicit per-project networks; use internal:true for DB networks |
| R14 | Log aggregation complexity (15+ containers) | Medium | Likely | Standardize JSON log format; add log rotation; consider Loki for aggregation |
| R15 | N8N MCP service connects to wrong n8n instance | Medium | Possible | Rename services to project-specific names; update MCP N8N_API_URL |
| R16 | TypeScript version/config divergence | Medium | Possible | Use TS project references; each project keeps own tsconfig.json |
| R17 | npm package version conflicts | Medium | Possible | Use pnpm workspaces for strict isolation |

## 5. Granular Implementation Plan

### Phase 0: Pre-Flight Validation (Gate: ALL must pass before Phase 1)

| Step | Task | Validation | Owner |
|------|------|------------|-------|
| 0.1 | Validate Docker rootless GPU support on target server | Ollama runs with GPU in rootless mode | Infrastructure |
| 0.2 | Test pgvector/pg16 compatibility with all 3 project schemas | All init scripts execute without errors | Database |
| 0.3 | Validate 5810-5850 port range availability | No conflicts on target server | Infrastructure |
| 0.4 | Verify Docker 25.0+ available (CDI support) | `docker version` >= 25.0 | Infrastructure |
| 0.5 | Establish env var naming convention document | Naming standard reviewed and approved | Architecture |
| 0.6 | Decide: separate n8n instances (recommended) vs shared | Decision documented in ADR | Architecture |
| 0.7 | Decide: single PostgreSQL with schemas (recommended) vs separate | Decision documented in ADR | Architecture |
| 0.8 | Queensland Health InfoSec review initiated | Review request submitted | Governance |

**Quality Gate 0**: All 8 pre-flight items pass -> proceed to Phase 1

### Phase 1: Repository Structure & Initial Consolidation

| Step | Task | Details |
|------|------|---------|
| 1.1 | Initialize monorepo root | Create root package.json, pnpm-workspace.yaml, .gitignore, .nvmrc (Node 20 LTS) |
| 1.2 | Create apps/ directory structure | Move foam -> apps/foam, researchplanner -> apps/researchplanner, critlit -> apps/critlit, ralph -> apps/ralph |
| 1.3 | Create packages/core/ scaffold | Empty package dirs with package.json for each of the 9 core modules |
| 1.4 | Create infrastructure/ directory | docker/, init-db/, nginx/ directories |
| 1.5 | Create docs/ directory | ARCHITECTURE.md, PORT_MAP.md, NETWORK_TOPOLOGY.md, RISK_REGISTER.md |
| 1.6 | Create root tsconfig.json with project references | Reference apps/researchplanner and future TS packages |
| 1.7 | Create .github/workflows/ | Stub CI, security, and deploy workflows |
| 1.8 | Preserve git history | Use git subtree or filter-repo for each original repo |

**Code Review Checkpoint 1**: Directory structure review. Verify no files are lost, no secrets exposed.

### Phase 2: Infrastructure Unification

| Step | Task | Details |
|------|------|---------|
| 2.1 | Create unified docker-compose.yml | All services with port map 5810-5850, per-project networks |
| 2.2 | Create docker-compose.dev.yml | Dev overrides (Adminer, Redis Commander, MailHog, debugger ports) |
| 2.3 | Create docker-compose.monitoring.yml | Prometheus, Grafana, exporters |
| 2.4 | Create .env.example with namespaced vars | FOAM_*, QI_*, SLR_* prefixes for all project-specific vars |
| 2.5 | Create unified init-db/ scripts | 00_common_extensions.sql (uuid-ossp, pgvector, pg_trgm), per-project schema scripts |
| 2.6 | Migrate foam's postgres-init.sql to schema-qualified | All tables under `foam` schema |
| 2.7 | Migrate critlit's 13 init scripts to schema-qualified | All tables under `slr` schema |
| 2.8 | Create qi schema for researchplanner | Adapt migrations to use `qi` schema |
| 2.9 | Configure Redis isolation | QUEUE_BULL_REDIS_DB per project, key prefix documentation |
| 2.10 | Create startup orchestration script | Ordered startup: postgres -> redis -> ollama -> n8n instances -> apps |

**Quality Gate 2**: `docker compose up` succeeds. All services healthy. `docker compose ps` shows all containers running. PostgreSQL accepts connections on port 5810 with all 3 schemas. Each n8n instance accessible on its assigned port.

**Code Review Checkpoint 2**: Docker configuration review. Verify network isolation, secret handling, resource limits, health checks.

### Phase 3: Core Module Extraction (Priority Order)

| Step | Module | Source | Approach |
|------|--------|--------|----------|
| 3.1 | @pipelines/retry | All 4 projects | Extract exponential backoff, jitter, retryable error detection, withRetry<T> generic |
| 3.2 | @pipelines/config | All .env patterns | Create typed config loader from env vars with Zod validation |
| 3.3 | @pipelines/logging | foam logging.js + researchplanner logger.ts | Structured JSON logger with pipeline stage events |
| 3.4 | @pipelines/validation | foam schema-validator.js + researchplanner Zod | Zod schemas with JSON Schema export for n8n |
| 3.5 | @pipelines/database | researchplanner db/* | Connection pool, transactions, BaseRepository, health check, migration runner |
| 3.6 | @pipelines/llm-client | researchplanner llm/* | Multi-provider (Claude primary, OpenAI fallback, Ollama local), structured output |
| 3.7 | @pipelines/checkpoint | researchplanner + critlit | Generic stage state machine, progress tracking, approve/reject gates |
| 3.8 | @pipelines/n8n-utils | foam + critlit utilities | Code Node wrapper, stage logging, dual CJS/ESM export for n8n compatibility |
| 3.9 | @pipelines/pubmed | researchplanner + critlit | eSearch/eFetch client, XML parser, rate limiting |

Each core module follows this process:
1. Create package with TypeScript source
2. Write unit tests (minimum 80% coverage)
3. Build to both ESM and CJS
4. For n8n-compatible modules: also produce self-contained bundle (esbuild)
5. Update consuming app to import from core module
6. Verify existing tests still pass
7. Code review before merging

**Quality Gate 3**: All core modules build. All unit tests pass. No consuming app tests regress. `pnpm build` from root succeeds.

**Code Review Checkpoint 3**: Core module API review. Verify abstractions are correct, no breaking changes to consuming apps, proper error handling.

### Phase 4: Application Migration

| Step | Task | Details |
|------|------|---------|
| 4.1 | Migrate researchplanner to use core modules | Replace inline retry, DB connection, LLM client, checkpoint logic with @pipelines/* imports |
| 4.2 | Migrate foam JS utilities to use core modules | Replace error-handler.js, logging.js, schema-validator.js with @pipelines/* (bundled for n8n) |
| 4.3 | Migrate critlit JS utilities to use core modules | Replace rate-limiter.js, checkpoint-utils.js, pubmed-parser.js, screening-utils.js |
| 4.4 | Update ralph Docker integration | Configure ralph to work within monorepo Docker setup |
| 4.5 | Update all import paths | Verify no broken imports across all apps |
| 4.6 | Run full test suite for researchplanner | `pnpm --filter researchplanner test` passes |
| 4.7 | Run smoke tests for foam workflows | Import workflows into foam n8n, trigger test cases |
| 4.8 | Run integration tests for critlit | `./tests/run-integration-tests.sh` passes |
| 4.9 | Run ralph test suite | `npm test` passes in ralph directory |

**Quality Gate 4**: All app tests pass. N8N workflows load without errors. Docker health checks green across all services.

**Code Review Checkpoint 4**: Full application review. Verify all imports resolve, no regressions, Docker compose works end-to-end.

### Phase 5: CI/CD Pipeline

| Step | Task | Details |
|------|------|---------|
| 5.1 | Create monorepo CI workflow | Path-based triggers: changes in apps/foam/ trigger foam jobs only |
| 5.2 | Add Node.js build/test matrix | Node 20 LTS, pnpm install, build all packages, test all packages |
| 5.3 | Add Docker build validation | `docker compose build` in CI with layer caching |
| 5.4 | Add CodeQL for JS/TS | Replace Python-only CodeQL with multi-language scanning |
| 5.5 | Add dependency vulnerability scanning | npm audit, Snyk, or Dependabot |
| 5.6 | Add lint checks | ESLint for TS/JS across all packages |
| 5.7 | Create deploy workflow | Docker compose deployment with health check verification |
| 5.8 | Add integration test job | Spin up Docker compose in CI, run cross-project smoke tests |

CI Pipeline Structure:
```
PR -> lint -> build -> unit tests -> Docker build -> integration tests -> security scan
                                                                              |
                                                                        merge to main
                                                                              |
                                                                  deploy (manual gate)
```

**Quality Gate 5**: CI passes on all branches. Security scan clean. Docker build succeeds in CI.

**Code Review Checkpoint 5**: CI/CD configuration review. Verify path-based triggers work, secrets properly configured, deploy workflow has manual approval gate.

### Phase 6: Quality Assurance & Security

| Step | Task | Details |
|------|------|---------|
| 6.1 | Security audit of all core modules | Focus: input validation, SQL injection prevention, secret handling |
| 6.2 | OWASP Top 10 review for Express API (researchplanner) | Verify auth, CSRF, XSS, injection protections |
| 6.3 | Network penetration test of Docker deployment | Verify network isolation, no unintended cross-service access |
| 6.4 | Database access control audit | Verify per-project DB users with minimal privileges |
| 6.5 | Secret rotation procedure documentation | Document how to rotate all API keys, DB passwords, n8n encryption keys |
| 6.6 | Backup and restore verification | Test pg_dump and restore across all 3 schemas |
| 6.7 | Load testing n8n instances | Verify concurrent workflow execution doesn't cause resource contention |
| 6.8 | Privacy Impact Assessment | Queensland Privacy Act compliance for consolidated system |

**Quality Gate 6**: Security audit passes. No critical/high vulnerabilities. Backup/restore tested. PIA submitted.

**Code Review Checkpoint 6**: Security review findings addressed. All audit items closed or accepted with documented rationale.

### Phase 7: Documentation

| Step | Task | Details |
|------|------|---------|
| 7.1 | Write ARCHITECTURE.md | System architecture diagram, service topology, data flow |
| 7.2 | Write PORT_MAP.md | Complete port allocation with all services |
| 7.3 | Write NETWORK_TOPOLOGY.md | Network diagram, allowed service communication matrix |
| 7.4 | Write RISK_REGISTER.md | All identified risks with mitigations and status |
| 7.5 | Write DEPLOYMENT.md | Step-by-step deployment for Docker rootless environment |
| 7.6 | Write CONTRIBUTING.md | Monorepo development workflow, PR process, testing expectations |
| 7.7 | Write RUNBOOK.md | Operational procedures: startup, shutdown, backup, troubleshooting |
| 7.8 | Update per-app READMEs | Update foam, researchplanner, critlit, ralph READMEs for monorepo context |
| 7.9 | API documentation for core modules | TypeDoc for all @pipelines/* packages |
| 7.10 | ADR (Architecture Decision Records) | Document all key decisions made during consolidation |

**Quality Gate 7**: All documentation reviewed and approved. Deployment guide tested by someone other than the author.

### Phase 8: Deployment (Docker Rootless)

| Step | Task | Details |
|------|------|---------|
| 8.1 | Provision target server | Verify Docker 25.0+, rootless mode configured, GPU drivers if needed |
| 8.2 | Configure rootless Docker | User namespace mapping, storage driver, network configuration |
| 8.3 | Deploy shared infrastructure | PostgreSQL, Redis, Ollama on ports 5810-5812 |
| 8.4 | Run database migrations | Execute all init-db/ scripts, verify schemas created |
| 8.5 | Deploy foam | n8n on 5815, import workflows, configure credentials |
| 8.6 | Deploy researchplanner | n8n on 5820, app on 5821, configure all env vars |
| 8.7 | Deploy critlit | n8n on 5830, worker, i-librarian on 5832, configure credentials |
| 8.8 | Deploy monitoring | Prometheus on 5813, Grafana on 5814, configure dashboards |
| 8.9 | Smoke test all services | Verify each n8n instance loads, each DB schema accessible, app health endpoints respond |
| 8.10 | Configure backups | Automated pg_dump for all schemas, n8n workflow export, volume backups |
| 8.11 | Configure log rotation | Docker log driver with max-size/max-file across all containers |
| 8.12 | Final validation | All health checks pass, monitoring dashboards populated, backup tested |

**Quality Gate 8 (Final)**: All services running on assigned ports. Health checks green. Monitoring functional. Backup/restore tested. All documentation current.

## 6. Dependency Graph for Core Modules

```
@pipelines/config (no deps)
       |
       v
@pipelines/logging (config)
       |
       v
@pipelines/retry (logging)
       |
       +---------------+---------------+
       v               v               v
@pipelines/       @pipelines/   @pipelines/
llm-client        database      pubmed
(retry,logging,   (retry,       (retry,
 config,          logging,       logging,
 validation)      config)        config)
       |               |
       v               v
@pipelines/checkpoint
(database, logging)
       |
       v
@pipelines/n8n-utils
(logging, checkpoint, validation)
```

## 7. Docker Rootless Configuration Notes

### Ollama GPU Strategy
- **Primary**: Use CDI (Container Device Interface) in Docker 25.0+ for rootless GPU passthrough
- **Fallback**: Run Ollama as host service, connect via host.docker.internal:11434
- **Cloud fallback**: Use cloud LLM APIs exclusively if GPU not available

### Volume Permissions
- PostgreSQL: Use official image's built-in rootless support; set PGDATA explicitly
- Ollama: Override model path to non-root directory (OLLAMA_MODELS=/home/ollama/.ollama/models)
- n8n: Default non-root user compatible with rootless Docker
- Redis: Alpine image runs as redis user, compatible with rootless

### Network Configuration
```yaml
networks:
  shared:          # PostgreSQL, Redis, Ollama
    driver: bridge
  foam-internal:   # foam n8n <-> shared
    driver: bridge
  qi-internal:     # researchplanner app <-> n8n <-> shared
    driver: bridge
  slr-internal:    # critlit n8n <-> worker <-> shared
    driver: bridge
  monitoring:      # Prometheus <-> all services for scraping
    driver: bridge
```

## 8. Environment Variable Convention

All project-specific variables use a project prefix:

```bash
# Shared
POSTGRES_PASSWORD=<shared-pg-password>
REDIS_URL=redis://redis:6379
OLLAMA_URL=http://ollama:11434
ANTHROPIC_API_KEY=<shared>

# foam
FOAM_N8N_USER=<foam-admin>
FOAM_N8N_PASSWORD=<foam-password>
FOAM_N8N_ENCRYPTION_KEY=<foam-key>
FOAM_DB_NAME=foam
FOAM_DB_SCHEMA=foam

# researchplanner (qi)
QI_N8N_USER=<qi-admin>
QI_N8N_PASSWORD=<qi-password>
QI_N8N_ENCRYPTION_KEY=<qi-key>
QI_DB_NAME=qi_pipeline
QI_DB_SCHEMA=qi
QI_JWT_SECRET=<qi-jwt>
QI_SESSION_SECRET=<qi-session>

# critlit (slr)
SLR_N8N_USER=<slr-admin>
SLR_N8N_PASSWORD=<slr-password>
SLR_N8N_ENCRYPTION_KEY=<slr-key>
SLR_DB_NAME=slr_database
SLR_DB_SCHEMA=slr
SLR_N8N_API_KEY=<slr-api-key>
```

## 9. Quality Gates Summary

| Gate | Phase | Criteria | Blocking |
|------|-------|----------|----------|
| QG-0 | Pre-Flight | All 8 validation items pass | Yes - blocks all work |
| QG-1 | - | (Review checkpoint only) | Soft |
| QG-2 | Infrastructure | Docker compose up, all healthy, all ports correct | Yes |
| QG-3 | Core Modules | All packages build, tests pass, no regressions | Yes |
| QG-4 | App Migration | All app tests pass, Docker health green | Yes |
| QG-5 | CI/CD | Pipeline passes all branches, security clean | Yes |
| QG-6 | Security | Audit passed, no critical/high issues, PIA submitted | Yes |
| QG-7 | Documentation | All docs reviewed and tested | Soft |
| QG-8 | Deployment | All services running, monitoring live, backup tested | Yes |

## 10. Code Review Checkpoints

| Checkpoint | Phase | Scope | Required Reviewers |
|------------|-------|-------|--------------------|
| CR-1 | Structure | Directory structure, no lost files, no secrets | 1 reviewer |
| CR-2 | Infrastructure | Docker config, network isolation, secrets | 2 reviewers |
| CR-3 | Core Modules | API design, abstractions, error handling | 2 reviewers |
| CR-4 | App Migration | Integration correctness, no regressions | 2 reviewers |
| CR-5 | CI/CD | Pipeline config, deploy safety | 1 reviewer |
| CR-6 | Security | Audit findings, all items addressed | Security lead |

## 11. Rollback Strategy

Each phase has a defined rollback:

| Phase | Rollback Strategy |
|-------|-------------------|
| Phase 1 | Revert git commits; original repos untouched |
| Phase 2 | docker compose down -v; restore original compose files |
| Phase 3 | Revert core module commits; apps still use inline code |
| Phase 4 | Revert migration commits; apps fall back to inline code |
| Phase 5 | Restore previous CI workflows from git history |
| Phase 6 | N/A (documentation/audit phase, no code changes) |
| Phase 7 | N/A (documentation phase) |
| Phase 8 | docker compose down; redeploy individual project compose files |

---

*Generated: 2026-01-29*
*Project: Pipeline Orchestrator Monorepo*
*Organization: Metro North Health / REdI*
