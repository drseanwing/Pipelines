#!/usr/bin/env bash
# =============================================================================
# FOAM N8N Backup Script
# =============================================================================
# Comprehensive backup solution for FOAM N8N system
# Backs up: PostgreSQL DB, N8N data, workflows, environment config
#
# Usage: ./backup.sh [options]
# Options:
#   --output-dir DIR    Backup directory (default: ./backups)
#   --encrypt           Encrypt backup with GPG passphrase
#   --retain N          Keep N most recent backups (default: 7)
#   --quiet             Minimal output
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
BACKUP_DIR="$PROJECT_DIR/backups"
ENCRYPT=false
RETAIN_COUNT=7
QUIET=false
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="foam-n8n-backup-$TIMESTAMP"

# Docker containers
POSTGRES_CONTAINER="foam-n8n-implementation-postgres-1"
N8N_CONTAINER="foam-n8n-implementation-n8n-1"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    if [ "$QUIET" = false ]; then
        echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"
    fi
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

usage() {
    cat << EOF
FOAM N8N Backup Script

Usage: $0 [options]

Options:
  --output-dir DIR    Backup directory (default: ./backups)
  --encrypt           Encrypt backup with GPG passphrase
  --retain N          Keep N most recent backups (default: 7)
  --quiet             Minimal output
  --help              Show this help

Examples:
  # Basic backup
  $0

  # Encrypted backup with custom location
  $0 --output-dir /mnt/backups --encrypt

  # Keep only last 14 backups
  $0 --retain 14

EOF
    exit 0
}

check_dependencies() {
    local missing=()

    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing+=("docker-compose")

    if [ "$ENCRYPT" = true ]; then
        command -v gpg >/dev/null 2>&1 || missing+=("gpg")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        error "Missing required dependencies: ${missing[*]}"
        exit 1
    fi
}

check_containers() {
    log "Checking Docker containers..."

    if ! docker ps --format '{{.Names}}' | grep -q "$POSTGRES_CONTAINER"; then
        error "PostgreSQL container not running: $POSTGRES_CONTAINER"
        exit 1
    fi

    if ! docker ps --format '{{.Names}}' | grep -q "$N8N_CONTAINER"; then
        warning "N8N container not running: $N8N_CONTAINER"
        warning "Continuing with available components..."
    fi
}

create_backup_dir() {
    local backup_path="$BACKUP_DIR/$BACKUP_NAME"
    mkdir -p "$backup_path"
    echo "$backup_path"
}

backup_postgres() {
    local backup_path="$1"
    log "Backing up PostgreSQL database..."

    local db_dump="$backup_path/postgres-dump.sql"

    # Get database credentials from .env
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    else
        error ".env file not found at $ENV_FILE"
        return 1
    fi

    # Create database dump
    docker exec "$POSTGRES_CONTAINER" pg_dumpall -U "${POSTGRES_USER:-foam}" | gzip > "$db_dump.gz"

    if [ $? -eq 0 ]; then
        local size=$(du -h "$db_dump.gz" | cut -f1)
        success "PostgreSQL backup complete ($size)"
    else
        error "PostgreSQL backup failed"
        return 1
    fi
}

backup_n8n_data() {
    local backup_path="$1"
    log "Backing up N8N data volume..."

    local n8n_backup="$backup_path/n8n-data.tar.gz"

    # Export N8N data volume
    docker run --rm \
        -v foam-n8n-implementation_n8n_data:/data \
        -v "$backup_path:/backup" \
        alpine \
        tar czf /backup/n8n-data.tar.gz -C /data .

    if [ $? -eq 0 ]; then
        local size=$(du -h "$n8n_backup" | cut -f1)
        success "N8N data backup complete ($size)"
    else
        error "N8N data backup failed"
        return 1
    fi
}

backup_workflows() {
    local backup_path="$1"
    log "Backing up workflow files..."

    local workflow_dir="$PROJECT_DIR/workflows"
    local workflow_backup="$backup_path/workflows.tar.gz"

    if [ -d "$workflow_dir" ]; then
        tar czf "$workflow_backup" -C "$PROJECT_DIR" workflows

        if [ $? -eq 0 ]; then
            local size=$(du -h "$workflow_backup" | cut -f1)
            success "Workflow backup complete ($size)"
        else
            error "Workflow backup failed"
            return 1
        fi
    else
        warning "Workflow directory not found, skipping"
    fi
}

backup_env_config() {
    local backup_path="$1"
    log "Backing up environment configuration..."

    if [ -f "$ENV_FILE" ]; then
        local env_backup="$backup_path/.env"
        cp "$ENV_FILE" "$env_backup"

        if [ "$ENCRYPT" = true ]; then
            log "Encrypting .env file..."
            gpg --symmetric --cipher-algo AES256 --batch --yes --passphrase-fd 0 "$env_backup" < <(read -s -p "Enter encryption passphrase: " pass; echo "$pass")
            rm "$env_backup"
            success ".env encrypted and backed up"
        else
            success ".env backed up (unencrypted)"
            warning "Consider using --encrypt to protect sensitive credentials"
        fi
    else
        warning ".env file not found, skipping"
    fi
}

backup_config_files() {
    local backup_path="$1"
    log "Backing up configuration files..."

    local config_backup="$backup_path/config.tar.gz"

    if [ -d "$PROJECT_DIR/config" ]; then
        tar czf "$config_backup" -C "$PROJECT_DIR" config
        success "Config files backed up"
    else
        warning "Config directory not found, skipping"
    fi
}

generate_metadata() {
    local backup_path="$1"
    log "Generating backup metadata..."

    local metadata_file="$backup_path/metadata.json"

    cat > "$metadata_file" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "backup_version": "1.0",
  "encrypted": $ENCRYPT,
  "components": {
    "postgres": true,
    "n8n_data": true,
    "workflows": $([ -f "$backup_path/workflows.tar.gz" ] && echo "true" || echo "false"),
    "env_config": $([ -f "$backup_path/.env" ] || [ -f "$backup_path/.env.gpg" ] && echo "true" || echo "false"),
    "config_files": $([ -f "$backup_path/config.tar.gz" ] && echo "true" || echo "false")
  },
  "checksums": {
EOF

    # Generate checksums for all backup files
    local first=true
    for file in "$backup_path"/*; do
        if [ -f "$file" ] && [ "$(basename "$file")" != "metadata.json" ]; then
            if [ "$first" = false ]; then
                echo "," >> "$metadata_file"
            fi
            local checksum=$(sha256sum "$file" | cut -d' ' -f1)
            local filename=$(basename "$file")
            echo -n "    \"$filename\": \"$checksum\"" >> "$metadata_file"
            first=false
        fi
    done

    cat >> "$metadata_file" << EOF

  },
  "sizes": {
EOF

    # Add file sizes
    first=true
    for file in "$backup_path"/*; do
        if [ -f "$file" ] && [ "$(basename "$file")" != "metadata.json" ]; then
            if [ "$first" = false ]; then
                echo "," >> "$metadata_file"
            fi
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            local filename=$(basename "$file")
            echo -n "    \"$filename\": $size" >> "$metadata_file"
            first=false
        fi
    done

    cat >> "$metadata_file" << EOF

  }
}
EOF

    success "Metadata generated"
}

verify_backup() {
    local backup_path="$1"
    log "Verifying backup integrity..."

    local metadata_file="$backup_path/metadata.json"

    if [ ! -f "$metadata_file" ]; then
        error "Metadata file not found"
        return 1
    fi

    # Verify all checksums
    local verified=0
    local failed=0

    while IFS= read -r line; do
        if [[ $line =~ \"([^\"]+)\":\ \"([^\"]+)\" ]]; then
            local filename="${BASH_REMATCH[1]}"
            local expected_checksum="${BASH_REMATCH[2]}"
            local file_path="$backup_path/$filename"

            if [ -f "$file_path" ]; then
                local actual_checksum=$(sha256sum "$file_path" | cut -d' ' -f1)
                if [ "$actual_checksum" = "$expected_checksum" ]; then
                    ((verified++))
                else
                    error "Checksum mismatch for $filename"
                    ((failed++))
                fi
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

cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $RETAIN_COUNT)..."

    # List all backup directories sorted by date
    local backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "foam-n8n-backup-*" | wc -l)

    if [ "$backup_count" -gt "$RETAIN_COUNT" ]; then
        local to_delete=$((backup_count - RETAIN_COUNT))

        find "$BACKUP_DIR" -maxdepth 1 -type d -name "foam-n8n-backup-*" | \
            sort | \
            head -n "$to_delete" | \
            while read -r old_backup; do
                log "Removing old backup: $(basename "$old_backup")"
                rm -rf "$old_backup"
            done

        success "Removed $to_delete old backup(s)"
    else
        log "No old backups to remove"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --output-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --encrypt)
                ENCRYPT=true
                shift
                ;;
            --retain)
                RETAIN_COUNT="$2"
                shift 2
                ;;
            --quiet)
                QUIET=true
                shift
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
    if [ "$QUIET" = false ]; then
        echo ""
        echo "=========================================="
        echo "  FOAM N8N Backup Script"
        echo "=========================================="
        echo ""
    fi

    # Pre-flight checks
    check_dependencies
    check_containers

    # Create backup directory
    local backup_path=$(create_backup_dir)
    log "Backup location: $backup_path"
    echo ""

    # Perform backups
    backup_postgres "$backup_path"
    backup_n8n_data "$backup_path"
    backup_workflows "$backup_path"
    backup_env_config "$backup_path"
    backup_config_files "$backup_path"

    echo ""

    # Generate metadata and verify
    generate_metadata "$backup_path"
    verify_backup "$backup_path"

    # Cleanup old backups
    echo ""
    cleanup_old_backups

    # Final summary
    echo ""
    echo "=========================================="
    local total_size=$(du -sh "$backup_path" | cut -f1)
    success "Backup completed successfully!"
    echo ""
    echo "  Location: $backup_path"
    echo "  Size: $total_size"
    echo "  Encrypted: $([ "$ENCRYPT" = true ] && echo "Yes" || echo "No")"
    echo "=========================================="
    echo ""
}

# Run main function
main "$@"
