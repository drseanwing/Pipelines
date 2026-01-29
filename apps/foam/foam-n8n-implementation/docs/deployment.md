# FOAM N8N Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-01-25
**Status:** Complete (v1.0.0)

---

## Overview

This document provides deployment instructions for the FOAM N8N Multi-LLM Orchestration system.

See `IMPLEMENTATION_FRAMEWORK.md` Section 9 for detailed deployment specifications.

---

## Prerequisites

### Required Services
- Docker & Docker Compose
- PostgreSQL 14+
- N8N (self-hosted, version 1.82.0+)
- Ollama (for local models)

### API Keys Required
- Anthropic API key (for Claude)
- OpenAI API key (for GPT-4o)
- SerpAPI key (for web search)

---

## Quick Start

```bash
# 1. Clone repository and navigate to project
cd foam-n8n-implementation

# 2. Copy environment template
cp config/n8n-env.example .env

# 3. Edit .env with your credentials
# Set: N8N_USER, N8N_PASSWORD, N8N_HOST, POSTGRES_USER, POSTGRES_PASSWORD
# Add API keys: ANTHROPIC_API_KEY, OPENAI_API_KEY, SERP_API_KEY

# 4. Start services
docker-compose up -d

# 5. Pull Ollama models
docker exec ollama ollama pull llama3.2
docker exec ollama ollama pull mistral
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `config/n8n-env.example` | Environment variables template |
| `config/postgres-init.sql` | Database initialization |
| `config/ollama-models.txt` | Required Ollama models |

---

## Service URLs

| Service | Default URL |
|---------|-------------|
| N8N | http://localhost:5678 |
| PostgreSQL | localhost:5432 |
| Ollama | http://localhost:11434 |

---

## N8N Workflow Variables

After importing workflows, you must configure these N8N workflow variables. In N8N, navigate to **Settings > Variables** and create the following:

### Required Workflow ID Variables

After importing all workflows, get their IDs from the N8N interface and set these variables:

| Variable Name | Purpose | Example Value |
|--------------|---------|---------------|
| `CASE_BASED_WORKFLOW_ID` | ID of case-based.json workflow | `workflow_abc123` |
| `JOURNAL_CLUB_WORKFLOW_ID` | ID of journal-club.json workflow | `workflow_def456` |
| `CLINICAL_REVIEW_WORKFLOW_ID` | ID of clinical-review.json workflow | `workflow_ghi789` |
| `ERROR_HANDLER_WORKFLOW_ID` | ID of error-handler.json workflow | `workflow_err001` |
| `PUBMED_FETCH_WORKFLOW_ID` | ID of pubmed-fetch.json workflow | `workflow_pub001` |
| `WEB_SEARCH_WORKFLOW_ID` | ID of web-search.json workflow | `workflow_web001` |
| `FOAMED_CROSSREF_WORKFLOW_ID` | ID of foamed-crossref.json workflow | `workflow_foam01` |
| `EVIDENCE_SEARCH_WORKFLOW_ID` | ID of evidence-search.json workflow | `workflow_evi001` |
| `LOGGING_WORKFLOW_ID` | ID of logging.json workflow | `workflow_log001` |

### Optional Channel Variables

| Variable Name | Purpose | Default |
|--------------|---------|---------|
| `SLACK_CHANNEL_CONTENT` | Slack channel for content notifications | `#foam-content` |
| `SLACK_CHANNEL_ERRORS` | Slack channel for error alerts | `#foam-errors` |
| `SLACK_CHANNEL_WARNINGS` | Slack channel for warnings | `#foam-warnings` |

### Phase 3 Workflow Variables (Quality & Validation)

| Variable Name | Purpose | Example Value |
|--------------|---------|---------------|
| `VALIDATION_SYSTEM_WORKFLOW_ID` | ID of validation-system.json workflow | `workflow_val001` |
| `HITL_REVIEW_WORKFLOW_ID` | ID of hitl-review.json workflow | `workflow_hitl01` |
| `QA_AUTOMATION_WORKFLOW_ID` | ID of qa-automation.json workflow | `workflow_qa001` |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for notifications | `https://hooks.slack.com/...` |
| `REVIEWER_PORTAL_URL` | Base URL for reviewer feedback portal | `https://review.foam.edu` |
| `SMTP_HOST` | SMTP server for email notifications | `smtp.gmail.com` |

### Setting Up Workflow Variables

1. Import all workflows from `workflows/` directory
2. Note the assigned workflow ID for each (visible in URL or workflow settings)
3. Go to N8N **Settings > Variables**
4. Create each variable with the corresponding workflow ID
5. Test by triggering the orchestrator workflow

---

## N8N Credentials Configuration

Before importing workflows, configure these credentials in N8N **Settings > Credentials**:

### Required Credentials

| Credential Type | Name (must match) | Purpose |
|-----------------|-------------------|---------|
| `Anthropic API` | `Anthropic API` | Claude Sonnet/Opus access |
| `PostgreSQL` | `PostgreSQL` | Database connections |
| `HTTP Header Auth` | `Slack Webhook` | Slack notifications |
| `SMTP` | `SMTP Email` | Email notifications |

### Credential Setup Steps

1. Navigate to **Settings > Credentials** in N8N
2. Create each credential with the exact name shown above
3. The workflows reference credentials by name, not ID
4. Test each credential connection before importing workflows

### Note on Credential IDs

Workflows use credential name references that N8N resolves at runtime. If you see credential errors:
1. Verify credential names match exactly (case-sensitive)
2. Ensure credentials are activated and tested
3. Check the workflow's credential settings match your environment

---

## Prompt File Strategy

The workflows embed LLM prompts inline rather than loading from external files. This is intentional for:
- Simpler deployment (no file path dependencies)
- Atomic workflow exports
- Version control of prompts with workflows

If you need to update prompts:
1. Edit the workflow JSON directly
2. Or use N8N's built-in editor to modify the prompt text in agent nodes
3. The canonical prompt files in `prompts/` serve as documentation and templates

---

## Production Deployment

### Infrastructure Requirements

**Minimum Server Specifications:**
- **CPU:** 4 cores (x86_64 or ARM64)
- **RAM:** 8GB minimum
- **Storage:** 100GB SSD
- **OS:** Ubuntu 22.04 LTS, Debian 11+, or RHEL 8+
- **Docker:** Version 24.0+ with Docker Compose v2

**Recommended Production Specifications:**
- **CPU:** 8 cores (for concurrent LLM processing)
- **RAM:** 16GB (32GB if running Ollama with large models)
- **Storage:** 500GB SSD (NVMe preferred for database performance)
- **GPU:** Optional - NVIDIA GPU with 8GB+ VRAM for Ollama (significant performance boost)
- **Network:** 1Gbps dedicated connection

**Network Requirements:**
- **Port 80:** HTTP (redirects to 443)
- **Port 443:** HTTPS (N8N and webhook endpoints)
- **Port 5432:** PostgreSQL (internal only, no external access)
- **Port 11434:** Ollama (internal only)
- **Firewall:** Configure to allow only 80/443 from public internet

**Domain and DNS Setup:**
- Register a domain for your deployment (e.g., `foam.yourdomain.com`)
- Create DNS A record pointing to server public IP
- Recommended: Configure CAA record for Let's Encrypt
- Optional: Set up CDN (Cloudflare) for DDoS protection

---

### Step-by-Step Production Deployment

#### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose v2
sudo apt install docker-compose-plugin

# Reboot to apply changes
sudo reboot
```

#### 2. Clone Repository

```bash
# Create deployment directory
sudo mkdir -p /opt/foam
sudo chown $USER:$USER /opt/foam
cd /opt/foam

# Clone repository
git clone https://github.com/yourusername/foam-n8n-implementation.git
cd foam-n8n-implementation
```

#### 3. Configure Environment Variables

```bash
# Copy production environment template
cp config/n8n-env.example .env

# Edit .env with production values
nano .env
```

**Required Production Variables:**
```bash
# N8N Configuration
N8N_HOST=foam.yourdomain.com
N8N_PROTOCOL=https
N8N_PORT=443
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
WEBHOOK_URL=https://foam.yourdomain.com

# Database
POSTGRES_USER=foam_prod
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=foam_production

# API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
SERP_API_KEY=...

# SMTP for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASSWORD=...
```

#### 4. Generate Basic Auth Credentials

```bash
# Generate secure credentials for N8N
export N8N_USER="admin"
export N8N_PASSWORD=$(openssl rand -base64 24)

# Add to .env
echo "N8N_USER=$N8N_USER" >> .env
echo "N8N_PASSWORD=$N8N_PASSWORD" >> .env

# Save credentials securely
echo "$N8N_USER:$N8N_PASSWORD" > /opt/foam/.credentials
chmod 600 /opt/foam/.credentials
```

#### 5. Create Required Directories

```bash
# Create data directories with correct permissions
mkdir -p data/{n8n,postgres,ollama,grafana,prometheus}
mkdir -p logs backups ssl

# Set permissions
chmod 755 data/
chmod 700 data/postgres
```

#### 6. Start Services with Production Configuration

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d

# Verify all services are running
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs -f
```

#### 7. Import Workflows

```bash
# Wait for N8N to fully initialize (30-60 seconds)
sleep 60

# Access N8N at https://foam.yourdomain.com
# Login with credentials from step 4

# Import workflows via UI:
# 1. Settings > Import Workflows
# 2. Upload all .json files from workflows/ directory
# 3. Note the workflow IDs for each imported workflow
```

#### 8. Configure N8N Credentials

In N8N UI (**Settings > Credentials**):

1. **Anthropic API**
   - Name: `Anthropic API`
   - API Key: Your Anthropic key

2. **PostgreSQL**
   - Name: `PostgreSQL`
   - Host: `postgres`
   - Port: `5432`
   - Database: `foam_production`
   - User: From .env `POSTGRES_USER`
   - Password: From .env `POSTGRES_PASSWORD`

3. **Slack Webhook** (if using Slack notifications)
   - Name: `Slack Webhook`
   - Webhook URL: Your Slack incoming webhook

4. **SMTP Email**
   - Name: `SMTP Email`
   - Host: From .env `SMTP_HOST`
   - User/Password: From .env

#### 9. Test Webhook Endpoints

```bash
# Test orchestrator workflow
curl -X POST https://foam.yourdomain.com/webhook/orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "test-001",
    "request_type": "case_based_reasoning",
    "clinical_case": "Patient presents with chest pain",
    "user_id": "test_user"
  }'

# Check N8N executions for success
# Monitor logs
docker compose -f docker-compose.prod.yml logs -f n8n
```

---

### Scaling Considerations

#### N8N Queue Mode with Redis

For high-throughput deployments, enable queue mode:

```yaml
# Add to docker-compose.prod.yml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - ./data/redis:/data
    restart: unless-stopped

  n8n-main:
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_HEALTH_CHECK_ACTIVE=true

  n8n-worker-1:
    extends: n8n-main
    command: worker
    deploy:
      replicas: 3
```

#### Worker Scaling

```bash
# Scale N8N workers based on load
docker compose -f docker-compose.prod.yml up -d --scale n8n-worker=5

# Monitor worker performance
docker stats n8n-worker-1 n8n-worker-2 n8n-worker-3
```

#### PostgreSQL Optimization

Add to `config/postgres-init.sql`:

```sql
-- Production tuning (adjust for your server specs)
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '20MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';
```

#### Ollama GPU Scaling

For GPU acceleration:

```yaml
# docker-compose.prod.yml
services:
  ollama:
    image: ollama/ollama:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
```

---

### Backup Strategy

#### Daily Automated Backups

Create backup script at `/opt/foam/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/foam/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
docker exec postgres pg_dump -U foam_prod foam_production | gzip > \
  $BACKUP_DIR/postgres_$TIMESTAMP.sql.gz

# Backup N8N data
tar -czf $BACKUP_DIR/n8n_data_$TIMESTAMP.tar.gz -C /opt/foam/data n8n/

# Backup workflows (JSON exports)
tar -czf $BACKUP_DIR/workflows_$TIMESTAMP.tar.gz -C /opt/foam workflows/

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

Add to cron:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/foam/scripts/backup.sh >> /opt/foam/logs/backup.log 2>&1
```

#### Off-Site Backup Recommendations

**Option 1: S3/Glacier**
```bash
# Install AWS CLI
pip install awscli

# Sync backups to S3
aws s3 sync /opt/foam/backups s3://foam-backups/$(hostname)/
```

**Option 2: Rsync to remote server**
```bash
# Add to backup script
rsync -avz --delete /opt/foam/backups/ \
  backup-server:/backups/foam/$(hostname)/
```

#### Backup Verification

Monthly verification script:

```bash
#!/bin/bash
# Test latest backup restore
LATEST_BACKUP=$(ls -t /opt/foam/backups/postgres_*.sql.gz | head -1)

# Create test database
docker exec postgres createdb -U foam_prod test_restore

# Restore backup
gunzip -c $LATEST_BACKUP | docker exec -i postgres \
  psql -U foam_prod test_restore

# Verify table count
docker exec postgres psql -U foam_prod test_restore -c "\dt" | grep -c "public"

# Cleanup
docker exec postgres dropdb -U foam_prod test_restore
```

#### Disaster Recovery Steps

1. **Provision new server** with same specifications
2. **Install Docker and dependencies**
3. **Restore repository**: `git clone ...`
4. **Restore environment**: Copy `.env` from secure backup
5. **Restore data**:
   ```bash
   # Restore PostgreSQL
   gunzip -c postgres_backup.sql.gz | docker exec -i postgres psql -U foam_prod

   # Restore N8N data
   tar -xzf n8n_data_backup.tar.gz -C /opt/foam/data/
   ```
6. **Start services**: `docker compose -f docker-compose.prod.yml up -d`
7. **Verify functionality**: Run test webhooks

---

### Monitoring Setup

#### Enable Monitoring Stack

The production compose includes Prometheus + Grafana:

```bash
# Ensure monitoring services are enabled
docker compose -f docker-compose.prod.yml up -d grafana prometheus

# Verify services
docker compose ps grafana prometheus
```

#### Dashboard Access

- **Grafana**: `https://foam.yourdomain.com/grafana`
- **Default credentials**: admin / admin (change immediately)
- **Pre-configured dashboards**: Import from `config/grafana/dashboards/`

**Available Dashboards:**
1. **N8N Performance** - Workflow execution metrics
2. **PostgreSQL Health** - Database performance
3. **System Resources** - CPU, RAM, disk usage
4. **LLM Usage** - API calls, costs, latency

#### Alert Configuration

Configure Grafana alerts for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Disk usage | >85% | Email + Slack |
| PostgreSQL connections | >150 | Slack warning |
| Workflow failure rate | >5% in 1h | Email + PagerDuty |
| N8N response time | >30s p95 | Slack warning |
| Database lag | >5s | Email |

#### Key Metrics to Watch

**N8N Metrics:**
- `n8n_workflow_executions_total` - Total execution count
- `n8n_workflow_execution_duration_seconds` - Execution time
- `n8n_workflow_execution_status` - Success/failure rate

**PostgreSQL Metrics:**
- `pg_stat_database_tup_fetched` - Query performance
- `pg_stat_database_deadlocks` - Deadlock count
- `pg_database_size_bytes` - Database growth

**System Metrics:**
- `node_cpu_seconds_total` - CPU usage
- `node_memory_MemAvailable_bytes` - Available RAM
- `node_filesystem_avail_bytes` - Disk space

---

### Security Hardening

**See [security-hardening.md](security-hardening.md) for comprehensive security guide.**

**Production Security Checklist:**

- [ ] SSL/TLS enabled with valid certificate (Let's Encrypt auto-renewal)
- [ ] Firewall configured (only ports 80/443 public)
- [ ] Strong N8N credentials (20+ characters, random)
- [ ] PostgreSQL password rotated (32+ characters)
- [ ] Docker socket secured (no TCP exposure)
- [ ] Environment variables secured (600 permissions on .env)
- [ ] Regular security updates enabled
- [ ] Fail2ban installed for brute-force protection
- [ ] Database backups encrypted
- [ ] API keys stored in secrets manager (not .env)
- [ ] Rate limiting enabled on webhooks
- [ ] CORS configured restrictively
- [ ] Security headers configured (HSTS, CSP, X-Frame-Options)
- [ ] Audit logging enabled
- [ ] Two-factor authentication enabled for N8N

---

### Maintenance

#### Log Rotation

Configure Docker log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker: `sudo systemctl restart docker`

#### Database Maintenance

Weekly vacuum script (`/opt/foam/scripts/db-maintenance.sh`):

```bash
#!/bin/bash
# Vacuum and analyze PostgreSQL
docker exec postgres psql -U foam_prod foam_production -c "VACUUM ANALYZE;"

# Reindex for performance
docker exec postgres psql -U foam_prod foam_production -c "REINDEX DATABASE foam_production;"
```

Add to cron:
```bash
# Weekly maintenance on Sunday at 3 AM
0 3 * * 0 /opt/foam/scripts/db-maintenance.sh >> /opt/foam/logs/maintenance.log 2>&1
```

#### Certificate Renewal

SSL certificates auto-renew via Let's Encrypt in `docker-compose.prod.yml`:

```yaml
services:
  certbot:
    image: certbot/certbot
    volumes:
      - ./ssl:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

Manual renewal if needed:
```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

#### Update Procedures

**Monthly Update Checklist:**

1. **Backup before updating**:
   ```bash
   /opt/foam/scripts/backup.sh
   ```

2. **Pull latest code**:
   ```bash
   cd /opt/foam/foam-n8n-implementation
   git pull origin main
   ```

3. **Update Docker images**:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   ```

4. **Apply migrations** (if any):
   ```bash
   # Check for database schema changes
   docker exec postgres psql -U foam_prod foam_production -f /sql/migrations/latest.sql
   ```

5. **Restart services**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

6. **Verify functionality**:
   ```bash
   # Test orchestrator endpoint
   curl -X POST https://foam.yourdomain.com/webhook/orchestrator \
     -H "Content-Type: application/json" \
     -d '{"request_id":"health-check"}'
   ```

7. **Monitor for 24 hours** via Grafana dashboards

---

**Note:** Production deployment features complete as of v1.0.0. All TODO items from Iteration 10 have been implemented.

---

## Related Documentation

- [IMPLEMENTATION_FRAMEWORK.md](../IMPLEMENTATION_FRAMEWORK.md) - Master specification
- [troubleshooting.md](troubleshooting.md) - Common issues and solutions
- [security-hardening.md](security-hardening.md) - Comprehensive security guide
- [config/n8n-env.example](../config/n8n-env.example) - Environment configuration

---

**Version:** 1.0.0 - Production Deployment Complete
**Last Updated:** 2025-01-25
