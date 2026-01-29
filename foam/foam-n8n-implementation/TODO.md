# FOAM N8N Implementation TODO

**Current Iteration:** Phase 4 Complete - Iteration 10 Done
**Last Updated:** 2025-01-25
**Status:** Production Ready (v1.0.0) - Iterations 11-12 (Performance Optimization, Advanced Documentation) planned for v1.1

---

## Iteration 1: Project Scaffolding

### Objectives
- Create complete directory structure
- Set up all JSON schemas
- Create placeholder files for all components
- Establish documentation framework

### Tasks

#### Directory Structure
- [x] Create root project directory
- [x] Create IMPLEMENTATION_FRAMEWORK.md
- [x] Create TODO.md (this file)
- [x] Create schemas/ directory with all schema files
- [x] Create workflows/ directory structure
- [x] Create prompts/ directory with placeholder prompts
- [x] Create templates/ directory (copy from skill)
- [x] Create code/ directory structure
- [x] Create config/ directory with examples
- [x] Create tests/ directory with sample data
- [x] Create docs/ directory

#### JSON Schemas
- [x] topic-request.schema.json
- [x] evidence-package.schema.json
- [x] draft-content.schema.json
- [x] review-request.schema.json

#### Configuration Files
- [x] n8n-env.example
- [x] postgres-init.sql
- [x] ollama-models.txt
- [x] docker-compose.yml (extracted from IMPLEMENTATION_FRAMEWORK.md)

#### Code Utilities
- [x] logging.js
- [x] error-handler.js
- [x] schema-validator.js

#### Test Data
- [x] journal-club-sample.json
- [x] case-based-sample.json
- [x] clinical-review-sample.json

#### Documentation
- [x] CHANGELOG.md
- [x] README.md
- [x] docs/deployment.md (stub)
- [x] docs/troubleshooting.md (stub)

### Blockers
- None

### Notes
- Iteration 1 COMPLETE
- All four JSON schemas created with comprehensive field definitions
- Code utilities include N8N Code Node compatibility
- Sample requests cover all three content formats
- docker-compose.yml extracted to separate file
- docs/ directory created with deployment and troubleshooting stubs

---

## Upcoming Iterations

### Phase 4 Preparation: Backup and Restore System (COMPLETE)
- [x] Comprehensive backup script (backup.sh)
- [x] Safe restore script (restore.sh)
- [x] Documentation with automation examples
- [x] Disaster recovery procedures

#### Notes - Backup & Restore
- Created scripts/backup.sh with encryption, compression, integrity verification
- Created scripts/restore.sh with pre-restore backup, component-specific restore, health checks
- Complete documentation in scripts/README.md
- Includes automation examples (cron, systemd timer)
- Security best practices and troubleshooting guide

### Iteration 2: Core Infrastructure (COMPLETE)
- [x] PostgreSQL schema for content storage
- [x] Basic N8N orchestrator workflow
- [x] Webhook trigger configuration
- [x] Error handling framework
- [x] Logging setup

#### Notes - Iteration 2
- Orchestrator workflow created with webhook, routing, and sub-workflow execution
- Stub workflows created for case-based, journal-club, and clinical-review
- Common workflows created: error-handler.json, logging.json, webhook-config.json
- All workflows designed for N8N import with proper node connections

### Iteration 3: Evidence Search Pipeline (COMPLETE)
- [x] PubMed search integration
- [x] GPT-4o web search configuration
- [x] FOAM resource scraping
- [x] Evidence package assembly

#### Notes - Iteration 3
- Created workflows/common/pubmed-fetch.json with search and single-article fetch modes
- Created workflows/common/web-search.json with GPT-4o + SerpAPI integration
- Created workflows/common/foamed-crossref.json scraping LITFL, EMCrit, EM Cases, etc.
- Created workflows/common/evidence-search.json as main orchestrator with parallel execution and Claude synthesis

### Iteration 4: Journal Club Workflow (COMPLETE)
- [x] Trial data extraction prompts
- [x] Critical appraisal automation
- [x] Bottom line generation
- [x] Template assembly

#### Notes - Iteration 4
- Created prompts/trial-extraction.md, critical-appraisal.md, bottom-line.md
- Full journal-club.json workflow with Claude Sonnet for extraction, appraisal, and bottom line
- Workflow produces complete markdown draft with placeholders for expert input
- Uses PubMed fetch sub-workflow for trial retrieval

### Iteration 5: Case-Based Workflow (COMPLETE)
- [x] Progressive revelation logic
- [x] Decision point identification
- [x] Clinical pearl placeholders
- [x] Vignette generation

#### Notes - Iteration 5
- Created prompts/vignette-generation.md for opening case vignettes (50-100 words)
- Created prompts/decision-points.md for clinical decision point extraction (3-5 points)
- Created prompts/case-discussion.md for evidence synthesis at each decision point
- Full case-based.json workflow with 13 nodes and 4 Claude Sonnet calls
- Workflow uses evidence-search sub-workflow for content
- Produces publication-ready markdown with progressive revelation structure

### Iteration 6: Clinical Review Workflow (COMPLETE)
- [x] Section-by-section drafting
- [x] Multi-section assembly
- [x] Cross-referencing system
- [x] Quality checkpoint integration

#### Notes - Iteration 6
- Created prompts/scope-definition.md for review structure planning (8-12 sections)
- Created prompts/section-drafting.md for evidence-integrated section generation
- Created prompts/quality-checkpoint.md for pre-expert validation
- Full clinical-review.json workflow with 13 nodes
- Uses Claude Sonnet for scope definition and section drafting (16K tokens for long content)
- Uses Ollama Llama 3.2 for cost-effective quality checkpoint
- Produces comprehensive markdown (3,000-5,000 words) with modular structure

### Iteration 7: Validation System (COMPLETE)
- [x] Dose/threshold extraction
- [x] Claim verification prompts
- [x] Guideline conflict detection
- [x] Reviewer checklist generation

#### Notes - Iteration 7
- Created prompts/dose-extraction.md for drug doses, thresholds, lab values extraction
- Created prompts/claim-verification.md for factual claim verification against PMIDs
- Created prompts/guideline-conflict.md for detecting conflicts with major guidelines (SSC, ILCOR, AHA, NICE, ARC)
- Created prompts/reviewer-checklist.md for comprehensive expert review checklist generation
- Full validation-system.json workflow with 15 nodes
- Uses Ollama Llama 3.2 for dose extraction and checklist generation (cost-effective)
- Uses Ollama Mistral for claim verification
- Uses Claude Sonnet for guideline conflict detection (requires more reasoning)

### Iteration 8: Human-in-the-Loop Review (COMPLETE)
- [x] Review request notification workflow
- [x] Expert feedback capture interface
- [x] Revision request workflow
- [x] Approval tracking and status updates

#### Notes - Iteration 8
- Created prompts/review-notification.md for multi-channel reviewer notifications (email, Slack)
- Created prompts/feedback-processing.md for parsing unstructured reviewer feedback
- Created prompts/revision-application.md for applying corrections and clinical pearls
- Created prompts/approval-assessment.md for publication readiness evaluation
- Full hitl-review.json workflow with 18+ nodes
- Uses Ollama Llama 3.2 for notification generation (cost-effective)
- Uses Claude Sonnet for feedback processing, revision application, and approval assessment (requires reasoning)
- Includes 7-day wait timeout for reviewer response
- Routes to publication queue or re-review based on approval status

### Iteration 9: Quality Assurance Automation (COMPLETE)
- [x] Style guide compliance checks
- [x] Citation verification automation
- [x] Word count and structure validation
- [x] Output quality scoring

#### Notes - Iteration 9
- Created prompts/style-compliance.md for FOAM style guide compliance checking (8 categories)
- Created prompts/citation-verification.md for PMID format, uncited claims, recency checks
- Created prompts/structure-validation.md for word count, section presence, table usage validation
- Created prompts/quality-scoring.md for weighted quality scoring with A-F grading
- Full qa-automation.json workflow with 16 nodes and parallel execution
- Uses Ollama Llama 3.2 for style and structure checks (fast, cost-effective)
- Uses Ollama Mistral for citation verification (good at structured checking)
- Uses Claude Sonnet for quality scoring (requires synthesis reasoning)
- Routes by grade: A/B pass to storage, C/D/F flagged for revision

### Iteration 10: Self-Hosted Deployment (COMPLETE)
- [x] Production Docker Compose with SSL/TLS
- [x] Traefik reverse proxy configuration
- [x] Setup scripts (setup.sh)
- [x] Backup and restore scripts
- [x] Monitoring stack (Prometheus, Grafana)
- [x] Security hardening documentation
- [x] Complete deployment guide

#### Notes - Iteration 10
- Created docker-compose.prod.yml with Traefik, SSL, Redis queue mode, resource limits
- Created scripts/setup.sh for automated environment setup
- Created scripts/backup.sh with encryption, compression, retention management
- Created scripts/restore.sh with pre-restore backup, component-specific restore
- Created config/prometheus.yml, alerting-rules.yml for monitoring
- Created docker-compose.monitoring.yml with full observability stack
- Created config/grafana/dashboards/foam-overview.json for pre-built dashboards
- Created docs/security-hardening.md with comprehensive security guidelines
- Updated docs/deployment.md with complete production deployment guide
- **Phase 4 (Deployment) is now COMPLETE**

---

## Completed Iterations

### Pre-Implementation
- [x] FOAM resource analysis completed
- [x] Style guide developed
- [x] Templates created
- [x] Skill documentation written
- [x] N8N orchestration research completed

---

## Quick Reference

### Key Files
| File | Purpose |
|------|---------|
| IMPLEMENTATION_FRAMEWORK.md | Master specification document |
| TODO.md | This file - iteration tracking |
| schemas/*.json | Data contract definitions |
| workflows/*.json | N8N workflow exports |
| prompts/*.md | LLM system prompts |

### Model Allocation (Quick Reference)
| Task | Model |
|------|-------|
| Evidence synthesis | Claude Sonnet 4 |
| Web research | GPT-4o + Search |
| Content drafting | Claude Sonnet 4 |
| Preprocessing | Ollama Llama 3.2 |
| Validation | Ollama Mistral |

### Contact
- Project Lead: Sean (REdI, Metro North Health)
- Workflow: foam-content-orchestrator

---

## Iteration Completion Checklist

Before marking an iteration complete:
- [ ] All tasks checked off
- [ ] Code tested (where applicable)
- [ ] Documentation updated
- [ ] TODO.md updated with next iteration details
- [ ] CHANGELOG.md entry added
- [ ] Blockers documented for next iteration
