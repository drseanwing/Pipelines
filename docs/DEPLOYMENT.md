# Deployment Guide

## Prerequisites

- Docker 25.0+ (with CDI support for GPU passthrough)
- Docker Compose v2
- Docker rootless mode configured
- Node.js 20 LTS
- pnpm 9+

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd Pipelines
pnpm install

# Build all packages
pnpm build:packages

# Start infrastructure
pnpm docker:up

# Development mode (with dev tools)
pnpm docker:dev
```

## Environment Setup

1. Copy environment template:
   ```bash
   cp infrastructure/docker/.env.example infrastructure/docker/.env
   ```

2. Fill in required values (see .env.example for documentation)

3. Generate encryption keys for N8N instances:
   ```bash
   # Generate unique keys for each N8N instance
   openssl rand -hex 32  # FOAM_N8N_ENCRYPTION_KEY
   openssl rand -hex 32  # QI_N8N_ENCRYPTION_KEY
   openssl rand -hex 32  # SLR_N8N_ENCRYPTION_KEY
   ```

## Service Startup Order

1. PostgreSQL (port 5810)
2. Redis (port 5811)
3. Ollama (port 5812)
4. N8N instances (ports 5815, 5820, 5830)
5. Application services (port 5821)
6. Monitoring (ports 5813-5814, 5840-5842)

## Health Checks

All services expose health check endpoints. Verify deployment:
```bash
# Check all containers
docker compose -f infrastructure/docker/docker-compose.yml ps

# Check PostgreSQL
docker compose -f infrastructure/docker/docker-compose.yml exec postgres pg_isready

# Check Redis
docker compose -f infrastructure/docker/docker-compose.yml exec redis redis-cli ping
```

## Backup

TODO: Document automated backup procedures
