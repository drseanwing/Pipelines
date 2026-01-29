#!/usr/bin/env bash
# ============================================================================
# QI Research Pipeline - Deployment Script
# ============================================================================
# Description: Production deployment script for the QI Research Pipeline
# Usage: ./scripts/deploy.sh [--skip-migrations] [--no-build]
#
# Make executable: chmod +x scripts/deploy.sh
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default options
SKIP_MIGRATIONS=false
NO_BUILD=false
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo ""
    echo "=============================================="
    echo "   QI Research Pipeline - Deployment"
    echo "=============================================="
    echo ""
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-migrations    Skip database migrations"
    echo "  --no-build          Skip building the application"
    echo "  -h, --help          Show this help message"
    echo ""
}

# ============================================================================
# Parse Arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# ============================================================================
# Prerequisite Checks
# ============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_deps=()

    # Check for Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    else
        log_success "Docker found: $(docker --version)"
    fi

    # Check for Docker Compose
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose found: $(docker-compose --version)"
    elif docker compose version &> /dev/null; then
        log_success "Docker Compose (plugin) found: $(docker compose version)"
    else
        missing_deps+=("docker-compose")
    fi

    # Check for Node.js (for local builds)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found - will rely on Docker build"
    else
        log_success "Node.js found: $(node --version)"
    fi

    # Check for npm
    if ! command -v npm &> /dev/null; then
        log_warning "npm not found - will rely on Docker build"
    else
        log_success "npm found: $(npm --version)"
    fi

    # Exit if critical dependencies are missing
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi

    log_success "All prerequisites satisfied"
}

# ============================================================================
# Environment Configuration
# ============================================================================

load_environment() {
    log_info "Loading environment configuration..."

    cd "$PROJECT_ROOT"

    # Check for .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_warning ".env file not found. Copying from .env.example..."
            cp .env.example .env
            log_warning "Please update .env with your production values before proceeding."
            log_warning "Press Enter to continue or Ctrl+C to abort..."
            read -r
        else
            log_error "No .env or .env.example file found!"
            exit 1
        fi
    fi

    # Source the environment file
    set -a
    source .env
    set +a

    # Validate critical environment variables
    local required_vars=(
        "DB_HOST"
        "DB_PORT"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "ANTHROPIC_API_KEY"
    )

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ] || [[ "${!var}" == *"your_"* ]] || [[ "${!var}" == *"_here"* ]]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing or placeholder values for: ${missing_vars[*]}"
        log_error "Please update your .env file with valid values."
        exit 1
    fi

    log_success "Environment configuration loaded"
}

# ============================================================================
# Database Migrations
# ============================================================================

run_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        log_warning "Skipping database migrations (--skip-migrations flag set)"
        return 0
    fi

    log_info "Running database migrations..."

    cd "$PROJECT_ROOT"

    # Check if migrate script exists
    if [ -f "./scripts/migrate.sh" ]; then
        chmod +x ./scripts/migrate.sh
        ./scripts/migrate.sh
    else
        # Fallback to npm script
        if [ -f "package.json" ] && grep -q '"db:migrate"' package.json; then
            npm run db:migrate
        else
            log_warning "No migration script found. Skipping migrations."
        fi
    fi

    log_success "Database migrations completed"
}

# ============================================================================
# Build Application
# ============================================================================

build_application() {
    if [ "$NO_BUILD" = true ]; then
        log_warning "Skipping build (--no-build flag set)"
        return 0
    fi

    log_info "Building application..."

    cd "$PROJECT_ROOT"

    # Install dependencies if node_modules doesn't exist or is outdated
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log_info "Installing dependencies..."
        npm ci --production=false
    fi

    # Run TypeScript build
    log_info "Compiling TypeScript..."
    npm run build

    # Run linting
    log_info "Running linter..."
    npm run lint || log_warning "Linting completed with warnings"

    log_success "Application build completed"
}

# ============================================================================
# Start Services
# ============================================================================

start_services() {
    log_info "Starting services..."

    cd "$PROJECT_ROOT"

    # Check for docker-compose file
    local compose_file=""
    if [ -f "docker-compose.yml" ]; then
        compose_file="docker-compose.yml"
    elif [ -f "docker-compose.yaml" ]; then
        compose_file="docker-compose.yaml"
    elif [ -f "compose.yml" ]; then
        compose_file="compose.yml"
    fi

    if [ -n "$compose_file" ]; then
        log_info "Using Docker Compose file: $compose_file"

        # Use docker compose (v2) or docker-compose (v1)
        if docker compose version &> /dev/null; then
            docker compose -f "$compose_file" up -d --build
        else
            docker-compose -f "$compose_file" up -d --build
        fi
    else
        log_info "No Docker Compose file found. Starting application directly..."

        # Start the Node.js application
        if [ -f "dist/index.js" ]; then
            # Start in background with PM2 if available, otherwise nohup
            if command -v pm2 &> /dev/null; then
                pm2 start dist/index.js --name "qi-research-pipeline"
            else
                nohup node dist/index.js > logs/app.log 2>&1 &
                echo $! > .pid
                log_info "Application started with PID: $(cat .pid)"
            fi
        else
            log_error "dist/index.js not found. Did the build complete successfully?"
            exit 1
        fi
    fi

    log_success "Services started"
}

# ============================================================================
# Health Check
# ============================================================================

health_check() {
    log_info "Performing health checks..."

    local port="${PORT:-3000}"
    local health_url="http://localhost:${port}/health"
    local retries=0

    log_info "Waiting for application to be ready..."

    while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
        if curl -sf "$health_url" > /dev/null 2>&1; then
            log_success "Health check passed!"
            return 0
        fi

        retries=$((retries + 1))
        log_info "Waiting for service... (attempt $retries/$HEALTH_CHECK_RETRIES)"
        sleep $HEALTH_CHECK_INTERVAL
    done

    # If /health endpoint doesn't exist, try basic connectivity
    if curl -sf "http://localhost:${port}/" > /dev/null 2>&1; then
        log_warning "Health endpoint not available, but service is responding"
        return 0
    fi

    log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
    log_error "Please check application logs for errors"

    # Show recent logs
    if [ -f "logs/app.log" ]; then
        log_info "Last 20 lines of application log:"
        tail -20 logs/app.log
    fi

    return 1
}

# ============================================================================
# Post-Deployment Tasks
# ============================================================================

post_deployment() {
    log_info "Running post-deployment tasks..."

    cd "$PROJECT_ROOT"

    # Create logs directory if it doesn't exist
    mkdir -p logs

    # Log deployment information
    local deployment_log="logs/deployments.log"
    {
        echo "=============================================="
        echo "Deployment: $(date -Iseconds)"
        echo "Git commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
        echo "Git branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A')"
        echo "Node version: $(node --version 2>/dev/null || echo 'N/A')"
        echo "Environment: ${NODE_ENV:-production}"
        echo "=============================================="
    } >> "$deployment_log"

    log_success "Deployment logged to $deployment_log"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    print_banner

    log_info "Starting deployment process..."
    log_info "Project root: $PROJECT_ROOT"

    check_prerequisites
    load_environment
    run_migrations
    build_application
    start_services
    health_check
    post_deployment

    echo ""
    log_success "=============================================="
    log_success "   Deployment completed successfully!"
    log_success "=============================================="
    echo ""
    log_info "Application URL: http://localhost:${PORT:-3000}"
    log_info "Check logs with: tail -f logs/app.log"
    echo ""
}

# Run main function
main "$@"
