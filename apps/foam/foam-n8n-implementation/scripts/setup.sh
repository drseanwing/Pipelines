#!/usr/bin/env bash

# =============================================================================
# FOAM N8N Multi-LLM Orchestration - Setup Script
# =============================================================================
# Initial deployment script for the FOAM N8N system
# Version: 1.0.0
# =============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SKIP_MODELS=false
FOAM_ENV="development"

# Required directories
REQUIRED_DIRS=(
    "workflows"
    "logs"
    "config"
    "backups"
    "data/n8n"
    "data/postgres"
    "data/ollama"
)

# Required environment variables
REQUIRED_ENV_VARS=(
    "N8N_USER"
    "N8N_PASSWORD"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
)

# Ollama models to pull
OLLAMA_MODELS=(
    "llama3.2"
    "mistral"
)

# =============================================================================
# Helper Functions
# =============================================================================

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

separator() {
    echo -e "${BLUE}=============================================================================${NC}"
}

# =============================================================================
# Usage and Help
# =============================================================================

show_help() {
    cat << EOF
FOAM N8N Setup Script - Initial Deployment Tool

USAGE:
    ./setup.sh [OPTIONS]

OPTIONS:
    --production, --prod    Run in production mode with SSL/TLS
    --dev, --development    Run in development mode (default)
    --skip-models          Skip Ollama model pulling
    --help, -h             Show this help message

EXAMPLES:
    # Development setup (default)
    ./setup.sh

    # Production setup
    ./setup.sh --production

    # Development setup without pulling models
    ./setup.sh --dev --skip-models

DESCRIPTION:
    This script performs the initial setup and deployment of the FOAM N8N
    Multi-LLM Orchestration system. It:

    1. Checks prerequisites (Docker, Docker Compose)
    2. Creates required directories
    3. Sets up environment configuration
    4. Starts services (PostgreSQL, Ollama, N8N)
    5. Pulls required Ollama models
    6. Performs health checks
    7. Displays post-setup instructions

EOF
}

# =============================================================================
# Parse Command Line Arguments
# =============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --production|--prod)
                FOAM_ENV="production"
                shift
                ;;
            --dev|--development)
                FOAM_ENV="development"
                shift
                ;;
            --skip-models)
                SKIP_MODELS=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_docker() {
    info "Checking Docker installation..."

    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        echo "Please install Docker from: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! docker ps &> /dev/null; then
        error "Docker daemon is not running"
        echo "Please start Docker and try again"
        exit 1
    fi

    success "Docker is installed and running"
}

check_docker_compose() {
    info "Checking Docker Compose installation..."

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
        exit 1
    fi

    success "Docker Compose is installed"
}

# =============================================================================
# Directory Setup
# =============================================================================

create_directories() {
    info "Creating required directories..."

    cd "$PROJECT_ROOT"

    for dir in "${REQUIRED_DIRS[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            success "Created directory: $dir"
        else
            info "Directory already exists: $dir"
        fi
    done
}

# =============================================================================
# Environment Configuration
# =============================================================================

setup_environment() {
    info "Setting up environment configuration..."

    cd "$PROJECT_ROOT"

    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            success "Created .env from .env.example"
            warning "Please edit .env and set your passwords and API keys"
            warning "DO NOT use default passwords in production!"
        else
            error ".env.example not found"
            exit 1
        fi
    else
        info ".env file already exists"
    fi
}

validate_environment() {
    info "Validating environment variables..."

    cd "$PROJECT_ROOT"

    if [[ ! -f ".env" ]]; then
        error ".env file not found. Run setup first."
        exit 1
    fi

    # Source the .env file
    set -a
    source .env
    set +a

    local missing_vars=()

    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi

    # Check for default passwords
    if [[ "$N8N_PASSWORD" == "change_me_to_secure_password" ]] || \
       [[ "$POSTGRES_PASSWORD" == "change_me_to_secure_password" ]]; then
        if [[ "$FOAM_ENV" == "production" ]]; then
            error "Default passwords detected in production mode!"
            echo "Please change N8N_PASSWORD and POSTGRES_PASSWORD in .env"
            exit 1
        else
            warning "Using default passwords (development mode only!)"
        fi
    fi

    success "Environment variables validated"
}

# =============================================================================
# SSL/TLS Setup (Production)
# =============================================================================

setup_ssl() {
    if [[ "$FOAM_ENV" != "production" ]]; then
        return
    fi

    info "Setting up SSL/TLS for production..."

    cd "$PROJECT_ROOT"

    # Create acme.json for Let's Encrypt certificates
    if [[ ! -f "config/acme.json" ]]; then
        touch config/acme.json
        chmod 600 config/acme.json
        success "Created acme.json with correct permissions"
    else
        # Ensure correct permissions
        chmod 600 config/acme.json
        info "acme.json already exists"
    fi

    # Validate domain and email settings
    set -a
    source .env
    set +a

    if [[ -z "$N8N_HOST" ]] || [[ "$N8N_HOST" == "localhost" ]]; then
        error "N8N_HOST must be set to a valid domain for production"
        exit 1
    fi

    if [[ -z "$LETSENCRYPT_EMAIL" ]]; then
        warning "LETSENCRYPT_EMAIL not set. SSL certificate generation may fail."
    fi

    success "SSL/TLS configuration validated"
}

# =============================================================================
# Service Management
# =============================================================================

get_compose_command() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

start_services() {
    info "Starting services in $FOAM_ENV mode..."

    cd "$PROJECT_ROOT"

    local compose_cmd=$(get_compose_command)
    local compose_file="docker-compose.yml"

    if [[ "$FOAM_ENV" == "production" ]]; then
        compose_file="docker-compose.prod.yml"
        if [[ ! -f "$compose_file" ]]; then
            warning "Production compose file not found, using default"
            compose_file="docker-compose.yml"
        fi
    fi

    info "Using compose file: $compose_file"

    # Start PostgreSQL first
    info "Starting PostgreSQL..."
    $compose_cmd -f "$compose_file" up -d postgres
    sleep 5

    # Start Ollama
    info "Starting Ollama..."
    $compose_cmd -f "$compose_file" up -d ollama
    sleep 5

    # Start N8N
    info "Starting N8N..."
    $compose_cmd -f "$compose_file" up -d n8n

    success "All services started"
}

# =============================================================================
# Ollama Model Setup
# =============================================================================

wait_for_ollama() {
    info "Waiting for Ollama to be ready..."

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            success "Ollama is ready"
            return 0
        fi

        echo -n "."
        sleep 2
        ((attempt++))
    done

    error "Ollama did not become ready in time"
    return 1
}

pull_ollama_models() {
    if [[ "$SKIP_MODELS" == true ]]; then
        warning "Skipping Ollama model pulling (--skip-models flag set)"
        return
    fi

    info "Pulling Ollama models..."

    if ! wait_for_ollama; then
        error "Cannot pull models - Ollama is not ready"
        return 1
    fi

    for model in "${OLLAMA_MODELS[@]}"; do
        info "Pulling model: $model"
        if docker exec foam-n8n-implementation-ollama-1 ollama pull "$model" 2>/dev/null || \
           docker exec ollama ollama pull "$model" 2>/dev/null; then
            success "Pulled model: $model"
        else
            error "Failed to pull model: $model"
            warning "You may need to pull this model manually later"
        fi
    done

    success "Model pulling completed"
}

verify_ollama_models() {
    if [[ "$SKIP_MODELS" == true ]]; then
        return
    fi

    info "Verifying Ollama models..."

    local models=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "")

    if [[ -z "$models" ]]; then
        warning "Could not verify models"
        return
    fi

    for model in "${OLLAMA_MODELS[@]}"; do
        if echo "$models" | grep -q "^$model"; then
            success "Model verified: $model"
        else
            warning "Model not found: $model"
        fi
    done
}

# =============================================================================
# Health Checks
# =============================================================================

check_postgres() {
    info "Checking PostgreSQL connection..."

    local max_attempts=15
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if docker exec foam-n8n-implementation-postgres-1 pg_isready -U foam > /dev/null 2>&1 || \
           docker exec postgres pg_isready -U foam > /dev/null 2>&1; then
            success "PostgreSQL is healthy"
            return 0
        fi

        echo -n "."
        sleep 2
        ((attempt++))
    done

    error "PostgreSQL health check failed"
    return 1
}

check_n8n() {
    info "Checking N8N availability..."

    local max_attempts=20
    local attempt=1
    local n8n_url="http://localhost:5678"

    while [[ $attempt -le $max_attempts ]]; do
        if curl -s "$n8n_url" > /dev/null 2>&1; then
            success "N8N is responding"
            return 0
        fi

        echo -n "."
        sleep 3
        ((attempt++))
    done

    error "N8N health check failed"
    return 1
}

check_ollama() {
    info "Checking Ollama API..."

    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        success "Ollama API is responding"
        return 0
    else
        error "Ollama API health check failed"
        return 1
    fi
}

run_health_checks() {
    separator
    info "Running health checks..."
    separator

    check_postgres
    check_ollama
    check_n8n

    separator
}

# =============================================================================
# Post-Setup Instructions
# =============================================================================

show_post_setup_instructions() {
    separator
    success "FOAM N8N Setup Complete!"
    separator

    echo ""
    echo -e "${GREEN}Service URLs:${NC}"

    if [[ "$FOAM_ENV" == "production" ]]; then
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
        echo -e "  N8N:    https://${N8N_HOST}"
        echo -e "  Ollama: http://${N8N_HOST}:11434"
    else
        echo -e "  N8N:    http://localhost:5678"
        echo -e "  Ollama: http://localhost:11434"
    fi

    echo ""
    echo -e "${GREEN}Default Credentials:${NC}"
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    echo -e "  Username: ${N8N_USER}"
    echo -e "  Password: ${N8N_PASSWORD}"

    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "  1. Access N8N at the URL above"
    echo -e "  2. Import workflows from ./workflows/ directory"
    echo -e "  3. Set up credentials in N8N:"
    echo -e "     - Anthropic API (Claude)"
    echo -e "     - OpenAI API"
    echo -e "     - SERP API"
    echo -e "     - Slack Webhook (optional)"
    echo -e "  4. Configure Ollama HTTP Request nodes to use http://ollama:11434"
    echo -e "  5. Test workflows with sample data"

    if [[ "$SKIP_MODELS" == true ]]; then
        echo ""
        echo -e "${YELLOW}Note:${NC} Ollama models were not pulled. Pull them manually:"
        echo -e "  docker exec foam-n8n-implementation-ollama-1 ollama pull llama3.2"
        echo -e "  docker exec foam-n8n-implementation-ollama-1 ollama pull mistral"
    fi

    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo -e "  View logs:     docker-compose logs -f"
    echo -e "  Stop services: docker-compose down"
    echo -e "  Restart:       docker-compose restart"

    separator
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    separator
    echo -e "${GREEN}FOAM N8N Multi-LLM Orchestration - Setup${NC}"
    separator

    # Parse arguments
    parse_arguments "$@"

    info "Environment: $FOAM_ENV"

    # Prerequisite checks
    check_docker
    check_docker_compose

    # Directory setup
    create_directories

    # Environment setup
    setup_environment
    validate_environment

    # SSL setup for production
    setup_ssl

    # Start services
    start_services

    # Wait a moment for services to initialize
    sleep 10

    # Setup Ollama models
    pull_ollama_models
    verify_ollama_models

    # Health checks
    run_health_checks

    # Post-setup instructions
    show_post_setup_instructions
}

# Run main function with all arguments
main "$@"
