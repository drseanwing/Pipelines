# Changelog

All notable changes to CritLit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0-alpha] - 2026-01-25

### Alpha Release

This is the initial alpha release of CritLit, an autonomous systematic literature review pipeline. CritLit provides core workflows for automated literature search, AI-assisted screening, and human review, but lacks many features expected in production-ready systematic review tools.

**⚠️ Alpha Status Notice:** This release is intended for testing and feedback only. It is **not** recommended for production systematic reviews requiring publication-quality rigor. See [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for full details.

### Added

#### Infrastructure and Deployment
- Docker Compose orchestration with six integrated services:
  - PostgreSQL 16 with pgvector extension for semantic search
  - n8n workflow automation engine
  - n8n worker for background task execution
  - Redis for n8n queue management
  - Ollama for local LLM inference with GPU acceleration support
  - I-Librarian for reference management
- Complete database schema with migrations:
  - 8 core tables: `reviews`, `search_executions`, `documents`, `document_embeddings`, `screening_decisions`, `workflow_state`, `audit_log`, `prisma_flow`
  - pgvector support for 1536-dimension embeddings with HNSW indexing
  - Full-text search with medical/scientific tokenization
  - Trigram indexing for fuzzy matching and deduplication
  - Automatic timestamp tracking on all tables
- Environment configuration via `.env` file with template
- Verification scripts for PostgreSQL, Ollama, and vector search health checks

#### PubMed Integration
- Search execution via NCBI E-utilities API with API key support
- Batch document retrieval with rate limit compliance (3 requests/second)
- XML parsing for article metadata extraction
- Document storage in PostgreSQL with full metadata
- Search history tracking in `search_executions` table
- Support for up to 10,000 results per search

#### AI-Assisted Screening
- Ollama-based title/abstract screening workflow
- Structured JSON decision output (`include`, `exclude`, `uncertain`)
- Confidence score tracking for screening decisions
- Batch screening with progress tracking
- AI decision storage in `screening_decisions` table
- Support for configurable LLM models via Ollama

#### Human Review Interface
- Form-based review interface in n8n
- Include/exclude/maybe decision options
- Free-text reason field for exclusion justification
- Override capabilities for AI screening decisions
- Batch statistics display (total reviewed, included, excluded)
- Decision audit trail in `audit_log` table

#### Checkpoint and Resume
- Workflow state persistence in `workflow_state` table
- Error recovery with automatic checkpoint restoration
- Resume capability from last successful checkpoint
- State tracking across workflow interruptions
- Transaction-safe state updates

#### PRISMA Reporting
- Automated PRISMA flow diagram data tracking
- Study count calculations by stage (identification, screening, included, excluded)
- Human-readable count formatting
- Storage in `prisma_flow` table for later diagram generation
- Compliance with PRISMA 2020 reporting guidelines structure

### Known Limitations

This alpha release has significant limitations. Users should review [docs/LIMITATIONS.md](docs/LIMITATIONS.md) before use. Key constraints include:

#### Search and Deduplication
- Only PubMed database supported (no Embase, Cochrane, Web of Science, etc.)
- No automated duplicate detection or deduplication
- Result set limited to 10,000 studies per search
- No manual citation import (RIS, BibTeX)

#### AI Screening
- Local Ollama LLM only (no cloud LLM support for OpenAI, Anthropic, Google)
- Accuracy depends on model quality (smaller models less accurate)
- No dual-reviewer verification workflow
- No confidence threshold configuration

#### Document Processing
- No full-text PDF retrieval or management
- No data extraction forms or workflows
- No risk of bias assessment tools (Cochrane RoB, ROBINS-I)

#### Human Review
- Basic form interface only (no structured exclusion reasons)
- Single-user application (no collaborative features)
- No conflict resolution workflow for multiple reviewers
- No study tagging or categorization

#### Reporting and Export
- PRISMA counts only (no diagram generation)
- CSV export only (no RIS, BibTeX, Word, PDF)
- No meta-analysis or synthesis workflows

See [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for complete list, workarounds, and beta roadmap.

### Known Issues

1. **PubMed API Rate Limiting** - Searches occasionally fail with 429 errors; retry after 30 seconds (Issue #12)
2. **Large Result Set UI Slowdown** - Interface sluggish with >5,000 studies (Issue #18)
3. **Special Characters in Search Terms** - Incomplete PubMed query syntax support (Issue #23)
4. **AI Screening Silent Failures** - Ollama connection loss not detected (Issue #31)
5. **Abstract Formatting** - Structured abstracts displayed as plain text (Issue #29)

### Breaking Changes

N/A - Initial release

### Security

- Encrypted n8n credentials storage via `N8N_ENCRYPTION_KEY`
- Database password protection via environment variables
- No plaintext API key storage in workflows
- PostgreSQL user isolation (`slr_user` with limited privileges)

### Documentation

- [README.md](README.md) - Quick start and service architecture
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md) - Known limitations and issues
- [docs/QUICKSTART.md](docs/QUICKSTART.md) - Step-by-step deployment guide
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and component overview
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) - Workflow usage instructions
- [docs/checkpoint-schema.md](docs/checkpoint-schema.md) - Workflow state management
- [docs/n8n-credentials-setup.md](docs/n8n-credentials-setup.md) - API credential configuration
- [Specifications.md](Specifications.md) - Original design specifications
- [Alpha_Test_Tasks.md](Alpha_Test_Tasks.md) - Testing checklist for alpha release

### Contributors

- Initial development by drseanwing

### Acknowledgments

CritLit is alpha software developed to demonstrate AI-assisted systematic review workflows. It is **not** a replacement for established tools like Covidence, RevMan, or DistillerSR for production systematic reviews requiring publication quality.

Thank you to the systematic review community for feedback and testing.

---

## [Unreleased]

### Planned for Beta (v0.2.0)

See [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for complete beta roadmap including:
- Multi-database support (Cochrane CENTRAL)
- Citation deduplication
- Manual citation import (RIS, BibTeX)
- Full-text PDF management
- Data extraction forms
- PRISMA flow diagram generation
- Cloud LLM support (OpenAI, Anthropic)
- Multi-reviewer workflows
- Advanced export formats

---

**Note:** For feature requests and bug reports, see [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for submission guidelines.
