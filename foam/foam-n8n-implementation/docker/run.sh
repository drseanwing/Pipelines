#!/bin/bash

# =============================================================================
# FOAM N8N Docker Container Run Script
# =============================================================================
# Runs the FOAM N8N container with appropriate volume mounts and configuration
#
# Usage:
#   ./docker/run.sh              # Run with default settings
#   ./docker/run.sh --dev        # Run in development mode
#   ./docker/run.sh --pull-models # Auto-pull Ollama models on start
#   ./docker/run.sh --gpu        # Enable GPU support for Ollama
# =============================================================================

set -e

# Configuration
CONTAINER_NAME="foam-n8n"
IMAGE_NAME="foam-n8n:latest"
N8N_PORT="${N8N_PORT:-5678}"
OLLAMA_PORT="${OLLAMA_PORT:-11434}"

# Default options
DEV_MODE=false
PULL_MODELS=false
GPU_ENABLED=false
DETACHED=true
FORCE_RECREATE=false
ENV_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            DEV_MODE=true
            shift
            ;;
        --pull-models)
            PULL_MODELS=true
            shift
            ;;
        --gpu)
            GPU_ENABLED=true
            shift
            ;;
        --attach|-a)
            DETACHED=false
            shift
            ;;
        --force|-y)
            FORCE_RECREATE=true
            shift
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev           Run in development mode (mount source directories)"
            echo "  --pull-models   Automatically pull Ollama models on start"
            echo "  --gpu           Enable NVIDIA GPU support for Ollama"
            echo "  --attach, -a    Run in foreground (attached mode)"
            echo "  --force, -y     Force recreate container without prompting"
            echo "  --env-file FILE Use specific environment file"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                          # Start in background"
            echo "  $0 --dev --attach           # Development mode, foreground"
            echo "  $0 --gpu --pull-models      # GPU mode with model pulling"
            echo "  $0 --force                  # Recreate without prompts"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}    FOAM N8N Container Runner${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    if [ "$FORCE_RECREATE" = true ]; then
        echo -e "${YELLOW}Force mode: Removing existing container...${NC}"
        docker stop "${CONTAINER_NAME}" 2>/dev/null || true
        docker rm "${CONTAINER_NAME}" 2>/dev/null || true
    else
        echo -e "${YELLOW}Container '${CONTAINER_NAME}' already exists.${NC}"
        echo -n "Remove and recreate? [y/N]: "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Stopping and removing existing container...${NC}"
            docker stop "${CONTAINER_NAME}" 2>/dev/null || true
            docker rm "${CONTAINER_NAME}" 2>/dev/null || true
        else
            echo "Aborting."
            exit 0
        fi
    fi
fi

# Build docker run command using an array (safer than eval)
DOCKER_CMD=(docker run)

# Detached or attached mode
if [ "$DETACHED" = true ]; then
    DOCKER_CMD+=(-d)
else
    DOCKER_CMD+=(-it)
fi

# Container name
DOCKER_CMD+=(--name "${CONTAINER_NAME}")

# Port mappings
DOCKER_CMD+=(-p "${N8N_PORT}:5678")
DOCKER_CMD+=(-p "${OLLAMA_PORT}:11434")

# Volume mounts for persistent data
DOCKER_CMD+=(-v foam_postgres_data:/var/lib/postgresql/data)
DOCKER_CMD+=(-v foam_ollama_data:/root/.ollama)
DOCKER_CMD+=(-v foam_n8n_data:/home/node/.n8n)
DOCKER_CMD+=(-v foam_backups:/app/backups)
DOCKER_CMD+=(-v foam_logs:/var/log/foam)

# Development mode mounts
if [ "$DEV_MODE" = true ]; then
    echo -e "${YELLOW}Development mode: Mounting source directories${NC}"
    DOCKER_CMD+=(-v "${PROJECT_ROOT}/workflows:/app/workflows")
    DOCKER_CMD+=(-v "${PROJECT_ROOT}/code:/app/code")
    DOCKER_CMD+=(-v "${PROJECT_ROOT}/config:/app/config")
    DOCKER_CMD+=(-v "${PROJECT_ROOT}/schemas:/app/schemas")
    DOCKER_CMD+=(-v "${PROJECT_ROOT}/templates:/app/templates")
fi

# Environment file
if [ -n "$ENV_FILE" ]; then
    if [ -f "$ENV_FILE" ]; then
        DOCKER_CMD+=(--env-file "${ENV_FILE}")
    else
        echo -e "${RED}Environment file not found: ${ENV_FILE}${NC}"
        exit 1
    fi
elif [ -f "${PROJECT_ROOT}/.env" ]; then
    DOCKER_CMD+=(--env-file "${PROJECT_ROOT}/.env")
elif [ -f "${PROJECT_ROOT}/docker/docker.env" ]; then
    DOCKER_CMD+=(--env-file "${PROJECT_ROOT}/docker/docker.env")
fi

# Model pulling
if [ "$PULL_MODELS" = true ]; then
    DOCKER_CMD+=(-e FOAM_PULL_MODELS=true)
fi

# GPU support
if [ "$GPU_ENABLED" = true ]; then
    echo -e "${GREEN}GPU mode: Enabling NVIDIA GPU${NC}"
    DOCKER_CMD+=(--gpus all)
fi

# Restart policy
DOCKER_CMD+=(--restart unless-stopped)

# Image name
DOCKER_CMD+=("${IMAGE_NAME}")

# Print configuration
echo -e "${GREEN}Configuration:${NC}"
echo -e "  Container:    ${CONTAINER_NAME}"
echo -e "  Image:        ${IMAGE_NAME}"
echo -e "  N8N Port:     ${N8N_PORT}"
echo -e "  Ollama Port:  ${OLLAMA_PORT}"
echo -e "  Dev Mode:     ${DEV_MODE}"
echo -e "  Pull Models:  ${PULL_MODELS}"
echo -e "  GPU Enabled:  ${GPU_ENABLED}"
echo -e "  Detached:     ${DETACHED}"
echo ""

# Run container using array execution (safe)
echo -e "${GREEN}Starting container...${NC}"
echo ""

"${DOCKER_CMD[@]}"

if [ "$DETACHED" = true ]; then
    echo ""
    echo -e "${GREEN}=============================================================================${NC}"
    echo -e "${GREEN}    Container Started!${NC}"
    echo -e "${GREEN}=============================================================================${NC}"
    echo ""
    echo -e "${BLUE}Services:${NC}"
    echo -e "  N8N Web UI:    http://localhost:${N8N_PORT}"
    echo -e "  Ollama API:    http://localhost:${OLLAMA_PORT}"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo -e "  View logs:     docker logs -f ${CONTAINER_NAME}"
    echo -e "  Shell access:  docker exec -it ${CONTAINER_NAME} bash"
    echo -e "  Stop:          docker stop ${CONTAINER_NAME}"
    echo -e "  Start:         docker start ${CONTAINER_NAME}"
    echo -e "  Remove:        docker rm ${CONTAINER_NAME}"
    echo ""
    echo -e "${BLUE}Service Status:${NC}"
    echo -e "  docker exec ${CONTAINER_NAME} supervisorctl status"
    echo ""

    # Wait a moment and show initial status
    sleep 3
    echo -e "${YELLOW}Initial container status:${NC}"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi
