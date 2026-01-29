#!/usr/bin/env bash
# ============================================================================
# QI Research Pipeline - Development Environment Setup Script
# ============================================================================
# Description: Sets up the local development environment
# Usage: ./scripts/setup-dev.sh [--reset] [--skip-db]
#
# Make executable: chmod +x scripts/setup-dev.sh
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default options
RESET_ENV=false
SKIP_DB=false

# Required Node.js version
REQUIRED_NODE_VERSION="20"

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

log_step() {
    echo -e "\n${CYAN}>>> $1${NC}"
}

print_banner() {
    echo ""
    echo -e "${CYAN}=============================================="
    echo "   QI Research Pipeline - Development Setup"
    echo "==============================================${NC}"
    echo ""
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --reset     Reset environment (remove node_modules, regenerate .env)"
    echo "  --skip-db   Skip database setup"
    echo "  -h, --help  Show this help message"
    echo ""
}

# ============================================================================
# Parse Arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --reset)
            RESET_ENV=true
            shift
            ;;
        --skip-db)
            SKIP_DB=true
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
# Check Prerequisites
# ============================================================================

check_prerequisites() {
    log_step "Checking prerequisites..."

    local missing_deps=()

    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    else
        local node_version
        node_version=$(node -v | grep -oE '[0-9]+' | head -1)
        if [ "$node_version" -lt "$REQUIRED_NODE_VERSION" ]; then
            log_error "Node.js version $REQUIRED_NODE_VERSION+ required. Found: $(node -v)"
            exit 1
        fi
        log_success "Node.js $(node -v) found"
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        log_success "npm $(npm -v) found"
    fi

    # Check Docker (optional but recommended)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found - database will need manual setup"
    else
        log_success "Docker $(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) found"
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    else
        log_success "Git $(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+') found"
    fi

    # Exit if critical dependencies are missing
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        exit 1
    fi
}

# ============================================================================
# Setup Environment File
# ============================================================================

setup_environment() {
    log_step "Setting up environment configuration..."

    cd "$PROJECT_ROOT"

    if [ "$RESET_ENV" = true ] && [ -f ".env" ]; then
        log_warning "Backing up existing .env to .env.backup"
        cp .env .env.backup
        rm .env
    fi

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_info "Creating .env from .env.example..."
            cp .env.example .env

            # Generate secure random secrets
            if command -v openssl &> /dev/null; then
                local session_secret
                local jwt_secret
                session_secret=$(openssl rand -hex 32)
                jwt_secret=$(openssl rand -hex 32)

                # Replace placeholder secrets (macOS compatible sed)
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s/your_session_secret_here_min_32_chars/$session_secret/" .env
                    sed -i '' "s/your_jwt_secret_here_min_32_chars/$jwt_secret/" .env
                else
                    sed -i "s/your_session_secret_here_min_32_chars/$session_secret/" .env
                    sed -i "s/your_jwt_secret_here_min_32_chars/$jwt_secret/" .env
                fi

                log_success "Generated secure secrets"
            else
                log_warning "OpenSSL not found - please manually update secrets in .env"
            fi

            # Set development defaults
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' 's/NODE_ENV=.*/NODE_ENV=development/' .env
                sed -i '' 's/LOG_LEVEL=.*/LOG_LEVEL=debug/' .env
            else
                sed -i 's/NODE_ENV=.*/NODE_ENV=development/' .env
                sed -i 's/LOG_LEVEL=.*/LOG_LEVEL=debug/' .env
            fi

            log_success ".env file created"
            log_warning "Please update .env with your API keys and configuration"
        else
            log_error ".env.example not found!"
            exit 1
        fi
    else
        log_info ".env file already exists"
    fi
}

# ============================================================================
# Install Dependencies
# ============================================================================

install_dependencies() {
    log_step "Installing Node.js dependencies..."

    cd "$PROJECT_ROOT"

    if [ "$RESET_ENV" = true ] && [ -d "node_modules" ]; then
        log_info "Removing existing node_modules..."
        rm -rf node_modules
        rm -f package-lock.json
    fi

    if [ ! -d "node_modules" ]; then
        log_info "Running npm install..."
        npm install
        log_success "Dependencies installed"
    else
        log_info "Checking for outdated dependencies..."
        npm install
        log_success "Dependencies up to date"
    fi
}

# ============================================================================
# Setup Development Database
# ============================================================================

setup_database() {
    if [ "$SKIP_DB" = true ]; then
        log_warning "Skipping database setup (--skip-db flag set)"
        return 0
    fi

    log_step "Setting up development database..."

    cd "$PROJECT_ROOT"

    # Load environment
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
    fi

    local db_name="${DB_NAME:-qi_research_pipeline}"
    local db_user="${DB_USER:-postgres}"
    local db_password="${DB_PASSWORD:-postgres}"
    local db_port="${DB_PORT:-5432}"

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found. Please set up PostgreSQL manually."
        log_info "Required database: $db_name"
        log_info "Required user: $db_user"
        return 0
    fi

    # Check if postgres container exists
    if docker ps -a --format '{{.Names}}' | grep -q '^qi-research-postgres$'; then
        log_info "PostgreSQL container 'qi-research-postgres' found"

        if ! docker ps --format '{{.Names}}' | grep -q '^qi-research-postgres$'; then
            log_info "Starting PostgreSQL container..."
            docker start qi-research-postgres
        fi
    else
        log_info "Creating PostgreSQL container..."

        docker run -d \
            --name qi-research-postgres \
            -e POSTGRES_USER="$db_user" \
            -e POSTGRES_PASSWORD="$db_password" \
            -e POSTGRES_DB="$db_name" \
            -p "$db_port":5432 \
            -v qi-research-pgdata:/var/lib/postgresql/data \
            postgres:15-alpine

        log_info "Waiting for PostgreSQL to be ready..."
        sleep 5

        # Wait for postgres to be ready
        local retries=30
        while [ $retries -gt 0 ]; do
            if docker exec qi-research-postgres pg_isready -U "$db_user" &> /dev/null; then
                break
            fi
            retries=$((retries - 1))
            sleep 1
        done

        if [ $retries -eq 0 ]; then
            log_error "PostgreSQL failed to start"
            exit 1
        fi
    fi

    log_success "PostgreSQL is running on port $db_port"

    # Run migrations
    log_info "Running database migrations..."

    if [ -f "./scripts/migrate.sh" ]; then
        chmod +x ./scripts/migrate.sh
        ./scripts/migrate.sh
    elif [ -f "package.json" ] && grep -q '"db:migrate"' package.json; then
        npm run db:migrate
    else
        log_warning "No migration script found. Running migrations manually..."

        # Run migration files directly
        for file in "$PROJECT_ROOT/src/db/migrations"/*.sql; do
            if [ -f "$file" ]; then
                log_info "Applying $(basename "$file")..."
                docker exec -i qi-research-postgres psql -U "$db_user" -d "$db_name" < "$file"
            fi
        done
    fi

    log_success "Database setup complete"
}

# ============================================================================
# Setup Git Hooks
# ============================================================================

setup_git_hooks() {
    log_step "Setting up Git hooks..."

    cd "$PROJECT_ROOT"

    # Create pre-commit hook for linting
    local hooks_dir="$PROJECT_ROOT/.git/hooks"
    local pre_commit_file="$hooks_dir/pre-commit"

    if [ -d ".git" ]; then
        mkdir -p "$hooks_dir"

        cat > "$pre_commit_file" << 'EOF'
#!/bin/sh
# Pre-commit hook for QI Research Pipeline

echo "Running pre-commit checks..."

# Run linter
npm run lint
if [ $? -ne 0 ]; then
    echo "Linting failed. Please fix the issues before committing."
    exit 1
fi

# Run TypeScript check
npm run build
if [ $? -ne 0 ]; then
    echo "TypeScript compilation failed. Please fix the errors before committing."
    exit 1
fi

echo "Pre-commit checks passed!"
exit 0
EOF

        chmod +x "$pre_commit_file"
        log_success "Git pre-commit hook installed"
    else
        log_warning "Not a Git repository - skipping hooks setup"
    fi
}

# ============================================================================
# Create Required Directories
# ============================================================================

create_directories() {
    log_step "Creating required directories..."

    cd "$PROJECT_ROOT"

    local directories=(
        "logs"
        "uploads"
        "temp"
        "dist"
    )

    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "Created: $dir/"
        fi
    done

    # Add to .gitignore if not present
    if [ -f ".gitignore" ]; then
        for dir in "logs" "uploads" "temp"; do
            if ! grep -q "^${dir}/$" .gitignore 2>/dev/null; then
                echo "${dir}/" >> .gitignore
            fi
        done
    fi

    log_success "Directories created"
}

# ============================================================================
# Build Project
# ============================================================================

build_project() {
    log_step "Building project..."

    cd "$PROJECT_ROOT"

    log_info "Compiling TypeScript..."
    npm run build

    log_success "Build complete"
}

# ============================================================================
# Verify Setup
# ============================================================================

verify_setup() {
    log_step "Verifying setup..."

    cd "$PROJECT_ROOT"

    local checks_passed=true

    # Check .env exists
    if [ -f ".env" ]; then
        log_success ".env file exists"
    else
        log_error ".env file missing"
        checks_passed=false
    fi

    # Check node_modules
    if [ -d "node_modules" ]; then
        log_success "node_modules installed"
    else
        log_error "node_modules missing"
        checks_passed=false
    fi

    # Check dist folder
    if [ -d "dist" ] && [ -f "dist/index.js" ]; then
        log_success "TypeScript compiled"
    else
        log_warning "dist folder empty or missing - run 'npm run build'"
    fi

    # Check database connection
    if [ "$SKIP_DB" = false ]; then
        if docker ps --format '{{.Names}}' | grep -q '^qi-research-postgres$'; then
            log_success "PostgreSQL container running"
        else
            log_warning "PostgreSQL container not running"
        fi
    fi

    if [ "$checks_passed" = false ]; then
        log_error "Some checks failed. Please fix the issues above."
        exit 1
    fi
}

# ============================================================================
# Print Next Steps
# ============================================================================

print_next_steps() {
    echo ""
    echo -e "${GREEN}=============================================="
    echo "   Development Environment Setup Complete!"
    echo "==============================================${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Update your .env file with required API keys:"
    echo "     - ANTHROPIC_API_KEY (required)"
    echo "     - N8N_API_KEY (if using n8n)"
    echo ""
    echo "  2. Start the development server:"
    echo "     ${CYAN}npm run dev${NC}"
    echo ""
    echo "  3. Run tests:"
    echo "     ${CYAN}npm test${NC}"
    echo ""
    echo "  4. Access the application:"
    echo "     http://localhost:${PORT:-3000}"
    echo ""
    echo "Useful commands:"
    echo "  ${CYAN}npm run dev${NC}        - Start development server with hot reload"
    echo "  ${CYAN}npm run build${NC}      - Build for production"
    echo "  ${CYAN}npm run lint${NC}       - Run ESLint"
    echo "  ${CYAN}npm test${NC}           - Run tests"
    echo "  ${CYAN}npm run db:migrate${NC} - Run database migrations"
    echo ""
    echo "Database:"
    echo "  Container: qi-research-postgres"
    echo "  Port: ${DB_PORT:-5432}"
    echo "  Database: ${DB_NAME:-qi_research_pipeline}"
    echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    print_banner

    check_prerequisites
    setup_environment
    install_dependencies
    create_directories
    setup_database
    setup_git_hooks
    build_project
    verify_setup
    print_next_steps
}

# Run main function
main "$@"
