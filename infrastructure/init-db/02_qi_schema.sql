-- Pipeline Orchestrator - QI (ResearchPlanner) Schema
-- QI Research Pipeline tables
-- Source: Adapted from apps/researchplanner/migrations/

-- Note: Schema 'qi' is created in 00_common_extensions.sql

-- Projects table
CREATE TABLE qi.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    project_type VARCHAR(100) NOT NULL DEFAULT 'qi',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline stages
CREATE TABLE qi.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES qi.projects(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_qi_pipeline_stages_project ON qi.pipeline_stages(project_id);

-- Documents
CREATE TABLE qi.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES qi.projects(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    content JSONB,
    file_path VARCHAR(1000),
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_qi_documents_project ON qi.documents(project_id);

-- Checkpoints (approval gates)
CREATE TABLE qi.checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES qi.projects(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES qi.pipeline_stages(id),
    checkpoint_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewer VARCHAR(255),
    feedback TEXT,
    decision VARCHAR(50),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_qi_checkpoints_project ON qi.checkpoints(project_id);

-- Audit log
CREATE TABLE qi.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor VARCHAR(255),
    changes JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_qi_audit_log_entity ON qi.audit_log(entity_type, entity_id);

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION qi.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qi_projects_updated_at
    BEFORE UPDATE ON qi.projects
    FOR EACH ROW EXECUTE FUNCTION qi.update_updated_at();

CREATE TRIGGER update_qi_pipeline_stages_updated_at
    BEFORE UPDATE ON qi.pipeline_stages
    FOR EACH ROW EXECUTE FUNCTION qi.update_updated_at();

CREATE TRIGGER update_qi_documents_updated_at
    BEFORE UPDATE ON qi.documents
    FOR EACH ROW EXECUTE FUNCTION qi.update_updated_at();
