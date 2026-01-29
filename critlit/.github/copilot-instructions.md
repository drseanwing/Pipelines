# GitHub Copilot Repository Onboarding Instructions

## Overview

This document provides GitHub Copilot with context, coding standards, architectural patterns, and project-specific guidance for the CritLit Autonomous Systematic Literature Review Pipeline. This project is an n8n-based workflow system that automates the creation of systematic reviews of medical literature following PRISMA 2020 standards.

---

## Project Context

### Repository: CritLit - Autonomous Systematic Literature Review Pipeline

**Mission**: Build an autonomous pipeline for writing systematic reviews of medical literature that achieves 40-70% time savings while maintaining doctoral-level methodological rigor and PRISMA 2020 compliance.

**Core Architecture Pattern**: Multi-agent orchestration using the "Ralph Playbook" pattern where a coordinator agent maintains minimal context by delegating to narrow-focused sub-agents, with PostgreSQL-backed artifacts serving as persistent memory.

**Technology Stack**:
- **Orchestration**: n8n (self-hosted with queue mode)
- **Database**: PostgreSQL 16+ with pgvector extension
- **Local LLM**: Ollama (Llama 3.1 8B/70B for screening and extraction)
- **Cloud LLM**: Claude 3.5 Sonnet (extraction), GPT-4o (risk of bias), Claude 3 Opus (synthesis)
- **Vector Search**: pgvector with HNSW indexes
- **PDF Management**: I-Librarian (Docker container)
- **Infrastructure**: Docker Compose
- **Data Sources**: PubMed E-utils, Unpaywall API, UQ Library Primo API

---

## System Architecture Overview

The pipeline implements a coordinator/worker pattern with PostgreSQL as the central state store:

1. **Coordinator Agent** (n8n AI Agent): Task decomposition, state management, human checkpoint routing
2. **Screening Agent** (Ollama Llama 3.1): High-throughput title/abstract screening with confidence scoring
3. **Extraction Agent** (Claude 3.5 Sonnet): Structured data extraction with source citations
4. **Risk of Bias Agent** (GPT-4o): Cochrane RoB 2.0 signaling questions with chain-of-thought reasoning
5. **Synthesis Agent** (Claude 3 Opus): Cross-study comparison, GRADE evidence profiles, narrative synthesis
6. **Vector Store** (pgvector): Semantic search, document retrieval, RAG context assembly

---

## Global Development Standards

### Code Quality Principles

1. **Production-Ready Code**: Never use placeholders, TODOs without implementation, or incomplete logic. All code should be deployable for alpha/beta testing.

2. **Comprehensive Documentation**: Include docstrings for all public functions/classes, inline comments for complex logic (especially PRISMA compliance checks), and clear README files for each component.

3. **Structured Logging**: All operations should log with timestamps, log levels, function names, and contextual data (review_id, document_id, agent_type).

4. **Graceful Error Handling**: Implement try-catch blocks with specific error types. Log errors comprehensively but allow workflows to continue processing other documents. Never allow silent failures that could compromise review completeness.

5. **Checkpoint Recovery**: Store all intermediate results in PostgreSQL. Every workflow should support resume-from-checkpoint to handle interruptions in long-running reviews.

6. **PRISMA Compliance**: All screening decisions, exclusion reasons, and document flows must be tracked for PRISMA flow diagram generation.

### Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Python Classes | PascalCase | `ScreeningAgent`, `DocumentExtractor` |
| Python Functions | snake_case | `screen_documents()`, `extract_pico_data()` |
| Python Constants | SCREAMING_SNAKE | `MAX_SCREENING_BATCH_SIZE` |
| SQL Tables | snake_case (plural) | `reviews`, `documents`, `screening_decisions` |
| SQL Columns | snake_case | `review_id`, `screening_decision`, `created_at` |
| n8n Workflow Names | Title Case | "PubMed Document Ingestion", "Title Abstract Screening" |
| n8n Node Names | Descriptive Action | "Screen 50 Documents with Ollama", "Update PRISMA Counts" |
| API Endpoints | kebab-case | `/api/v1/screening-decisions`, `/api/v1/review-status` |
| Environment Variables | SCREAMING_SNAKE | `OLLAMA_BASE_URL`, `POSTGRES_PASSWORD` |
| JSON Fields (PICO, etc) | snake_case | `population`, `intervention`, `outcomes` |
| Enum Values | lowercase | 'protocol', 'searching', 'screening', 'extraction', 'synthesis', 'complete' |

### Database Schema Conventions

All custom tables follow these patterns:

```sql
-- Standard audit columns
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
created_by UUID,  -- Optional: links to users table

-- Use JSONB for flexible structured data
pico JSONB NOT NULL,  -- {population, intervention, comparator, outcomes[], study_types[]}
inclusion_criteria JSONB NOT NULL,
metadata JSONB DEFAULT '{}'::jsonb,

-- Foreign keys with CASCADE for review-scoped data
review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,

-- Status fields use VARCHAR enums
status VARCHAR(50) DEFAULT 'pending',  -- Consider CHECK constraints

-- Always index frequently queried columns
CREATE INDEX idx_documents_review_status ON documents(review_id, screening_status);
CREATE INDEX idx_documents_external_id ON documents(external_id);

-- Vector columns for semantic search
embedding vector(384),  -- Dimension matches all-MiniLM-L6-v2 model (384d)
CREATE INDEX idx_embeddings_vector ON document_embeddings USING hnsw (embedding vector_cosine_ops);
```

### Python Code Structure

Use async patterns for all database and API interactions:

```python
import asyncpg
import structlog
from typing import List, Dict, Optional
from dataclasses import dataclass

logger = structlog.get_logger("module_name")


@dataclass
class ScreeningDecision:
    """Data class for screening decisions with Cochrane-compliant reasoning."""
    document_id: str
    decision: str  # 'include', 'exclude', 'uncertain'
    confidence: float  # 0.0 to 1.0
    reasoning: str
    exclusion_reason: Optional[str] = None


class ScreeningAgent:
    """Screens documents using LLM-based title/abstract review."""
    
    def __init__(self, db_pool: asyncpg.Pool, ollama_url: str, model: str):
        self.db = db_pool
        self.ollama_url = ollama_url
        self.model = model
        self.logger = structlog.get_logger(self.__class__.__name__)
    
    async def screen_batch(
        self,
        review_id: str,
        documents: List[Dict],
        inclusion_criteria: Dict
    ) -> List[ScreeningDecision]:
        """
        Screen a batch of documents for inclusion.
        
        Args:
            review_id: UUID of the systematic review
            documents: List of documents with title, abstract, metadata
            inclusion_criteria: PICO criteria and study type requirements
            
        Returns:
            List of screening decisions with confidence scores
        """
        decisions = []
        
        for doc in documents:
            try:
                decision = await self._screen_single(doc, inclusion_criteria)
                await self._save_decision(review_id, decision)
                decisions.append(decision)
                
                self.logger.info(
                    "document_screened",
                    review_id=review_id,
                    document_id=doc['id'],
                    decision=decision.decision,
                    confidence=decision.confidence
                )
                
            except Exception as e:
                self.logger.error(
                    "screening_failed",
                    review_id=review_id,
                    document_id=doc['id'],
                    error=str(e)
                )
                # Continue processing other documents
                continue
        
        return decisions
    
    async def _save_decision(self, review_id: str, decision: ScreeningDecision):
        """Save screening decision to database for PRISMA tracking."""
        async with self.db.acquire() as conn:
            await conn.execute("""
                INSERT INTO screening_decisions (
                    review_id, document_id, decision, confidence,
                    reasoning, exclusion_reason, screened_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """, review_id, decision.document_id, decision.decision,
                decision.confidence, decision.reasoning, decision.exclusion_reason)
```

### Error Handling Pattern

```python
try:
    result = await self.process_documents(documents)
    logger.info("batch_processed", batch_size=len(documents), status="success")
    return result

except ValidationError as e:
    # Validation errors are expected for some documents
    logger.warning("validation_failed", error=str(e), action="skipped")
    return {"status": "skipped", "reason": str(e)}

except APIError as e:
    # API errors should trigger retry
    logger.error("api_error", error=str(e), retry_count=retry_count)
    if retry_count < MAX_RETRIES:
        await asyncio.sleep(RETRY_DELAY)
        return await self.process_documents(documents, retry_count + 1)
    raise

except Exception as e:
    # Unexpected errors should be logged but allow workflow to continue
    logger.error("unexpected_error", error=str(e), traceback=traceback.format_exc())
    return {"status": "error", "error": str(e)}
```

### n8n Workflow Conventions

1. **Environment Variables**: Always use `{{ $env.VAR_NAME }}` for configuration
2. **Credentials**: Store API keys in n8n Credentials, never in workflow JSON
3. **Batch Processing**: Use Split in Batches node with configurable batch sizes (default 50 for screening)
4. **Error Handling**: Add Error Trigger node to each workflow for failure notifications
5. **State Management**: Use PostgreSQL nodes to checkpoint progress at each stage
6. **Node Naming**: Use descriptive action names like "Fetch 100 PubMed Results" not "HTTP Request 1"
7. **Testing**: Include test mode variables that log decisions without making changes

Example n8n Code node for screening:

```javascript
// n8n Code node for batch screening preparation
const documents = $input.all();
const reviewId = $env.REVIEW_ID;
const inclusionCriteria = JSON.parse($env.INCLUSION_CRITERIA);

// Prepare batch for Python agent
const batch = documents.map(doc => ({
  id: doc.json.id,
  title: doc.json.title,
  abstract: doc.json.abstract,
  pmid: doc.json.pmid,
  publication_year: doc.json.publication_year
}));

return [{
  json: {
    review_id: reviewId,
    documents: batch,
    inclusion_criteria: inclusionCriteria,
    batch_size: batch.length
  }
}];
```

---

## SQL Migration Patterns

Use numbered migrations with clear naming:

```sql
-- migrations/001_create_reviews_table.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create updated_at trigger function (reusable across tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    prospero_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'protocol' CHECK (
        status IN ('protocol', 'searching', 'screening', 'extraction', 'synthesis', 'complete')
    ),
    pico JSONB NOT NULL,
    inclusion_criteria JSONB NOT NULL,
    exclusion_criteria JSONB NOT NULL,
    search_strategy TEXT,
    protocol_version INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## PRISMA 2020 Compliance Requirements

All code must support PRISMA 2020 flow diagram generation:

1. **Identification**: Track all database queries and deduplication
2. **Screening**: Record all exclusions with reasons at title/abstract and full-text stages
3. **Included Studies**: Track which studies proceed to data extraction
4. **Risk of Bias**: Store all RoB 2.0 assessments with justifications

Required tracking fields:
- `prisma_stage`: 'identification', 'screening_title_abstract', 'screening_full_text', 'included', 'synthesis'
- `exclusion_reason`: Categorical reasons aligned with inclusion criteria
- `is_duplicate`: Boolean flag for deduplication tracking
- `screening_level`: 'title_abstract', 'full_text'

---

## LLM Prompt Engineering Standards

### Screening Prompts

Use structured prompts with explicit PICO matching:

```python
SCREENING_PROMPT = """You are a systematic review screener following Cochrane standards.

INCLUSION CRITERIA:
Population: {population}
Intervention: {intervention}
Comparator: {comparator}
Outcomes: {outcomes}
Study Types: {study_types}

DOCUMENT TO SCREEN:
Title: {title}
Abstract: {abstract}

TASK:
Determine if this document meets the inclusion criteria. Respond with:
1. DECISION: "include", "exclude", or "uncertain"
2. CONFIDENCE: 0.0 to 1.0
3. REASONING: 2-3 sentence justification
4. EXCLUSION_REASON: If exclude, specify which criterion was not met

Respond in JSON format.
"""
```

### Extraction Prompts

Use structured output with source citations:

```python
EXTRACTION_PROMPT = """Extract PICO data from this full-text article.

ARTICLE:
{full_text}

Extract and cite page numbers for each field:
{{
  "population": {{"value": "...", "page": X}},
  "intervention": {{"value": "...", "page": X}},
  "comparator": {{"value": "...", "page": X}},
  "outcomes": [
    {{"outcome": "...", "value": "...", "ci_95": "...", "page": X}}
  ],
  "study_design": "...",
  "sample_size": X,
  "bias_concerns": ["..."]
}}

Include exact quotes for key findings.
"""
```

---

## Testing Standards

### Unit Tests

Use pytest with async support:

```python
import pytest
import asyncpg
from unittest.mock import Mock, AsyncMock

@pytest.mark.asyncio
async def test_screening_agent_batch_processing():
    """Test screening agent processes batch correctly."""
    # Setup
    db_pool = AsyncMock()
    agent = ScreeningAgent(db_pool, "http://localhost:11434", "llama3.1:70b")
    
    documents = [
        {"id": "1", "title": "RCT of Drug X", "abstract": "..."},
        {"id": "2", "title": "Case report", "abstract": "..."}
    ]
    
    criteria = {
        "population": "adults with hypertension",
        "study_types": ["rct", "cohort"]
    }
    
    # Execute
    decisions = await agent.screen_batch("review-123", documents, criteria)
    
    # Assert
    assert len(decisions) == 2
    assert decisions[0].decision in ['include', 'exclude', 'uncertain']
    assert 0.0 <= decisions[0].confidence <= 1.0
    assert decisions[0].reasoning is not None
```

### Integration Tests

Test with a real PostgreSQL container:

```python
@pytest.fixture(scope="session")
async def db_pool():
    """Provide a test database connection pool."""
    pool = await asyncpg.create_pool(
        host="localhost",
        port=5432,
        database="slr_test",
        user="slr_user",
        password="test_password"
    )
    
    # Run migrations
    async with pool.acquire() as conn:
        with open("migrations/001_create_reviews_table.sql") as f:
            await conn.execute(f.read())
    
    yield pool
    
    await pool.close()
```

---

## Documentation Standards

### README Structure

Each major component should have a README:

```markdown
# Component Name

## Purpose
One-paragraph description of what this component does in the SLR pipeline.

## Dependencies
- PostgreSQL with pgvector
- Ollama (for local inference)
- n8n (for orchestration)

## Configuration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| OLLAMA_URL | Yes | - | Ollama API endpoint |
| SCREENING_BATCH_SIZE | No | 50 | Documents per batch |

## Usage
```python
agent = ScreeningAgent(db_pool, ollama_url, model)
decisions = await agent.screen_batch(review_id, documents, criteria)
```

## Testing
```bash
pytest tests/test_screening_agent.py -v
```
```

### Code Comments

Use docstrings for all public functions:

```python
async def calculate_agreement_statistics(
    review_id: str,
    screener_1_decisions: List[ScreeningDecision],
    screener_2_decisions: List[ScreeningDecision]
) -> Dict[str, float]:
    """
    Calculate inter-rater reliability metrics for dual screening.
    
    Computes Cohen's kappa, percent agreement, and positive/negative agreement
    to assess screening consistency per Cochrane Handbook recommendations.
    
    Args:
        review_id: UUID of the systematic review
        screener_1_decisions: First screener's include/exclude decisions
        screener_2_decisions: Second screener's include/exclude decisions
        
    Returns:
        Dictionary with 'cohens_kappa', 'percent_agreement', 
        'positive_agreement', and 'negative_agreement'
        
    Raises:
        ValueError: If decision lists have different lengths
        
    Note:
        Cochrane recommends kappa > 0.70 for screening tasks
    """
```

---

## Security Considerations

1. **Credentials**: Never commit API keys. Use environment variables or n8n Credentials
2. **SQL Injection**: Always use parameterized queries (`$1`, `$2` placeholders)
3. **Rate Limiting**: Implement exponential backoff for external APIs (PubMed, Unpaywall)
4. **Data Privacy**: Full-text articles may be copyrighted. Store only metadata + extracts
5. **Access Control**: When user management is added, scope all queries by user/team

```python
# GOOD: Parameterized query
await conn.execute(
    "SELECT * FROM documents WHERE review_id = $1 AND status = $2",
    review_id, status
)

# BAD: String interpolation
await conn.execute(
    f"SELECT * FROM documents WHERE review_id = '{review_id}'"
)
```

---

## Performance Optimization

### Batch Processing

Always process documents in batches:

```python
SCREENING_BATCH_SIZE = 50  # Optimal for Ollama throughput
EXTRACTION_BATCH_SIZE = 10  # Claude API rate limit consideration

async def process_large_dataset(documents: List[Dict]) -> List[Result]:
    """Process documents in batches to optimize throughput."""
    results = []
    
    for i in range(0, len(documents), SCREENING_BATCH_SIZE):
        batch = documents[i:i + SCREENING_BATCH_SIZE]
        batch_results = await self.screen_batch(batch)
        results.extend(batch_results)
        
        # Checkpoint after each batch
        await self.save_checkpoint(i + len(batch))
    
    return results
```

### Vector Search

Use HNSW indexes for fast semantic search:

```sql
-- Create HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_document_embeddings_vector 
ON document_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Query for similar documents
SELECT d.title, d.abstract, 1 - (de.embedding <=> $1::vector) AS similarity
FROM documents d
JOIN document_embeddings de ON d.id = de.document_id
WHERE de.embedding_model = 'all-MiniLM-L6-v2'
ORDER BY de.embedding <=> $1::vector
LIMIT 10;
```

### Database Optimization

```sql
-- Regular VACUUM for large tables
VACUUM ANALYZE documents;
VACUUM ANALYZE screening_decisions;

-- Partition large tables by review_id
CREATE TABLE screening_decisions (
    id UUID PRIMARY KEY,
    review_id UUID NOT NULL,
    document_id UUID NOT NULL,
    decision VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY HASH (review_id);
```

---

## Docker Compose Development Workflow

1. **Start Services**: `docker-compose up -d`
2. **Check Logs**: `docker-compose logs -f postgres n8n`
3. **Run Migrations**: Apply SQL migrations from `migrations/` directory via init scripts or psql
4. **Pull Ollama Model**: `docker-compose exec ollama ollama pull llama3.1:70b`
5. **Stop Services**: `docker-compose down` (or `docker-compose down -v` to delete volumes)

---

## Common Patterns

### Checkpoint/Resume Pattern

```python
async def resume_screening_from_checkpoint(review_id: str) -> None:
    """Resume screening from last checkpoint."""
    async with self.db.acquire() as conn:
        # Get last processed document
        last_processed = await conn.fetchval("""
            SELECT MAX(document_sequence_number)
            FROM screening_decisions
            WHERE review_id = $1
        """, review_id)
        
        # Get remaining documents
        documents = await conn.fetch("""
            SELECT * FROM documents
            WHERE review_id = $1 AND sequence_number > $2
            ORDER BY sequence_number
        """, review_id, last_processed or 0)
        
        # Resume processing
        await self.screen_batch(review_id, documents, criteria)
```

### Dual Screening Reconciliation

```python
async def reconcile_disagreements(
    review_id: str,
    require_consensus: bool = True
) -> List[str]:
    """
    Identify documents with screening disagreements for human review.
    
    Returns list of document IDs requiring reconciliation.
    """
    async with self.db.acquire() as conn:
        disagreements = await conn.fetch("""
            SELECT 
                document_id,
                ARRAY_AGG(DISTINCT decision) as decisions
            FROM screening_decisions
            WHERE review_id = $1
            GROUP BY document_id
            HAVING COUNT(DISTINCT decision) > 1
        """, review_id)
        
        return [row['document_id'] for row in disagreements]
```

---

## When Generating Code for This Project

**Always**:
- Use async/await for all I/O operations
- Log at INFO level for major operations, DEBUG for details
- Store intermediate results in PostgreSQL for checkpoint recovery
- Include PRISMA compliance tracking (stage, exclusion reasons)
- Use batch processing with configurable batch sizes
- Implement retry logic with exponential backoff for API calls
- Add comprehensive error handling that allows workflow continuation
- Use parameterized SQL queries (never string interpolation)
- Include confidence scores for all LLM-based decisions
- Cite sources (page numbers, PMIDs) for all extracted data

**Never**:
- Hardcode API keys or credentials
- Use synchronous I/O in async contexts
- Allow silent failures that could compromise review completeness
- Skip PRISMA tracking for any document flow
- Process entire datasets without batching
- Use f-strings or string concatenation for SQL queries
- Make LLM decisions without confidence scores or reasoning

**Consider**:
- Can this task be delegated to a focused sub-agent?
- Does this need human-in-the-loop review per Cochrane standards?
- Is this decision tracked for PRISMA flow diagram generation?
- Can this workflow resume from a checkpoint if interrupted?
- Are we processing within rate limits for external APIs?
- Is the confidence threshold appropriate for this review stage?

---

## Project-Specific Terminology

- **PICO**: Population, Intervention, Comparator, Outcomes (structured inclusion criteria)
- **PRISMA**: Preferred Reporting Items for Systematic Reviews and Meta-Analyses
- **RoB**: Risk of Bias (Cochrane tool for assessing study quality)
- **GRADE**: Grading of Recommendations Assessment, Development and Evaluation
- **PROSPERO**: International prospective register of systematic reviews
- **Dual Screening**: Two reviewers independently screen documents for inclusion
- **Full-Text Screening**: Second screening stage using complete article text
- **Data Extraction**: Structured extraction of PICO outcomes from included studies

---

## References

- [Cochrane Handbook for Systematic Reviews](https://training.cochrane.org/handbook)
- [PRISMA 2020 Statement](http://www.prisma-statement.org/)
- [n8n Documentation](https://docs.n8n.io/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Ollama Documentation](https://ollama.ai/docs)

---

*Last Updated*: 2024-01-24  
*Version*: 1.0  
*Maintained By*: CritLit Development Team
