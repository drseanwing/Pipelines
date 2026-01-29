-- Migration: 003_create_documents_table.sql
-- Description: Create documents table for tracking generated project documents
-- Phase: 2.3
-- Author: System
-- Date: 2026-01-28

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to projects
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Document classification
    document_type VARCHAR(100) NOT NULL,

    -- File information
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Version and status
    version VARCHAR(20),
    status VARCHAR(50) DEFAULT 'DRAFT',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Additional metadata
    metadata JSONB
);

-- Add comment to table
COMMENT ON TABLE documents IS 'Generated documents associated with projects';

-- Add comments to columns
COMMENT ON COLUMN documents.id IS 'Unique document identifier';
COMMENT ON COLUMN documents.project_id IS 'Reference to the parent project';
COMMENT ON COLUMN documents.document_type IS 'Type: PROTOCOL, CONSENT, IRB_FORM, DATA_COLLECTION, ANALYSIS_PLAN, etc.';
COMMENT ON COLUMN documents.filename IS 'Original filename';
COMMENT ON COLUMN documents.file_path IS 'Storage path or URL';
COMMENT ON COLUMN documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN documents.mime_type IS 'MIME type (e.g., application/pdf)';
COMMENT ON COLUMN documents.version IS 'Document version number';
COMMENT ON COLUMN documents.status IS 'Document status: DRAFT, REVIEWED, APPROVED, FINAL';
COMMENT ON COLUMN documents.created_at IS 'Document creation timestamp';
COMMENT ON COLUMN documents.metadata IS 'Additional document metadata (author, approval dates, etc.)';
