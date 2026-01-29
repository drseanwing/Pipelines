#!/usr/bin/env bash
set -e

# ==============================================================================
# REdI | CritLit Systematic Literature Review Stack - Startup Script
# ==============================================================================
# This script orchestrates the startup of all Docker services with proper
# health checks and dependency ordering.
# ==============================================================================

# Colors for output (cross-platform friendly)
if [[ -t 1 ]]; then
  CORAL='\033[38;2;229;91;100m'
  NAVY='\033[38;2;27;58;95m'
  TEAL='\033[38;2;43;158;158m'
  RED='\033[38;2;220;53;69m'
  GREEN='\033[38;2;40;167;69m'
  YELLOW='\033[38;2;255;193;7m'
  NC='\033[0m'
else
  CORAL=''
  NAVY=''
  TEAL=''
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

# Print banner
echo -e "${NAVY}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${NAVY}║${NC}  ${CORAL}R${NC}${NAVY}Ed${NC}${CORAL}I${NC} | CritLit - Systematic Literature Review Stack      ${NAVY}║${NC}"
echo -e "${NAVY}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory for relative paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

# ------------------------------------------------------------------------------
# Step 1: Environment File Check
# ------------------------------------------------------------------------------
echo -e "${TEAL}[1/9]${NC} Checking environment configuration..."

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo -e "${YELLOW}⚠ WARNING:${NC} .env file not found!"
    echo -e "  Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${RED}✗ ACTION REQUIRED:${NC}"
    echo -e "  Please edit ${YELLOW}.env${NC} and set your credentials before continuing."
    echo -e "  Required variables:"
    echo -e "    - POSTGRES_PASSWORD"
    echo -e "    - N8N_PASSWORD"
    echo -e "    - N8N_ENCRYPTION_KEY (generate with: openssl rand -base64 32)"
    echo -e "    - ANTHROPIC_API_KEY (optional but recommended)"
    echo ""
    exit 1
  else
    echo -e "${RED}✗ ERROR:${NC} .env.example file not found!"
    echo -e "  Cannot create .env file. Please check your installation."
    exit 1
  fi
else
  echo -e "${GREEN}✓${NC} .env file found"
fi

# ------------------------------------------------------------------------------
# Step 2: Docker Compose Up
# ------------------------------------------------------------------------------
echo ""
echo -e "${TEAL}[2/9]${NC} Starting Docker services..."

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ ERROR:${NC} Docker is not installed or not in PATH"
  echo -e "  Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
  exit 1
fi

# Use docker compose (v2) or docker-compose (v1)
if docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo -e "${RED}✗ ERROR:${NC} docker-compose is not available"
  exit 1
fi

# Start services
$DOCKER_COMPOSE up -d

echo -e "${GREEN}✓${NC} Docker services started"

# ------------------------------------------------------------------------------
# Step 3: PostgreSQL Health Check
# ------------------------------------------------------------------------------
echo ""
echo -e "${TEAL}[3/9]${NC} Waiting for PostgreSQL..."

MAX_WAIT=60
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  # Check if postgres service is healthy
  STATUS=$($DOCKER_COMPOSE ps postgres --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "starting")

  if [ "$STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓${NC} PostgreSQL is healthy"
    break
  fi

  echo -n "."
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo ""
  echo -e "${RED}✗ ERROR:${NC} PostgreSQL failed to become healthy within ${MAX_WAIT}s"
  echo -e "  Check logs with: ${YELLOW}$DOCKER_COMPOSE logs postgres${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# Step 4: Redis Health Check
# ------------------------------------------------------------------------------
echo ""
echo -e "${TEAL}[4/9]${NC} Waiting for Redis..."

MAX_WAIT=30
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  if $DOCKER_COMPOSE exec -T redis redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓${NC} Redis is responding"
    break
  fi

  echo -n "."
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo ""
  echo -e "${RED}✗ ERROR:${NC} Redis failed to respond within ${MAX_WAIT}s"
  echo -e "  Check logs with: ${YELLOW}$DOCKER_COMPOSE logs redis${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# Step 5: n8n Health Check
# ------------------------------------------------------------------------------
echo ""
echo -e "${TEAL}[5/9]${NC} Waiting for n8n..."

MAX_WAIT=60
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  # Check if n8n is responding (ignore auth)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7361 2>/dev/null || echo "000")

  # 401 (Unauthorized) means n8n is up but requires auth - that's success
  if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} n8n is responding"
    break
  fi

  echo -n "."
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo ""
  echo -e "${RED}✗ ERROR:${NC} n8n failed to respond within ${MAX_WAIT}s"
  echo -e "  Check logs with: ${YELLOW}$DOCKER_COMPOSE logs n8n${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# Step 6: Ollama Health Check
# ------------------------------------------------------------------------------
echo ""
echo -e "${TEAL}[6/9]${NC} Waiting for Ollama..."

MAX_WAIT=60
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  # Ollama API returns 200 for /api/tags endpoint
  if curl -s http://localhost:7362/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Ollama is responding"
    break
  fi

  echo -n "."
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo ""
  echo -e "${YELLOW}⚠ WARNING:${NC} Ollama failed to respond within ${MAX_WAIT}s"
  echo -e "  This is expected if you don't have a GPU."
  echo -e "  Check logs with: ${YELLOW}$DOCKER_COMPOSE logs ollama${NC}"
fi

# ------------------------------------------------------------------------------
# Step 7: i-Librarian Health Check
# ------------------------------------------------------------------------------
echo ""
echo -e "${TEAL}[7/9]${NC} Waiting for i-Librarian..."

MAX_WAIT=30
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7363 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓${NC} i-Librarian is responding"
    break
  fi

  echo -n "."
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo ""
  echo -e "${YELLOW}⚠ WARNING:${NC} i-Librarian failed to respond within ${MAX_WAIT}s"
  echo -e "  Check logs with: ${YELLOW}$DOCKER_COMPOSE logs i-librarian${NC}"
fi

# ------------------------------------------------------------------------------
# Step 8: Check n8n Worker
# ------------------------------------------------------------------------------
echo ""
echo -e "${TEAL}[8/9]${NC} Checking n8n worker..."

if $DOCKER_COMPOSE ps n8n-worker --format json 2>/dev/null | grep -q '"State":"running"'; then
  echo -e "${GREEN}✓${NC} n8n worker is running"
else
  echo -e "${YELLOW}⚠ WARNING:${NC} n8n worker is not running"
  echo -e "  Check logs with: ${YELLOW}$DOCKER_COMPOSE logs n8n-worker${NC}"
fi

# ------------------------------------------------------------------------------
# Step 9: Success Summary
# ------------------------------------------------------------------------------
echo ""
echo -e "${TEAL}[9/9]${NC} Startup complete!"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${NAVY}Services Running${NC}                                             ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  ${TEAL}PostgreSQL (pgvector)${NC}     http://localhost:7360              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${TEAL}n8n Workflow Automation${NC}   http://localhost:7361              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${TEAL}i-Librarian${NC}               http://localhost:7363              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${TEAL}Ollama (LLM)${NC}              http://localhost:7362              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${TEAL}Redis${NC}                     (internal only)                    ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${NAVY}Tips:${NC}"
echo -e "  • View all logs:        ${YELLOW}$DOCKER_COMPOSE logs -f${NC}"
echo -e "  • View specific service: ${YELLOW}$DOCKER_COMPOSE logs -f <service>${NC}"
echo -e "  • Stop all services:    ${YELLOW}$DOCKER_COMPOSE down${NC}"
echo -e "  • Restart a service:    ${YELLOW}$DOCKER_COMPOSE restart <service>${NC}"
echo ""
