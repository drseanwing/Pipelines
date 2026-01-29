-- Migration: 002_create_audit_log_table.sql
-- Description: Create audit log table for tracking all project changes
-- Phase: 2.2
-- Author: System
-- Date: 2026-01-28

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to projects
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Audit metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255),

    -- State tracking
    details JSONB,
    previous_state JSONB,
    new_state JSONB
);

-- Add comment to table
COMMENT ON TABLE audit_log IS 'Audit trail for all project modifications';

-- Add comments to columns
COMMENT ON COLUMN audit_log.id IS 'Unique audit log entry identifier';
COMMENT ON COLUMN audit_log.project_id IS 'Reference to the project being modified';
COMMENT ON COLUMN audit_log.timestamp IS 'When the action occurred';
COMMENT ON COLUMN audit_log.action IS 'Type of action: CREATE, UPDATE, DELETE, STATUS_CHANGE, etc.';
COMMENT ON COLUMN audit_log.actor IS 'User or system component that performed the action';
COMMENT ON COLUMN audit_log.details IS 'Additional action-specific details';
COMMENT ON COLUMN audit_log.previous_state IS 'State before the change';
COMMENT ON COLUMN audit_log.new_state IS 'State after the change';
