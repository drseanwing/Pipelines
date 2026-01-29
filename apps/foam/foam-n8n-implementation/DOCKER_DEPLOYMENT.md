# FOAM N8N Docker Deployment Guide

This guide covers deploying the FOAM N8N Multi-LLM Orchestration system using the unified Docker image.

## Overview

The unified Docker image contains all required services:
- **PostgreSQL 14** - Database for N8N and FOAM schema
- **Redis 7** - Queue and caching
- **Ollama** - Local LLM inference (llama3.2, mistral)
- **N8N 1.70.3** - Workflow automation engine

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 20 GB | 50+ GB |
| GPU (optional) | - | NVIDIA GPU with 8GB+ VRAM |

### Software Requirements

- Docker 20.10+
- Docker Compose v2+ (optional, for docker-compose workflow)
- NVIDIA Container Toolkit (for GPU support)

## Quick Start

### 1. Build the Image

```bash
cd foam-n8n-implementation

# Build the image
./docker/build.sh

# Or with a specific version tag
./docker/build.sh v1.0.0
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp docker/docker.env.example .env

# Edit the configuration (REQUIRED)
nano .env
```

**Critical settings to configure:**

```bash
# Database passwords (REQUIRED - no defaults!)
POSTGRES_PASSWORD=your_secure_password_here
DB_POSTGRESDB_PASSWORD=your_secure_password_here

# N8N authentication (REQUIRED - no defaults!)
N8N_BASIC_AUTH_PASSWORD=your_admin_password_here

# API Keys (Required for full functionality)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SERP_API_KEY=...
```

### 3. Run the Container

```bash
# Basic start
./docker/run.sh

# With GPU support
./docker/run.sh --gpu

# With automatic model pulling
./docker/run.sh --pull-models

# Development mode (mounts source directories)
./docker/run.sh --dev

# Non-interactive (for CI/CD)
./docker/run.sh --force
```

### 4. Access Services

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| N8N Web UI | http://localhost:5678 | admin / (your password) |
| Ollama API | http://localhost:11434 | N/A |

## Configuration Options

### Environment Variables

#### Required Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `N8N_BASIC_AUTH_PASSWORD` | N8N admin password |
| `DB_POSTGRESDB_PASSWORD` | N8N database connection password |

#### API Keys

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API access |
| `OPENAI_API_KEY` | GPT-4o API access |
| `SERP_API_KEY` | Web search functionality |
| `NCBI_API_KEY` | PubMed API (optional) |

#### Optional Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_HOST` | localhost | N8N hostname |
| `N8N_PORT` | 5678 | N8N port |
| `GENERIC_TIMEZONE` | Australia/Brisbane | Timezone |
| `FOAM_PULL_MODELS` | false | Auto-pull Ollama models on start |

### Volume Mounts

The container uses named volumes for data persistence:

| Volume | Container Path | Purpose |
|--------|----------------|---------|
| `foam_postgres_data` | /var/lib/postgresql/data | PostgreSQL data |
| `foam_ollama_data` | /root/.ollama | Ollama models |
| `foam_n8n_data` | /home/node/.n8n | N8N configuration |
| `foam_backups` | /app/backups | Backup storage |
| `foam_logs` | /var/log/foam | Application logs |

## Advanced Deployment

### GPU Support (Recommended for Ollama)

```bash
# Ensure NVIDIA Container Toolkit is installed
nvidia-smi

# Run with GPU
./docker/run.sh --gpu --pull-models
```

### Custom Port Configuration

```bash
# Override ports via environment
N8N_PORT=8080 OLLAMA_PORT=11435 ./docker/run.sh
```

### Production Deployment

For production, consider:

1. **Use docker-compose.prod.yml** for multi-container deployment with Traefik
2. **Enable SSL/TLS** via reverse proxy
3. **Configure backups** using the included backup scripts
4. **Set up monitoring** using the monitoring compose file

```bash
# Production with existing docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Development Mode

Development mode mounts source directories for live editing:

```bash
./docker/run.sh --dev --attach

# Files mounted in dev mode:
# - workflows/ -> /app/workflows
# - code/ -> /app/code
# - config/ -> /app/config
# - schemas/ -> /app/schemas
# - templates/ -> /app/templates
```

## Container Management

### View Service Status

```bash
# Check container status
docker ps

# View all services
docker exec foam-n8n supervisorctl status

# View specific service logs
docker exec foam-n8n tail -f /var/log/foam/n8n.log
```

### Start/Stop Services

```bash
# Stop container
./docker/stop.sh

# Or manually
docker stop foam-n8n

# Start existing container
docker start foam-n8n

# Restart
docker restart foam-n8n
```

### Access Container Shell

```bash
docker exec -it foam-n8n bash
```

### View Logs

```bash
# All logs
docker logs -f foam-n8n

# Specific service logs (inside container)
docker exec foam-n8n tail -f /var/log/foam/postgresql.log
docker exec foam-n8n tail -f /var/log/foam/n8n.log
docker exec foam-n8n tail -f /var/log/foam/ollama.log
```

## Ollama Model Management

### Pull Models

```bash
# Pull inside running container
docker exec foam-n8n ollama pull llama3.2
docker exec foam-n8n ollama pull mistral

# Or enable auto-pull on start
./docker/run.sh --pull-models
```

### List Models

```bash
docker exec foam-n8n ollama list
```

### Test Model

```bash
docker exec foam-n8n ollama run llama3.2 "Hello, world!"
```

## Backup and Restore

### Create Backup

```bash
# Database backup
docker exec foam-n8n pg_dump -U foam n8n > backup_$(date +%Y%m%d).sql

# Full volume backup
docker run --rm -v foam_postgres_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/postgres_data.tar.gz /data
```

### Restore from Backup

```bash
# Database restore
cat backup.sql | docker exec -i foam-n8n psql -U foam n8n
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs foam-n8n

# Verify environment file
cat .env | grep -E "^(POSTGRES|N8N|DB_)"
```

### PostgreSQL Connection Issues

```bash
# Test database connection
docker exec foam-n8n psql -U foam -d n8n -c "SELECT 1;"

# Check PostgreSQL logs
docker exec foam-n8n tail -50 /var/log/foam/postgresql.log
```

### N8N Not Responding

```bash
# Check N8N status
docker exec foam-n8n supervisorctl status n8n

# Restart N8N
docker exec foam-n8n supervisorctl restart n8n

# View N8N logs
docker exec foam-n8n tail -100 /var/log/foam/n8n.log
```

### Ollama Model Issues

```bash
# Check Ollama status
docker exec foam-n8n supervisorctl status ollama

# Check available models
curl http://localhost:11434/api/tags

# Pull missing model
docker exec foam-n8n ollama pull llama3.2
```

### Health Check Failures

```bash
# Run health check manually
docker exec foam-n8n /healthcheck.sh

# Check individual services
docker exec foam-n8n pg_isready -U foam -d n8n
docker exec foam-n8n redis-cli ping
curl http://localhost:11434/api/tags
curl http://localhost:5678/healthz
```

## Security Considerations

1. **Change default passwords** - The image ships without default passwords; you MUST set them
2. **Limit network exposure** - Only expose necessary ports (5678, 11434)
3. **Use HTTPS in production** - Deploy behind a reverse proxy with SSL/TLS
4. **Regular backups** - Implement automated backup strategy
5. **Keep updated** - Regularly rebuild image with latest security patches

## Resource Limits

For constrained environments, set Docker resource limits:

```bash
docker run -d \
  --name foam-n8n \
  --memory="8g" \
  --cpus="4" \
  -p 5678:5678 \
  foam-n8n:latest
```

## Support

- **Issues**: https://github.com/your-org/foam-n8n-implementation/issues
- **Documentation**: See `docs/` directory
- **Workflows**: Import from `workflows/` directory in N8N

---

*FOAM N8N Multi-LLM Orchestration System - Unified Docker Deployment*
