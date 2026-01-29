-- Migration 06: Create HNSW index for semantic search on embeddings
-- Hierarchical Navigable Small World index for fast approximate nearest neighbor search

-- Create HNSW index with optimized parameters for semantic search
-- m=16: Maximum number of connections per layer (higher = better recall, more memory)
-- ef_construction=64: Size of dynamic candidate list during index construction (higher = better quality, slower build)
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw 
    ON document_embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Add comment for documentation
COMMENT ON INDEX idx_embeddings_hnsw IS 'HNSW index for fast semantic similarity search using cosine distance';
