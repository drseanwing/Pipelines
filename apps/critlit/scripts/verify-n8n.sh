#!/bin/bash
# REdI | CritLit - n8n Service Verification Script
set -e

echo "========================================"
echo "REdI | n8n Service Verification"
echo "========================================"
echo ""

SUCCESS=0
FAILED=0

# REdI brand colors for output
CORAL='\033[38;2;229;91;100m'
NAVY='\033[38;2;27;58;95m'
TEAL='\033[38;2;43;158;158m'
RED='\033[38;2;220;53;69m'
GREEN='\033[38;2;40;167;69m'
YELLOW='\033[38;2;255;193;7m'
NC='\033[0m' # No Color

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((SUCCESS++))
}

# Function to print failure
print_failure() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

# Function to print info
print_info() {
    echo -e "${TEAL}ℹ${NC} $1"
}

# Pre-check: Ensure n8n container is running
if ! docker ps | grep -q slr_n8n; then
    echo -e "${RED}✗${NC} n8n container is not running"
    echo "Start services with: ./start.sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} n8n container is running"
echo ""

# 1. Check n8n web interface
echo "1. Checking n8n web interface..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:7361 | grep -q "200\|401"; then
    print_success "n8n web interface is accessible at http://localhost:7361"
else
    print_failure "n8n web interface is not accessible at http://localhost:7361"
fi
echo ""

# 2. Check n8n worker is running
echo "2. Checking n8n worker container..."
if docker compose ps n8n-worker | grep -q "running"; then
    print_success "n8n worker container (slr_n8n_worker) is running"
else
    print_failure "n8n worker container is not running"
fi
echo ""

# 3. Verify n8n can connect to PostgreSQL
echo "3. Checking n8n PostgreSQL connection..."
if docker logs slr_n8n 2>&1 | grep -q -i "successfully connected to database\|database connection established\|migration.*completed"; then
    print_success "n8n successfully connected to PostgreSQL"
elif docker logs slr_n8n 2>&1 | grep -q -i "database.*error\|connection.*failed\|ECONNREFUSED.*postgres"; then
    print_failure "n8n failed to connect to PostgreSQL (check docker logs slr_n8n)"
else
    print_info "PostgreSQL connection status unclear - checking if database is ready..."
    if docker exec slr_postgres pg_isready -U slr_user -d slr_database > /dev/null 2>&1; then
        print_success "PostgreSQL is ready and accepting connections"
    else
        print_failure "PostgreSQL is not ready"
    fi
fi
echo ""

# 4. Verify n8n queue mode is active
echo "4. Checking n8n queue mode configuration..."
if docker exec slr_n8n printenv | grep -q "EXECUTIONS_MODE=queue"; then
    print_success "n8n queue mode is configured (EXECUTIONS_MODE=queue)"
else
    print_failure "n8n queue mode is not configured"
fi

# Check Redis connection for queue
if docker logs slr_n8n 2>&1 | grep -q -i "redis.*connected\|queue.*ready\|bull.*ready"; then
    print_success "n8n queue (Redis) is connected"
elif docker logs slr_n8n 2>&1 | grep -q -i "redis.*error\|ECONNREFUSED.*redis"; then
    print_failure "n8n failed to connect to Redis queue (check docker logs slr_n8n)"
else
    print_info "Redis queue connection status unclear from logs"
    if docker exec slr_redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is responding to ping"
    else
        print_failure "Redis is not responding"
    fi
fi
echo ""

# Summary
echo "========================================"
echo "Verification Summary"
echo "========================================"
echo -e "${GREEN}Passed: $SUCCESS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Service URLs:"
    echo "  - n8n UI: http://localhost:7361"
    echo "  - PostgreSQL: localhost:7360"
    echo "  - Redis: localhost:6379 (internal)"
    exit 0
else
    echo -e "${RED}Some checks failed. Review the output above.${NC}"
    echo ""
    echo "Troubleshooting commands:"
    echo "  - View n8n logs: docker logs slr_n8n"
    echo "  - View worker logs: docker logs slr_n8n_worker"
    echo "  - View all services: docker compose ps"
    exit 1
fi
