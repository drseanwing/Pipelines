-- Migration 08: Create workflow_state table for checkpoint management
-- Enables checkpoint/resume functionality for long-running review workflows

CREATE TABLE IF NOT EXISTS workflow_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
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

-- Create indexes for workflow_state table
CREATE INDEX IF NOT EXISTS idx_workflow_review ON workflow_state(review_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution ON workflow_state(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflow_state(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_workflow_updated ON workflow_state(updated_at DESC);

-- Create unique index to prevent duplicate active checkpoints
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_active_checkpoint 
    ON workflow_state(review_id, workflow_name, workflow_stage)
    WHERE status IN ('in_progress', 'paused');

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_workflow_state_updated_at ON workflow_state;
CREATE TRIGGER update_workflow_state_updated_at
    BEFORE UPDATE ON workflow_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE workflow_state IS 'Checkpoint state for workflow resume functionality';
COMMENT ON COLUMN workflow_state.execution_id IS 'n8n execution ID for tracking';
COMMENT ON COLUMN workflow_state.checkpoint_data IS 'Serialized workflow state for resume after interruption';
COMMENT ON COLUMN workflow_state.items_remaining IS 'Computed column: items_total - items_processed';
COMMENT ON COLUMN workflow_state.last_processed_id IS 'UUID of last successfully processed document/item';
