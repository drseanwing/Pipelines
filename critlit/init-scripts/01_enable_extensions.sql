-- PostgreSQL Extension Initialization Script
-- This script runs automatically when the PostgreSQL container is first created
-- It enables the required extensions for the CritLit SLR pipeline

-- Enable pgvector extension for semantic search and document embeddings
-- Provides vector data type and similarity search operators
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm extension for trigram-based fuzzy text matching
-- Used for duplicate detection and similar title matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp extension for UUID generation functions
-- Provides uuid_generate_v4() for primary key generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions are enabled
DO $$
BEGIN
    RAISE NOTICE 'CritLit PostgreSQL Extensions Enabled Successfully:';
    RAISE NOTICE '  - vector: Semantic search with pgvector';
    RAISE NOTICE '  - pg_trgm: Trigram fuzzy matching for duplicate detection';
    RAISE NOTICE '  - uuid-ossp: UUID generation for primary keys';
END $$;
