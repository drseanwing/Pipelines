-- ============================================================================
-- QI Research Pipeline - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Creates the complete database schema for the QI/Research
--              Project Development Pipeline application
-- ============================================================================

-- Enable UUID extension for generating unique identifiers
-- This extension provides functions for generating universally unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Purpose: Stores user accounts for access control and authentication.
-- Users can be project owners, principal investigators, co-investigators,
-- or system administrators. Each user has a role that determines their
-- permissions within the system (see RBAC in section 9.2 of spec).
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Authentication fields
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),

    -- Profile information
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100),                    -- e.g., 'Dr', 'Prof', 'Mr', 'Ms'
    institution VARCHAR(500),               -- e.g., 'Metro North Health'
    department VARCHAR(255),                -- e.g., 'Emergency Department'
    phone VARCHAR(50),
    orcid VARCHAR(50),                      -- ORCID identifier for researchers

    -- Role-based access control
    -- Roles: ADMIN, PI (Principal Investigator), CO_INVESTIGATOR, RESEARCH_ADMIN
    role VARCHAR(50) NOT NULL DEFAULT 'PI',

    -- User expertise areas (stored as JSON array)
    expertise JSONB DEFAULT '[]',

    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Soft delete support
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'PI', 'CO_INVESTIGATOR', 'RESEARCH_ADMIN')),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE users IS 'User accounts for access control and project ownership';
COMMENT ON COLUMN users.role IS 'User role for RBAC: ADMIN, PI, CO_INVESTIGATOR, RESEARCH_ADMIN';
COMMENT ON COLUMN users.orcid IS 'Open Researcher and Contributor ID for academic identification';
COMMENT ON COLUMN users.expertise IS 'JSON array of expertise areas for team matching';

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
-- Purpose: Core table storing all QI and research projects throughout
-- their pipeline journey. Uses JSONB columns for flexible stage data storage,
-- allowing the schema to adapt to evolving requirements without migrations.
--
-- The project progresses through stages:
--   DRAFT -> INTAKE_COMPLETE -> INTAKE_APPROVED -> RESEARCH_COMPLETE ->
--   RESEARCH_APPROVED -> METHODOLOGY_COMPLETE -> METHODOLOGY_APPROVED ->
--   ETHICS_COMPLETE -> ETHICS_APPROVED -> DOCUMENTS_COMPLETE ->
--   DOCUMENTS_APPROVED -> SUBMITTED -> COMPLETED/ARCHIVED
-- ============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project status tracking
    -- Reflects current position in the pipeline workflow
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',

    -- Timestamps for lifecycle tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- ========================================================================
    -- STAGE 1: INTAKE DATA
    -- Captures initial project concept and parameters
    -- Required fields: project_title, project_type, concept_description,
    --                 clinical_problem, target_population, setting,
    --                 principal_investigator, intended_outcomes
    -- ========================================================================
    intake JSONB NOT NULL,

    -- ========================================================================
    -- STAGE 1 OUTPUT: CLASSIFICATION
    -- LLM-generated classification of project type (QI/RESEARCH/HYBRID)
    -- with confidence score, reasoning, and suggested study designs
    -- ========================================================================
    classification JSONB,

    -- ========================================================================
    -- STAGE 1 OUTPUT: FRAMEWORKS
    -- Applicable reporting guidelines, ethics frameworks, and governance
    -- requirements based on project classification
    -- ========================================================================
    frameworks JSONB,

    -- ========================================================================
    -- STAGE 2: RESEARCH & LITERATURE REVIEW
    -- Contains search_strategy, primary_literature, secondary_literature,
    -- gap_analysis, evidence_synthesis, and citations
    -- ========================================================================
    research JSONB,

    -- ========================================================================
    -- STAGE 3: METHODOLOGY
    -- Contains study_design, setting_sites, participants, outcomes,
    -- procedures, data_collection, analysis_plan, and timeline
    -- ========================================================================
    methodology JSONB,

    -- ========================================================================
    -- STAGE 4: ETHICS & GOVERNANCE
    -- Contains ethics_pathway, risk_assessment, consent_requirements,
    -- data_governance, site_requirements, and governance_checklist
    -- ========================================================================
    ethics JSONB,

    -- ========================================================================
    -- STAGE 5: DOCUMENTS
    -- Contains generated document list, pending reviews, and metadata
    -- about the submission package
    -- ========================================================================
    documents JSONB,

    -- ========================================================================
    -- CHECKPOINT TRACKING
    -- Tracks user approval at each stage checkpoint
    -- Fields: intake_approved, research_approved, methodology_approved,
    --         ethics_approved, documents_approved
    -- ========================================================================
    checkpoints JSONB DEFAULT '{}',

    -- Project ownership
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Soft delete support for data retention compliance
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Status validation constraint
    CONSTRAINT projects_status_check CHECK (status IN (
        'DRAFT',
        'INTAKE_COMPLETE',
        'INTAKE_APPROVED',
        'RESEARCH_COMPLETE',
        'RESEARCH_APPROVED',
        'METHODOLOGY_COMPLETE',
        'METHODOLOGY_APPROVED',
        'ETHICS_COMPLETE',
        'ETHICS_APPROVED',
        'DOCUMENTS_COMPLETE',
        'DOCUMENTS_APPROVED',
        'SUBMITTED',
        'REVISION_REQUIRED',
        'COMPLETED',
        'ARCHIVED'
    ))
);

COMMENT ON TABLE projects IS 'Core projects table storing QI and research projects through pipeline stages';
COMMENT ON COLUMN projects.status IS 'Current pipeline stage status';
COMMENT ON COLUMN projects.intake IS 'Stage 1 intake data: project concept, team, and initial parameters';
COMMENT ON COLUMN projects.classification IS 'Stage 1 output: LLM-generated project type classification';
COMMENT ON COLUMN projects.frameworks IS 'Stage 1 output: applicable reporting and ethics frameworks';
COMMENT ON COLUMN projects.research IS 'Stage 2: literature review, evidence synthesis, and gap analysis';
COMMENT ON COLUMN projects.methodology IS 'Stage 3: study design, participants, outcomes, and analysis plan';
COMMENT ON COLUMN projects.ethics IS 'Stage 4: ethics pathway, risk assessment, and governance requirements';
COMMENT ON COLUMN projects.documents IS 'Stage 5: generated documents and submission package metadata';
COMMENT ON COLUMN projects.checkpoints IS 'Tracks user approval status at each pipeline checkpoint';

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
-- Purpose: Comprehensive audit trail for all system actions on projects.
-- Records who did what, when, and captures state changes for compliance
-- and debugging purposes. All actions on projects should be logged here.
-- ============================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to the affected project
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Timestamp of the action
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Action type identifier
    -- Examples: PROJECT_CREATED, STATUS_CHANGED, INTAKE_APPROVED,
    --           DOCUMENT_GENERATED, CHECKPOINT_COMPLETED
    action VARCHAR(100) NOT NULL,

    -- Actor identification (user ID, email, or 'SYSTEM' for automated actions)
    actor VARCHAR(255),

    -- Additional context about the action
    details JSONB,

    -- State snapshots for change tracking
    previous_state JSONB,
    new_state JSONB,

    -- Request context for security auditing
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255)
);

COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all project actions and state changes';
COMMENT ON COLUMN audit_log.action IS 'Action type: PROJECT_CREATED, STATUS_CHANGED, DOCUMENT_GENERATED, etc.';
COMMENT ON COLUMN audit_log.actor IS 'User ID, email, or SYSTEM for automated actions';
COMMENT ON COLUMN audit_log.previous_state IS 'Snapshot of state before the change';
COMMENT ON COLUMN audit_log.new_state IS 'Snapshot of state after the change';

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
-- Purpose: Metadata storage for generated documents. Actual document files
-- are stored in S3-compatible storage or local filesystem; this table tracks
-- their metadata, versions, and status within the pipeline.
--
-- Document types include: research_protocol, qi_project_plan, emf_application,
-- hrec_cover_letter, picf (participant information), data_management_plan, etc.
-- ============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Parent project reference
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Document classification
    -- Types: RESEARCH_PROTOCOL, QI_PROJECT_PLAN, EMF_APPLICATION,
    --        HREC_COVER_LETTER, PICF, DATA_MANAGEMENT_PLAN, etc.
    document_type VARCHAR(100) NOT NULL,

    -- File information
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,           -- Path in storage system
    file_size INTEGER,                          -- Size in bytes
    mime_type VARCHAR(100) DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    -- Version tracking
    version VARCHAR(20) DEFAULT '1.0',

    -- Document workflow status
    -- DRAFT -> REVIEW -> APPROVED -> FINAL
    status VARCHAR(50) DEFAULT 'DRAFT',

    -- Generation timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Additional metadata (word count, sections, validation results, etc.)
    metadata JSONB,

    -- Template source reference
    template_name VARCHAR(255),

    -- Document checksum for integrity verification
    checksum VARCHAR(64),

    -- Status constraint
    CONSTRAINT documents_status_check CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'FINAL', 'SUPERSEDED'))
);

COMMENT ON TABLE documents IS 'Metadata for generated documents stored in external file storage';
COMMENT ON COLUMN documents.document_type IS 'Type: RESEARCH_PROTOCOL, QI_PROJECT_PLAN, EMF_APPLICATION, etc.';
COMMENT ON COLUMN documents.file_path IS 'Path to document in S3 or local storage';
COMMENT ON COLUMN documents.status IS 'Workflow status: DRAFT, REVIEW, APPROVED, FINAL, SUPERSEDED';
COMMENT ON COLUMN documents.metadata IS 'Additional metadata: word counts, validation results, etc.';

-- ============================================================================
-- REFERENCES TABLE
-- ============================================================================
-- Purpose: Stores literature references discovered during the research stage.
-- Each reference is associated with a project and includes bibliographic
-- metadata, relevance scoring, and extracted key findings for use in
-- document generation and citation formatting.
-- ============================================================================
CREATE TABLE references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Parent project reference
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- External identifiers
    pmid VARCHAR(20),                           -- PubMed ID
    doi VARCHAR(100),                           -- Digital Object Identifier

    -- Bibliographic information
    title TEXT NOT NULL,
    authors JSONB,                              -- Array of author objects
    journal VARCHAR(500),
    year INTEGER,
    volume VARCHAR(20),
    issue VARCHAR(20),
    pages VARCHAR(50),

    -- Content
    abstract TEXT,

    -- Relevance assessment
    relevance_score DECIMAL(3,2),               -- 0.00 to 1.00
    relevance_category VARCHAR(20),             -- PRIMARY or SECONDARY

    -- Extracted information
    key_findings JSONB,                         -- Array of key findings
    methodology_notes TEXT,
    limitations JSONB,                          -- Array of noted limitations

    -- Formatted citation (Vancouver style by default)
    citation_formatted TEXT,

    -- Full text availability flag
    full_text_available BOOLEAN DEFAULT FALSE,
    full_text_path VARCHAR(1000),               -- Path if stored locally

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT references_relevance_check CHECK (relevance_score >= 0 AND relevance_score <= 1),
    CONSTRAINT references_category_check CHECK (relevance_category IN ('PRIMARY', 'SECONDARY'))
);

COMMENT ON TABLE references IS 'Literature references from research stage with bibliographic metadata and relevance scoring';
COMMENT ON COLUMN references.pmid IS 'PubMed identifier for the article';
COMMENT ON COLUMN references.doi IS 'Digital Object Identifier for the article';
COMMENT ON COLUMN references.relevance_score IS 'LLM-assessed relevance score from 0.00 to 1.00';
COMMENT ON COLUMN references.relevance_category IS 'PRIMARY (>0.7 relevance) or SECONDARY (0.4-0.7)';
COMMENT ON COLUMN references.key_findings IS 'JSON array of key findings extracted from the article';
COMMENT ON COLUMN references.citation_formatted IS 'Pre-formatted citation in Vancouver style';

-- ============================================================================
-- PROJECT TEAM MEMBERS TABLE (JUNCTION TABLE)
-- ============================================================================
-- Purpose: Links users to projects as team members with specific roles.
-- Allows for multiple investigators per project and tracks their roles
-- (PI, Co-Investigator, Associate) and permissions.
-- ============================================================================
CREATE TABLE project_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Team role within this project
    team_role VARCHAR(50) NOT NULL DEFAULT 'CO_INVESTIGATOR',

    -- Timestamps
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint to prevent duplicate memberships
    CONSTRAINT project_team_unique UNIQUE (project_id, user_id),

    -- Role constraint
    CONSTRAINT project_team_role_check CHECK (team_role IN ('PI', 'CO_INVESTIGATOR', 'ASSOCIATE', 'RESEARCH_ASSISTANT'))
);

COMMENT ON TABLE project_team_members IS 'Links users to projects as team members with specific roles';
COMMENT ON COLUMN project_team_members.team_role IS 'Role in project: PI, CO_INVESTIGATOR, ASSOCIATE, RESEARCH_ASSISTANT';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Strategic indexes for common query patterns identified in the specification

-- Projects table indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;

-- GIN indexes for JSONB column searches
CREATE INDEX idx_projects_intake_gin ON projects USING GIN (intake);
CREATE INDEX idx_projects_classification_gin ON projects USING GIN (classification);
CREATE INDEX idx_projects_checkpoints_gin ON projects USING GIN (checkpoints);

-- Specific JSONB path indexes for common queries
CREATE INDEX idx_projects_project_type ON projects ((classification->>'project_type'));
CREATE INDEX idx_projects_grant_target ON projects ((intake->>'grant_target'));
CREATE INDEX idx_projects_title ON projects ((intake->>'project_title'));

-- Audit log indexes
CREATE INDEX idx_audit_project ON audit_log(project_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_actor ON audit_log(actor);

-- Documents indexes
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- References indexes
CREATE INDEX idx_references_project ON references(project_id);
CREATE INDEX idx_references_pmid ON references(pmid) WHERE pmid IS NOT NULL;
CREATE INDEX idx_references_doi ON references(doi) WHERE doi IS NOT NULL;
CREATE INDEX idx_references_relevance ON references(relevance_score DESC);
CREATE INDEX idx_references_category ON references(relevance_category);
CREATE INDEX idx_references_year ON references(year DESC);

-- Project team members indexes
CREATE INDEX idx_team_project ON project_team_members(project_id);
CREATE INDEX idx_team_user ON project_team_members(user_id);
CREATE INDEX idx_team_role ON project_team_members(team_role);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_institution ON users(institution);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================
