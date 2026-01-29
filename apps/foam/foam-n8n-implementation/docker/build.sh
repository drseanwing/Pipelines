#!/bin/bash

# =============================================================================
# FOAM N8N Docker Image Build Script
# =============================================================================
# Builds the unified FOAM N8N Docker image
#
# Usage:
#   ./docker/build.sh              # Build with default tag (foam-n8n:latest)
#   ./docker/build.sh v1.0.0       # Build with specific version tag
#   ./docker/build.sh --no-cache   # Build without Docker cache
# =============================================================================

set -e

# Configuration
IMAGE_NAME="foam-n8n"
DEFAULT_TAG="latest"

# Parse arguments
VERSION_TAG=""
NO_CACHE=""

for arg in "$@"; do
    case $arg in
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [VERSION] [--no-cache]"
            echo ""
            echo "Examples:"
            echo "  $0                    # Build foam-n8n:latest"
            echo "  $0 v1.0.0            # Build foam-n8n:v1.0.0"
            echo "  $0 --no-cache        # Build without cache"
            echo "  $0 v1.0.0 --no-cache # Build specific version without cache"
            exit 0
            ;;
        *)
            if [[ -z "$VERSION_TAG" && ! "$arg" =~ ^-- ]]; then
                VERSION_TAG="$arg"
            fi
            ;;
    esac
done

# Set tag
TAG="${VERSION_TAG:-$DEFAULT_TAG}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}    FOAM N8N Docker Image Builder${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${GREEN}Building image:${NC} ${IMAGE_NAME}:${TAG}"
echo -e "${GREEN}Context:${NC} ${PROJECT_ROOT}"
if [[ -n "$NO_CACHE" ]]; then
    echo -e "${YELLOW}Cache:${NC} Disabled"
fi
echo ""

# Build the image
docker build \
    $NO_CACHE \
    -t "${IMAGE_NAME}:${TAG}" \
    -f Dockerfile \
    .

# Tag as latest if building a version
if [[ "$TAG" != "latest" ]]; then
    echo ""
    echo -e "${GREEN}Tagging as latest...${NC}"
    docker tag "${IMAGE_NAME}:${TAG}" "${IMAGE_NAME}:latest"
fi

echo ""
echo -e "${GREEN}=============================================================================${NC}"
echo -e "${GREEN}    Build Complete!${NC}"
echo -e "${GREEN}=============================================================================${NC}"
echo ""
echo -e "Image: ${BLUE}${IMAGE_NAME}:${TAG}${NC}"
echo ""
echo -e "Run with:"
echo -e "  ${YELLOW}docker run -d -p 5678:5678 -p 11434:11434 --name foam ${IMAGE_NAME}:${TAG}${NC}"
echo ""
echo -e "Or use the run script:"
echo -e "  ${YELLOW}./docker/run.sh${NC}"
echo ""
