# Security Documentation

## Overview

The Pipeline Orchestrator consolidates four medical research pipeline applications (FOAM, ResearchPlanner/QI, CritLit/SLR, Ralph) into a shared infrastructure. This document covers security measures, audit findings, and operational security procedures.

## Authentication & Access Control

### Database Access
- Single PostgreSQL instance with per-project schemas (foam, qi, slr)
- Shared database user configured via `POSTGRES_USER` environment variable
- Schema-level isolation prevents cross-project data access via `SET search_path`
- SQL injection prevention: schema names validated with `/^[a-z_][a-z0-9_]*$/i` regex and parameterized `set_config()` queries

### Redis Access
- Password-protected via `REDIS_PASSWORD` environment variable (`--requirepass`)
- Per-project queue isolation using separate Redis databases (foam=0, qi=1, slr=2)
- Queue key prefix isolation (foam, qi, slr prefixes)

### N8N Instances
- Per-project N8N instances with separate encryption keys
- User management via `N8N_DEFAULT_USER_EMAIL` / `N8N_DEFAULT_USER_PASSWORD`
- Separate PostgreSQL schemas per N8N instance (foam_n8n, qi_n8n, slr_n8n)

### API Keys
- Anthropic and OpenAI API keys stored as environment variables
- Never committed to version control (`.gitignore` rules + `.env.example` with placeholder values)
- Keys are shared across projects where needed

## Network Isolation

### Docker Networks
| Network | Purpose | Services |
|---------|---------|----------|
| `pipelines-shared` | Cross-service communication | postgres, redis, ollama, all n8n instances, qi-app |
| `pipelines-foam-internal` | FOAM-specific isolation | foam-n8n |
| `pipelines-qi-internal` | QI-specific isolation | qi-n8n, qi-app |
| `pipelines-slr-internal` | SLR-specific isolation | slr-n8n, slr-n8n-worker, slr-n8n-mcp, i-librarian |
| `pipelines-monitoring` | Monitoring stack | prometheus, grafana, exporters |

### Port Exposure
- External ports limited to the 5810-5850 range
- Internal service communication uses Docker DNS (service names)
- Health check endpoints are HTTP-only (no TLS within Docker network)

## Secret Management

### Environment Variables
All secrets follow the naming convention documented in ADR-003:
- `POSTGRES_PASSWORD` - Database password
- `REDIS_PASSWORD` - Redis authentication
- `FOAM_N8N_ENCRYPTION_KEY` - FOAM N8N encryption
- `QI_N8N_ENCRYPTION_KEY` - QI N8N encryption
- `SLR_N8N_ENCRYPTION_KEY` - SLR N8N encryption
- `QI_JWT_SECRET` - QI application JWT signing
- `QI_SESSION_SECRET` - QI application session
- `ANTHROPIC_API_KEY` - Claude API access
- `OPENAI_API_KEY` - OpenAI API access (optional)

### Secret Rotation Procedure
1. Generate new secret: `openssl rand -hex 32`
2. Update `.env` file on deployment server
3. Restart affected services: `docker compose restart <service>`
4. Verify service health: `docker compose ps`
5. For N8N encryption keys: existing credentials will need re-encryption

## Security Audit Checklist

### Input Validation
- [x] Database schema names validated (regex allowlist)
- [x] SQL queries use parameterized statements
- [x] LLM client validates structured output against Zod schemas
- [x] PubMed client uses URL parameter encoding (URLSearchParams)
- [x] N8N Code Node error handling wraps exceptions

### Dependency Security
- [x] `pnpm audit` in CI pipeline (security.yml)
- [x] CodeQL static analysis for JavaScript/TypeScript
- [x] Weekly scheduled security scans (Monday 6:00 UTC)
- [x] Minimal dependency footprint (phantom deps removed)

### Infrastructure Security
- [x] Redis password authentication enabled
- [x] PostgreSQL healthcheck uses authenticated connection
- [x] Docker resource limits on all services
- [x] No privileged containers
- [x] Read-only volume mounts for config/workflow files

### Data Protection
- [ ] TLS for external-facing services (requires reverse proxy)
- [x] No sensitive data in logs (logging package omits credentials)
- [x] Database connection strings use environment variables
- [ ] Backup encryption at rest (pending Phase 8 deployment)

## Known Limitations

1. **No TLS within Docker network** - Services communicate over unencrypted HTTP internally. This is acceptable for single-host deployment but would need TLS for multi-host.
2. **Shared database user** - All projects use the same PostgreSQL user. Schema-level isolation provides separation but not full access control. Consider per-project database users for production.
3. **API keys shared across projects** - The Anthropic API key is shared. Consider per-project API keys for usage tracking and rate limit isolation.
