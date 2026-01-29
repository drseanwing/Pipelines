#!/bin/bash

# ============================================================================
# REdI | CritLit - Database Verification Script
# ============================================================================
# This script verifies that the PostgreSQL database is properly initialized
# with all required tables, extensions, indexes, and configurations.
#
# Usage: ./verify-database.sh
#
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
# ============================================================================

set -e

# ANSI color codes for output
RED='\033[38;2;220;53;69m'
GREEN='\033[38;2;40;167;69m'
YELLOW='\033[38;2;255;193;7m'
NAVY='\033[38;2;27;58;95m'
CORAL='\033[38;2;229;91;100m'
TEAL='\033[38;2;43;158;158m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Database connection parameters (from docker-compose.yml defaults)
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-7360}"
DB_NAME="${POSTGRES_DB:-slr_database}"
DB_USER="${POSTGRES_USER:-slr_user}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

# Helper functions
print_header() {
    echo -e "\n${NAVY}================================================${NC}"
    echo -e "${NAVY}$1${NC}"
    echo -e "${NAVY}================================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
    TESTS_RUN=$((TESTS_RUN + 1))
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_info() {
    echo -e "${NAVY}[INFO]${NC} $1"
}

# SQL execution helper
run_sql() {
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null
}

# ============================================================================
# Test 1: PostgreSQL Connection
# ============================================================================
test_connection() {
    print_header "Test 1: PostgreSQL Connection"
    print_test "Testing database connection to $DB_HOST:$DB_PORT/$DB_NAME"

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        print_pass "Database connection successful"
    else
        print_fail "Could not connect to database"
        return 1
    fi
}

# ============================================================================
# Test 2: Extensions
# ============================================================================
test_extensions() {
    print_header "Test 2: PostgreSQL Extensions"

    # Test vector extension
    print_test "Checking vector extension"
    if run_sql "SELECT extname FROM pg_extension WHERE extname='vector';" | grep -q "vector"; then
        print_pass "vector extension is enabled"
    else
        print_fail "vector extension is NOT enabled"
    fi

    # Test pg_trgm extension
    print_test "Checking pg_trgm extension"
    if run_sql "SELECT extname FROM pg_extension WHERE extname='pg_trgm';" | grep -q "pg_trgm"; then
        print_pass "pg_trgm extension is enabled"
    else
        print_fail "pg_trgm extension is NOT enabled"
    fi

    # Test uuid-ossp extension
    print_test "Checking uuid-ossp extension"
    if run_sql "SELECT extname FROM pg_extension WHERE extname='uuid-ossp';" | grep -q "uuid-ossp"; then
        print_pass "uuid-ossp extension is enabled"
    else
        print_fail "uuid-ossp extension is NOT enabled"
    fi
}

# ============================================================================
# Test 3: Tables
# ============================================================================
test_tables() {
    print_header "Test 3: Database Tables"

    local tables=(
        "reviews"
        "search_executions"
        "documents"
        "document_embeddings"
        "screening_decisions"
    )

    for table in "${tables[@]}"; do
        print_test "Checking table: $table"
        if run_sql "SELECT to_regclass('public.$table');" | grep -q "$table"; then
            print_pass "Table $table exists"
        else
            print_fail "Table $table does NOT exist"
        fi
    done
}

# ============================================================================
# Test 4: HNSW Index
# ============================================================================
test_hnsw_index() {
    print_header "Test 4: HNSW Vector Index"

    print_test "Checking HNSW index on document_embeddings"
    if run_sql "SELECT indexname FROM pg_indexes WHERE tablename='document_embeddings' AND indexname='idx_embeddings_hnsw';" | grep -q "idx_embeddings_hnsw"; then
        print_pass "HNSW index exists on document_embeddings"
    else
        print_fail "HNSW index does NOT exist on document_embeddings"
    fi

    # Verify it's using HNSW access method
    print_test "Verifying HNSW access method"
    if run_sql "SELECT am.amname FROM pg_class c JOIN pg_am am ON c.relam = am.oid WHERE c.relname = 'idx_embeddings_hnsw';" | grep -q "hnsw"; then
        print_pass "Index uses HNSW access method"
    else
        print_fail "Index does NOT use HNSW access method"
    fi
}

# ============================================================================
# Test 5: Text Search Configuration
# ============================================================================
test_text_search() {
    print_header "Test 5: Text Search Configuration"

    print_test "Checking biomedical text search configuration"
    if run_sql "SELECT cfgname FROM pg_ts_config WHERE cfgname='biomedical';" | grep -q "biomedical"; then
        print_pass "Text search configuration 'biomedical' exists"
    else
        print_fail "Text search configuration 'biomedical' does NOT exist"
    fi
}

# ============================================================================
# Test 6: Trigram Index
# ============================================================================
test_trigram_index() {
    print_header "Test 6: Trigram Index"

    print_test "Checking trigram index on documents.title"
    if run_sql "SELECT indexname FROM pg_indexes WHERE tablename='documents' AND indexname='idx_documents_title_trgm';" | grep -q "idx_documents_title_trgm"; then
        print_pass "Trigram index exists on documents.title"
    else
        print_fail "Trigram index does NOT exist on documents.title"
    fi

    # Verify it's using GIN with trigram ops
    print_test "Verifying GIN access method with trigram ops"
    if run_sql "SELECT am.amname FROM pg_class c JOIN pg_am am ON c.relam = am.oid WHERE c.relname = 'idx_documents_title_trgm';" | grep -q "gin"; then
        print_pass "Index uses GIN access method"
    else
        print_fail "Index does NOT use GIN access method"
    fi
}

# ============================================================================
# Test 7: Insert and Query Tests
# ============================================================================
test_insert_query() {
    print_header "Test 7: Insert and Query Operations"

    local test_review_id=$(uuidgen 2>/dev/null || echo "00000000-0000-0000-0000-000000000001")
    local test_doc_id=$(uuidgen 2>/dev/null || echo "00000000-0000-0000-0000-000000000002")

    # Test reviews table
    print_test "Testing INSERT on reviews table"
    if run_sql "INSERT INTO reviews (id, title, pico, inclusion_criteria, exclusion_criteria) VALUES ('$test_review_id', 'Test Review', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb);" > /dev/null 2>&1; then
        print_pass "Successfully inserted into reviews"
    else
        print_fail "Failed to insert into reviews"
    fi

    print_test "Testing SELECT on reviews table"
    if run_sql "SELECT title FROM reviews WHERE id='$test_review_id';" | grep -q "Test Review"; then
        print_pass "Successfully queried reviews"
    else
        print_fail "Failed to query reviews"
    fi

    # Test documents table
    print_test "Testing INSERT on documents table"
    if run_sql "INSERT INTO documents (id, review_id, external_ids, title) VALUES ('$test_doc_id', '$test_review_id', '{\"pmid\": \"12345678\"}'::jsonb, 'Test Document');" > /dev/null 2>&1; then
        print_pass "Successfully inserted into documents"
    else
        print_fail "Failed to insert into documents"
    fi

    print_test "Testing SELECT on documents table"
    if run_sql "SELECT title FROM documents WHERE id='$test_doc_id';" | grep -q "Test Document"; then
        print_pass "Successfully queried documents"
    else
        print_fail "Failed to query documents"
    fi

    # Test screening_decisions table
    print_test "Testing INSERT on screening_decisions table"
    if run_sql "INSERT INTO screening_decisions (document_id, review_id, screening_stage, reviewer_type, decision) VALUES ('$test_doc_id', '$test_review_id', 'title_abstract', 'human', 'include');" > /dev/null 2>&1; then
        print_pass "Successfully inserted into screening_decisions"
    else
        print_fail "Failed to insert into screening_decisions"
    fi

    # Test document_embeddings table with actual vector
    print_test "Testing INSERT on document_embeddings table"
    local vector_data="[$(printf '0.1,%.0s' {1..1536})]"
    vector_data="${vector_data%,}]"
    if run_sql "INSERT INTO document_embeddings (document_id, section_type, chunk_index, chunk_text, embedding, embedding_model) VALUES ('$test_doc_id', 'abstract', 0, 'Test embedding chunk', '$vector_data'::vector, 'text-embedding-3-small');" > /dev/null 2>&1; then
        print_pass "Successfully inserted into document_embeddings"
    else
        print_fail "Failed to insert into document_embeddings"
    fi

    # Test semantic search query
    print_test "Testing semantic search query"
    local query_vector="[$(printf '0.2,%.0s' {1..1536})]"
    query_vector="${query_vector%,}]"
    if run_sql "SELECT chunk_text FROM document_embeddings ORDER BY embedding <=> '$query_vector'::vector LIMIT 1;" | grep -q "Test embedding chunk"; then
        print_pass "Successfully executed semantic search"
    else
        print_fail "Failed to execute semantic search"
    fi

    # Test search_executions table
    print_test "Testing INSERT on search_executions table"
    if run_sql "INSERT INTO search_executions (review_id, database_name, search_query, date_executed) VALUES ('$test_review_id', 'PubMed', 'test[tiab] AND query[tiab]', CURRENT_DATE);" > /dev/null 2>&1; then
        print_pass "Successfully inserted into search_executions"
    else
        print_fail "Failed to insert into search_executions"
    fi
}

# ============================================================================
# Test 8: Cleanup Test Data
# ============================================================================
cleanup_test_data() {
    print_header "Test 8: Cleanup Test Data"

    local test_review_id=$(uuidgen 2>/dev/null || echo "00000000-0000-0000-0000-000000000001")

    print_test "Cleaning up test data"
    # CASCADE delete will remove all related documents, embeddings, screening_decisions, search_executions
    if run_sql "DELETE FROM reviews WHERE id='$test_review_id';" > /dev/null 2>&1; then
        print_pass "Successfully cleaned up test data"
    else
        print_fail "Failed to clean up test data"
    fi

    # Verify cleanup
    print_test "Verifying cleanup"
    local count=$(run_sql "SELECT COUNT(*) FROM reviews WHERE title='Test Review';" | tr -d ' ')
    if [ "$count" = "0" ]; then
        print_pass "Test data successfully removed"
    else
        print_fail "Test data still exists in database"
    fi
}

# ============================================================================
# Test 9: Trigger Functions
# ============================================================================
test_triggers() {
    print_header "Test 9: Trigger Functions"

    print_test "Checking update_updated_at_column function exists"
    if run_sql "SELECT proname FROM pg_proc WHERE proname='update_updated_at_column';" | grep -q "update_updated_at_column"; then
        print_pass "Trigger function update_updated_at_column exists"
    else
        print_fail "Trigger function update_updated_at_column does NOT exist"
    fi

    print_test "Checking triggers on reviews table"
    if run_sql "SELECT tgname FROM pg_trigger WHERE tgname='update_reviews_updated_at';" | grep -q "update_reviews_updated_at"; then
        print_pass "Trigger update_reviews_updated_at exists on reviews"
    else
        print_fail "Trigger update_reviews_updated_at does NOT exist on reviews"
    fi
}

# ============================================================================
# Main Execution
# ============================================================================
main() {
    print_header "REdI | CritLit Database Verification Suite"
    print_info "Database: $DB_HOST:$DB_PORT/$DB_NAME"
    print_info "User: $DB_USER"

    # Run all tests
    test_connection || true
    test_extensions || true
    test_tables || true
    test_hnsw_index || true
    test_text_search || true
    test_trigram_index || true
    test_triggers || true
    test_insert_query || true
    cleanup_test_data || true

    # Print summary
    print_header "Test Summary"
    echo -e "Total Tests:  ${NAVY}$TESTS_RUN${NC}"
    echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed! Database is properly initialized.${NC}\n"
        exit 0
    else
        echo -e "\n${RED}Some tests failed. Please review the output above.${NC}\n"
        exit 1
    fi
}

# Run main function
main
