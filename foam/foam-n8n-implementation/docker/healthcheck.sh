#!/bin/bash

# =============================================================================
# FOAM N8N Multi-LLM Orchestration - Health Check Script
# =============================================================================
# Checks the health of all services in the container
# Returns 0 (healthy) only if all critical services are running
# =============================================================================

set -e

# Configuration
POSTGRES_HOST=${DB_POSTGRESDB_HOST:-localhost}
POSTGRES_PORT=${DB_POSTGRESDB_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-foam}
POSTGRES_DB=${POSTGRES_DB:-n8n}

N8N_HOST=${N8N_HOST:-localhost}
N8N_PORT=${N8N_PORT:-5678}

OLLAMA_HOST=${OLLAMA_HOST:-localhost}
OLLAMA_PORT=${OLLAMA_PORT:-11434}

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

# Health check results
POSTGRES_HEALTHY=false
REDIS_HEALTHY=false
OLLAMA_HEALTHY=false
N8N_HEALTHY=false

# =============================================================================
# Check Functions
# =============================================================================

check_postgresql() {
    # Use timeout to prevent hanging
    if timeout 5 pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
        POSTGRES_HEALTHY=true
        return 0
    fi
    return 1
}

check_redis() {
    # Use timeout to prevent hanging
    if timeout 5 redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
        REDIS_HEALTHY=true
        return 0
    fi
    return 1
}

check_ollama() {
    # Use timeout to prevent hanging
    if timeout 5 curl -sf "http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/tags" > /dev/null 2>&1; then
        OLLAMA_HEALTHY=true
        return 0
    fi
    return 1
}

check_n8n() {
    # Check if N8N is responding (may require auth, so just check for HTTP response)
    # Use timeout to prevent hanging
    response=$(timeout 5 curl -sf -o /dev/null -w "%{http_code}" "http://${N8N_HOST}:${N8N_PORT}/healthz" 2>/dev/null || echo "000")

    # Accept 200, 401 (auth required), or 302 (redirect) as healthy
    if [[ "$response" =~ ^(200|401|302)$ ]]; then
        N8N_HEALTHY=true
        return 0
    fi
    return 1
}

# =============================================================================
# Main Health Check
# =============================================================================

main() {
    # Run all checks
    check_postgresql || true
    check_redis || true
    check_ollama || true
    check_n8n || true

    # Determine overall health
    # Critical services: PostgreSQL and N8N
    # Optional services: Redis and Ollama (nice to have but not blocking)

    if [ "$POSTGRES_HEALTHY" = true ] && [ "$N8N_HEALTHY" = true ]; then
        # Container is healthy if core services are running
        exit 0
    fi

    # Container is unhealthy
    echo "Health check failed:"
    echo "  PostgreSQL: $POSTGRES_HEALTHY"
    echo "  Redis: $REDIS_HEALTHY"
    echo "  Ollama: $OLLAMA_HEALTHY"
    echo "  N8N: $N8N_HEALTHY"
    exit 1
}

main
