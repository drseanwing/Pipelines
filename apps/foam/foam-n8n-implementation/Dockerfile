# =============================================================================
# FOAM N8N Multi-LLM Orchestration - Unified Docker Image
# =============================================================================
# This Dockerfile creates a single container with all required services:
# - PostgreSQL 14 (database)
# - Redis 7 (queue/cache)
# - Ollama (local LLM inference)
# - N8N (workflow automation)
# - Node.js (test suite and utilities)
#
# Build: docker build -t foam-n8n:latest .
# Run:   docker run -d -p 5678:5678 -p 11434:11434 --name foam foam-n8n:latest
# =============================================================================

FROM ubuntu:22.04

LABEL maintainer="FOAM Development Team"
LABEL version="1.0.0"
LABEL description="FOAM N8N Multi-LLM Orchestration - All-in-one container"

# =============================================================================
# Environment Variables
# =============================================================================

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Australia/Brisbane

# PostgreSQL - MUST be provided at runtime via -e or --env-file
ENV POSTGRES_USER=foam
ENV POSTGRES_PASSWORD=""
ENV POSTGRES_DB=n8n
ENV PGDATA=/var/lib/postgresql/data

# N8N - MUST be provided at runtime via -e or --env-file
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=""
ENV N8N_HOST=localhost
ENV N8N_PORT=5678
ENV N8N_PROTOCOL=http
ENV WEBHOOK_URL=http://localhost:5678/
ENV GENERIC_TIMEZONE=Australia/Brisbane
ENV NODE_ENV=production
ENV N8N_LOG_LEVEL=info
ENV N8N_LOG_OUTPUT=console

# Database connection for N8N
ENV DB_TYPE=postgresdb
ENV DB_POSTGRESDB_HOST=localhost
ENV DB_POSTGRESDB_PORT=5432
ENV DB_POSTGRESDB_DATABASE=n8n
ENV DB_POSTGRESDB_USER=foam
ENV DB_POSTGRESDB_PASSWORD=""

# Redis
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379

# Ollama
ENV OLLAMA_HOST=0.0.0.0
ENV OLLAMA_PORT=11434

# Application paths
ENV FOAM_HOME=/app
ENV WORKFLOWS_DIR=/app/workflows
ENV CONFIG_DIR=/app/config
ENV SCRIPTS_DIR=/app/scripts
ENV LOGS_DIR=/var/log/foam
ENV BACKUPS_DIR=/app/backups

# =============================================================================
# Install System Dependencies
# =============================================================================

RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core utilities
    curl \
    wget \
    gnupg \
    ca-certificates \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    # Process management
    supervisor \
    # PostgreSQL
    postgresql-14 \
    postgresql-contrib-14 \
    # Redis
    redis-server \
    # Node.js dependencies
    build-essential \
    python3 \
    # Networking tools
    netcat-openbsd \
    # Text processing
    jq \
    # Timezone data
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# Install Node.js 20 LTS
# =============================================================================

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# Install N8N
# =============================================================================

# Pin n8n version for reproducible builds
RUN npm install -g n8n@1.70.3

# =============================================================================
# Install Ollama
# =============================================================================

RUN curl -fsSL https://ollama.com/install.sh | sh

# =============================================================================
# Create Application Directory Structure
# =============================================================================

RUN mkdir -p \
    ${FOAM_HOME} \
    ${WORKFLOWS_DIR} \
    ${CONFIG_DIR} \
    ${SCRIPTS_DIR} \
    ${LOGS_DIR} \
    ${BACKUPS_DIR} \
    /var/log/supervisor \
    /var/run/postgresql \
    /var/run/redis \
    /home/node/.n8n \
    /root/.ollama

# =============================================================================
# Copy Application Files
# =============================================================================

WORKDIR ${FOAM_HOME}

# Copy configuration files
COPY config/ ${CONFIG_DIR}/

# Copy workflows
COPY workflows/ ${WORKFLOWS_DIR}/

# Copy scripts
COPY scripts/ ${SCRIPTS_DIR}/

# Copy custom code
COPY code/ ${FOAM_HOME}/code/

# Copy schemas
COPY schemas/ ${FOAM_HOME}/schemas/

# Copy templates
COPY templates/ ${FOAM_HOME}/templates/

# Copy prompts
COPY prompts/ ${FOAM_HOME}/prompts/

# Copy test suite
COPY tests/ ${FOAM_HOME}/tests/

# Copy documentation
COPY docs/ ${FOAM_HOME}/docs/
COPY README.md ${FOAM_HOME}/
COPY IMPLEMENTATION_FRAMEWORK.md ${FOAM_HOME}/
COPY CHANGELOG.md ${FOAM_HOME}/

# =============================================================================
# Copy Docker-specific Configuration
# =============================================================================

# Copy supervisord configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy health check script
COPY docker/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

# =============================================================================
# Install Test Suite Dependencies
# =============================================================================

WORKDIR ${FOAM_HOME}/tests
RUN npm ci || npm install

# =============================================================================
# Configure PostgreSQL
# =============================================================================

# Set up PostgreSQL data directory permissions
RUN chown -R postgres:postgres /var/lib/postgresql \
    && chown -R postgres:postgres /var/run/postgresql \
    && chmod 755 /var/run/postgresql

# =============================================================================
# Configure Redis
# =============================================================================

RUN sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf \
    && sed -i 's/^daemonize yes/daemonize no/' /etc/redis/redis.conf \
    && chown -R redis:redis /var/run/redis

# =============================================================================
# Set Permissions
# =============================================================================

RUN chmod -R 755 ${SCRIPTS_DIR} \
    && chmod -R 644 ${CONFIG_DIR}/*.sql 2>/dev/null || true \
    && chmod -R 644 ${CONFIG_DIR}/*.yml 2>/dev/null || true \
    && chmod -R 644 ${CONFIG_DIR}/*.yaml 2>/dev/null || true

# =============================================================================
# Expose Ports
# =============================================================================

# N8N Web UI and API
EXPOSE 5678

# Ollama API
EXPOSE 11434

# PostgreSQL (optional, for external access)
EXPOSE 5432

# Redis (optional, for external access)
EXPOSE 6379

# =============================================================================
# Volumes
# =============================================================================

VOLUME ["/var/lib/postgresql/data"]
VOLUME ["/root/.ollama"]
VOLUME ["/home/node/.n8n"]
VOLUME ["/app/backups"]
VOLUME ["/var/log/foam"]

# =============================================================================
# Health Check
# =============================================================================

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD /healthcheck.sh

# =============================================================================
# Entrypoint
# =============================================================================

WORKDIR ${FOAM_HOME}

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
