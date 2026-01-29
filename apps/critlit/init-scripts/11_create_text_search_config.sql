-- Migration 11: Configure biomedical text search dictionary
-- Creates specialized text search configuration for biomedical literature

-- Create Snowball stemmer dictionary for English biomedical terms
CREATE TEXT SEARCH DICTIONARY IF NOT EXISTS english_stem_med (
    TEMPLATE = snowball,
    Language = english
);

-- Create biomedical text search configuration based on English
DROP TEXT SEARCH CONFIGURATION IF EXISTS biomedical CASCADE;
CREATE TEXT SEARCH CONFIGURATION biomedical (COPY = english);

-- Configure biomedical configuration to use medical stemmer
ALTER TEXT SEARCH CONFIGURATION biomedical
    ALTER MAPPING FOR word, asciiword WITH english_stem_med;

-- Add comment for documentation
COMMENT ON TEXT SEARCH CONFIGURATION biomedical IS 'Text search configuration optimized for biomedical literature';
