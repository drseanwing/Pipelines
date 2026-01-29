-- Migration 02: Create reviews table with JSONB fields for PICO criteria
-- Represents the systematic review registry aligned with PROSPERO standards

-- Create updated_at trigger function (reusable across all tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Review registry (PROSPERO alignment)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    prospero_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'protocol' CHECK (
        status IN ('protocol', 'searching', 'screening', 'extraction', 'synthesis', 'complete')
    ),
    pico JSONB NOT NULL, -- {population, intervention, comparator, outcomes[], study_types[]}
    inclusion_criteria JSONB NOT NULL,
    exclusion_criteria JSONB NOT NULL,
    search_strategy TEXT,
    protocol_version INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for reviews table
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_prospero ON reviews(prospero_id) WHERE prospero_id IS NOT NULL;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE reviews IS 'Systematic review registry with PROSPERO alignment and PICO criteria';
COMMENT ON COLUMN reviews.pico IS 'Population, Intervention, Comparator, Outcomes, and study types in JSON format';
COMMENT ON COLUMN reviews.status IS 'Review workflow stage: protocol, searching, screening, extraction, synthesis, complete';
