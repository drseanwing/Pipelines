#!/bin/bash

# =============================================================================
# FOAM N8N Multi-LLM Orchestration - Container Entrypoint
# =============================================================================
# This script initializes all services in the correct order:
# 1. Initialize PostgreSQL (if needed)
# 2. Initialize Redis
# 3. Initialize Ollama models (optionally)
# 4. Start supervisord to manage all services
# =============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[FOAM]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[FOAM]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[FOAM]${NC} $1"
}

log_error() {
    echo -e "${RED}[FOAM]${NC} $1"
}

# =============================================================================
# PostgreSQL Initialization
# =============================================================================

init_postgresql() {
    log_info "Initializing PostgreSQL..."

    # Check if database is already initialized
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
        log_info "Creating new PostgreSQL database cluster..."

        # Initialize database cluster
        su - postgres -c "/usr/lib/postgresql/14/bin/initdb -D $PGDATA --encoding=UTF8 --locale=C"

        # Configure PostgreSQL
        cat >> "$PGDATA/postgresql.conf" << EOF

# FOAM Configuration
listen_addresses = 'localhost'
port = 5432
max_connections = 100
shared_buffers = 256MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 768MB
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/foam'
log_filename = 'postgresql-%Y-%m-%d.log'
log_min_duration_statement = 1000
EOF

        # Configure authentication
        cat > "$PGDATA/pg_hba.conf" << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32           md5
host    all             all             ::1/128                 md5
EOF

        # Start PostgreSQL temporarily for setup
        su - postgres -c "/usr/lib/postgresql/14/bin/pg_ctl -D $PGDATA -o '-c listen_addresses=localhost' -w start"

        # Validate required environment variables
        if [ -z "$POSTGRES_PASSWORD" ]; then
            log_error "POSTGRES_PASSWORD environment variable is required!"
            exit 1
        fi

        # Create database and user (using dollar-quoting to prevent SQL injection)
        log_info "Creating database and user..."
        su - postgres -c "psql -c \"CREATE USER ${POSTGRES_USER} WITH PASSWORD \$\$${POSTGRES_PASSWORD}\$\$ CREATEDB;\""
        su - postgres -c "psql -c \"CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};\""
        su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};\""

        # Run initialization SQL
        if [ -f "${CONFIG_DIR}/postgres-init.sql" ]; then
            log_info "Running FOAM schema initialization..."
            su - postgres -c "psql -d $POSTGRES_DB -f ${CONFIG_DIR}/postgres-init.sql"
            log_success "FOAM schema initialized"
        fi

        # Stop PostgreSQL (supervisord will start it properly)
        su - postgres -c "/usr/lib/postgresql/14/bin/pg_ctl -D $PGDATA -w stop"

        log_success "PostgreSQL initialization complete"
    else
        log_info "PostgreSQL database already initialized"
    fi
}

# =============================================================================
# Redis Initialization
# =============================================================================

init_redis() {
    log_info "Configuring Redis..."

    # Ensure Redis configuration allows local connections
    if [ -f /etc/redis/redis.conf ]; then
        # Update Redis configuration for container use
        sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
        sed -i 's/^daemonize yes/daemonize no/' /etc/redis/redis.conf
        sed -i 's/^# maxmemory .*/maxmemory 512mb/' /etc/redis/redis.conf
        sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

        log_success "Redis configured"
    fi
}

# =============================================================================
# Ollama Initialization
# =============================================================================

init_ollama() {
    log_info "Ollama will be initialized by supervisord"

    # Create Ollama configuration directory
    mkdir -p /root/.ollama

    # Check if models should be pre-pulled
    if [ "${FOAM_PULL_MODELS:-false}" = "true" ]; then
        log_info "Model pre-pulling enabled - will pull models after Ollama starts"
        touch /tmp/.foam_pull_models
    fi

    log_success "Ollama configuration complete"
}

# =============================================================================
# N8N Initialization
# =============================================================================

init_n8n() {
    log_info "Configuring N8N..."

    # Ensure N8N data directory exists and has correct permissions
    mkdir -p /home/node/.n8n
    chmod 755 /home/node/.n8n

    # Link workflows for import
    if [ -d "${WORKFLOWS_DIR}" ]; then
        ln -sf "${WORKFLOWS_DIR}" /home/node/.n8n/workflows_import 2>/dev/null || true
        log_info "Workflows linked for import"
    fi

    log_success "N8N configured"
}

# =============================================================================
# Create Log Directories
# =============================================================================

init_logs() {
    log_info "Setting up log directories..."

    mkdir -p /var/log/foam
    mkdir -p /var/log/supervisor

    # Set permissions
    chown -R postgres:postgres /var/log/foam 2>/dev/null || true
    chmod 755 /var/log/foam

    log_success "Log directories ready"
}

# =============================================================================
# Model Pulling (Background Task)
# =============================================================================

pull_models_background() {
    # Wait for Ollama to be ready
    sleep 30

    if [ -f /tmp/.foam_pull_models ]; then
        log_info "Starting model pull in background..."

        # Wait for Ollama API to be available
        max_attempts=30
        attempt=1
        while [ $attempt -le $max_attempts ]; do
            if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
                log_success "Ollama API is ready"
                break
            fi
            sleep 5
            attempt=$((attempt + 1))
        done

        # Pull models
        if [ -f "${CONFIG_DIR}/ollama-models.txt" ]; then
            while IFS= read -r model || [ -n "$model" ]; do
                # Skip empty lines and comments
                [[ -z "$model" || "$model" =~ ^[[:space:]]*# ]] && continue

                log_info "Pulling model: $model"
                /usr/local/bin/ollama pull "$model" && \
                    log_success "Pulled model: $model" || \
                    log_warn "Failed to pull model: $model"
            done < "${CONFIG_DIR}/ollama-models.txt"
        else
            # Default models
            for model in llama3.2 mistral; do
                log_info "Pulling default model: $model"
                /usr/local/bin/ollama pull "$model" && \
                    log_success "Pulled model: $model" || \
                    log_warn "Failed to pull model: $model"
            done
        fi

        rm -f /tmp/.foam_pull_models
        log_success "Model pulling complete"
    fi
}

# =============================================================================
# Print Banner
# =============================================================================

print_banner() {
    echo ""
    echo -e "${GREEN}=============================================================================${NC}"
    echo -e "${GREEN}    FOAM N8N Multi-LLM Orchestration System${NC}"
    echo -e "${GREEN}    Version: 1.0.0${NC}"
    echo -e "${GREEN}=============================================================================${NC}"
    echo ""
    echo -e "  ${BLUE}Services:${NC}"
    echo -e "    - PostgreSQL 14 (Database)"
    echo -e "    - Redis 7 (Queue/Cache)"
    echo -e "    - Ollama (Local LLM Inference)"
    echo -e "    - N8N (Workflow Automation)"
    echo ""
    echo -e "  ${BLUE}Endpoints:${NC}"
    echo -e "    - N8N Web UI:    http://localhost:5678"
    echo -e "    - Ollama API:    http://localhost:11434"
    echo ""
    echo -e "  ${BLUE}Credentials:${NC}"
    echo -e "    - N8N Username:  ${N8N_BASIC_AUTH_USER}"
    echo -e "    - N8N Password:  [Set via N8N_BASIC_AUTH_PASSWORD]"
    echo ""
    echo -e "${GREEN}=============================================================================${NC}"
    echo ""
}

# =============================================================================
# Main Entrypoint
# =============================================================================

main() {
    print_banner

    log_info "Starting FOAM container initialization..."

    # Initialize all components
    init_logs
    init_postgresql
    init_redis
    init_ollama
    init_n8n

    log_success "Initialization complete"

    # Start background model pulling if enabled
    if [ -f /tmp/.foam_pull_models ]; then
        pull_models_background &
    fi

    # Execute the main command (supervisord)
    log_info "Starting service supervisor..."
    exec "$@"
}

# Run main with all arguments
main "$@"
