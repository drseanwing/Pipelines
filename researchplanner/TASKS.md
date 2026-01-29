# QI/Research Pipeline - Implementation Task List

**Document Status:** Active
**Created:** 2026-01-28
**Last Updated:** 2026-01-28
**Specification Reference:** [qi-research-pipeline-spec.md](./qi-research-pipeline-spec.md)

---

## Overview

This document contains the granular implementation task list for the QI/Research Project Development Pipeline. Each task is atomic (no "and" in descriptions) and marked for parallel or sequential execution.

### Task Markers
- `[P]` = **Parallelizable** - Can run concurrently with sibling tasks
- `[S]` = **Sequential** - Depends on previous tasks completing
- `[ ]` = Not started
- `[x]` = Completed

### Phase Summary

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| 1 | Foundation | 67 | COMPLETED |
| 2 | Database | 87 | COMPLETED |
| 3 | Core n8n Infrastructure | 70 | COMPLETED |
| 4 | Stage 1 - Intake Agent | 55 | In Progress |
| 5 | Stage 2 - Research Agent | 88 | Not Started |
| 6 | Stage 3 - Methods Agent | 66 | Not Started |
| 7 | Stage 4 - Ethics Agent | 52 | Not Started |
| 8 | Stage 5 - Document Agent | 65 | Not Started |
| 9 | Integration & Testing | 55 | Not Started |
| 10 | Deployment | 50 | Not Started |
| **TOTAL** | | **655** | |

---

## PHASE 1: Foundation

**Dependencies:** None - Can start immediately
**Estimated Parallelization:** 31 tasks can run in parallel

### 1.1 Project Initialization

- [ ] [S] 1.1.1: Create root `package.json` with name `qi-research-pipeline`, version `0.1.0`, type `module`
- [ ] [S] 1.1.2: Add `scripts` block to package.json (build, test, lint, dev, start)
- [ ] [S] 1.1.3: Add `engines` field specifying Node.js >=18.0.0

### 1.2 TypeScript Configuration

- [ ] [P] 1.2.1: Create `tsconfig.json` with strict mode enabled
- [ ] [P] 1.2.2: Set `target` to ES2022, `module` to NodeNext
- [ ] [P] 1.2.3: Configure `outDir` as `dist/`, `rootDir` as `src/`
- [ ] [P] 1.2.4: Enable `declaration`, `declarationMap`, `sourceMap`
- [ ] [P] 1.2.5: Add `include` array for `src/**/*.ts`
- [ ] [P] 1.2.6: Add `exclude` array for `node_modules`, `dist`

### 1.3 Directory Structure

- [ ] [P] 1.3.1: Create `src/` directory (main source code)
- [ ] [P] 1.3.2: Create `src/types/` directory (TypeScript interfaces/types)
- [ ] [P] 1.3.3: Create `src/agents/` directory (pipeline agent logic)
- [ ] [P] 1.3.4: Create `src/workflows/` directory (n8n workflow definitions)
- [ ] [P] 1.3.5: Create `src/utils/` directory (shared utilities)
- [ ] [P] 1.3.6: Create `src/db/` directory (database queries, migrations)
- [ ] [P] 1.3.7: Create `src/templates/` directory (prompt templates)
- [ ] [P] 1.3.8: Create `src/documents/` directory (document generation)
- [ ] [P] 1.3.9: Create `templates/` directory (DOCX/document templates)
- [ ] [P] 1.3.10: Create `templates/protocols/` subdirectory
- [ ] [P] 1.3.11: Create `templates/grants/` subdirectory
- [ ] [P] 1.3.12: Create `templates/ethics/` subdirectory
- [ ] [P] 1.3.13: Create `templates/governance/` subdirectory
- [ ] [P] 1.3.14: Create `templates/common/` subdirectory
- [ ] [P] 1.3.15: Create `tests/` directory (test files)
- [ ] [P] 1.3.16: Create `docs/` directory (documentation)
- [ ] [P] 1.3.17: Create `migrations/` directory (database migrations)

### 1.4 Git Configuration

- [ ] [P] 1.4.1: Create `.gitignore` file
- [ ] [S] 1.4.2: Add `node_modules/` to .gitignore
- [ ] [S] 1.4.3: Add `dist/` to .gitignore
- [ ] [S] 1.4.4: Add `.env` to .gitignore
- [ ] [S] 1.4.5: Add `.env.local` to .gitignore
- [ ] [S] 1.4.6: Add `*.log` to .gitignore
- [ ] [S] 1.4.7: Add `.DS_Store` to .gitignore
- [ ] [S] 1.4.8: Add `coverage/` to .gitignore
- [ ] [S] 1.4.9: Add `.n8n/` to .gitignore (n8n local data)

### 1.5 Environment Configuration

- [ ] [P] 1.5.1: Create `.env.example` file with all required variables
- [ ] [S] 1.5.2: Add `N8N_HOST` placeholder
- [ ] [S] 1.5.3: Add `N8N_PORT` placeholder
- [ ] [S] 1.5.4: Add `N8N_PROTOCOL` placeholder
- [ ] [S] 1.5.5: Add `WEBHOOK_URL` placeholder
- [ ] [S] 1.5.6: Add `DB_POSTGRESDB_HOST` placeholder
- [ ] [S] 1.5.7: Add `DB_POSTGRESDB_PORT` placeholder
- [ ] [S] 1.5.8: Add `DB_POSTGRESDB_DATABASE` placeholder
- [ ] [S] 1.5.9: Add `DB_POSTGRESDB_USER` placeholder
- [ ] [S] 1.5.10: Add `DB_POSTGRESDB_PASSWORD` placeholder
- [ ] [S] 1.5.11: Add `ANTHROPIC_API_KEY` placeholder
- [ ] [S] 1.5.12: Add `SMTP_HOST` placeholder
- [ ] [S] 1.5.13: Add `SMTP_PORT` placeholder
- [ ] [S] 1.5.14: Add `SMTP_USER` placeholder
- [ ] [S] 1.5.15: Add `SMTP_PASSWORD` placeholder
- [ ] [S] 1.5.16: Add `S3_ENDPOINT` placeholder
- [ ] [S] 1.5.17: Add `S3_BUCKET` placeholder
- [ ] [S] 1.5.18: Add `S3_ACCESS_KEY` placeholder
- [ ] [S] 1.5.19: Add `S3_SECRET_KEY` placeholder

### 1.6 Documentation

- [ ] [P] 1.6.1: Create `README.md` with project title
- [ ] [S] 1.6.2: Add project description section to README
- [ ] [S] 1.6.3: Add architecture overview section to README
- [ ] [S] 1.6.4: Add prerequisites section to README
- [ ] [S] 1.6.5: Add installation instructions to README
- [ ] [S] 1.6.6: Add configuration instructions to README
- [ ] [S] 1.6.7: Add development commands section to README
- [ ] [S] 1.6.8: Add deployment instructions to README
- [ ] [S] 1.6.9: Add license section to README
- [ ] [P] 1.6.10: Create `docs/architecture.md` documenting system components

### 1.7 Dependencies Installation

- [ ] [S] 1.7.1: Add `docx` package to dependencies (document generation)
- [ ] [S] 1.7.2: Add `pg` package to dependencies (PostgreSQL client)
- [ ] [S] 1.7.3: Add `zod` package to dependencies (schema validation)
- [ ] [S] 1.7.4: Add `uuid` package to dependencies (UUID generation)
- [ ] [S] 1.7.5: Add `dotenv` package to dependencies (env loading)
- [ ] [S] 1.7.6: Add `@anthropic-ai/sdk` package to dependencies (Claude API)
- [ ] [S] 1.7.7: Add `typescript` to devDependencies
- [ ] [S] 1.7.8: Add `@types/node` to devDependencies
- [ ] [S] 1.7.9: Add `@types/pg` to devDependencies
- [ ] [S] 1.7.10: Add `@types/uuid` to devDependencies
- [ ] [S] 1.7.11: Add `vitest` to devDependencies (testing)
- [ ] [S] 1.7.12: Add `eslint` to devDependencies
- [ ] [S] 1.7.13: Add `@typescript-eslint/parser` to devDependencies
- [ ] [S] 1.7.14: Add `@typescript-eslint/eslint-plugin` to devDependencies

### 1.8 Linting Configuration

- [ ] [P] 1.8.1: Create `.eslintrc.json` file
- [ ] [S] 1.8.2: Configure TypeScript parser in eslint config
- [ ] [S] 1.8.3: Add recommended rules for TypeScript
- [ ] [S] 1.8.4: Configure ignore patterns for dist/node_modules

### 1.9 Docker Configuration

- [ ] [P] 1.9.1: Create `docker-compose.yml` file
- [ ] [S] 1.9.2: Add `n8n` service definition
- [ ] [S] 1.9.3: Add `postgres` service definition
- [ ] [S] 1.9.4: Add `redis` service definition
- [ ] [S] 1.9.5: Configure named volumes for persistence
- [ ] [S] 1.9.6: Configure bridge network `qi-pipeline`
- [ ] [P] 1.9.7: Create `Dockerfile` for custom n8n image with dependencies

---

## PHASE 2: Database

**Dependencies:** Phase 1.1, 1.2, 1.3.2, 1.3.6
**Estimated Parallelization:** 7 tasks can run in parallel

### 2.1 Schema Design - Core Tables

- [ ] [S] 2.1.1: Create migration file `001_create_projects_table.sql`
- [ ] [S] 2.1.2: Define `projects` table with `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] [S] 2.1.3: Add `status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'` column
- [ ] [S] 2.1.4: Add `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` column
- [ ] [S] 2.1.5: Add `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` column
- [ ] [S] 2.1.6: Add `intake JSONB NOT NULL` column
- [ ] [S] 2.1.7: Add `classification JSONB` column
- [ ] [S] 2.1.8: Add `frameworks JSONB` column
- [ ] [S] 2.1.9: Add `research JSONB` column
- [ ] [S] 2.1.10: Add `methodology JSONB` column
- [ ] [S] 2.1.11: Add `ethics JSONB` column
- [ ] [S] 2.1.12: Add `documents JSONB` column
- [ ] [S] 2.1.13: Add `checkpoints JSONB DEFAULT '{}'` column
- [ ] [S] 2.1.14: Add `owner_id UUID` column (foreign key placeholder)
- [ ] [S] 2.1.15: Add `deleted_at TIMESTAMP WITH TIME ZONE` column (soft delete)

### 2.2 Schema Design - Audit Log Table

- [ ] [S] 2.2.1: Create migration file `002_create_audit_log_table.sql`
- [ ] [S] 2.2.2: Define `audit_log` table with `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] [S] 2.2.3: Add `project_id UUID REFERENCES projects(id)` column
- [ ] [S] 2.2.4: Add `timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` column
- [ ] [S] 2.2.5: Add `action VARCHAR(100) NOT NULL` column
- [ ] [S] 2.2.6: Add `actor VARCHAR(255)` column
- [ ] [S] 2.2.7: Add `details JSONB` column
- [ ] [S] 2.2.8: Add `previous_state JSONB` column
- [ ] [S] 2.2.9: Add `new_state JSONB` column

### 2.3 Schema Design - Documents Table

- [ ] [S] 2.3.1: Create migration file `003_create_documents_table.sql`
- [ ] [S] 2.3.2: Define `documents` table with `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] [S] 2.3.3: Add `project_id UUID REFERENCES projects(id)` column
- [ ] [S] 2.3.4: Add `document_type VARCHAR(100) NOT NULL` column
- [ ] [S] 2.3.5: Add `filename VARCHAR(500) NOT NULL` column
- [ ] [S] 2.3.6: Add `file_path VARCHAR(1000) NOT NULL` column
- [ ] [S] 2.3.7: Add `file_size INTEGER` column
- [ ] [S] 2.3.8: Add `mime_type VARCHAR(100)` column
- [ ] [S] 2.3.9: Add `version VARCHAR(20)` column
- [ ] [S] 2.3.10: Add `status VARCHAR(50) DEFAULT 'DRAFT'` column
- [ ] [S] 2.3.11: Add `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` column
- [ ] [S] 2.3.12: Add `metadata JSONB` column

### 2.4 Schema Design - References Table

- [ ] [S] 2.4.1: Create migration file `004_create_references_table.sql`
- [ ] [S] 2.4.2: Define `references` table with `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] [S] 2.4.3: Add `project_id UUID REFERENCES projects(id)` column
- [ ] [S] 2.4.4: Add `pmid VARCHAR(20)` column
- [ ] [S] 2.4.5: Add `doi VARCHAR(100)` column
- [ ] [S] 2.4.6: Add `title TEXT NOT NULL` column
- [ ] [S] 2.4.7: Add `authors JSONB` column
- [ ] [S] 2.4.8: Add `journal VARCHAR(500)` column
- [ ] [S] 2.4.9: Add `year INTEGER` column
- [ ] [S] 2.4.10: Add `abstract TEXT` column
- [ ] [S] 2.4.11: Add `relevance_score DECIMAL(3,2)` column
- [ ] [S] 2.4.12: Add `key_findings JSONB` column
- [ ] [S] 2.4.13: Add `citation_formatted TEXT` column
- [ ] [S] 2.4.14: Add `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` column

### 2.5 Schema Design - Indexes

- [ ] [S] 2.5.1: Create migration file `005_create_indexes.sql`
- [ ] [S] 2.5.2: Add index `idx_projects_status ON projects(status)`
- [ ] [S] 2.5.3: Add index `idx_projects_owner ON projects(owner_id)`
- [ ] [S] 2.5.4: Add index `idx_audit_project ON audit_log(project_id)`
- [ ] [S] 2.5.5: Add index `idx_documents_project ON documents(project_id)`
- [ ] [S] 2.5.6: Add index `idx_references_project ON references(project_id)`

### 2.6 TypeScript Types - Core

- [ ] [P] 2.6.1: Create `src/types/project.ts` file
- [ ] [S] 2.6.2: Define `ProjectStatus` type union (all 15 statuses from spec)
- [ ] [S] 2.6.3: Define `ProjectType` enum (`QI`, `RESEARCH`, `HYBRID`)
- [ ] [S] 2.6.4: Define `GrantType` enum (5 grant types from spec)
- [ ] [S] 2.6.5: Define `Investigator` interface
- [ ] [S] 2.6.6: Define `TimelineConstraint` interface
- [ ] [S] 2.6.7: Define `IntakeData` interface
- [ ] [S] 2.6.8: Define `Classification` interface
- [ ] [S] 2.6.9: Define `Frameworks` interface
- [ ] [S] 2.6.10: Define `Checkpoints` interface
- [ ] [S] 2.6.11: Define `Project` interface (complete)

### 2.7 TypeScript Types - Research

- [ ] [P] 2.7.1: Create `src/types/research.ts` file
- [ ] [S] 2.7.2: Define `SearchStrategy` interface
- [ ] [S] 2.7.3: Define `ProcessedArticle` interface
- [ ] [S] 2.7.4: Define `GapAnalysis` interface
- [ ] [S] 2.7.5: Define `Citation` interface
- [ ] [S] 2.7.6: Define `ResearchResults` interface

### 2.8 TypeScript Types - Methodology

- [ ] [P] 2.8.1: Create `src/types/methodology.ts` file
- [ ] [S] 2.8.2: Define `StudyDesign` interface
- [ ] [S] 2.8.3: Define `Site` interface
- [ ] [S] 2.8.4: Define `Criterion` interface
- [ ] [S] 2.8.5: Define `SampleSize` interface
- [ ] [S] 2.8.6: Define `RecruitmentStrategy` interface
- [ ] [S] 2.8.7: Define `ParticipantSpec` interface
- [ ] [S] 2.8.8: Define `PrimaryOutcome` interface
- [ ] [S] 2.8.9: Define `SecondaryOutcome` interface
- [ ] [S] 2.8.10: Define `OutcomeSpec` interface
- [ ] [S] 2.8.11: Define `ProcedureSpec` interface
- [ ] [S] 2.8.12: Define `DataCollectionSpec` interface
- [ ] [S] 2.8.13: Define `AnalysisPlan` interface
- [ ] [S] 2.8.14: Define `ProjectTimeline` interface
- [ ] [S] 2.8.15: Define `Methodology` interface (complete)

### 2.9 TypeScript Types - Ethics

- [ ] [P] 2.9.1: Create `src/types/ethics.ts` file
- [ ] [S] 2.9.2: Define `EthicsPathwayType` enum
- [ ] [S] 2.9.3: Define `EthicsPathway` interface
- [ ] [S] 2.9.4: Define `RiskLevel` enum
- [ ] [S] 2.9.5: Define `RiskFactor` interface
- [ ] [S] 2.9.6: Define `RiskAssessment` interface
- [ ] [S] 2.9.7: Define `ConsentSpec` interface
- [ ] [S] 2.9.8: Define `DataGovernanceSpec` interface
- [ ] [S] 2.9.9: Define `SiteRequirement` interface
- [ ] [S] 2.9.10: Define `ChecklistItem` interface
- [ ] [S] 2.9.11: Define `EthicsEvaluation` interface (complete)

### 2.10 TypeScript Types - Documents

- [ ] [P] 2.10.1: Create `src/types/documents.ts` file
- [ ] [S] 2.10.2: Define `DocumentType` enum
- [ ] [S] 2.10.3: Define `DocumentStatus` enum
- [ ] [S] 2.10.4: Define `GeneratedDocument` interface
- [ ] [S] 2.10.5: Define `DocumentMetadata` interface
- [ ] [S] 2.10.6: Define `DocumentsOutput` interface

### 2.11 TypeScript Types - Audit

- [ ] [P] 2.11.1: Create `src/types/audit.ts` file
- [ ] [S] 2.11.2: Define `AuditAction` enum (all action types)
- [ ] [S] 2.11.3: Define `AuditEntry` interface

### 2.12 TypeScript Types - Index

- [ ] [S] 2.12.1: Create `src/types/index.ts` file
- [ ] [S] 2.12.2: Re-export all types from module files

### 2.13 Database Client

- [ ] [S] 2.13.1: Create `src/db/client.ts` file
- [ ] [S] 2.13.2: Implement `createPool()` function returning pg Pool
- [ ] [S] 2.13.3: Implement `getClient()` function for single connection
- [ ] [S] 2.13.4: Implement `closePool()` function for cleanup

### 2.14 Database Queries - Projects

- [ ] [S] 2.14.1: Create `src/db/queries/projects.ts` file
- [ ] [S] 2.14.2: Implement `createProject()` function
- [ ] [S] 2.14.3: Implement `getProjectById()` function
- [ ] [S] 2.14.4: Implement `updateProject()` function
- [ ] [S] 2.14.5: Implement `updateProjectStatus()` function
- [ ] [S] 2.14.6: Implement `updateProjectStage()` function (for intake/research/etc)
- [ ] [S] 2.14.7: Implement `getProjectsByOwner()` function
- [ ] [S] 2.14.8: Implement `getProjectsByStatus()` function
- [ ] [S] 2.14.9: Implement `softDeleteProject()` function

### 2.15 Database Queries - Audit Log

- [ ] [S] 2.15.1: Create `src/db/queries/audit.ts` file
- [ ] [S] 2.15.2: Implement `createAuditEntry()` function
- [ ] [S] 2.15.3: Implement `getAuditLogByProject()` function
- [ ] [S] 2.15.4: Implement `getAuditLogByAction()` function

### 2.16 Database Queries - Documents

- [ ] [S] 2.16.1: Create `src/db/queries/documents.ts` file
- [ ] [S] 2.16.2: Implement `createDocumentRecord()` function
- [ ] [S] 2.16.3: Implement `getDocumentsByProject()` function
- [ ] [S] 2.16.4: Implement `updateDocumentStatus()` function
- [ ] [S] 2.16.5: Implement `getDocumentById()` function

### 2.17 Database Queries - References

- [ ] [S] 2.17.1: Create `src/db/queries/references.ts` file
- [ ] [S] 2.17.2: Implement `createReference()` function
- [ ] [S] 2.17.3: Implement `bulkInsertReferences()` function
- [ ] [S] 2.17.4: Implement `getReferencesByProject()` function
- [ ] [S] 2.17.5: Implement `updateReferenceRelevance()` function

### 2.18 Database Index

- [ ] [S] 2.18.1: Create `src/db/index.ts` file
- [ ] [S] 2.18.2: Re-export client functions
- [ ] [S] 2.18.3: Re-export all query modules

### 2.19 Migration Runner

- [ ] [S] 2.19.1: Create `src/db/migrate.ts` file
- [ ] [S] 2.19.2: Implement migration tracking table creation
- [ ] [S] 2.19.3: Implement migration file discovery
- [ ] [S] 2.19.4: Implement migration execution logic
- [ ] [S] 2.19.5: Add CLI entry point for running migrations

---

## PHASE 3: Core n8n Infrastructure

**Dependencies:** Phase 2.6-2.12 (TypeScript types), Phase 2.13 (database client)
**Estimated Parallelization:** 9 tasks can run in parallel

### 3.1 n8n Master Workflow Structure

- [ ] [S] 3.1.1: Create `src/workflows/master-workflow.json` file
- [ ] [S] 3.1.2: Define workflow metadata (name, id, tags)
- [ ] [S] 3.1.3: Add webhook trigger node for intake endpoint
- [ ] [S] 3.1.4: Add input validation function node
- [ ] [S] 3.1.5: Add execute workflow node for intake stage
- [ ] [S] 3.1.6: Add wait node for intake checkpoint
- [ ] [S] 3.1.7: Add execute workflow node for research stage
- [ ] [S] 3.1.8: Add wait node for research checkpoint
- [ ] [S] 3.1.9: Add execute workflow node for methods stage
- [ ] [S] 3.1.10: Add wait node for methods checkpoint
- [ ] [S] 3.1.11: Add execute workflow node for ethics stage
- [ ] [S] 3.1.12: Add wait node for ethics checkpoint
- [ ] [S] 3.1.13: Add execute workflow node for documents stage
- [ ] [S] 3.1.14: Add email notification node for final review
- [ ] [S] 3.1.15: Add webhook response node
- [ ] [S] 3.1.16: Connect all nodes in sequence

### 3.2 State Management Utilities

- [ ] [S] 3.2.1: Create `src/utils/state.ts` file
- [ ] [S] 3.2.2: Implement `generateProjectId()` function
- [ ] [S] 3.2.3: Implement `getProjectState()` function
- [ ] [S] 3.2.4: Implement `updateProjectState()` function
- [ ] [S] 3.2.5: Implement `transitionStatus()` function with validation
- [ ] [S] 3.2.6: Define valid status transitions map
- [ ] [S] 3.2.7: Implement `validateStatusTransition()` function

### 3.3 Audit Logging Utilities

- [ ] [S] 3.3.1: Create `src/utils/audit.ts` file
- [ ] [S] 3.3.2: Implement `logAction()` function
- [ ] [S] 3.3.3: Implement `logStateChange()` function (captures before/after)
- [ ] [S] 3.3.4: Implement `logError()` function
- [ ] [S] 3.3.5: Implement `formatAuditEntry()` function

### 3.4 Validation Utilities

- [ ] [S] 3.4.1: Create `src/utils/validation.ts` file
- [ ] [S] 3.4.2: Define Zod schema for intake data
- [ ] [S] 3.4.3: Implement `validateIntakeData()` function
- [ ] [S] 3.4.4: Implement `validateRequiredFields()` function
- [ ] [S] 3.4.5: Implement `sanitizeInput()` function

### 3.5 Error Handling Utilities

- [ ] [S] 3.5.1: Create `src/utils/errors.ts` file
- [ ] [S] 3.5.2: Define `PipelineError` base class
- [ ] [S] 3.5.3: Define `ValidationError` class
- [ ] [S] 3.5.4: Define `StageError` class
- [ ] [S] 3.5.5: Define `LLMError` class
- [ ] [S] 3.5.6: Define `DatabaseError` class
- [ ] [S] 3.5.7: Implement `formatError()` function
- [ ] [S] 3.5.8: Implement `isRetryableError()` function

### 3.6 Notification Utilities

- [ ] [S] 3.6.1: Create `src/utils/notifications.ts` file
- [ ] [S] 3.6.2: Define notification types enum
- [ ] [S] 3.6.3: Implement `sendEmail()` function
- [ ] [S] 3.6.4: Implement `notifyUser()` function
- [ ] [S] 3.6.5: Implement `formatNotificationBody()` function
- [ ] [S] 3.6.6: Define email templates for each checkpoint

### 3.7 LLM Client Utilities

- [ ] [S] 3.7.1: Create `src/utils/llm.ts` file
- [ ] [S] 3.7.2: Implement `createAnthropicClient()` function
- [ ] [S] 3.7.3: Implement `callLLM()` function with retry logic
- [ ] [S] 3.7.4: Implement exponential backoff helper
- [ ] [S] 3.7.5: Implement `validateLLMResponse()` function
- [ ] [S] 3.7.6: Implement `parseJSONResponse()` function (handles LLM JSON output)

### 3.8 Constants

- [ ] [S] 3.8.1: Create `src/utils/constants.ts` file
- [ ] [S] 3.8.2: Define `PROJECT_STATUSES` array
- [ ] [S] 3.8.3: Define `GRANT_TYPES` array
- [ ] [S] 3.8.4: Define `ETHICS_PATHWAYS` object
- [ ] [S] 3.8.5: Define `DESIGN_MATRIX` object (from spec section 3.4.3)
- [ ] [S] 3.8.6: Define `REPORTING_GUIDELINES` object
- [ ] [S] 3.8.7: Define `WORD_LIMITS` object
- [ ] [S] 3.8.8: Define `VALIDATION_RULES` object

### 3.9 Utilities Index

- [ ] [S] 3.9.1: Create `src/utils/index.ts` file
- [ ] [S] 3.9.2: Re-export all utility modules

### 3.10 Webhook Handler

- [ ] [S] 3.10.1: Create `src/workflows/handlers/webhook.ts` file
- [ ] [S] 3.10.2: Implement intake webhook handler
- [ ] [S] 3.10.3: Implement checkpoint approval handler
- [ ] [S] 3.10.4: Implement request validation middleware

### 3.11 Checkpoint Management

- [ ] [S] 3.11.1: Create `src/workflows/checkpoints.ts` file
- [ ] [S] 3.11.2: Implement `createCheckpoint()` function
- [ ] [S] 3.11.3: Implement `approveCheckpoint()` function
- [ ] [S] 3.11.4: Implement `rejectCheckpoint()` function
- [ ] [S] 3.11.5: Implement `getCheckpointStatus()` function
- [ ] [S] 3.11.6: Define checkpoint webhooks for each stage

### 3.12 Workflow Configuration

- [ ] [S] 3.12.1: Create `src/workflows/config.ts` file
- [ ] [S] 3.12.2: Define workflow IDs mapping
- [ ] [S] 3.12.3: Define stage execution order
- [ ] [S] 3.12.4: Define checkpoint suffixes
- [ ] [S] 3.12.5: Define timeout configurations

### 3.13 Sub-Workflow Stubs

- [ ] [P] 3.13.1: Create `src/workflows/intake-workflow.json` stub
- [ ] [P] 3.13.2: Create `src/workflows/research-workflow.json` stub
- [ ] [P] 3.13.3: Create `src/workflows/methods-workflow.json` stub
- [ ] [P] 3.13.4: Create `src/workflows/ethics-workflow.json` stub
- [ ] [P] 3.13.5: Create `src/workflows/documents-workflow.json` stub

### 3.14 Workflows Index

- [ ] [S] 3.14.1: Create `src/workflows/index.ts` file
- [ ] [S] 3.14.2: Export workflow loading functions
- [ ] [S] 3.14.3: Export workflow configuration

### 3.15 Main Entry Point

- [ ] [S] 3.15.1: Create `src/index.ts` file
- [ ] [S] 3.15.2: Import and initialize database connection
- [ ] [S] 3.15.3: Export main pipeline functions
- [ ] [S] 3.15.4: Add graceful shutdown handler

### 3.16 Test Configuration

- [ ] [P] 3.16.1: Create `vitest.config.ts` file
- [ ] [S] 3.16.2: Configure test environment
- [ ] [S] 3.16.3: Configure coverage reporting
- [ ] [S] 3.16.4: Configure test file patterns

### 3.17 Initial Tests

- [ ] [P] 3.17.1: Create `tests/utils/validation.test.ts` file
- [ ] [S] 3.17.2: Add tests for intake validation
- [ ] [P] 3.17.3: Create `tests/utils/state.test.ts` file
- [ ] [S] 3.17.4: Add tests for status transitions
- [ ] [P] 3.17.5: Create `tests/db/projects.test.ts` file
- [ ] [S] 3.17.6: Add tests for project CRUD operations

---

## PHASE 4: Stage 1 - Intake Agent

**Dependencies:** Phase 3 (Core Infrastructure)
**Estimated Parallelization:** 24 tasks can run in parallel

### 4.1 Webhook Handler Infrastructure

- [ ] [S] 4.1.1: Create n8n webhook trigger node with POST endpoint path `/qi-research-intake`
- [ ] [S] 4.1.2: Configure webhook response mode to `responseNode` for async processing
- [ ] [P] 4.1.3: Define webhook authentication mechanism (API key or OAuth)
- [ ] [P] 4.1.4: Configure webhook URL environment variable `WEBHOOK_URL`

### 4.2 Input Validation Module

- [ ] [S] 4.2.1: Create validation schema for `project_title` field (string, required)
- [ ] [P] 4.2.2: Create validation schema for `project_type` enum (`QI`, `RESEARCH`, `HYBRID`)
- [ ] [P] 4.2.3: Create validation schema for `concept_description` field (500-2000 chars)
- [ ] [P] 4.2.4: Create validation schema for `clinical_problem` field (required text)
- [ ] [P] 4.2.5: Create validation schema for `target_population` field (required text)
- [ ] [P] 4.2.6: Create validation schema for `setting` field (required text)
- [ ] [S] 4.2.7: Create validation schema for `principal_investigator` object (name, role, institution)
- [ ] [P] 4.2.8: Create validation schema for `co_investigators` array (optional)
- [ ] [P] 4.2.9: Create validation schema for `intended_outcomes` field (required text)
- [ ] [P] 4.2.10: Create validation schema for `grant_target` enum
- [ ] [P] 4.2.11: Create validation schema for `timeline_constraint` object (optional)
- [ ] [S] 4.2.12: Implement field validation function `validateRequiredFields()`
- [ ] [S] 4.2.13: Create validation error response formatter with field-level error messages

### 4.3 Project Classification Module

- [ ] [S] 4.3.1: Create LLM prompt template for QI vs Research classification
- [ ] [S] 4.3.2: Implement `classifyProjectType()` function calling Claude API
- [ ] [S] 4.3.3: Define classification confidence threshold (0.8 minimum per spec)
- [ ] [P] 4.3.4: Create classification response parser for JSON output
- [ ] [P] 4.3.5: Implement classification confidence scoring logic
- [ ] [P] 4.3.6: Add suggested study designs to classification output
- [ ] [S] 4.3.7: Create fallback handling for low-confidence classifications

### 4.4 Framework Determination Module

- [ ] [S] 4.4.1: Create `determineFrameworks()` function skeleton
- [ ] [P] 4.4.2: Implement QI framework mapping (PDSA, IHI_MODEL, LEAN_SIX_SIGMA, PRE_POST)
- [ ] [P] 4.4.3: Implement Research framework mapping (CONSORT, STROBE, PRISMA, etc.)
- [ ] [S] 4.4.4: Map project type to applicable reporting guideline from `DESIGN_MATRIX`
- [ ] [S] 4.4.5: Map project type to ethics framework requirements
- [ ] [S] 4.4.6: Map project setting to governance requirements
- [ ] [P] 4.4.7: Map grant target to additional framework requirements

### 4.5 Project Record Creation

- [ ] [S] 4.5.1: Implement UUID generator function `generateProjectId()`
- [ ] [S] 4.5.2: Create project record structure matching TypeScript interface
- [ ] [P] 4.5.3: Set initial project status to `INTAKE_COMPLETE`
- [ ] [P] 4.5.4: Initialize audit log with `PROJECT_CREATED` action
- [ ] [P] 4.5.5: Initialize checkpoints object with all flags set to `false`
- [ ] [S] 4.5.6: Create ISO timestamp generator for `created_at` field

### 4.6 Database Operations

- [ ] [S] 4.6.1: Create PostgreSQL connection configuration for n8n
- [ ] [S] 4.6.2: Implement `storeProject()` function for INSERT into `projects` table
- [ ] [P] 4.6.3: Implement audit log INSERT for project creation
- [ ] [S] 4.6.4: Create database error handling with retry logic

### 4.7 Notification System

- [ ] [S] 4.7.1: Create email template for `INTAKE_COMPLETE` notification
- [ ] [S] 4.7.2: Implement `notifyUser()` function with SMTP integration
- [ ] [P] 4.7.3: Configure SMTP environment variables (HOST, PORT, USER, PASSWORD)
- [ ] [P] 4.7.4: Create notification queue for failed email retries

### 4.8 Research Brief Generation

- [ ] [S] 4.8.1: Create research brief Markdown template
- [ ] [S] 4.8.2: Implement research brief generator from intake data
- [ ] [S] 4.8.3: Include classification results in research brief
- [ ] [S] 4.8.4: Include framework requirements in research brief

### 4.9 Checkpoint Handler

- [ ] [S] 4.9.1: Create n8n Wait node with webhook suffix `intake-approved`
- [ ] [S] 4.9.2: Implement checkpoint approval webhook handler
- [ ] [P] 4.9.3: Create checkpoint rejection webhook handler with feedback routing
- [ ] [S] 4.9.4: Update project status to `INTAKE_APPROVED` on checkpoint pass
- [ ] [P] 4.9.5: Create checkpoint UI notification email template

### 4.10 Integration Tests for Intake

- [ ] [P] 4.10.1: Create test case for QI project classification
- [ ] [P] 4.10.2: Create test case for Research project classification
- [ ] [P] 4.10.3: Create test case for Hybrid project classification
- [ ] [P] 4.10.4: Create test case for validation error handling
- [ ] [S] 4.10.5: Create integration test for full intake workflow

---

## PHASE 5: Stage 2 - Research Agent

**Dependencies:** Phase 4 (Intake Agent)
**Estimated Parallelization:** 36 tasks can run in parallel

### 5.1 Search Strategy Generation

- [ ] [S] 5.1.1: Create LLM prompt template for search strategy generation
- [ ] [S] 5.1.2: Implement `generateSearchStrategy()` function
- [ ] [P] 5.1.3: Parse clinical problem into PICO components
- [ ] [P] 5.1.4: Generate MeSH terms list from clinical problem
- [ ] [P] 5.1.5: Generate keyword list from clinical problem
- [ ] [S] 5.1.6: Build PubMed query string with Boolean operators
- [ ] [S] 5.1.7: Build Semantic Scholar query string
- [ ] [S] 5.1.8: Build Cochrane query string
- [ ] [P] 5.1.9: Define date range parameters (default: last 10 years)
- [ ] [P] 5.1.10: Store search date timestamp

### 5.2 PubMed API Integration

- [ ] [S] 5.2.1: Create PubMed eSearch HTTP request node (esearch.fcgi)
- [ ] [S] 5.2.2: Configure query parameters: db=pubmed, retmax=100, retmode=json
- [ ] [S] 5.2.3: Parse eSearch response for PMID list
- [ ] [S] 5.2.4: Create PubMed eFetch HTTP request node (efetch.fcgi)
- [ ] [S] 5.2.5: Configure eFetch parameters: rettype=abstract, retmode=xml
- [ ] [S] 5.2.6: Implement XML parser for PubMed abstract response
- [ ] [P] 5.2.7: Implement rate limiting (max 3 requests/second per NCBI policy)
- [ ] [P] 5.2.8: Add NCBI API key configuration for increased rate limits

### 5.3 Semantic Scholar API Integration

- [ ] [S] 5.3.1: Create Semantic Scholar search HTTP request node
- [ ] [S] 5.3.2: Configure API endpoint and authentication headers
- [ ] [S] 5.3.3: Parse search response for paper IDs
- [ ] [S] 5.3.4: Implement batch paper details retrieval
- [ ] [P] 5.3.5: Extract citation count for relevance scoring
- [ ] [P] 5.3.6: Extract related papers for snowball search

### 5.4 Cochrane API Integration

- [ ] [S] 5.4.1: Create Cochrane Library search HTTP request node
- [ ] [S] 5.4.2: Configure search parameters for systematic reviews
- [ ] [S] 5.4.3: Parse Cochrane response format
- [ ] [P] 5.4.4: Extract review abstracts

### 5.5 Search Execution Orchestration

- [ ] [S] 5.5.1: Implement parallel search execution with `Promise.all()`
- [ ] [S] 5.5.2: Create search results aggregator function
- [ ] [P] 5.5.3: Implement search timeout handling (60 second max)
- [ ] [P] 5.5.4: Create search error recovery logic

### 5.6 Result Deduplication

- [ ] [S] 5.6.1: Implement DOI-based deduplication
- [ ] [S] 5.6.2: Implement PMID-based deduplication
- [ ] [S] 5.6.3: Implement title similarity matching for fuzzy deduplication
- [ ] [S] 5.6.4: Create unified paper record from multiple sources

### 5.7 Relevance Ranking

- [ ] [S] 5.7.1: Create LLM prompt for article relevance scoring
- [ ] [S] 5.7.2: Implement `rankAndDeduplicateResults()` function
- [ ] [S] 5.7.3: Define relevance score scale (0.0 - 1.0)
- [ ] [P] 5.7.4: Add recency weighting to relevance score
- [ ] [P] 5.7.5: Add citation count weighting to relevance score
- [ ] [S] 5.7.6: Sort results by composite relevance score

### 5.8 Article Processing

- [ ] [S] 5.8.1: Create `processArticle()` function skeleton
- [ ] [S] 5.8.2: Create LLM prompt for key findings extraction
- [ ] [S] 5.8.3: Create LLM prompt for methodology notes extraction
- [ ] [S] 5.8.4: Create LLM prompt for limitations extraction
- [ ] [S] 5.8.5: Implement `ProcessedArticle` object builder
- [ ] [P] 5.8.6: Determine full text availability flag
- [ ] [S] 5.8.7: Categorize articles into primary (>0.7) vs secondary (>0.4)

### 5.9 Evidence Synthesis

- [ ] [S] 5.9.1: Create LLM prompt template for evidence synthesis
- [ ] [S] 5.9.2: Implement `synthesizeEvidence()` function
- [ ] [P] 5.9.3: Structure synthesis as: Overview, Key Findings, Methods, Gaps
- [ ] [P] 5.9.4: Enforce 1500 word maximum for synthesis
- [ ] [S] 5.9.5: Ensure flowing prose paragraphs (not bullet points)

### 5.10 Gap Analysis

- [ ] [S] 5.10.1: Create LLM prompt template for gap identification
- [ ] [S] 5.10.2: Implement `analyzeGaps()` function
- [ ] [P] 5.10.3: Cross-reference gaps with project concept description
- [ ] [P] 5.10.4: Categorize gaps by type (knowledge, methodology, population)
- [ ] [S] 5.10.5: Create `GapAnalysis` output structure

### 5.11 Citation Formatting

- [ ] [S] 5.11.1: Implement `formatVancouverCitation()` function
- [ ] [S] 5.11.2: Implement `formatAuthors()` for Vancouver style (6+ = et al.)
- [ ] [P] 5.11.3: Implement journal name abbreviation lookup
- [ ] [S] 5.11.4: Create `formatCitations()` batch processor
- [ ] [P] 5.11.5: Generate numbered citation list
- [ ] [P] 5.11.6: Create BibTeX export function
- [ ] [P] 5.11.7: Create JSON citation export function

### 5.12 Database Storage for Research Results

- [ ] [S] 5.12.1: Implement project UPDATE for research results
- [ ] [S] 5.12.2: Insert records into `references` table
- [ ] [P] 5.12.3: Store relevance scores with references
- [ ] [S] 5.12.4: Update project status to `RESEARCH_COMPLETE`
- [ ] [P] 5.12.5: Create audit log entry for research completion

### 5.13 Output Generation

- [ ] [P] 5.13.1: Generate `search_strategy` JSON output
- [ ] [P] 5.13.2: Generate `literature_summary` Markdown (2-3 pages)
- [ ] [P] 5.13.3: Generate `gap_analysis` JSON/Markdown output
- [ ] [P] 5.13.4: Generate `evidence_table` JSON output
- [ ] [P] 5.13.5: Generate `reference_library` in BibTeX/JSON
- [ ] [S] 5.13.6: Generate `background_draft` Markdown for protocol

### 5.14 Checkpoint Handler for Research

- [ ] [S] 5.14.1: Create n8n Wait node with webhook suffix `research-approved`
- [ ] [S] 5.14.2: Implement checkpoint approval handler
- [ ] [P] 5.14.3: Implement checkpoint rejection handler with feedback routing
- [ ] [S] 5.14.4: Update project status to `RESEARCH_APPROVED` on pass
- [ ] [P] 5.14.5: Allow user to add missed literature via checkpoint
- [ ] [P] 5.14.6: Create checkpoint email notification for research review

### 5.15 n8n Workflow Configuration

- [ ] [S] 5.15.1: Create Research Stage sub-workflow trigger node
- [ ] [S] 5.15.2: Wire Generate Search Strategy node with LangChain agent
- [ ] [S] 5.15.3: Wire Search PubMed HTTP request node
- [ ] [S] 5.15.4: Wire Fetch Abstracts HTTP request node
- [ ] [S] 5.15.5: Wire Process and Rank Articles LangChain agent node
- [ ] [S] 5.15.6: Wire Synthesise Evidence LangChain agent node
- [ ] [S] 5.15.7: Wire Identify Gaps LangChain agent node
- [ ] [S] 5.15.8: Wire Format Citations function node
- [ ] [S] 5.15.9: Wire Update Project Record Postgres node
- [ ] [S] 5.15.10: Wire Send Review Notification email node

### 5.16 Integration Tests for Research

- [ ] [P] 5.16.1: Create test for valid PubMed search query generation
- [ ] [P] 5.16.2: Create test for MeSH term extraction
- [ ] [P] 5.16.3: Create test for deduplication logic
- [ ] [P] 5.16.4: Create test for relevance scoring
- [ ] [P] 5.16.5: Create test for Vancouver citation formatting
- [ ] [S] 5.16.6: Create integration test for full research workflow

---

## PHASE 6: Stage 3 - Methods Agent

**Dependencies:** Phase 5 (Research Agent)
**Estimated Parallelization:** 3 groups can run in parallel (6.3/6.4/6.5)

### 6.1 Core Infrastructure

- [ ] [S] 6.1.1: Create Methods Agent n8n sub-workflow scaffold (executeWorkflowTrigger)
- [ ] [S] 6.1.2: Define Methods Agent input schema validation
- [ ] [S] 6.1.3: Define Methodology output schema (JSON structure)
- [ ] [S] 6.1.4: Create database migration for methodology JSONB column storage
- [ ] [S] 6.1.5: Implement Methods Agent error handling wrapper with retry logic

### 6.2 Study Design Selection

- [ ] [S] 6.2.1: Implement DESIGN_MATRIX constant (spec lines 426-467)
- [ ] [S] 6.2.2: Create QI design options array (PDSA_CYCLE, IHI_MODEL, etc.)
- [ ] [S] 6.2.3: Create interventional randomised design options (RCT, CLUSTER_RCT, etc.)
- [ ] [S] 6.2.4: Create interventional non-randomised design options
- [ ] [S] 6.2.5: Create observational design options (COHORT, CASE_CONTROL, etc.)
- [ ] [S] 6.2.6: Create qualitative design options (THEMATIC, GROUNDED_THEORY, etc.)
- [ ] [S] 6.2.7: Create mixed_methods design options
- [ ] [S] 6.2.8: Create systematic_review design options
- [ ] [S] 6.2.9: Implement reporting guideline mapping per design type
- [ ] [S] 6.2.10: Create determineStudyDesign LLM prompt template
- [ ] [S] 6.2.11: Implement design selection decision logic function
- [ ] [S] 6.2.12: Create study design justification generator

### 6.3 Participant Criteria Definition (Parallelizable with 6.4, 6.5)

- [ ] [P] 6.3.1: Define ParticipantSpec TypeScript interface
- [ ] [P] 6.3.2: Define Criterion TypeScript interface for inclusion/exclusion
- [ ] [P] 6.3.3: Create defineParticipantCriteria LLM prompt template
- [ ] [P] 6.3.4: Implement inclusion criteria generator function
- [ ] [P] 6.3.5: Implement exclusion criteria generator function
- [ ] [P] 6.3.6: Create recruitment_strategy structure definition
- [ ] [P] 6.3.7: Implement feasibility_justification generator
- [ ] [P] 6.3.8: Create capacity_issues assessment logic
- [ ] [P] 6.3.9: Create vulnerable_population detection logic

### 6.4 Sample Size Calculation (Parallelizable with 6.3, 6.5)

- [ ] [P] 6.4.1: Implement requires_sample_size check per study design
- [ ] [P] 6.4.2: Create estimateEffectSize function from evidence synthesis
- [ ] [P] 6.4.3: Implement sample size calculation for continuous outcomes
- [ ] [P] 6.4.4: Implement sample size calculation for binary outcomes
- [ ] [P] 6.4.5: Implement sample size calculation for survival outcomes
- [ ] [P] 6.4.6: Create attrition rate estimation logic
- [ ] [P] 6.4.7: Implement sample size justification text generator
- [ ] [P] 6.4.8: Create sample_size output structure

### 6.5 Outcome Definition (Parallelizable with 6.3, 6.4)

- [ ] [P] 6.5.1: Define OutcomeSpec TypeScript interface
- [ ] [P] 6.5.2: Create determineReportingGuideline function
- [ ] [P] 6.5.3: Create defineOutcomes LLM prompt template
- [ ] [P] 6.5.4: Implement primary outcome generator (single outcome constraint)
- [ ] [P] 6.5.5: Implement secondary outcomes generator (array of outcomes)
- [ ] [P] 6.5.6: Create measurement_tool suggestion logic
- [ ] [P] 6.5.7: Create measurement_timing definition logic
- [ ] [P] 6.5.8: Implement clinically_meaningful_difference estimator

### 6.6 Procedure Design

- [ ] [S] 6.6.1: Define ProcedureSpec TypeScript interface
- [ ] [S] 6.6.2: Create designProcedures LLM prompt template
- [ ] [S] 6.6.3: Implement step-by-step protocol generator
- [ ] [S] 6.6.4: Create intervention description generator (if interventional)
- [ ] [S] 6.6.5: Implement control/comparator description generator
- [ ] [S] 6.6.6: Create blinding specification logic
- [ ] [S] 6.6.7: Implement quality assurance measures generator

### 6.7 Data Collection Planning

- [ ] [S] 6.7.1: Define DataCollectionSpec TypeScript interface
- [ ] [S] 6.7.2: Create planDataCollection LLM prompt template
- [ ] [S] 6.7.3: Implement data_types enumeration logic
- [ ] [S] 6.7.4: Create includes_identifiable_data flag determination
- [ ] [S] 6.7.5: Implement data collection instrument list generator
- [ ] [S] 6.7.6: Create data collection timeline mapping
- [ ] [S] 6.7.7: Implement missing data handling plan generator

### 6.8 Analysis Plan Development

- [ ] [S] 6.8.1: Define AnalysisPlan TypeScript interface
- [ ] [S] 6.8.2: Create developAnalysisPlan LLM prompt template
- [ ] [S] 6.8.3: Implement primary analysis method selector
- [ ] [S] 6.8.4: Implement secondary analysis methods generator
- [ ] [S] 6.8.5: Create sensitivity analyses planner
- [ ] [S] 6.8.6: Implement subgroup analyses planner
- [ ] [S] 6.8.7: Create missing data handling strategy selector
- [ ] [S] 6.8.8: Implement statistical software specification

### 6.9 Timeline Generation

- [ ] [S] 6.9.1: Define ProjectTimeline TypeScript interface
- [ ] [S] 6.9.2: Create generateTimeline function
- [ ] [S] 6.9.3: Implement estimateRecruitmentPeriod function
- [ ] [S] 6.9.4: Create milestone definition generator
- [ ] [S] 6.9.5: Implement Gantt chart data structure generator
- [ ] [S] 6.9.6: Create grant_deadline alignment logic
- [ ] [S] 6.9.7: Implement total_duration calculator

### 6.10 Output Assembly

- [ ] [S] 6.10.1: Create methodology_summary Markdown generator
- [ ] [S] 6.10.2: Create study_design_rationale Markdown generator
- [ ] [S] 6.10.3: Create participant_specification JSON formatter
- [ ] [S] 6.10.4: Create outcome_definitions JSON formatter
- [ ] [S] 6.10.5: Create analysis_plan Markdown generator
- [ ] [S] 6.10.6: Create project_timeline JSON/Gantt formatter
- [ ] [S] 6.10.7: Create methods_draft Markdown generator (for protocol)
- [ ] [S] 6.10.8: Implement database update for methodology field
- [ ] [S] 6.10.9: Implement status transition to METHODOLOGY_COMPLETE
- [ ] [S] 6.10.10: Create checkpoint notification trigger for user review

---

## PHASE 7: Stage 4 - Ethics Agent

**Dependencies:** Phase 6 (Methods Agent)
**Estimated Parallelization:** 1 group can run in parallel (7.3/7.4/7.5)

### 7.1 Core Infrastructure

- [ ] [S] 7.1.1: Create Ethics Agent n8n sub-workflow scaffold (executeWorkflowTrigger)
- [ ] [S] 7.1.2: Define Ethics Agent input schema validation
- [ ] [S] 7.1.3: Define ethics_evaluation output schema
- [ ] [S] 7.1.4: Create database migration for ethics JSONB column storage
- [ ] [S] 7.1.5: Implement Ethics Agent error handling wrapper with retry logic

### 7.2 Ethics Pathway Determination

- [ ] [S] 7.2.1: Define EthicsPathway TypeScript interface
- [ ] [S] 7.2.2: Implement QI_REGISTRATION pathway logic
- [ ] [S] 7.2.3: Implement LOW_RISK_RESEARCH pathway logic
- [ ] [S] 7.2.4: Implement FULL_HREC_REVIEW pathway logic
- [ ] [S] 7.2.5: Implement HYBRID_REVIEW pathway logic
- [ ] [S] 7.2.6: Create assessIfLowRisk function
- [ ] [S] 7.2.7: Implement approval_body determination per pathway
- [ ] [S] 7.2.8: Create requires_hrec flag logic
- [ ] [S] 7.2.9: Create requires_rgo flag logic
- [ ] [S] 7.2.10: Implement estimated_timeline calculator per pathway
- [ ] [S] 7.2.11: Create forms array generator per pathway

### 7.3 Risk Assessment (Parallelizable with 7.4, 7.5)

- [ ] [P] 7.3.1: Define RiskAssessment TypeScript interface
- [ ] [P] 7.3.2: Create assessVulnerability function for participant vulnerability
- [ ] [P] 7.3.3: Create assessInterventionRisk function for intervention invasiveness
- [ ] [P] 7.3.4: Create assessDataSensitivity function for data sensitivity
- [ ] [P] 7.3.5: Implement risk level classification (NEGLIGIBLE, LOW, MODERATE, HIGH)
- [ ] [P] 7.3.6: Create risk factors array generator with category/level/mitigation
- [ ] [P] 7.3.7: Implement overall_justification text generator
- [ ] [P] 7.3.8: Create national_statement_reference linker

### 7.4 Consent Requirements (Parallelizable with 7.3, 7.5)

- [ ] [P] 7.4.1: Define ConsentSpec TypeScript interface
- [ ] [P] 7.4.2: Create determineConsentRequirements function
- [ ] [P] 7.4.3: Implement consent type selector (full written, verbal, waiver)
- [ ] [P] 7.4.4: Create evaluateWaiverEligibility function
- [ ] [P] 7.4.5: Implement capacity assessment requirements logic
- [ ] [P] 7.4.6: Create third-party consent requirements logic
- [ ] [P] 7.4.7: Implement consent documentation requirements generator
- [ ] [P] 7.4.8: Create opt-out vs opt-in determination logic

### 7.5 Data Governance Planning (Parallelizable with 7.3, 7.4)

- [ ] [P] 7.5.1: Define DataGovernanceSpec TypeScript interface
- [ ] [P] 7.5.2: Create planDataGovernance function
- [ ] [P] 7.5.3: Implement data_types classification from data_collection
- [ ] [P] 7.5.4: Create getStorageRequirements function (encryption, access controls)
- [ ] [P] 7.5.5: Implement calculateRetentionPeriod function per study design
- [ ] [P] 7.5.6: Create determineDisposalMethod function
- [ ] [P] 7.5.7: Implement data transfer requirements logic (if multi-site)
- [ ] [P] 7.5.8: Create data breach response plan generator
- [ ] [P] 7.5.9: Implement Privacy Act 1988 compliance checker
- [ ] [P] 7.5.10: Implement Information Privacy Act 2009 QLD compliance checker

### 7.6 Site Requirements

- [ ] [S] 7.6.1: Define SiteRequirement TypeScript interface
- [ ] [S] 7.6.2: Create identifySiteRequirements function
- [ ] [S] 7.6.3: Implement single-site requirements generator
- [ ] [S] 7.6.4: Implement multi-site requirements generator
- [ ] [S] 7.6.5: Create site-specific governance documentation list
- [ ] [S] 7.6.6: Implement site assessment form requirements logic
- [ ] [S] 7.6.7: Create investigator agreement requirements logic

### 7.7 Governance Checklist Generation

- [ ] [S] 7.7.1: Define ChecklistItem TypeScript interface
- [ ] [S] 7.7.2: Create generateGovernanceChecklist function
- [ ] [S] 7.7.3: Implement NHMRC_NATIONAL_STATEMENT requirements mapper
- [ ] [S] 7.7.4: Implement QH_RESEARCH_GOVERNANCE requirements mapper
- [ ] [S] 7.7.5: Implement MN_CLINICAL_GOVERNANCE_POLICY requirements mapper
- [ ] [S] 7.7.6: Implement PRIVACY_ACT_1988 requirements mapper
- [ ] [S] 7.7.7: Implement INFORMATION_PRIVACY_ACT_2009_QLD requirements mapper
- [ ] [S] 7.7.8: Create checklist status tracking (NOT_STARTED, IN_PROGRESS, COMPLETE)
- [ ] [S] 7.7.9: Implement checklist item dependency resolution

### 7.8 Output Assembly

- [ ] [S] 7.8.1: Create ethics_pathway JSON formatter
- [ ] [S] 7.8.2: Create risk_assessment JSON/Markdown formatter
- [ ] [S] 7.8.3: Create consent_specification JSON formatter
- [ ] [S] 7.8.4: Create data_management_plan Markdown generator (full DMP document)
- [ ] [S] 7.8.5: Create governance_checklist JSON formatter
- [ ] [S] 7.8.6: Create ethics_considerations_draft Markdown generator (for protocol)
- [ ] [S] 7.8.7: Implement database update for ethics field
- [ ] [S] 7.8.8: Implement status transition to ETHICS_COMPLETE
- [ ] [S] 7.8.9: Create checkpoint notification trigger for user review

---

## PHASE 8: Stage 5 - Document Generation Agent

**Dependencies:** Phase 7 (Ethics Agent)
**Estimated Parallelization:** 14 tasks can run in parallel

### 8.1 Document Engine Core

- [ ] [P] 8.1.1: Create DocumentGenerator base class with template loading interface
- [ ] [P] 8.1.2: Implement template repository file structure
- [ ] [P] 8.1.3: Create document metadata schema (version, generated_at, project_id)
- [ ] [S] 8.1.4: Implement loadTemplate() method with DOCX binary file reading
- [ ] [S] 8.1.5: Implement getDocumentStyles() method returning Arial 12pt default styles
- [ ] [S] 8.1.6: Implement getPageProperties() method for A4 page with 1440 DXA margins

### 8.2 Section Building Components

- [ ] [P] 8.2.1: Implement buildTitlePage() method
- [ ] [P] 8.2.2: Implement buildVersionHistory() method with initial version table
- [ ] [P] 8.2.3: Implement buildSection() method converting markdown to Paragraph elements
- [ ] [P] 8.2.4: Implement buildSynopsis() method creating TableRow/TableCell structure
- [ ] [P] 8.2.5: Implement buildReferences() method generating reference list section

### 8.3 Protocol Document Generation

- [ ] [S] 8.3.1: Implement PROTOCOL_CONTENT_MAP mapping source fields to template sections
- [ ] [S] 8.3.2: Create generateIntroduction() method with 250 word limit
- [ ] [S] 8.3.3: Create formatAimsObjectives() method
- [ ] [S] 8.3.4: Create generateMethods() method with 2000 word limit
- [ ] [S] 8.3.5: Create formatParticipants() method formatting inclusion/exclusion criteria
- [ ] [S] 8.3.6: Create formatOutcomes() method formatting primary/secondary outcomes
- [ ] [S] 8.3.7: Create formatEthics() method formatting ethics evaluation data
- [ ] [S] 8.3.8: Create generateDissemination() method with 250 word limit
- [ ] [S] 8.3.9: Integrate all sections into generateProtocol() orchestration method

### 8.4 EMF Grant Application Generation

- [ ] [P] 8.4.1: Create EMF_APPLICATION_MAP with all A1-G section mappings
- [ ] [S] 8.4.2: Implement A4_plain_language_summary generator (250 words)
- [ ] [S] 8.4.3: Implement A5_scientific_abstract generator (450 words)
- [ ] [S] 8.4.4: Implement A6_em_relevance generator (100 words)
- [ ] [S] 8.4.5: Implement A7_research_themes checkbox selection logic
- [ ] [S] 8.4.6: Implement B1_background_rationale generator (1500 words)
- [ ] [S] 8.4.7: Implement B2_aims_objectives generator (300 words)
- [ ] [S] 8.4.8: Implement B3_design_methods generator (2000 words)
- [ ] [S] 8.4.9: Implement B4_innovation_impact generator (750 words)
- [ ] [S] 8.4.10: Implement B5_translation_plan generator (400 words)
- [ ] [S] 8.4.11: Implement C1_ethics_status mapper
- [ ] [S] 8.4.12: Implement C2_indigenous_relevance assessment generator
- [ ] [S] 8.4.13: Implement D_health_economics conditional section
- [ ] [S] 8.4.14: Implement E_budget calculation section
- [ ] [S] 8.4.15: Implement F_principal_investigator section with CV placeholder
- [ ] [S] 8.4.16: Implement G_research_team section formatter
- [ ] [S] 8.4.17: Create generateEMFApplication() orchestration method

### 8.5 HREC Cover Letter Generation

- [ ] [S] 8.5.1: Create HREC cover letter content mapping schema
- [ ] [S] 8.5.2: Implement project summary paragraph generator
- [ ] [S] 8.5.3: Implement ethics pathway justification paragraph generator
- [ ] [S] 8.5.4: Implement risk level explanation paragraph generator
- [ ] [S] 8.5.5: Implement attachments listing generator
- [ ] [S] 8.5.6: Create generateHRECCoverLetter() orchestration method

### 8.6 PICF Generation

- [ ] [S] 8.6.1: Create PICF template content mapping schema
- [ ] [S] 8.6.2: Implement plain language study description generator
- [ ] [S] 8.6.3: Implement "What you will be asked to do" section generator
- [ ] [S] 8.6.4: Implement risks/benefits section generator
- [ ] [S] 8.6.5: Implement privacy/confidentiality section generator
- [ ] [S] 8.6.6: Implement voluntary participation statement generator
- [ ] [S] 8.6.7: Implement contact information section generator
- [ ] [S] 8.6.8: Implement consent signature block generator
- [ ] [S] 8.6.9: Create generatePICF() orchestration method

### 8.7 Data Management Plan Generation

- [ ] [S] 8.7.1: Create DMP template content mapping schema
- [ ] [S] 8.7.2: Implement data types description generator
- [ ] [S] 8.7.3: Implement storage requirements section generator
- [ ] [S] 8.7.4: Implement retention period section generator
- [ ] [S] 8.7.5: Implement disposal method section generator
- [ ] [S] 8.7.6: Implement data sharing/access section generator
- [ ] [S] 8.7.7: Create generateDataManagementPlan() orchestration method

### 8.8 Citation Formatting (Vancouver Style)

- [ ] [P] 8.8.1: Implement formatAuthors() handling 1-6 authors vs "et al"
- [ ] [P] 8.8.2: Implement abbreviateJournal() with medical journal abbreviation lookup
- [ ] [S] 8.8.3: Implement formatVancouverCitation() combining all fields
- [ ] [S] 8.8.4: Create formatCitationList() generating numbered reference list
- [ ] [S] 8.8.5: Implement inline citation number insertion into document text

### 8.9 Document Determination Logic

- [ ] [S] 8.9.1: Implement determineRequiredDocuments() based on ethics_pathway
- [ ] [S] 8.9.2: Create document type to generator function mapping
- [ ] [S] 8.9.3: Implement conditional document inclusion logic

### 8.10 Submission Package Creation

- [ ] [S] 8.10.1: Implement generateFilename() with project_id and document_type
- [ ] [S] 8.10.2: Implement saveDocument() writing DOCX buffer to storage
- [ ] [S] 8.10.3: Implement validateCrossReferences() checking consistency
- [ ] [S] 8.10.4: Implement generateSubmissionChecklist() listing all required documents
- [ ] [S] 8.10.5: Implement calculateTotalPages() for package metadata
- [ ] [S] 8.10.6: Implement ZIP archive creation bundling all generated documents
- [ ] [S] 8.10.7: Create generateDocuments() master orchestration function

---

## PHASE 9: Integration & Testing

**Dependencies:** Phase 8 (Document Agent)
**Estimated Parallelization:** 19 tasks can run in parallel

### 9.1 n8n Workflow Connections

- [ ] [S] 9.1.1: Create Master Workflow JSON with all 5 stage execute-workflow nodes
- [ ] [S] 9.1.2: Configure executeWorkflow node for Intake stage
- [ ] [S] 9.1.3: Configure executeWorkflow node for Research stage
- [ ] [S] 9.1.4: Configure executeWorkflow node for Methodology stage
- [ ] [S] 9.1.5: Configure executeWorkflow node for Ethics stage
- [ ] [S] 9.1.6: Configure executeWorkflow node for Document stage
- [ ] [S] 9.1.7: Implement state passing between workflow stages via $json

### 9.2 Human-in-Loop Checkpoints

- [ ] [P] 9.2.1: Configure Intake checkpoint wait node
- [ ] [P] 9.2.2: Configure Research checkpoint wait node
- [ ] [P] 9.2.3: Configure Methodology checkpoint wait node
- [ ] [P] 9.2.4: Configure Ethics checkpoint wait node
- [ ] [S] 9.2.5: Implement checkpoint approval webhook endpoint handlers
- [ ] [S] 9.2.6: Implement checkpoint rejection webhook endpoint handlers
- [ ] [S] 9.2.7: Create checkpoint status tracking in project.checkpoints object

### 9.3 Notification System (Email)

- [ ] [P] 9.3.1: Create email template for Intake completion notification
- [ ] [P] 9.3.2: Create email template for Research review notification
- [ ] [P] 9.3.3: Create email template for Methodology review notification
- [ ] [P] 9.3.4: Create email template for Ethics review notification
- [ ] [P] 9.3.5: Create email template for Final document review notification
- [ ] [S] 9.3.6: Configure SMTP connection in n8n emailSend nodes
- [ ] [S] 9.3.7: Implement notifyUser() helper function with template selection
- [ ] [S] 9.3.8: Implement email queue for retry on SMTP failures

### 9.4 Audit Logging

- [ ] [S] 9.4.1: Create audit_log table schema per spec
- [ ] [S] 9.4.2: Implement logAuditEntry() function
- [ ] [S] 9.4.3: Implement previous_state capture before modifications
- [ ] [S] 9.4.4: Implement new_state capture after modifications
- [ ] [S] 9.4.5: Add audit logging to project creation
- [ ] [S] 9.4.6: Add audit logging to stage transitions
- [ ] [S] 9.4.7: Add audit logging to checkpoint approvals/rejections
- [ ] [S] 9.4.8: Add audit logging to document generation
- [ ] [S] 9.4.9: Add IP address capture to audit entries
- [ ] [S] 9.4.10: Add session identifier capture to audit entries

### 9.5 Error Handling and Recovery

- [ ] [S] 9.5.1: Implement LLM API retry logic with exponential backoff
- [ ] [S] 9.5.2: Implement empty response validation for LLM calls
- [ ] [S] 9.5.3: Implement workflow error catch nodes with notification
- [ ] [S] 9.5.4: Create project status "ERROR" state with error details capture
- [ ] [S] 9.5.5: Implement workflow resume from failed stage capability

### 9.6 Unit Tests

- [ ] [P] 9.6.1: Write unit test for QI project classification
- [ ] [P] 9.6.2: Write unit test for Research project classification
- [ ] [P] 9.6.3: Write unit test for Hybrid project classification
- [ ] [P] 9.6.4: Write unit test for PubMed search query generation
- [ ] [P] 9.6.5: Write unit test for formatVancouverCitation() output format
- [ ] [P] 9.6.6: Write unit test for formatAuthors() with 6 or fewer authors
- [ ] [P] 9.6.7: Write unit test for formatAuthors() with more than 6 authors
- [ ] [P] 9.6.8: Write unit test for word limit validation per section
- [ ] [P] 9.6.9: Write unit test for required section validation
- [ ] [P] 9.6.10: Write unit test for cross-reference consistency check

### 9.7 Integration Tests

- [ ] [S] 9.7.1: Write integration test for Intake stage end-to-end
- [ ] [S] 9.7.2: Write integration test for Research stage with mocked PubMed API
- [ ] [S] 9.7.3: Write integration test for Methodology stage
- [ ] [S] 9.7.4: Write integration test for Ethics stage
- [ ] [S] 9.7.5: Write integration test for Document stage DOCX generation
- [ ] [S] 9.7.6: Write integration test for checkpoint approval flow
- [ ] [S] 9.7.7: Write integration test for checkpoint rejection flow
- [ ] [S] 9.7.8: Write integration test for audit log creation

### 9.8 End-to-End Tests

- [ ] [S] 9.8.1: Write e2e test for complete QI project pipeline
- [ ] [S] 9.8.2: Write e2e test for complete Research project pipeline
- [ ] [S] 9.8.3: Write e2e test verifying generated DOCX is valid
- [ ] [S] 9.8.4: Write e2e test for submission package ZIP integrity
- [ ] [S] 9.8.5: Write e2e test for email notification delivery

### 9.9 Document Validation

- [ ] [P] 9.9.1: Implement VALIDATION_RULES constant for protocol documents
- [ ] [P] 9.9.2: Implement VALIDATION_RULES constant for EMF application documents
- [ ] [S] 9.9.3: Implement validateDocument() function per spec
- [ ] [S] 9.9.4: Implement countWords() utility function
- [ ] [S] 9.9.5: Implement checkCrossReferences() consistency checker

---

## PHASE 10: Deployment

**Dependencies:** Phase 9 (Integration & Testing)
**Estimated Parallelization:** 22 tasks can run in parallel

### 10.1 Docker Configuration

- [ ] [P] 10.1.1: Create Dockerfile for custom n8n with dependencies
- [ ] [P] 10.1.2: Create docker-compose.yml with n8n service
- [ ] [P] 10.1.3: Create docker-compose.yml with postgres service
- [ ] [P] 10.1.4: Create docker-compose.yml with redis service
- [ ] [S] 10.1.5: Configure n8n_data volume mount for workflow persistence
- [ ] [S] 10.1.6: Configure postgres_data volume mount for database persistence
- [ ] [S] 10.1.7: Configure redis_data volume mount for cache persistence
- [ ] [S] 10.1.8: Configure templates volume mount as read-only
- [ ] [S] 10.1.9: Define qi-pipeline bridge network

### 10.2 Environment Configuration

- [ ] [P] 10.2.1: Create .env.template with all required variables
- [ ] [P] 10.2.2: Document N8N_HOST, N8N_PORT, N8N_PROTOCOL, WEBHOOK_URL variables
- [ ] [P] 10.2.3: Document DB_* PostgreSQL connection variables
- [ ] [P] 10.2.4: Document ANTHROPIC_API_KEY variable
- [ ] [P] 10.2.5: Document SMTP_* email configuration variables
- [ ] [P] 10.2.6: Document S3_* storage configuration variables
- [ ] [S] 10.2.7: Create environment variable validation script
- [ ] [S] 10.2.8: Create secrets management documentation

### 10.3 Database Initialization

- [ ] [S] 10.3.1: Create SQL migration script for projects table
- [ ] [S] 10.3.2: Create SQL migration script for audit_log table
- [ ] [S] 10.3.3: Create SQL migration script for documents table
- [ ] [S] 10.3.4: Create SQL migration script for references table
- [ ] [S] 10.3.5: Create SQL migration script for all indexes
- [ ] [S] 10.3.6: Create database initialization entrypoint script

### 10.4 Template Repository Setup

- [ ] [P] 10.4.1: Create /templates/protocols/ directory structure
- [ ] [P] 10.4.2: Create /templates/grants/ directory structure
- [ ] [P] 10.4.3: Create /templates/ethics/ directory structure
- [ ] [P] 10.4.4: Create /templates/governance/ directory structure
- [ ] [P] 10.4.5: Create /templates/common/ directory structure
- [ ] [S] 10.4.6: Add placeholder mnh-protocol-template.docx
- [ ] [S] 10.4.7: Add placeholder mnh-qi-template.docx
- [ ] [S] 10.4.8: Add placeholder emf-application-jumpstart.docx
- [ ] [S] 10.4.9: Add placeholder emf-application-leading-edge.docx
- [ ] [S] 10.4.10: Add placeholder hrec-cover-letter.docx
- [ ] [S] 10.4.11: Add placeholder picf-template.docx
- [ ] [S] 10.4.12: Add placeholder lnr-application.docx

### 10.5 n8n Workflow Import

- [ ] [S] 10.5.1: Export Master Workflow as JSON for version control
- [ ] [S] 10.5.2: Export Research Sub-Workflow as JSON
- [ ] [S] 10.5.3: Export Document Generation Sub-Workflow as JSON
- [ ] [S] 10.5.4: Create workflow import script for fresh deployment
- [ ] [S] 10.5.5: Document workflow activation sequence

### 10.6 Health Checks

- [ ] [P] 10.6.1: Add n8n health check endpoint configuration
- [ ] [P] 10.6.2: Add postgres health check to docker-compose
- [ ] [P] 10.6.3: Add redis health check to docker-compose
- [ ] [S] 10.6.4: Create health check aggregator script

### 10.7 Security Hardening

- [ ] [P] 10.7.1: Configure TLS/HTTPS for n8n webhook endpoints
- [ ] [P] 10.7.2: Implement CORS configuration for API endpoints
- [ ] [S] 10.7.3: Configure database connection encryption (SSL)
- [ ] [S] 10.7.4: Implement API key rotation documentation
- [ ] [S] 10.7.5: Configure file storage encryption at rest
- [ ] [S] 10.7.6: Implement RBAC permission check middleware

### 10.8 Backup and Recovery

- [ ] [P] 10.8.1: Create PostgreSQL backup script (pg_dump)
- [ ] [P] 10.8.2: Create n8n workflow backup script
- [ ] [P] 10.8.3: Create document storage backup script
- [ ] [S] 10.8.4: Document recovery procedures
- [ ] [S] 10.8.5: Create backup scheduling configuration (cron)

### 10.9 Monitoring and Logging

- [ ] [P] 10.9.1: Configure n8n execution logging level
- [ ] [P] 10.9.2: Configure PostgreSQL query logging
- [ ] [S] 10.9.3: Create log aggregation configuration
- [ ] [S] 10.9.4: Document alerting thresholds for failed workflows

### 10.10 Documentation

- [ ] [P] 10.10.1: Create README.md with project overview
- [ ] [P] 10.10.2: Create DEPLOYMENT.md with step-by-step deployment guide
- [ ] [P] 10.10.3: Create CONFIGURATION.md documenting all environment variables
- [ ] [P] 10.10.4: Create API.md documenting webhook endpoints
- [ ] [S] 10.10.5: Create TROUBLESHOOTING.md with common issues
- [ ] [S] 10.10.6: Create OPERATIONS.md with maintenance procedures

---

## Appendix: Dependency Graph

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Database)
    │
    ▼
Phase 3 (Core Infrastructure)
    │
    ▼
Phase 4 (Intake Agent)
    │
    ▼
Phase 5 (Research Agent)
    │
    ▼
Phase 6 (Methods Agent)
    │
    ▼
Phase 7 (Ethics Agent)
    │
    ▼
Phase 8 (Document Agent)
    │
    ▼
Phase 9 (Integration & Testing)
    │
    ▼
Phase 10 (Deployment)
```

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-28 | 1.0 | Initial task list created from specification analysis |

---

*This document is the source of truth for implementation progress. Update task status as work completes.*
