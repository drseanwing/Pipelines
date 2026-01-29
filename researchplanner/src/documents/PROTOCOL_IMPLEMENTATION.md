# Protocol Document Generation Implementation

## Overview

Implementation of research protocol document generation per TASKS.md Phase 8.3 and spec section 3.6.3.

**File:** `src/documents/protocol.ts`
**Lines of Code:** 728
**Status:** Complete

## Implemented Functions

### Core Orchestration

#### `generateProtocol(project, research, methodology, ethics): Promise<Buffer>`

Master orchestration function that generates complete research protocol DOCX document.

**Protocol Structure (per spec 3.6.3):**

1. **Title page** - Project title, PI name, date
2. **Version history** - Version table with initial version 1.0
3. **Protocol synopsis** - Key-value table with project overview
4. **Introduction** (250 words) - LLM-generated introduction
5. **Background** (1500 words) - From research.evidence_synthesis
6. **Aims and objectives** - Formatted from methodology.outcomes
7. **Methods** (2000 words) - LLM-generated comprehensive methods
8. **Participants** - Inclusion/exclusion criteria, recruitment, sample size
9. **Outcomes** - Primary and secondary outcomes with measurement details
10. **Procedures** - Step-by-step protocol from methodology.procedures
11. **Data management** - Data governance specifications
12. **Ethical considerations** - Ethics pathway, risk, consent, governance
13. **Dissemination** (250 words) - LLM-generated dissemination plan
14. **References** - Formatted citations from research.citations

**Returns:** DOCX buffer ready for file system storage

### LLM-Generated Sections

#### `generateIntroduction(project): Promise<Paragraph[]>`

Generates concise 250-word introduction using Claude API.

**Inputs:**
- Project title
- Clinical problem
- Target population
- Setting

**LLM Prompt Structure:**
- Briefly state clinical problem
- Introduce target population
- Explain significance
- Preview study purpose

**Model:** claude-3-5-sonnet-20241022
**Max Tokens:** 1024
**Temperature:** 0.7

#### `generateMethods(methodology): Promise<Paragraph[]>`

Generates comprehensive 2000-word methods section using Claude API.

**Inputs:**
- Study design details (type, subtype, reporting guideline)
- Randomization and blinding specifications
- Study sites
- Sample size calculation
- Primary outcome measurement
- Analysis plan

**LLM Prompt Structure:**
- Describe study design and rationale
- Explain study setting and sites
- Detail sample size calculation
- Describe outcome measurement
- Explain statistical analysis plan
- Follow reporting guideline (CONSORT, STROBE, etc.)

**Model:** claude-3-5-sonnet-20241022
**Max Tokens:** 4096
**Temperature:** 0.5

#### `generateDissemination(project): Promise<Paragraph[]>`

Generates 250-word dissemination plan using Claude API.

**Inputs:**
- Project title
- Intended outcomes
- Grant target (optional)

**LLM Prompt Structure:**
- Planned publication venues
- Target audiences
- Knowledge translation strategies
- Community/stakeholder engagement

**Model:** claude-3-5-sonnet-20241022
**Max Tokens:** 1024
**Temperature:** 0.7

### Formatting Functions

#### `formatAimsObjectives(methodology): Paragraph[]`

Structures outcomes into aims and objectives sections.

**Output Structure:**
- Primary aim heading
- Primary outcome definition
- Secondary objectives heading (if applicable)
- Numbered list of secondary objectives

#### `formatParticipants(participants): Paragraph[]`

Formats participant specifications into protocol sections.

**Output Structure:**
- Inclusion criteria (numbered list)
- Exclusion criteria (numbered list)
- Recruitment strategy (method, duration, sites, feasibility)
- Sample size calculation (target, method, assumptions, justification)

#### `formatOutcomes(outcomes): Paragraph[]`

Formats outcome specifications with measurement details.

**Output Structure:**
- Primary outcome section
  - Outcome name
  - Definition
  - Measurement tool
  - Timing
  - Clinically meaningful difference (if applicable)
- Secondary outcomes sections
  - Numbered list of outcomes
  - Definition, measurement tool, timing for each

#### `formatEthics(ethics): Paragraph[]`

Formats ethics evaluation into protocol sections.

**Output Structure:**
- Ethics approval pathway
  - Pathway type
  - Approval body
  - HREC/RGO requirements
  - Estimated timeline
- Risk assessment
  - Overall risk level
  - Risk factors with mitigation
  - National Statement reference
- Consent requirements
  - Consent type
  - Capacity assessment requirements
  - Opt-out availability
  - Process description
  - Waiver justification (if applicable)

## Content Mapping

### PROTOCOL_CONTENT_MAP

Defined mapping structure per spec section 3.6.3:

```typescript
const PROTOCOL_CONTENT_MAP = {
  title_page: {
    source: ['project.intake.project_title', 'project.intake.principal_investigator'],
    template_section: 'header',
  },
  version_history: {
    source: ['document.metadata'],
    template_section: 'version_table',
  },
  protocol_synopsis: {
    source: ['project.intake', 'methodology'],
    template_section: 'synopsis_table',
    word_limit: 500,
  },
  introduction: {
    source: ['research.background_draft'],
    template_section: 'section_1',
    word_limit: 250,
  },
  background: {
    source: ['research.literature_summary', 'research.gap_analysis'],
    template_section: 'section_2',
    word_limit: 1500,
  },
  aims_objectives: {
    source: ['methodology.outcomes'],
    template_section: 'section_3',
    word_limit: 300,
  },
  methods: {
    source: ['methodology'],
    template_section: 'section_4',
    word_limit: 2000,
  },
  participants: {
    source: ['methodology.participants'],
    template_section: 'section_5',
  },
  outcomes: {
    source: ['methodology.outcomes'],
    template_section: 'section_6',
  },
  procedures: {
    source: ['methodology.procedures'],
    template_section: 'section_7',
  },
  data_management: {
    source: ['ethics.data_governance'],
    template_section: 'section_10',
  },
  ethical_considerations: {
    source: ['ethics'],
    template_section: 'section_11',
  },
  dissemination: {
    source: ['project.intake.intended_outcomes'],
    template_section: 'section_12',
    word_limit: 250,
  },
  references: {
    source: ['research.citations'],
    template_section: 'section_13',
  },
  timeline: {
    source: ['methodology.timeline'],
    template_section: 'figure_1',
  },
};
```

## Dependencies

### External Libraries

- `docx` - DOCX document generation
  - Document, Paragraph, TextRun, HeadingLevel
  - Table, TableRow, TableCell
  - WidthType, BorderStyle, AlignmentType
  - Packer

### Internal Modules

- `../types/index.js` - Type definitions
  - Project, ResearchResults, Methodology, EthicsEvaluation
  - ParticipantSpec, OutcomeSpec, Criterion

- `../utils/llm.js` - LLM utility functions
  - callLLM() - Claude API client with retry logic

- `./sections.js` - Document section builders
  - buildTitlePage()
  - buildVersionHistory()
  - buildSection()
  - buildSynopsis()
  - buildReferences()
  - buildBulletList()
  - buildNumberedList()

## Document Formatting

### Page Properties

- **Paper Size:** A4
- **Margins:** 1 inch (1440 DXA/twips) on all sides
- **Font:** Arial 12pt (inherited from sections.js)

### Heading Hierarchy

- **HEADING_1:** Major sections (Introduction, Background, Methods, etc.)
- **HEADING_2:** Subsections (Inclusion Criteria, Primary Outcome, etc.)

### Spacing

- **Before major sections:** 240 twips
- **After major sections:** 120 twips
- **Before subsections:** 200 twips
- **After subsections:** 100 twips
- **Between paragraphs:** 120 twips

### Lists

- **Numbered lists:** Used for criteria, objectives, steps
- **Bullet lists:** Used for brief itemized content

## Word Limits (per spec)

| Section | Word Limit | Method |
|---------|------------|--------|
| Introduction | 250 | LLM-generated with prompt constraint |
| Background | 1500 | From research.evidence_synthesis |
| Aims/Objectives | 300 | Formatted from data |
| Methods | 2000 | LLM-generated with prompt constraint |
| Dissemination | 250 | LLM-generated with prompt constraint |

## Testing

**Test File:** `src/documents/protocol.test.ts`

### Test Coverage

- ✅ formatAimsObjectives() - Correct paragraph generation
- ✅ formatParticipants() - Correct section formatting
- ✅ formatOutcomes() - Primary/secondary outcome structure
- ✅ formatEthics() - Ethics section completeness

### Mock Data

Complete mock objects for testing:
- mockProject - Full Project record
- mockResearch - ResearchResults with citations
- mockMethodology - Complete Methodology specification
- mockEthics - EthicsEvaluation with all pathways

## Usage Example

```typescript
import { generateProtocol } from './documents/protocol.js';
import { Project, ResearchResults, Methodology, EthicsEvaluation } from './types/index.js';
import { writeFile } from 'fs/promises';

// Assuming project, research, methodology, ethics are populated
const buffer = await generateProtocol(project, research, methodology, ethics);

// Save to file
const filename = `protocol-${project.id}.docx`;
await writeFile(filename, buffer);
```

## Integration Points

### Stage 5 Document Agent

This module integrates with the Document Generation Agent (Phase 8):

1. **Input:** Document agent receives project with completed stages 1-4
2. **Determination:** `determineRequiredDocuments()` identifies protocol as required
3. **Generation:** Calls `generateProtocol()` with all stage outputs
4. **Output:** Returns DOCX buffer for storage in documents.generated[]

### n8n Workflow

```javascript
// Document generation node
const protocolBuffer = await generateProtocol(
  project,
  project.research,
  project.methodology,
  project.ethics
);

const filename = `${project.id}-protocol-v1.0.docx`;
await saveDocument(protocolBuffer, filename);
```

## Compliance

### Reporting Guidelines

Protocol structure adapts based on methodology.study_design.reporting_guideline:

- **CONSORT** - RCT protocols
- **STROBE** - Observational studies
- **SQUIRE** - Quality improvement projects
- **PRISMA** - Systematic reviews

### Ethical Standards

- NHMRC National Statement compliance
- Queensland Health Research Governance
- Privacy Act 1988 compliance

## Future Enhancements

### Potential Improvements

1. **Template customization** - Support multiple institutional templates
2. **Rich text support** - Enhanced markdown parsing (tables, images)
3. **Version control** - Document diff tracking between versions
4. **Conditional sections** - Dynamic section inclusion based on study type
5. **Citation management** - Integrated bibliography management
6. **Cross-references** - Automatic section/figure numbering
7. **Track changes** - DOCX revision tracking for multi-author collaboration

## Related Files

- `src/documents/sections.ts` - Reusable section builders
- `src/documents/protocol.test.ts` - Unit tests
- `src/types/index.ts` - Type definitions
- `src/utils/llm.ts` - LLM client utilities
- `TASKS.md` - Phase 8.3 task breakdown
- `qi-research-pipeline-spec.md` - Section 3.6.3 specification

## Completion Status

All required functions from TASKS.md Phase 8.3 have been implemented:

- ✅ 8.3.1: PROTOCOL_CONTENT_MAP mapping implemented
- ✅ 8.3.2: generateIntroduction() with 250 word limit
- ✅ 8.3.3: formatAimsObjectives() method
- ✅ 8.3.4: generateMethods() with 2000 word limit
- ✅ 8.3.5: formatParticipants() with inclusion/exclusion
- ✅ 8.3.6: formatOutcomes() with primary/secondary
- ✅ 8.3.7: formatEthics() with evaluation data
- ✅ 8.3.8: generateDissemination() with 250 word limit
- ✅ 8.3.9: generateProtocol() orchestration method

**Total Implementation Time:** Single session
**File Size:** 728 lines
**Test Coverage:** 4 unit tests
