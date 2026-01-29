# CritLit User Guide

Comprehensive guide for conducting systematic literature reviews using the CritLit autonomous pipeline.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Creating a New Review](#2-creating-a-new-review)
3. [Executing PubMed Search](#3-executing-pubmed-search)
4. [Screening Documents](#4-screening-documents)
5. [Interpreting PRISMA Flow](#5-interpreting-prisma-flow)
6. [Working with Checkpoints](#6-working-with-checkpoints)
7. [Managing Reviews](#7-managing-reviews)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Introduction

### What is CritLit?

CritLit is an autonomous systematic literature review (SLR) pipeline that automates key stages of the research synthesis workflow. It combines:

- **Workflow automation** via n8n
- **AI-powered screening** using local LLM (Ollama) or cloud APIs
- **Vector search** for semantic deduplication (PostgreSQL with pgvector)
- **PRISMA 2020 compliance** with automated flow tracking
- **Checkpoint/resume** capabilities for long-running processes

### Key Features

| Feature | Description |
|---------|-------------|
| **Automated Search** | Execute PubMed searches and batch retrieve results |
| **AI Screening** | Title/abstract screening with confidence scoring |
| **Human Oversight** | Review checkpoints for low-confidence decisions |
| **State Persistence** | Resume workflows from interruption points |
| **PRISMA Tracking** | Automatic flow diagram data collection |
| **Audit Trail** | Complete decision history for transparency |

### System Requirements

Before starting, ensure you have:

- Docker and Docker Compose installed
- CritLit deployed and running (see [README.md](../README.md))
- Access to n8n web interface (http://localhost:5678)
- PubMed/NCBI API key
- Basic understanding of systematic review methodology

---

## 2. Creating a New Review

### Overview

A review begins with defining your research question using the PICO framework (Population, Intervention, Comparator, Outcomes) and establishing inclusion/exclusion criteria.

### Step 1: Define Your PICO Criteria

Before creating a review in the system, prepare the following:

#### Population
- **Definition**: Who are the participants?
- **Example**: "Adults (18+ years) with clinically diagnosed generalized anxiety disorder (GAD)"
- **Include**: Age range, condition/diagnosis, severity criteria, setting

#### Intervention
- **Definition**: What intervention is being studied?
- **Example**: "Mindfulness-based stress reduction (MBSR) programs of at least 8 weeks duration"
- **Include**: Intervention type, dosage, duration, delivery method

#### Comparator
- **Definition**: What is it compared against?
- **Example**: "Waitlist control, treatment as usual, or cognitive behavioral therapy (CBT)"
- **Include**: Control condition, active comparator, or standard care

#### Outcomes
- **Definition**: What outcomes are measured?
- **Example**: "Primary: Anxiety symptom reduction (GAD-7, BAI). Secondary: Quality of life (WHO-5), depression (PHQ-9)"
- **Include**: Primary outcomes, secondary outcomes, measurement tools

#### Study Types
- **Definition**: What study designs are acceptable?
- **Example**: "Randomized controlled trials (RCTs) and quasi-experimental studies with control groups"

### Step 2: Create Inclusion/Exclusion Criteria

#### Inclusion Criteria Example
```json
[
  "Randomized controlled trial (RCT) or quasi-experimental design with control group",
  "Adult participants (18 years or older)",
  "Clinically diagnosed anxiety disorder using validated diagnostic criteria",
  "Mindfulness-based intervention of at least 8 weeks duration",
  "Validated anxiety outcome measures (e.g., GAD-7, BAI, STAI)",
  "Published in peer-reviewed journal",
  "Available in English"
]
```

#### Exclusion Criteria Example
```json
[
  "Case studies or case series without control groups",
  "Participants under 18 years of age",
  "Mixed populations where anxiety data cannot be extracted separately",
  "Interventions shorter than 8 weeks",
  "Non-validated outcome measures",
  "Conference abstracts or dissertations",
  "Duplicate publications of the same study"
]
```

### Step 3: Insert Review into Database

Use a PostgreSQL client or n8n to insert your review record:

```sql
INSERT INTO reviews (
  title,
  prospero_id,
  status,
  pico,
  inclusion_criteria,
  exclusion_criteria,
  search_strategy,
  protocol_version,
  created_by
) VALUES (
  'Effectiveness of Mindfulness-Based Interventions for Anxiety Disorders: A Systematic Review',
  'CRD42026123456',  -- Optional PROSPERO registration ID
  'protocol',
  '{
    "population": "Adults (18+ years) with clinically diagnosed generalized anxiety disorder (GAD)",
    "intervention": "Mindfulness-based stress reduction (MBSR) programs of at least 8 weeks duration",
    "comparator": "Waitlist control, treatment as usual, or cognitive behavioral therapy (CBT)",
    "outcomes": ["Anxiety symptom reduction (GAD-7, BAI)", "Quality of life (WHO-5)", "Depression symptoms (PHQ-9)"],
    "study_types": ["Randomized controlled trials (RCTs)", "Quasi-experimental studies with control groups"]
  }'::jsonb,
  '[
    "Randomized controlled trial or quasi-experimental design with control group",
    "Adult participants (18 years or older)",
    "Clinically diagnosed anxiety disorder",
    "MBSR intervention of at least 8 weeks",
    "Validated anxiety outcome measures"
  ]'::jsonb,
  '[
    "Case studies without control groups",
    "Participants under 18 years",
    "Interventions shorter than 8 weeks",
    "Non-validated outcome measures",
    "Conference abstracts or dissertations"
  ]'::jsonb,
  '(mindfulness OR MBSR OR "mindfulness-based stress reduction") AND (anxiety OR GAD OR "generalized anxiety disorder") AND (RCT OR "randomized controlled trial")',
  1,
  'user-uuid-here'
);
```

### Step 4: Retrieve Your Review ID

After insertion, retrieve your review ID for workflow triggering:

```sql
SELECT id, title, status FROM reviews
WHERE title ILIKE '%mindfulness%anxiety%'
ORDER BY created_at DESC
LIMIT 1;
```

Save this `review_id` (UUID) for use in workflow triggers.

### API Alternative: Using n8n Webhook

You can also create reviews programmatically via the coordinator webhook:

```bash
curl -X POST http://localhost:5678/webhook/slr-start \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_review",
    "title": "Effectiveness of MBSR for Anxiety",
    "pico": {
      "population": "Adults with GAD",
      "intervention": "MBSR 8+ weeks",
      "comparator": "Waitlist or CBT",
      "outcomes": ["Anxiety reduction", "Quality of life"],
      "study_types": ["RCT", "Quasi-experimental"]
    },
    "inclusion_criteria": [...],
    "exclusion_criteria": [...]
  }'
```

---

## 3. Executing PubMed Search

### Overview

The search execution workflow queries PubMed's E-utilities API, retrieves results in batches, and stores documents in the database for screening.

### Step 1: Prepare Your Search Query

#### Basic Search Strategy
```
(mindfulness OR MBSR OR "mindfulness-based stress reduction")
AND (anxiety OR GAD OR "generalized anxiety disorder")
AND (RCT OR "randomized controlled trial" OR randomized)
```

#### Advanced Search with MeSH Terms
```
("Mindfulness"[MeSH] OR "Meditation"[MeSH])
AND ("Anxiety Disorders"[MeSH] OR "Anxiety"[MeSH])
AND ("Randomized Controlled Trial"[Publication Type])
```

#### Date Filtering
Add date ranges to your query:
```
AND ("2015/01/01"[PDAT] : "2025/12/31"[PDAT])
```

### Step 2: Trigger Search Workflow via n8n

#### Option A: Via Coordinator Webhook
```bash
curl -X POST http://localhost:5678/webhook/slr-start \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exec-2026-001",
    "review_id": "f1e2d3c4-5678-90ab-cdef-1234567890ab",
    "action": "execute_search",
    "search_query": "(mindfulness OR MBSR) AND (anxiety OR GAD) AND RCT",
    "database": "PubMed",
    "date_range": {
      "start": "2015/01/01",
      "end": "2025/12/31"
    }
  }'
```

#### Option B: Manual Execution in n8n UI
1. Navigate to http://localhost:5678
2. Open the **SLR_Search_Execution** workflow
3. Click **Execute Workflow**
4. Enter parameters:
   - `review_id`: Your review UUID
   - `search_query`: Your PubMed query string
   - `database`: "PubMed"
   - `batch_size`: 500 (default)

### Step 3: Monitor Search Progress

The search workflow executes in these stages:

1. **ESearch**: Submit query and get WebEnv + query_key for history server
2. **Batch Retrieval**: Fetch results in batches of 500 (PubMed rate limit compliance)
3. **XML Parsing**: Extract metadata (title, authors, abstract, PMID, DOI)
4. **Database Storage**: Insert documents into `documents` table
5. **Checkpoint**: Save progress to `workflow_state` after each batch

#### Check Search Execution Status
```sql
SELECT
  se.database_name,
  se.search_query,
  se.results_count,
  se.date_executed,
  ws.items_processed,
  ws.items_total,
  ws.workflow_stage
FROM search_executions se
LEFT JOIN workflow_state ws ON se.review_id = ws.review_id
WHERE se.review_id = 'your-review-id-here'
ORDER BY se.created_at DESC
LIMIT 1;
```

#### Check Document Count
```sql
SELECT COUNT(*) as total_documents
FROM documents
WHERE review_id = 'your-review-id-here';
```

### Step 4: Verify Search Results

After search completion, verify data integrity:

```sql
-- Check for documents with missing abstracts
SELECT COUNT(*) as missing_abstracts
FROM documents
WHERE review_id = 'your-review-id-here'
  AND (abstract IS NULL OR abstract = '');

-- Check for duplicate PMIDs
SELECT external_ids->>'pmid' as pmid, COUNT(*) as duplicate_count
FROM documents
WHERE review_id = 'your-review-id-here'
  AND external_ids->>'pmid' IS NOT NULL
GROUP BY external_ids->>'pmid'
HAVING COUNT(*) > 1;
```

### PubMed API Rate Limits

CritLit respects NCBI rate limits:

| Credential | Rate Limit | Batch Size |
|------------|------------|------------|
| **With API Key** | 10 requests/second | 500 records/request |
| **Without API Key** | 3 requests/second | 500 records/request |

The workflow includes automatic rate limiting delays between requests.

### Troubleshooting Search Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **"WebEnv expired"** | History server session >24 hours old | Re-run search from beginning |
| **"Rate limit exceeded"** | Too many requests to PubMed | Wait 60 seconds, workflow will auto-retry |
| **"Invalid API key"** | Incorrect PUBMED_API_KEY in .env | Verify API key from NCBI account |
| **No results returned** | Query syntax error | Test query on PubMed web interface first |

---

## 4. Screening Documents

### Overview

The screening workflow uses an AI agent (Ollama Llama 3.1 or cloud LLM) to evaluate each document's title and abstract against your inclusion/exclusion criteria. Decisions are saved with confidence scores, and low-confidence cases are flagged for human review.

### How AI Screening Works

#### Process Flow
```
1. Fetch unscreened documents (batch of 10-100)
2. For each document:
   - Load PICO criteria from review
   - Construct screening prompt
   - Submit to AI agent (Ollama/Claude/GPT)
   - Parse JSON response
3. Save screening decisions to database
4. Route low-confidence (<0.85) to human review
5. Create checkpoint
6. Process next batch
```

#### Prompt Structure

The AI agent receives:
- **Review context**: Title, research question
- **PICO framework**: Population, Intervention, Comparator, Outcomes, Study Types
- **Inclusion criteria**: List of requirements (ALL must be met)
- **Exclusion criteria**: List of disqualifiers (ANY triggers exclusion)
- **Paper to screen**: Title and abstract

The agent responds with structured JSON:
```json
{
  "decision": "include|exclude|uncertain",
  "confidence": 0.0-1.0,
  "reasoning": "Explanation with evidence from abstract",
  "criteria_matched": {
    "population": true,
    "intervention": true,
    "comparator": false,
    "outcomes": true,
    "study_type": true
  },
  "exclusion_reason": "Specific criterion or null",
  "key_quotes": ["Relevant quote 1", "Quote 2"]
}
```

See [screening-prompt.md](../workflows/prompts/screening-prompt.md) for the complete prompt template.

### Understanding Confidence Scores

| Confidence Range | Interpretation | Action |
|------------------|----------------|--------|
| **0.90 - 1.00** | High confidence in decision | Auto-processed, no human review |
| **0.85 - 0.89** | Moderate confidence | Auto-processed, sampled for QA |
| **0.70 - 0.84** | Low confidence | Flagged for human review |
| **0.00 - 0.69** | Very low confidence | Mandatory human review |

### Triggering Screening Workflow

#### Via Coordinator Webhook
```bash
curl -X POST http://localhost:5678/webhook/slr-start \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exec-2026-001-screening",
    "review_id": "your-review-id-here",
    "action": "title_abstract_screening",
    "batch_size": 100,
    "confidence_threshold": 0.85
  }'
```

#### Via n8n UI
1. Open **SLR_Screening_Batch** workflow
2. Execute with parameters:
   - `review_id`: Your review UUID
   - `batch_size`: 10-100 (default: 10)
   - `confidence_threshold`: 0.85 (default)

### Reviewing AI Decisions

#### Query Screening Summary
```sql
SELECT
  decision,
  COUNT(*) as count,
  ROUND(AVG(confidence)::numeric, 2) as avg_confidence,
  COUNT(CASE WHEN confidence < 0.85 THEN 1 END) as low_confidence_count
FROM screening_decisions
WHERE document_id IN (
  SELECT id FROM documents WHERE review_id = 'your-review-id-here'
)
AND screening_stage = 'title_abstract'
AND reviewer_type = 'ai_primary'
GROUP BY decision;
```

Expected output:
```
 decision  | count | avg_confidence | low_confidence_count
-----------+-------+----------------+---------------------
 include   |   342 |           0.91 |                   8
 exclude   |  1205 |           0.88 |                  42
 uncertain |    53 |           0.72 |                  53
```

#### View Low-Confidence Cases
```sql
SELECT
  d.title,
  sd.decision,
  sd.confidence,
  sd.rationale,
  sd.exclusion_reason
FROM screening_decisions sd
JOIN documents d ON sd.document_id = d.id
WHERE d.review_id = 'your-review-id-here'
  AND sd.screening_stage = 'title_abstract'
  AND sd.confidence < 0.85
ORDER BY sd.confidence ASC
LIMIT 20;
```

### Human Review Process

When the screening workflow encounters low-confidence decisions, it triggers a human review checkpoint.

#### Review Checkpoint Form

The workflow pauses and presents a form with:

| Field | Type | Purpose |
|-------|------|---------|
| **Batch Summary** | Read-only text | Shows included/excluded/uncertain counts |
| **Review Uncertain Cases** | Dropdown | "Review All Uncertain", "Sample 20%", "Trust AI" |
| **Adjust Confidence Threshold** | Number (0.5-1.0) | Modify sensitivity for next batch |
| **Approval Decision** | Dropdown | "Approve & Continue", "Require Full Human Review", "Revise Criteria" |
| **Reviewer Notes** | Text area | Record observations or issues |

#### Approval Actions

| Decision | Effect |
|----------|--------|
| **Approve & Continue** | Accept AI decisions, proceed to next batch |
| **Require Full Human Review** | Route flagged documents to manual screening |
| **Revise Criteria** | Pause workflow, update inclusion/exclusion criteria |

#### Manual Override of AI Decisions

To override an AI decision:

```sql
-- Insert human reviewer decision
INSERT INTO screening_decisions (
  document_id,
  screening_stage,
  reviewer_type,
  reviewer_id,
  decision,
  confidence,
  rationale
) VALUES (
  'document-uuid-here',
  'title_abstract',
  'human',
  'reviewer-name-or-id',
  'include',  -- or 'exclude'
  1.0,
  'Human override: Paper clearly meets all inclusion criteria based on detailed abstract review'
);
```

The system prioritizes human decisions over AI in downstream processes.

### Interpreting Screening Results

#### Inclusion vs. Exclusion Ratios

Typical screening ratios for systematic reviews:

| Stage | Include Rate | Notes |
|-------|--------------|-------|
| **Title/Abstract** | 5-15% | Wide net, conservative inclusion |
| **Full-Text** | 30-60% of T/A includes | More stringent eligibility check |
| **Final Inclusion** | 10-50 studies | Depends on topic specificity |

If your inclusion rate is <2% or >30% at title/abstract stage, review criteria for calibration.

#### Common Exclusion Reasons

Track exclusion reasons to identify patterns:

```sql
SELECT
  exclusion_reason,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage
FROM screening_decisions
WHERE document_id IN (
  SELECT id FROM documents WHERE review_id = 'your-review-id-here'
)
AND decision = 'exclude'
AND screening_stage = 'title_abstract'
GROUP BY exclusion_reason
ORDER BY count DESC;
```

Example output:
```
     exclusion_reason      | count | percentage
---------------------------+-------+------------
 Wrong study design        |   502 |       41.6
 Wrong population          |   318 |       26.4
 Wrong intervention        |   215 |       17.8
 No control group          |   105 |        8.7
 Conference abstract       |    65 |        5.4
```

Use this data to refine search strategies or criteria definitions.

---

## 5. Interpreting PRISMA Flow

### Overview

The PRISMA (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) flow diagram tracks the number of records at each stage of the review process. CritLit automatically updates the `prisma_flow` table as workflows execute.

### PRISMA 2020 Flow Structure

```
┌─────────────────────────────────────────┐
│ IDENTIFICATION                          │
│ Records identified from databases       │
│ (PubMed: 8,542, Cochrane: 1,205)       │
│ Duplicates removed: 1,103              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ SCREENING                               │
│ Records screened: 8,644                │
│ Records excluded: 8,249                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ ELIGIBILITY                             │
│ Reports sought for retrieval: 395      │
│ Reports not retrieved: 23              │
│ Reports assessed for eligibility: 372  │
│ Reports excluded: 319                  │
│   - Wrong intervention: 142            │
│   - Wrong outcomes: 88                 │
│   - Wrong study design: 89             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ INCLUDED                                │
│ Studies included in review: 53         │
│ Reports of included studies: 53        │
└─────────────────────────────────────────┘
```

### Querying PRISMA Flow Data

#### Get Current Flow Counts
```sql
SELECT
  records_identified,
  duplicates_removed,
  records_screened,
  records_excluded_screening,
  reports_sought,
  reports_not_retrieved,
  reports_assessed,
  studies_included,
  reports_of_included,
  generated_at
FROM prisma_flow
WHERE review_id = 'your-review-id-here'
ORDER BY flow_version DESC
LIMIT 1;
```

#### Calculate Screening Exclusion Breakdown
```sql
SELECT
  jsonb_array_elements(reports_excluded) as exclusion_detail
FROM prisma_flow
WHERE review_id = 'your-review-id-here'
ORDER BY flow_version DESC
LIMIT 1;
```

Example output:
```json
{"reason": "Wrong intervention", "count": 142}
{"reason": "Wrong outcomes", "count": 88}
{"reason": "Wrong study design", "count": 89}
```

### Generating PRISMA Flow Diagrams

CritLit provides a workflow to generate PRISMA-compliant flow diagrams.

#### Trigger PRISMA Generation Workflow
```bash
curl -X POST http://localhost:5678/webhook/slr-start \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exec-2026-prisma",
    "review_id": "your-review-id-here",
    "action": "generate_prisma"
  }'
```

The workflow:
1. Calculates current counts from database tables
2. Updates `prisma_flow` table with new version
3. Generates diagram (future: exports to Markdown/PNG/SVG)

### Exporting PRISMA Data

#### Export as JSON
```sql
SELECT row_to_json(pf) as prisma_data
FROM (
  SELECT
    records_identified,
    duplicates_removed,
    records_screened,
    records_excluded_screening,
    reports_assessed,
    reports_excluded,
    studies_included
  FROM prisma_flow
  WHERE review_id = 'your-review-id-here'
  ORDER BY flow_version DESC
  LIMIT 1
) pf;
```

#### Export as CSV for Reporting
```bash
# Connect to PostgreSQL container
docker exec -it slr_postgres psql -U slr_user -d slr_database

# Export PRISMA data
\copy (SELECT * FROM prisma_flow WHERE review_id = 'your-review-id-here') TO '/tmp/prisma_flow.csv' CSV HEADER;

# Exit psql
\q

# Copy file from container to host
docker cp slr_postgres:/tmp/prisma_flow.csv ./prisma_flow.csv
```

### Understanding Flow Discrepancies

#### Common Issues

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| **Records screened ≠ records identified - duplicates** | Incomplete screening workflow | Re-run screening on remaining documents |
| **Reports assessed < reports sought** | PDFs not retrieved yet | Complete full-text retrieval workflow |
| **Studies included ≠ reports of included** | Multiple reports for same study | Review for companion papers or protocols |

#### Validation Query
```sql
-- Verify PRISMA flow consistency
SELECT
  'Records identified' as stage,
  (records_identified::jsonb->>'PubMed')::int as pubmed,
  (records_identified::jsonb->>'Cochrane')::int as cochrane,
  ((records_identified::jsonb->>'PubMed')::int +
   (records_identified::jsonb->>'Cochrane')::int) as total
FROM prisma_flow
WHERE review_id = 'your-review-id-here'
ORDER BY flow_version DESC
LIMIT 1;
```

---

## 6. Working with Checkpoints

### Overview

Checkpoints enable the pipeline to save progress at critical points and resume workflows after interruptions, errors, or manual stops. All checkpoint data is stored in the `workflow_state` table.

### How Checkpoints Work

#### Checkpoint Creation

Checkpoints are automatically created:
- **After each batch** in screening workflows
- **Every 500 records** in search execution
- **After each document** in data extraction (future feature)
- **Before human review** wait nodes
- **After critical errors** for debugging

#### Checkpoint Data Structure

Each checkpoint contains:
```json
{
  "stage": "title_abstract_screening",
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
    "document_id": "uuid-of-last-document",
    "timestamp": "2026-01-25T14:32:10Z"
  },
  "context": {
    "review_id": "uuid",
    "confidence_threshold": 0.85,
    "model_name": "llama3.1:70b"
  },
  "error_info": {
    "last_error": null,
    "error_count": 12,
    "recoverable": true,
    "failed_item_ids": []
  }
}
```

See [checkpoint-schema.md](../docs/checkpoint-schema.md) for complete documentation.

### Resuming Interrupted Workflows

#### Check for Existing Checkpoints
```sql
SELECT
  workflow_stage,
  items_processed,
  items_total,
  ROUND((items_processed::numeric / items_total * 100)::numeric, 1) as progress_pct,
  error_count,
  updated_at
FROM workflow_state
WHERE review_id = 'your-review-id-here'
ORDER BY updated_at DESC
LIMIT 1;
```

#### Resume from Last Checkpoint

The coordinator workflow automatically detects and resumes from checkpoints:

```bash
curl -X POST http://localhost:5678/webhook/slr-start \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exec-2026-001",
    "review_id": "your-review-id-here",
    "action": "resume"
  }'
```

The coordinator:
1. Queries `workflow_state` for latest checkpoint
2. Extracts `last_processed_id` and `current_batch`
3. Skips already-processed items
4. Continues from interruption point

#### Manual Resume Workflow

If automatic resume fails, manually trigger from specific point:

```bash
curl -X POST http://localhost:5678/webhook/slr-start \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exec-2026-001-resume",
    "review_id": "your-review-id-here",
    "action": "title_abstract_screening",
    "resume_from": "last-processed-document-uuid",
    "batch_offset": 15
  }'
```

### Handling Errors

#### Error Types

| Error Type | Recoverable | Checkpoint Action |
|------------|-------------|-------------------|
| **API rate limit** | Yes | Checkpoint saved, auto-retry after delay |
| **Network timeout** | Yes | Checkpoint saved, resume from last batch |
| **Invalid credentials** | No | Checkpoint saved, manual intervention required |
| **Database constraint violation** | No | Checkpoint saved, review data integrity |
| **LLM timeout** | Yes | Skip failed item, continue with next |

#### View Failed Items
```sql
SELECT
  checkpoint_data->'error_info'->'failed_item_ids' as failed_items,
  checkpoint_data->'error_info'->>'last_error' as error_message,
  checkpoint_data->'error_info'->>'error_count' as total_errors
FROM workflow_state
WHERE review_id = 'your-review-id-here'
  AND (checkpoint_data->'error_info'->>'error_count')::int > 0
ORDER BY updated_at DESC
LIMIT 1;
```

#### Retry Failed Items

To retry specific failed documents:

```bash
curl -X POST http://localhost:5678/webhook/slr-start \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exec-2026-retry",
    "review_id": "your-review-id-here",
    "action": "retry_failed",
    "document_ids": ["uuid1", "uuid2", "uuid3"]
  }'
```

### Checkpoint Cleanup

#### Archive Completed Workflows
```sql
-- Archive checkpoints older than 30 days for completed workflows
DELETE FROM workflow_state
WHERE updated_at < NOW() - INTERVAL '30 days'
  AND items_processed >= items_total
  AND error_count = 0;
```

#### Clear Stale Checkpoints
```sql
-- Remove checkpoints for abandoned executions (no update in 7 days)
DELETE FROM workflow_state
WHERE updated_at < NOW() - INTERVAL '7 days'
  AND items_processed < items_total;
```

### Best Practices

1. **Monitor checkpoint age**: PubMed WebEnv expires after 24 hours
2. **Review error counts**: If >10% failure rate, investigate root cause
3. **Validate resume integrity**: After resume, check first batch for duplicates
4. **Keep execution IDs unique**: Prevents checkpoint conflicts across runs

---

## 7. Managing Reviews

### Updating Review Criteria

If you need to revise PICO criteria or inclusion/exclusion rules mid-review:

#### Update PICO Framework
```sql
UPDATE reviews
SET
  pico = '{
    "population": "Updated population definition",
    "intervention": "Updated intervention definition",
    "comparator": "Updated comparator definition",
    "outcomes": ["Updated outcome 1", "Updated outcome 2"],
    "study_types": ["Updated study types"]
  }'::jsonb,
  protocol_version = protocol_version + 1,
  updated_at = NOW()
WHERE id = 'your-review-id-here';
```

#### Update Inclusion/Exclusion Criteria
```sql
UPDATE reviews
SET
  inclusion_criteria = '[
    "Updated criterion 1",
    "Updated criterion 2",
    "Updated criterion 3"
  ]'::jsonb,
  exclusion_criteria = '[
    "Updated exclusion 1",
    "Updated exclusion 2"
  ]'::jsonb,
  protocol_version = protocol_version + 1,
  updated_at = NOW()
WHERE id = 'your-review-id-here';
```

**Important**: Incrementing `protocol_version` maintains audit trail. Consider re-screening documents if criteria change significantly.

### Exporting Review Data

#### Export Complete Review Package
```bash
# Connect to PostgreSQL container
docker exec -it slr_postgres psql -U slr_user -d slr_database

# Export review metadata
\copy (SELECT * FROM reviews WHERE id = 'your-review-id-here') TO '/tmp/review_metadata.csv' CSV HEADER;

# Export all documents
\copy (SELECT * FROM documents WHERE review_id = 'your-review-id-here') TO '/tmp/documents.csv' CSV HEADER;

# Export screening decisions
\copy (SELECT * FROM screening_decisions WHERE document_id IN (SELECT id FROM documents WHERE review_id = 'your-review-id-here')) TO '/tmp/screening_decisions.csv' CSV HEADER;

# Export PRISMA flow
\copy (SELECT * FROM prisma_flow WHERE review_id = 'your-review-id-here') TO '/tmp/prisma_flow.csv' CSV HEADER;

# Export audit log
\copy (SELECT * FROM audit_log WHERE review_id = 'your-review-id-here' ORDER BY timestamp) TO '/tmp/audit_log.csv' CSV HEADER;

# Exit psql
\q

# Copy files from container to host
docker cp slr_postgres:/tmp/review_metadata.csv ./exports/
docker cp slr_postgres:/tmp/documents.csv ./exports/
docker cp slr_postgres:/tmp/screening_decisions.csv ./exports/
docker cp slr_postgres:/tmp/prisma_flow.csv ./exports/
docker cp slr_postgres:/tmp/audit_log.csv ./exports/
```

#### Export as JSON for Archiving
```sql
-- Complete review export as JSON
SELECT jsonb_build_object(
  'review', (SELECT row_to_json(r) FROM reviews r WHERE r.id = 'your-review-id-here'),
  'documents', (SELECT jsonb_agg(row_to_json(d)) FROM documents d WHERE d.review_id = 'your-review-id-here'),
  'screening_decisions', (SELECT jsonb_agg(row_to_json(sd)) FROM screening_decisions sd WHERE sd.document_id IN (SELECT id FROM documents WHERE review_id = 'your-review-id-here')),
  'prisma_flow', (SELECT row_to_json(pf) FROM prisma_flow pf WHERE pf.review_id = 'your-review-id-here' ORDER BY flow_version DESC LIMIT 1)
) as review_export;
```

### Audit Trail

Every decision and state change is logged in the `audit_log` table for transparency and reproducibility.

#### Query Audit History
```sql
SELECT
  entity_type,
  action,
  actor_type,
  actor_id,
  reasoning,
  timestamp
FROM audit_log
WHERE review_id = 'your-review-id-here'
ORDER BY timestamp DESC
LIMIT 100;
```

#### Filter by Entity Type
```sql
-- View all screening decision changes
SELECT
  entity_id,
  action,
  old_value->>'decision' as old_decision,
  new_value->>'decision' as new_decision,
  actor_type,
  reasoning,
  timestamp
FROM audit_log
WHERE review_id = 'your-review-id-here'
  AND entity_type = 'screening'
  AND action = 'update'
ORDER BY timestamp DESC;
```

#### Generate Reproducibility Report
```sql
-- Extract all AI agent versions used
SELECT DISTINCT
  (checkpoint_data->'metadata'->>'coordinator_agent_version') as agent_version,
  (checkpoint_data->'context'->>'model_name') as model_name,
  workflow_stage,
  MIN(created_at) as first_used,
  MAX(updated_at) as last_used
FROM workflow_state
WHERE review_id = 'your-review-id-here'
GROUP BY agent_version, model_name, workflow_stage
ORDER BY first_used;
```

### Deleting Reviews

To permanently delete a review and all associated data:

```sql
-- WARNING: This is irreversible. CASCADE deletes all related records.
DELETE FROM reviews WHERE id = 'your-review-id-here';
```

This cascades to:
- `documents`
- `document_embeddings`
- `screening_decisions`
- `workflow_state`
- `prisma_flow`
- `audit_log` (review_id references)

Consider **archiving** instead:
```sql
UPDATE reviews
SET status = 'archived'
WHERE id = 'your-review-id-here';
```

---

## 8. Troubleshooting

### Common Issues and Solutions

#### 1. Screening Workflow Hangs or Times Out

**Symptoms**: Workflow stops mid-batch, no progress for >5 minutes

**Possible Causes**:
- Ollama model not loaded
- LLM inference timeout
- Database connection lost

**Diagnosis**:
```bash
# Check Ollama status
docker logs slr_ollama --tail 50

# Verify model is loaded
docker exec slr_ollama ollama list

# Check n8n worker logs
docker logs slr_n8n_worker --tail 100

# Test database connection
docker exec slr_postgres pg_isready -U slr_user
```

**Solutions**:
- Restart Ollama: `docker compose restart ollama`
- Pull model if missing: `docker exec slr_ollama ollama pull llama3.1:70b`
- Increase LLM timeout in workflow: Edit AI agent node, set timeout to 120s
- Resume from checkpoint after service restart

#### 2. PubMed Search Returns 0 Results

**Symptoms**: `search_executions.results_count = 0` despite valid query

**Possible Causes**:
- Invalid query syntax
- NCBI API key rejected
- Date range too narrow
- MeSH term typo

**Diagnosis**:
```bash
# Test query directly on PubMed web interface
# Go to: https://pubmed.ncbi.nlm.nih.gov/

# Check API key validity
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=test&api_key=YOUR_API_KEY"

# Review search execution errors
docker logs slr_n8n --tail 100 | grep -i "pubmed\|esearch"
```

**Solutions**:
- Simplify query: Remove complex Boolean operators, test incrementally
- Verify API key in .env file matches NCBI account
- Expand date range or remove date filters
- Use PubMed Advanced Search Builder to validate query syntax

#### 3. Low Confidence Scores Across All Decisions

**Symptoms**: >50% of screening decisions have confidence <0.85

**Possible Causes**:
- Ambiguous PICO criteria
- LLM model not suitable for task
- Prompt template mismatch with review topic
- Abstracts lack detail for criteria evaluation

**Diagnosis**:
```sql
-- Check confidence distribution
SELECT
  FLOOR(confidence * 10) / 10 as confidence_bin,
  COUNT(*) as count
FROM screening_decisions
WHERE document_id IN (SELECT id FROM documents WHERE review_id = 'your-review-id-here')
  AND screening_stage = 'title_abstract'
GROUP BY confidence_bin
ORDER BY confidence_bin DESC;
```

**Solutions**:
- Refine PICO criteria: Make definitions more specific and measurable
- Review AI reasoning: Sample low-confidence cases, check for pattern in `rationale`
- Calibrate with human screening: Screen 50 documents manually, compare AI vs human decisions
- Adjust confidence threshold: Lower to 0.75 temporarily, review impact on false negatives
- Switch to larger model: If using Llama 3.1 8B, upgrade to 70B variant

#### 4. Checkpoint Resume Skips Documents

**Symptoms**: After resume, documents are skipped or re-processed

**Possible Causes**:
- `last_processed_id` points to wrong document
- Database transaction rollback left inconsistent state
- Multiple workflows running concurrently

**Diagnosis**:
```sql
-- Check checkpoint last_processed_id
SELECT
  checkpoint_data->'last_processed'->>'document_id' as last_id,
  updated_at,
  items_processed,
  items_total
FROM workflow_state
WHERE review_id = 'your-review-id-here'
ORDER BY updated_at DESC
LIMIT 1;

-- Verify screening decisions for that document
SELECT * FROM screening_decisions
WHERE document_id = 'last-processed-uuid-from-above'
ORDER BY created_at DESC;
```

**Solutions**:
- Clear checkpoint and restart stage: `DELETE FROM workflow_state WHERE review_id = 'your-review-id' AND workflow_stage = 'title_abstract_screening';`
- Manually set resume point: In webhook, specify exact `resume_from` UUID
- Prevent concurrent runs: Check `workflow_state` for active executions before triggering new workflow

#### 5. PRISMA Counts Don't Match Expectations

**Symptoms**: Records screened ≠ (records identified - duplicates removed)

**Possible Causes**:
- Workflow incomplete
- Duplicate detection not run
- Manual document insertions

**Diagnosis**:
```sql
-- Verify each stage count
SELECT
  'Identified' as stage,
  COUNT(*) as count
FROM documents
WHERE review_id = 'your-review-id-here'

UNION ALL

SELECT
  'Duplicates',
  COUNT(*)
FROM documents
WHERE review_id = 'your-review-id-here'
  AND is_duplicate = TRUE

UNION ALL

SELECT
  'Screened',
  COUNT(DISTINCT document_id)
FROM screening_decisions
WHERE document_id IN (SELECT id FROM documents WHERE review_id = 'your-review-id-here')
  AND screening_stage = 'title_abstract';
```

**Solutions**:
- Complete screening workflow: Ensure all non-duplicate documents have screening decisions
- Re-generate PRISMA flow: Trigger PRISMA generation workflow to recalculate counts
- Investigate orphan documents: Find documents without screening decisions, route to screening

#### 6. n8n Workflow Shows "Error: undefined"

**Symptoms**: Generic error message in n8n execution log

**Possible Causes**:
- Missing environment variable
- Invalid JSON in node parameter
- PostgreSQL connection timeout
- Missing n8n credential

**Diagnosis**:
```bash
# Check n8n logs for detailed error
docker logs slr_n8n --tail 200

# Verify environment variables
docker exec slr_n8n env | grep -E "DB_|N8N_|POSTGRES"

# Test PostgreSQL connection from n8n container
docker exec slr_n8n nc -zv postgres 5432
```

**Solutions**:
- Restart n8n: `docker compose restart n8n n8n-worker`
- Re-configure PostgreSQL credential in n8n UI: Settings > Credentials > SLR PostgreSQL
- Validate JSON syntax in Code nodes: Use JSONLint or VS Code formatter
- Check firewall/network: Ensure containers can communicate on Docker network

### Getting Help

If issues persist after troubleshooting:

1. **Collect diagnostics**:
   ```bash
   # Export logs
   docker logs slr_postgres > logs/postgres.log 2>&1
   docker logs slr_n8n > logs/n8n.log 2>&1
   docker logs slr_ollama > logs/ollama.log 2>&1

   # Export database state
   docker exec slr_postgres pg_dump -U slr_user -d slr_database --schema-only > schema_dump.sql
   ```

2. **Check GitHub Issues**: https://github.com/drseanwing/CritLit/issues

3. **Open a new issue** with:
   - CritLit version (check README.md)
   - Docker & Docker Compose versions (`docker --version`)
   - Workflow stage where error occurred
   - Relevant log excerpts (sanitize sensitive data)
   - Steps to reproduce

4. **Review documentation**:
   - [README.md](../README.md) for deployment
   - [Specifications.md](../Specifications.md) for architecture details
   - [Alpha_Test_Tasks.md](../Alpha_Test_Tasks.md) for known limitations

---

## Appendix: Quick Reference

### Essential SQL Queries

```sql
-- List all reviews
SELECT id, title, status, created_at FROM reviews ORDER BY created_at DESC;

-- Count documents by review
SELECT review_id, COUNT(*) as document_count
FROM documents
GROUP BY review_id;

-- Screening progress summary
SELECT
  r.title,
  COUNT(DISTINCT d.id) as total_documents,
  COUNT(DISTINCT sd.document_id) as screened_documents,
  ROUND((COUNT(DISTINCT sd.document_id)::numeric / COUNT(DISTINCT d.id) * 100)::numeric, 1) as progress_pct
FROM reviews r
JOIN documents d ON r.id = d.review_id
LEFT JOIN screening_decisions sd ON d.id = sd.document_id AND sd.screening_stage = 'title_abstract'
WHERE r.id = 'your-review-id-here'
GROUP BY r.title;

-- Find documents needing human review
SELECT d.title, sd.confidence, sd.decision, sd.rationale
FROM documents d
JOIN screening_decisions sd ON d.id = sd.document_id
WHERE d.review_id = 'your-review-id-here'
  AND sd.confidence < 0.85
ORDER BY sd.confidence ASC
LIMIT 20;
```

### Workflow Webhook Endpoints

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/webhook/slr-start` | Coordinator entry point | POST |
| `/webhook/slr-resume` | Resume from checkpoint | POST |
| `/webhook/slr-human-review` | Submit human review form | POST |

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | Database password |
| `N8N_USER` | Yes | n8n login username |
| `N8N_PASSWORD` | Yes | n8n login password |
| `N8N_ENCRYPTION_KEY` | Yes | Base64 key for credential encryption |
| `PUBMED_API_KEY` | Yes | NCBI E-utilities API key |
| `CONTACT_EMAIL` | Yes | Email for API compliance |
| `ANTHROPIC_API_KEY` | No | Claude API key |
| `OPENAI_API_KEY` | No | OpenAI API key |

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-25
**CritLit Version**: Alpha 1.0
**Maintainer**: CritLit Project Team

For technical specifications, see [Specifications.md](../Specifications.md).
For deployment instructions, see [README.md](../README.md).
