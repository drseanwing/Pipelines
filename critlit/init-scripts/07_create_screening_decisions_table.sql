-- Migration 07: Create screening_decisions table with confidence scoring
-- Tracks all screening decisions from human and AI reviewers for PRISMA reporting

CREATE TABLE IF NOT EXISTS screening_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
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

-- Create indexes for screening_decisions table
CREATE INDEX IF NOT EXISTS idx_screening_doc ON screening_decisions(document_id);
CREATE INDEX IF NOT EXISTS idx_screening_review ON screening_decisions(review_id);
CREATE INDEX IF NOT EXISTS idx_screening_stage_decision ON screening_decisions(screening_stage, decision);
CREATE INDEX IF NOT EXISTS idx_screening_reviewer ON screening_decisions(reviewer_type, reviewer_id);
CREATE INDEX IF NOT EXISTS idx_screening_confidence ON screening_decisions(confidence) WHERE confidence < 0.85;
CREATE INDEX IF NOT EXISTS idx_screening_created ON screening_decisions(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE screening_decisions IS 'All screening decisions from human and AI reviewers for PRISMA tracking';
COMMENT ON COLUMN screening_decisions.screening_stage IS 'Stage: title_abstract or full_text screening';
COMMENT ON COLUMN screening_decisions.reviewer_type IS 'Type: human, ai_primary (single), ai_secondary (dual screening)';
COMMENT ON COLUMN screening_decisions.decision IS 'Inclusion decision: include, exclude, or uncertain (requires human review)';
COMMENT ON COLUMN screening_decisions.confidence IS 'AI confidence score 0.0-1.0 (decisions < 0.85 typically need human review)';
COMMENT ON COLUMN screening_decisions.exclusion_reason IS 'Standardized reason for exclusion aligned with PICO criteria';
