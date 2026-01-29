-- Migration: 001_create_projects_table.sql
-- Description: Create the main projects table for the QI/Research Pipeline
-- Phase: 2.1
-- Author: System
-- Date: 2026-01-28

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- JSONB fields for each phase of the pipeline
    intake JSONB NOT NULL,
    classification JSONB,
    frameworks JSONB,
    research JSONB,
    methodology JSONB,
    ethics JSONB,
    documents JSONB,

    -- Checkpoint tracking
    checkpoints JSONB DEFAULT '{}',

    -- Ownership and soft delete
    owner_id UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Add comment to table
COMMENT ON TABLE projects IS 'Main table for QI/Research Pipeline projects';

-- Add comments to columns
COMMENT ON COLUMN projects.id IS 'Unique project identifier';
COMMENT ON COLUMN projects.status IS 'Current status: DRAFT, INTAKE, CLASSIFIED, RESEARCHED, METHODOLOGY, ETHICS, COMPLETE, ARCHIVED';
COMMENT ON COLUMN projects.created_at IS 'Project creation timestamp';
COMMENT ON COLUMN projects.updated_at IS 'Last modification timestamp';
COMMENT ON COLUMN projects.intake IS 'Initial project intake data';
COMMENT ON COLUMN projects.classification IS 'Project type classification data';
COMMENT ON COLUMN projects.frameworks IS 'Selected frameworks and models';
COMMENT ON COLUMN projects.research IS 'Research questions and literature review';
COMMENT ON COLUMN projects.methodology IS 'Methodology design and data collection plan';
COMMENT ON COLUMN projects.ethics IS 'Ethics review and IRB information';
COMMENT ON COLUMN projects.documents IS 'Generated document tracking';
COMMENT ON COLUMN projects.checkpoints IS 'Phase completion checkpoints';
COMMENT ON COLUMN projects.owner_id IS 'Project owner/creator identifier';
COMMENT ON COLUMN projects.deleted_at IS 'Soft delete timestamp (NULL if active)';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_timestamp
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

COMMENT ON FUNCTION update_projects_updated_at() IS 'Automatically update updated_at timestamp on row modification';
