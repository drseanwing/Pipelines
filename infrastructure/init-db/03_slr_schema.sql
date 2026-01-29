-- Pipeline Orchestrator - SLR (CritLit) Schema
-- Systematic Literature Review Pipeline tables
-- Source: Consolidated from apps/critlit/init-scripts/01-13

-- Note: Schema 'slr' is created in 00_common_extensions.sql
-- Note: Extensions (vector, pg_trgm, uuid-ossp) are enabled in 00_common_extensions.sql

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Create updated_at trigger function (reusable across all tables)
CREATE OR REPLACE FUNCTION slr.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Review registry (PROSPERO alignment)
-- Source: 02_create_reviews_table.sql
CREATE TABLE IF NOT EXISTS slr.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    prospero_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'protocol' CHECK (
        status IN ('protocol', 'searching', 'screening', 'extraction', 'synthesis', 'complete')
    ),
    pico JSONB NOT NULL, -- {population, intervention, comparator, outcomes[], study_types[]}
    inclusion_criteria JSONB NOT NULL,
    exclusion_criteria JSONB NOT NULL,
    search_strategy TEXT,
    protocol_version INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slr_reviews_status ON slr.reviews(status);
CREATE INDEX IF NOT EXISTS idx_slr_reviews_created_at ON slr.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slr_reviews_prospero ON slr.reviews(prospero_id) WHERE prospero_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON slr.reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON slr.reviews
    FOR EACH ROW
    EXECUTE FUNCTION slr.update_updated_at_column();

COMMENT ON TABLE slr.reviews IS 'Systematic review registry with PROSPERO alignment and PICO criteria';
COMMENT ON COLUMN slr.reviews.pico IS 'Population, Intervention, Comparator, Outcomes, and study types in JSON format';
COMMENT ON COLUMN slr.reviews.status IS 'Review workflow stage: protocol, searching, screening, extraction, synthesis, complete';

-- Search executions tracking
-- Source: 03_create_search_executions_table.sql
CREATE TABLE IF NOT EXISTS slr.search_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES slr.reviews(id) ON DELETE CASCADE,
    database_name VARCHAR(100) NOT NULL, -- PubMed, Cochrane, Embase, CINAHL, Scopus, Web of Science
    search_query TEXT NOT NULL,
    query_syntax TEXT, -- Database-specific full query with operators
    date_executed DATE NOT NULL DEFAULT CURRENT_DATE,
    date_range_start DATE,
    date_range_end DATE,
    results_count INTEGER,
    filters_applied JSONB, -- {publication_types, languages, date_filters}
    execution_metadata JSONB, -- {query_time_ms, api_version, rate_limit_remaining}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slr_search_review ON slr.search_executions(review_id);
CREATE INDEX IF NOT EXISTS idx_slr_search_database ON slr.search_executions(database_name);
CREATE INDEX IF NOT EXISTS idx_slr_search_date ON slr.search_executions(date_executed DESC);

COMMENT ON TABLE slr.search_executions IS 'Tracks all database searches for PRISMA flow diagram identification stage';
COMMENT ON COLUMN slr.search_executions.database_name IS 'Source database: PubMed, Cochrane, Embase, CINAHL, Scopus, Web of Science, etc.';
COMMENT ON COLUMN slr.search_executions.query_syntax IS 'Complete database-specific query with boolean operators and field tags';
COMMENT ON COLUMN slr.search_executions.results_count IS 'Number of records retrieved from this search';

-- Documents registry
-- Source: 04_create_documents_table.sql
CREATE TABLE IF NOT EXISTS slr.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES slr.reviews(id) ON DELETE CASCADE,
    external_ids JSONB NOT NULL, -- {pmid, doi, scopus_id, wos_id, embase_id}
    title TEXT NOT NULL,
    authors JSONB, -- [{name, affiliation, orcid}]
    abstract TEXT,
    full_text TEXT,
    publication_year INTEGER,
    journal VARCHAR(500),
    study_type VARCHAR(100), -- RCT, cohort, case-control, cross-sectional, etc.
    source_database VARCHAR(100), -- Which database this came from
    pdf_path VARCHAR(500), -- I-Librarian reference or file path
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES slr.documents(id),
    screening_status VARCHAR(50) DEFAULT 'pending', -- pending, included, excluded, full_text_needed
    metadata JSONB, -- Additional flexible metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slr_documents_review ON slr.documents(review_id);
CREATE INDEX IF NOT EXISTS idx_slr_documents_review_status ON slr.documents(review_id, screening_status);
CREATE INDEX IF NOT EXISTS idx_slr_documents_duplicate ON slr.documents(is_duplicate) WHERE is_duplicate = TRUE;
CREATE INDEX IF NOT EXISTS idx_slr_documents_year ON slr.documents(publication_year);
CREATE INDEX IF NOT EXISTS idx_slr_documents_study_type ON slr.documents(study_type);
CREATE INDEX IF NOT EXISTS idx_slr_documents_external_ids ON slr.documents USING gin(external_ids);

-- Unique indexes for external identifiers
CREATE UNIQUE INDEX IF NOT EXISTS idx_slr_documents_doi_unique
    ON slr.documents(review_id, (external_ids->>'doi'))
    WHERE external_ids->>'doi' IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_slr_documents_pmid_unique
    ON slr.documents(review_id, (external_ids->>'pmid'))
    WHERE external_ids->>'pmid' IS NOT NULL;

DROP TRIGGER IF EXISTS update_documents_updated_at ON slr.documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON slr.documents
    FOR EACH ROW
    EXECUTE FUNCTION slr.update_updated_at_column();

COMMENT ON TABLE slr.documents IS 'Central document registry for all papers in the systematic review';
COMMENT ON COLUMN slr.documents.external_ids IS 'JSON object with external identifiers: {pmid, doi, scopus_id, etc.}';
COMMENT ON COLUMN slr.documents.is_duplicate IS 'Flag indicating if this is a duplicate of another document';
COMMENT ON COLUMN slr.documents.duplicate_of IS 'UUID of the canonical document if this is a duplicate';
COMMENT ON COLUMN slr.documents.screening_status IS 'Current screening stage: pending, included, excluded, full_text_needed';

-- Document embeddings for semantic search
-- Source: 05_create_document_embeddings_table.sql
CREATE TABLE IF NOT EXISTS slr.document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES slr.documents(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- abstract, methods, results, discussion, full_summary
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(384), -- Dimension for all-MiniLM-L6-v2 (384d) or text-embedding-3-small (1536d)
    embedding_model VARCHAR(100) NOT NULL, -- Model used to generate embedding
    embedding_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, section_type, chunk_index, embedding_version)
);

CREATE INDEX IF NOT EXISTS idx_slr_embeddings_doc ON slr.document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_slr_embeddings_section ON slr.document_embeddings(section_type);
CREATE INDEX IF NOT EXISTS idx_slr_embeddings_model ON slr.document_embeddings(embedding_model);

COMMENT ON TABLE slr.document_embeddings IS 'Vector embeddings for semantic search and RAG context retrieval';
COMMENT ON COLUMN slr.document_embeddings.section_type IS 'Document section: abstract, methods, results, discussion, full_summary';
COMMENT ON COLUMN slr.document_embeddings.chunk_index IS 'Sequential index for chunked embeddings from same section';
COMMENT ON COLUMN slr.document_embeddings.embedding IS 'Vector embedding (384d for MiniLM, 1536d for OpenAI)';
COMMENT ON COLUMN slr.document_embeddings.embedding_model IS 'Model name: all-MiniLM-L6-v2, text-embedding-3-small, etc.';
COMMENT ON COLUMN slr.document_embeddings.embedding_version IS 'Version for re-embedding strategies';

-- HNSW index for semantic search
-- Source: 06_create_hnsw_index.sql
CREATE INDEX IF NOT EXISTS idx_slr_embeddings_hnsw
    ON slr.document_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX idx_slr_embeddings_hnsw IS 'HNSW index for fast semantic similarity search using cosine distance';

-- Screening decisions tracking
-- Source: 07_create_screening_decisions_table.sql
CREATE TABLE IF NOT EXISTS slr.screening_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES slr.documents(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES slr.reviews(id) ON DELETE CASCADE,
    screening_stage VARCHAR(50) NOT NULL, -- title_abstract, full_text
    reviewer_type VARCHAR(50) NOT NULL, -- human, ai_primary, ai_secondary
    reviewer_id VARCHAR(100), -- user_id or model_name (e.g., 'llama3.1:70b')
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('include', 'exclude', 'uncertain')),
    confidence FLOAT CHECK (confidence >= 0.0 AND confidence <= 1.0),
    exclusion_reason VARCHAR(200), -- Maps to PRISMA exclusion categories
    rationale TEXT, -- Detailed reasoning for the decision
    criteria_matched JSONB, -- {criterion_id: true/false} for each inclusion criterion
    processing_time_ms INTEGER, -- Time taken to make decision (for performance monitoring)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slr_screening_doc ON slr.screening_decisions(document_id);
CREATE INDEX IF NOT EXISTS idx_slr_screening_review ON slr.screening_decisions(review_id);
CREATE INDEX IF NOT EXISTS idx_slr_screening_stage_decision ON slr.screening_decisions(screening_stage, decision);
CREATE INDEX IF NOT EXISTS idx_slr_screening_reviewer ON slr.screening_decisions(reviewer_type, reviewer_id);
CREATE INDEX IF NOT EXISTS idx_slr_screening_confidence ON slr.screening_decisions(confidence) WHERE confidence < 0.85;
CREATE INDEX IF NOT EXISTS idx_slr_screening_created ON slr.screening_decisions(created_at DESC);

COMMENT ON TABLE slr.screening_decisions IS 'All screening decisions from human and AI reviewers for PRISMA tracking';
COMMENT ON COLUMN slr.screening_decisions.screening_stage IS 'Stage: title_abstract or full_text screening';
COMMENT ON COLUMN slr.screening_decisions.reviewer_type IS 'Type: human, ai_primary (single), ai_secondary (dual screening)';
COMMENT ON COLUMN slr.screening_decisions.decision IS 'Inclusion decision: include, exclude, or uncertain (requires human review)';
COMMENT ON COLUMN slr.screening_decisions.confidence IS 'AI confidence score 0.0-1.0 (decisions < 0.85 typically need human review)';
COMMENT ON COLUMN slr.screening_decisions.exclusion_reason IS 'Standardized reason for exclusion aligned with PICO criteria';

-- Workflow state for checkpoint management
-- Source: 08_create_workflow_state_table.sql
CREATE TABLE IF NOT EXISTS slr.workflow_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES slr.reviews(id) ON DELETE CASCADE,
    execution_id VARCHAR(100) NOT NULL, -- n8n execution ID
    workflow_name VARCHAR(100) NOT NULL, -- Name of the workflow
    workflow_stage VARCHAR(100) NOT NULL, -- Specific stage within workflow
    checkpoint_data JSONB NOT NULL, -- Serialized state for resume
    items_processed INTEGER DEFAULT 0,
    items_total INTEGER,
    items_remaining INTEGER GENERATED ALWAYS AS (items_total - items_processed) STORED,
    last_processed_id UUID, -- ID of last successfully processed item
    error_count INTEGER DEFAULT 0,
    error_details JSONB, -- Recent error messages and context
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'paused')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slr_workflow_review ON slr.workflow_state(review_id);
CREATE INDEX IF NOT EXISTS idx_slr_workflow_execution ON slr.workflow_state(execution_id);
CREATE INDEX IF NOT EXISTS idx_slr_workflow_status ON slr.workflow_state(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_slr_workflow_updated ON slr.workflow_state(updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_slr_workflow_active_checkpoint
    ON slr.workflow_state(review_id, workflow_name, workflow_stage)
    WHERE status IN ('in_progress', 'paused');

DROP TRIGGER IF EXISTS update_workflow_state_updated_at ON slr.workflow_state;
CREATE TRIGGER update_workflow_state_updated_at
    BEFORE UPDATE ON slr.workflow_state
    FOR EACH ROW
    EXECUTE FUNCTION slr.update_updated_at_column();

COMMENT ON TABLE slr.workflow_state IS 'Checkpoint state for workflow resume functionality';
COMMENT ON COLUMN slr.workflow_state.execution_id IS 'n8n execution ID for tracking';
COMMENT ON COLUMN slr.workflow_state.checkpoint_data IS 'Serialized workflow state for resume after interruption';
COMMENT ON COLUMN slr.workflow_state.items_remaining IS 'Computed column: items_total - items_processed';
COMMENT ON COLUMN slr.workflow_state.last_processed_id IS 'UUID of last successfully processed document/item';

-- Audit log for decision tracking
-- Source: 09_create_audit_log_table.sql
CREATE TABLE IF NOT EXISTS slr.audit_log (
    id BIGSERIAL PRIMARY KEY,
    review_id UUID REFERENCES slr.reviews(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- document, screening, extraction, rob, grade, workflow
    entity_id UUID, -- Reference to the affected entity
    action VARCHAR(50) NOT NULL, -- create, update, delete, approve, reject, screen, extract
    actor_type VARCHAR(50) NOT NULL, -- human, ai_agent, system
    actor_id VARCHAR(100), -- user_id or model_name
    old_value JSONB, -- Previous state (for updates)
    new_value JSONB, -- New state (for creates/updates)
    reasoning TEXT, -- Explanation for the action
    metadata JSONB, -- Additional context (execution_id, confidence, duration_ms)
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slr_audit_review ON slr.audit_log(review_id);
CREATE INDEX IF NOT EXISTS idx_slr_audit_entity ON slr.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_slr_audit_actor ON slr.audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_slr_audit_action ON slr.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_slr_audit_time ON slr.audit_log(timestamp DESC);

COMMENT ON TABLE slr.audit_log IS 'Comprehensive audit trail for all decisions and state changes in the review';
COMMENT ON COLUMN slr.audit_log.entity_type IS 'Type of entity: document, screening, extraction, rob, grade, workflow';
COMMENT ON COLUMN slr.audit_log.action IS 'Action performed: create, update, delete, approve, reject, screen, extract';
COMMENT ON COLUMN slr.audit_log.actor_type IS 'Who performed the action: human, ai_agent, system';
COMMENT ON COLUMN slr.audit_log.reasoning IS 'Explanation or justification for the action taken';

-- PRISMA flow diagram tracking
-- Source: 10_create_prisma_flow_table.sql
CREATE TABLE IF NOT EXISTS slr.prisma_flow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES slr.reviews(id) ON DELETE CASCADE,
    flow_version INTEGER DEFAULT 1,

    -- Identification stage
    records_identified JSONB NOT NULL, -- {database_name: count} for each source
    records_identified_total INTEGER GENERATED ALWAYS AS (
        (SELECT SUM((value)::int) FROM jsonb_each_text(records_identified))
    ) STORED,

    -- Screening stage
    duplicates_removed INTEGER DEFAULT 0,
    records_screened INTEGER DEFAULT 0,
    records_excluded_screening INTEGER DEFAULT 0,
    exclusion_reasons JSONB, -- [{reason: "Wrong population", count: 25}, ...]

    -- Full-text assessment stage
    reports_sought INTEGER DEFAULT 0,
    reports_not_retrieved INTEGER DEFAULT 0,
    reports_assessed INTEGER DEFAULT 0,
    reports_excluded INTEGER DEFAULT 0,
    reports_excluded_reasons JSONB, -- [{reason: "Wrong intervention", count: 10}, ...]

    -- Included studies
    studies_included INTEGER DEFAULT 0,
    reports_of_included INTEGER DEFAULT 0,

    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slr_prisma_review ON slr.prisma_flow(review_id);
CREATE INDEX IF NOT EXISTS idx_slr_prisma_version ON slr.prisma_flow(review_id, flow_version DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_slr_prisma_current_version
    ON slr.prisma_flow(review_id, flow_version);

DROP TRIGGER IF EXISTS update_prisma_flow_updated_at ON slr.prisma_flow;
CREATE TRIGGER update_prisma_flow_updated_at
    BEFORE UPDATE ON slr.prisma_flow
    FOR EACH ROW
    EXECUTE FUNCTION slr.update_updated_at_column();

COMMENT ON TABLE slr.prisma_flow IS 'PRISMA 2020 flow diagram data for systematic review reporting';
COMMENT ON COLUMN slr.prisma_flow.records_identified IS 'JSON object with count per database: {"PubMed": 1234, "Cochrane": 567}';
COMMENT ON COLUMN slr.prisma_flow.exclusion_reasons IS 'Array of exclusion reasons with counts for screening stage';
COMMENT ON COLUMN slr.prisma_flow.reports_excluded_reasons IS 'Array of exclusion reasons with counts for full-text stage';
COMMENT ON COLUMN slr.prisma_flow.flow_version IS 'Version number to track changes over time';

-- =============================================================================
-- FULL-TEXT SEARCH CONFIGURATION
-- =============================================================================

-- Source: 11_create_text_search_config.sql
CREATE TEXT SEARCH DICTIONARY IF NOT EXISTS slr.english_stem_med (
    TEMPLATE = snowball,
    Language = english
);

DROP TEXT SEARCH CONFIGURATION IF EXISTS slr.biomedical CASCADE;
CREATE TEXT SEARCH CONFIGURATION slr.biomedical (COPY = english);

ALTER TEXT SEARCH CONFIGURATION slr.biomedical
    ALTER MAPPING FOR word, asciiword WITH slr.english_stem_med;

COMMENT ON TEXT SEARCH CONFIGURATION slr.biomedical IS 'Text search configuration optimized for biomedical literature';

-- Source: 12_create_fulltext_search_index.sql
CREATE INDEX IF NOT EXISTS idx_slr_documents_fts
    ON slr.documents
    USING gin (
        to_tsvector('slr.biomedical',
            COALESCE(title, '') || ' ' || COALESCE(abstract, '')
        )
    );

COMMENT ON INDEX idx_slr_documents_fts IS 'Full-text search index using biomedical configuration for titles and abstracts';

-- =============================================================================
-- TRIGRAM INDEXES FOR DUPLICATE DETECTION
-- =============================================================================

-- Source: 13_create_trigram_index.sql
CREATE INDEX IF NOT EXISTS idx_slr_documents_title_trgm
    ON slr.documents
    USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_slr_documents_journal_trgm
    ON slr.documents
    USING gin (journal gin_trgm_ops);

COMMENT ON INDEX idx_slr_documents_title_trgm IS 'Trigram index for fuzzy title matching and duplicate detection';
COMMENT ON INDEX idx_slr_documents_journal_trgm IS 'Trigram index for fuzzy journal name matching';
