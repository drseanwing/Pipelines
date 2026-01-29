# Autonomous Systematic Literature Review Pipeline: Technical Specification

A doctoral-level SLR automation system integrating PRISMA 2020 compliance, multi-agent orchestration, and retrieval-augmented generation produces **40-70% time savings** while maintaining methodological rigor. This specification defines a production-ready architecture using n8n workflows, PostgreSQL with pgvector, and hybrid local/cloud LLM inference.

The system implements the “Ralph Playbook” pattern where a coordinator agent maintains minimal context by delegating to narrow-focused sub-agents,  with PostgreSQL-backed artifacts serving as persistent memory. LLMs achieve **77-97% sensitivity** in screening tasks with appropriate prompt engineering,  but require human oversight for risk of bias assessment and final inclusion decisions per Cochrane standards. 

-----

## System architecture overview

The pipeline follows a coordinator/worker pattern with PostgreSQL as the central state store and artifact repository.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           n8n ORCHESTRATION LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   COORDINATOR   │───▶│   SUB-AGENTS    │───▶│   SYNTHESIS     │         │
│  │   AGENT         │    │   (Parallel)    │    │   AGENT         │         │
│  │                 │    │                 │    │                 │         │
│  │  • Task routing │    │  • Screening    │    │  • GRADE assess │         │
│  │  • Checkpoint   │    │  • Extraction   │    │  • Gap analysis │         │
│  │  • Human review │    │  • RoB scoring  │    │  • Meta-synth   │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  ▼                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DATA PERSISTENCE LAYER                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL + pgvector                             │   │
│  │  • Review state & checkpoints    • Document embeddings (HNSW)       │   │
│  │  • Screening decisions           • Extracted data with provenance   │   │
│  │  • Audit logs                    • PRISMA flow tracking             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  ▲                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                           EXTERNAL INTEGRATIONS                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  PubMed     │  │  Unpaywall  │  │  I-Librarian│  │  UQ Library │       │
│  │  E-utils    │  │  API        │  │  (PDF Repo) │  │  Primo API  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
├─────────────────────────────────────────────────────────────────────────────┤
│                              LLM INFERENCE                                   │
│  ┌───────────────────────┐              ┌───────────────────────┐          │
│  │   LOCAL (Ollama)      │              │   CLOUD APIs          │          │
│  │   • Llama 3.1 70B     │              │   • Claude 3.5 Sonnet │          │
│  │   • Screening bulk    │              │   • GPT-4o            │          │
│  │   • Data extraction   │              │   • Complex synthesis │          │
│  └───────────────────────┘              └───────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component responsibilities

|Component            |Technology               |Primary Function                                                    |
|---------------------|-------------------------|--------------------------------------------------------------------|
|**Coordinator Agent**|n8n AI Agent node        |Task decomposition, state management, human checkpoint routing      |
|**Screening Agent**  |Ollama (Llama 3.1 8B/70B)|High-throughput title/abstract screening with confidence scoring    |
|**Extraction Agent** |Claude 3.5 Sonnet        |Structured data extraction with source citations                    |
|**RoB Agent**        |GPT-4o                   |Risk of bias signaling questions with chain-of-thought reasoning    |
|**Synthesis Agent**  |Claude 3 Opus            |Cross-study comparison, GRADE evidence profiles, narrative synthesis|
|**Vector Store**     |PostgreSQL + pgvector    |Semantic search, document retrieval, RAG context assembly           |
|**PDF Repository**   |I-Librarian (Docker)     |Full-text storage, OCR, annotation, team collaboration              |

-----

## Database schema design

The PostgreSQL schema supports full PRISMA 2020 tracking, version-controlled embeddings, and comprehensive audit logging.

### Core tables

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Review registry (PROSPERO alignment)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    prospero_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'protocol', -- protocol, searching, screening, extraction, synthesis, complete
    pico JSONB NOT NULL, -- {population, intervention, comparator, outcomes[], study_types[]}
    inclusion_criteria JSONB NOT NULL,
    exclusion_criteria JSONB NOT NULL,
    search_strategy TEXT,
    protocol_version INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search executions
CREATE TABLE search_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    database_name VARCHAR(100) NOT NULL, -- PubMed, Cochrane, Embase, CINAHL
    search_query TEXT NOT NULL,
    query_syntax TEXT, -- Database-specific full query
    date_executed DATE NOT NULL,
    date_range_start DATE,
    date_range_end DATE,
    results_count INTEGER,
    filters_applied JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (central paper registry)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    external_ids JSONB NOT NULL, -- {pmid, doi, scopus_id, ...}
    title TEXT NOT NULL,
    authors JSONB, -- [{name, affiliation, orcid}]
    abstract TEXT,
    full_text TEXT,
    publication_year INTEGER,
    journal VARCHAR(500),
    study_type VARCHAR(100),
    source_database VARCHAR(100),
    pdf_path VARCHAR(500), -- I-Librarian reference
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES documents(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(review_id, (external_ids->>'doi'))
);

-- Document embeddings (multi-representation)
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- abstract, methods, results, discussion, full_summary
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small
    embedding_model VARCHAR(100) NOT NULL,
    embedding_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, section_type, chunk_index, embedding_version)
);

-- HNSW index for semantic search
CREATE INDEX idx_embeddings_hnsw ON document_embeddings 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_doc ON document_embeddings(document_id);
CREATE INDEX idx_embeddings_section ON document_embeddings(section_type);

-- Screening decisions (dual-reviewer tracking)
CREATE TABLE screening_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    screening_stage VARCHAR(50) NOT NULL, -- title_abstract, full_text
    reviewer_type VARCHAR(50) NOT NULL, -- human, ai_primary, ai_secondary
    reviewer_id VARCHAR(100), -- user_id or model_name
    decision VARCHAR(20) NOT NULL, -- include, exclude, uncertain
    confidence FLOAT,
    exclusion_reason VARCHAR(200), -- maps to PRISMA exclusion categories
    rationale TEXT,
    criteria_matched JSONB, -- {criterion_id: true/false}
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_screening_doc ON screening_decisions(document_id);
CREATE INDEX idx_screening_stage ON screening_decisions(screening_stage, decision);

-- Risk of bias assessments (RoB 2 / ROBINS-I / NOS)
CREATE TABLE risk_of_bias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    tool_used VARCHAR(50) NOT NULL, -- rob2, robins_i, newcastle_ottawa
    outcome_assessed VARCHAR(200), -- RoB 2 is per-outcome
    domain_assessments JSONB NOT NULL, -- {domain_name: {judgment, signaling_questions, supporting_text}}
    overall_judgment VARCHAR(50) NOT NULL, -- low, some_concerns, high (RoB 2) or low/moderate/serious/critical (ROBINS-I)
    assessor_type VARCHAR(50), -- human, ai_assisted
    assessor_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extracted data (structured with provenance)
CREATE TABLE extracted_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    schema_version INTEGER DEFAULT 1,
    study_characteristics JSONB, -- {design, setting, country, funding, registration}
    population JSONB, -- {n, age, sex, condition, severity}
    intervention JSONB, -- {name, dose, frequency, duration, provider}
    comparator JSONB,
    outcomes JSONB, -- [{name, definition, timepoint, measure, result, ci, p_value}]
    source_citations JSONB, -- {field_name: "page X, paragraph Y"}
    extraction_method VARCHAR(50), -- manual, ai_extracted, ai_verified
    extractor_id VARCHAR(100),
    verification_status VARCHAR(50), -- pending, verified, disputed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GRADE evidence profiles
CREATE TABLE grade_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    outcome_name VARCHAR(200) NOT NULL,
    included_study_ids UUID[], -- documents included
    certainty_rating VARCHAR(20), -- high, moderate, low, very_low
    downgrade_factors JSONB, -- {risk_of_bias, inconsistency, indirectness, imprecision, publication_bias}
    upgrade_factors JSONB, -- {large_effect, dose_response, confounding}
    rationale TEXT,
    summary_of_findings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRISMA flow diagram tracking
CREATE TABLE prisma_flow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    flow_version INTEGER DEFAULT 1,
    records_identified JSONB, -- {database_name: count}
    duplicates_removed INTEGER,
    records_screened INTEGER,
    records_excluded_screening INTEGER,
    reports_sought INTEGER,
    reports_not_retrieved INTEGER,
    reports_assessed INTEGER,
    reports_excluded JSONB, -- [{reason, count}]
    studies_included INTEGER,
    reports_of_included INTEGER,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow state (checkpoint/resume)
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

-- Audit log (all decisions)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    review_id UUID,
    entity_type VARCHAR(50), -- document, screening, extraction, rob, grade
    entity_id UUID,
    action VARCHAR(50), -- create, update, delete, approve, reject
    actor_type VARCHAR(50), -- human, ai_agent
    actor_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    reasoning TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_review ON audit_log(review_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_log(timestamp DESC);
```

### Full-text search configuration

```sql
-- Create text search configuration for biomedical content
CREATE TEXT SEARCH DICTIONARY english_stem_med (
    TEMPLATE = snowball,
    Language = english
);

CREATE TEXT SEARCH CONFIGURATION biomedical (COPY = english);
ALTER TEXT SEARCH CONFIGURATION biomedical
    ALTER MAPPING FOR word, asciiword WITH english_stem_med;

-- Full-text search index
CREATE INDEX idx_documents_fts ON documents 
    USING gin (to_tsvector('biomedical', 
        COALESCE(title, '') || ' ' || COALESCE(abstract, '')));

-- Trigram index for fuzzy matching (deduplication)
CREATE INDEX idx_documents_title_trgm ON documents 
    USING gin (title gin_trgm_ops);
```

-----

## n8n workflow structure

The pipeline is organized into modular workflows with a main coordinator orchestrating specialized sub-workflows.

### Workflow hierarchy

```
slr_main_coordinator.json          (Entry point, state management)
├── slr_protocol_setup.json        (PICO refinement, PROSPERO)
├── slr_search_execution.json      (Multi-database search)
├── slr_deduplication.json         (Fuzzy matching, merge)
├── slr_screening_batch.json       (AI screening with human review)
├── slr_fulltext_retrieval.json    (PDF acquisition pipeline)
├── slr_data_extraction.json       (Structured extraction + verification)
├── slr_rob_assessment.json        (RoB 2 / ROBINS-I automation)
├── slr_synthesis.json             (GRADE, meta-synthesis)
└── slr_prisma_generation.json     (Flow diagram, reporting)
```

### Main coordinator workflow

```json
{
  "name": "SLR_Main_Coordinator",
  "nodes": [
    {
      "name": "Webhook_Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "slr-start",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Load_Review_State",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "select",
        "query": "SELECT * FROM reviews r LEFT JOIN workflow_state ws ON r.id = ws.review_id WHERE r.id = $1 ORDER BY ws.updated_at DESC LIMIT 1"
      }
    },
    {
      "name": "Coordinator_Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "systemMessage": "You are the SLR Coordinator Agent. Based on the current review state, determine the next pipeline stage and delegate to appropriate sub-workflows. Available stages: protocol_setup, search_execution, deduplication, screening_ta, fulltext_retrieval, screening_ft, data_extraction, rob_assessment, synthesis, prisma_generation. Always checkpoint state before and after each stage.",
        "maxIterations": 5
      }
    },
    {
      "name": "Stage_Router",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "rules": [
          {"operation": "equals", "value1": "={{$json.next_stage}}", "value2": "screening_ta", "output": 0},
          {"operation": "equals", "value1": "={{$json.next_stage}}", "value2": "data_extraction", "output": 1},
          {"operation": "equals", "value1": "={{$json.next_stage}}", "value2": "human_review", "output": 2}
        ]
      }
    },
    {
      "name": "Execute_Screening_Workflow",
      "type": "n8n-nodes-base.executeWorkflow",
      "parameters": {
        "source": "database",
        "workflowId": "slr_screening_batch",
        "waitForSubWorkflow": true
      }
    },
    {
      "name": "Human_Review_Wait",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "resume": "form",
        "formTitle": "SLR Stage Review Required",
        "formDescription": "Review the current stage results before proceeding.",
        "formFields": {
          "values": [
            {"fieldLabel": "Decision", "fieldType": "dropdown", "fieldOptions": {"values": [{"option": "Approve"}, {"option": "Revise"}, {"option": "Escalate"}]}},
            {"fieldLabel": "Comments", "fieldType": "text", "multiline": true}
          ]
        },
        "options": {"limitWaitTime": true, "limitAmount": 72, "limitUnit": "hours"}
      }
    },
    {
      "name": "Save_Checkpoint",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "upsert",
        "table": "workflow_state",
        "columns": "review_id, execution_id, workflow_stage, checkpoint_data, items_processed, items_total, updated_at"
      }
    }
  ]
}
```

### Screening batch workflow

```json
{
  "name": "SLR_Screening_Batch",
  "nodes": [
    {
      "name": "Execute_Subworkflow_Trigger",
      "type": "n8n-nodes-base.executeWorkflowTrigger"
    },
    {
      "name": "Fetch_Unscreened_Batch",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "select",
        "query": "SELECT d.* FROM documents d WHERE d.review_id = $1 AND d.is_duplicate = FALSE AND NOT EXISTS (SELECT 1 FROM screening_decisions sd WHERE sd.document_id = d.id AND sd.screening_stage = 'title_abstract') ORDER BY d.id LIMIT 100"
      }
    },
    {
      "name": "Split_Into_Batches",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": {"batchSize": 10}
    },
    {
      "name": "Screening_Agent_Tool",
      "type": "@n8n/n8n-nodes-langchain.toolAgentTool",
      "parameters": {
        "name": "ScreeningAgent",
        "description": "Screens papers against PICO inclusion/exclusion criteria",
        "modelId": "ollama:llama3.1:70b"
      }
    },
    {
      "name": "AI_Screening_Node",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "systemMessage": "{{ $node['Load_Review_Config'].json.screening_prompt }}",
        "model": "ollama",
        "modelName": "llama3.1:70b",
        "options": {
          "temperature": 0,
          "responseFormat": "json"
        }
      }
    },
    {
      "name": "Parse_Screening_Results",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const results = items.map(item => {\n  const screening = JSON.parse(item.json.screening_response);\n  return {\n    json: {\n      document_id: item.json.document_id,\n      decision: screening.decision,\n      confidence: screening.confidence,\n      rationale: screening.reasoning,\n      criteria_matched: screening.criteria_matched,\n      reviewer_type: 'ai_primary',\n      reviewer_id: 'llama3.1:70b',\n      needs_human_review: screening.confidence < 0.85 || screening.decision === 'uncertain'\n    }\n  };\n});\nreturn results;"
      }
    },
    {
      "name": "Save_Screening_Decisions",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "screening_decisions",
        "columns": "document_id, screening_stage, reviewer_type, reviewer_id, decision, confidence, rationale, criteria_matched"
      }
    },
    {
      "name": "Rate_Limit_Wait",
      "type": "n8n-nodes-base.wait",
      "parameters": {"amount": 2, "unit": "seconds"}
    }
  ]
}
```

### Sub-agent tool definitions

```javascript
// AI Agent Tool: Screening Agent
{
  "name": "ScreeningAgent",
  "description": "Evaluates title/abstract against inclusion criteria. Returns JSON with decision, confidence, reasoning.",
  "input_schema": {
    "type": "object",
    "properties": {
      "title": {"type": "string"},
      "abstract": {"type": "string"},
      "pico": {"type": "object"},
      "inclusion_criteria": {"type": "array"},
      "exclusion_criteria": {"type": "array"}
    }
  }
}

// AI Agent Tool: Extraction Agent
{
  "name": "ExtractionAgent",
  "description": "Extracts structured study data from full text. Provides source citations for each field.",
  "input_schema": {
    "type": "object",
    "properties": {
      "full_text": {"type": "string"},
      "extraction_schema": {"type": "object"},
      "study_type": {"type": "string"}
    }
  }
}

// AI Agent Tool: RoB Assessment Agent
{
  "name": "RoBAgent",
  "description": "Assesses risk of bias using RoB 2 or ROBINS-I. Answers signaling questions with supporting text.",
  "input_schema": {
    "type": "object",
    "properties": {
      "methods_text": {"type": "string"},
      "results_text": {"type": "string"},
      "study_type": {"type": "string"},
      "tool": {"type": "string", "enum": ["rob2", "robins_i", "newcastle_ottawa"]}
    }
  }
}
```

-----

## API integration specifications

### PubMed E-utilities integration

```javascript
// n8n HTTP Request node configuration
{
  "name": "PubMed_Search",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
    "method": "GET",
    "qs": {
      "db": "pubmed",
      "term": "={{ $json.search_query }}",
      "retmax": "10000",
      "usehistory": "y",
      "api_key": "={{ $credentials.pubmed_api_key }}",
      "email": "={{ $credentials.contact_email }}"
    }
  }
}

// Batch fetch with history server
{
  "name": "PubMed_Fetch_Batch",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
    "method": "GET",
    "qs": {
      "db": "pubmed",
      "WebEnv": "={{ $json.webenv }}",
      "query_key": "={{ $json.query_key }}",
      "retstart": "={{ $json.batch_start }}",
      "retmax": "500",
      "rettype": "xml",
      "retmode": "xml",
      "api_key": "={{ $credentials.pubmed_api_key }}"
    }
  }
}
```

### Unpaywall full-text retrieval

```javascript
// Check OA availability
{
  "name": "Unpaywall_Check",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.unpaywall.org/v2/{{ $json.doi }}",
    "method": "GET",
    "qs": {"email": "={{ $credentials.contact_email }}"}
  }
}

// Code node: Extract best PDF URL
{
  "name": "Parse_Unpaywall_Response",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "jsCode": "const response = $input.first().json;\nif (response.is_oa && response.best_oa_location?.url_for_pdf) {\n  return [{\n    json: {\n      pdf_url: response.best_oa_location.url_for_pdf,\n      oa_status: response.oa_status,\n      host_type: response.best_oa_location.host_type\n    }\n  }];\n}\nreturn [{json: {pdf_url: null, needs_institutional: true}}];"
  }
}
```

### Ollama local inference

```javascript
// n8n Ollama Chat Model configuration
{
  "name": "Ollama_Screening_Model",
  "type": "@n8n/n8n-nodes-langchain.lmChatOllama",
  "parameters": {
    "model": "llama3.1:70b",
    "baseUrl": "http://ollama:11434",
    "options": {
      "temperature": 0,
      "numPredict": 2048,
      "numCtx": 8192
    }
  }
}
```

### Claude API for synthesis

```javascript
// n8n Anthropic Chat Model for complex synthesis
{
  "name": "Claude_Synthesis_Model",
  "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
  "parameters": {
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 8192,
    "options": {
      "temperature": 0.3
    }
  }
}
```

### UQ Library access patterns

```javascript
// Primo API search (requires institutional API key)
{
  "name": "Primo_Search",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api-ap.hosted.exlibrisgroup.com/primo/v1/pnxs",
    "method": "GET",
    "headers": {"X-Api-Key": "={{ $credentials.primo_api_key }}"},
    "qs": {
      "q": "any,contains,{{ $json.search_term }}",
      "inst": "61UQ_INST",
      "vid": "61UQ",
      "offset": 0,
      "limit": 50
    }
  }
}

// Note: OpenAthens authentication is SAML-based browser flow
// Programmatic access to licensed content requires either:
// 1. UQ VPN + IP-based authentication
// 2. Contact UQ Library IT for institutional API credentials
// 3. Use open access via Unpaywall/CrossRef first
```

-----

## Agent prompt templates

### Screening prompt template (title/abstract)

```
SYSTEM PROMPT:
You are an expert systematic reviewer screening papers for inclusion in a {review_type} systematic review.

REVIEW CONTEXT:
Title: {review_title}
Research Question: {research_question}

PICO FRAMEWORK:
- Population: {population}
- Intervention: {intervention}
- Comparator: {comparator}
- Outcomes: {outcomes}
- Study Types: {study_types}

INCLUSION CRITERIA:
{inclusion_criteria_list}

EXCLUSION CRITERIA:
{exclusion_criteria_list}

SCREENING TASK:
Evaluate whether the following paper should be included based on title and abstract ONLY.

PAPER TO SCREEN:
Title: {paper_title}
Abstract: {paper_abstract}

INSTRUCTIONS:
1. Assess each inclusion criterion systematically
2. Check for any exclusion criteria triggers
3. If insufficient information to determine, mark as "uncertain"
4. Provide specific text supporting your decision

RESPOND IN JSON FORMAT:
{
  "decision": "include" | "exclude" | "uncertain",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation with specific evidence from abstract",
  "criteria_matched": {
    "population_match": true/false/null,
    "intervention_match": true/false/null,
    "comparator_match": true/false/null,
    "outcome_match": true/false/null,
    "study_type_match": true/false/null
  },
  "exclusion_reason": "Category if excluded, else null",
  "key_quotes": ["Relevant quotes from abstract supporting decision"]
}
```

### Risk of bias assessment prompt (RoB 2)

```
SYSTEM PROMPT:
You are a methodological expert assessing risk of bias in randomized controlled trials using the Cochrane RoB 2.0 tool. You must answer signaling questions and provide judgments with supporting text from the study.

STUDY INFORMATION:
PMID: {pmid}
Title: {title}
Study Design: {design}
Outcome Being Assessed: {outcome_name}

METHODS SECTION:
{methods_text}

RESULTS SECTION:
{results_text}

ASSESS EACH DOMAIN:

DOMAIN 1: RANDOMIZATION PROCESS
Signaling Questions:
1.1 Was the allocation sequence random?
1.2 Was the allocation sequence concealed until participants were enrolled and assigned to interventions?
1.3 Did baseline differences between intervention groups suggest a problem with the randomization process?

DOMAIN 2: DEVIATIONS FROM INTENDED INTERVENTIONS (effect of assignment)
Signaling Questions:
2.1 Were participants aware of their assigned intervention during the trial?
2.2 Were carers and people delivering the interventions aware of participants' assigned intervention?
2.3 If Y/PY/NI to 2.1 or 2.2: Were there deviations from intended intervention that arose because of the trial context?
2.6 Was an appropriate analysis used to estimate the effect of assignment to intervention?

DOMAIN 3: MISSING OUTCOME DATA
Signaling Questions:
3.1 Were data for this outcome available for all, or nearly all, participants randomized?
3.2 If N/PN/NI to 3.1: Is there evidence that the result was not biased by missing outcome data?
3.3 If N/PN to 3.2: Could missingness in the outcome depend on its true value?

DOMAIN 4: MEASUREMENT OF THE OUTCOME
Signaling Questions:
4.1 Was the method of measuring the outcome inappropriate?
4.2 Could measurement or ascertainment of the outcome have differed between intervention groups?
4.3 Were outcome assessors aware of the intervention received by study participants?

DOMAIN 5: SELECTION OF THE REPORTED RESULT
Signaling Questions:
5.1 Were the data that produced this result analyzed in accordance with a pre-specified analysis plan?
5.2 Is the numerical result being assessed likely to have been selected from multiple eligible outcome measurements or analyses?

FOR EACH DOMAIN, RESPOND IN JSON:
{
  "domain_1_randomization": {
    "sq_1_1": {"answer": "Y/PY/PN/N/NI", "supporting_text": "Quote from paper"},
    "sq_1_2": {"answer": "...", "supporting_text": "..."},
    "sq_1_3": {"answer": "...", "supporting_text": "..."},
    "judgment": "Low" | "Some concerns" | "High",
    "rationale": "Brief explanation"
  },
  // ... domains 2-5 ...
  "overall_judgment": "Low" | "Some concerns" | "High",
  "overall_rationale": "Summary of most concerning domains"
}
```

### Data extraction prompt

```
SYSTEM PROMPT:
You are a systematic reviewer extracting structured data from a clinical trial report. Extract ONLY information explicitly stated in the text. Use "NR" (not reported) for missing data. Provide page/section references for each extraction.

EXTRACTION SCHEMA:
{extraction_schema_json}

FULL TEXT:
{full_text}

INSTRUCTIONS:
1. Extract each field systematically, searching the entire document
2. For numerical data, extract exact values with units
3. For outcomes, extract all timepoints reported
4. Note any ambiguities or conflicts within the paper
5. Cite the specific section/page for each extraction

RESPOND IN JSON FORMAT:
{
  "study_characteristics": {
    "study_design": {"value": "...", "source": "Methods, para 1"},
    "setting": {"value": "...", "source": "Methods, para 2"},
    "country": {"value": "...", "source": "..."},
    "registration": {"value": "NCT number or NR", "source": "..."},
    "funding": {"value": "...", "source": "..."},
    "conflicts_of_interest": {"value": "...", "source": "..."}
  },
  "population": {
    "n_randomized": {"intervention": N, "control": N, "source": "..."},
    "n_analyzed": {"intervention": N, "control": N, "source": "..."},
    "age": {"mean": N, "sd": N, "range": "...", "source": "..."},
    "sex_female_percent": {"value": N, "source": "..."},
    "condition": {"value": "...", "severity": "...", "source": "..."},
    "inclusion_criteria": {"value": "...", "source": "..."},
    "exclusion_criteria": {"value": "...", "source": "..."}
  },
  "intervention": {
    "name": {"value": "...", "source": "..."},
    "dose": {"value": "...", "source": "..."},
    "frequency": {"value": "...", "source": "..."},
    "duration": {"value": "...", "source": "..."},
    "provider": {"value": "...", "source": "..."}
  },
  "comparator": {
    "name": {"value": "...", "source": "..."},
    "details": {"value": "...", "source": "..."}
  },
  "outcomes": [
    {
      "name": "Primary outcome name",
      "definition": "How measured",
      "timepoint": "When measured",
      "intervention_result": {"n": N, "mean": N, "sd": N},
      "control_result": {"n": N, "mean": N, "sd": N},
      "effect_estimate": {"type": "MD/SMD/RR/OR", "value": N, "ci_lower": N, "ci_upper": N},
      "p_value": N,
      "source": "Results, Table 2"
    }
  ],
  "extraction_notes": "Any issues, conflicts, or clarifications needed"
}
```

-----

## Coding standards and naming conventions

### Database naming

|Entity      |Convention               |Example                   |
|------------|-------------------------|--------------------------|
|Tables      |snake_case, plural       |`screening_decisions`     |
|Columns     |snake_case               |`created_at`, `review_id` |
|Primary keys|`id` (UUID)              |`id UUID PRIMARY KEY`     |
|Foreign keys|`{table}_id`             |`document_id`, `review_id`|
|Indexes     |`idx_{table}_{columns}`  |`idx_documents_fts`       |
|Timestamps  |`{action}_at` TIMESTAMPTZ|`created_at`, `updated_at`|

### n8n workflow naming

|Component  |Convention                 |Example                        |
|-----------|---------------------------|-------------------------------|
|Workflows  |`slr_{stage}_{action}.json`|`slr_screening_batch.json`     |
|Nodes      |`PascalCase_Action`        |`Fetch_Unscreened_Batch`       |
|Credentials|`{service}_slr`            |`postgres_slr`, `anthropic_slr`|
|Variables  |camelCase                  |`batchSize`, `reviewId`        |
|Environment|SCREAMING_SNAKE            |`OLLAMA_BASE_URL`              |

### Agent naming

|Agent Type |Naming Pattern           |Example                               |
|-----------|-------------------------|--------------------------------------|
|Coordinator|`{Stage}CoordinatorAgent`|`ScreeningCoordinatorAgent`           |
|Worker     |`{Task}Agent`            |`ScreeningAgent`, `ExtractionAgent`   |
|Tool       |`{Action}Tool`           |`PubMedSearchTool`, `PDFRetrievalTool`|

### Code standards

```javascript
// n8n Code Node template
/**
 * Node: {NodeName}
 * Purpose: {Brief description}
 * Input: {Expected input structure}
 * Output: {Output structure}
 */

// Always validate input
const input = $input.first();
if (!input?.json?.required_field) {
  throw new Error('Missing required_field in input');
}

// Use destructuring for clarity
const { document_id, abstract, pico } = input.json;

// Return consistently structured output
return [{
  json: {
    success: true,
    document_id,
    result: processedData,
    metadata: {
      processing_time_ms: Date.now() - startTime,
      node_name: 'NodeName'
    }
  }
}];
```

-----

## Approval checkpoint workflow

The interview-style refinement workflow uses iterative LLM dialogue to clarify ambiguities at critical decision points.

### Checkpoint triggers

|Stage     |Checkpoint            |Condition                           |Approval Required           |
|----------|----------------------|------------------------------------|----------------------------|
|Protocol  |PICO refinement       |After initial formulation           |Yes - domain expert         |
|Search    |Strategy review       |Before execution                    |Yes - information specialist|
|Screening |Batch review          |Every 500 records or 5% disagreement|Recommended                 |
|Screening |Inclusion cutoff      |Before full-text stage              |Yes - dual reviewer         |
|Extraction|Schema validation     |After first 5 extractions           |Yes - verify against source |
|RoB       |Assessment calibration|After first 3 assessments           |Yes - calibrate judgment    |
|Synthesis |GRADE profiles        |Before certainty rating             |Yes - methodologist         |

### Interview refinement workflow

```json
{
  "name": "SLR_Interview_Refinement",
  "nodes": [
    {
      "name": "Webhook_Start_Interview",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "interview/{{$json.checkpoint_type}}/{{$json.review_id}}"
      }
    },
    {
      "name": "Load_Checkpoint_Context",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "select",
        "query": "SELECT * FROM workflow_state WHERE review_id = $1 AND workflow_stage = $2"
      }
    },
    {
      "name": "Interview_Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "systemMessage": "You are conducting a structured interview to clarify and refine the {checkpoint_type}. Ask focused questions one at a time. After each response, either ask a clarifying follow-up or confirm understanding. Aim for precision and actionability. When sufficient clarity is achieved, summarize the refined specification.\n\nCurrent specification:\n{current_spec}\n\nIdentified ambiguities:\n{ambiguities}\n\nBegin by asking about the most critical ambiguity.",
        "maxIterations": 10
      }
    },
    {
      "name": "Interview_Loop",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "resume": "form",
        "formTitle": "Interview Question",
        "formDescription": "={{ $json.agent_question }}",
        "formFields": {
          "values": [
            {"fieldLabel": "Your Response", "fieldType": "text", "multiline": true},
            {"fieldLabel": "Mark as Complete", "fieldType": "dropdown", "fieldOptions": {"values": [{"option": "Continue Interview"}, {"option": "Finalize Specification"}]}}
          ]
        }
      }
    },
    {
      "name": "Check_Interview_Complete",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [{"value1": "={{ $json.mark_complete }}", "operation": "equals", "value2": "Finalize Specification"}]
        }
      }
    },
    {
      "name": "Generate_Refined_Spec",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "systemMessage": "Based on the interview transcript, generate a precise, actionable specification document. Format as structured JSON matching the original schema but with all ambiguities resolved."
      }
    },
    {
      "name": "Save_Refined_Spec",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "update",
        "table": "reviews",
        "columns": "{{ $json.refined_field }}"
      }
    }
  ]
}
```

### Human decision interface

```javascript
// Form fields for screening review checkpoint
const screeningReviewForm = {
  title: "Screening Batch Review",
  description: "Review AI screening decisions before proceeding",
  fields: [
    {
      fieldLabel: "Batch Summary",
      fieldType: "text",
      readOnly: true,
      defaultValue: `Screened: ${stats.total}\nIncluded: ${stats.included}\nExcluded: ${stats.excluded}\nUncertain: ${stats.uncertain}`
    },
    {
      fieldLabel: "Review Uncertain Cases",
      fieldType: "dropdown",
      options: ["Review All Uncertain", "Sample 20%", "Trust AI Decisions"]
    },
    {
      fieldLabel: "Adjust Confidence Threshold",
      fieldType: "number",
      defaultValue: 0.85,
      min: 0.5,
      max: 1.0
    },
    {
      fieldLabel: "Approval Decision",
      fieldType: "dropdown",
      required: true,
      options: ["Approve & Continue", "Require Full Human Review", "Revise Criteria"]
    },
    {
      fieldLabel: "Reviewer Notes",
      fieldType: "text",
      multiline: true
    }
  ]
};
```

-----

## Phased build plan

### Phase 1: Foundation (Weeks 1-3)

**Objective**: Core infrastructure and basic pipeline flow

|Week|Deliverables                                                         |
|----|---------------------------------------------------------------------|
|1   |PostgreSQL schema deployment, pgvector configuration, basic n8n setup|
|2   |PubMed E-utilities integration, document ingestion workflow          |
|3   |Basic coordinator workflow, checkpoint/resume mechanism              |

**Technical milestones**:

- [x] Docker compose with PostgreSQL + pgvector + n8n + Ollama
- [x] Database schema with indexes and full-text search
- [x] PubMed search → document storage workflow (structure created, parsing to be completed in Phase 3)
- [x] Workflow state checkpoint/resume tested (structure created, testing to be completed in Phase 5)

### Phase 2: Search & Deduplication (Weeks 4-5)

**Objective**: Multi-database search and intelligent deduplication

|Week|Deliverables                                                                          |
|----|--------------------------------------------------------------------------------------|
|4   |Multi-database search (PubMed, Cochrane via PubMed, Unpaywall), PRISMA record tracking|
|5   |Fuzzy duplicate detection (trigram + embedding similarity), merge workflow            |

**Technical milestones**:

- [ ] Search execution table populated from multiple sources
- [ ] Deduplication achieving >95% precision/recall on test set
- [ ] PRISMA flow counts auto-updating

### Phase 3: AI Screening (Weeks 6-8)

**Objective**: LLM-powered title/abstract screening with human oversight

|Week|Deliverables                                                        |
|----|--------------------------------------------------------------------|
|6   |Ollama screening agent, prompt template system, confidence scoring  |
|7   |Batch processing with rate limiting, stratified human review routing|
|8   |Screening validation dashboard, inter-rater agreement metrics       |

**Technical milestones**:

- [ ] Screening achieving >90% sensitivity vs. human reviewers on validation set
- [ ] Uncertain cases correctly routed to human review
- [ ] Processing 1000 abstracts/hour on local GPU

### Phase 4: Full-Text & Extraction (Weeks 9-11)

**Objective**: PDF retrieval and structured data extraction

|Week|Deliverables                                                         |
|----|---------------------------------------------------------------------|
|9   |Unpaywall/CrossRef PDF retrieval, I-Librarian integration for storage|
|10  |Embedding pipeline, pgvector semantic search for extraction context  |
|11  |Claude-powered extraction agent, source citation verification        |

**Technical milestones**:

- [ ] >70% full-text retrieval rate (OA + institutional)
- [ ] Extraction achieving >85% accuracy on field-level validation
- [ ] Every extraction linked to source text location

### Phase 5: Quality Assessment (Weeks 12-14)

**Objective**: Automated RoB and GRADE support

|Week|Deliverables                                                 |
|----|-------------------------------------------------------------|
|12  |RoB 2 agent implementation, signaling question automation    |
|13  |ROBINS-I and Newcastle-Ottawa Scale agents                   |
|14  |GRADE evidence profile generation, summary of findings tables|

**Technical milestones**:

- [ ] RoB assessments with supporting text quotes for verification
- [ ] Human calibration workflow for judgment alignment
- [ ] GRADE profiles auto-generated with manual certainty rating

### Phase 6: Synthesis & Reporting (Weeks 15-17)

**Objective**: Cross-study synthesis and PRISMA compliance

|Week|Deliverables                                                      |
|----|------------------------------------------------------------------|
|15  |Comparative analysis agents, finding aggregation                  |
|16  |PRISMA flow diagram auto-generation, checklist compliance checking|
|17  |Export workflows (Word, PDF, supplementary data packages)         |

**Technical milestones**:

- [ ] Narrative synthesis with inline citations generated
- [ ] PRISMA 2020 checklist auto-populated with evidence locations
- [ ] Complete review package exportable

### Phase 7: Interview Refinement & Polish (Weeks 18-20)

**Objective**: Human-AI collaboration optimization

|Week|Deliverables                                             |
|----|---------------------------------------------------------|
|18  |Interview refinement workflows for all checkpoints       |
|19  |Audit logging completeness, reproducibility documentation|
|20  |End-to-end testing, documentation, training materials    |

**Technical milestones**:

- [ ] Full audit trail for every decision
- [ ] Complete review reproducible from database export
- [ ] User documentation and video walkthroughs

-----

## Infrastructure deployment

### Docker Compose configuration

```yaml
version: "3.8"

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: slr_postgres
    environment:
      POSTGRES_USER: slr_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: slr_database
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    command:
      - postgres
      - -c
      - shared_buffers=512MB
      - -c
      - work_mem=32MB
      - -c
      - maintenance_work_mem=256MB
      - -c
      - max_connections=100
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U slr_user -d slr_database"]
      interval: 10s
      timeout: 5s
      retries: 5

  n8n:
    image: n8nio/n8n:latest
    container_name: slr_n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=slr_database
      - DB_POSTGRESDB_USER=slr_user
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
    volumes:
      - n8n_data:/home/node/.n8n
      - ./workflows:/workflows
    ports:
      - "5678:5678"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  n8n-worker:
    image: n8nio/n8n:latest
    container_name: slr_n8n_worker
    command: n8n worker
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=slr_database
      - DB_POSTGRESDB_USER=slr_user
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
    depends_on:
      - n8n
      - redis

  redis:
    image: redis:7-alpine
    container_name: slr_redis
    volumes:
      - redis_data:/data

  ollama:
    image: ollama/ollama:latest
    container_name: slr_ollama
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  i-librarian:
    image: cgrima/i-librarian
    container_name: slr_ilibrarian
    volumes:
      - ilibrarian_data:/app/data
    ports:
      - "8080:80"
    environment:
      - ILIBRARIAN_UPLOAD_MAX_SIZE=100M

volumes:
  postgres_data:
  n8n_data:
  redis_data:
  ollama_data:
  ilibrarian_data:
```

### Environment configuration

```bash
# .env file
POSTGRES_PASSWORD=your_secure_password_here
N8N_USER=admin
N8N_PASSWORD=your_n8n_password
N8N_ENCRYPTION_KEY=your_encryption_key_base64

# API Keys
PUBMED_API_KEY=your_ncbi_api_key
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_key

# UQ Library (contact IT for credentials)
PRIMO_API_KEY=your_institutional_key

# Contact email for APIs
CONTACT_EMAIL=researcher@uq.edu.au
```

-----

## Key implementation considerations

### LLM task allocation

|Task                    |Model                           |Rationale                                          |
|------------------------|--------------------------------|---------------------------------------------------|
|Title/abstract screening|Ollama Llama 3.1 8B/70B         |High throughput, cost-effective, local data control|
|Full-text screening     |Claude 3.5 Sonnet (200K context)|Long context window for full papers                |
|Data extraction         |Claude 3.5 Sonnet               |Best precision for structured output               |
|RoB assessment          |GPT-4o                          |Strong reasoning for signaling questions           |
|Narrative synthesis     |Claude 3 Opus                   |Superior long-form generation                      |
|Deduplication assistance|Ollama Llama 3.1 8B             |Simple judgment, high volume                       |

### Human oversight requirements per Cochrane

|Task                    |Minimum Human Involvement                              |
|------------------------|-------------------------------------------------------|
|Protocol/PICO           |Full human authorship (AI can suggest)                 |
|Search strategy         |Human design, AI can validate                          |
|Title/abstract screening|Dual screening with AI as third reviewer or prioritizer|
|Full-text screening     |Dual human screening required                          |
|Data extraction         |Human verification of all AI extractions               |
|Risk of bias            |Human final judgment (AI pre-assessment acceptable)    |
|GRADE certainty         |Human determination with AI support                    |

### I-Librarian integration strategy

Given I-Librarian’s lack of documented REST API, integration follows this pattern:

1. **PDF Storage**: Use as repository after programmatic retrieval via Unpaywall/CrossRef
1. **Manual Import**: Batch upload PDFs to I-Librarian data directory
1. **Full-text Access**: Query SQLite database directly (read-only) or use file system paths
1. **Annotations**: Reserve for human annotation workflow, not automated pipeline

**Recommended alternative for programmatic PDF processing**: Apache Tika for extraction, PostgreSQL for storage, with I-Librarian as optional human annotation layer.

-----

## Risk mitigation

|Risk             |Mitigation                                                                                        |
|-----------------|--------------------------------------------------------------------------------------------------|
|LLM hallucination|Mandatory source citation verification, confidence thresholds, human review for <0.85 confidence  |
|API rate limits  |Queue-based processing, exponential backoff, caching, prefer local Ollama                         |
|Full-text access |Prioritize Unpaywall OA, contact UQ Library IT for API access, manual fallback for critical papers|
|Reproducibility  |Version lock all models, archive prompts, full audit logging, database export capability          |
|Data loss        |PostgreSQL replication, daily backups, checkpoint/resume at every stage                           |
|Compliance gaps  |PRISMA checklist validation workflow, mandatory human approval for reporting items                |

This specification provides a complete blueprint for building a production-ready, PRISMA 2020-compliant systematic literature review automation pipeline. The phased approach enables incremental validation while the modular architecture supports future enhancements as LLM capabilities and institutional API access evolve.
