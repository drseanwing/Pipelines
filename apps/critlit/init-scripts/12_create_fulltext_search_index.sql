-- Migration 12: Create full-text search index on documents
-- Enables fast text search across document titles and abstracts using biomedical configuration

-- Create GIN index for full-text search on title and abstract
-- Using biomedical text search configuration for domain-specific stemming
CREATE INDEX IF NOT EXISTS idx_documents_fts 
    ON documents 
    USING gin (
        to_tsvector('biomedical', 
            COALESCE(title, '') || ' ' || COALESCE(abstract, '')
        )
    );

-- Add comment for documentation
COMMENT ON INDEX idx_documents_fts IS 'Full-text search index using biomedical configuration for titles and abstracts';
