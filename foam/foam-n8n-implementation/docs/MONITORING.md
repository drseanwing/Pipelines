# FOAM N8N System Monitoring

Complete monitoring stack for the FOAM N8N Multi-LLM Orchestration System using Prometheus and Grafana.

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Components](#components)
- [Metrics Available](#metrics-available)
- [Alerts](#alerts)
- [Dashboards](#dashboards)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The monitoring stack provides:
- **Real-time metrics** for all FOAM system components
- **Custom workflow metrics** from PostgreSQL
- **Alerting** for critical conditions
- **Visual dashboards** via Grafana
- **Historical data** with 30-day retention

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Grafana Dashboard                        │
│           https://grafana.${DOMAIN}                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Prometheus                               │
│              Metrics Aggregation                            │
└─┬──────┬──────┬──────┬──────┬──────┬──────┬────────────────┘
  │      │      │      │      │      │      │
  ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐
│N8N│  │PG │  │Oll│  │Nod│  │CAd│  │PG-│  │Cus│
│   │  │SQL│  │ama│  │e  │  │vis│  │Exp│  │tom│
└───┘  └───┘  └───┘  └───┘  └───┘  └───┘  └───┘
```

---

## Quick Start

### 1. Prerequisites

Ensure you have the base FOAM system running:
```bash
cd //DOCKERSERVER/Public/Downloads/foam/foam-n8n-implementation
docker-compose up -d
```

### 2. Configure Environment

Add to your `.env` file:
```bash
# Monitoring Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change_this_secure_password
DOMAIN=your-domain.com
```

### 3. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 4. Access Dashboards

- **Grafana**: https://grafana.${DOMAIN} or http://localhost:3000
  - Username: admin (or value from GRAFANA_ADMIN_USER)
  - Password: admin (or value from GRAFANA_ADMIN_PASSWORD)

- **Prometheus**: http://localhost:9090

### 5. Initial Setup

1. Log into Grafana
2. Navigate to **Dashboards** → **FOAM N8N System Overview**
3. (Optional) Change default admin password under **Profile**

---

## Components

### Prometheus
**Purpose**: Metrics collection and storage
**Port**: 9090
**Config**: `config/prometheus.yml`

**Features**:
- 15-second scrape interval
- 30-day data retention
- Alert rule evaluation
- PromQL query language

### Grafana
**Purpose**: Visualization and dashboarding
**Port**: 3000
**URL**: https://grafana.${DOMAIN}

**Pre-configured**:
- Prometheus datasource
- FOAM System Overview dashboard
- Auto-provisioning enabled

### Node Exporter
**Purpose**: Host system metrics
**Port**: 9100

**Metrics**:
- CPU usage
- Memory usage
- Disk I/O
- Network statistics
- Filesystem usage

### Postgres Exporter
**Purpose**: Database metrics
**Port**: 9187

**Metrics**:
- Connection counts
- Transaction rates
- Database size
- Table statistics
- Custom FOAM workflow metrics

### cAdvisor
**Purpose**: Container resource metrics
**Port**: 8080

**Metrics**:
- Container CPU usage
- Container memory usage
- Container network I/O
- Container filesystem usage

---

## Metrics Available

### Service Health Metrics

| Metric | Description | Source |
|--------|-------------|--------|
| `up{job="n8n"}` | N8N service availability (0=down, 1=up) | Prometheus |
| `up{job="postgres"}` | PostgreSQL availability | Prometheus |
| `up{job="ollama"}` | Ollama LLM availability | Prometheus |

### Workflow Execution Metrics

| Metric | Description | Source |
|--------|-------------|--------|
| `foam_workflow_executions_total` | Total workflow executions | Custom Exporter |
| `foam_workflow_errors_total` | Total workflow errors | Custom Exporter |
| `foam_workflow_duration_seconds` | Workflow execution duration | Custom Exporter |
| `foam_tokens_used_total` | Total LLM tokens consumed | Custom Exporter |
| `foam_api_cost_total` | Cumulative API costs | Custom Exporter |

### Database Metrics

| Metric | Description | Source |
|--------|-------------|--------|
| `pg_stat_database_xact_rollback` | Transaction rollback rate | Postgres Exporter |
| `pg_stat_activity_count` | Active connections | Postgres Exporter |
| `pg_database_size_bytes` | Database size | Postgres Exporter |
| `foam_request_status_request_count` | Requests by status | Custom Queries |
| `foam_error_count` | Active errors | Custom Queries |

### Container Metrics

| Metric | Description | Source |
|--------|-------------|--------|
| `container_memory_usage_bytes` | Container memory usage | cAdvisor |
| `container_cpu_usage_seconds_total` | Container CPU usage | cAdvisor |
| `container_network_receive_bytes_total` | Network received | cAdvisor |
| `container_network_transmit_bytes_total` | Network transmitted | cAdvisor |

### Host Metrics

| Metric | Description | Source |
|--------|-------------|--------|
| `node_memory_MemAvailable_bytes` | Available memory | Node Exporter |
| `node_cpu_seconds_total` | CPU time | Node Exporter |
| `node_filesystem_avail_bytes` | Filesystem free space | Node Exporter |
| `node_disk_io_time_seconds_total` | Disk I/O time | Node Exporter |

---

## Alerts

All alert rules are defined in `config/alerting-rules.yml`.

### Critical Alerts

| Alert | Condition | Duration | Action Required |
|-------|-----------|----------|-----------------|
| **N8NServiceDown** | N8N unreachable | 2 minutes | Check N8N container logs |
| **PostgresServiceDown** | Database unreachable | 1 minute | Check PostgreSQL container |
| **CriticalMemoryUsage** | Memory >95% | 2 minutes | Investigate memory leak or increase resources |
| **DiskSpaceCritical** | Disk <5% free | 2 minutes | Clean up data or expand storage |

### Warning Alerts

| Alert | Condition | Duration | Action Required |
|-------|-----------|----------|-----------------|
| **HighWorkflowErrorRate** | Error rate >5% | 10 minutes | Review workflow logs |
| **HighMemoryUsage** | Memory >85% | 5 minutes | Monitor for trend |
| **DiskSpaceLow** | Disk <10% free | 5 minutes | Plan cleanup or expansion |
| **HighAPIUsageCost** | Cost >$10/hour | 5 minutes | Review API usage patterns |
| **LLMAPIRateLimiting** | Rate limit errors detected | 1 minute | Implement backoff strategy |

### Info Alerts

| Alert | Condition | Duration | Action Required |
|-------|-----------|----------|-----------------|
| **UnusualTokenUsage** | Token rate >10k/sec | 10 minutes | Investigate unusual activity |
| **WorkflowExecutionStalled** | No executions in 1 hour | 5 minutes | Check workflow triggers |

---

## Dashboards

### FOAM N8N System Overview

**Location**: `config/grafana/dashboards/foam-overview.json`

**Panels**:

1. **Service Status** (Top Row)
   - N8N Service Status
   - PostgreSQL Status
   - Ollama LLM Status

2. **Workflow Performance** (Row 2)
   - Workflow Execution Rate (5m rate)
   - Workflow Error Rate (%)

3. **Cost & Usage** (Row 3)
   - API Costs (24h total)
   - Total Tokens Used (1h)
   - Active Errors
   - Request Status Distribution (pie chart)

4. **Resource Usage** (Row 4)
   - Container Memory Usage (stacked)
   - Container CPU Usage (stacked)

5. **Host Resources** (Row 5)
   - Host Memory Usage (gauge)
   - Host CPU Usage (gauge)
   - Disk Space Available (gauge)
   - Database Size
   - Database Growth Rate

**Auto-refresh**: 30 seconds
**Time Range**: Last 6 hours (configurable)

---

## Configuration

### Custom Metrics from PostgreSQL

The file `config/postgres-exporter-queries.yaml` defines custom metrics extracted from the FOAM database:

- **foam_workflow_executions**: Execution counts by workflow and status
- **foam_error_count**: Unresolved errors by type
- **foam_request_status**: Request counts by status and format
- **foam_active_workflows**: Active and in-progress requests
- **foam_review_queue**: Reviews by approval status
- **foam_database_size**: Database size and record counts

### Modifying Alert Thresholds

Edit `config/alerting-rules.yml`:

```yaml
# Example: Change high memory threshold from 85% to 90%
- alert: HighMemoryUsage
  expr: |
    (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.90  # Changed
  for: 5m
```

Reload Prometheus configuration:
```bash
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Changing Data Retention

Edit `docker-compose.monitoring.yml`:

```yaml
prometheus:
  command:
    - '--storage.tsdb.retention.time=90d'  # Change from 30d to 90d
```

Restart Prometheus:
```bash
docker-compose -f docker-compose.monitoring.yml up -d prometheus
```

### Adding Custom Dashboards

1. Create dashboard in Grafana UI
2. Export JSON: **Dashboard Settings** → **JSON Model**
3. Save to `config/grafana/dashboards/your-dashboard.json`
4. Dashboard will auto-load on next Grafana restart

---

## Troubleshooting

### Grafana Won't Load Dashboard

**Symptom**: Dashboard not appearing in Grafana

**Solutions**:
1. Check provisioning path is correct:
   ```bash
   docker exec foam-grafana ls /etc/grafana/provisioning/dashboards/
   ```

2. Check Grafana logs:
   ```bash
   docker logs foam-grafana
   ```

3. Manually import dashboard:
   - Grafana → **Dashboards** → **Import**
   - Upload `config/grafana/dashboards/foam-overview.json`

### No Data in Prometheus

**Symptom**: Prometheus shows "No data"

**Solutions**:
1. Verify targets are reachable:
   - Open http://localhost:9090/targets
   - All targets should be "UP"

2. Check if metrics exist:
   - Open http://localhost:9090/graph
   - Query: `up`
   - Should show all services

3. Check Prometheus logs:
   ```bash
   docker logs foam-prometheus
   ```

### Postgres Exporter Failing

**Symptom**: Postgres metrics not available

**Solutions**:
1. Verify database credentials:
   ```bash
   docker logs foam-postgres-exporter
   ```

2. Test database connection:
   ```bash
   docker exec foam-postgres-exporter psql postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/n8n -c "SELECT 1"
   ```

3. Check custom query syntax:
   - Review `config/postgres-exporter-queries.yaml`
   - Ensure queries are valid SQL

### High Memory Usage by Prometheus

**Symptom**: Prometheus consuming excessive memory

**Solutions**:
1. Reduce retention time (default 30d):
   ```yaml
   - '--storage.tsdb.retention.time=15d'
   ```

2. Reduce cardinality by filtering metrics:
   ```yaml
   metric_relabel_configs:
     - source_labels: [__name__]
       regex: 'unwanted_metric_.*'
       action: drop
   ```

3. Increase scrape intervals for low-priority jobs

### cAdvisor Not Starting (Windows)

**Symptom**: cAdvisor fails on Windows Docker Desktop

**Solution**: cAdvisor has limited Windows support. Consider:
- Use native container metrics: `docker stats`
- Deploy monitoring on Linux host
- Use alternative: Windows Exporter

---

## Advanced Topics

### Setting Up Alertmanager

To receive alert notifications:

1. Create `config/alertmanager.yml`:
```yaml
global:
  resolve_timeout: 5m

route:
  receiver: 'email'

receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@your-domain.com'
        from: 'prometheus@your-domain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

2. Add to `docker-compose.monitoring.yml`:
```yaml
alertmanager:
  image: prom/alertmanager:latest
  ports:
    - "9093:9093"
  volumes:
    - ./config/alertmanager.yml:/etc/alertmanager/alertmanager.yml
```

3. Uncomment alerting section in `config/prometheus.yml`

### Custom Workflow Metrics Exporter

To expose workflow-specific metrics, create a Python exporter:

**File**: `exporters/workflow-exporter/exporter.py`
```python
from prometheus_client import start_http_server, Gauge
import psycopg2
import time

# Define metrics
workflow_executions = Gauge('foam_workflow_executions_total',
                            'Total workflow executions',
                            ['workflow_name', 'status'])

# Connect to database and export metrics
# (Implementation details in separate guide)
```

---

## Backup and Recovery

### Backup Prometheus Data

```bash
# Stop Prometheus
docker-compose -f docker-compose.monitoring.yml stop prometheus

# Backup data
docker run --rm -v foam-n8n-implementation_prometheus_data:/data \
  -v $(pwd)/backups:/backup alpine \
  tar czf /backup/prometheus-$(date +%Y%m%d).tar.gz /data

# Start Prometheus
docker-compose -f docker-compose.monitoring.yml start prometheus
```

### Backup Grafana Dashboards

```bash
# Export all dashboards
docker exec foam-grafana grafana-cli admin export-dashboards \
  --path=/var/lib/grafana/dashboards

# Copy to host
docker cp foam-grafana:/var/lib/grafana/dashboards ./backups/
```

---

## Performance Tuning

### Optimize for Large-Scale Deployments

1. **Increase scrape intervals**:
   ```yaml
   scrape_interval: 30s  # Instead of 15s
   ```

2. **Limit metric retention**:
   ```yaml
   - '--storage.tsdb.retention.size=10GB'
   ```

3. **Enable compression**:
   ```yaml
   - '--storage.tsdb.wal-compression'
   ```

4. **Use recording rules** for expensive queries:
   ```yaml
   - record: job:workflow_error_rate:5m
     expr: |
       sum(rate(foam_workflow_errors_total[5m]))
       /
       sum(rate(foam_workflow_executions_total[5m]))
   ```

---

## Security Considerations

1. **Change default Grafana password** immediately
2. **Restrict Prometheus port** (9090) to internal network only
3. **Use TLS** for Grafana (configured via Traefik labels)
4. **Rotate database credentials** regularly
5. **Limit Grafana user permissions** (create read-only viewers)

---

## Support and Further Reading

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Postgres Exporter](https://github.com/prometheus-community/postgres_exporter)
- [cAdvisor](https://github.com/google/cadvisor)

For FOAM-specific monitoring questions, refer to the main documentation.
