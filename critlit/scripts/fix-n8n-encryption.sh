#!/bin/bash
# CritLit - n8n Encryption Key Troubleshooting Script
# This script helps diagnose and resolve n8n encryption key mismatch errors.

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project name prefix for Docker volumes
# This should match the directory name or docker-compose project name
PROJECT_PREFIX=${COMPOSE_PROJECT_NAME:-critlit}

# Initialize ENV_KEY to avoid undefined variable issues
ENV_KEY=""
STORED_KEY=""

# Cross-platform sed -i (macOS vs Linux)
sed_inplace() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

print_header() {
    echo ""
    echo "========================================"
    echo -e "${BLUE}$1${NC}"
    echo "========================================"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_failure() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_header "n8n Encryption Key Troubleshooting"

echo "This script helps diagnose and resolve the error:"
echo ""
echo -e "${RED}Error: Mismatching encryption keys. The encryption key in the settings file"
echo -e "/home/node/.n8n/config does not match the N8N_ENCRYPTION_KEY env var.${NC}"
echo ""

# Step 1: Check if .env file exists
print_header "Step 1: Checking Environment Configuration"

if [ -f .env ]; then
    print_success ".env file found"
    
    # Check if N8N_ENCRYPTION_KEY is set
    if grep -q "^N8N_ENCRYPTION_KEY=" .env; then
        ENV_KEY=$(grep "^N8N_ENCRYPTION_KEY=" .env | cut -d'=' -f2-)
        if [ -z "$ENV_KEY" ] || [ "$ENV_KEY" = "your_encryption_key_base64" ] || [ "$ENV_KEY" = "change_me_to_random_32_byte_hex_string" ]; then
            print_failure "N8N_ENCRYPTION_KEY is not set to a valid value in .env"
            print_info "Generate a key with: openssl rand -base64 32"
        else
            print_success "N8N_ENCRYPTION_KEY is set in .env"
            print_info "Current key (first 8 chars): ${ENV_KEY:0:8}..."
        fi
    else
        print_failure "N8N_ENCRYPTION_KEY not found in .env file"
    fi
else
    print_failure ".env file not found"
    print_info "Copy .env.example to .env: cp .env.example .env"
    exit 1
fi

# Step 2: Check if n8n volume exists and contains config
print_header "Step 2: Checking n8n Data Volume"

# Find the volume name (could be critlit_n8n_data or slr_n8n_data depending on project name)
# Build unique list of prefixes to check
declare -a PREFIXES=()
for prefix in "critlit" "slr"; do
    PREFIXES+=("$prefix")
done
# Add PROJECT_PREFIX only if it's different from the hardcoded values
if [[ "$PROJECT_PREFIX" != "critlit" ]] && [[ "$PROJECT_PREFIX" != "slr" ]]; then
    PREFIXES+=("$PROJECT_PREFIX")
fi

VOLUME_NAME=""
for prefix in "${PREFIXES[@]}"; do
    if docker volume ls -q | grep -q "^${prefix}_n8n_data$"; then
        VOLUME_NAME="${prefix}_n8n_data"
        break
    fi
done

if [ -z "$VOLUME_NAME" ]; then
    print_info "No existing n8n data volume found"
    print_success "This is a fresh installation - no encryption key conflict expected"
    echo ""
    echo "If you're still seeing the error, ensure your .env file has a valid N8N_ENCRYPTION_KEY:"
    echo "  openssl rand -base64 32"
    exit 0
fi

print_success "Found n8n data volume: $VOLUME_NAME"

# Try to read the encryption key from the volume
print_header "Step 3: Checking Stored Encryption Key"

# Extract the key from the config file in the volume
STORED_KEY=$(docker run --rm -v "${VOLUME_NAME}:/data" alpine cat /data/config 2>/dev/null | grep -o '"encryptionKey":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$STORED_KEY" ]; then
    print_info "No encryption key found in n8n config (volume may be empty or config not created yet)"
else
    print_success "Found stored encryption key in n8n config"
    print_info "Stored key (first 8 chars): ${STORED_KEY:0:8}..."
    
    # Compare keys (only if ENV_KEY is set)
    if [ -n "$ENV_KEY" ] && [ "$ENV_KEY" = "$STORED_KEY" ]; then
        print_success "Keys match! There should be no encryption key error."
        print_info "If you're still seeing errors, try restarting the containers:"
        echo "  docker compose restart n8n n8n-worker"
        exit 0
    else
        print_failure "Keys DO NOT match - this is causing the error"
        echo ""
        echo -e "${YELLOW}The encryption key in your .env file does not match the key${NC}"
        echo -e "${YELLOW}stored in the n8n data volume.${NC}"
    fi
fi

# Step 4: Offer solutions
print_header "Step 4: Available Solutions"

echo "Choose one of the following options:"
echo ""
echo -e "${GREEN}Option 1:${NC} Update .env to use the stored key (preserves credentials)"
echo "   This is recommended if you have stored workflows and credentials in n8n."
echo ""
if [ -n "$STORED_KEY" ]; then
    print_warning "The stored key will be displayed. Avoid sharing this on screen."
    echo ""
    echo "   To view and copy the stored key, run:"
    echo "   docker run --rm -v \"${VOLUME_NAME}:/data\" alpine cat /data/config | grep -o '\"encryptionKey\":\"[^\"]*\"' | cut -d'\"' -f4"
    echo ""
    echo "   Then update N8N_ENCRYPTION_KEY in your .env file with the key value."
    echo ""
fi

echo -e "${GREEN}Option 2:${NC} Delete n8n data and start fresh (loses credentials)"
echo "   This is recommended for new installations or if you don't need existing data."
echo ""
echo "   Commands to reset:"
echo "   docker compose down"
echo "   docker volume rm \"$VOLUME_NAME\""
echo "   docker compose up -d"
echo ""

echo -e "${GREEN}Option 3:${NC} Automatic fix (choose interactively)"
echo ""
read -p "Would you like to apply a fix automatically? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Choose a fix:"
    echo "  1) Update .env to use stored key (preserves data)"
    echo "  2) Delete n8n volume and start fresh (loses data)"
    echo "  3) Cancel"
    echo ""
    read -p "Enter choice (1/2/3): " -n 1 -r CHOICE
    echo ""
    
    case $CHOICE in
        1)
            if [ -n "$STORED_KEY" ]; then
                print_info "Updating .env with stored encryption key..."
                # Use sed_inplace for cross-platform compatibility
                # Escape special characters in the key for sed
                ESCAPED_KEY=$(printf '%s\n' "$STORED_KEY" | sed 's/[&/\]/\\&/g')
                sed_inplace "s|^N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=${ESCAPED_KEY}|" .env
                print_success ".env updated with stored key"
                echo ""
                print_info "Restarting n8n containers..."
                docker compose restart n8n n8n-worker 2>/dev/null || docker-compose restart n8n n8n-worker
                print_success "Containers restarted"
                echo ""
                print_success "Fix applied! Check n8n at http://localhost:5678"
            else
                print_failure "No stored key found to use"
            fi
            ;;
        2)
            print_warning "This will delete all n8n workflows and stored credentials!"
            read -p "Are you sure? (y/N): " -n 1 -r CONFIRM
            echo ""
            if [[ $CONFIRM =~ ^[Yy]$ ]]; then
                print_info "Stopping containers..."
                docker compose down 2>/dev/null || docker-compose down
                print_info "Removing n8n data volume..."
                docker volume rm "$VOLUME_NAME"
                print_info "Starting containers with fresh data..."
                docker compose up -d 2>/dev/null || docker-compose up -d
                print_success "n8n reset complete! Access at http://localhost:5678"
            else
                print_info "Cancelled - no changes made"
            fi
            ;;
        3)
            print_info "Cancelled - no changes made"
            ;;
        *)
            print_failure "Invalid choice"
            ;;
    esac
else
    print_info "No automatic fix applied. Use the manual commands above."
fi

echo ""
print_header "Additional Resources"
echo "- n8n Encryption Key Documentation:"
echo "  https://docs.n8n.io/hosting/environment-variables/configuration-methods/#encryption-key"
echo ""
echo "- CritLit Quickstart Troubleshooting:"
echo "  See docs/QUICKSTART.md for more troubleshooting tips"
echo ""
