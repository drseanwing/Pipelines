-- Pipeline Orchestrator - FOAM Schema
-- Medical Education Content Creation tables
-- Source: apps/foam/foam-n8n-implementation/config/postgres-init.sql

-- Note: Schema 'foam' is created in 00_common_extensions.sql

-- ENUM TYPES
CREATE TYPE foam.content_format AS ENUM (
    'case-based', 'journal-club', 'clinical-review'
);

CREATE TYPE foam.request_status AS ENUM (
    'received', 'researching', 'drafting', 'quality-check',
    'pending-review', 'in-review', 'revisions-requested',
    'approved', 'published', 'failed', 'cancelled'
);

CREATE TYPE foam.evidence_quality AS ENUM (
    'high', 'moderate', 'low', 'very-low'
);

CREATE TYPE foam.approval_status AS ENUM (
    'pending', 'approved', 'approved-with-minor-changes',
    'revisions-required', 'major-revisions-required', 'rejected'
);

-- CORE TABLES
CREATE TABLE foam.topic_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    format foam.content_format NOT NULL,
    topic JSONB NOT NULL,
    requestor JSONB NOT NULL,
    target_audience VARCHAR(50) DEFAULT 'mixed',
    urgency VARCHAR(20) DEFAULT 'routine',
    regional_context VARCHAR(50) DEFAULT 'australia',
    suggested_reviewers JSONB,
    additional_resources JSONB,
    status foam.request_status DEFAULT 'received',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE foam.evidence_packages (
    package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES foam.topic_requests(request_id),
    sources JSONB NOT NULL,
    synthesis JSONB NOT NULL,
    guidelines_referenced JSONB,
    foamed_crossrefs JSONB,
    search_strategy JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generation_metadata JSONB
);

CREATE TABLE foam.drafts (
    draft_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES foam.topic_requests(request_id),
    evidence_package_id UUID REFERENCES foam.evidence_packages(package_id),
    format foam.content_format NOT NULL,
    version INTEGER DEFAULT 1,
    content JSONB NOT NULL,
    placeholders JSONB,
    validation_items JSONB,
    citations JSONB,
    quality_checks JSONB,
    attribution JSONB,
    status VARCHAR(50) DEFAULT 'generated',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE foam.reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES foam.topic_requests(request_id),
    draft_id UUID REFERENCES foam.drafts(draft_id),
    draft_version INTEGER,
    reviewer JSONB NOT NULL,
    checklist JSONB,
    quality_assessment JSONB,
    general_feedback TEXT,
    suggested_changes JSONB,
    missing_content JSONB,
    approval_status foam.approval_status DEFAULT 'pending',
    approval_conditions JSONB,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ
);

CREATE TABLE foam.conversation_memory (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_foam_conversation_memory_session ON foam.conversation_memory(session_id);

CREATE TABLE foam.workflow_executions (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES foam.topic_requests(request_id),
    workflow_name VARCHAR(255) NOT NULL,
    node_name VARCHAR(255),
    status VARCHAR(50),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    input_summary TEXT,
    output_summary TEXT,
    error_message TEXT,
    metadata JSONB
);
CREATE INDEX idx_foam_workflow_executions_request ON foam.workflow_executions(request_id);
CREATE INDEX idx_foam_workflow_executions_workflow ON foam.workflow_executions(workflow_name);

CREATE TABLE foam.error_log (
    error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID,
    workflow_name VARCHAR(255),
    node_name VARCHAR(255),
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    input_data JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE foam.workflow_logs (
    log_id VARCHAR(50) PRIMARY KEY,
    request_id UUID,
    workflow_name VARCHAR(255),
    node_name VARCHAR(255),
    level VARCHAR(20) NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    model_used VARCHAR(100),
    tokens_used INTEGER,
    execution_time_ms INTEGER,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_foam_workflow_logs_request ON foam.workflow_logs(request_id);
CREATE INDEX idx_foam_workflow_logs_level ON foam.workflow_logs(level);
CREATE INDEX idx_foam_workflow_logs_created ON foam.workflow_logs(created_at);

CREATE TABLE foam.audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor VARCHAR(255),
    changes JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_foam_audit_log_entity ON foam.audit_log(entity_type, entity_id);

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION foam.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_topic_requests_updated_at
    BEFORE UPDATE ON foam.topic_requests
    FOR EACH ROW EXECUTE FUNCTION foam.update_updated_at();

CREATE TRIGGER update_drafts_updated_at
    BEFORE UPDATE ON foam.drafts
    FOR EACH ROW EXECUTE FUNCTION foam.update_updated_at();

-- Views
CREATE VIEW foam.active_requests AS
SELECT
    tr.request_id, tr.format, tr.topic->>'title' as title,
    tr.requestor->>'name' as requestor_name, tr.status,
    tr.created_at, tr.urgency,
    COUNT(DISTINCT d.draft_id) as draft_count,
    COUNT(DISTINCT r.review_id) as review_count
FROM foam.topic_requests tr
LEFT JOIN foam.drafts d ON tr.request_id = d.request_id
LEFT JOIN foam.reviews r ON tr.request_id = r.request_id
WHERE tr.status NOT IN ('published', 'cancelled', 'failed')
GROUP BY tr.request_id;

CREATE VIEW foam.pending_reviews AS
SELECT
    r.review_id, r.draft_id, tr.topic->>'title' as title,
    tr.format, r.reviewer->>'name' as reviewer_name,
    r.reviewer->>'email' as reviewer_email,
    r.requested_at, r.due_date, r.approval_status
FROM foam.reviews r
JOIN foam.topic_requests tr ON r.request_id = tr.request_id
WHERE r.approval_status = 'pending';
