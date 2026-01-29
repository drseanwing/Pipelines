-- Migration 10: Create prisma_flow table for PRISMA diagram data
-- Tracks counts at each stage of the PRISMA 2020 flow diagram

CREATE TABLE IF NOT EXISTS prisma_flow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    flow_version INTEGER DEFAULT 1,
    
    -- Identification stage
    records_identified JSONB NOT NULL, -- {database_name: count} for each source
    records_identified_total INTEGER GENERATED ALWAYS AS (
        (SELECT SUM((value)::int) FROM jsonb_each_text(records_identified))
    ) STORED,
    
    -- Screening stage
    duplicates_removed INTEGER DEFAULT 0,
    records_screened INTEGER DEFAULT 0,
    records_excluded_screening INTEGER DEFAULT 0,
    exclusion_reasons JSONB, -- [{reason: "Wrong population", count: 25}, ...]
    
    -- Full-text assessment stage
    reports_sought INTEGER DEFAULT 0,
    reports_not_retrieved INTEGER DEFAULT 0,
    reports_assessed INTEGER DEFAULT 0,
    reports_excluded INTEGER DEFAULT 0,
    reports_excluded_reasons JSONB, -- [{reason: "Wrong intervention", count: 10}, ...]
    
    -- Included studies
    studies_included INTEGER DEFAULT 0,
    reports_of_included INTEGER DEFAULT 0,
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for prisma_flow table
CREATE INDEX IF NOT EXISTS idx_prisma_review ON prisma_flow(review_id);
CREATE INDEX IF NOT EXISTS idx_prisma_version ON prisma_flow(review_id, flow_version DESC);

-- Create unique index to ensure only one current version per review
CREATE UNIQUE INDEX IF NOT EXISTS idx_prisma_current_version 
    ON prisma_flow(review_id, flow_version);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_prisma_flow_updated_at ON prisma_flow;
CREATE TRIGGER update_prisma_flow_updated_at
    BEFORE UPDATE ON prisma_flow
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE prisma_flow IS 'PRISMA 2020 flow diagram data for systematic review reporting';
COMMENT ON COLUMN prisma_flow.records_identified IS 'JSON object with count per database: {"PubMed": 1234, "Cochrane": 567}';
COMMENT ON COLUMN prisma_flow.exclusion_reasons IS 'Array of exclusion reasons with counts for screening stage';
COMMENT ON COLUMN prisma_flow.reports_excluded_reasons IS 'Array of exclusion reasons with counts for full-text stage';
COMMENT ON COLUMN prisma_flow.flow_version IS 'Version number to track changes over time';
