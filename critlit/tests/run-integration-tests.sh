#!/usr/bin/env bash
# ==============================================================================
# REdI | CritLit Integration Test Runner
# ==============================================================================
# This script runs comprehensive integration tests for the CritLit systematic
# literature review platform, testing the complete workflow from search to
# PRISMA flow generation.
# ==============================================================================

set -e
set -o pipefail

# ==============================================================================
# Configuration and Setup
# ==============================================================================

# Colors for output
if [[ -t 1 ]]; then
  RED='\033[38;2;220;53;69m'
  GREEN='\033[38;2;40;167;69m'
  YELLOW='\033[38;2;255;193;7m'
  NAVY='\033[38;2;27;58;95m'
  TEAL='\033[38;2;43;158;158m'
  CORAL='\033[38;2;229;91;100m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  CORAL=''
  NAVY=''
  TEAL=''
  NC=''
fi

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_DATA_DIR="$SCRIPT_DIR/test-data"

# Change to project root
cd "$PROJECT_ROOT"

# Detect docker compose command
if docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo -e "${RED}✗ ERROR:${NC} docker-compose is not available"
  exit 1
fi

# ==============================================================================
# Utility Functions
# ==============================================================================

# Print test header
print_test() {
  local test_num=$1
  local test_name=$2
  echo ""
  echo -e "${TEAL}[TEST $test_num]${NC} $test_name"
  echo "$(printf '%.0s-' {1..70})"
}

# Mark test as passed
test_pass() {
  local message=$1
  echo -e "${GREEN}✓ PASS:${NC} $message"
  ((PASSED++))
}

# Mark test as failed
test_fail() {
  local message=$1
  echo -e "${RED}✗ FAIL:${NC} $message"
  ((FAILED++))
}

# Mark test as skipped
test_skip() {
  local message=$1
  echo -e "${YELLOW}⊘ SKIP:${NC} $message"
  ((SKIPPED++))
}

# Execute SQL command
exec_sql() {
  local sql=$1
  $DOCKER_COMPOSE exec -T postgres psql -U slr_user -d slr_database -c "$sql" 2>&1
}

# Execute SQL and get single value
exec_sql_value() {
  local sql=$1
  $DOCKER_COMPOSE exec -T postgres psql -U slr_user -d slr_database -t -c "$sql" 2>&1 | tr -d '[:space:]'
}

# Check if service is healthy
check_service() {
  local service=$1
  local url=$2
  local expected_code=${3:-200}

  local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [[ "$http_code" == "$expected_code" ]]; then
    return 0
  else
    return 1
  fi
}

# ==============================================================================
# Test Functions
# ==============================================================================

# Test 1: Check Docker is running
test_docker_running() {
  print_test "1" "Docker Runtime Check"

  if ! docker info &> /dev/null; then
    test_fail "Docker daemon is not running"
    return 1
  fi

  test_pass "Docker daemon is running"
  return 0
}

# Test 2: Check all services are healthy
test_services_healthy() {
  print_test "2" "Service Health Checks"

  local all_healthy=true

  # Check PostgreSQL
  echo -n "  Checking PostgreSQL... "
  if $DOCKER_COMPOSE exec -T postgres pg_isready -U slr_user -d slr_database &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    all_healthy=false
  fi

  # Check Redis
  echo -n "  Checking Redis... "
  if $DOCKER_COMPOSE exec -T redis redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    all_healthy=false
  fi

  # Check n8n
  echo -n "  Checking n8n... "
  if check_service "n8n" "http://localhost:7361" "401"; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    all_healthy=false
  fi

  # Check Ollama (optional)
  echo -n "  Checking Ollama... "
  if check_service "ollama" "http://localhost:7362/api/tags" "200"; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}⊘ (optional)${NC}"
  fi

  # Check i-Librarian (optional)
  echo -n "  Checking i-Librarian... "
  if check_service "i-librarian" "http://localhost:7363" "200" || check_service "i-librarian" "http://localhost:7363" "302"; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}⊘ (optional)${NC}"
  fi

  if $all_healthy; then
    test_pass "All critical services are healthy"
    return 0
  else
    test_fail "Some services are not healthy"
    return 1
  fi
}

# Test 3: Verify database schema
test_database_schema() {
  print_test "3" "Database Schema Verification"

  local all_tables_exist=true
  local required_tables=(
    "reviews"
    "search_executions"
    "documents"
    "document_embeddings"
    "screening_decisions"
    "workflow_state"
    "audit_log"
    "prisma_flow"
  )

  for table in "${required_tables[@]}"; do
    echo -n "  Checking table '$table'... "
    local exists=$(exec_sql_value "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table';")

    if [[ "$exists" == "1" ]]; then
      echo -e "${GREEN}✓${NC}"
    else
      echo -e "${RED}✗${NC}"
      all_tables_exist=false
    fi
  done

  # Check for required extensions
  echo -n "  Checking pgvector extension... "
  local vector_ext=$(exec_sql_value "SELECT COUNT(*) FROM pg_extension WHERE extname='vector';")
  if [[ "$vector_ext" == "1" ]]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    all_tables_exist=false
  fi

  if $all_tables_exist; then
    test_pass "Database schema is complete"
    return 0
  else
    test_fail "Database schema is incomplete"
    return 1
  fi
}

# Test 4: Load test review data
test_load_review_data() {
  print_test "4" "Load Test Review Data"

  if [[ ! -f "$TEST_DATA_DIR/sample-review.json" ]]; then
    test_fail "Test data file not found: $TEST_DATA_DIR/sample-review.json"
    return 1
  fi

  # Read JSON and insert review
  local json_data=$(cat "$TEST_DATA_DIR/sample-review.json" | tr -d '\n')

  local sql="
INSERT INTO reviews (
  title,
  prospero_id,
  status,
  pico,
  inclusion_criteria,
  exclusion_criteria,
  search_strategy
) VALUES (
  'Exercise interventions for treatment of depression in adults',
  'CRD42024000001',
  'protocol',
  '{\"population\": \"Adults aged 18+ with diagnosis of depression (DSM/ICD criteria)\", \"intervention\": \"Structured exercise interventions (aerobic, resistance, combined)\", \"comparator\": \"Treatment as usual, waitlist control, or antidepressant medication\", \"outcomes\": [\"Depression severity (PHQ-9, HAM-D, BDI)\", \"Response rate\", \"Remission rate\", \"Quality of life\"], \"study_types\": [\"RCT\", \"Cluster RCT\", \"Crossover RCT\"]}'::jsonb,
  '[\"Adults 18+ years with diagnosed depression\", \"Structured exercise intervention of at least 4 weeks duration\", \"Randomized controlled trial design\", \"Depression outcome measured with validated instrument\"]'::jsonb,
  '[\"Bipolar disorder or schizophrenia\", \"Exercise as adjunct to other intervention without control group\", \"Case reports or case series\", \"Conference abstracts only\"]'::jsonb,
  'depression[MeSH] AND exercise[MeSH] AND (randomized controlled trial[pt] OR RCT[tiab])'
) RETURNING id;
"

  local review_id=$(exec_sql_value "$sql")

  if [[ -n "$review_id" ]]; then
    echo "  Review ID: $review_id"
    test_pass "Test review data loaded successfully"
    echo "$review_id" > "$TEST_DATA_DIR/.test-review-id"
    return 0
  else
    test_fail "Failed to load test review data"
    return 1
  fi
}

# Test 5: Verify review data persistence
test_verify_review_data() {
  print_test "5" "Verify Review Data Persistence"

  if [[ ! -f "$TEST_DATA_DIR/.test-review-id" ]]; then
    test_fail "Test review ID not found"
    return 1
  fi

  local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")
  local review_count=$(exec_sql_value "SELECT COUNT(*) FROM reviews WHERE id='$review_id';")

  if [[ "$review_count" == "1" ]]; then
    test_pass "Review data persisted correctly"
    return 0
  else
    test_fail "Review data not found in database"
    return 1
  fi
}

# Test 6: Test document insertion
test_document_insertion() {
  print_test "6" "Test Document Insertion"

  if [[ ! -f "$TEST_DATA_DIR/.test-review-id" ]]; then
    test_fail "Test review ID not found"
    return 1
  fi

  local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")

  # Insert test documents
  local sql="
INSERT INTO search_executions (review_id, search_source, query_text, total_results_found)
VALUES ('$review_id', 'pubmed', 'depression AND exercise AND RCT', 5)
RETURNING id;
"
  local search_id=$(exec_sql_value "$sql")
  echo "  Search execution ID: $search_id"

  # Insert sample documents
  for i in {1..5}; do
    local doc_sql="
INSERT INTO documents (
  search_execution_id,
  source,
  source_id,
  title,
  abstract,
  authors,
  publication_year,
  journal,
  doi,
  url
) VALUES (
  '$search_id',
  'pubmed',
  'PMID-TEST-$i',
  'Test Article $i: Exercise and Depression',
  'Abstract for test article $i. This study examines the effects of exercise interventions on depression outcomes in adult populations.',
  ARRAY['Smith J', 'Jones A', 'Brown B'],
  2023,
  'Journal of Test Medicine',
  '10.1234/test.$i',
  'https://pubmed.test/article-$i'
);
"
    exec_sql "$doc_sql" > /dev/null
  done

  local doc_count=$(exec_sql_value "SELECT COUNT(*) FROM documents WHERE search_execution_id='$search_id';")

  if [[ "$doc_count" == "5" ]]; then
    test_pass "Successfully inserted 5 test documents"
    echo "$search_id" > "$TEST_DATA_DIR/.test-search-id"
    return 0
  else
    test_fail "Expected 5 documents, found $doc_count"
    return 1
  fi
}

# Test 7: Test screening workflow
test_screening_workflow() {
  print_test "7" "Test Screening Workflow"

  if [[ ! -f "$TEST_DATA_DIR/.test-review-id" ]] || [[ ! -f "$TEST_DATA_DIR/.test-search-id" ]]; then
    test_fail "Test data not found"
    return 1
  fi

  local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")
  local search_id=$(cat "$TEST_DATA_DIR/.test-search-id")

  # Get document IDs
  local doc_ids=$(exec_sql "SELECT id FROM documents WHERE search_execution_id='$search_id';" | grep -E '^[[:space:]]*[0-9a-f-]+' | tr -d '[:space:]')

  local doc_count=0
  while IFS= read -r doc_id; do
    if [[ -n "$doc_id" ]]; then
      # Create screening decision
      local decision=$( [ $((RANDOM % 2)) -eq 0 ] && echo "include" || echo "exclude" )
      local confidence=$(awk -v seed=$RANDOM 'BEGIN{srand(seed); printf "%.2f", rand()}')

      local sql="
INSERT INTO screening_decisions (
  document_id,
  review_id,
  screening_stage,
  reviewer_type,
  reviewer_id,
  decision,
  confidence,
  exclusion_reason,
  rationale,
  processing_time_ms
) VALUES (
  '$doc_id',
  '$review_id',
  'title_abstract',
  'ai_primary',
  'claude-opus-4-5',
  '$decision',
  $confidence,
  $([ "$decision" == "exclude" ] && echo "'wrong_intervention'" || echo "NULL"),
  'Test screening decision for document',
  $(( RANDOM % 5000 + 1000 ))
);
"
      exec_sql "$sql" > /dev/null
      ((doc_count++))
    fi
  done <<< "$doc_ids"

  local decision_count=$(exec_sql_value "SELECT COUNT(*) FROM screening_decisions WHERE review_id='$review_id';")

  if [[ "$decision_count" == "5" ]]; then
    test_pass "Successfully created screening decisions for all documents"
    return 0
  else
    test_fail "Expected 5 screening decisions, found $decision_count"
    return 1
  fi
}

# Test 8: Test screening decision retrieval
test_screening_retrieval() {
  print_test "8" "Test Screening Decision Retrieval"

  if [[ ! -f "$TEST_DATA_DIR/.test-review-id" ]]; then
    test_fail "Test review ID not found"
    return 1
  fi

  local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")

  # Get counts by decision
  local include_count=$(exec_sql_value "SELECT COUNT(*) FROM screening_decisions WHERE review_id='$review_id' AND decision='include';")
  local exclude_count=$(exec_sql_value "SELECT COUNT(*) FROM screening_decisions WHERE review_id='$review_id' AND decision='exclude';")
  local total_count=$(exec_sql_value "SELECT COUNT(*) FROM screening_decisions WHERE review_id='$review_id';")

  echo "  Included: $include_count"
  echo "  Excluded: $exclude_count"
  echo "  Total: $total_count"

  if [[ "$total_count" == "5" ]]; then
    test_pass "Screening decisions retrieved successfully"
    return 0
  else
    test_fail "Unexpected screening decision count"
    return 1
  fi
}

# Test 9: Test workflow state save
test_workflow_state_save() {
  print_test "9" "Test Workflow State Save"

  if [[ ! -f "$TEST_DATA_DIR/.test-review-id" ]]; then
    test_fail "Test review ID not found"
    return 1
  fi

  local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")

  local sql="
INSERT INTO workflow_state (
  review_id,
  workflow_type,
  current_stage,
  stage_status,
  checkpoint_data,
  metadata
) VALUES (
  '$review_id',
  'systematic_review',
  'screening',
  'in_progress',
  '{\"documents_screened\": 5, \"checkpoint_time\": \"2026-01-25T10:00:00Z\"}'::jsonb,
  '{\"total_documents\": 5, \"screening_mode\": \"title_abstract\"}'::jsonb
) RETURNING id;
"

  local state_id=$(exec_sql_value "$sql")

  if [[ -n "$state_id" ]]; then
    echo "  Workflow state ID: $state_id"
    test_pass "Workflow state saved successfully"
    echo "$state_id" > "$TEST_DATA_DIR/.test-workflow-state-id"
    return 0
  else
    test_fail "Failed to save workflow state"
    return 1
  fi
}

# Test 10: Test checkpoint resume
test_checkpoint_resume() {
  print_test "10" "Test Checkpoint Resume"

  if [[ ! -f "$TEST_DATA_DIR/.test-workflow-state-id" ]]; then
    test_fail "Workflow state ID not found"
    return 1
  fi

  local state_id=$(cat "$TEST_DATA_DIR/.test-workflow-state-id")

  # Retrieve checkpoint data
  local checkpoint_data=$(exec_sql_value "SELECT checkpoint_data FROM workflow_state WHERE id='$state_id';")

  if [[ -n "$checkpoint_data" ]]; then
    echo "  Retrieved checkpoint data"
    test_pass "Checkpoint can be resumed successfully"
    return 0
  else
    test_fail "Failed to retrieve checkpoint data"
    return 1
  fi
}

# Test 11: Test PRISMA flow generation
test_prisma_flow_generation() {
  print_test "11" "Test PRISMA Flow Generation"

  if [[ ! -f "$TEST_DATA_DIR/.test-review-id" ]]; then
    test_fail "Test review ID not found"
    return 1
  fi

  local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")

  # Calculate PRISMA statistics
  local total_identified=$(exec_sql_value "SELECT COUNT(*) FROM documents d JOIN search_executions se ON d.search_execution_id = se.id WHERE se.review_id='$review_id';")
  local after_screening=$(exec_sql_value "SELECT COUNT(*) FROM screening_decisions WHERE review_id='$review_id' AND decision='include';")

  local sql="
INSERT INTO prisma_flow (
  review_id,
  stage,
  flow_data
) VALUES (
  '$review_id',
  'screening',
  '{
    \"identification\": {
      \"total_identified\": $total_identified,
      \"from_databases\": $total_identified
    },
    \"screening\": {
      \"total_screened\": $total_identified,
      \"excluded_screening\": $(( total_identified - after_screening ))
    },
    \"included\": {
      \"total_included\": $after_screening
    }
  }'::jsonb
) RETURNING id;
"

  local flow_id=$(exec_sql_value "$sql")

  if [[ -n "$flow_id" ]]; then
    echo "  PRISMA flow ID: $flow_id"
    echo "  Total identified: $total_identified"
    echo "  After screening: $after_screening"
    test_pass "PRISMA flow generated successfully"
    return 0
  else
    test_fail "Failed to generate PRISMA flow"
    return 1
  fi
}

# Test 12: Test audit log
test_audit_log() {
  print_test "12" "Test Audit Log"

  if [[ ! -f "$TEST_DATA_DIR/.test-review-id" ]]; then
    test_fail "Test review ID not found"
    return 1
  fi

  local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")

  local sql="
INSERT INTO audit_log (
  entity_type,
  entity_id,
  action,
  actor_type,
  actor_id,
  details
) VALUES (
  'review',
  '$review_id',
  'test_completed',
  'system',
  'integration_test',
  '{\"test_suite\": \"integration\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}'::jsonb
) RETURNING id;
"

  local log_id=$(exec_sql_value "$sql")

  if [[ -n "$log_id" ]]; then
    test_pass "Audit log entry created successfully"
    return 0
  else
    test_fail "Failed to create audit log entry"
    return 1
  fi
}

# Test 13: Generate test report
test_generate_report() {
  print_test "13" "Generate Test Report"

  if [[ ! -f "$TEST_DATA_DIR/.test-review-id" ]]; then
    test_skip "Test review ID not found - skipping report"
    return 0
  fi

  local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")

  # Generate summary report
  local report_file="$TEST_DATA_DIR/test-report-$(date +%Y%m%d-%H%M%S).txt"

  {
    echo "REdI | CritLit Integration Test Report"
    echo "Generated: $(date)"
    echo "========================================"
    echo ""
    echo "Review ID: $review_id"
    echo ""

    echo "Documents:"
    exec_sql "SELECT COUNT(*) as total, source FROM documents d JOIN search_executions se ON d.search_execution_id = se.id WHERE se.review_id='$review_id' GROUP BY source;"
    echo ""

    echo "Screening Decisions:"
    exec_sql "SELECT decision, COUNT(*) as count FROM screening_decisions WHERE review_id='$review_id' GROUP BY decision;"
    echo ""

    echo "PRISMA Flow:"
    exec_sql "SELECT stage, flow_data FROM prisma_flow WHERE review_id='$review_id' ORDER BY created_at DESC LIMIT 1;"
    echo ""

  } > "$report_file"

  echo "  Report saved to: $report_file"
  test_pass "Test report generated successfully"
  return 0
}

# ==============================================================================
# Cleanup Functions
# ==============================================================================

cleanup_test_data() {
  print_test "CLEANUP" "Removing Test Data"

  if [[ -f "$TEST_DATA_DIR/.test-review-id" ]]; then
    local review_id=$(cat "$TEST_DATA_DIR/.test-review-id")

    echo "  Deleting test review and cascading data..."
    exec_sql "DELETE FROM reviews WHERE id='$review_id';" > /dev/null

    # Clean up temporary files
    rm -f "$TEST_DATA_DIR/.test-review-id"
    rm -f "$TEST_DATA_DIR/.test-search-id"
    rm -f "$TEST_DATA_DIR/.test-workflow-state-id"

    echo -e "${GREEN}✓${NC} Test data cleaned up"
  else
    echo -e "${YELLOW}⊘${NC} No test data to clean up"
  fi
}

# ==============================================================================
# Main Test Execution
# ==============================================================================

print_banner() {
  echo ""
  echo -e "${NAVY}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${NAVY}║${NC}  ${TEAL}REdI | CritLit Integration Test Suite${NC}                     ${NAVY}║${NC}"
  echo -e "${NAVY}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_summary() {
  echo ""
  echo -e "${NAVY}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${NAVY}║${NC}  ${TEAL}Test Summary${NC}                                                ${NAVY}║${NC}"
  echo -e "${NAVY}╠════════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${NAVY}║${NC}  ${GREEN}Passed:${NC}  $(printf '%3d' $PASSED)                                                ${NAVY}║${NC}"
  echo -e "${NAVY}║${NC}  ${RED}Failed:${NC}  $(printf '%3d' $FAILED)                                                ${NAVY}║${NC}"
  echo -e "${NAVY}║${NC}  ${YELLOW}Skipped:${NC} $(printf '%3d' $SKIPPED)                                                ${NAVY}║${NC}"
  echo -e "${NAVY}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    return 0
  else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    return 1
  fi
}

# Main execution
main() {
  print_banner

  # Run all tests
  test_docker_running || true
  test_services_healthy || true
  test_database_schema || true
  test_load_review_data || true
  test_verify_review_data || true
  test_document_insertion || true
  test_screening_workflow || true
  test_screening_retrieval || true
  test_workflow_state_save || true
  test_checkpoint_resume || true
  test_prisma_flow_generation || true
  test_audit_log || true
  test_generate_report || true

  # Cleanup
  echo ""
  cleanup_test_data

  # Print summary
  print_summary
  local exit_code=$?

  exit $exit_code
}

# Run main function
main "$@"
