# CritLit Architecture

## System Overview

CritLit is a microservices-based systematic literature review (SLR) automation platform orchestrated through Docker Compose. The architecture implements a separation of concerns across orchestration, data persistence, AI inference, and document management layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                      External Data Sources                       │
│  PubMed/NCBI │ Scopus │ Web of Science │ EMBASE │ Primo (API)  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST APIs
┌────────────────────────────┴────────────────────────────────────┐
│                    n8n Orchestration Layer                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │ Workflow   │  │  Worker    │  │   Redis    │  │  Queue   │  │
│  │   Engine   │──│   Pool     │──│   Cache    │──│ Manager  │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ SQL Queries / Vector Search
┌────────────────────────────┴────────────────────────────────────┐
│                   PostgreSQL Data Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │ Relational  │  │   Vector    │  │  Full-Text   │            │
│  │  Storage    │  │  Embeddings │  │    Search    │            │
│  │  (pgvector) │  │   (HNSW)    │  │   (trgm)     │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Embedding Generation
┌────────────────────────────┴────────────────────────────────────┐
│                      Ollama LLM Layer                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GPU-Accelerated Model Inference (NVIDIA CUDA)           │  │
│  │  - Text embeddings (all-minilm, nomic-embed-text)       │  │
│  │  - Screening assistance (llama3.3, mistral)             │  │
│  │  - Data extraction (structured outputs)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  I-Librarian Document Layer                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PDF Storage │ Reference Management │ Full-Text Indexing │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        n8n Orchestration                         │
│                                                                  │
│  ┌─────────────────┐       ┌─────────────────┐                 │
│  │   Coordinator   │       │   Search Worker │                 │
│  │    Workflow     │──────▶│    Workflow     │                 │
│  │                 │       │                 │                 │
│  │ - Review setup  │       │ - API queries   │                 │
│  │ - Task queuing  │       │ - Rate limiting │                 │
│  │ - State mgmt    │       │ - Result merge  │                 │
│  └────────┬────────┘       └────────┬────────┘                 │
│           │                         │                           │
│           │                         ▼                           │
│           │                ┌─────────────────┐                 │
│           │                │   Deduplication │                 │
│           │                │     Workflow    │                 │
│           │                │                 │                 │
│           │                │ - Vector comp.  │                 │
│           │                │ - Title fuzzy   │                 │
│           │                │ - DOI matching  │                 │
│           │                └────────┬────────┘                 │
│           │                         │                           │
│           │                         ▼                           │
│           │                ┌─────────────────┐                 │
│           └───────────────▶│   Screening     │                 │
│                            │    Workflow     │                 │
│                            │                 │                 │
│                            │ - AI screening  │                 │
│                            │ - Human review  │                 │
│                            │ - Conflict res. │                 │
│                            └────────┬────────┘                 │
│                                     │                           │
│                                     ▼                           │
│                            ┌─────────────────┐                 │
│                            │  Data Extract.  │                 │
│                            │    Workflow     │                 │
│                            │                 │                 │
│                            │ - PICO extract  │                 │
│                            │ - Outcomes      │                 │
│                            │ - Quality assess│                 │
│                            └────────┬────────┘                 │
│                                     │                           │
│                                     ▼                           │
│                            ┌─────────────────┐                 │
│                            │  PRISMA Report  │                 │
│                            │    Workflow     │                 │
│                            │                 │                 │
│                            │ - Flow diagram  │                 │
│                            │ - Statistics    │                 │
│                            │ - Export        │                 │
│                            └─────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
                                     │
                        ┌────────────┴─────────────┐
                        │                          │
                        ▼                          ▼
┌───────────────────────────────────┐  ┌──────────────────────┐
│       PostgreSQL Database         │  │   Redis Cache/Queue  │
│                                   │  │                      │
│  ┌────────────────────────────┐  │  │  - Task queues       │
│  │  Core Tables               │  │  │  - Workflow state    │
│  │  ├─ reviews                │  │  │  - Rate limit cache  │
│  │  ├─ search_executions      │  │  └──────────────────────┘
│  │  ├─ documents              │  │
│  │  ├─ screening_decisions    │  │
│  │  ├─ workflow_state         │  │
│  │  ├─ audit_log              │  │
│  │  └─ prisma_flow            │  │
│  └────────────────────────────┘  │
│                                   │
│  ┌────────────────────────────┐  │
│  │  Vector Extension          │  │
│  │  ├─ document_embeddings    │  │
│  │  └─ HNSW index (similarity)│  │
│  └────────────────────────────┘  │
│                                   │
│  ┌────────────────────────────┐  │
│  │  Search Extensions         │  │
│  │  ├─ pg_trgm (fuzzy match)  │  │
│  │  └─ Full-text search config│  │
│  └────────────────────────────┘  │
└───────────────────────────────────┘
```

## Data Flow

### 1. Search Phase
```
User Query
    │
    ▼
Coordinator Workflow (n8n)
    │
    ├─▶ PubMed API ────┐
    ├─▶ Scopus API ────┤
    └─▶ Custom APIs ───┼─▶ Raw Results
                       │
                       ▼
              Normalize & Store
                       │
                       ▼
              PostgreSQL (documents)
```

### 2. Deduplication Phase
```
Documents Table
    │
    ▼
Generate Embeddings (Ollama)
    │
    ▼
Store Vectors (document_embeddings)
    │
    ▼
Vector Similarity Search (HNSW)
    │
    ├─▶ Cosine similarity > 0.95 ─▶ Mark as duplicate
    │
    ▼
Title Fuzzy Matching (pg_trgm)
    │
    ├─▶ Trigram similarity > 0.80 ─▶ Confirm duplicate
    │
    ▼
DOI/PMID Matching
    │
    └─▶ Exact match ─▶ Canonical reference established
```

### 3. Screening Phase
```
Unique Documents
    │
    ▼
Title/Abstract Screening (AI)
    │
    ├─▶ Ollama LLM ──▶ Include/Exclude + Confidence
    │
    ▼
Store Decision (screening_decisions)
    │
    ├─▶ Low confidence (<0.70) ─▶ Flag for human review
    │
    ▼
Human Review (if needed)
    │
    └─▶ Update decision + rationale
    │
    ▼
Full-Text Screening (included only)
    │
    └─▶ Repeat process with full text
```

### 4. PRISMA Reporting
```
screening_decisions
    │
    ▼
Aggregate Counts by Stage
    │
    ├─▶ Records identified (by database)
    ├─▶ Duplicates removed
    ├─▶ Records screened
    ├─▶ Excluded (by reason)
    └─▶ Studies included
    │
    ▼
Generate PRISMA Flow (prisma_flow table)
    │
    └─▶ Export diagram (SVG/PNG)
```

## Database Schema Overview

### Core Entity Relationships

```
reviews (1) ───────▶ (*) documents
   │                      │
   │                      ├─▶ (1) document_embeddings
   │                      │
   │                      └─▶ (*) screening_decisions
   │
   ├─────────────────▶ (*) search_executions
   │
   ├─────────────────▶ (1) prisma_flow
   │
   └─────────────────▶ (*) audit_log

documents (self-referential)
   └─▶ duplicate_of ──▶ canonical document
```

### Key Tables

| Table | Purpose | Key Columns | Indexes |
|-------|---------|-------------|---------|
| **reviews** | SLR project metadata | id, title, prospero_id, pico, status | PK (id) |
| **search_executions** | Search history | id, review_id, query, database, results_count | review_id |
| **documents** | Article metadata | id, review_id, external_ids (JSONB), title, abstract | pmid, doi, review_id |
| **document_embeddings** | Vector representations | document_id, embedding (vector[1536]) | HNSW index |
| **screening_decisions** | Include/exclude decisions | id, document_id, stage, decision, confidence | document_id, stage |
| **workflow_state** | n8n execution state | id, workflow_id, review_id, state (JSONB) | review_id |
| **audit_log** | Complete decision trail | id, review_id, entity_type, action, actor_type | review_id, entity |
| **prisma_flow** | PRISMA diagram data | id, review_id, records_identified (JSONB), reports_excluded (JSONB) | review_id |

### Critical Indexes

```sql
-- Vector similarity search (HNSW for fast approximate nearest neighbor)
CREATE INDEX idx_document_embeddings_vector
ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search on titles and abstracts
CREATE INDEX idx_documents_fulltext
ON documents
USING gin(to_tsvector('medical_english', title || ' ' || COALESCE(abstract, '')));

-- Trigram fuzzy matching for deduplication
CREATE INDEX idx_documents_title_trgm
ON documents
USING gin(title gin_trgm_ops);

-- Fast external ID lookups
CREATE INDEX idx_documents_pmid ON documents((external_ids->>'pmid'));
CREATE INDEX idx_documents_doi ON documents((external_ids->>'doi'));
```

### Data Integrity Constraints

```sql
-- Prevent duplicate DOIs within a review
ALTER TABLE documents
ADD CONSTRAINT unique_review_doi
UNIQUE(review_id, (external_ids->>'doi'));

-- Ensure screening decisions reference valid documents
ALTER TABLE screening_decisions
ADD FOREIGN KEY (document_id)
REFERENCES documents(id)
ON DELETE CASCADE;

-- Canonical duplicate references must exist
ALTER TABLE documents
ADD FOREIGN KEY (duplicate_of)
REFERENCES documents(id);
```

## Workflow Pipeline

### Systematic Review Stages

| Stage | Input | Process | Output | Duration |
|-------|-------|---------|--------|----------|
| **Protocol** | Research question, PICO | Define inclusion/exclusion criteria | Review record in DB | 1-2 hours |
| **Search** | Search strategy, APIs | Execute queries, fetch results | Raw documents (10,000-100,000) | 30 min - 2 hours |
| **Deduplication** | Raw documents | Vector + fuzzy + exact matching | Unique documents (50-70% reduction) | 1-4 hours |
| **Title/Abstract Screening** | Unique documents | AI + human review | Potentially relevant (5-20% included) | 2-8 hours |
| **Full-Text Screening** | Potentially relevant | Full-text analysis | Included studies (20-50% of T/A) | 4-16 hours |
| **Data Extraction** | Included studies | Extract PICO, outcomes, ROB | Structured data | 8-24 hours |
| **Synthesis** | Structured data | Meta-analysis, narrative synthesis | Review findings | Variable |
| **Reporting** | All stages | Generate PRISMA flow, tables | Publication-ready report | 4-8 hours |

### Decision Points

```
┌─────────────────────────────────────────────────────────┐
│                  Deduplication Decision                 │
│                                                         │
│  Vector similarity > 0.95                               │
│       AND                                               │
│  (Title fuzzy match > 0.80 OR DOI exact match)         │
│       ▼                                                 │
│  Mark as duplicate ──▶ Set is_duplicate=true           │
│                    └─▶ Link to canonical document      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Title/Abstract Screening Decision          │
│                                                         │
│  AI confidence ≥ 0.70  ─▶  Accept AI decision           │
│  AI confidence < 0.70  ─▶  Flag for human review        │
│  Human override        ─▶  Set overridden=true          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               Full-Text Screening Decision              │
│                                                         │
│  Title/Abstract = exclude ─▶ Skip (don't retrieve)      │
│  Title/Abstract = include ─▶ Retrieve full text         │
│    │                                                    │
│    ├─▶ Full text available   ─▶ AI + human screening   │
│    └─▶ Full text unavailable ─▶ Mark as not retrieved  │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Docker Services

| Service | Image | Version | Purpose | Memory | CPU | GPU |
|---------|-------|---------|---------|--------|-----|-----|
| **PostgreSQL** | pgvector/pgvector | pg16 | Relational + vector database | 2-4 GB | 2-4 cores | No |
| **n8n** | n8nio/n8n | latest | Workflow orchestration | 1-2 GB | 1-2 cores | No |
| **n8n-worker** | n8nio/n8n | latest (worker mode) | Background task execution | 2-4 GB | 2-4 cores | No |
| **Redis** | redis | 7-alpine | Queue + cache | 512 MB - 1 GB | 1 core | No |
| **Ollama** | ollama/ollama | latest | Local LLM inference | 8-16 GB | 4-8 cores | Yes (NVIDIA) |
| **I-Librarian** | cgrima/i-librarian | latest | Reference management | 512 MB | 1 core | No |

### PostgreSQL Extensions

```sql
-- Vector similarity search (1536-dimensional embeddings)
CREATE EXTENSION vector;

-- Fuzzy string matching for deduplication
CREATE EXTENSION pg_trgm;

-- UUID generation for primary keys
CREATE EXTENSION "uuid-ossp";
```

### Key Dependencies

**n8n Orchestration:**
- Node.js runtime
- Bull queue (Redis-backed)
- PostgreSQL driver (pg)
- HTTP request nodes for API integration

**PostgreSQL:**
- pgvector 0.5+ (vector similarity search)
- pg_trgm (trigram fuzzy matching)
- PostgreSQL 16 (JSON aggregation, partitioning)

**Ollama:**
- NVIDIA CUDA 11.0+ (GPU acceleration)
- Docker GPU runtime
- Models: llama3.3, mistral, nomic-embed-text, all-minilm

**I-Librarian:**
- Apache web server
- SQLite (internal metadata)
- Tesseract OCR (PDF text extraction)

### Network Architecture

```
┌──────────────────────────────────────────────────────┐
│               Docker Bridge Network                  │
│                                                      │
│  slr_postgres:5432  ◄───┬───► slr_n8n:5678          │
│                         │                            │
│  slr_redis:6379     ◄───┤                            │
│                         │                            │
│  slr_ollama:11434   ◄───┤                            │
│                         │                            │
│  slr_ilibrarian:80  ◄───┘                            │
│                                                      │
└──────────────────────────────────────────────────────┘
         │                     │
         │ Port Forwarding     │
         ▼                     ▼
  Host:5432 (PostgreSQL)   Host:5678 (n8n UI)
  Host:8080 (I-Librarian)  Host:11434 (Ollama API)
```

### Volume Persistence

| Volume | Size (Typical) | Growth Rate | Backup Priority |
|--------|----------------|-------------|-----------------|
| postgres_data | 5-50 GB | High | **CRITICAL** |
| n8n_data | 100-500 MB | Low | High |
| redis_data | 50-200 MB | Medium | Low (ephemeral) |
| ollama_data | 10-50 GB | Low | Medium (re-downloadable models) |
| ilibrarian_data | 1-100 GB | High (PDFs) | Medium |

## Security Considerations

### Authentication

- **n8n**: HTTP Basic Auth (`N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD`)
- **PostgreSQL**: Password authentication (`POSTGRES_PASSWORD`)
- **I-Librarian**: Web-based login (configured on first run)

### Secrets Management

All sensitive values stored in `.env` file (excluded from version control):

```bash
# Database credentials
POSTGRES_PASSWORD=<generate-strong-password>

# n8n encryption key (encrypt credentials in database)
N8N_ENCRYPTION_KEY=<openssl rand -base64 32>

# External API keys
PUBMED_API_KEY=<ncbi-api-key>
ANTHROPIC_API_KEY=<optional-claude-key>
```

### Network Isolation

- Default Docker bridge network (inter-service communication)
- Port exposure limited to required services (5432, 5678, 8080, 11434)
- Ollama GPU access isolated via device reservations

### Data Retention

- Audit log: Permanent retention for PRISMA compliance
- Workflow execution history: 90-day retention (configurable in n8n)
- Document embeddings: Persist with documents (can be regenerated if deleted)

---

**Version**: 1.0.0
**Last Updated**: 2026-01-25
**Maintained By**: CritLit Project Team
