#!/usr/bin/env bash
# =============================================================================
# FOAM N8N Restore Script
# =============================================================================
# Comprehensive restore solution for FOAM N8N system
# Restores: PostgreSQL DB, N8N data, workflows, environment config
#
# Usage: ./restore.sh --backup-file BACKUP_DIR [options]
# Options:
#   --backup-file DIR   Backup directory to restore from (required)
#   --decrypt           Decrypt backup with GPG passphrase
#   --no-confirm        Skip confirmation prompt
#   --component NAME    Restore specific component only (db|n8n|env|workflows|all)
#   --help              Show this help
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env"

# Default values
BACKUP_DIR=""
DECRYPT=false
NO_CONFIRM=false
COMPONENT="all"
AUTO_BACKUP=true

# Docker containers
POSTGRES_CONTAINER="foam-n8n-implementation-postgres-1"
N8N_CONTAINER="foam-n8n-implementation-n8n-1"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"
}

success() {
    echo -e "${GREEN}✓${NC} $*"
}

error() {
    echo -e "${RED}✗${NC} $*" >&2
}

warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

info() {
    echo -e "${MAGENTA}ℹ${NC} $*"
}

usage() {
    cat << EOF
FOAM N8N Restore Script

Usage: $0 --backup-file BACKUP_DIR [options]

Options:
  --backup-file DIR   Backup directory to restore from (required)
  --decrypt           Decrypt backup with GPG passphrase
  --no-confirm        Skip confirmation prompt
  --component NAME    Restore specific component only
                      Values: db, n8n, env, workflows, config, all (default: all)
  --help              Show this help

Examples:
  # Full restore with confirmation
  $0 --backup-file ./backups/foam-n8n-backup-20260125_120000

  # Restore encrypted backup without confirmation
  $0 --backup-file ./backups/foam-n8n-backup-20260125_120000 --decrypt --no-confirm

  # Restore only database
  $0 --backup-file ./backups/foam-n8n-backup-20260125_120000 --component db

  # List available backups
  ls -lh ./backups/

EOF
    exit 0
}

check_dependencies() {
    local missing=()

    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing+=("docker-compose")

    if [ "$DECRYPT" = true ]; then
        command -v gpg >/dev/null 2>&1 || missing+=("gpg")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        error "Missing required dependencies: ${missing[*]}"
        exit 1
    fi
}

validate_backup_dir() {
    if [ -z "$BACKUP_DIR" ]; then
        error "Backup directory not specified"
        echo ""
        usage
    fi

    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory does not exist: $BACKUP_DIR"
        exit 1
    fi

    if [ ! -f "$BACKUP_DIR/metadata.json" ]; then
        error "Invalid backup directory (metadata.json not found)"
        exit 1
    fi
}

verify_backup_integrity() {
    log "Verifying backup integrity..."

    local metadata_file="$BACKUP_DIR/metadata.json"
    local verified=0
    local failed=0

    while IFS= read -r line; do
        if [[ $line =~ \"([^\"]+)\":\ \"([^\"]+)\" ]]; then
            local filename="${BASH_REMATCH[1]}"
            local expected_checksum="${BASH_REMATCH[2]}"
            local file_path="$BACKUP_DIR/$filename"

            if [ -f "$file_path" ]; then
                local actual_checksum=$(sha256sum "$file_path" | cut -d' ' -f1)
                if [ "$actual_checksum" = "$expected_checksum" ]; then
                    ((verified++))
                else
                    error "Checksum mismatch for $filename"
                    ((failed++))
                fi
            else
                warning "$filename not found in backup"
            fi
        fi
    done < <(grep -A 100 '"checksums"' "$metadata_file" | grep -B 100 '^  }' | grep '":')

    if [ $failed -eq 0 ]; then
        success "All $verified files verified successfully"
        return 0
    else
        error "$failed file(s) failed verification"
        return 1
    fi
}

display_backup_info() {
    local metadata_file="$BACKUP_DIR/metadata.json"

    echo ""
    echo "=========================================="
    echo "  Backup Information"
    echo "=========================================="

    if command -v jq >/dev/null 2>&1; then
        local backup_name=$(jq -r '.backup_name' "$metadata_file")
        local date=$(jq -r '.date' "$metadata_file")
        local encrypted=$(jq -r '.encrypted' "$metadata_file")

        echo "  Name: $backup_name"
        echo "  Date: $date"
        echo "  Encrypted: $encrypted"
        echo ""
        echo "  Components:"
        jq -r '.components | to_entries[] | "    \(.key): \(.value)"' "$metadata_file"
    else
        cat "$metadata_file"
    fi

    echo "=========================================="
    echo ""
}

confirm_restore() {
    if [ "$NO_CONFIRM" = true ]; then
        return 0
    fi

    display_backup_info

    warning "This will restore data from the backup and may overwrite current data."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        info "Restore cancelled by user"
        exit 0
    fi
}

create_auto_backup() {
    if [ "$AUTO_BACKUP" = false ]; then
        return 0
    fi

    log "Creating automatic backup of current state..."

    local backup_script="$SCRIPT_DIR/backup.sh"

    if [ -f "$backup_script" ]; then
        bash "$backup_script" --output-dir "$PROJECT_DIR/backups" --quiet || {
            warning "Auto-backup failed, continuing with restore..."
        }
    else
        warning "Backup script not found, skipping auto-backup"
    fi
}

stop_services() {
    log "Stopping Docker services..."

    cd "$PROJECT_DIR"

    if docker-compose ps | grep -q "Up"; then
        docker-compose down
        success "Services stopped"
    else
        info "Services already stopped"
    fi

    # Wait for containers to fully stop
    sleep 3
}

start_services() {
    log "Starting Docker services..."

    cd "$PROJECT_DIR"

    docker-compose up -d

    # Wait for services to be ready
    sleep 5

    success "Services started"
}

restore_postgres() {
    log "Restoring PostgreSQL database..."

    local db_dump="$BACKUP_DIR/postgres-dump.sql.gz"

    if [ ! -f "$db_dump" ]; then
        error "PostgreSQL backup file not found: $db_dump"
        return 1
    fi

    # Start only postgres for restore
    docker-compose up -d postgres
    sleep 5

    # Get database credentials
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    else
        error ".env file not found"
        return 1
    fi

    # Drop existing connections and restore
    log "Dropping existing database connections..."
    docker exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-foam}" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'n8n';" || true

    log "Restoring database dump..."
    gunzip -c "$db_dump" | docker exec -i "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-foam}" -d postgres

    if [ $? -eq 0 ]; then
        success "PostgreSQL database restored"
        return 0
    else
        error "PostgreSQL restore failed"
        return 1
    fi
}

restore_n8n_data() {
    log "Restoring N8N data volume..."

    local n8n_backup="$BACKUP_DIR/n8n-data.tar.gz"

    if [ ! -f "$n8n_backup" ]; then
        error "N8N data backup file not found: $n8n_backup"
        return 1
    fi

    # Remove existing volume data
    docker run --rm \
        -v foam-n8n-implementation_n8n_data:/data \
        alpine \
        sh -c "rm -rf /data/* /data/.[!.]* 2>/dev/null || true"

    # Restore volume data
    docker run --rm \
        -v foam-n8n-implementation_n8n_data:/data \
        -v "$BACKUP_DIR:/backup" \
        alpine \
        tar xzf /backup/n8n-data.tar.gz -C /data

    if [ $? -eq 0 ]; then
        success "N8N data restored"
        return 0
    else
        error "N8N data restore failed"
        return 1
    fi
}

restore_workflows() {
    log "Restoring workflow files..."

    local workflow_backup="$BACKUP_DIR/workflows.tar.gz"

    if [ ! -f "$workflow_backup" ]; then
        warning "Workflow backup file not found, skipping"
        return 0
    fi

    # Backup existing workflows
    if [ -d "$PROJECT_DIR/workflows" ]; then
        log "Backing up existing workflows..."
        mv "$PROJECT_DIR/workflows" "$PROJECT_DIR/workflows.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # Restore workflows
    tar xzf "$workflow_backup" -C "$PROJECT_DIR"

    if [ $? -eq 0 ]; then
        success "Workflows restored"
        return 0
    else
        error "Workflow restore failed"
        return 1
    fi
}

restore_env_config() {
    log "Restoring environment configuration..."

    local env_backup="$BACKUP_DIR/.env"
    local env_encrypted="$BACKUP_DIR/.env.gpg"

    # Check if encrypted version exists
    if [ -f "$env_encrypted" ]; then
        if [ "$DECRYPT" = false ]; then
            error "Backup is encrypted but --decrypt flag not provided"
            return 1
        fi

        log "Decrypting .env file..."
        read -s -p "Enter decryption passphrase: " passphrase
        echo ""

        echo "$passphrase" | gpg --decrypt --batch --passphrase-fd 0 "$env_encrypted" > "$ENV_FILE.tmp"

        if [ $? -eq 0 ]; then
            mv "$ENV_FILE.tmp" "$ENV_FILE"
            success ".env file restored (decrypted)"
            return 0
        else
            error "Decryption failed"
            rm -f "$ENV_FILE.tmp"
            return 1
        fi
    elif [ -f "$env_backup" ]; then
        # Backup existing .env
        if [ -f "$ENV_FILE" ]; then
            cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        fi

        cp "$env_backup" "$ENV_FILE"
        success ".env file restored"
        return 0
    else
        warning ".env backup not found, skipping"
        return 0
    fi
}

restore_config_files() {
    log "Restoring configuration files..."

    local config_backup="$BACKUP_DIR/config.tar.gz"

    if [ ! -f "$config_backup" ]; then
        warning "Config backup file not found, skipping"
        return 0
    fi

    # Backup existing config
    if [ -d "$PROJECT_DIR/config" ]; then
        log "Backing up existing config..."
        mv "$PROJECT_DIR/config" "$PROJECT_DIR/config.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # Restore config
    tar xzf "$config_backup" -C "$PROJECT_DIR"

    if [ $? -eq 0 ]; then
        success "Config files restored"
        return 0
    else
        error "Config restore failed"
        return 1
    fi
}

run_health_checks() {
    log "Running health checks..."

    local checks_passed=0
    local checks_failed=0

    # Check PostgreSQL
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U foam >/dev/null 2>&1; then
        success "PostgreSQL is healthy"
        ((checks_passed++))
    else
        error "PostgreSQL health check failed"
        ((checks_failed++))
    fi

    # Check N8N (wait up to 30 seconds)
    local retries=6
    local n8n_healthy=false

    for i in $(seq 1 $retries); do
        if docker exec "$N8N_CONTAINER" wget -q --spider http://localhost:5678 2>/dev/null; then
            n8n_healthy=true
            break
        fi
        if [ $i -lt $retries ]; then
            log "Waiting for N8N to start... (attempt $i/$retries)"
            sleep 5
        fi
    done

    if [ "$n8n_healthy" = true ]; then
        success "N8N is healthy"
        ((checks_passed++))
    else
        error "N8N health check failed"
        ((checks_failed++))
    fi

    echo ""
    if [ $checks_failed -eq 0 ]; then
        success "All health checks passed ($checks_passed/$((checks_passed + checks_failed)))"
        return 0
    else
        warning "Some health checks failed ($checks_failed failed, $checks_passed passed)"
        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backup-file)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --decrypt)
                DECRYPT=true
                shift
                ;;
            --no-confirm)
                NO_CONFIRM=true
                shift
                ;;
            --component)
                COMPONENT="$2"
                shift 2
                ;;
            --help)
                usage
                ;;
            *)
                error "Unknown option: $1"
                usage
                ;;
        esac
    done

    # Print header
    echo ""
    echo "=========================================="
    echo "  FOAM N8N Restore Script"
    echo "=========================================="
    echo ""

    # Pre-flight checks
    check_dependencies
    validate_backup_dir
    verify_backup_integrity

    # Confirm restore
    confirm_restore

    # Create automatic backup
    create_auto_backup

    echo ""

    # Stop services
    stop_services

    echo ""

    # Perform restore based on component selection
    local restore_failed=false

    case $COMPONENT in
        all)
            restore_postgres || restore_failed=true
            restore_n8n_data || restore_failed=true
            restore_workflows || restore_failed=true
            restore_env_config || restore_failed=true
            restore_config_files || restore_failed=true
            ;;
        db)
            restore_postgres || restore_failed=true
            ;;
        n8n)
            restore_n8n_data || restore_failed=true
            ;;
        env)
            restore_env_config || restore_failed=true
            ;;
        workflows)
            restore_workflows || restore_failed=true
            ;;
        config)
            restore_config_files || restore_failed=true
            ;;
        *)
            error "Invalid component: $COMPONENT"
            error "Valid components: all, db, n8n, env, workflows, config"
            exit 1
            ;;
    esac

    echo ""

    # Start services
    start_services

    echo ""

    # Run health checks
    run_health_checks

    # Final summary
    echo ""
    echo "=========================================="
    if [ "$restore_failed" = false ]; then
        success "Restore completed successfully!"
    else
        warning "Restore completed with some errors"
        warning "Please check the logs above for details"
    fi
    echo ""
    echo "  Restored from: $BACKUP_DIR"
    echo "  Component: $COMPONENT"
    echo ""
    echo "  N8N URL: http://localhost:5678"
    echo "=========================================="
    echo ""
}

# Run main function
main "$@"
