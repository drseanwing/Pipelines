-- Migration 05: Create document_embeddings table with vector column
-- Stores semantic embeddings for RAG-based document retrieval and similarity search

CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- abstract, methods, results, discussion, full_summary
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(384), -- Dimension for all-MiniLM-L6-v2 (384d) or text-embedding-3-small (1536d)
    embedding_model VARCHAR(100) NOT NULL, -- Model used to generate embedding
    embedding_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, section_type, chunk_index, embedding_version)
);

-- Create indexes for document_embeddings table
CREATE INDEX IF NOT EXISTS idx_embeddings_doc ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_section ON document_embeddings(section_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON document_embeddings(embedding_model);

-- Add comments for documentation
COMMENT ON TABLE document_embeddings IS 'Vector embeddings for semantic search and RAG context retrieval';
COMMENT ON COLUMN document_embeddings.section_type IS 'Document section: abstract, methods, results, discussion, full_summary';
COMMENT ON COLUMN document_embeddings.chunk_index IS 'Sequential index for chunked embeddings from same section';
COMMENT ON COLUMN document_embeddings.embedding IS 'Vector embedding (384d for MiniLM, 1536d for OpenAI)';
COMMENT ON COLUMN document_embeddings.embedding_model IS 'Model name: all-MiniLM-L6-v2, text-embedding-3-small, etc.';
COMMENT ON COLUMN document_embeddings.embedding_version IS 'Version for re-embedding strategies';
