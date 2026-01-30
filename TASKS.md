# TASKS.md - Pipeline Orchestrator

## Audit Summary (2026-01-30)

Full codebase review completed across core packages, infrastructure, CI/CD, and documentation.

### Resolved in This Audit

| # | Severity | Area | Issue | Status |
|---|----------|------|-------|--------|
| 1 | CRITICAL | llm-client | Greedy regex in extractJSON matches wrong content | FIXED |
| 2 | CRITICAL | llm-client | API key may leak via Anthropic SDK error messages | FIXED |
| 3 | CRITICAL | infrastructure | SSL cert validation disabled for QI N8N DB connection | FIXED |
| 4 | CRITICAL | infrastructure | PostgreSQL exporter uses sslmode=disable | FIXED |
| 5 | CRITICAL | infrastructure | Default password fallback in dev compose | FIXED |
| 6 | CRITICAL | docs | NETWORK_TOPOLOGY.md wrong about FOAM Redis access | FIXED |
| 7 | HIGH | llm-client | OpenAI/Ollama providers declared but not implemented | FIXED |
| 8 | HIGH | database | Empty string default password in createDatabase | FIXED |
| 9 | HIGH | database | No tests for SQL injection prevention | FIXED |
| 10 | HIGH | infrastructure | Redis healthcheck does not authenticate | FIXED |
| 11 | HIGH | ci/cd | CI workflow missing permissions block | FIXED |
| 12 | HIGH | ci/cd | PR check workflow missing permissions block | FIXED |
| 13 | MEDIUM | logging | Unchecked cast of LOG_LEVEL env var | FIXED |
| 14 | MEDIUM | retry | Dead code path for RetryError | FIXED |
| 15 | MEDIUM | n8n-utils | Greedy regex in parseLLMJson | FIXED |
| 16 | MEDIUM | llm-client | chatStructured leading newlines in system prompt | FIXED |
| 17 | MEDIUM | infrastructure | Debug port exposed on all interfaces | FIXED |
| 18 | MEDIUM | infrastructure | Internal hostname in compose defaults | FIXED |
| 19 | MEDIUM | database | Missing @types/node in devDependencies | FIXED |
| 20 | HIGH | docs | CLAUDE.md still had template placeholders | FIXED |
| 21 | MEDIUM | docs | ADR-003 referenced REDIS_URL instead of REDIS_PASSWORD | FIXED |
| 22 | MEDIUM | docs | DEPLOYMENT.md had TODO instead of RUNBOOK link | FIXED |

### Remaining Backlog

#### HIGH Priority

| # | Area | Issue | Notes |
|---|------|-------|-------|
| B1 | validation | zodToJsonSchema relies on Zod private internals (_def) | Consider replacing with zod-to-json-schema package |
| B2 | database | Tests create connection pools but never close them | Add afterEach/afterAll cleanup hooks |
| B3 | llm-client | No tests for chat(), chatStructured(), extractJSON() | Need mocked Anthropic SDK tests |
| B4 | pubmed | Regex-based XML parsing is unreliable | Consider adding fast-xml-parser dependency |
| B5 | n8n-utils | Object.assign merge silently drops duplicate keys | Document behavior or add collision detection |
| B6 | infrastructure | Docker images use :latest tags (13 instances) | Pin to specific version tags |
| B7 | infrastructure | No container hardening (security_opt, cap_drop) | Add to all production services |
| B8 | infrastructure | Redis Commander deployed without authentication | Add HTTP auth or restrict access |
| B9 | infrastructure | Adminer deployed without access restrictions | Bind to localhost only |
| B10 | infrastructure | N8N metrics endpoints exposed without auth | Configure authenticated scraping |
| B11 | infrastructure | Prometheus --web.enable-lifecycle allows remote shutdown | Remove flag or add auth |

#### MEDIUM Priority

| # | Area | Issue | Notes |
|---|------|-------|-------|
| B12 | config | Missing tests for helper functions (portNumber, etc.) | Add unit tests |
| B13 | validation | zodToJsonSchema returns {} for unhandled Zod types | Add warnings for unsupported types |
| B14 | validation/config | Dual re-export of z from zod | Pick one canonical source |
| B15 | checkpoint | deserialize accepts untrusted JSON without validation | Add runtime shape validation |
| B16 | infrastructure | Single DB user for all schemas (no least-privilege) | Create per-app database roles |
| B17 | infrastructure | CI integration test uses weak passwords | Use random values |
| B18 | infrastructure | Grafana default admin username | Change to non-obvious value |
| B19 | infrastructure | .env.example has realistic API key prefixes | Use clearly fake placeholders |
| B20 | infrastructure | Some services missing resource limits | Add deploy.resources.limits |
| B21 | docs | RISK_REGISTER.md status updates needed | Mark mitigated risks |
| B22 | docs | CONTRIBUTING.md missing startup.sh reference | Add script reference |
| B23 | cross-package | No tsconfig references between dependent packages | Add references arrays |

#### LOW Priority

| # | Area | Issue | Notes |
|---|------|-------|-------|
| B24 | config | No test for SharedInfraSchema | Add validation test |
| B25 | logging | No test for default logger singleton | Add instance test |
| B26 | retry | RetryError imported but unused in tests | Update test imports |
| B27 | checkpoint | No test for duplicate checkpoint ID behavior | Document or guard |
| B28 | pubmed | Rate limiter is per-instance, not global | Consider module-level limiter |
| B29 | cross-package | Clean script uses rm -rf (Unix-only) | Use rimraf for cross-platform |
| B30 | infrastructure | Ollama binds to all interfaces without auth | Bind to localhost |
| B31 | infrastructure | No PostgreSQL audit logging configured | Add log_statement=ddl |
| B32 | infrastructure | ESLint missing security plugin | Add eslint-plugin-security |

## Phase Completion Status

| Phase | Description | Status | Commit |
|-------|-------------|--------|--------|
| 0+1 | Monorepo structure and ADRs | Complete | 96ee436 |
| 2 | Infrastructure unification | Complete | 669082e |
| 3 | Core shared packages (9) | Complete | 94dcaaa |
| 4 | Application migration | Complete | 534d78c |
| 5-7 | CI/CD, security, documentation | Complete | ebea713 |
| 8 | Deployment (Docker rootless) | Not Started | Requires server access |
| Audit | Full codebase review + fixes | Complete | (pending commit) |
