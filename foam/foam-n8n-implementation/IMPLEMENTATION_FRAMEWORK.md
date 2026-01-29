# FOAM Content Creation: N8N Multi-LLM Orchestration Implementation Framework

> **Implementation Note (v1.0.0):** This document served as the original specification and design reference during development. The actual implementation may have evolved from this specification. For the authoritative list of implemented files and features, see:
> - `CHANGELOG.md` - Version history and implemented features
> - `TODO.md` - Iteration tracking and completion status
> - `workflows/` - Actual N8N workflow JSON files
> - `prompts/` - Actual LLM prompt templates
>
> Some file paths referenced in this specification were refactored during implementation. The current file structure is the canonical reference.

**Version:** 1.0.0
**Last Updated:** 2025-01-21
**Author:** REdI (Resuscitation Education Initiative)
**Status:** Planning Phase

---

## Executive Summary

This framework defines the implementation of an N8N-based workflow for automated FOAM (Free Open Access Medical Education) content creation. The system orchestrates multiple LLMs (Claude, GPT, Ollama) to handle different stages of content creation while preserving the clinical authenticity and expert-to-colleague tone that distinguishes trusted FOAM resources.

### Core Principle

> **AI provides evidence synthesis and structural scaffolding; humans provide clinical wisdom and validation.**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Schemas](#2-data-schemas)
3. [Workflow Specifications](#3-workflow-specifications)
4. [API References](#4-api-references)
5. [Model Allocation Strategy](#5-model-allocation-strategy)
6. [Project Structure](#6-project-structure)
7. [Iteration Plan](#7-iteration-plan)
8. [Quality Assurance](#8-quality-assurance)
9. [Deployment Guide](#9-deployment-guide)

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           N8N ORCHESTRATION LAYER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   TRIGGER    │───▶│   ROUTER     │───▶│  WORKFLOW    │                  │
│  │  (Webhook/   │    │  (Format     │    │  SELECTOR    │                  │
│  │   Manual)    │    │   Detection) │    │              │                  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                  │
│                                                  │                          │
│                    ┌─────────────────────────────┼─────────────────────────┐│
│                    ▼                             ▼                         ▼│
│           ┌──────────────┐            ┌──────────────┐          ┌──────────┐│
│           │  CASE-BASED  │            │ JOURNAL CLUB │          │ CLINICAL ││
│           │   WORKFLOW   │            │   WORKFLOW   │          │  REVIEW  ││
│           └──────────────┘            └──────────────┘          └──────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │    CLAUDE    │   │     GPT      │   │    OLLAMA    │
            │  (Analysis,  │   │  (Research,  │   │   (Local     │
            │   Synthesis) │   │   Web Search)│   │   Processing)│
            └──────────────┘   └──────────────┘   └──────────────┘
```

### 1.2 Data Flow

```
INPUT                    PROCESSING                           OUTPUT
─────                    ──────────                           ──────

Topic Request ──┬──▶ Evidence Research ──▶ Evidence Package
                │           │
                │           ▼
                ├──▶ Source Retrieval ───▶ Reference Collection
                │           │
                │           ▼
                ├──▶ Content Drafting ───▶ Draft with Placeholders
                │           │
                │           ▼
                ├──▶ Validation Prep ────▶ Reviewer Checklist
                │           │
                │           ▼
                └──▶ Final Assembly ─────▶ Publication-Ready Draft
                                                    │
                                                    ▼
                                         Human Expert Review
                                                    │
                                                    ▼
                                            Published Content
```

### 1.3 Integration Points

| Component | Technology | Purpose |
|-----------|------------|---------|
| Orchestration | N8N (self-hosted) | Workflow coordination |
| Primary LLM | Claude API | Analysis, synthesis, drafting |
| Research LLM | GPT-4 + Web Search | Literature search, current data |
| Local LLM | Ollama (Llama 3.2/Mistral) | Summarisation, preprocessing |
| Database | PostgreSQL | Conversation memory, content storage |
| File Storage | Local/S3 | Reference documents, outputs |
| Notification | Slack/Email | Review requests, status updates |

---

## 2. Data Schemas

### 2.1 Topic Request Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FOAMTopicRequest",
  "type": "object",
  "required": ["format", "topic", "requestor"],
  "properties": {
    "request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for tracking"
    },
    "format": {
      "type": "string",
      "enum": ["case-based", "journal-club", "clinical-review"],
      "description": "Content format type"
    },
    "topic": {
      "type": "object",
      "required": ["title", "clinical_question"],
      "properties": {
        "title": {
          "type": "string",
          "maxLength": 200
        },
        "clinical_question": {
          "type": "string",
          "description": "PICO-formatted where applicable"
        },
        "trial_reference": {
          "type": "string",
          "description": "For journal club: DOI or PMID"
        },
        "case_scenario": {
          "type": "string",
          "description": "For case-based: initial presentation"
        },
        "scope_notes": {
          "type": "string",
          "description": "What to include/exclude"
        }
      }
    },
    "requestor": {
      "type": "object",
      "required": ["name", "email"],
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "institution": { "type": "string" }
      }
    },
    "target_audience": {
      "type": "string",
      "enum": ["paramedic", "ed-nurse", "registrar", "consultant", "mixed"],
      "default": "mixed"
    },
    "urgency": {
      "type": "string",
      "enum": ["routine", "priority", "urgent"],
      "default": "routine"
    },
    "regional_context": {
      "type": "string",
      "enum": ["australia", "uk", "canada", "usa", "international"],
      "default": "australia"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

### 2.2 Evidence Package Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EvidencePackage",
  "type": "object",
  "required": ["request_id", "sources", "synthesis"],
  "properties": {
    "request_id": {
      "type": "string",
      "format": "uuid"
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["citation", "source_type", "relevance_score"],
        "properties": {
          "citation": {
            "type": "object",
            "properties": {
              "authors": { "type": "array", "items": { "type": "string" } },
              "title": { "type": "string" },
              "journal": { "type": "string" },
              "year": { "type": "integer" },
              "volume": { "type": "string" },
              "pages": { "type": "string" },
              "doi": { "type": "string" },
              "pmid": { "type": "string" }
            }
          },
          "source_type": {
            "type": "string",
            "enum": ["rct", "meta-analysis", "cohort", "case-series", "guideline", "expert-opinion", "review"]
          },
          "key_findings": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "finding": { "type": "string" },
                "statistic": { "type": "string" },
                "confidence_interval": { "type": "string" },
                "nnt_nnh": { "type": "string" }
              }
            }
          },
          "limitations": {
            "type": "array",
            "items": { "type": "string" }
          },
          "relevance_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "extraction_method": {
            "type": "string",
            "enum": ["full-text", "abstract-only", "secondary-source"]
          }
        }
      }
    },
    "synthesis": {
      "type": "object",
      "properties": {
        "evidence_summary": { "type": "string" },
        "evidence_quality": {
          "type": "string",
          "enum": ["strong", "moderate", "weak", "very-weak", "conflicting"]
        },
        "key_uncertainties": {
          "type": "array",
          "items": { "type": "string" }
        },
        "practice_implications": { "type": "string" },
        "regional_variations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "region": { "type": "string" },
              "variation": { "type": "string" }
            }
          }
        }
      }
    },
    "guidelines_referenced": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "society": { "type": "string" },
          "guideline_title": { "type": "string" },
          "year": { "type": "integer" },
          "recommendation_class": { "type": "string" },
          "level_of_evidence": { "type": "string" }
        }
      }
    },
    "foamed_crossrefs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "resource": { "type": "string" },
          "title": { "type": "string" },
          "url": { "type": "string", "format": "uri" },
          "relevance_note": { "type": "string" }
        }
      }
    },
    "generated_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

### 2.3 Draft Content Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DraftContent",
  "type": "object",
  "required": ["request_id", "format", "content", "metadata"],
  "properties": {
    "request_id": {
      "type": "string",
      "format": "uuid"
    },
    "format": {
      "type": "string",
      "enum": ["case-based", "journal-club", "clinical-review"]
    },
    "content": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "subtitle": { "type": "string" },
        "body_markdown": { "type": "string" },
        "word_count": { "type": "integer" }
      }
    },
    "placeholders": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "placeholder_id": { "type": "string" },
          "type": {
            "type": "string",
            "enum": ["clinical-pearl", "expert-input", "regional-variation", "verify", "peer-review"]
          },
          "context": { "type": "string" },
          "prompt_for_expert": { "type": "string" },
          "location_in_document": { "type": "string" }
        }
      }
    },
    "validation_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "item_type": {
            "type": "string",
            "enum": ["dose", "threshold", "contraindication", "guideline-conflict", "claim"]
          },
          "content": { "type": "string" },
          "source_cited": { "type": "string" },
          "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"]
          },
          "requires_verification": { "type": "boolean" }
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "generated_by": { "type": "string" },
        "generation_timestamp": { "type": "string", "format": "date-time" },
        "evidence_package_id": { "type": "string" },
        "template_version": { "type": "string" },
        "llm_models_used": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "quality_checks": {
      "type": "object",
      "properties": {
        "all_claims_cited": { "type": "boolean" },
        "uncertainty_acknowledged": { "type": "boolean" },
        "bottom_line_present": { "type": "boolean" },
        "foamed_crossrefs_included": { "type": "boolean" },
        "style_guide_compliant": { "type": "boolean" }
      }
    }
  }
}
```

### 2.4 Review Request Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ReviewRequest",
  "type": "object",
  "required": ["request_id", "draft_id", "reviewer", "checklist"],
  "properties": {
    "request_id": { "type": "string", "format": "uuid" },
    "draft_id": { "type": "string", "format": "uuid" },
    "reviewer": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "credentials": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "speciality": { "type": "string" }
      }
    },
    "checklist": {
      "type": "object",
      "properties": {
        "doses_to_verify": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "drug": { "type": "string" },
              "dose": { "type": "string" },
              "source": { "type": "string" },
              "verified": { "type": "boolean" },
              "correction": { "type": "string" }
            }
          }
        },
        "clinical_pearls_needed": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "topic": { "type": "string" },
              "context": { "type": "string" },
              "pearl_provided": { "type": "string" }
            }
          }
        },
        "claims_to_verify": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "claim": { "type": "string" },
              "source": { "type": "string" },
              "verified": { "type": "boolean" },
              "notes": { "type": "string" }
            }
          }
        },
        "regional_variations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "topic": { "type": "string" },
              "local_practice": { "type": "string" }
            }
          }
        }
      }
    },
    "general_feedback": { "type": "string" },
    "approval_status": {
      "type": "string",
      "enum": ["pending", "approved", "revisions-required", "rejected"]
    },
    "submitted_at": { "type": "string", "format": "date-time" }
  }
}
```

---

## 3. Workflow Specifications

### 3.1 Master Orchestration Workflow

```yaml
workflow_name: foam-content-orchestrator
version: "1.0.0"
description: Main entry point for FOAM content generation requests

nodes:
  - trigger:
      type: webhook
      method: POST
      path: /foam/request
      authentication: header_auth
      
  - validate_request:
      type: code
      language: javascript
      description: Validate incoming request against schema
      
  - route_by_format:
      type: switch
      conditions:
        - case-based: "{{ $json.format === 'case-based' }}"
        - journal-club: "{{ $json.format === 'journal-club' }}"
        - clinical-review: "{{ $json.format === 'clinical-review' }}"
        
  - execute_workflow:
      type: execute_workflow
      workflow_id: "{{ $json.workflow_id }}"
      wait_for_completion: true
      
  - store_result:
      type: postgres
      operation: insert
      table: foam_content
      
  - notify_completion:
      type: slack
      channel: "#foam-content"
      message: "New {{ $json.format }} draft ready for review"

connections:
  trigger -> validate_request -> route_by_format
  route_by_format -> execute_workflow -> store_result -> notify_completion
```

### 3.2 Case-Based Discussion Workflow

```yaml
workflow_name: case-based-discussion
version: "1.0.0"
description: Generate case-based FOAM content with progressive revelation

stages:
  1_topic_research:
    nodes:
      - extract_clinical_question:
          type: ai_agent
          model: claude-sonnet-4-20250514
          system_prompt: |
            Extract the core clinical question from the case scenario.
            Identify 3-5 clinical decision points for progressive revelation.
            Output as JSON with fields: main_question, decision_points[], differential_considerations[]
            
      - search_evidence:
          type: ai_agent
          model: gpt-4o
          tools:
            - web_search
          system_prompt: |
            Search for current evidence on the clinical question.
            Find: landmark trials, recent meta-analyses, current guidelines.
            For each source, extract: citation with PMID, key findings with statistics, limitations.
            
      - search_foamed:
          type: http_request
          method: GET
          urls:
            - "https://litfl.com/?s={{ $json.search_term }}"
            - "https://emcases.com/?s={{ $json.search_term }}"
          parse: html
          
  2_evidence_synthesis:
    nodes:
      - synthesise_evidence:
          type: ai_agent
          model: claude-sonnet-4-20250514
          memory: postgres_chat_memory
          system_prompt: |
            Synthesise the gathered evidence following FOAM style guide principles:
            - Grade evidence quality explicitly
            - Identify uncertainties and controversies
            - Note regional practice variations
            - Flag items requiring expert verification
            Output as EvidencePackage JSON schema.
            
  3_draft_generation:
    nodes:
      - generate_draft:
          type: ai_agent
          model: claude-sonnet-4-20250514
          system_prompt: |
            Generate a case-based discussion following the template structure.
            
            TEMPLATE STRUCTURE:
            1. Opening vignette (50-100 words)
            2. 3-5 clinical decision points with progressive revelation
            3. Evidence synthesis at each decision point
            4. Clinical pearl placeholders: [CLINICAL PEARL NEEDED: topic]
            5. Expert input prompts: [EXPERT INPUT NEEDED: question]
            6. Key takeaways
            7. References with PMIDs
            8. FOAMed cross-references
            
            STYLE REQUIREMENTS:
            - Expert-to-colleague register
            - No over-explanation of fundamentals
            - Explicit uncertainty acknowledgment
            - All claims cited
            
      - insert_placeholders:
          type: code
          language: javascript
          description: |
            Parse draft and ensure all required placeholders present.
            Tag locations for clinical pearls, expert input, verification needs.
            
  4_validation_prep:
    nodes:
      - generate_reviewer_checklist:
          type: ai_agent
          model: ollama/llama3.2
          system_prompt: |
            Extract from the draft:
            1. All drug doses with their sources
            2. All clinical thresholds with their sources
            3. Statements requiring clinical verification
            4. Claims that might conflict with local guidelines
            5. Questions for expert reviewer
            Output as ReviewRequest JSON schema.
            
  5_output:
    nodes:
      - assemble_package:
          type: code
          language: javascript
          description: Combine draft, evidence package, and review checklist
          
      - store_draft:
          type: postgres
          operation: insert
          table: foam_drafts
          
      - notify_reviewer:
          type: email
          template: review_request
```

### 3.3 Journal Club Workflow

```yaml
workflow_name: journal-club-summary
version: "1.0.0"
description: Generate structured trial summary following The Bottom Line format

stages:
  1_trial_retrieval:
    nodes:
      - fetch_trial:
          type: http_request
          method: GET
          url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
          parameters:
            db: pubmed
            id: "{{ $json.pmid }}"
            retmode: xml
            
      - fetch_full_text:
          type: ai_agent
          model: gpt-4o
          tools:
            - web_search
          system_prompt: |
            Locate and retrieve the full text of the trial if openly accessible.
            If not available, note this limitation and work from abstract + supplementary materials.
            
  2_critical_appraisal:
    nodes:
      - extract_trial_data:
          type: ai_agent
          model: claude-sonnet-4-20250514
          system_prompt: |
            Extract trial data following journal club template structure:
            
            REQUIRED SECTIONS:
            - Clinical Question (PICO format)
            - Design (study type, randomisation, blinding, analysis method, power calculation)
            - Setting (sites, countries, dates)
            - Population (inclusion/exclusion, flow, baseline characteristics)
            - Intervention (protocol, actual delivered)
            - Control (protocol)
            - Outcomes (primary with effect size, CI, p-value, NNT; secondary outcomes)
            
            Be precise with numbers. Include confidence intervals.
            
      - critical_appraisal:
          type: ai_agent
          model: claude-sonnet-4-20250514
          system_prompt: |
            Perform systematic critical appraisal:
            
            CHECKLIST:
            □ Allocation concealment
            □ Groups similar at baseline
            □ Complete follow-up
            □ Blinding (patients/clinicians/assessors)
            □ Equal treatment of groups
            □ Intention-to-treat analysis
            □ Adequate sample size
            □ Clinical significance (not just statistical)
            □ Generalizability
            □ Conclusions match data
            
            For each item, provide specific assessment from the trial.
            
  3_synthesis:
    nodes:
      - generate_bottom_line:
          type: ai_agent
          model: claude-sonnet-4-20250514
          system_prompt: |
            Generate "The Bottom Line" section:
            - 2-4 sentences
            - Explicit about whether this changes practice
            - State remaining uncertainties
            - Define who this applies to
            
            Be direct. Avoid hedging without information.
            
      - assemble_draft:
          type: ai_agent
          model: claude-sonnet-4-20250514
          system_prompt: |
            Assemble complete journal club post from extracted data.
            Follow exact template structure.
            Include all statistics with CIs.
            Add placeholders for expert commentary.
```

### 3.4 Clinical Review Workflow

```yaml
workflow_name: clinical-review
version: "1.0.0"
description: Generate comprehensive topic review (3,000-5,000 words)

stages:
  1_scope_definition:
    nodes:
      - define_scope:
          type: ai_agent
          model: claude-sonnet-4-20250514
          system_prompt: |
            Define review scope:
            1. Core clinical questions to address
            2. Section outline (modular structure)
            3. Key evidence to seek
            4. Expected controversies
            5. Regional variation considerations
            
  2_comprehensive_search:
    nodes:
      - search_guidelines:
          type: ai_agent
          model: gpt-4o
          tools:
            - web_search
          system_prompt: |
            Search for current guidelines on the topic from:
            - ILCOR/ARC/ERC (resuscitation)
            - Surviving Sepsis Campaign
            - NICE
            - Australian Resuscitation Council
            - Relevant specialty societies
            
      - search_trials:
          type: ai_agent
          model: gpt-4o
          tools:
            - web_search
          system_prompt: |
            Search PubMed for:
            - Landmark RCTs (use known acronyms)
            - Recent meta-analyses (<5 years)
            - Key observational studies
            Prioritise high-impact evidence.
            
      - search_foamed:
          type: http_request
          method: GET
          description: Search major FOAM resources for existing coverage
          
  3_section_drafting:
    nodes:
      - draft_sections:
          type: loop
          items: "{{ $json.sections }}"
          sub_workflow:
            - draft_section:
                type: ai_agent
                model: claude-sonnet-4-20250514
                memory: postgres_chat_memory
                system_prompt: |
                  Draft section following clinical review template.
                  
                  REQUIREMENTS:
                  - 300-500 words before subheading
                  - All claims cited with PMID
                  - Tables for dosing/differentials
                  - Bold for critical thresholds
                  - Explicit uncertainty markers
                  - Cross-reference existing FOAM
                  
  4_assembly:
    nodes:
      - assemble_review:
          type: ai_agent
          model: claude-sonnet-4-20250514
          system_prompt: |
            Assemble complete clinical review:
            1. Key Points summary at top
            2. Bottom Line in blockquote
            3. Modular sections
            4. Controversies section
            5. Regional variations
            6. Special populations
            7. References with PMIDs
            8. FOAMed resources
            
      - quality_check:
          type: ai_agent
          model: ollama/llama3.2
          system_prompt: |
            Verify draft against checklist:
            □ All claims cited
            □ Uncertainty explicitly stated
            □ Clinical pearl placeholders present
            □ Expert input prompts included
            □ Bottom line summary present
            □ Word count within 3,000-5,000
            □ FOAMed cross-references included
```

---

## 4. API References

### 4.1 Claude API Configuration

```javascript
// N8N Anthropic Chat Model Node Configuration
{
  "parameters": {
    "model": "claude-sonnet-4-20250514",
    "options": {
      "maxTokensToSample": 8192,
      "temperature": 0.3,  // Lower for factual content
      "topP": 0.9
    }
  },
  "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
  "typeVersion": 1,
  "credentials": {
    "anthropicApi": {
      "id": "{{ $env.ANTHROPIC_CREDENTIAL_ID }}",
      "name": "Anthropic API"
    }
  }
}
```

### 4.2 OpenAI API Configuration (with Web Search)

```javascript
// N8N OpenAI Chat Model Node Configuration
{
  "parameters": {
    "model": "gpt-4o",
    "options": {
      "maxTokens": 4096,
      "temperature": 0.2
    }
  },
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "typeVersion": 1,
  "credentials": {
    "openAiApi": {
      "id": "{{ $env.OPENAI_CREDENTIAL_ID }}",
      "name": "OpenAI API"
    }
  }
}

// Web Search Tool Configuration
{
  "parameters": {},
  "type": "@n8n/n8n-nodes-langchain.toolSerpApi",
  "typeVersion": 1,
  "credentials": {
    "serpApi": {
      "id": "{{ $env.SERP_API_CREDENTIAL_ID }}",
      "name": "SerpAPI"
    }
  }
}
```

### 4.3 Ollama Configuration (Self-Hosted)

```javascript
// N8N Ollama Chat Model Node Configuration
// CRITICAL: Use "Ollama Chat Model" NOT "Ollama Model" for tool calling support
{
  "parameters": {
    "model": "llama3.2:latest",
    "baseUrl": "http://host.docker.internal:11434",  // For Docker deployment
    "options": {
      "temperature": 0.3,
      "numCtx": 8192
    }
  },
  "type": "@n8n/n8n-nodes-langchain.lmChatOllama",
  "typeVersion": 1
}
```

### 4.4 PubMed E-utilities API

```javascript
// Search endpoint
const PUBMED_SEARCH = {
  baseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
  parameters: {
    db: "pubmed",
    retmode: "json",
    retmax: 100,
    sort: "relevance"
  }
};

// Fetch endpoint
const PUBMED_FETCH = {
  baseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
  parameters: {
    db: "pubmed",
    retmode: "xml"
  }
};

// Example search query construction
function buildPubMedQuery(topic, filters = {}) {
  const parts = [topic];
  
  if (filters.studyType) {
    parts.push(`${filters.studyType}[pt]`);
  }
  if (filters.dateRange) {
    parts.push(`${filters.dateRange}[dp]`);
  }
  if (filters.humans) {
    parts.push("humans[mh]");
  }
  
  return parts.join(" AND ");
}
```

### 4.5 PostgreSQL Memory Configuration

```javascript
// N8N Postgres Chat Memory Node Configuration
{
  "parameters": {
    "sessionIdType": "customKey",
    "sessionKey": "={{ $json.request_id }}",
    "contextWindowLength": 20,
    "tableName": "foam_conversation_memory"
  },
  "type": "@n8n/n8n-nodes-langchain.memoryPostgresChat",
  "typeVersion": 1,
  "credentials": {
    "postgres": {
      "id": "{{ $env.POSTGRES_CREDENTIAL_ID }}",
      "name": "PostgreSQL"
    }
  }
}
```

---

## 5. Model Allocation Strategy

### 5.1 Task-to-Model Mapping

| Task | Recommended Model | Rationale |
|------|-------------------|-----------|
| **Evidence Synthesis** | Claude Sonnet 4 | Nuanced reasoning, citation handling |
| **Content Drafting** | Claude Sonnet 4 | Long-form coherent writing, style adherence |
| **Critical Appraisal** | Claude Sonnet 4 | Analytical depth, systematic evaluation |
| **Web Research** | GPT-4o + Search | Native web search integration |
| **Literature Search** | GPT-4o | Efficient query formulation |
| **Preprocessing** | Ollama Llama 3.2 | Cost-effective local processing |
| **Summarisation** | Ollama Llama 3.2 | Simple extraction tasks |
| **Validation Checks** | Ollama Mistral | Pattern matching, checklist verification |
| **Final QA** | Claude Sonnet 4 | Quality assurance, style compliance |

### 5.2 Cost-Performance Trade-offs

```
HIGH QUALITY / HIGH COST          BALANCED                    LOW COST / LOCAL
─────────────────────────         ────────                    ─────────────────
Claude Opus 4.5                   Claude Sonnet 4             Ollama Llama 3.2
- Complex reasoning               - Primary drafting          - Preprocessing
- Difficult synthesis             - Evidence synthesis        - Simple extraction
- Edge cases                      - Critical appraisal        - Checklist validation

GPT-4o                            GPT-4o-mini                 Ollama Mistral
- Web search tasks                - Simple searches           - Pattern matching
- Current information             - Quick lookups             - Format conversion
```

### 5.3 Fallback Configuration

```javascript
// Fallback chain configuration
const MODEL_FALLBACKS = {
  "claude-sonnet-4-20250514": [
    "claude-3-5-sonnet-20241022",  // Previous version
    "gpt-4o"                       // Cross-provider fallback
  ],
  "gpt-4o": [
    "gpt-4o-mini",
    "claude-sonnet-4-20250514"
  ],
  "ollama/llama3.2": [
    "ollama/mistral",
    "gpt-4o-mini"                  // Cloud fallback if local unavailable
  ]
};
```

---

## 6. Project Structure

```
foam-n8n-implementation/
├── IMPLEMENTATION_FRAMEWORK.md      # This document
├── TODO.md                          # Current iteration tasks
├── CHANGELOG.md                     # Version history
│
├── schemas/                         # JSON Schema definitions
│   ├── topic-request.schema.json
│   ├── evidence-package.schema.json
│   ├── draft-content.schema.json
│   └── review-request.schema.json
│
├── workflows/                       # N8N workflow JSON exports
│   ├── orchestrator.json
│   ├── case-based.json
│   ├── journal-club.json
│   ├── clinical-review.json
│   └── common/
│       ├── evidence-search.json
│       ├── pubmed-fetch.json
│       └── foamed-crossref.json
│
├── prompts/                         # System prompts for LLM nodes
│   ├── evidence-synthesis.md
│   ├── draft-case-based.md
│   ├── draft-journal-club.md
│   ├── draft-clinical-review.md
│   ├── critical-appraisal.md
│   └── validation-check.md
│
├── templates/                       # Content templates (from skill)
│   ├── case-based-template.md
│   ├── journal-club-template.md
│   ├── clinical-review-template.md
│   └── style-guide.md
│
├── code/                            # Custom code nodes
│   ├── validators/
│   │   ├── schema-validator.js
│   │   └── placeholder-checker.js
│   ├── transformers/
│   │   ├── pubmed-parser.js
│   │   ├── citation-formatter.js
│   │   └── markdown-assembler.js
│   └── utils/
│       ├── logging.js
│       └── error-handler.js
│
├── config/                          # Configuration files
│   ├── n8n-env.example
│   ├── postgres-init.sql
│   └── ollama-models.txt
│
├── tests/                           # Test cases and sample data
│   ├── sample-requests/
│   │   ├── case-based-sample.json
│   │   ├── journal-club-sample.json
│   │   └── clinical-review-sample.json
│   └── expected-outputs/
│
└── docs/                            # Additional documentation
    ├── deployment.md
    ├── troubleshooting.md
    └── model-tuning.md
```

---

## 7. Iteration Plan

### Phase 1: Foundation (Iterations 1-3)

**Iteration 1: Project Scaffolding**
- [ ] Create directory structure
- [ ] Set up JSON schemas
- [ ] Create placeholder files
- [ ] Document TODO items

**Iteration 2: Core Infrastructure**
- [ ] PostgreSQL schema for content storage
- [ ] Basic N8N orchestrator workflow
- [ ] Webhook trigger configuration
- [ ] Error handling framework

**Iteration 3: Evidence Search Pipeline**
- [ ] PubMed search integration
- [ ] GPT-4o web search configuration
- [ ] FOAM resource scraping
- [ ] Evidence package assembly

### Phase 2: Content Generation (Iterations 4-6)

**Iteration 4: Journal Club Workflow**
- [ ] Trial data extraction prompts
- [ ] Critical appraisal automation
- [ ] Bottom line generation
- [ ] Template assembly

**Iteration 5: Case-Based Workflow**
- [ ] Progressive revelation logic
- [ ] Decision point identification
- [ ] Clinical pearl placeholders
- [ ] Vignette generation

**Iteration 6: Clinical Review Workflow**
- [ ] Section-by-section drafting
- [ ] Multi-section assembly
- [ ] Cross-referencing system
- [ ] Quality checkpoint integration

### Phase 3: Quality & Validation (Iterations 7-9)

**Iteration 7: Validation System**
- [ ] Dose/threshold extraction
- [ ] Claim verification prompts
- [ ] Guideline conflict detection
- [ ] Reviewer checklist generation

**Iteration 8: Human-in-the-Loop**
- [ ] Review request notifications
- [ ] Feedback capture interface
- [ ] Revision workflow
- [ ] Approval tracking

**Iteration 9: Quality Assurance**
- [ ] Style guide compliance checks
- [ ] Citation verification
- [ ] Word count validation
- [ ] Output quality scoring

### Phase 4: Deployment & Optimisation (Iterations 10-12)

**Iteration 10: Self-Hosted Deployment**
- [ ] Docker compose configuration
- [ ] Ollama model setup
- [ ] PostgreSQL persistence
- [ ] N8N backup strategy

**Iteration 11: Performance Optimisation**
- [ ] Parallel execution tuning
- [ ] Caching strategy
- [ ] Rate limit handling
- [ ] Cost monitoring

**Iteration 12: Documentation & Handoff**
- [ ] User documentation
- [ ] Troubleshooting guide
- [ ] Model tuning notes
- [ ] Maintenance procedures

---

## 8. Quality Assurance

### 8.1 Output Quality Checklist

Every generated draft must pass:

```markdown
## Pre-Human-Review Checklist

### Structure
- [ ] Correct template structure used
- [ ] Word count within target range
- [ ] All required sections present
- [ ] Appropriate visual hierarchy

### Evidence
- [ ] All factual claims have citations
- [ ] PMIDs/DOIs included for all references
- [ ] Statistics include confidence intervals where applicable
- [ ] Evidence quality explicitly graded

### Style
- [ ] Expert-to-colleague register maintained
- [ ] No over-explanation of fundamentals
- [ ] Uncertainty explicitly acknowledged
- [ ] No hedging without information

### Placeholders
- [ ] Clinical pearl placeholders marked
- [ ] Expert input prompts present
- [ ] Regional variation flags included
- [ ] Verification items tagged

### Cross-References
- [ ] FOAMed resources linked
- [ ] Related existing content referenced
- [ ] Guidelines cited with societies

### Metadata
- [ ] Author attribution space
- [ ] Peer reviewer attribution space
- [ ] Date and update schedule noted
```

### 8.2 Error Handling Strategy

```javascript
// Error handling layers

// Layer 1: Node-level retry
const RETRY_CONFIG = {
  maxRetries: 3,
  waitBetweenRetries: 15000,  // 15 seconds for rate limit recovery
  retryOnTimeout: true
};

// Layer 2: Workflow-level error handler
const ERROR_WORKFLOW = {
  trigger: "error_trigger",
  actions: [
    "log_to_database",
    "notify_slack",
    "create_ticket"
  ]
};

// Layer 3: Model fallback
const FALLBACK_ENABLED = true;

// Layer 4: Graceful degradation
const DEGRADATION_RULES = {
  "web_search_fails": "use_cached_evidence",
  "primary_llm_unavailable": "use_fallback_model",
  "full_text_unavailable": "proceed_with_abstract"
};
```

### 8.3 Logging Configuration

```javascript
// Comprehensive logging for debugging

const LOG_CONFIG = {
  level: "DEBUG",  // DEBUG, INFO, WARN, ERROR
  output: {
    console: true,
    file: "/var/log/foam-workflow/workflow.log",
    database: true
  },
  include: {
    timestamp: true,
    request_id: true,
    node_name: true,
    execution_time: true,
    token_usage: true,
    model_used: true
  },
  rotation: {
    maxSize: "100MB",
    maxFiles: 10,
    compress: true
  }
};

// Log format
// [2025-01-21T10:30:00Z] [INFO] [req-abc123] [evidence-synthesis] 
// Model: claude-sonnet-4 | Tokens: 2341/8192 | Time: 4.2s | Status: success
```

---

## 9. Deployment Guide

### 9.1 Prerequisites

```bash
# Required services
- Docker & Docker Compose
- PostgreSQL 14+
- N8N (self-hosted, version 1.82.0+)
- Ollama (for local models)

# API Keys required
- Anthropic API key
- OpenAI API key
- SerpAPI key (for web search)
```

### 9.2 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://${N8N_HOST}/
      - GENERIC_TIMEZONE=Australia/Brisbane
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
      - ./workflows:/workflows
    depends_on:
      - postgres
    extra_hosts:
      - "host.docker.internal:host-gateway"

  postgres:
    image: postgres:14
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/postgres-init.sql:/docker-entrypoint-initdb.d/init.sql

  ollama:
    image: ollama/ollama:latest
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  n8n_data:
  postgres_data:
  ollama_data:
```

### 9.3 Initial Setup Script

```bash
#!/bin/bash
# setup.sh - Initial deployment script

echo "=== FOAM N8N Workflow Setup ==="

# 1. Create directories
mkdir -p ./workflows ./logs ./config

# 2. Copy environment template
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env file - please edit with your credentials"
fi

# 3. Start services
docker-compose up -d postgres
sleep 10  # Wait for postgres

docker-compose up -d ollama
sleep 5

# 4. Pull Ollama models
docker exec ollama ollama pull llama3.2
docker exec ollama ollama pull mistral

# 5. Start N8N
docker-compose up -d n8n

echo "=== Setup complete ==="
echo "N8N available at: http://localhost:5678"
echo "Import workflows from ./workflows directory"
```

---

## Appendix A: Style Guide Reference

See `/templates/style-guide.md` for complete FOAM writing style specifications.

## Appendix B: Template Reference

- Case-based: `/templates/case-based-template.md`
- Journal club: `/templates/journal-club-template.md`
- Clinical review: `/templates/clinical-review-template.md`

## Appendix C: N8N Node Reference

See N8N documentation: https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/

---

*This framework is maintained by the Resuscitation Education Initiative (REdI) at Metro North Health.*
