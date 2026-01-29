#!/usr/bin/env bash
# Pipeline Orchestrator - Startup Orchestration Script
# Ensures services start in correct order with health checks

set -euo pipefail

COMPOSE_FILE="$(dirname "$0")/../docker/docker-compose.yml"
PROJECT_NAME="pipelines"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

wait_for_healthy() {
    local service=$1
    local max_attempts=${2:-30}
    local attempt=0

    log_info "Waiting for $service to be healthy..."
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps "$service" 2>/dev/null | grep -q "healthy"; then
            log_info "$service is healthy!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    log_error "$service failed to become healthy after $((max_attempts * 2)) seconds"
    return 1
}

# Parse arguments
DEV_MODE=false
MONITORING=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev) DEV_MODE=true; shift ;;
        --monitoring) MONITORING=true; shift ;;
        --all) DEV_MODE=true; MONITORING=true; shift ;;
        *) echo "Usage: $0 [--dev] [--monitoring] [--all]"; exit 1 ;;
    esac
done

COMPOSE_CMD="docker compose -f $COMPOSE_FILE"
if [ "$DEV_MODE" = true ]; then
    COMPOSE_CMD="$COMPOSE_CMD -f $(dirname "$0")/../docker/docker-compose.dev.yml"
fi
if [ "$MONITORING" = true ]; then
    COMPOSE_CMD="$COMPOSE_CMD -f $(dirname "$0")/../docker/docker-compose.monitoring.yml"
fi
COMPOSE_CMD="$COMPOSE_CMD -p $PROJECT_NAME"

log_info "Starting Pipeline Orchestrator..."
log_info "Dev mode: $DEV_MODE | Monitoring: $MONITORING"

# Step 1: Start shared infrastructure
log_info "Step 1/4: Starting shared infrastructure (PostgreSQL, Redis, Ollama)..."
$COMPOSE_CMD up -d postgres redis ollama
wait_for_healthy postgres
wait_for_healthy redis

# Step 2: Start N8N instances
log_info "Step 2/4: Starting N8N instances..."
$COMPOSE_CMD up -d foam-n8n qi-n8n slr-n8n
wait_for_healthy foam-n8n
wait_for_healthy qi-n8n
wait_for_healthy slr-n8n

# Step 3: Start application services
log_info "Step 3/4: Starting application services..."
$COMPOSE_CMD up -d qi-app slr-n8n-worker slr-n8n-mcp i-librarian

# Step 4: Start monitoring (if enabled)
if [ "$MONITORING" = true ]; then
    log_info "Step 4/4: Starting monitoring stack..."
    $COMPOSE_CMD up -d prometheus grafana node-exporter postgres-exporter cadvisor
else
    log_info "Step 4/4: Monitoring disabled (use --monitoring to enable)"
fi

# Summary
log_info "=== Startup Complete ==="
log_info "Services:"
log_info "  PostgreSQL:    http://localhost:5810"
log_info "  Redis:         localhost:5811"
log_info "  Ollama:        http://localhost:5812"
log_info "  FOAM N8N:      http://localhost:5815"
log_info "  QI N8N:        http://localhost:5820"
log_info "  QI App:        http://localhost:5821"
log_info "  SLR N8N:       http://localhost:5830"
log_info "  I-Librarian:   http://localhost:5832"
if [ "$MONITORING" = true ]; then
    log_info "  Prometheus:    http://localhost:5813"
    log_info "  Grafana:       http://localhost:5814"
fi
if [ "$DEV_MODE" = true ]; then
    log_info "  Adminer:       http://localhost:5823"
    log_info "  Redis Cmdr:    http://localhost:5824"
    log_info "  MailHog:       http://localhost:5825"
fi
