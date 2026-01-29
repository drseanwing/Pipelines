#!/bin/bash
# REdI | CritLit - PostgreSQL Verification Script
set -e

# REdI brand colors for output
CORAL='\033[38;2;229;91;100m'
NAVY='\033[38;2;27;58;95m'
TEAL='\033[38;2;43;158;158m'
RED='\033[38;2;220;53;69m'
GREEN='\033[38;2;40;167;69m'
YELLOW='\033[38;2;255;193;7m'
NC='\033[0m'

echo "=== REdI | PostgreSQL Verification ==="
echo ""

# Pre-check: Ensure PostgreSQL container is running
if ! docker ps | grep -q slr_postgres; then
    echo -e "${RED}✗${NC} PostgreSQL container is not running"
    echo "Start services with: ./start.sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} PostgreSQL container is running"
echo ""

EXIT_CODE=0

# Test 1: Connection Test
echo "[1/6] Testing database connection..."
if docker compose exec -T postgres psql -U slr_user -d slr_database -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Connection successful"
else
    echo -e "${RED}✗${NC} Connection failed"
    EXIT_CODE=1
fi
echo ""

# Test 2: List Tables
echo "[2/6] Listing all tables..."
TABLES=$(docker compose exec -T postgres psql -U slr_user -d slr_database -c "\dt" 2>&1)
if echo "$TABLES" | grep -q "Did not find any relations"; then
    echo "! No tables found (database is empty)"
else
    echo "$TABLES"
    echo -e "${GREEN}✓${NC} Tables listed successfully"
fi
echo ""

# Test 3: Verify Extensions
echo "[3/6] Verifying required extensions..."
EXTENSIONS=$(docker compose exec -T postgres psql -U slr_user -d slr_database -c "SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pg_trgm', 'uuid-ossp');" -t 2>&1)

if echo "$EXTENSIONS" | grep -q "vector"; then
    echo -e "${GREEN}✓${NC} vector extension enabled"
else
    echo -e "${RED}✗${NC} vector extension NOT found"
    EXIT_CODE=1
fi

if echo "$EXTENSIONS" | grep -q "pg_trgm"; then
    echo -e "${GREEN}✓${NC} pg_trgm extension enabled"
else
    echo -e "${RED}✗${NC} pg_trgm extension NOT found"
    EXIT_CODE=1
fi

if echo "$EXTENSIONS" | grep -q "uuid-ossp"; then
    echo -e "${GREEN}✓${NC} uuid-ossp extension enabled"
else
    echo -e "${RED}✗${NC} uuid-ossp extension NOT found"
    EXIT_CODE=1
fi
echo ""

# Test 4: PostgreSQL Version
echo "[4/6] Checking PostgreSQL version..."
PG_VERSION=$(docker compose exec -T postgres psql -U slr_user -d slr_database -c "SELECT version();" 2>&1 | grep PostgreSQL)
if [ -n "$PG_VERSION" ]; then
    echo -e "${GREEN}✓${NC} $PG_VERSION"
else
    echo -e "${RED}✗${NC} Could not retrieve PostgreSQL version"
    EXIT_CODE=1
fi
echo ""

# Test 5: Database Size
echo "[5/6] Checking database size..."
DB_SIZE=$(docker compose exec -T postgres psql -U slr_user -d slr_database -t -c "SELECT pg_size_pretty(pg_database_size('slr_database')) AS database_size;" 2>&1)
if [ -n "$DB_SIZE" ] && [[ ! "$DB_SIZE" =~ "ERROR" ]]; then
    echo -e "${GREEN}✓${NC} Database size: $(echo $DB_SIZE | xargs)"
else
    echo -e "${RED}✗${NC} Could not retrieve database size"
    EXIT_CODE=1
fi
echo ""

# Test 6: Active Connections
echo "[6/6] Checking active connections..."
CONN_COUNT=$(docker compose exec -T postgres psql -U slr_user -d slr_database -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'slr_database';" 2>&1)
if [ -n "$CONN_COUNT" ] && [[ ! "$CONN_COUNT" =~ "ERROR" ]]; then
    echo -e "${GREEN}✓${NC} Active connections: $(echo $CONN_COUNT | xargs)"
else
    echo -e "${RED}✗${NC} Could not retrieve connection count"
    EXIT_CODE=1
fi
echo ""

# Final Status
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "=== ${GREEN}✓ ALL CHECKS PASSED${NC} ==="
else
    echo -e "=== ${RED}✗ SOME CHECKS FAILED${NC} ==="
fi

exit $EXIT_CODE
