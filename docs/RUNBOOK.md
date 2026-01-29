# Operational Runbook

## Startup

### Full Stack
```bash
cd infrastructure/docker
./scripts/startup.sh --all
```

### Core Infrastructure Only
```bash
cd infrastructure/docker
docker compose up -d postgres redis ollama
```

### Individual Services
```bash
# FOAM
docker compose up -d foam-n8n

# QI Pipeline
docker compose up -d qi-n8n qi-app

# SLR Pipeline
docker compose up -d slr-n8n slr-n8n-worker slr-n8n-mcp i-librarian

# Monitoring
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

## Shutdown

### Graceful Shutdown
```bash
docker compose down
```

### Emergency Stop (preserves data)
```bash
docker compose stop
```

### Full Reset (destroys data)
```bash
docker compose down -v
```

## Health Checks

### Quick Status
```bash
docker compose ps
```

### Service-Specific Health
```bash
# PostgreSQL
docker compose exec postgres pg_isready -U pipelines

# Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping

# N8N instances
curl -sf http://localhost:5815/healthz  # FOAM
curl -sf http://localhost:5820/healthz  # QI
curl -sf http://localhost:5830/healthz  # SLR

# QI App
curl -sf http://localhost:5821/health

# Ollama
curl -sf http://localhost:5812/api/tags
```

## Backup & Restore

### Database Backup
```bash
# All schemas
docker compose exec postgres pg_dump -U pipelines -d pipelines > backup_$(date +%Y%m%d).sql

# Per-schema backup
docker compose exec postgres pg_dump -U pipelines -d pipelines -n foam > backup_foam_$(date +%Y%m%d).sql
docker compose exec postgres pg_dump -U pipelines -d pipelines -n qi > backup_qi_$(date +%Y%m%d).sql
docker compose exec postgres pg_dump -U pipelines -d pipelines -n slr > backup_slr_$(date +%Y%m%d).sql
```

### Database Restore
```bash
cat backup.sql | docker compose exec -T postgres psql -U pipelines -d pipelines
```

### N8N Workflow Export
```bash
# Export all workflows via API
curl -H "X-N8N-API-KEY: $FOAM_N8N_API_KEY" http://localhost:5815/api/v1/workflows > foam_workflows.json
curl -H "X-N8N-API-KEY: $QI_N8N_API_KEY" http://localhost:5820/api/v1/workflows > qi_workflows.json
curl -H "X-N8N-API-KEY: $SLR_N8N_API_KEY" http://localhost:5830/api/v1/workflows > slr_workflows.json
```

## Troubleshooting

### Service Won't Start
1. Check logs: `docker compose logs <service>`
2. Verify .env file exists and has all required values
3. Check port conflicts: `netstat -tlnp | grep 58`
4. Verify dependencies are healthy: `docker compose ps`

### Database Connection Issues
1. Check PostgreSQL is running: `docker compose ps postgres`
2. Verify credentials: `docker compose exec postgres psql -U pipelines -d pipelines`
3. Check schema exists: `\dn` in psql
4. Check max connections: `SELECT count(*) FROM pg_stat_activity;`

### N8N Workflow Failures
1. Check N8N logs: `docker compose logs foam-n8n`
2. Verify Redis queue: `docker compose exec redis redis-cli -a $REDIS_PASSWORD info keyspace`
3. Check execution data: N8N UI > Executions tab
4. Verify API keys in environment

### High Memory Usage
1. Check container stats: `docker stats`
2. Review resource limits in docker-compose.yml
3. PostgreSQL: Check `shared_buffers` and `work_mem` settings
4. Redis: Check `maxmemory` setting (1GB default)
5. Consider pruning old N8N execution data

### Port Map Reference
| Port | Service | Protocol |
|------|---------|----------|
| 5810 | PostgreSQL | TCP |
| 5811 | Redis | TCP |
| 5812 | Ollama | HTTP |
| 5813 | Prometheus | HTTP |
| 5814 | Grafana | HTTP |
| 5815 | FOAM N8N | HTTP |
| 5820 | QI N8N | HTTP |
| 5821 | QI App | HTTP |
| 5830 | SLR N8N | HTTP |
| 5832 | I-Librarian | HTTP |
| 5840 | Node Exporter | HTTP |
| 5841 | Postgres Exporter | HTTP |
| 5842 | cAdvisor | HTTP |
