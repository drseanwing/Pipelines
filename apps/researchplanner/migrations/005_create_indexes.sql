-- Migration: 005_create_indexes.sql
-- Description: Create indexes for optimized query performance
-- Phase: 2.5
-- Author: System
-- Date: 2026-01-28

-- ============================================
-- PROJECTS TABLE INDEXES
-- ============================================

-- Index on project status for filtering by status
CREATE INDEX IF NOT EXISTS idx_projects_status
    ON projects(status)
    WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_projects_status IS 'Optimize queries filtering by project status (excludes soft-deleted)';

-- Index on project owner for user-specific queries
CREATE INDEX IF NOT EXISTS idx_projects_owner
    ON projects(owner_id)
    WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_projects_owner IS 'Optimize queries filtering by project owner (excludes soft-deleted)';

-- Composite index for status and owner queries
CREATE INDEX IF NOT EXISTS idx_projects_status_owner
    ON projects(status, owner_id)
    WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_projects_status_owner IS 'Optimize combined status and owner queries';

-- Index on created_at for chronological sorting
CREATE INDEX IF NOT EXISTS idx_projects_created_at
    ON projects(created_at DESC)
    WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_projects_created_at IS 'Optimize chronological sorting of projects';

-- Index on deleted_at for soft delete queries
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at
    ON projects(deleted_at)
    WHERE deleted_at IS NOT NULL;

COMMENT ON INDEX idx_projects_deleted_at IS 'Optimize queries for soft-deleted projects';

-- ============================================
-- AUDIT_LOG TABLE INDEXES
-- ============================================

-- Index on project_id for audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_project
    ON audit_log(project_id);

COMMENT ON INDEX idx_audit_project IS 'Optimize audit log queries by project';

-- Index on timestamp for chronological queries
CREATE INDEX IF NOT EXISTS idx_audit_timestamp
    ON audit_log(timestamp DESC);

COMMENT ON INDEX idx_audit_timestamp IS 'Optimize chronological audit log queries';

-- Composite index for project and timestamp
CREATE INDEX IF NOT EXISTS idx_audit_project_timestamp
    ON audit_log(project_id, timestamp DESC);

COMMENT ON INDEX idx_audit_project_timestamp IS 'Optimize project audit history queries';

-- Index on action type for filtering by action
CREATE INDEX IF NOT EXISTS idx_audit_action
    ON audit_log(action);

COMMENT ON INDEX idx_audit_action IS 'Optimize queries filtering by action type';

-- ============================================
-- DOCUMENTS TABLE INDEXES
-- ============================================

-- Index on project_id for document queries
CREATE INDEX IF NOT EXISTS idx_documents_project
    ON documents(project_id);

COMMENT ON INDEX idx_documents_project IS 'Optimize document queries by project';

-- Index on document_type for filtering by type
CREATE INDEX IF NOT EXISTS idx_documents_type
    ON documents(document_type);

COMMENT ON INDEX idx_documents_type IS 'Optimize queries filtering by document type';

-- Composite index for project and document type
CREATE INDEX IF NOT EXISTS idx_documents_project_type
    ON documents(project_id, document_type);

COMMENT ON INDEX idx_documents_project_type IS 'Optimize combined project and type queries';

-- Index on status for filtering by document status
CREATE INDEX IF NOT EXISTS idx_documents_status
    ON documents(status);

COMMENT ON INDEX idx_documents_status IS 'Optimize queries filtering by document status';

-- ============================================
-- REFERENCES TABLE INDEXES
-- ============================================

-- Index on project_id for reference queries
CREATE INDEX IF NOT EXISTS idx_references_project
    ON references(project_id);

COMMENT ON INDEX idx_references_project IS 'Optimize reference queries by project';

-- Index on PMID for PubMed lookups
CREATE INDEX IF NOT EXISTS idx_references_pmid
    ON references(pmid)
    WHERE pmid IS NOT NULL;

COMMENT ON INDEX idx_references_pmid IS 'Optimize PubMed ID lookups';

-- Index on DOI for DOI lookups
CREATE INDEX IF NOT EXISTS idx_references_doi
    ON references(doi)
    WHERE doi IS NOT NULL;

COMMENT ON INDEX idx_references_doi IS 'Optimize DOI lookups';

-- Index on relevance_score for sorting by relevance
CREATE INDEX IF NOT EXISTS idx_references_relevance
    ON references(project_id, relevance_score DESC NULLS LAST);

COMMENT ON INDEX idx_references_relevance IS 'Optimize queries sorting references by relevance';

-- Full-text search index on title and abstract
CREATE INDEX IF NOT EXISTS idx_references_fulltext
    ON references USING GIN(to_tsvector('english', title || ' ' || COALESCE(abstract, '')));

COMMENT ON INDEX idx_references_fulltext IS 'Enable full-text search on title and abstract';
