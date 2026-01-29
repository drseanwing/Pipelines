# FOAM N8N Security Hardening Guide

**Version:** 1.0.0
**Last Updated:** 2025-01-25
**Status:** Production-Ready

This document provides comprehensive security hardening guidance for the FOAM N8N Multi-LLM Orchestration system. It covers network security, authentication, encryption, container hardening, and compliance considerations for healthcare data.

---

## Table of Contents

1. [Network Security](#network-security)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Key Security](#api-key-security)
4. [Transport Security (TLS/SSL)](#transport-security-tlsssl)
5. [Container Security](#container-security)
6. [Database Security](#database-security)
7. [Monitoring & Logging](#monitoring--logging)
8. [Compliance Considerations](#compliance-considerations)
9. [Security Checklist](#security-checklist)
10. [Incident Response](#incident-response)

---

## Network Security

### Overview

The production deployment uses a multi-layered network architecture with Traefik as the reverse proxy and Docker network isolation to limit attack surface.

### Network Architecture

```
                    Internet (Untrusted)
                           |
                    ┌───────────────┐
                    │    Traefik    │ (Reverse Proxy)
                    │   (web network)
                    └───────────────┘
                     /         |        \
                    /          |         \
             ┌──────────┐  ┌───────────┐  ┌─────────┐
             │   N8N    │  │  Ollama   │  │ Metrics │
             │ (web)    │  │   (web)   │  │ (web)   │
             └──────────┘  └───────────┘  └─────────┘
                    |           |           |
             (internal network)
                    |           |
             ┌──────────┐  ┌─────────┐
             │Postgres  │  │  Redis  │
             └──────────┘  └─────────┘
```

### Docker Network Configuration

The production deployment defines two networks:

**1. Web Network (External Exposure)**
- Accessible through Traefik reverse proxy
- Contains: N8N, Ollama, Metrics endpoints
- Only HTTP/HTTPS traffic allowed

**2. Internal Network (Data Layer)**
- No external access
- Contains: PostgreSQL, Redis
- Only internal Docker communication

### Firewall Configuration (Linux/ufw)

```bash
# Initialize UFW
sudo ufw enable

# Allow only essential ports
sudo ufw default deny incoming
sudo ufw default allow outgoing

# HTTP and HTTPS (only exposed ports)
sudo ufw allow 80/tcp comment "HTTP - Traefik"
sudo ufw allow 443/tcp comment "HTTPS - Traefik"

# SSH (restrict to your IP)
sudo ufw allow from YOUR.IP.ADDRESS to any port 22 comment "SSH"

# Docker internal communication (if needed from other servers)
# sudo ufw allow from 10.0.0.0/8 comment "Docker network"

# Verify rules
sudo ufw status verbose
```

### iptables Rules (Advanced)

For systems without UFW, use iptables directly:

```bash
# Drop all incoming traffic by default
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow SSH from specific IP
sudo iptables -A INPUT -p tcp -s YOUR.IP.ADDRESS --dport 22 -j ACCEPT

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
sudo ip6tables-save > /etc/iptables/rules.v6
```

### Network Isolation Verification

```bash
# Verify only web network is external
docker network inspect foam_web
# Should show N8N, Ollama, Traefik

docker network inspect foam_internal
# Should show PostgreSQL, Redis (no external access)

# Test that internal services are unreachable
curl http://localhost:5432   # Should fail - postgres not exposed
curl http://localhost:6379   # Should fail - redis not exposed
curl http://localhost:5678   # Should work through Traefik
```

### Database Access Control

PostgreSQL should ONLY be accessible to:
- N8N service (through Docker network)
- Backup tools (using host access with credentials)
- Monitoring agents (if enabled)

Never expose PostgreSQL port 5432 to external networks:

```bash
# WRONG - Exposes database to internet
# ports:
#   - "5432:5432"

# CORRECT - Internal network only
networks:
  - internal
# No ports exposed
```

### Redis Access Control

Redis should ONLY be accessible to:
- N8N service (through Docker network)
- N8N workers (through Docker network)

Redis has no built-in authentication in the provided config. For production with sensitive data:

```bash
# Add password authentication to Redis command
command: >
  redis-server
  --maxmemory 512mb
  --maxmemory-policy allkeys-lru
  --save 60 1
  --loglevel warning
  --requirepass ${REDIS_PASSWORD}
  --masterauth ${REDIS_PASSWORD}
```

Then configure N8N to use the password:

```bash
QUEUE_BULL_REDIS_PASSWORD=${REDIS_PASSWORD}
```

---

## Authentication & Authorization

### N8N Basic Authentication

N8N basic auth is enabled in both dev and production:

```yaml
environment:
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=${N8N_USER}
  - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
```

**Best Practices:**

```bash
# Generate strong credentials using OpenSSL
# Username: at least 8 characters, alphanumeric
openssl rand -base64 8

# Password: at least 16 characters, mixed case + numbers + symbols
openssl rand -base64 24

# Store in .env file (gitignored)
N8N_USER=foam_admin
N8N_PASSWORD=$(openssl rand -base64 32)

# Never commit .env to version control
echo ".env" >> .gitignore
```

### N8N User Management

For team deployments, create multiple N8N users:

```bash
# Access N8N container
docker exec -it foam_n8n sh

# Create new user (from N8N 1.0+)
n8n user:create --email=user@example.com --firstName=John --lastName=Doe

# Change user password
n8n user:change-password --email=user@example.com

# List users
n8n user:list
```

**User Roles:**
- **Admin:** Full access (1 recommended)
- **Editor:** Can create/modify workflows
- **Viewer:** Read-only access

### Traefik Dashboard Protection

Traefik dashboard provides operational insights and should be protected:

```yaml
# In docker-compose.prod.yml - already configured
traefik:
  labels:
    - traefik.http.routers.traefik.middlewares=traefik-auth
    - traefik.http.middlewares.traefik-auth.basicauth.users=${TRAEFIK_BASIC_AUTH}
```

Generate htpasswd credentials:

```bash
# Install apache2-utils if needed
sudo apt-get install apache2-utils

# Generate credentials (user: admin, password: YOUR_PASSWORD)
htpasswd -nb admin YOUR_PASSWORD

# Output format: admin:$apr1$r31....
# Escape $ for Docker: replace $ with $$
# Example: admin:$$apr1$$r31....

# Add to .env
TRAEFIK_BASIC_AUTH=admin:$$apr1$$r31....

# Verify access
curl -u admin:YOUR_PASSWORD https://traefik.yourdomain.com
```

### Ollama API Access Control

Ollama API is protected with basic auth via Traefik middleware:

```yaml
ollama:
  labels:
    - traefik.http.middlewares.ollama-auth.basicauth.users=${OLLAMA_BASIC_AUTH:-${TRAEFIK_BASIC_AUTH}}
```

**Usage from N8N:**
```javascript
// When calling Ollama API, include auth header
const auth = Buffer.from('username:password').toString('base64');
fetch('https://ollama.yourdomain.com/api/generate', {
  headers: {
    'Authorization': `Basic ${auth}`
  }
})
```

### Webhook Authentication

N8N webhooks should validate incoming requests:

**Option 1: Static Token**
```javascript
// In N8N webhook node - validate request
const expectedToken = $env.WEBHOOK_TOKEN;
const incomingToken = $request.headers.authorization?.split(' ')[1];

if (!incomingToken || incomingToken !== expectedToken) {
    return {
        statusCode: 401,
        body: { error: 'Unauthorized' }
    };
}

// Process request
```

**Option 2: HMAC Signature**
```javascript
// Sender: Sign payload with shared secret
const crypto = require('crypto');
const secret = process.env.WEBHOOK_SECRET;
const payload = JSON.stringify(body);
const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

// Send header: X-Signature: sha256=<signature>

// Receiver (N8N): Verify signature
const crypto = require('crypto');
const secret = $env.WEBHOOK_SECRET;
const signature = $request.headers['x-signature'];
const payload = $request.body;

const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

if (signature !== `sha256=${expected}`) {
    return { statusCode: 401, body: { error: 'Invalid signature' } };
}
```

---

## API Key Security

### Key Storage Best Practices

API keys for external services (Anthropic, OpenAI, SerpAPI) are highly sensitive. Never:
- Commit to version control
- Log in error messages
- Expose in client-side code
- Share via email or chat

### Environment Variable Management

```bash
# .env file structure
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SERP_API_KEY=...
NCBI_API_KEY=...

# Permissions
chmod 600 .env
chown root:root .env

# Verify no key exposure
git log --all --full-history -p -- .env
# Should show no API keys in history
```

### Docker Secrets (Production Alternative)

For high-security deployments, use Docker secrets instead of environment variables:

```bash
# Create secrets (in Docker swarm mode)
echo "sk-ant-..." | docker secret create anthropic_key -

# Reference in docker-compose.prod.yml
services:
  n8n:
    secrets:
      - anthropic_key
      - openai_key
    environment:
      ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic_key
```

### HashiCorp Vault Integration

For advanced deployments:

```bash
# Install Vault
vault login -method=ldap username=admin

# Store API keys in Vault
vault kv put secret/foam/anthropic key=sk-ant-...
vault kv put secret/foam/openai key=sk-...

# Retrieve and inject via wrapper script
#!/bin/bash
export ANTHROPIC_API_KEY=$(vault kv get -field=key secret/foam/anthropic)
export OPENAI_API_KEY=$(vault kv get -field=key secret/foam/openai)
docker-compose up -d
```

### Key Rotation Procedures

Implement regular key rotation (quarterly recommended):

```bash
#!/bin/bash
# rotate-keys.sh - Key rotation script

# 1. Generate new keys from provider dashboards (Anthropic, OpenAI, etc.)
# 2. Update .env with new keys
# 3. Verify new keys work
docker-compose restart n8n
sleep 30
docker-compose logs n8n | grep "successfully initialized"

# 4. Deactivate old keys from provider
# 5. Document rotation in audit log
echo "$(date): Rotated API keys for FOAM system" >> /var/log/foam-security.log

# 6. Notify team
# mail -s "API Keys Rotated" team@example.com
```

### Secrets Scanning in CI/CD

Use tools to prevent accidental key commits:

```bash
# Install pre-commit hook
pip install detect-secrets

# Scan repository
detect-secrets scan --baseline .secrets.baseline

# Before commit, pre-commit hook blocks secrets
git commit -m "Add new feature"  # Fails if secrets detected

# Configure in .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

---

## Transport Security (TLS/SSL)

### Let's Encrypt Automatic Certificates

The production deployment uses Traefik with automatic Let's Encrypt integration:

```yaml
traefik:
  command:
    - --certificatesresolvers.letsencrypt.acme.email=${LETSENCRYPT_EMAIL}
    - --certificatesresolvers.letsencrypt.acme.storage=/acme.json
    - --certificatesresolvers.letsencrypt.acme.tlschallenge=true
```

**Setup:**

```bash
# 1. Create acme.json for certificate storage
touch ./traefik/acme.json
chmod 600 ./traefik/acme.json

# 2. Configure DNS to point to your server
# yourdomain.com A record -> YOUR.SERVER.IP

# 3. Set environment variables
DOMAIN=yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com

# 4. Deploy
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify certificate
docker-compose exec traefik ls -la /acme.json
# Should see recent certificate file
```

### Certificate Renewal

Let's Encrypt certificates are valid for 90 days. Traefik automatically renews before expiration:

```bash
# Check renewal status
docker-compose logs traefik | grep "Renewing"

# Manual renewal (if needed)
docker-compose exec traefik traefik healthcheck
# Output: healthz ok → certificates valid
```

### HSTS (HTTP Strict Transport Security)

Already configured in Traefik middleware:

```yaml
traefik.http.middlewares.security-headers.headers.stsSeconds=31536000
traefik.http.middlewares.security-headers.headers.stsIncludeSubdomains=true
traefik.http.middlewares.security-headers.headers.stsPreload=true
```

This enforces HTTPS for 1 year and includes all subdomains.

### Custom Certificate (Self-Signed for Internal Use)

If using self-signed certificates (NOT recommended for production):

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
    -out /path/to/cert.pem \
    -keyout /path/to/key.pem \
    -days 365

# Configure in Traefik
volumes:
  - ./traefik/cert.pem:/certs/cert.pem:ro
  - ./traefik/key.pem:/certs/key.pem:ro

# Clients must accept untrusted certificate warning
```

### TLS Version Enforcement

Ensure only TLS 1.2+ is supported (no SSL 3.0, TLS 1.0, 1.1):

```yaml
# In Traefik config
entryPoints:
  websecure:
    tls:
      minVersion: VersionTLS12
      # Optional: set specific version
      # maxVersion: VersionTLS13
```

### Certificate Pinning (Optional)

For high-security deployments, implement certificate pinning in clients:

```javascript
// Example: N8N making API call to external service
const https = require('https');
const tls = require('tls');

const agent = new https.Agent({
  ca: [fs.readFileSync('./certs/pinned-cert.pem')],
  rejectUnauthorized: true
});

https.get('https://api.anthropic.com/...', { agent }, callback);
```

---

## Container Security

### Read-Only Root Filesystem

Restrict container filesystem writes to improve security:

```yaml
n8n:
  read_only: true
  volumes:
    - n8n_data:/home/node/.n8n  # Writable mount
    - /tmp                        # Temporary storage
  tmpfs:
    - /run
```

**Verify:**
```bash
docker-compose exec n8n touch /test.txt
# Output: Read-only file system error
```

### Non-Root User Execution

Containers should not run as root:

```yaml
n8n:
  user: "node:node"  # Run as node user (built-in to n8n image)

# Verify
docker-compose exec n8n whoami
# Output: node
```

For custom images:

```dockerfile
FROM node:18-alpine
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser
USER appuser
```

### Resource Limits

Prevent DoS attacks by limiting container resources:

```yaml
services:
  n8n:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M
```

### Security Context Capabilities

Drop unnecessary Linux capabilities:

```yaml
n8n:
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE
    - CHOWN
    - SETUID
    - SETGID
  security_opt:
    - no-new-privileges:true
```

### Disable Privilege Escalation

```yaml
security_opt:
  - no-new-privileges:true
```

**Verify:**
```bash
docker inspect foam_n8n | grep -A 5 SecurityOpt
```

### Image Scanning

Scan container images for known vulnerabilities:

```bash
# Using Trivy (https://github.com/aquasecurity/trivy)
trivy image n8nio/n8n:latest
trivy image postgres:14-alpine
trivy image redis:7-alpine

# Output shows CVEs with severity levels
# CRITICAL, HIGH, MEDIUM, LOW
```

### Secure Image Registry

Use private registries for custom images:

```bash
# Login to Docker registry
docker login registry.example.com

# Tag image
docker tag foam-n8n:v1 registry.example.com/foam/n8n:v1

# Push to registry
docker push registry.example.com/foam/n8n:v1

# Configure docker-compose
services:
  n8n:
    image: registry.example.com/foam/n8n:v1
    pull_policy: always
```

---

## Database Security

### PostgreSQL Authentication

Strong password authentication is essential:

```bash
# Generate strong password
openssl rand -base64 32

# Configure in .env
POSTGRES_USER=foam
POSTGRES_PASSWORD=<generated_password>
```

### Connection Encryption (SSL)

Enable SSL connections to PostgreSQL:

```sql
-- In postgres-init.sql or after initialization
-- Create SSL certificate (if not using host SSL)
-- ALTER SYSTEM SET ssl = on;
-- SELECT pg_reload_conf();
```

For N8N connection with SSL:

```bash
# Environment variables
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_USER=foam
DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
DB_POSTGRESDB_DATABASE=n8n

# If SSL required:
# DB_POSTGRESDB_SSL_MODE=require
```

### Backup Encryption

Regular encrypted backups protect against data loss:

```bash
#!/bin/bash
# backup-postgres.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/n8n_$DATE.sql"

# Create backup
docker-compose -f docker-compose.prod.yml exec postgres \
    pg_dump -U foam n8n > "$BACKUP_FILE"

# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE"
# Prompts for passphrase

# Remove unencrypted backup
rm "$BACKUP_FILE"

# Verify encrypted backup
ls -lh "$BACKUP_FILE.gpg"

# Upload to secure storage
# aws s3 cp "$BACKUP_FILE.gpg" s3://foam-backups/

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.sql.gpg" -mtime +30 -delete
```

**Scheduled backups (cron):**

```bash
# Add to crontab (runs daily at 2 AM)
crontab -e

# Add line:
0 2 * * * /path/to/backup-postgres.sh >> /var/log/foam-backup.log 2>&1
```

### User Permissions

Restrict database user privileges:

```sql
-- Create read-only user for reporting
CREATE USER foam_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE n8n TO foam_readonly;
GRANT USAGE ON SCHEMA foam TO foam_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA foam TO foam_readonly;

-- Create application user with minimal privileges
CREATE USER foam WITH PASSWORD 'password';
GRANT USAGE ON SCHEMA foam TO foam;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA foam TO foam;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA foam TO foam;
```

### SQL Injection Prevention

N8N nodes automatically use parameterized queries. Example:

```javascript
// SAFE - Parameterized query
const result = await db.query(
    'SELECT * FROM foam.topic_requests WHERE request_id = $1',
    [requestId]
);

// UNSAFE - String concatenation (never do this)
const result = await db.query(
    `SELECT * FROM foam.topic_requests WHERE request_id = '${requestId}'`
);
```

### Connection Pooling

Limit concurrent connections:

```bash
# In postgresql.conf or via init script
max_connections = 200
superuser_reserved_connections = 10

# For N8N, reasonable defaults:
# Connection pool size: 10-20 connections
# Min idle connections: 2-5
```

### Credential Rotation

Rotate database credentials periodically:

```bash
#!/bin/bash
# rotate-db-credentials.sh

# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update password in database
docker-compose -f docker-compose.prod.yml exec postgres psql \
    -U postgres -c "ALTER USER foam WITH PASSWORD '$NEW_PASSWORD';"

# 3. Update .env
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" .env

# 4. Restart N8N to use new credentials
docker-compose -f docker-compose.prod.yml restart n8n

# 5. Wait for N8N to reconnect
sleep 10
docker-compose logs n8n | grep "database initialized"
```

---

## Monitoring & Logging

### Centralized Logging Setup

Collect logs from all services for security analysis:

```yaml
# In docker-compose.prod.yml
services:
  n8n:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "app=foam,component=n8n"
```

**View logs:**

```bash
# Stream logs
docker-compose logs -f n8n

# Search for errors
docker-compose logs n8n | grep ERROR

# Search for authentication failures
docker-compose logs traefik | grep "401\|Unauthorized"
```

### Security Event Logging

Log authentication and access events:

```bash
#!/bin/bash
# In N8N execution environment
# Enable audit logging for sensitive operations

# Example: Log all workflow executions
# configured via N8N settings
N8N_LOG_LEVEL=info
N8N_LOG_OUTPUT=console
```

**N8N log levels:**
- `silent` - No logs
- `debug` - Detailed debugging
- `info` - General information (recommended for production)
- `warn` - Warnings only
- `error` - Errors only

### Failed Authentication Monitoring

Monitor failed login attempts:

```bash
# Search Traefik logs for authentication failures
docker-compose logs traefik | grep "401\|403"

# Example alert if >10 failures in 1 hour:
# Contact security team

# Create alert script
#!/bin/bash
FAILURES=$(docker-compose logs traefik --since 1h | grep "401\|403" | wc -l)
if [ $FAILURES -gt 10 ]; then
    echo "Alert: $FAILURES authentication failures in past hour"
    # Send alert via email/slack
fi
```

### Rate Limiting Monitoring

Traefik rate limiting is configured:

```yaml
traefik.http.middlewares.rate-limit.ratelimit.average=100
traefik.http.middlewares.rate-limit.ratelimit.burst=50
traefik.http.middlewares.rate-limit.ratelimit.period=1m
```

This allows 100 requests/minute with bursts up to 50.

**For webhooks (higher limit):**
```yaml
traefik.http.middlewares.webhook-rate-limit.ratelimit.average=300
traefik.http.middlewares.webhook-rate-limit.ratelimit.burst=100
```

### Monitoring Stack Integration

For detailed monitoring, integrate with Prometheus/Grafana:

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
```

**Prometheus configuration (config/prometheus.yml):**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'traefik'
    static_configs:
      - targets: ['localhost:8082']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
```

### Log Retention Policy

Implement log retention to manage storage:

```bash
#!/bin/bash
# cleanup-logs.sh - Delete logs older than 90 days

CONTAINER_LOG_PATH="/var/lib/docker/containers"
find "$CONTAINER_LOG_PATH" \
    -name "*.log" \
    -mtime +90 \
    -delete

# Run via cron
# 0 0 * * 0 /path/to/cleanup-logs.sh
```

### Log Integrity (Optional - Syslog)

For sensitive environments, forward logs to centralized syslog server:

```bash
# Configure Docker to use syslog driver
# In docker-compose.prod.yml
services:
  n8n:
    logging:
      driver: "syslog"
      options:
        syslog-address: "udp://syslog.example.com:514"
        syslog-facility: "local0"
        tag: "foam-n8n"
```

---

## Compliance Considerations

### HIPAA Compliance (US Healthcare)

If handling Protected Health Information (PHI):

**Required Controls:**

1. **Encryption in Transit**
   - TLS 1.2+ for all connections (✓ Configured)
   - HSTS enforcement (✓ Configured)

2. **Encryption at Rest**
   ```bash
   # PostgreSQL encryption
   # Use encrypted volumes or LUKS
   sudo cryptsetup luksFormat /dev/sdb
   sudo cryptsetup luksOpen /dev/sdb encrypted_backup
   sudo mkfs.ext4 /dev/mapper/encrypted_backup

   # Mount encrypted volume
   mount /dev/mapper/encrypted_backup /backups
   ```

3. **Access Controls**
   - Strong authentication (✓ Basic auth configured)
   - Role-based access control (✓ N8N RBAC available)
   - Audit logging (✓ Recommended above)

4. **Audit Logs**
   - Log all access to PHI
   - Retain for 6+ years
   - Implement in database:

   ```sql
   -- Already defined in postgres-init.sql
   CREATE TABLE foam.audit_log (
       audit_id UUID PRIMARY KEY,
       entity_type VARCHAR(50),
       entity_id UUID,
       action VARCHAR(50),
       actor VARCHAR(255),
       changes JSONB,
       occurred_at TIMESTAMPTZ
   );
   ```

5. **Data Integrity**
   - Use checksums for backups
   - Verify data integrity after restoration
   ```bash
   # Backup with checksum
   md5sum backup.sql.gpg > backup.sql.gpg.md5

   # Verify integrity
   md5sum -c backup.sql.gpg.md5
   ```

6. **Business Associate Agreement (BAA)**
   - Require BAAs from: Anthropic, OpenAI, SerpAPI, AWS (if used)
   - Document in compliance matrix

**HIPAA Checklist:**
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Encryption at rest (volumes, backups)
- [ ] Access controls (authentication, RBAC)
- [ ] Audit logging (6+ years retention)
- [ ] Data integrity verification
- [ ] BAAs for third-party services
- [ ] Incident response plan
- [ ] Annual security risk assessment

### GDPR Compliance (EU/International)

If processing personal data of EU residents:

**Required Controls:**

1. **Data Minimization**
   - Only collect necessary data
   - Document business justification

2. **Purpose Limitation**
   - Use data only for stated purpose
   - Obtain explicit consent for new purposes

3. **Storage Limitation**
   - Implement data retention policies
   ```sql
   -- Delete old data after retention period
   DELETE FROM foam.topic_requests
   WHERE created_at < NOW() - INTERVAL '2 years';
   ```

4. **Right to Be Forgotten**
   - Implement data deletion:
   ```sql
   -- Cascade delete all related data
   DELETE FROM foam.topic_requests
   WHERE request_id = 'uuid';
   -- Automatically deletes drafts, reviews, audit records
   ```

5. **Data Subject Access Request (DSAR)**
   - Provide export function:
   ```sql
   SELECT row_to_json(*)
   FROM foam.topic_requests
   WHERE requestor->>'email' = 'subject@example.com';
   ```

6. **Data Protection Impact Assessment (DPIA)**
   - Required before processing high-risk personal data
   - Document in compliance folder

**GDPR Checklist:**
- [ ] Lawful basis for processing documented
- [ ] Explicit consent obtained (if required)
- [ ] Privacy policy published
- [ ] Data retention policy defined
- [ ] Right to deletion implemented
- [ ] DSAR procedure documented
- [ ] Data Protection Officer assigned (if required)
- [ ] International data transfer mechanisms (SCCs/BCRs)

### Australia Privacy Act

If handling personal information of Australian residents:

**Key Requirements:**

1. **Privacy Principles**
   - Collect only necessary information
   - Use and disclose for primary purpose
   - Data quality and accuracy
   - Openness about personal information handling

2. **Optout Provisions**
   - Allow marketing opt-out
   - Provide unsubscribe mechanism

3. **Breach Notification**
   - Notify Australians of eligible data breaches
   - Notify Privacy Commissioner if serious risk

**Implementation:**
```bash
# Document privacy handling
# Create PRIVACY.md with:
# - What data collected
# - Why collected (lawful basis)
# - How long retained
# - Who has access
# - Security measures
# - Right to opt-out
# - Contact for privacy inquiries
```

### Data Residency Requirements

Some jurisdictions require data to remain within borders:

```yaml
# Deploy in specific region (Australia example)
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # Ensure /var/lib/postgresql/data is on Australian server

  # Use only Australian endpoints for:
  # - API keys (if provider allows regional selection)
  # - Backups (store in Australian S3 bucket)
  # - Logs (forward to Australian syslog)
```

---

## Security Checklist

### Pre-Deployment Security Verification

**Network Security**
- [ ] Firewall configured to allow only 80/443
- [ ] Database ports (5432, 6379) not exposed externally
- [ ] Network isolation verified (docker network inspect)
- [ ] SSH restricted to specific IP addresses
- [ ] No default credentials in firewall rules

**Authentication & Authorization**
- [ ] N8N basic auth enabled with strong credentials
- [ ] Traefik dashboard protected with basic auth
- [ ] Ollama API protected with basic auth
- [ ] Webhook authentication implemented
- [ ] N8N user roles configured appropriately

**API Keys & Secrets**
- [ ] No API keys in source code (checked with detect-secrets)
- [ ] .env file created with all secrets
- [ ] .env excluded from git (.gitignore)
- [ ] API keys rotated before first deployment
- [ ] Backup of initial API keys secured offline

**Transport Security**
- [ ] Let's Encrypt certificates configured
- [ ] HSTS headers enabled
- [ ] TLS 1.2+ enforced (no SSL 3.0, TLS 1.0/1.1)
- [ ] Certificate renewal tested
- [ ] HTTPS redirect enabled for HTTP traffic

**Container Security**
- [ ] All images scanned for vulnerabilities (trivy)
- [ ] Containers run as non-root users
- [ ] Resource limits configured
- [ ] Unnecessary capabilities dropped
- [ ] Read-only filesystem enabled where possible
- [ ] No privileged containers

**Database Security**
- [ ] PostgreSQL password meets complexity requirements
- [ ] Database backups encrypted
- [ ] Backup encryption key secured offline
- [ ] User permissions follow least privilege principle
- [ ] Connection pooling configured
- [ ] SQL injection prevention verified (parameterized queries)

**Monitoring & Logging**
- [ ] Logging configured for all services
- [ ] Security event logging enabled
- [ ] Failed authentication alerts configured
- [ ] Rate limiting monitored
- [ ] Log retention policy defined
- [ ] Audit logging database schema verified

**Compliance**
- [ ] Applicable compliance framework identified (HIPAA/GDPR/etc)
- [ ] Required controls documented
- [ ] Privacy policy created
- [ ] Data retention policy defined
- [ ] Incident response plan drafted
- [ ] Risk assessment completed

**Operational**
- [ ] Backup procedure tested (restore verified)
- [ ] Key rotation procedure documented
- [ ] Incident response escalation path defined
- [ ] Security contact information current
- [ ] Regular security audit scheduled (quarterly recommended)

### Ongoing Security Tasks

**Weekly**
- [ ] Review authentication logs for suspicious activity
- [ ] Monitor rate limiting alerts
- [ ] Check for any service downtime or errors

**Monthly**
- [ ] Test backup restoration
- [ ] Review and audit user access
- [ ] Update vulnerability scanning reports
- [ ] Check certificate expiration status

**Quarterly**
- [ ] Rotate API keys
- [ ] Security audit of network configuration
- [ ] Review audit logs for anomalies
- [ ] Update firewall rules if needed
- [ ] Penetration test (if resources available)

**Annually**
- [ ] Full security assessment
- [ ] Update documentation
- [ ] Rotate database credentials
- [ ] Review and update incident response plan
- [ ] Compliance audit

---

## Incident Response

### Security Incident Classification

**Severity Levels:**

**Critical:** Immediate threat to data or system
- Active data breach
- Ransomware infection
- Unauthorized administrative access
- Service unavailable due to attack

**High:** Potential breach or significant risk
- Unauthorized API key access
- Multiple failed authentication attempts
- Suspicious process execution
- Significant resource consumption

**Medium:** Notable security issue
- Failed security control
- Minor unauthorized access attempt
- Configuration drift
- Unpatched vulnerability found

**Low:** Informational or minor issue
- Failed security alert
- Configuration change
- Non-critical vulnerability

### Incident Response Procedure

**1. Detect & Alert**
```bash
# Automated alerts for:
# - 10+ failed auth attempts in 1 hour
# - Unusual API key usage pattern
# - Certificate renewal failure
# - Database connection failure
# - Rate limit threshold exceeded
```

**2. Containment (Immediate)**
```bash
# For suspected compromise:

# Option A: Stop affected service
docker-compose -f docker-compose.prod.yml stop n8n

# Option B: Revoke API key access
# Remove ANTHROPIC_API_KEY from environment
# Restart service without external API access

# Option C: Isolate network
sudo ufw deny from ATTACKER.IP
```

**3. Investigation (Within 1 Hour)**
```bash
# Preserve evidence
docker-compose logs n8n > /tmp/n8n-logs-$(date +%s).txt
docker-compose logs traefik > /tmp/traefik-logs-$(date +%s).txt

# Check for unauthorized changes
docker-compose config > /tmp/compose-config-$(date +%s).yml

# Review database audit log
docker-compose exec postgres psql -U foam n8n -c \
  "SELECT * FROM foam.audit_log WHERE occurred_at > NOW() - INTERVAL '1 hour' ORDER BY occurred_at DESC;"

# Check for data exfiltration
docker exec foam_postgres pg_dump -U foam n8n | md5sum
# Compare with known good hash
```

**4. Notification (Within 2 Hours)**
```bash
#!/bin/bash
# notify-incident.sh

INCIDENT_TIME=$(date)
AFFECTED_SYSTEMS="N8N, PostgreSQL"
SEVERITY="High"

# Email incident response team
mail -s "SECURITY INCIDENT: $SEVERITY - $AFFECTED_SYSTEMS" \
  security@example.com << EOF
Time: $INCIDENT_TIME
Severity: $SEVERITY
Affected Systems: $AFFECTED_SYSTEMS
Description: [Incident details]
Action Taken: [Containment steps]
Next Steps: [Investigation plan]
EOF

# If HIPAA/GDPR relevant, check notification requirements
# HIPAA: Notify affected individuals if PHI breach
# GDPR: Notify data subjects and DPA within 72 hours
```

**5. Remediation (Ongoing)**
```bash
# Rotate all credentials
./rotate-keys.sh
./rotate-db-credentials.sh

# Update firewall rules
sudo ufw deny from ATTACKER.IP/32 comment "Incident response"

# Patch systems
docker-compose pull
docker-compose up -d

# Restore from clean backup if needed
# See database restore procedure below

# Enable enhanced monitoring
docker-compose down
# Edit docker-compose.prod.yml to increase log verbosity
N8N_LOG_LEVEL=debug
docker-compose up -d
```

**6. Recovery (Hours to Days)**
```bash
# Verify services operational
docker-compose exec n8n /bin/sh -c "curl -f http://localhost:5678/healthz"

# Verify data integrity
docker-compose exec postgres \
  pg_dump -U foam n8n | md5sum

# Compare with backup md5
cat backups/latest.sql.md5

# Run security scan
trivy image n8nio/n8n:latest
```

**7. Post-Incident (Within 1 Week)**
```bash
# Conduct post-mortem
# 1. Timeline of events
# 2. Root cause analysis
# 3. Lessons learned
# 4. Preventive measures
# 5. Process improvements

# Document in:
# /tmp/incident-YYYY-MM-DD-postmortem.md

# Update security controls
# - Enhanced monitoring
# - Additional firewall rules
# - Process documentation
```

### Database Disaster Recovery

**Restore from encrypted backup:**

```bash
#!/bin/bash
# restore-database.sh <backup_file.sql.gpg>

BACKUP_FILE=$1
RESTORE_DIR="/tmp"
RESTORE_FILE="$RESTORE_DIR/restore-$(date +%s).sql"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Decrypting backup..."
gpg --decrypt "$BACKUP_FILE" > "$RESTORE_FILE"
# Prompts for passphrase

echo "Stopping N8N..."
docker-compose -f docker-compose.prod.yml stop n8n

echo "Dropping current database..."
docker-compose -f docker-compose.prod.yml exec postgres \
    psql -U postgres -c "DROP DATABASE n8n;"

echo "Creating new database..."
docker-compose -f docker-compose.prod.yml exec postgres \
    psql -U postgres -c "CREATE DATABASE n8n OWNER foam;"

echo "Restoring from backup..."
docker-compose -f docker-compose.prod.yml exec -T postgres \
    psql -U foam n8n < "$RESTORE_FILE"

echo "Verifying restore..."
docker-compose -f docker-compose.prod.yml exec postgres \
    psql -U foam n8n -c "SELECT COUNT(*) FROM foam.topic_requests;"

echo "Restarting N8N..."
docker-compose -f docker-compose.prod.yml up -d n8n

# Cleanup
rm "$RESTORE_FILE"

echo "Restore complete"
```

### Key Compromise Response

**If API key exposed:**

```bash
#!/bin/bash
# respond-to-key-compromise.sh <exposed_key_name>

KEY_NAME=$1

# 1. Immediately disable key (in provider dashboard)
echo "Action: Disable $KEY_NAME in provider dashboard"

# 2. Check for unauthorized usage
docker-compose logs n8n | grep "$KEY_NAME" | tail -20

# 3. Stop service to prevent further usage
docker-compose -f docker-compose.prod.yml stop n8n

# 4. Generate new key from provider
echo "Action: Generate new $KEY_NAME in provider dashboard"

# 5. Update .env
read -p "Enter new API key: " NEW_KEY
sed -i "s/${KEY_NAME}=.*/${KEY_NAME}=${NEW_KEY}/" .env

# 6. Restart with new key
docker-compose -f docker-compose.prod.yml up -d n8n

# 7. Document incident
echo "$(date): Rotated $KEY_NAME due to exposure" >> /var/log/foam-security.log

# 8. Review logs for misuse
docker-compose logs n8n | grep ERROR | tail -50
```

---

## Security Policy Template

### Information Security Policy

Create a policy document (SECURITY_POLICY.md) covering:

1. **Purpose & Scope**
   - Systems covered: FOAM N8N
   - Applies to: All users, administrators, developers
   - Effective date: [DATE]
   - Review cycle: Annually

2. **Access Control**
   - Authentication required for all systems
   - Password requirements: minimum 16 characters
   - MFA required for administrative access
   - Principle of least privilege enforced
   - Access revoked immediately upon role change

3. **Data Protection**
   - All data encrypted in transit (TLS 1.2+)
   - Sensitive data encrypted at rest
   - Regular backups with tested recovery
   - Data retention follows compliance requirements
   - Personal data deleted upon retention expiration

4. **Incident Management**
   - Report security incidents immediately
   - Incident response plan published and tested annually
   - Post-incident reviews conducted

5. **Change Management**
   - All changes require approval
   - Changes documented and auditable
   - Rollback procedures defined
   - Production changes applied during maintenance window

6. **Compliance**
   - Regular security audits (quarterly minimum)
   - Vulnerability assessments (annually)
   - Penetration testing (annually)
   - Documentation of compliance status

---

## Additional Resources

### Security Standards & Frameworks
- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **CIS Controls:** https://www.cisecurity.org/cis-controls/

### Tools & Services
- **Trivy:** Container image scanning (https://github.com/aquasecurity/trivy)
- **Detect-Secrets:** Secret detection (https://github.com/Yelp/detect-secrets)
- **HashiCorp Vault:** Secrets management (https://www.vaultproject.io)
- **Prometheus:** Metrics collection (https://prometheus.io)
- **Grafana:** Metrics visualization (https://grafana.com)

### Related Documentation
- [deployment.md](./deployment.md) - Deployment procedures
- [troubleshooting.md](./troubleshooting.md) - Common issues
- [MONITORING.md](./MONITORING.md) - Monitoring setup
- [docker-compose.prod.yml](../docker-compose.prod.yml) - Production configuration

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-25
**Reviewed By:** [Your Name]
**Next Review:** [Quarterly]

For security questions or to report vulnerabilities, contact: [security@example.com]
