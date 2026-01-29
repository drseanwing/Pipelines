# n8n Workflows for CritLit SLR Pipeline

This directory contains n8n workflow JSON files for the Autonomous Systematic Literature Review Pipeline. These workflows implement the coordinator/worker pattern with PostgreSQL-backed state management.

## Workflow Files

### 1. slr_main_coordinator.json
**Purpose**: Main entry point for the SLR pipeline. Orchestrates all sub-workflows and manages state transitions.

**Key Features**:
- Webhook trigger for initiating review workflows
- PostgreSQL state loading and checkpoint management
- AI coordinator agent for stage routing
- Switch-based workflow delegation
- Human review wait nodes for checkpoints

**Trigger**: POST to `/webhook/slr-start` with body:
```json
{
  "review_id": "uuid-of-review"
}
```

### 2. slr_protocol_setup.json
**Purpose**: Create or update a systematic review protocol with PICO criteria.

**Key Features**:
- Accept review metadata and PICO criteria
- Store protocol in `reviews` table
- Version control for protocol updates
- Comprehensive audit logging

**Trigger**: POST to `/webhook/slr-protocol-setup` with body:
```json
{
  "review_id": "uuid-of-review",
  "title": "Review title",
  "pico": {
    "population": "Target population",
    "intervention": "Intervention being studied",
    "comparator": "Control or comparison",
    "outcomes": ["Outcome 1", "Outcome 2"],
    "study_types": ["rct", "cohort"]
  },
  "inclusion_criteria": {},
  "exclusion_criteria": {},
  "search_strategy": "Boolean search query"
}
```

### 3. slr_search_execution.json
**Purpose**: Execute PubMed searches using E-utilities API and store results.

**Key Features**:
- PubMed ESearch API integration with history server
- PubMed EFetch API for retrieving document metadata
- Search execution logging for PRISMA tracking
- Rate limit handling with configurable API keys
- XML parsing preparation (to be implemented in Phase 3)

**Trigger**: POST to `/webhook/slr-search-execution` with body:
```json
{
  "review_id": "uuid-of-review",
  "search_query": "(hypertension[MeSH Terms]) AND (SGLT2 inhibitors[MeSH Terms])",
  "database_name": "PubMed",
  "max_results": 1000
}
```

### 4. slr_screening_batch.json
**Purpose**: Perform AI-powered title/abstract screening using Ollama LLM.

**Key Features**:
- Batch fetching of unscreened documents
- PICO criteria-based prompt generation
- Ollama integration for local LLM inference
- Structured decision parsing (include/exclude/uncertain)
- Confidence scoring for human review routing
- Document status updates based on screening decisions

**Trigger**: POST to `/webhook/slr-screening-batch` with body:
```json
{
  "review_id": "uuid-of-review",
  "batch_size": 50
}
```

## Importing Workflows into n8n

1. **Access n8n Web Interface**
   ```
   http://localhost:5678
   ```

2. **Import Workflow**
   - Click "Add Workflow" → "Import from File"
   - Select a workflow JSON file from this directory
   - Workflow will be imported with all nodes and connections

3. **Configure Credentials**
   
   Before using the workflows, configure these credentials in n8n:
   
   - **PostgreSQL (SLR Database)**
     - Host: `postgres` (Docker network) or `localhost` (local)
     - Port: `5432`
     - Database: `slr_database`
     - User: `slr_user`
     - Password: From `.env` file (`POSTGRES_PASSWORD`)
   
   - **Ollama API**
     - Base URL: `http://ollama:11434` (Docker) or from `.env` (`OLLAMA_BASE_URL`)
   
   - **PubMed API (Optional)**
     - API Key: From `.env` file (`PUBMED_API_KEY`)
     - Email: From `.env` file (`CONTACT_EMAIL`)

4. **Set Environment Variables**
   
   In n8n settings, configure these environment variables:
   
   ```
   PROTOCOL_WORKFLOW_ID=<id-of-imported-protocol-workflow>
   SEARCH_WORKFLOW_ID=<id-of-imported-search-workflow>
   SCREENING_WORKFLOW_ID=<id-of-imported-screening-workflow>
   PUBMED_API_KEY=<your-pubmed-api-key>
   CONTACT_EMAIL=<your-email-for-pubmed>
   OLLAMA_BASE_URL=http://ollama:11434
   OLLAMA_SCREENING_MODEL=llama3.1:8b
   SCREENING_BATCH_SIZE=50
   SCREENING_CONFIDENCE_THRESHOLD=0.85
   ```

## Workflow Execution Flow

```
┌─────────────────────────────────────────────────┐
│         slr_main_coordinator.json               │
│                                                 │
│  1. Receive webhook trigger                    │
│  2. Load review state from PostgreSQL          │
│  3. Coordinator agent determines next stage    │
│  4. Route to appropriate sub-workflow          │
│  5. Save checkpoint after completion           │
│  6. Loop or wait for human review              │
└─────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬───────────┐
        │            │            │           │
        ▼            ▼            ▼           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Protocol │  │  Search  │  │Screening │  │  Human   │
│  Setup   │  │Execution │  │  Batch   │  │  Review  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## Testing Workflows

### 1. Test Protocol Setup
```bash
curl -X POST http://localhost:5678/webhook/slr-protocol-setup \
  -H "Content-Type: application/json" \
  -d '{
    "review_id": "00000000-0000-0000-0000-000000000001",
    "title": "Test Review: SGLT2 Inhibitors for Type 2 Diabetes",
    "pico": {
      "population": "adults with type 2 diabetes",
      "intervention": "SGLT2 inhibitors",
      "comparator": "placebo or standard care",
      "outcomes": ["HbA1c reduction", "cardiovascular events"],
      "study_types": ["rct"]
    },
    "inclusion_criteria": {"language": ["English"], "min_year": 2015},
    "exclusion_criteria": {"study_types": ["case report", "editorial"]},
    "search_strategy": "(diabetes mellitus, type 2[MeSH Terms]) AND (sodium-glucose transporter 2 inhibitors[MeSH Terms])"
  }'
```

### 2. Test Search Execution
```bash
curl -X POST http://localhost:5678/webhook/slr-search-execution \
  -H "Content-Type: application/json" \
  -d '{
    "review_id": "00000000-0000-0000-0000-000000000001",
    "search_query": "(diabetes mellitus, type 2[MeSH Terms]) AND (sodium-glucose transporter 2 inhibitors[MeSH Terms])",
    "max_results": 100
  }'
```

### 3. Test Screening (requires documents in database)
```bash
curl -X POST http://localhost:5678/webhook/slr-screening-batch \
  -H "Content-Type: application/json" \
  -d '{
    "review_id": "00000000-0000-0000-0000-000000000001",
    "batch_size": 10
  }'
```

## Alpha Version Limitations

The current workflows implement Phase 2 functionality:

✅ **Implemented**:
- Main coordinator workflow structure
- Protocol setup and storage
- PubMed search execution (ESearch + EFetch)
- Basic screening workflow with Ollama integration
- Checkpoint/state management structure
- Human review wait nodes

🚧 **Pending (Phase 3+)**:
- Complete PubMed XML parsing and document storage
- Duplicate detection and deduplication
- Full-text PDF retrieval
- Data extraction workflows
- Risk of bias assessment
- GRADE assessment
- Synthesis and reporting workflows

## Troubleshooting

### Workflow Import Errors
- Ensure n8n is running: `docker compose ps`
- Check n8n logs: `docker compose logs n8n`
- Verify JSON syntax is valid

### Credential Errors
- Verify PostgreSQL credentials in n8n settings
- Test database connection from n8n
- Check `.env` file has correct values

### Ollama Integration Issues
- Verify Ollama is running: `docker compose ps ollama`
- Check model is pulled: `docker compose exec ollama ollama list`
- Test Ollama API: `curl http://localhost:11434/api/version`

### PubMed API Issues
- Verify API key is valid and not rate-limited
- Check CONTACT_EMAIL is set correctly
- Review error responses in workflow execution logs

## Next Steps

1. **Import all workflows** into n8n
2. **Configure credentials** for PostgreSQL and Ollama
3. **Set environment variables** for workflow IDs
4. **Test each workflow** individually
5. **Test end-to-end flow** via main coordinator
6. **Implement Phase 3** tasks (PubMed XML parsing, document storage)

## References

- [n8n Documentation](https://docs.n8n.io/)
- [PubMed E-utilities API](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [Ollama API Documentation](https://ollama.ai/docs/api)
- [Full Technical Specification](../Specifications.md)
- [Alpha Test Tasks](../ALPHA_TEST_TASKS.md)
