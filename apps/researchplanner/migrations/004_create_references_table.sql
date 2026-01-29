-- Migration: 004_create_references_table.sql
-- Description: Create references table for literature and citations
-- Phase: 2.4
-- Author: System
-- Date: 2026-01-28

-- Create references table
CREATE TABLE IF NOT EXISTS references (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to projects
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Citation identifiers
    pmid VARCHAR(20),
    doi VARCHAR(100),

    -- Reference metadata
    title TEXT NOT NULL,
    authors JSONB,
    journal VARCHAR(500),
    year INTEGER,
    abstract TEXT,

    -- Research relevance
    relevance_score DECIMAL(3,2),
    key_findings JSONB,

    -- Formatted citation
    citation_formatted TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comment to table
COMMENT ON TABLE references IS 'Literature references and citations for projects';

-- Add comments to columns
COMMENT ON COLUMN references.id IS 'Unique reference identifier';
COMMENT ON COLUMN references.project_id IS 'Reference to the parent project';
COMMENT ON COLUMN references.pmid IS 'PubMed ID if applicable';
COMMENT ON COLUMN references.doi IS 'Digital Object Identifier';
COMMENT ON COLUMN references.title IS 'Reference title';
COMMENT ON COLUMN references.authors IS 'Array of author objects with name, affiliation, etc.';
COMMENT ON COLUMN references.journal IS 'Journal or publication name';
COMMENT ON COLUMN references.year IS 'Publication year';
COMMENT ON COLUMN references.abstract IS 'Article abstract';
COMMENT ON COLUMN references.relevance_score IS 'Relevance score (0.00 to 1.00)';
COMMENT ON COLUMN references.key_findings IS 'Extracted key findings and notes';
COMMENT ON COLUMN references.citation_formatted IS 'Pre-formatted citation string (APA, MLA, etc.)';
COMMENT ON COLUMN references.created_at IS 'Reference added timestamp';

-- Add constraints
ALTER TABLE references ADD CONSTRAINT check_relevance_score
    CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1));

ALTER TABLE references ADD CONSTRAINT check_year
    CHECK (year IS NULL OR (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1));

COMMENT ON CONSTRAINT check_relevance_score ON references IS 'Ensure relevance score is between 0 and 1';
COMMENT ON CONSTRAINT check_year ON references IS 'Ensure publication year is reasonable';
