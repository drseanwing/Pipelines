# Changelog

All notable changes to the FOAM N8N Implementation will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-01-25

### Added
- **GitHub Actions CI Workflow** (`.github/workflows/ci.yml`):
  - Validates all JSON files (workflows, schemas)
  - Validates JSON schemas against draft-07
  - Lints shell scripts with shellcheck
  - Validates Docker Compose configurations
  - Checks environment variable consistency
  - Validates N8N workflow structure and connections

- **Test Suite** (`tests/`):
  - `validate-workflows.js` - N8N workflow structure validation
  - `validate-schemas.js` - JSON schema validation with Ajv
  - `check-model-consistency.js` - LLM model reference validation
  - `run-all-tests.js` - Unified test runner
  - `package.json` - Test dependencies (ajv, ajv-formats)

### Fixed
- **CRITICAL: hitl-review.json** - Fixed invalid credential template syntax
- **CRITICAL: hitl-review.json** - Fixed wrong parameter name (modelId → model)
- **CRITICAL: docker-compose.monitoring.yml** - Removed default Grafana password
- **CRITICAL: setup-monitoring.sh** - Now generates random secure passwords
- **HIGH: Ollama model IDs** - Standardized to `llama3.2:latest` and `mistral:latest` across all workflows
- **HIGH: error-handler.js** - Replaced deprecated `substr()` with `substring()`
- **HIGH: error-handler.js** - Added defensive error.message handling

### Changed
- **docs/deployment.md** - Updated status from "Stub" to "Complete (v1.0.0)"
- **docs/troubleshooting.md** - Updated status to reflect actual completion
- **TODO.md** - Added note about v1.1 planned features
- **IMPLEMENTATION_FRAMEWORK.md** - Added clarification note about spec vs implementation
- **.env.monitoring.example** - Enhanced security documentation

### Security
- Grafana now requires explicit password configuration (no default)
- Monitoring setup generates random 32-character passwords
- Added security notes to environment templates

---

## [1.0.0] - 2025-01-25

### Added
- **Production Docker Compose** (`docker-compose.prod.yml`):
  - Traefik reverse proxy with automatic Let's Encrypt SSL
  - HTTP to HTTPS redirect with security headers
  - Redis for N8N queue mode (production scaling)
  - Resource limits and health checks for all services
  - Network isolation (internal network for postgres/redis)
  - Rate limiting for webhooks (100 req/min general, 300 for webhooks)
  - Traefik dashboard with basic auth

- **Setup Script** (`scripts/setup.sh`):
  - Automated environment setup with Docker detection
  - Production vs development mode detection
  - Service startup in correct order
  - Ollama model pulling (llama3.2, mistral)
  - Health checks for all services
  - Colored output with progress indicators

- **Backup and Restore Scripts**:
  - `scripts/backup.sh` - Comprehensive backup with encryption, compression, retention
  - `scripts/restore.sh` - Safe restore with pre-restore backup, integrity verification
  - `scripts/README.md` - Complete documentation with automation examples

- **Monitoring Stack** (`docker-compose.monitoring.yml`):
  - Prometheus metrics collection
  - Grafana visualization with pre-configured dashboards
  - Node exporter, Postgres exporter, cAdvisor
  - 25+ alerting rules for service health, error rates, costs
  - Custom FOAM workflow metrics from PostgreSQL

- **Security Hardening** (`docs/security-hardening.md`):
  - Network security with firewall configuration
  - Authentication and authorization guidelines
  - API key security and rotation procedures
  - TLS/SSL configuration requirements
  - Container security best practices
  - Database security and encryption
  - HIPAA, GDPR, Australia Privacy Act compliance considerations
  - Incident response procedures
  - Pre-deployment security checklist

- **Complete Deployment Guide** (`docs/deployment.md`):
  - Infrastructure requirements (minimum/recommended specs)
  - Step-by-step production deployment (9 steps)
  - Scaling considerations (N8N workers, PostgreSQL optimization)
  - Backup strategy with automation examples
  - Monitoring setup with key metrics
  - Maintenance procedures (log rotation, updates)

### Notes
- Iteration 10: Self-Hosted Deployment is now complete
- **Phase 4 (Deployment) is now COMPLETE**
- **v1.0.0 marks production-ready release**
- All 10 iterations complete
- Full multi-LLM orchestration system ready for deployment
- Includes enterprise features: monitoring, backup/restore, security hardening

---

## [0.9.0] - 2025-01-25

### Added
- **Quality Assurance Automation**:
  - `workflows/common/qa-automation.json` - Full QA workflow with parallel style/citation checks and quality scoring
  - `prompts/style-compliance.md` - FOAM style guide compliance checking (8 categories: register, uncertainty, formatting, citations, structure, actionability, placeholders, cross-refs)
  - `prompts/citation-verification.md` - Citation format validation, uncited claim detection, recency checking
  - `prompts/structure-validation.md` - Word count, section presence, header hierarchy, table usage validation
  - `prompts/quality-scoring.md` - Weighted quality scoring with A-F grading system

### Notes
- Iteration 9: Quality Assurance Automation is now complete
- **Phase 3 (Quality & Validation) is now COMPLETE**
- Workflow uses parallel execution for style/structure and citation checks
- Uses Ollama Llama 3.2 for style and structure checks (fast, cost-effective)
- Uses Ollama Mistral for citation verification (good at structured checking)
- Uses Claude Sonnet for quality scoring (requires synthesis reasoning)
- Routes by grade: A/B pass to PostgreSQL storage, C/D/F flagged for revision
- Ready to begin Phase 4: Deployment

---

## [0.8.0] - 2025-01-25

### Added
- **Human-in-the-Loop Review System**:
  - `workflows/common/hitl-review.json` - Full HITL workflow with notification, feedback capture, revision, and approval tracking
  - `prompts/review-notification.md` - Multi-channel reviewer notification generation (email, Slack)
  - `prompts/feedback-processing.md` - Unstructured feedback parsing and categorization
  - `prompts/revision-application.md` - Correction and clinical pearl application to drafts
  - `prompts/approval-assessment.md` - Publication readiness evaluation with quality gates

### Notes
- Iteration 8: Human-in-the-Loop Review is now complete
- Workflow uses Ollama Llama 3.2 for notification generation (cost-effective)
- Workflow uses Claude Sonnet for feedback processing and revision application (requires reasoning)
- Workflow uses Ollama Mistral for structured approval assessment
- Includes 7-day configurable wait timeout for reviewer response
- Routes to publication queue or re-review loop based on approval status
- Ready to begin Iteration 9: Quality Assurance Automation

---

## [0.7.0] - 2025-01-25

### Added
- **Validation System Workflow**:
  - `workflows/common/validation-system.json` - Full implementation with dose extraction, claim verification, guideline conflict detection, checklist generation
  - `prompts/dose-extraction.md` - Drug doses, thresholds, lab values extraction prompt with priority categorization
  - `prompts/claim-verification.md` - Factual claim verification against cited sources (PMID)
  - `prompts/guideline-conflict.md` - Conflict detection with SSC, ILCOR, AHA, NICE, ARC guidelines
  - `prompts/reviewer-checklist.md` - Comprehensive expert review checklist generation

### Notes
- Iteration 7: Validation System is now complete
- Workflow uses Ollama Llama 3.2 for dose extraction and checklist generation (cost-effective)
- Workflow uses Ollama Mistral for claim verification
- Workflow uses Claude Sonnet for guideline conflict detection (requires more reasoning)
- Validation produces structured reports with verification status, conflict detection, and expert checklists
- Ready to begin Iteration 8: Human-in-the-Loop Review

---

## [0.6.0] - 2025-01-25

### Added
- **Clinical Review Workflow**:
  - `workflows/clinical-review.json` - Full implementation with scope definition, section drafting, quality checkpoint
  - `prompts/scope-definition.md` - Review structure planning prompt (8-12 sections)
  - `prompts/section-drafting.md` - Evidence-integrated section generation prompt
  - `prompts/quality-checkpoint.md` - Pre-expert validation checklist prompt

### Fixed
- **CRITICAL**: Fixed error-handler.json database column mismatch (added error_id, stack_trace)
- **HIGH**: Documented N8N workflow variables in deployment.md
- **HIGH**: Created root .env.example for docker-compose

### Notes
- Iteration 6: Clinical Review Workflow is now complete
- Workflow uses Claude Sonnet for scope definition and section drafting (16K token limit for long content)
- Workflow uses Ollama Llama 3.2 for cost-effective quality checkpoint
- Produces comprehensive markdown (3,000-5,000 words) with modular structure
- All three content formats (journal-club, case-based, clinical-review) now fully implemented
- Ready to begin Iteration 7: Validation System

---

## [0.5.0] - 2025-01-25

### Added
- **Case-Based Workflow**:
  - `workflows/case-based.json` - Full implementation with progressive revelation, decision points, evidence synthesis
  - `prompts/vignette-generation.md` - Opening case vignette generation prompt (50-100 words)
  - `prompts/decision-points.md` - Clinical decision point extraction prompt (3-5 points)
  - `prompts/case-discussion.md` - Evidence synthesis and discussion generation prompt

### Notes
- Iteration 5: Case-Based Workflow is now complete
- Workflow uses 4 Claude Sonnet calls: decision points, vignette, discussions, assembly
- Produces publication-ready markdown with progressive case revelation structure
- Integrates with evidence-search sub-workflow for content research
- Ready to begin Iteration 6: Clinical Review Workflow

---

## [0.4.0] - 2025-01-25

### Added
- **Journal Club Workflow**:
  - `workflows/journal-club.json` - Full implementation with PubMed fetch, data extraction, critical appraisal, bottom line generation
  - `prompts/trial-extraction.md` - Structured trial data extraction prompt
  - `prompts/critical-appraisal.md` - Systematic critical appraisal checklist prompt
  - `prompts/bottom-line.md` - FOAM-style bottom line generation prompt

### Notes
- Iteration 4: Journal Club Workflow is now complete
- Workflow uses 3 Claude Sonnet calls: extraction, appraisal, bottom line
- Produces publication-ready markdown with expert input placeholders
- Ready to begin Iteration 5: Case-Based Workflow

---

## [0.3.0] - 2025-01-25

### Added
- **Evidence Search Pipeline**:
  - `workflows/common/pubmed-fetch.json` - PubMed E-utilities integration with search and fetch modes
  - `workflows/common/web-search.json` - GPT-4o agent with SerpAPI for current medical evidence
  - `workflows/common/foamed-crossref.json` - FOAM resource scraper (LITFL, EMCrit, EM Cases, Rebel EM, St Emlyns, First10EM)
  - `workflows/common/evidence-search.json` - Main evidence orchestrator with parallel execution and Claude synthesis

### Fixed
- **CRITICAL**: Added `foam.workflow_logs` table to postgres-init.sql for logging workflow
- **CRITICAL**: Fixed orchestrator.json `errorWorkflow` setting to reference error handler
- **CRITICAL**: Fixed trial_reference format in webhook-config.json to match schema (object not string)
- Updated logging.json to use correct table and columns

### Notes
- Iteration 3: Evidence Search Pipeline is now complete
- PubMed workflow includes XML parsing for article metadata extraction
- Evidence search runs all 3 sources (PubMed, Web, FOAM) in parallel
- Claude Sonnet synthesizes evidence into structured package

---

## [0.2.0] - 2025-01-25

### Added
- **N8N Workflows**:
  - `workflows/orchestrator.json` - Main entry point with webhook, routing, error handling
  - `workflows/case-based.json` - Case-based discussion workflow (stub)
  - `workflows/journal-club.json` - Journal club summary workflow (stub)
  - `workflows/clinical-review.json` - Clinical review workflow (stub)
  - `workflows/common/error-handler.json` - Reusable error handling sub-workflow
  - `workflows/common/logging.json` - Centralized logging sub-workflow
  - `workflows/common/webhook-config.json` - Webhook configuration reference

- **Project Configuration**:
  - `.claude/settings.json` - Claude Code permissions for project

### Notes
- Iteration 2: Core Infrastructure is now complete
- Orchestrator workflow includes: webhook trigger, schema validation, format routing, sub-workflow execution, PostgreSQL storage, Slack notifications, error handling branch
- Stub workflows provide framework for Iterations 4-6
- Error handler implements retry logic, model fallbacks, and graceful degradation
- Ready to begin Iteration 3: Evidence Search Pipeline

---

## [0.1.1] - 2025-01-25

### Added
- `docker-compose.yml` - Extracted from IMPLEMENTATION_FRAMEWORK.md as standalone file
- `docs/deployment.md` - Deployment guide stub with quick start instructions
- `docs/troubleshooting.md` - Troubleshooting guide stub with common issues

### Changed
- Updated TODO.md to mark Iteration 1 as complete

### Notes
- Iteration 1: Project Scaffolding is now fully complete
- All configuration files, documentation stubs, and docker-compose are in place
- Ready to begin Iteration 2: Core Infrastructure

---

## [0.1.0] - 2025-01-21

### Added
- **Project Structure**: Complete directory scaffolding for all workflow components
- **Implementation Framework**: Comprehensive specification document (`IMPLEMENTATION_FRAMEWORK.md`)
  - Architecture overview with system component diagrams
  - Data flow specifications
  - Multi-LLM orchestration patterns
  - Model allocation strategy
  - 12-iteration implementation plan
  - Quality assurance framework
  - Deployment guide with Docker Compose configuration

- **JSON Schemas**: Full data contract definitions
  - `topic-request.schema.json` - Incoming content requests
  - `evidence-package.schema.json` - Research output structure
  - `draft-content.schema.json` - Generated content with placeholders
  - `review-request.schema.json` - Expert review workflow

- **Configuration Files**:
  - `postgres-init.sql` - Database schema with all tables, views, and triggers
  - `n8n-env.example` - Environment configuration template
  - `ollama-models.txt` - Local model documentation

- **Code Utilities**:
  - `logging.js` - Structured logging with N8N Code Node integration
  - `error-handler.js` - Error classification, retry logic, graceful degradation
  - `schema-validator.js` - JSON schema validation for workflow data

- **Templates**: Copied from existing FOAM skill
  - `case-based-template.md`
  - `journal-club-template.md`
  - `clinical-review-template.md`
  - `style-guide.md`
  - `SKILL.md`

- **Test Data**: Sample requests for each content format
  - `journal-club-sample.json` - TTM2 trial review request
  - `case-based-sample.json` - Septic shock vasopressor case
  - `clinical-review-sample.json` - Push dose vasopressors review

- **Documentation**:
  - `TODO.md` - Iteration tracking with task lists
  - `CHANGELOG.md` - This file

### Technical Decisions
- Selected Claude Sonnet 4 as primary model for drafting and synthesis
- GPT-4o designated for web search tasks via SerpAPI integration
- Ollama (Llama 3.2 / Mistral) for local preprocessing and validation
- PostgreSQL for conversation memory and content storage
- 15-second retry delay for rate limit recovery

### Notes
- Framework document serves as single source of truth for specifications
- All schemas include detailed field descriptions for documentation
- Error handler includes model fallback chains for resilience
- Logging utility designed for N8N Code Node compatibility

---

## Version History Summary

| Version | Date | Summary |
|---------|------|---------|
| 1.0.1 | 2025-01-25 | Code review fixes, GitHub CI, test suite |
| 1.0.0 | 2025-01-25 | Iteration 10 complete - Production deployment (Phase 4 complete) |
| 0.9.0 | 2025-01-25 | Iteration 9 complete - QA automation (Phase 3 complete) |
| 0.8.0 | 2025-01-25 | Iteration 8 complete - Human-in-the-loop review |
| 0.7.0 | 2025-01-25 | Iteration 7 complete - Validation system |
| 0.6.0 | 2025-01-25 | Iteration 6 complete - Clinical review workflow |
| 0.5.0 | 2025-01-25 | Iteration 5 complete - Case-based workflow |
| 0.4.0 | 2025-01-25 | Iteration 4 complete - Journal club workflow |
| 0.3.0 | 2025-01-25 | Iteration 3 complete - Evidence search pipeline |
| 0.2.0 | 2025-01-25 | Iteration 2 complete - N8N workflows, error handling |
| 0.1.1 | 2025-01-25 | Iteration 1 complete - docker-compose, docs stubs |
| 0.1.0 | 2025-01-21 | Initial scaffolding and framework |

---

## Roadmap

### Phase 1: Foundation (v0.1.x - v0.3.x) ✓ COMPLETE
- [x] 0.1.0 - Project scaffolding
- [x] 0.2.0 - Core infrastructure (PostgreSQL, N8N orchestrator)
- [x] 0.3.0 - Evidence search pipeline

### Phase 2: Content Generation (v0.4.x - v0.6.x) ✓ COMPLETE
- [x] 0.4.0 - Journal club workflow
- [x] 0.5.0 - Case-based workflow
- [x] 0.6.0 - Clinical review workflow

### Phase 3: Quality & Validation (v0.7.x - v0.9.x) ✓ COMPLETE
- [x] 0.7.0 - Validation system
- [x] 0.8.0 - Human-in-the-loop review
- [x] 0.9.0 - Quality assurance automation

### Phase 4: Deployment (v1.0.0) ✓ COMPLETE
- [x] 1.0.0 - Production-ready self-hosted deployment

---

## Future Considerations (Post v1.0)

- Performance optimization (parallel execution tuning, caching)
- Cost monitoring and optimization
- Additional content formats
- Multi-tenant support
- API documentation with OpenAPI spec
