-- Migration 03: Create search_executions table for database query tracking
-- Tracks all external database searches for PRISMA reporting

CREATE TABLE IF NOT EXISTS search_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    database_name VARCHAR(100) NOT NULL, -- PubMed, Cochrane, Embase, CINAHL, Scopus, Web of Science
    search_query TEXT NOT NULL,
    query_syntax TEXT, -- Database-specific full query with operators
    date_executed DATE NOT NULL DEFAULT CURRENT_DATE,
    date_range_start DATE,
    date_range_end DATE,
    results_count INTEGER,
    filters_applied JSONB, -- {publication_types, languages, date_filters}
    execution_metadata JSONB, -- {query_time_ms, api_version, rate_limit_remaining}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for search_executions table
CREATE INDEX IF NOT EXISTS idx_search_review ON search_executions(review_id);
CREATE INDEX IF NOT EXISTS idx_search_database ON search_executions(database_name);
CREATE INDEX IF NOT EXISTS idx_search_date ON search_executions(date_executed DESC);

-- Add comments for documentation
COMMENT ON TABLE search_executions IS 'Tracks all database searches for PRISMA flow diagram identification stage';
COMMENT ON COLUMN search_executions.database_name IS 'Source database: PubMed, Cochrane, Embase, CINAHL, Scopus, Web of Science, etc.';
COMMENT ON COLUMN search_executions.query_syntax IS 'Complete database-specific query with boolean operators and field tags';
COMMENT ON COLUMN search_executions.results_count IS 'Number of records retrieved from this search';
