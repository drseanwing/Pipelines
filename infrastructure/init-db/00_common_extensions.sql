-- Pipeline Orchestrator - Common PostgreSQL Extensions
-- Executed first during database initialization

-- Enable commonly needed extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings

-- Create schemas for each project
CREATE SCHEMA IF NOT EXISTS foam;
CREATE SCHEMA IF NOT EXISTS qi;
CREATE SCHEMA IF NOT EXISTS slr;

-- N8N internal schemas (one per instance to avoid metadata collisions)
CREATE SCHEMA IF NOT EXISTS foam_n8n;
CREATE SCHEMA IF NOT EXISTS qi_n8n;
CREATE SCHEMA IF NOT EXISTS slr_n8n;

-- Grant usage on schemas to the main user
-- (The main user is set via POSTGRES_USER env var)
DO $$
BEGIN
    EXECUTE format('GRANT ALL ON SCHEMA foam TO %I', current_user);
    EXECUTE format('GRANT ALL ON SCHEMA qi TO %I', current_user);
    EXECUTE format('GRANT ALL ON SCHEMA slr TO %I', current_user);
    EXECUTE format('GRANT ALL ON SCHEMA foam_n8n TO %I', current_user);
    EXECUTE format('GRANT ALL ON SCHEMA qi_n8n TO %I', current_user);
    EXECUTE format('GRANT ALL ON SCHEMA slr_n8n TO %I', current_user);
END
$$;

-- Set search path (uses current database dynamically)
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET search_path TO public, foam, qi, slr', current_database());
END
$$;
