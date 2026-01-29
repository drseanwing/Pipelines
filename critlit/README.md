# REdI | CritLit - Autonomous Systematic Literature Review Pipeline

**Resuscitation EDucation Initiative** | Workforce Development & Education Unit

A doctoral-level SLR automation system integrating PRISMA 2020 compliance, multi-agent orchestration, and retrieval-augmented generation for **40-70% time savings** while maintaining methodological rigor.

## 🚀 Quick Start

### Prerequisites

- Docker 24.0+ with Docker Compose V2
- 16GB RAM minimum (32GB recommended)
- 50GB free disk space
- NVIDIA GPU (optional, for faster local LLM inference)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/drseanwing/CritLit.git
   cd CritLit
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your credentials
   ```

   Required variables:
   - `POSTGRES_PASSWORD`: Secure password for PostgreSQL
   - `N8N_USER` / `N8N_PASSWORD`: n8n web interface credentials
   - `N8N_ENCRYPTION_KEY`: Generate with `openssl rand -hex 32`

   Optional API keys (for full functionality):
   - `PUBMED_API_KEY`: For higher PubMed rate limits
   - `ANTHROPIC_API_KEY`: For Claude-based extraction
   - `OPENAI_API_KEY`: For GPT-4o risk of bias assessment

3. **Start all services**
   ```bash
   ./start.sh
   ```

   This launches:
   - PostgreSQL with pgvector (port 5432)
   - n8n workflow engine (port 5678)
   - n8n worker for queue processing
   - Redis for job queues
   - Ollama for local LLM inference (port 11434)
   - I-Librarian for PDF management (port 8080)

4. **Verify deployment**
   ```bash
   ./scripts/verify-postgres.sh   # Test database connectivity
   ./scripts/verify-vector.sh     # Test pgvector extension
   ./scripts/verify-n8n.sh        # Test n8n web interface
   ./scripts/verify-ollama.sh     # Test Ollama API
   ```

5. **Pull LLM models**
   ```bash
   docker compose exec ollama ollama pull llama3.1:8b
   # For better accuracy (requires ~40GB):
   docker compose exec ollama ollama pull llama3.1:70b
   ```

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   n8n ORCHESTRATION LAYER                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Coordinator  │─▶│  Screening   │─▶│  Synthesis   │      │
│  │    Agent     │  │    Agent     │  │    Agent     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                  DATA PERSISTENCE LAYER                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          PostgreSQL + pgvector                       │   │
│  │  • Review state & checkpoints                        │   │
│  │  • Document embeddings (HNSW)                        │   │
│  │  • Screening decisions                               │   │
│  │  • PRISMA flow tracking                              │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   EXTERNAL INTEGRATIONS                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  PubMed  │  │ Unpaywall│  │I-Librarian│ │ Ollama   │   │
│  │  E-utils │  │   API    │  │ (PDF Repo)│ │ (Local)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ Database Schema

The PostgreSQL database includes:

- **reviews**: Review registry with PROSPERO alignment and PICO criteria
- **search_executions**: Track all database searches for PRISMA reporting
- **documents**: Central document registry with external IDs (PMID, DOI)
- **document_embeddings**: Vector embeddings for semantic search (384d/1536d)
- **screening_decisions**: All screening decisions with confidence scores
- **workflow_state**: Checkpoint/resume capability for long-running workflows
- **audit_log**: Comprehensive audit trail for all decisions
- **prisma_flow**: PRISMA 2020 flow diagram data tracking

All tables are created automatically on first startup via init-scripts.

## 🛠️ Development Workflow

### Managing Services

```bash
# Start all services
./start.sh

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart a specific service
docker compose restart n8n

# Stop and remove all data (⚠️ destructive)
docker compose down -v
```

### Database Access

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U slr_user -d slr_database

# Run a query
docker compose exec postgres psql -U slr_user -d slr_database -c "SELECT * FROM reviews LIMIT 5;"

# View database schema
docker compose exec postgres psql -U slr_user -d slr_database -c "\dt"

# View installed extensions
docker compose exec postgres psql -U slr_user -d slr_database -c "\dx"
```

### n8n Workflow Development

1. Access n8n at http://localhost:5678
2. Login with credentials from `.env` file
3. Import workflow templates from `workflows/` directory
4. Configure credentials for PostgreSQL and Ollama
5. Test workflows with sample PICO criteria

See [workflows/README.md](workflows/README.md) for detailed workflow documentation.

## 📖 Core Concepts

### PICO Framework

All systematic reviews are structured around PICO criteria:

- **P**opulation: Target patient/participant group
- **I**ntervention: Treatment or exposure being studied
- **C**omparator: Alternative intervention or control
- **O**utcomes: Measured endpoints

Example PICO JSON:
```json
{
  "population": "adults with type 2 diabetes",
  "intervention": "SGLT2 inhibitors",
  "comparator": "placebo or standard care",
  "outcomes": ["HbA1c reduction", "cardiovascular events", "renal outcomes"],
  "study_types": ["rct", "cohort"]
}
```

### PRISMA 2020 Compliance

All document flows are tracked for PRISMA reporting:

- **Identification**: Records from databases (PubMed, Cochrane, etc.)
- **Screening**: Title/abstract and full-text screening with exclusion reasons
- **Included**: Studies proceeding to data extraction
- **Synthesis**: Studies included in final analysis

The `prisma_flow` table automatically calculates counts at each stage.

### Checkpoint/Resume

Long-running workflows automatically save checkpoints:

- **Workflow State**: Serialized state after each batch
- **Last Processed**: UUID of last successfully processed item
- **Error Tracking**: Error counts and details for debugging

To resume after interruption:
```sql
SELECT * FROM workflow_state 
WHERE review_id = '<your-review-id>' 
AND status = 'paused'
ORDER BY updated_at DESC LIMIT 1;
```

## 🧪 Alpha Test Status

### ✅ Completed

**Phase 1: Infrastructure Foundation (tasks 1-28)**
- [x] Docker Compose configuration with all services
- [x] PostgreSQL with performance tuning
- [x] n8n with queue mode enabled
- [x] Redis for job queue management
- [x] Ollama for local LLM inference
- [x] Environment variable template
- [x] .gitignore for secrets
- [x] PostgreSQL extensions (vector, pg_trgm, uuid-ossp)
- [x] Complete database schema (13 tables)
- [x] HNSW index for semantic search
- [x] Full-text search configuration
- [x] Trigram index for duplicate detection
- [x] Startup script with health checks
- [x] Verification scripts for all services
- [x] Deployment documentation

**Phase 2: Basic n8n Workflows (tasks 29-38)**
- [x] Main coordinator workflow with state management
- [x] Protocol setup workflow for PICO criteria
- [x] Search execution workflow for PubMed integration
- [x] Screening batch workflow with Ollama LLM
- [x] Workflow documentation and testing guide

### 🚧 In Progress (Phase 3-10)

See [ALPHA_TEST_TASKS.md](ALPHA_TEST_TASKS.md) for complete task list:

- Phase 3: PubMed Integration (tasks 39-48)
- Phase 4: Screening Agent Implementation (tasks 49-62)
- Phase 5: Checkpoint and Resume (tasks 63-71)
- Phase 6: PRISMA Flow Tracking (tasks 72-78)
- Phase 7: Basic Human Review Interface (tasks 79-85)
- Phase 8: Integration Testing (tasks 86-104)
- Phase 9: Alpha Documentation (tasks 105-116)
- Phase 10: Alpha Release Preparation (tasks 117-124)

## 📚 Resources

- [Full Technical Specification](Specifications.md)
- [Alpha Test Task List](ALPHA_TEST_TASKS.md)
- [Cochrane Handbook for Systematic Reviews](https://training.cochrane.org/handbook)
- [PRISMA 2020 Statement](http://www.prisma-statement.org/)
- [n8n Documentation](https://docs.n8n.io/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Ollama Documentation](https://ollama.ai/docs)

## 🤝 Contributing

This is an alpha-stage research project. Contributions are welcome once core functionality is stable.

## 📄 License

[To be determined]

## 🙏 Acknowledgments

Built following the "Ralph Playbook" pattern for multi-agent orchestration with PostgreSQL-backed persistent memory.

A project of the **Resuscitation EDucation Initiative (REdI)** | Metro North Health

---

**Version**: Alpha 0.2
**Last Updated**: 2026-01-29
**Status**: Phase 1 & 2 Complete, Phase 3 In Progress
