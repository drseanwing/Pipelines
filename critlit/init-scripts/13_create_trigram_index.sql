-- Migration 13: Create trigram index for duplicate detection
-- Enables fuzzy matching on document titles for identifying potential duplicates

-- Create GIN trigram index for fuzzy title matching
-- Used for duplicate detection across different databases
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm 
    ON documents 
    USING gin (title gin_trgm_ops);

-- Also create trigram index on journal names for similarity matching
CREATE INDEX IF NOT EXISTS idx_documents_journal_trgm 
    ON documents 
    USING gin (journal gin_trgm_ops);

-- Add comments for documentation
COMMENT ON INDEX idx_documents_title_trgm IS 'Trigram index for fuzzy title matching and duplicate detection';
COMMENT ON INDEX idx_documents_journal_trgm IS 'Trigram index for fuzzy journal name matching';
