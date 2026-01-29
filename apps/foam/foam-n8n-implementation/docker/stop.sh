#!/bin/bash

# =============================================================================
# FOAM N8N Docker Container Stop Script
# =============================================================================
# Gracefully stops the FOAM N8N container
# =============================================================================

set -e

CONTAINER_NAME="foam-n8n"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Stopping FOAM N8N container...${NC}"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    # Graceful shutdown - stop services first
    echo -e "${YELLOW}Sending graceful shutdown signal...${NC}"
    docker exec "${CONTAINER_NAME}" supervisorctl stop all 2>/dev/null || true
    sleep 2

    # Stop the container
    docker stop "${CONTAINER_NAME}"
    echo -e "${GREEN}Container stopped successfully.${NC}"
else
    echo -e "${RED}Container '${CONTAINER_NAME}' is not running.${NC}"
    exit 1
fi
