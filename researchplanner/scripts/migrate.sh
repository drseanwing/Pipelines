#!/usr/bin/env bash
# ============================================================================
# QI Research Pipeline - Database Migration Script
# ============================================================================
# Description: Runs SQL migration files in order with transaction support
# Usage: ./scripts/migrate.sh [--rollback <version>] [--dry-run] [--status]
#
# Make executable: chmod +x scripts/migrate.sh
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
MIGRATIONS_DIR="$PROJECT_ROOT/src/db/migrations"

# Default options
ROLLBACK_VERSION=""
DRY_RUN=false
STATUS_ONLY=false

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

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --rollback <version>  Rollback to specific migration version"
    echo "  --dry-run            Show what would be executed without running"
    echo "  --status             Show migration status only"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                   Run all pending migrations"
    echo "  $0 --status          Show current migration status"
    echo "  $0 --rollback 001    Rollback to migration 001"
    echo "  $0 --dry-run         Preview migrations without executing"
    echo ""
}

# ============================================================================
# Parse Arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --rollback)
            ROLLBACK_VERSION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --status)
            STATUS_ONLY=true
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
# Load Environment
# ============================================================================

load_environment() {
    log_info "Loading environment configuration..."

    cd "$PROJECT_ROOT"

    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
    else
        log_error ".env file not found!"
        exit 1
    fi

    # Build DATABASE_URL if not set
    if [ -z "${DATABASE_URL:-}" ]; then
        DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    fi

    # Validate required variables
    if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PORT:-}" ] || [ -z "${DB_NAME:-}" ] || [ -z "${DB_USER:-}" ]; then
        log_error "Missing required database configuration in .env"
        exit 1
    fi

    log_success "Environment loaded"
}

# ============================================================================
# Database Connection
# ============================================================================

check_database_connection() {
    log_info "Checking database connection..."

    if ! command -v psql &> /dev/null; then
        log_warning "psql not found. Attempting to use Docker..."
        USE_DOCKER=true
    else
        USE_DOCKER=false
    fi

    if [ "$USE_DOCKER" = true ]; then
        if ! docker exec -i postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null 2>&1; then
            log_error "Cannot connect to database"
            exit 1
        fi
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null
    fi

    log_success "Database connection successful"
}

execute_sql() {
    local sql="$1"
    local db="${2:-$DB_NAME}"

    if [ "$USE_DOCKER" = true ]; then
        echo "$sql" | docker exec -i postgres psql -U "$DB_USER" -d "$db"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -c "$sql"
    fi
}

execute_sql_file() {
    local file="$1"
    local db="${2:-$DB_NAME}"

    if [ "$USE_DOCKER" = true ]; then
        docker exec -i postgres psql -U "$DB_USER" -d "$db" < "$file"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -f "$file"
    fi
}

# ============================================================================
# Migration Tracking Table
# ============================================================================

ensure_migrations_table() {
    log_info "Ensuring migrations tracking table exists..."

    local sql="
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(500) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INTEGER
    );

    COMMENT ON TABLE schema_migrations IS 'Tracks executed database migrations';
    "

    if [ "$DRY_RUN" = false ]; then
        execute_sql "$sql" > /dev/null 2>&1
    fi

    log_success "Migrations table ready"
}

# ============================================================================
# Get Migration Status
# ============================================================================

get_executed_migrations() {
    local sql="SELECT version FROM schema_migrations ORDER BY version;"

    if [ "$USE_DOCKER" = true ]; then
        echo "$sql" | docker exec -i postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A 2>/dev/null || echo ""
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$sql" 2>/dev/null || echo ""
    fi
}

show_migration_status() {
    log_info "Migration Status"
    echo "=============================================="

    # Get list of migration files
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi

    local executed_migrations
    executed_migrations=$(get_executed_migrations)

    # List all migration files
    for file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$file" ]; then
            local filename
            filename=$(basename "$file")
            local version
            version=$(echo "$filename" | grep -oE '^[0-9]+' || echo "$filename")

            if echo "$executed_migrations" | grep -q "^${version}$"; then
                echo -e "${GREEN}[APPLIED]${NC}  $filename"
            else
                echo -e "${YELLOW}[PENDING]${NC}  $filename"
            fi
        fi
    done

    echo "=============================================="
}

# ============================================================================
# Run Migrations
# ============================================================================

run_migrations() {
    log_info "Running database migrations..."

    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi

    local executed_migrations
    executed_migrations=$(get_executed_migrations)

    local pending_count=0
    local executed_count=0

    # Sort migration files numerically
    for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V); do
        if [ -f "$file" ]; then
            local filename
            filename=$(basename "$file")
            local version
            version=$(echo "$filename" | grep -oE '^[0-9]+' || echo "$filename")

            # Check if already executed
            if echo "$executed_migrations" | grep -q "^${version}$"; then
                log_info "Skipping $filename (already applied)"
                continue
            fi

            pending_count=$((pending_count + 1))
            log_info "Applying migration: $filename"

            if [ "$DRY_RUN" = true ]; then
                log_warning "[DRY RUN] Would execute: $filename"
                continue
            fi

            # Calculate checksum
            local checksum
            checksum=$(sha256sum "$file" | cut -d' ' -f1)

            # Record start time
            local start_time
            start_time=$(date +%s%N)

            # Execute migration in a transaction
            {
                echo "BEGIN;"
                cat "$file"
                echo "COMMIT;"
            } | if [ "$USE_DOCKER" = true ]; then
                docker exec -i postgres psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
            else
                PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
            fi

            if [ $? -ne 0 ]; then
                log_error "Migration failed: $filename"
                log_error "Transaction rolled back"
                exit 1
            fi

            # Calculate execution time
            local end_time
            end_time=$(date +%s%N)
            local execution_time_ms
            execution_time_ms=$(( (end_time - start_time) / 1000000 ))

            # Record successful migration
            local record_sql="INSERT INTO schema_migrations (version, filename, checksum, execution_time_ms) VALUES ('$version', '$filename', '$checksum', $execution_time_ms);"
            execute_sql "$record_sql" > /dev/null 2>&1

            executed_count=$((executed_count + 1))
            log_success "Applied: $filename (${execution_time_ms}ms)"
        fi
    done

    if [ $pending_count -eq 0 ]; then
        log_info "No pending migrations found"
    else
        log_success "Applied $executed_count migration(s)"
    fi
}

# ============================================================================
# Rollback Migrations
# ============================================================================

rollback_migrations() {
    local target_version="$1"

    log_info "Rolling back to version: $target_version"

    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi

    local executed_migrations
    executed_migrations=$(get_executed_migrations | sort -rV)

    local rollback_count=0

    for version in $executed_migrations; do
        # Stop if we've reached the target version
        if [[ "$version" == "$target_version" ]] || [[ "$version" < "$target_version" ]]; then
            break
        fi

        # Find corresponding rollback file
        local rollback_file="$MIGRATIONS_DIR/${version}_rollback.sql"
        local original_file
        original_file=$(ls "$MIGRATIONS_DIR"/${version}*.sql 2>/dev/null | grep -v rollback | head -1 || echo "")

        if [ -f "$rollback_file" ]; then
            log_info "Rolling back version: $version"

            if [ "$DRY_RUN" = true ]; then
                log_warning "[DRY RUN] Would execute: $(basename "$rollback_file")"
            else
                # Execute rollback in a transaction
                {
                    echo "BEGIN;"
                    cat "$rollback_file"
                    echo "DELETE FROM schema_migrations WHERE version = '$version';"
                    echo "COMMIT;"
                } | if [ "$USE_DOCKER" = true ]; then
                    docker exec -i postgres psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
                else
                    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
                fi

                if [ $? -ne 0 ]; then
                    log_error "Rollback failed for version: $version"
                    exit 1
                fi

                log_success "Rolled back: $version"
            fi

            rollback_count=$((rollback_count + 1))
        else
            log_warning "No rollback file found for version: $version"
            log_warning "Expected: $rollback_file"
            log_warning "You may need to manually create rollback SQL"

            # Ask for confirmation to remove from tracking table
            if [ "$DRY_RUN" = false ]; then
                read -p "Remove version $version from migration tracking? (y/N) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    execute_sql "DELETE FROM schema_migrations WHERE version = '$version';" > /dev/null 2>&1
                    log_info "Removed $version from migration tracking"
                fi
            fi
        fi
    done

    if [ $rollback_count -eq 0 ]; then
        log_info "No migrations to rollback"
    else
        log_success "Rolled back $rollback_count migration(s)"
    fi
}

# ============================================================================
# Create Rollback Template
# ============================================================================

create_rollback_template() {
    local migration_file="$1"
    local version
    version=$(basename "$migration_file" | grep -oE '^[0-9]+')
    local rollback_file="$MIGRATIONS_DIR/${version}_rollback.sql"

    if [ ! -f "$rollback_file" ]; then
        cat > "$rollback_file" << EOF
-- ============================================================================
-- Rollback for Migration: $(basename "$migration_file")
-- ============================================================================
-- WARNING: This is a template. Review and modify before executing!
-- ============================================================================

-- Add your rollback SQL here
-- Examples:
-- DROP TABLE IF EXISTS table_name CASCADE;
-- DROP FUNCTION IF EXISTS function_name() CASCADE;
-- DROP INDEX IF EXISTS index_name;
-- ALTER TABLE table_name DROP COLUMN column_name;

EOF
        log_info "Created rollback template: $rollback_file"
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log_info "QI Research Pipeline - Database Migration"
    echo "=============================================="

    load_environment
    check_database_connection
    ensure_migrations_table

    if [ "$STATUS_ONLY" = true ]; then
        show_migration_status
        exit 0
    fi

    if [ -n "$ROLLBACK_VERSION" ]; then
        rollback_migrations "$ROLLBACK_VERSION"
    else
        run_migrations
    fi

    echo ""
    show_migration_status

    log_success "Migration process completed"
}

# Run main function
main "$@"
