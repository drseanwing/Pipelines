# Checkpoint Data Structure Documentation

## Overview

The `workflow_state` table provides checkpoint and resume capabilities for long-running SLR pipeline processes. Each workflow execution can save progress state and recover from interruptions or failures by resuming from the last successful checkpoint.

## Table Schema

```sql
CREATE TABLE workflow_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    execution_id VARCHAR(100) NOT NULL,
    workflow_stage VARCHAR(100) NOT NULL,
    checkpoint_data JSONB NOT NULL,
    items_processed INTEGER,
    items_total INTEGER,
    last_processed_id UUID,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Checkpoint Data Structure

The `checkpoint_data` JSONB column stores structured information about workflow progress and state. The schema is flexible but follows this standard pattern:

```json
{
  "stage": "string - current workflow stage",
  "batch_info": {
    "current_batch": "number - current batch number (0-indexed or 1-indexed)",
    "total_batches": "number - total number of batches to process",
    "batch_size": "number - items per batch"
  },
  "progress": {
    "items_processed": "number - total items processed so far",
    "items_total": "number - total items to process",
    "items_failed": "number - count of failed items"
  },
  "last_processed": {
    "document_id": "uuid - last successfully processed document",
    "timestamp": "ISO8601 - when this document was processed"
  },
  "context": {
    "review_id": "uuid - associated review ID",
    "webenv": "string - PubMed WebEnv for history server (search stage)",
    "query_key": "string - PubMed query_key for batching (search stage)",
    "search_execution_id": "uuid - reference to search_executions table",
    "extraction_schema_version": "number - version of extraction schema used"
  },
  "error_info": {
    "last_error": "string - error message from most recent failure",
    "error_count": "number - cumulative error count",
    "recoverable": "boolean - whether error allows resume",
    "failed_item_ids": ["array - UUIDs of items that failed"]
  },
  "metadata": {
    "n8n_execution_id": "string - n8n workflow execution ID",
    "coordinator_agent_version": "string - agent version for reproducibility"
  },
  "created_at": "ISO8601 - when checkpoint was first created",
  "updated_at": "ISO8601 - when checkpoint was last updated"
}
```

## Stage Values

The `workflow_stage` field uses standardized values corresponding to the SLR pipeline phases:

| Stage Value              | Description                                    | Typical Checkpoint Frequency |
|--------------------------|------------------------------------------------|------------------------------|
| `protocol_setup`         | PICO refinement and protocol definition        | After each interview round   |
| `searching`              | Multi-database search execution                | Per database, per 500 records|
| `deduplication`          | Fuzzy matching and duplicate merging           | Per 100 documents            |
| `screening_ta`           | Title/abstract screening                       | Per batch (10-100 items)     |
| `fulltext_retrieval`     | PDF acquisition from sources                   | Per PDF or per batch of 20   |
| `screening_ft`           | Full-text screening                            | Per document or per batch    |
| `extraction`             | Structured data extraction                     | Per document                 |
| `rob_assessment`         | Risk of bias assessment                        | Per assessment               |
| `synthesis`              | Cross-study synthesis and GRADE                | Per outcome or per section   |
| `prisma_generation`      | PRISMA flow diagram and reporting              | Per report section           |
| `human_review`           | Waiting for human approval checkpoint          | N/A (paused state)           |

## Resume Logic

### Basic Resume Pattern

When a workflow resumes, it follows this logic:

1. **Load Most Recent Checkpoint**:
   ```sql
   SELECT * FROM workflow_state
   WHERE review_id = $review_id
     AND workflow_stage = $current_stage
   ORDER BY updated_at DESC
   LIMIT 1;
   ```

2. **Extract Resume Point**:
   - For batch processing: Use `batch_info.current_batch` to resume at next batch
   - For sequential processing: Use `last_processed_id` to resume after that item
   - For paginated APIs: Use `context.webenv` and `context.query_key` (PubMed)

3. **Skip Completed Work**:
   ```sql
   -- Example: Resume screening from last checkpoint
   SELECT d.* FROM documents d
   WHERE d.review_id = $review_id
     AND d.id > $last_processed_id  -- Skip already processed
     AND NOT EXISTS (
       SELECT 1 FROM screening_decisions sd
       WHERE sd.document_id = d.id
         AND sd.screening_stage = 'title_abstract'
     )
   ORDER BY d.id
   LIMIT $batch_size;
   ```

4. **Validate Context**:
   - Check that `items_processed < items_total`
   - Verify error count is below threshold (e.g., <10% failure rate)
   - Confirm PubMed WebEnv is still valid (<24 hours old)

### Error Recovery Patterns

#### Recoverable Errors

Mark `error_info.recoverable = true` for:
- Temporary API rate limits
- Network timeouts
- Database deadlocks
- LLM inference timeouts

**Recovery strategy**: Retry from `last_processed_id` with exponential backoff.

#### Non-Recoverable Errors

Mark `error_info.recoverable = false` for:
- Authentication failures
- Invalid review configuration
- Database constraint violations
- Corrupted checkpoint data

**Recovery strategy**: Require human intervention before resume.

#### Partial Batch Failures

When some items in a batch fail:

```json
{
  "progress": {
    "items_processed": 95,
    "items_total": 1000,
    "items_failed": 5
  },
  "error_info": {
    "failed_item_ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"],
    "recoverable": true
  }
}
```

**Recovery strategy**:
1. Continue processing remaining items
2. After completion, retry failed items separately
3. Log permanently failed items for human review

## Checkpoint Frequency Recommendations

### High-Frequency Checkpointing (Per Item)

**Use for**:
- Data extraction (complex, high-value operations)
- Risk of bias assessment
- Full-text screening

**Rationale**: Each item requires significant LLM inference time (5-30 seconds). Loss of progress is expensive.

**Implementation**:
```javascript
// After each successful extraction
await postgres.query(
  `INSERT INTO workflow_state (review_id, execution_id, workflow_stage, checkpoint_data, last_processed_id, items_processed)
   VALUES ($1, $2, 'extraction', $3, $4, $5)
   ON CONFLICT (review_id, execution_id)
   DO UPDATE SET checkpoint_data = $3, last_processed_id = $4, items_processed = $5, updated_at = NOW()`,
  [reviewId, executionId, checkpointData, documentId, itemsProcessed]
);
```

### Batch Checkpointing (Per 10-100 Items)

**Use for**:
- Title/abstract screening
- Deduplication
- PDF retrieval

**Rationale**: Each item is fast (0.5-5 seconds). Batch processing is more efficient.

**Implementation**:
```javascript
// After each batch completes
const checkpointData = {
  batch_info: { current_batch: batchIndex, total_batches, batch_size: 10 },
  progress: { items_processed: batchIndex * 10, items_total },
  last_processed: { document_id: lastDocId, timestamp: new Date().toISOString() }
};
```

### Periodic Checkpointing (Every 5-10 Minutes)

**Use for**:
- Large database searches
- Long-running synthesis operations

**Rationale**: Operation is continuous without clear item boundaries.

**Implementation**:
```javascript
// Set interval for checkpoint saves
const checkpointInterval = setInterval(async () => {
  await saveCheckpoint({
    progress: { items_processed: currentProgress, items_total },
    context: { webenv, query_key }
  });
}, 5 * 60 * 1000); // Every 5 minutes
```

## Example Workflows

### Title/Abstract Screening Checkpoint

```json
{
  "stage": "screening_ta",
  "batch_info": {
    "current_batch": 15,
    "total_batches": 42,
    "batch_size": 100
  },
  "progress": {
    "items_processed": 1500,
    "items_total": 4200,
    "items_failed": 12
  },
  "last_processed": {
    "document_id": "a3b8c9d1-1234-5678-90ab-cdef12345678",
    "timestamp": "2026-01-25T14:32:10.543Z"
  },
  "context": {
    "review_id": "f1e2d3c4-5678-90ab-cdef-1234567890ab",
    "confidence_threshold": 0.85,
    "model_name": "llama3.1:70b"
  },
  "error_info": {
    "last_error": null,
    "error_count": 12,
    "recoverable": true,
    "failed_item_ids": []
  },
  "created_at": "2026-01-25T10:15:00.000Z",
  "updated_at": "2026-01-25T14:32:12.000Z"
}
```

### PubMed Search Checkpoint

```json
{
  "stage": "searching",
  "batch_info": {
    "current_batch": 8,
    "total_batches": 20,
    "batch_size": 500
  },
  "progress": {
    "items_processed": 4000,
    "items_total": 10000,
    "items_failed": 0
  },
  "context": {
    "webenv": "MCID_63f8a9b1c2d3e4f5",
    "query_key": "1",
    "database_name": "PubMed",
    "search_execution_id": "e5d4c3b2-1234-5678-90ab-cdef12345678"
  },
  "error_info": {
    "last_error": null,
    "error_count": 0,
    "recoverable": true
  },
  "metadata": {
    "n8n_execution_id": "1234",
    "api_rate_limit_remaining": 8
  },
  "created_at": "2026-01-25T09:00:00.000Z",
  "updated_at": "2026-01-25T09:45:30.000Z"
}
```

### Data Extraction with Errors

```json
{
  "stage": "extraction",
  "progress": {
    "items_processed": 78,
    "items_total": 150,
    "items_failed": 3
  },
  "last_processed": {
    "document_id": "b7c8d9e1-2345-6789-01bc-def234567890",
    "timestamp": "2026-01-25T16:22:45.123Z"
  },
  "context": {
    "extraction_schema_version": 2,
    "extraction_method": "ai_extracted",
    "model_name": "claude-3-5-sonnet-20241022"
  },
  "error_info": {
    "last_error": "LLM timeout after 60 seconds",
    "error_count": 3,
    "recoverable": true,
    "failed_item_ids": [
      "c1d2e3f4-3456-7890-12cd-ef3456789012",
      "d2e3f4g5-4567-8901-23de-f45678901234",
      "e3f4g5h6-5678-9012-34ef-567890123456"
    ]
  },
  "created_at": "2026-01-25T15:00:00.000Z",
  "updated_at": "2026-01-25T16:22:46.000Z"
}
```

## Best Practices

### 1. Always Use Upsert Pattern

```sql
INSERT INTO workflow_state (review_id, execution_id, workflow_stage, checkpoint_data, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (review_id, execution_id)
DO UPDATE SET
  checkpoint_data = EXCLUDED.checkpoint_data,
  items_processed = EXCLUDED.items_processed,
  last_processed_id = EXCLUDED.last_processed_id,
  updated_at = NOW();
```

This prevents duplicate checkpoint entries and ensures `updated_at` always reflects latest state.

### 2. Validate Checkpoint Integrity on Resume

```javascript
function validateCheckpoint(checkpoint) {
  // Ensure progress is consistent
  if (checkpoint.items_processed > checkpoint.items_total) {
    throw new Error('Invalid checkpoint: items_processed exceeds items_total');
  }

  // Check error rate
  const errorRate = checkpoint.error_info.error_count / checkpoint.items_processed;
  if (errorRate > 0.1) {
    console.warn('High error rate detected:', errorRate);
  }

  // Verify WebEnv freshness (PubMed history expires after 24h)
  if (checkpoint.context.webenv) {
    const checkpointAge = Date.now() - new Date(checkpoint.updated_at).getTime();
    if (checkpointAge > 24 * 60 * 60 * 1000) {
      throw new Error('PubMed WebEnv expired, must restart search');
    }
  }
}
```

### 3. Include Enough Context for Debugging

Always store:
- Relevant identifiers (review_id, execution_id, n8n_execution_id)
- Model/agent versions for reproducibility
- Error messages with stack traces
- Timestamp precision to second-level or better

### 4. Clean Up Old Checkpoints

```sql
-- Archive completed workflow checkpoints after 30 days
DELETE FROM workflow_state
WHERE updated_at < NOW() - INTERVAL '30 days'
  AND items_processed >= items_total
  AND error_count = 0;
```

## Integration with n8n Workflows

### Checkpoint Node Configuration

```json
{
  "name": "Update_Checkpoint",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO workflow_state (review_id, execution_id, workflow_stage, checkpoint_data, items_processed, items_total, last_processed_id, error_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (review_id, execution_id) DO UPDATE SET checkpoint_data = EXCLUDED.checkpoint_data, items_processed = EXCLUDED.items_processed, last_processed_id = EXCLUDED.last_processed_id, error_count = EXCLUDED.error_count, updated_at = NOW() RETURNING *",
    "options": {
      "queryParameters": {
        "parameters": [
          {"name": "review_id", "value": "={{ $json.review_id }}"},
          {"name": "execution_id", "value": "={{ $('Execute_Workflow_Trigger').item.json.execution_id }}"},
          {"name": "workflow_stage", "value": "screening_ta"},
          {"name": "checkpoint_data", "value": "={{ JSON.stringify({batch_completed: $runIndex, timestamp: new Date().toISOString()}) }}"},
          {"name": "items_processed", "value": "={{ $runIndex * 10 }}"},
          {"name": "items_total", "value": "={{ $('Fetch_Unscreened_Batch').item.json.total_count || 0 }}"},
          {"name": "last_processed_id", "value": "={{ $json.document_id }}"},
          {"name": "error_count", "value": "0"}
        ]
      }
    }
  }
}
```

### Resume Logic in Coordinator

```javascript
// Load checkpoint at workflow start
const checkpoint = await loadCheckpoint(reviewId, workflowStage);

if (checkpoint) {
  // Resume from checkpoint
  const resumePoint = checkpoint.last_processed_id;
  const remainingItems = checkpoint.items_total - checkpoint.items_processed;

  console.log(`Resuming ${workflowStage} from checkpoint:`, {
    items_processed: checkpoint.items_processed,
    items_remaining: remainingItems,
    last_processed_id: resumePoint
  });

  // Pass resume context to sub-workflow
  return {
    resume: true,
    last_processed_id: resumePoint,
    batch_offset: checkpoint.batch_info?.current_batch || 0
  };
} else {
  // Start fresh
  return { resume: false };
}
```

## See Also

- [Workflow State Migration](../init-scripts/008-workflow-state.sql)
- [SLR Screening Batch Workflow](../workflows/slr_screening_batch.json)
- [Technical Specifications](../Specifications.md) - Section: Database Schema Design
