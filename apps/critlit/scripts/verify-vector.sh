#!/bin/bash
# REdI | CritLit - Vector Extension Verification Script
set -e

echo "========================================="
echo "REdI | Vector Extension Verification"
echo "========================================="
echo ""

# REdI brand color codes for output
CORAL='\033[38;2;229;91;100m'
NAVY='\033[38;2;27;58;95m'
TEAL='\033[38;2;43;158;158m'
RED='\033[38;2;220;53;69m'
GREEN='\033[38;2;40;167;69m'
YELLOW='\033[38;2;255;193;7m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run SQL and capture output
run_sql() {
    docker compose exec -T postgres psql -U slr_user -d slr_database -t -c "$1" 2>&1
}

# Helper function to print test result
print_result() {
    local test_name="$1"
    local result="$2"

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        ((TESTS_FAILED++))
    fi
}

# Pre-check: Ensure PostgreSQL container is running
if ! docker ps | grep -q slr_postgres; then
    echo -e "${RED}✗${NC} PostgreSQL container is not running"
    echo "Start services with: ./start.sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} PostgreSQL container is running"
echo ""

echo "Test 1: Checking vector extension installation..."
RESULT=$(run_sql "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';")
if [[ "$RESULT" =~ "1" ]]; then
    print_result "Vector extension is installed" "PASS"
else
    print_result "Vector extension is installed" "FAIL"
    echo "  Error: Vector extension not found"
fi
echo ""

echo "Test 2: Checking vector extension version..."
RESULT=$(run_sql "SELECT extversion FROM pg_extension WHERE extname = 'vector';")
if [[ -n "$RESULT" ]] && [[ ! "$RESULT" =~ "ERROR" ]]; then
    VERSION=$(echo "$RESULT" | tr -d '[:space:]')
    print_result "Vector extension version: $VERSION" "PASS"
else
    print_result "Vector extension version check" "FAIL"
fi
echo ""

echo "Test 3: Creating temporary test table..."
RESULT=$(run_sql "CREATE TEMP TABLE test_vectors (id SERIAL PRIMARY KEY, embedding vector(3));")
if [[ ! "$RESULT" =~ "ERROR" ]]; then
    print_result "Create temp table with vector column" "PASS"
else
    print_result "Create temp table with vector column" "FAIL"
    echo "  Error: $RESULT"
fi
echo ""

echo "Test 4: Inserting test vectors..."
RESULT=$(run_sql "INSERT INTO test_vectors (embedding) VALUES ('[1,2,3]'), ('[4,5,6]'), ('[7,8,9]');")
if [[ ! "$RESULT" =~ "ERROR" ]]; then
    print_result "Insert test vectors" "PASS"
else
    print_result "Insert test vectors" "FAIL"
    echo "  Error: $RESULT"
fi
echo ""

echo "Test 5: Testing cosine similarity search..."
RESULT=$(run_sql "SELECT id, embedding, 1 - (embedding <=> '[1,2,3]') AS similarity FROM test_vectors ORDER BY embedding <=> '[1,2,3]' LIMIT 1;")
if [[ ! "$RESULT" =~ "ERROR" ]] && [[ "$RESULT" =~ "1" ]]; then
    print_result "Cosine similarity search" "PASS"
else
    print_result "Cosine similarity search" "FAIL"
    echo "  Error: $RESULT"
fi
echo ""

echo "Test 6: Testing L2 distance operator..."
RESULT=$(run_sql "SELECT id, embedding <-> '[1,2,3]' AS l2_distance FROM test_vectors ORDER BY embedding <-> '[1,2,3]' LIMIT 1;")
if [[ ! "$RESULT" =~ "ERROR" ]]; then
    print_result "L2 distance operator" "PASS"
else
    print_result "L2 distance operator" "FAIL"
    echo "  Error: $RESULT"
fi
echo ""

echo "Test 7: Testing inner product operator..."
RESULT=$(run_sql "SELECT id, embedding <#> '[1,2,3]' AS inner_product FROM test_vectors ORDER BY embedding <#> '[1,2,3]' LIMIT 1;")
if [[ ! "$RESULT" =~ "ERROR" ]]; then
    print_result "Inner product operator" "PASS"
else
    print_result "Inner product operator" "FAIL"
    echo "  Error: $RESULT"
fi
echo ""

echo "Test 8: Checking document_embeddings table exists..."
RESULT=$(run_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_embeddings';")
if [[ "$RESULT" =~ "1" ]]; then
    print_result "document_embeddings table exists" "PASS"
else
    print_result "document_embeddings table exists" "FAIL"
    echo "  Error: Table not found"
fi
echo ""

echo "Test 9: Checking HNSW index on document_embeddings..."
RESULT=$(run_sql "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'document_embeddings' AND indexname = 'idx_embeddings_hnsw';")
if [[ "$RESULT" =~ "1" ]]; then
    print_result "HNSW index exists on document_embeddings" "PASS"
else
    print_result "HNSW index exists on document_embeddings" "FAIL"
    echo "  Warning: HNSW index not found. It may be created after data insertion."
fi
echo ""

echo "Test 10: Verifying embedding column dimension..."
RESULT=$(run_sql "SELECT atttypmod FROM pg_attribute WHERE attrelid = 'document_embeddings'::regclass AND attname = 'embedding';")
# atttypmod for vector(1536) should be 1540 (1536 + 4)
if [[ "$RESULT" =~ "1540" ]] || [[ "$RESULT" =~ "1536" ]]; then
    print_result "Embedding dimension is 1536" "PASS"
else
    print_result "Embedding dimension is 1536" "FAIL"
    echo "  Warning: Expected dimension 1536, got: $RESULT"
fi
echo ""

echo "Test 11: Cleaning up test table..."
RESULT=$(run_sql "DROP TABLE IF EXISTS test_vectors;")
if [[ ! "$RESULT" =~ "ERROR" ]]; then
    print_result "Cleanup test table" "PASS"
else
    print_result "Cleanup test table" "FAIL"
    echo "  Error: $RESULT"
fi
echo ""

echo "Test 12: Testing trigram similarity..."
RESULT=$(run_sql "SELECT similarity('systematic review', 'systematic literature review');")
if [[ ! "$RESULT" =~ "ERROR" ]] && [[ -n "$RESULT" ]]; then
    SIMILARITY=$(echo "$RESULT" | tr -d '[:space:]')
    print_result "Trigram similarity function working (similarity: $SIMILARITY)" "PASS"
else
    print_result "Trigram similarity function" "FAIL"
    echo "  Error: $RESULT"
fi
echo ""

echo "Test 13: Testing UUID generation..."
RESULT=$(run_sql "SELECT uuid_generate_v4();")
if [[ ! "$RESULT" =~ "ERROR" ]] && [[ -n "$RESULT" ]]; then
    UUID=$(echo "$RESULT" | tr -d '[:space:]')
    print_result "UUID generation working (sample: $UUID)" "PASS"
else
    print_result "UUID generation" "FAIL"
    echo "  Error: $RESULT"
fi
echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! Vector extension is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
