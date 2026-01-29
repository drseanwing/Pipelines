#!/bin/bash

# FOAM N8N Monitoring Setup Script
# Version: 1.0.0
# Quick setup for the Prometheus + Grafana monitoring stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}FOAM N8N Monitoring Stack Setup${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ] || [ ! -f "docker-compose.monitoring.yml" ]; then
    echo -e "${RED}Error: Must run from foam-n8n-implementation directory${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: No .env file found${NC}"
    echo "Creating .env from template with randomly generated passwords..."

    # Generate random passwords
    N8N_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    POSTGRES_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    GRAFANA_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    cat > .env << EOF
# N8N Configuration
N8N_USER=admin
N8N_PASSWORD=${N8N_PASS}
N8N_HOST=localhost
POSTGRES_USER=n8n
POSTGRES_PASSWORD=${POSTGRES_PASS}

# Monitoring Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=${GRAFANA_PASS}
DOMAIN=localhost

EOF
    echo -e "${GREEN}✓ Created .env file with randomly generated secure passwords${NC}"
    echo -e "${RED}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${RED}│ IMPORTANT SECURITY NOTICE:                                 │${NC}"
    echo -e "${RED}│ Random passwords have been generated and saved to .env     │${NC}"
    echo -e "${RED}│ Please save these credentials securely!                    │${NC}"
    echo -e "${RED}│                                                            │${NC}"
    echo -e "${RED}│ View passwords: cat .env                                   │${NC}"
    echo -e "${RED}│                                                            │${NC}"
    echo -e "${RED}│ You should:                                                │${NC}"
    echo -e "${RED}│ 1. Immediately backup the .env file securely              │${NC}"
    echo -e "${RED}│ 2. Restrict .env file permissions: chmod 600 .env         │${NC}"
    echo -e "${RED}│ 3. Never commit .env to version control                   │${NC}"
    echo -e "${RED}└────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    read -p "Press Enter to continue after saving your credentials..."
fi

# Load environment variables
source .env

# Verify required variables
if [ -z "$GRAFANA_ADMIN_PASSWORD" ] || [ "$GRAFANA_ADMIN_PASSWORD" = "change_this_secure_password" ]; then
    echo -e "${RED}Error: Please set GRAFANA_ADMIN_PASSWORD in .env file${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Checking Docker and Docker Compose${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

echo -e "${GREEN}Step 2: Creating required directories${NC}"
mkdir -p config/grafana/dashboards
mkdir -p config/grafana/provisioning/datasources
mkdir -p config/grafana/provisioning/dashboards
mkdir -p backups
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

echo -e "${GREEN}Step 3: Checking configuration files${NC}"
required_files=(
    "config/prometheus.yml"
    "config/alerting-rules.yml"
    "config/postgres-exporter-queries.yaml"
    "config/grafana/provisioning/datasources/prometheus.yml"
    "config/grafana/provisioning/dashboards/default.yml"
    "config/grafana/dashboards/foam-overview.json"
    "docker-compose.monitoring.yml"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ Missing: $file${NC}"
        missing_files=$((missing_files + 1))
    else
        echo -e "${GREEN}✓ Found: $file${NC}"
    fi
done

if [ $missing_files -gt 0 ]; then
    echo -e "${RED}Error: $missing_files required file(s) missing${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}Step 4: Starting base FOAM system${NC}"
docker compose up -d
echo "Waiting for services to be healthy..."
sleep 10
echo -e "${GREEN}✓ Base system started${NC}"
echo ""

echo -e "${GREEN}Step 5: Starting monitoring stack${NC}"
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

echo "Waiting for monitoring services to start..."
sleep 15
echo -e "${GREEN}✓ Monitoring stack started${NC}"
echo ""

echo -e "${GREEN}Step 6: Verifying service health${NC}"

# Check Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prometheus is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Prometheus may still be starting...${NC}"
fi

# Check Grafana
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Grafana is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Grafana may still be starting...${NC}"
fi

# Check Node Exporter
if curl -s http://localhost:9100/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Node Exporter is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Node Exporter may still be starting...${NC}"
fi

# Check Postgres Exporter
if curl -s http://localhost:9187/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Postgres Exporter is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Postgres Exporter may still be starting...${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Access your monitoring stack:"
echo ""
echo -e "  ${GREEN}Grafana Dashboard:${NC}"
echo "    URL: http://localhost:3000"
if [ "$DOMAIN" != "localhost" ]; then
    echo "    URL: https://grafana.$DOMAIN"
fi
echo "    Username: $GRAFANA_ADMIN_USER"
echo "    Password: [from .env file]"
echo ""
echo -e "  ${GREEN}Prometheus:${NC}"
echo "    URL: http://localhost:9090"
echo ""
echo -e "  ${GREEN}Pre-configured Dashboard:${NC}"
echo "    Dashboards → FOAM N8N System Overview"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Log into Grafana and change the admin password"
echo "  2. Review the FOAM N8N System Overview dashboard"
echo "  3. Configure alert notifications (see docs/MONITORING.md)"
echo "  4. Set up backups for Prometheus data"
echo ""
echo "For troubleshooting, see: docs/MONITORING.md"
echo ""
echo "View logs:"
echo "  docker compose -f docker-compose.monitoring.yml logs -f"
echo ""
echo "Stop monitoring:"
echo "  docker compose -f docker-compose.monitoring.yml down"
echo ""
