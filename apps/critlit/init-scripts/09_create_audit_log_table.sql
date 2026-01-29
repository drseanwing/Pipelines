-- Migration 09: Create audit_log table for decision tracking
-- Comprehensive audit trail for all automated and human decisions

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
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

-- Create indexes for audit_log table
CREATE INDEX IF NOT EXISTS idx_audit_review ON audit_log(review_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(timestamp DESC);

-- Note: Partial index for recent entries removed because NOW() is not IMMUTABLE
-- The idx_audit_time index above handles time-based queries efficiently

-- Add comments for documentation
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all decisions and state changes in the review';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity: document, screening, extraction, rob, grade, workflow';
COMMENT ON COLUMN audit_log.action IS 'Action performed: create, update, delete, approve, reject, screen, extract';
COMMENT ON COLUMN audit_log.actor_type IS 'Who performed the action: human, ai_agent, system';
COMMENT ON COLUMN audit_log.reasoning IS 'Explanation or justification for the action taken';
