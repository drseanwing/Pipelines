# REdI FOAM Content Creation System

**Resuscitation EDucation Initiative — Multi-LLM Orchestration for Medical Education Content**

![Status](https://img.shields.io/badge/status-development-E55B64)
![Version](https://img.shields.io/badge/version-0.1.0-1B3A5F)
![REdI](https://img.shields.io/badge/powered%20by-REdI-2B9E9E)
![License](https://img.shields.io/badge/license-internal-666666)

---

## Overview

An automated content creation system for FOAM (Free Open Access Medical Education) resources, built by the **Resuscitation EDucation Initiative (REdI)** at Metro North Health, Queensland. Uses N8N to orchestrate multiple LLMs for evidence synthesis, content drafting, and quality assurance.

**Core Principle:** AI provides evidence synthesis and structural scaffolding; humans provide clinical wisdom and validation.

### Supported Content Formats

| Format | Description | Target Length |
|--------|-------------|---------------|
| **Case-Based Discussion** | Progressive case revelation with clinical decision points | 1,500-2,500 words |
| **Journal Club** | Structured trial critical appraisal | 1,000-2,000 words |
| **Clinical Topic Review** | Comprehensive evidence synthesis | 3,000-5,000 words |

### Target Audience

- Paramedics
- ED Nurses
- Emergency Medicine Registrars/Residents
- ICU Fellows
- Consultant-level critical care physicians

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- API keys for: Anthropic, OpenAI, SerpAPI
- (Optional) NVIDIA GPU for local Ollama models

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/foam-n8n-implementation.git
cd foam-n8n-implementation

# Copy environment template
cp config/n8n-env.example .env

# Edit .env with your API keys
nano .env

# Start services
docker-compose up -d

# Pull Ollama models (if using local models)
docker exec ollama ollama pull llama3.2
docker exec ollama ollama pull mistral
```

### Access N8N

Open `http://localhost:5678` and import workflows from the `workflows/` directory.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    N8N ORCHESTRATION                         │
├─────────────────────────────────────────────────────────────┤
│  Webhook ─▶ Router ─▶ Workflow Selector                     │
│                              │                               │
│            ┌─────────────────┼─────────────────┐            │
│            ▼                 ▼                 ▼            │
│       Case-Based      Journal Club     Clinical Review      │
└─────────────────────────────────────────────────────────────┘
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
         Claude          GPT-4o           Ollama
        (Draft)       (Research)        (Local)
```

### Model Allocation

| Task | Model | Rationale |
|------|-------|-----------|
| Evidence synthesis | Claude Sonnet 4 | Nuanced reasoning |
| Content drafting | Claude Sonnet 4 | Long-form coherence |
| Web research | GPT-4o + SerpAPI | Native search integration |
| Preprocessing | Ollama Llama 3.2 | Cost-effective local |
| Validation | Ollama Mistral | Pattern matching |

---

## Project Structure

```
foam-n8n-implementation/
├── IMPLEMENTATION_FRAMEWORK.md  # Master specification
├── TODO.md                      # Iteration tracking
├── CHANGELOG.md                 # Version history
├── README.md                    # This file
│
├── schemas/                     # JSON Schema definitions
│   ├── topic-request.schema.json
│   ├── evidence-package.schema.json
│   ├── draft-content.schema.json
│   └── review-request.schema.json
│
├── workflows/                   # N8N workflow exports
│   ├── orchestrator.json
│   └── common/
│
├── templates/                   # Content templates
│   ├── case-based-template.md
│   ├── journal-club-template.md
│   ├── clinical-review-template.md
│   └── style-guide.md
│
├── code/                        # Custom code nodes
│   ├── validators/
│   ├── transformers/
│   └── utils/
│
├── config/                      # Configuration
│   ├── n8n-env.example
│   ├── postgres-init.sql
│   └── ollama-models.txt
│
├── tests/                       # Test data
│   └── sample-requests/
│
└── docs/                        # Additional documentation
```

---

## Development

### Current Status

**Iteration 1: Project Scaffolding** - In Progress

See [TODO.md](TODO.md) for current tasks and [CHANGELOG.md](CHANGELOG.md) for version history.

### Contributing

1. Check `TODO.md` for current iteration tasks
2. Follow the style guide in `templates/style-guide.md`
3. All schemas must include field descriptions
4. Code must include verbose logging
5. Error handling must include graceful degradation

### Testing

```bash
# Validate a sample request
node code/validators/schema-validator.js tests/sample-requests/journal-club-sample.json

# Run workflow with test data (in N8N)
# Import workflow, trigger with sample request
```

---

## Documentation

- **[Implementation Framework](IMPLEMENTATION_FRAMEWORK.md)** - Complete technical specification
- **[TODO](TODO.md)** - Current iteration tasks
- **[CHANGELOG](CHANGELOG.md)** - Version history and roadmap
- **[Style Guide](templates/style-guide.md)** - FOAM writing standards

---

## Key Design Decisions

### Why Multi-LLM?

Different models excel at different tasks:
- Claude: Nuanced analysis, long-form writing, style adherence
- GPT-4o: Web search integration, current information
- Ollama: Cost-effective local processing, privacy-sensitive tasks

### Why N8N?

- Visual workflow builder for non-developers
- Native LangChain integration
- Self-hosted option for healthcare data
- Webhook triggers for automation
- Built-in retry and error handling

### Why PostgreSQL Memory?

Conversation context must persist across:
- N8N restarts
- Multiple workflow executions
- Long-running research tasks

---

## Contact

**Project Lead:** Sean
**Team:** Resuscitation EDucation Initiative (REdI)
**Organisation:** Metro North Health, Queensland
**Email:** redi@health.qld.gov.au

---

## Brand

This project follows the **REdI Brand Guidelines v1.0**. See `config/redi-theme.json` for the digital colour palette and design tokens used across all system components.

| Element | Value |
|---------|-------|
| Primary Coral | `#E55B64` |
| Primary Navy | `#1B3A5F` |
| Primary Teal | `#2B9E9E` |
| Typography | Montserrat (primary), Bebas Neue (display) |

---

## License

Internal use only. Contact project lead for licensing inquiries.
