-- Migration 04: Create documents table with external ID indexing
-- Central registry for all documents across the systematic review

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    external_ids JSONB NOT NULL, -- {pmid, doi, scopus_id, wos_id, embase_id}
    title TEXT NOT NULL,
    authors JSONB, -- [{name, affiliation, orcid}]
    abstract TEXT,
    full_text TEXT,
    publication_year INTEGER,
    journal VARCHAR(500),
    study_type VARCHAR(100), -- RCT, cohort, case-control, cross-sectional, etc.
    source_database VARCHAR(100), -- Which database this came from
    pdf_path VARCHAR(500), -- I-Librarian reference or file path
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES documents(id),
    screening_status VARCHAR(50) DEFAULT 'pending', -- pending, included, excluded, full_text_needed
    metadata JSONB, -- Additional flexible metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_review ON documents(review_id);
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON documents(review_id, screening_status);
CREATE INDEX IF NOT EXISTS idx_documents_duplicate ON documents(is_duplicate) WHERE is_duplicate = TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(publication_year);
CREATE INDEX IF NOT EXISTS idx_documents_study_type ON documents(study_type);

-- Create GIN index for external_ids JSONB column for fast lookups
CREATE INDEX IF NOT EXISTS idx_documents_external_ids ON documents USING gin(external_ids);

-- Create partial unique index for DOI (only when DOI exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_doi_unique 
    ON documents(review_id, (external_ids->>'doi'))
    WHERE external_ids->>'doi' IS NOT NULL;

-- Create partial unique index for PMID (only when PMID exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_pmid_unique 
    ON documents(review_id, (external_ids->>'pmid'))
    WHERE external_ids->>'pmid' IS NOT NULL;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Central document registry for all papers in the systematic review';
COMMENT ON COLUMN documents.external_ids IS 'JSON object with external identifiers: {pmid, doi, scopus_id, etc.}';
COMMENT ON COLUMN documents.is_duplicate IS 'Flag indicating if this is a duplicate of another document';
COMMENT ON COLUMN documents.duplicate_of IS 'UUID of the canonical document if this is a duplicate';
COMMENT ON COLUMN documents.screening_status IS 'Current screening stage: pending, included, excluded, full_text_needed';
