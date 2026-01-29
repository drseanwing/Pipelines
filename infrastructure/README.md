# Infrastructure

Shared infrastructure configuration for the Pipeline Orchestrator monorepo.

## Directory Structure

- `docker/` - Docker Compose configurations
  - `docker-compose.yml` - Full stack (shared services + all apps)
  - `docker-compose.dev.yml` - Development overrides (Adminer, Redis Commander, MailHog)
  - `docker-compose.monitoring.yml` - Prometheus, Grafana, exporters
  - `.env.example` - Required environment variables
- `init-db/` - PostgreSQL initialization scripts
  - `00_common_extensions.sql` - Shared extensions (uuid-ossp, pgvector, pg_trgm)
  - `01_foam_schema.sql` - FOAM project schema
  - `02_qi_schema.sql` - QI/ResearchPlanner schema
  - `03_slr_schema.sql` - SLR/CritLit schema
- `nginx/` - Reverse proxy configuration

## Port Allocation (5810-5850)

| Range | Purpose |
|-------|---------|
| 5810-5814 | Shared infrastructure (PostgreSQL, Redis, Ollama, Prometheus, Grafana) |
| 5815-5819 | FOAM services |
| 5820-5829 | ResearchPlanner/QI services |
| 5830-5839 | CritLit/SLR services |
| 5840-5850 | Monitoring and DevOps |

See `docs/PORT_MAP.md` for detailed allocation.
