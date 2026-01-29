# FOAM N8N Monitoring - Quick Start Guide

Complete monitoring stack for your FOAM N8N system with Prometheus and Grafana.

## What You Get

- **Real-time dashboards** showing service health, workflow performance, and resource usage
- **Automated alerts** for critical conditions (service down, high error rates, resource exhaustion)
- **Cost tracking** for LLM API usage and token consumption
- **Historical data** with 30-day retention for trend analysis
- **Pre-configured dashboard** with 16 panels covering all key metrics

## 5-Minute Setup

### Prerequisites
- FOAM N8N system already running (`docker-compose.yml`)
- Docker and Docker Compose installed

### Setup Steps

1. **Configure environment variables**
   ```bash
   # Copy the example file
   cp .env.monitoring.example .env

   # Edit and set secure passwords
   nano .env
   ```

   At minimum, change:
   - `GRAFANA_ADMIN_PASSWORD` (default is insecure!)
   - `DOMAIN` (if using reverse proxy)

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup-monitoring.sh
   ./scripts/setup-monitoring.sh
   ```

3. **Access Grafana**
   - URL: http://localhost:3000
   - Username: `admin` (or your configured value)
   - Password: (from your .env file)

4. **View the dashboard**
   - Navigate to **Dashboards** → **FOAM N8N System Overview**

That's it! You now have full monitoring coverage.

## What the Dashboard Shows

### Service Health (Top Row)
- ✅ N8N service status
- ✅ PostgreSQL database status
- ✅ Ollama LLM service status

### Performance Metrics
- Workflow execution rate (workflows per minute)
- Error rate percentage
- Average workflow duration

### Cost & Usage
- API costs in the last 24 hours
- Total tokens consumed
- Active error count
- Request status distribution

### Resource Monitoring
- Container memory usage (N8N, Postgres, Ollama)
- Container CPU usage
- Host memory, CPU, and disk usage
- Database size and growth rate

## Key Alerts

The system automatically alerts on:

| Alert | Condition | Action |
|-------|-----------|--------|
| 🔴 Service Down | N8N/Postgres/Ollama unreachable | Check container logs |
| 🔴 Critical Memory | >95% memory usage | Investigate leak or add resources |
| 🟡 High Error Rate | >5% workflow failures | Review workflow logs |
| 🟡 Low Disk Space | <10% disk free | Clean up or expand storage |
| 🟡 API Rate Limit | LLM rate limiting detected | Implement backoff |

## Manual Commands

### Start monitoring
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### View logs
```bash
docker compose -f docker-compose.monitoring.yml logs -f
```

### Check service status
```bash
docker compose -f docker-compose.monitoring.yml ps
```

### Restart monitoring
```bash
docker compose -f docker-compose.monitoring.yml restart
```

### Stop monitoring
```bash
docker compose -f docker-compose.monitoring.yml down
```

### Full reset (deletes metrics data)
```bash
docker compose -f docker-compose.monitoring.yml down -v
```

## Access Points

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Grafana | 3000 | http://localhost:3000 | Dashboards |
| Prometheus | 9090 | http://localhost:9090 | Metrics & queries |
| Node Exporter | 9100 | http://localhost:9100 | Host metrics |
| Postgres Exporter | 9187 | http://localhost:9187 | Database metrics |
| cAdvisor | 8080 | http://localhost:8080 | Container metrics |

## Customization

### Change alert thresholds
Edit `config/alerting-rules.yml` and adjust conditions:
```yaml
expr: |
  (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.90
```

### Modify data retention
Edit `docker-compose.monitoring.yml`:
```yaml
command:
  - '--storage.tsdb.retention.time=90d'  # Default is 30d
```

### Add custom metrics
Edit `config/postgres-exporter-queries.yaml` to query your database

## Troubleshooting

### Dashboard shows "No Data"
1. Check Prometheus targets: http://localhost:9090/targets (all should be UP)
2. Wait 1-2 minutes for initial scrape
3. Check logs: `docker logs foam-prometheus`

### Postgres Exporter failing
1. Verify credentials in `.env` match your database
2. Check logs: `docker logs foam-postgres-exporter`
3. Test connection: `docker exec foam-postgres-exporter env | grep DATA_SOURCE`

### Grafana login fails
1. Check credentials in `.env` file
2. Reset password: `docker exec foam-grafana grafana-cli admin reset-admin-password newpassword`

### High Prometheus memory usage
1. Reduce retention time in `docker-compose.monitoring.yml`
2. Increase scrape intervals in `config/prometheus.yml`
3. Filter unnecessary metrics with relabel configs

## Files Created

```
foam-n8n-implementation/
├── config/
│   ├── prometheus.yml                    # Prometheus main config
│   ├── alerting-rules.yml                # Alert definitions
│   ├── postgres-exporter-queries.yaml    # Custom DB metrics
│   └── grafana/
│       ├── dashboards/
│       │   └── foam-overview.json        # Main dashboard
│       └── provisioning/
│           ├── datasources/
│           │   └── prometheus.yml        # Grafana datasource
│           └── dashboards/
│               └── default.yml           # Dashboard loader
├── docker-compose.monitoring.yml         # Monitoring stack
├── scripts/
│   └── setup-monitoring.sh               # Automated setup
├── .env.monitoring.example               # Config template
└── docs/
    └── MONITORING.md                     # Full documentation
```

## Next Steps

1. **Change default password** in Grafana (Profile → Change Password)
2. **Set up alert notifications** (see docs/MONITORING.md)
3. **Create custom views** by cloning the default dashboard
4. **Set up backups** for Prometheus data (see docs/MONITORING.md)
5. **Configure retention** based on your storage capacity

## Documentation

- **Full guide**: `docs/MONITORING.md`
- **Prometheus docs**: https://prometheus.io/docs/
- **Grafana docs**: https://grafana.com/docs/

## Security Checklist

- [ ] Changed GRAFANA_ADMIN_PASSWORD from default
- [ ] Using strong passwords (20+ characters)
- [ ] Restricted network access to internal only
- [ ] Enabled TLS/HTTPS for web interfaces
- [ ] Set up regular credential rotation
- [ ] Limited Grafana user permissions
- [ ] Configured firewall rules for monitoring ports

## Resource Requirements

**Minimum** (development):
- 1GB RAM
- 12GB storage
- 2 CPU cores

**Recommended** (production):
- 4GB RAM
- 100GB storage
- 4 CPU cores

The monitoring stack adds approximately 15-20% overhead to system resources.

## Support

For issues or questions:
1. Check `docs/MONITORING.md` for detailed troubleshooting
2. Review container logs: `docker compose -f docker-compose.monitoring.yml logs`
3. Verify configuration files are valid YAML
4. Check Prometheus targets: http://localhost:9090/targets

---

**Version**: 1.0.0
**Last Updated**: 2026-01-25
