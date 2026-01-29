# QI/Research Project Development Pipeline

## Application Specification v1.0

**Document Status:** Draft  
**Last Updated:** 2026-01-27  
**Author:** Sean (Emergency Physician, Medical Education Specialist)

---

## 1. Executive Summary

### 1.1 Purpose

This specification defines an LLM-orchestrated pipeline application that automates the development of Quality Improvement (QI) and research projects from initial concept through to submission-ready documentation. The system guides clinicians through structured workflows, performs literature research, develops methodology, and generates compliant documents for ethics approval, grant applications, and organisational submissions.

### 1.2 Problem Statement

Healthcare professionals face significant barriers when initiating QI and research projects:

- Time-intensive literature review and methodology development
- Complex compliance requirements across multiple frameworks (NHMRC, HREC, institutional governance)
- Inconsistent document quality and completeness
- Lengthy approval cycles due to incomplete submissions
- Knowledge gaps in research methodology and grant writing

### 1.3 Solution Overview

An n8n-orchestrated multi-agent system that:

1. **Captures** project concepts through structured intake
2. **Researches** relevant literature and evidence base
3. **Develops** appropriate methodology aligned with study objectives
4. **Evaluates** operational feasibility, ethics requirements, and governance considerations
5. **Generates** compliant, submission-ready documents

### 1.4 Target Users

- Emergency physicians and clinical staff at Metro North Health
- Medical educators and simulation specialists
- Quality improvement coordinators
- Research-active clinicians seeking EMF or similar grant funding

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Web Portal  │  │  Chat Bot    │  │   API        │  │  Email       │    │
│  │  (Primary)   │  │  (Webhook)   │  │   Endpoint   │  │  Intake      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │                  │
          └──────────────────┴────────┬─────────┴──────────────────┘
                                      │
┌─────────────────────────────────────┴───────────────────────────────────────┐
│                           n8n ORCHESTRATION LAYER                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Master Workflow Controller                        │   │
│  │  • Project state management    • Stage transitions                   │   │
│  │  • Error handling & recovery   • Notification dispatch               │   │
│  │  • Audit logging               • Human-in-loop checkpoints           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Intake   │ │ Research │ │ Method   │ │ Ethics   │ │ Document │        │
│  │ Agent    │→│ Agent    │→│ Agent    │→│ Agent    │→│ Agent    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┴───────────────────────────────────────┐
│                           LLM PROCESSING LAYER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │  Claude API     │  │  Research       │  │  Document       │            │
│  │  (Primary LLM)  │  │  Tools          │  │  Generation     │            │
│  │                 │  │  • Web Search   │  │  • DOCX Builder │            │
│  │  • Analysis     │  │  • PubMed API   │  │  • PDF Filler   │            │
│  │  • Generation   │  │  • Semantic     │  │  • Template     │            │
│  │  • Refinement   │  │    Scholar      │  │    Engine       │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┴───────────────────────────────────────┐
│                           DATA & STORAGE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Project     │  │  Template    │  │  Reference   │  │  Output      │   │
│  │  Database    │  │  Repository  │  │  Library     │  │  Storage     │   │
│  │  (Postgres)  │  │  (Git/Files) │  │  (Vector DB) │  │  (S3/Local)  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| Orchestrator | n8n | Workflow management, state transitions, error handling |
| Primary LLM | Claude API | Analysis, content generation, document drafting |
| Research Tools | PubMed API, Web Search | Literature discovery and retrieval |
| Vector Store | ChromaDB/Pinecone | Semantic search over templates and guidelines |
| Document Engine | docx-js, PDF libraries | Template-compliant document generation |
| Database | PostgreSQL | Project state, audit trails, user data |
| File Storage | S3-compatible/Local | Document outputs, attachments |

### 2.3 Integration Points

| External System | Integration Method | Purpose |
|-----------------|-------------------|---------|
| PubMed/MEDLINE | REST API | Literature search |
| Semantic Scholar | REST API | Citation analysis, related papers |
| Zotero/Mendeley | API (optional) | Reference management |
| SharePoint/OneDrive | Graph API (optional) | Document storage, collaboration |
| Email (SMTP) | SMTP | Notifications, document delivery |

---

## 3. Pipeline Stages

### 3.1 Stage Overview

The pipeline follows a sequential workflow with human-in-loop checkpoints at critical decision points. Each stage produces artifacts that inform subsequent stages.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   INTAKE    │───▶│  RESEARCH   │───▶│  METHODS    │───▶│   ETHICS    │───▶│  DOCUMENTS  │
│             │    │             │    │             │    │             │    │             │
│ • Concept   │    │ • Literature│    │ • Design    │    │ • Risk      │    │ • Protocol  │
│ • Scope     │    │ • Gap       │    │ • Analysis  │    │ • Consent   │    │ • Grant App │
│ • Type      │    │   Analysis  │    │ • Outcomes  │    │ • Governance│    │ • HREC      │
│ • Team      │    │ • Evidence  │    │ • Timeline  │    │ • Data Mgmt │    │ • QI Plan   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼                  ▼
 [CHECKPOINT]      [CHECKPOINT]      [CHECKPOINT]      [CHECKPOINT]       [FINAL REVIEW]
   User Review      User Review       User Review       User Review        User Approval
```

### 3.2 Stage 1: Project Intake

**Purpose:** Capture project concept and establish scope, type, and initial parameters.

#### 3.2.1 Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_title` | string | Yes | Working title for the project |
| `project_type` | enum | Yes | `QI`, `RESEARCH`, `HYBRID` |
| `concept_description` | text | Yes | Free-text description of the project concept (500-2000 chars) |
| `clinical_problem` | text | Yes | Description of the clinical problem being addressed |
| `target_population` | text | Yes | Patient/participant population |
| `setting` | text | Yes | Clinical setting (e.g., ED, ICU, prehospital) |
| `principal_investigator` | object | Yes | PI details (name, role, institution) |
| `co_investigators` | array | No | List of co-investigators |
| `intended_outcomes` | text | Yes | What the project hopes to achieve |
| `grant_target` | enum | No | `EMF_JUMPSTART`, `EMF_LEADING_EDGE`, `EMF_TRANSLATED`, `INTERNAL`, `OTHER` |
| `timeline_constraint` | object | No | Target dates for submission/completion |

#### 3.2.2 Processing Logic

```javascript
// Intake Agent Processing
async function processIntake(intake_data) {
    // 1. Validate required fields
    validateRequiredFields(intake_data);
    
    // 2. Classify project type with LLM assistance
    const classification = await classifyProjectType({
        concept: intake_data.concept_description,
        intended_outcomes: intake_data.intended_outcomes
    });
    
    // 3. Determine applicable frameworks
    const frameworks = determineFrameworks({
        project_type: classification.project_type,
        setting: intake_data.setting,
        population: intake_data.target_population,
        grant_target: intake_data.grant_target
    });
    
    // 4. Generate initial project structure
    const project = {
        id: generateProjectId(),
        status: 'INTAKE_COMPLETE',
        intake: intake_data,
        classification: classification,
        frameworks: frameworks,
        created_at: new Date().toISOString(),
        audit_log: [{
            timestamp: new Date().toISOString(),
            action: 'PROJECT_CREATED',
            details: { source: 'intake_agent' }
        }]
    };
    
    // 5. Store and notify
    await storeProject(project);
    await notifyUser('INTAKE_COMPLETE', project);
    
    return project;
}
```

#### 3.2.3 Outputs

| Output | Format | Description |
|--------|--------|-------------|
| `project_record` | JSON | Structured project record with unique ID |
| `classification_report` | JSON | Project type classification with confidence |
| `framework_requirements` | JSON | Applicable reporting/ethics frameworks |
| `research_brief` | Markdown | Initial brief for research agent |

#### 3.2.4 Checkpoint: User Review

- Confirm project classification (QI vs Research vs Hybrid)
- Validate team composition meets requirements
- Approve research direction and scope
- Identify any known literature or prior work

---

### 3.3 Stage 2: Research & Literature Review

**Purpose:** Conduct comprehensive literature review, identify knowledge gaps, and establish evidence base.

#### 3.3.1 Inputs

| Input | Source | Description |
|-------|--------|-------------|
| `research_brief` | Stage 1 | Structured research questions |
| `clinical_problem` | Stage 1 | Problem statement for context |
| `target_population` | Stage 1 | Population for relevance filtering |
| `user_references` | User | Any known papers or prior work |

#### 3.3.2 Processing Logic

```javascript
// Research Agent Processing
async function conductResearch(project) {
    const research_results = {
        search_strategy: null,
        primary_literature: [],
        secondary_literature: [],
        gap_analysis: null,
        evidence_synthesis: null,
        citations: []
    };
    
    // 1. Generate search strategy
    research_results.search_strategy = await generateSearchStrategy({
        problem: project.intake.clinical_problem,
        population: project.intake.target_population,
        outcomes: project.intake.intended_outcomes
    });
    
    // 2. Execute literature searches
    const search_results = await Promise.all([
        searchPubMed(research_results.search_strategy.pubmed_query),
        searchSemanticScholar(research_results.search_strategy.semantic_query),
        searchCochrane(research_results.search_strategy.cochrane_query)
    ]);
    
    // 3. Deduplicate and rank results
    const ranked_papers = await rankAndDeduplicateResults(search_results);
    
    // 4. Retrieve and process key papers
    for (const paper of ranked_papers.slice(0, 30)) {
        const processed = await processArticle(paper);
        if (processed.relevance_score > 0.7) {
            research_results.primary_literature.push(processed);
        } else if (processed.relevance_score > 0.4) {
            research_results.secondary_literature.push(processed);
        }
    }
    
    // 5. Synthesize evidence and identify gaps
    research_results.gap_analysis = await analyzeGaps({
        literature: research_results.primary_literature,
        project_concept: project.intake.concept_description
    });
    
    research_results.evidence_synthesis = await synthesizeEvidence({
        literature: research_results.primary_literature,
        gap_analysis: research_results.gap_analysis
    });
    
    // 6. Format citations
    research_results.citations = formatCitations(
        research_results.primary_literature,
        'VANCOUVER' // Default for medical research
    );
    
    return research_results;
}
```

#### 3.3.3 Outputs

| Output | Format | Description |
|--------|--------|-------------|
| `search_strategy` | JSON | Documented search strategy with queries |
| `literature_summary` | Markdown | Synthesized literature review (2-3 pages) |
| `gap_analysis` | JSON/Markdown | Identified knowledge gaps |
| `evidence_table` | JSON | Structured evidence extraction |
| `reference_library` | BibTeX/JSON | Formatted citations |
| `background_draft` | Markdown | Draft background section for protocol |

#### 3.3.4 Checkpoint: User Review

- Validate search strategy completeness
- Confirm key papers identified
- Review gap analysis accuracy
- Add any missed literature
- Approve evidence synthesis direction

---

### 3.4 Stage 3: Methodology Development

**Purpose:** Develop appropriate study design, analysis plan, and operational procedures.

#### 3.4.1 Inputs

| Input | Source | Description |
|-------|--------|-------------|
| `project_classification` | Stage 1 | QI/Research type |
| `gap_analysis` | Stage 2 | Knowledge gaps to address |
| `evidence_synthesis` | Stage 2 | Current evidence base |
| `target_population` | Stage 1 | Study population |
| `intended_outcomes` | Stage 1 | Desired project outcomes |
| `grant_requirements` | Stage 1 | Funding scheme requirements |

#### 3.4.2 Processing Logic

```javascript
// Methods Agent Processing
async function developMethodology(project, research_results) {
    const methodology = {
        study_design: null,
        setting_sites: null,
        participants: {
            inclusion_criteria: [],
            exclusion_criteria: [],
            sample_size: null,
            recruitment_strategy: null
        },
        outcomes: {
            primary: null,
            secondary: []
        },
        procedures: null,
        data_collection: null,
        analysis_plan: null,
        timeline: null
    };
    
    // 1. Determine optimal study design
    methodology.study_design = await determineStudyDesign({
        project_type: project.classification.project_type,
        research_question: project.intake.concept_description,
        evidence_gaps: research_results.gap_analysis,
        feasibility_constraints: project.intake.timeline_constraint
    });
    
    // 2. Define participant criteria
    methodology.participants = await defineParticipantCriteria({
        target_population: project.intake.target_population,
        study_design: methodology.study_design,
        evidence_base: research_results.evidence_synthesis
    });
    
    // 3. Calculate sample size (if applicable)
    if (methodology.study_design.requires_sample_size) {
        methodology.participants.sample_size = await calculateSampleSize({
            design: methodology.study_design,
            effect_size: estimateEffectSize(research_results.evidence_synthesis),
            power: 0.80,
            alpha: 0.05
        });
    }
    
    // 4. Define outcomes with measurement approach
    methodology.outcomes = await defineOutcomes({
        intended_outcomes: project.intake.intended_outcomes,
        study_design: methodology.study_design,
        reporting_guideline: determineReportingGuideline(methodology.study_design)
    });
    
    // 5. Design procedures and data collection
    methodology.procedures = await designProcedures({
        study_design: methodology.study_design,
        outcomes: methodology.outcomes,
        setting: project.intake.setting
    });
    
    methodology.data_collection = await planDataCollection({
        outcomes: methodology.outcomes,
        procedures: methodology.procedures
    });
    
    // 6. Develop analysis plan
    methodology.analysis_plan = await developAnalysisPlan({
        study_design: methodology.study_design,
        outcomes: methodology.outcomes,
        sample_size: methodology.participants.sample_size
    });
    
    // 7. Create project timeline
    methodology.timeline = await generateTimeline({
        methodology: methodology,
        grant_deadlines: project.intake.timeline_constraint,
        recruitment_period: estimateRecruitmentPeriod(methodology.participants)
    });
    
    return methodology;
}
```

#### 3.4.3 Design Selection Logic

```javascript
// Study Design Decision Matrix
const DESIGN_MATRIX = {
    QI: {
        default: 'PDSA_CYCLE',
        options: ['PDSA_CYCLE', 'IHI_MODEL', 'LEAN_SIX_SIGMA', 'PRE_POST'],
        reporting_guideline: 'SQUIRE'
    },
    RESEARCH: {
        interventional: {
            randomised: {
                default: 'RCT',
                options: ['RCT', 'CLUSTER_RCT', 'STEPPED_WEDGE'],
                reporting_guideline: 'CONSORT'
            },
            non_randomised: {
                default: 'QUASI_EXPERIMENTAL',
                options: ['PRE_POST', 'ITS', 'CONTROLLED_BA'],
                reporting_guideline: 'TREND'
            }
        },
        observational: {
            default: 'COHORT',
            options: ['COHORT', 'CASE_CONTROL', 'CROSS_SECTIONAL'],
            reporting_guideline: 'STROBE'
        },
        qualitative: {
            default: 'THEMATIC_ANALYSIS',
            options: ['THEMATIC', 'GROUNDED_THEORY', 'PHENOMENOLOGY'],
            reporting_guideline: 'SRQR'
        },
        mixed_methods: {
            default: 'CONVERGENT_PARALLEL',
            options: ['CONVERGENT', 'EXPLANATORY_SEQUENTIAL', 'EXPLORATORY'],
            reporting_guideline: 'GRAMMS'
        },
        systematic_review: {
            default: 'SYSTEMATIC_REVIEW',
            options: ['SYSTEMATIC_REVIEW', 'SCOPING_REVIEW', 'META_ANALYSIS'],
            reporting_guideline: 'PRISMA'
        }
    }
};
```

#### 3.4.4 Outputs

| Output | Format | Description |
|--------|--------|-------------|
| `methodology_summary` | Markdown | Complete methodology overview |
| `study_design_rationale` | Markdown | Justification for chosen design |
| `participant_specification` | JSON | Inclusion/exclusion criteria, sample size |
| `outcome_definitions` | JSON | Primary/secondary outcomes with measures |
| `analysis_plan` | Markdown | Statistical/analytical approach |
| `project_timeline` | JSON/Gantt | Milestone-based timeline |
| `methods_draft` | Markdown | Draft methods section for protocol |

#### 3.4.5 Checkpoint: User Review

- Confirm study design appropriateness
- Validate sample size assumptions
- Review outcome measures feasibility
- Approve data collection approach
- Verify timeline realism

---

### 3.5 Stage 4: Ethics & Governance Evaluation

**Purpose:** Assess ethical considerations, determine approval pathways, and prepare governance documentation.

#### 3.5.1 Inputs

| Input | Source | Description |
|-------|--------|-------------|
| `project_classification` | Stage 1 | QI vs Research determination |
| `methodology` | Stage 3 | Full methodology specification |
| `participant_criteria` | Stage 3 | Population and recruitment details |
| `data_collection` | Stage 3 | Data handling approach |

#### 3.5.2 Processing Logic

```javascript
// Ethics Agent Processing
async function evaluateEthicsGovernance(project, methodology) {
    const ethics_evaluation = {
        ethics_pathway: null,
        risk_assessment: null,
        consent_requirements: null,
        data_governance: null,
        site_requirements: null,
        governance_checklist: null
    };
    
    // 1. Determine ethics approval pathway
    ethics_evaluation.ethics_pathway = await determineEthicsPathway({
        project_type: project.classification.project_type,
        involves_human_participants: methodology.participants !== null,
        involves_patient_data: methodology.data_collection.includes_identifiable_data,
        is_multisite: methodology.setting_sites.length > 1,
        institution: project.intake.principal_investigator.institution
    });
    
    // 2. Conduct risk assessment per National Statement
    ethics_evaluation.risk_assessment = await assessRisk({
        methodology: methodology,
        participant_vulnerability: assessVulnerability(methodology.participants),
        intervention_invasiveness: assessInterventionRisk(methodology.procedures),
        data_sensitivity: assessDataSensitivity(methodology.data_collection)
    });
    
    // 3. Determine consent requirements
    ethics_evaluation.consent_requirements = await determineConsentRequirements({
        risk_level: ethics_evaluation.risk_assessment.level,
        participant_capacity: methodology.participants.capacity_issues,
        data_use: methodology.data_collection,
        waiver_justification: evaluateWaiverEligibility(methodology)
    });
    
    // 4. Plan data governance
    ethics_evaluation.data_governance = await planDataGovernance({
        data_types: methodology.data_collection.data_types,
        storage_requirements: getStorageRequirements(methodology.data_collection),
        retention_period: calculateRetentionPeriod(methodology.study_design),
        disposal_method: determineDisposalMethod(methodology.data_collection)
    });
    
    // 5. Identify site-specific requirements
    ethics_evaluation.site_requirements = await identifySiteRequirements({
        sites: methodology.setting_sites,
        ethics_pathway: ethics_evaluation.ethics_pathway
    });
    
    // 6. Generate governance compliance checklist
    ethics_evaluation.governance_checklist = generateGovernanceChecklist({
        pathway: ethics_evaluation.ethics_pathway,
        institution: 'METRO_NORTH_HEALTH',
        frameworks: [
            'NHMRC_NATIONAL_STATEMENT',
            'QH_RESEARCH_GOVERNANCE',
            'MN_CLINICAL_GOVERNANCE_POLICY',
            'PRIVACY_ACT_1988',
            'INFORMATION_PRIVACY_ACT_2009_QLD'
        ]
    });
    
    return ethics_evaluation;
}
```

#### 3.5.3 Ethics Pathway Decision Tree

```javascript
// Ethics Pathway Determination
function determineEthicsPathway(params) {
    // QI Projects
    if (params.project_type === 'QI') {
        return {
            pathway: 'QI_REGISTRATION',
            approval_body: 'UNIT_DIRECTOR',
            requires_hrec: false,
            requires_rgo: false,
            estimated_timeline: '2-4 weeks',
            forms: ['QI_PROJECT_PLAN']
        };
    }
    
    // Research Projects
    if (params.project_type === 'RESEARCH') {
        const is_low_risk = assessIfLowRisk(params);
        
        if (is_low_risk) {
            return {
                pathway: 'LOW_RISK_RESEARCH',
                approval_body: 'HOSPITAL_LNR_COMMITTEE',
                requires_hrec: false,
                requires_rgo: true,
                estimated_timeline: '4-6 weeks',
                forms: ['LNR_APPLICATION', 'RESEARCH_PROTOCOL', 'SITE_ASSESSMENT']
            };
        }
        
        return {
            pathway: 'FULL_HREC_REVIEW',
            approval_body: params.is_multisite ? 'RMH_HREC' : 'MN_HREC',
            requires_hrec: true,
            requires_rgo: true,
            estimated_timeline: '8-16 weeks',
            forms: ['HREC_APPLICATION', 'RESEARCH_PROTOCOL', 'PICF', 
                    'SITE_ASSESSMENT', 'INVESTIGATOR_CV', 'COVER_LETTER']
        };
    }
    
    // Hybrid - defaults to research pathway
    return {
        pathway: 'HYBRID_REVIEW',
        approval_body: 'DUAL_REVIEW',
        requires_hrec: true,
        requires_rgo: true,
        estimated_timeline: '10-16 weeks',
        forms: ['HREC_APPLICATION', 'QI_PROJECT_PLAN', 'RESEARCH_PROTOCOL']
    };
}
```

#### 3.5.4 Outputs

| Output | Format | Description |
|--------|--------|-------------|
| `ethics_pathway` | JSON | Approval pathway and requirements |
| `risk_assessment` | JSON/Markdown | Formal risk classification |
| `consent_specification` | JSON | Consent type and requirements |
| `data_management_plan` | Markdown | Full data governance plan |
| `governance_checklist` | JSON | Compliance requirements tracker |
| `ethics_considerations_draft` | Markdown | Draft ethics section for protocol |

#### 3.5.5 Checkpoint: User Review

- Confirm ethics pathway appropriate
- Validate risk assessment accuracy
- Review consent approach feasibility
- Approve data management plan
- Identify any governance concerns

---

### 3.6 Stage 5: Document Generation

**Purpose:** Generate all required submission documents using approved templates and content.

#### 3.6.1 Document Types by Output

| Document | Template Source | Primary Use |
|----------|-----------------|-------------|
| Research Protocol | mnh-protocol-template.docx | Ethics submission, governance |
| QI Project Plan | mnh-quality-initiative-template.docx | QI registration |
| EMF Grant Application | EMF-R44-Application-form.docx | EMF funding |
| HREC Cover Letter | hrec-coverletter.docx | Ethics submission |
| Participant Information Sheet | PICF template | Consent documentation |
| Data Management Plan | DMP template | Governance requirement |

#### 3.6.2 Processing Logic

```javascript
// Document Agent Processing
async function generateDocuments(project, research, methodology, ethics) {
    const documents = {
        generated: [],
        pending_review: [],
        metadata: {}
    };
    
    // 1. Determine required documents based on pathway
    const required_docs = determineRequiredDocuments({
        ethics_pathway: ethics.ethics_pathway,
        grant_target: project.intake.grant_target,
        project_type: project.classification.project_type
    });
    
    // 2. Generate each required document
    for (const doc_type of required_docs) {
        const template = await loadTemplate(doc_type);
        
        // Prepare content using two-stage writing process
        const outline = await generateDocumentOutline({
            doc_type: doc_type,
            project: project,
            research: research,
            methodology: methodology,
            ethics: ethics
        });
        
        // Convert outline to prose (scientific writing skill approach)
        const prose_content = await convertOutlineToProse({
            outline: outline,
            style: getWritingStyle(doc_type),
            word_limits: getWordLimits(doc_type)
        });
        
        // Generate document using template
        const generated_doc = await populateTemplate({
            template: template,
            content: prose_content,
            metadata: {
                project_id: project.id,
                version: '1.0',
                generated_at: new Date().toISOString()
            }
        });
        
        documents.generated.push({
            type: doc_type,
            filename: generateFilename(doc_type, project),
            path: await saveDocument(generated_doc),
            status: 'DRAFT'
        });
    }
    
    // 3. Cross-reference documents for consistency
    await validateCrossReferences(documents.generated);
    
    // 4. Generate document package summary
    documents.metadata = {
        total_documents: documents.generated.length,
        submission_checklist: generateSubmissionChecklist(required_docs, ethics),
        estimated_pages: calculateTotalPages(documents.generated)
    };
    
    return documents;
}
```

#### 3.6.3 Document Content Mapping

```javascript
// Research Protocol Content Mapping
const PROTOCOL_CONTENT_MAP = {
    'title_page': {
        source: ['project.intake.project_title', 'project.intake.principal_investigator'],
        template_section: 'header'
    },
    'version_history': {
        source: ['document.metadata'],
        template_section: 'version_table'
    },
    'protocol_synopsis': {
        source: ['project.intake', 'methodology'],
        template_section: 'synopsis_table',
        word_limit: 500
    },
    'introduction': {
        source: ['research.background_draft'],
        template_section: 'section_1',
        word_limit: 250
    },
    'background': {
        source: ['research.literature_summary', 'research.gap_analysis'],
        template_section: 'section_2',
        word_limit: 1500
    },
    'aims_objectives': {
        source: ['methodology.outcomes'],
        template_section: 'section_3',
        word_limit: 300
    },
    'methods': {
        source: ['methodology'],
        template_section: 'section_4',
        word_limit: 2000
    },
    'participants': {
        source: ['methodology.participants'],
        template_section: 'section_5'
    },
    'outcomes': {
        source: ['methodology.outcomes'],
        template_section: 'section_6'
    },
    'procedures': {
        source: ['methodology.procedures'],
        template_section: 'section_7'
    },
    'data_management': {
        source: ['ethics.data_governance'],
        template_section: 'section_10'
    },
    'ethical_considerations': {
        source: ['ethics'],
        template_section: 'section_11'
    },
    'dissemination': {
        source: ['project.intake.intended_outcomes'],
        template_section: 'section_12',
        word_limit: 250
    },
    'references': {
        source: ['research.citations'],
        template_section: 'section_13'
    },
    'timeline': {
        source: ['methodology.timeline'],
        template_section: 'figure_1'
    }
};
```

#### 3.6.4 EMF Grant Application Mapping

```javascript
// EMF Application Content Mapping
const EMF_APPLICATION_MAP = {
    'A1_project_title': {
        source: 'project.intake.project_title',
        word_limit: 30
    },
    'A2_principal_investigator': {
        source: 'project.intake.principal_investigator'
    },
    'A3_administering_institution': {
        source: 'project.intake.principal_investigator.institution'
    },
    'A4_plain_language_summary': {
        source: ['project.intake.concept_description', 'methodology'],
        style: 'PLAIN_LANGUAGE',
        word_limit: 250
    },
    'A5_scientific_abstract': {
        source: ['research', 'methodology'],
        style: 'SCIENTIFIC_ABSTRACT',
        word_limit: 450
    },
    'A6_em_relevance': {
        source: ['project.intake.clinical_problem', 'research.gap_analysis'],
        word_limit: 100
    },
    'A7_research_themes': {
        source: 'methodology.study_design',
        type: 'CHECKBOX_SELECTION'
    },
    'B1_background_rationale': {
        source: ['research.literature_summary', 'research.gap_analysis'],
        word_limit: 1500
    },
    'B2_aims_objectives': {
        source: 'methodology.outcomes',
        word_limit: 300
    },
    'B3_design_methods': {
        source: 'methodology',
        word_limit: 2000
    },
    'B4_innovation_impact': {
        source: ['research.gap_analysis', 'project.intake.intended_outcomes'],
        word_limit: 750
    },
    'B5_translation_plan': {
        source: ['project.intake.intended_outcomes', 'methodology'],
        word_limit: 400
    },
    'B6_references': {
        source: 'research.citations'
    },
    'B7_project_sites': {
        source: 'methodology.setting_sites'
    },
    'C1_ethics_status': {
        source: 'ethics.ethics_pathway'
    },
    'C2_indigenous_relevance': {
        source: 'methodology.participants',
        requires_assessment: true
    },
    'D_health_economics': {
        source: 'methodology.analysis_plan',
        conditional: 'if_applicable'
    },
    'E_budget': {
        source: 'methodology.timeline',
        requires_calculation: true
    },
    'F_principal_investigator': {
        source: 'project.intake.principal_investigator',
        includes_cv: true
    },
    'G_research_team': {
        source: 'project.intake.co_investigators'
    }
};
```

#### 3.6.5 Outputs

| Output | Format | Description |
|--------|--------|-------------|
| `research_protocol.docx` | DOCX | Complete research protocol |
| `qi_project_plan.docx` | DOCX | QI registration document |
| `emf_application.docx` | DOCX | Grant application form |
| `hrec_cover_letter.docx` | DOCX | Ethics cover letter |
| `participant_info_sheet.docx` | DOCX | PICF if required |
| `data_management_plan.docx` | DOCX | DMP document |
| `submission_package.zip` | ZIP | Complete submission bundle |
| `document_summary.json` | JSON | Document metadata and status |

#### 3.6.6 Final Review Checkpoint

- Review all generated documents
- Verify consistency across documents
- Check word limits compliance
- Validate formatting and branding
- Approve for submission

---

## 4. Data Models

### 4.1 Core Data Structures

#### 4.1.1 Project Record

```typescript
interface Project {
    id: string;                          // Unique project identifier (UUID)
    status: ProjectStatus;               // Current pipeline stage
    created_at: string;                  // ISO timestamp
    updated_at: string;                  // ISO timestamp
    
    // Stage 1: Intake
    intake: {
        project_title: string;
        project_type: 'QI' | 'RESEARCH' | 'HYBRID';
        concept_description: string;
        clinical_problem: string;
        target_population: string;
        setting: string;
        principal_investigator: Investigator;
        co_investigators: Investigator[];
        intended_outcomes: string;
        grant_target?: GrantType;
        timeline_constraint?: TimelineConstraint;
    };
    
    // Stage 1 Output
    classification: {
        project_type: 'QI' | 'RESEARCH' | 'HYBRID';
        confidence: number;
        reasoning: string;
        suggested_designs: string[];
    };
    
    frameworks: {
        reporting_guideline: string;
        ethics_framework: string;
        governance_requirements: string[];
    };
    
    // Stage 2: Research
    research?: {
        search_strategy: SearchStrategy;
        primary_literature: ProcessedArticle[];
        secondary_literature: ProcessedArticle[];
        gap_analysis: GapAnalysis;
        evidence_synthesis: string;
        citations: Citation[];
    };
    
    // Stage 3: Methodology
    methodology?: {
        study_design: StudyDesign;
        setting_sites: Site[];
        participants: ParticipantSpec;
        outcomes: OutcomeSpec;
        procedures: ProcedureSpec;
        data_collection: DataCollectionSpec;
        analysis_plan: AnalysisPlan;
        timeline: ProjectTimeline;
    };
    
    // Stage 4: Ethics
    ethics?: {
        ethics_pathway: EthicsPathway;
        risk_assessment: RiskAssessment;
        consent_requirements: ConsentSpec;
        data_governance: DataGovernanceSpec;
        site_requirements: SiteRequirement[];
        governance_checklist: ChecklistItem[];
    };
    
    // Stage 5: Documents
    documents?: {
        generated: GeneratedDocument[];
        pending_review: string[];
        metadata: DocumentMetadata;
    };
    
    // Audit trail
    audit_log: AuditEntry[];
    
    // Checkpoints
    checkpoints: {
        intake_approved: boolean;
        research_approved: boolean;
        methodology_approved: boolean;
        ethics_approved: boolean;
        documents_approved: boolean;
    };
}

type ProjectStatus = 
    | 'DRAFT'
    | 'INTAKE_COMPLETE'
    | 'INTAKE_APPROVED'
    | 'RESEARCH_COMPLETE'
    | 'RESEARCH_APPROVED'
    | 'METHODOLOGY_COMPLETE'
    | 'METHODOLOGY_APPROVED'
    | 'ETHICS_COMPLETE'
    | 'ETHICS_APPROVED'
    | 'DOCUMENTS_COMPLETE'
    | 'DOCUMENTS_APPROVED'
    | 'SUBMITTED'
    | 'REVISION_REQUIRED'
    | 'COMPLETED'
    | 'ARCHIVED';
```

#### 4.1.2 Supporting Types

```typescript
interface Investigator {
    name: string;
    role: 'PI' | 'CO_I' | 'ASSOCIATE';
    title: string;
    institution: string;
    department: string;
    email: string;
    phone?: string;
    orcid?: string;
    expertise: string[];
}

interface SearchStrategy {
    pubmed_query: string;
    semantic_query: string;
    cochrane_query?: string;
    mesh_terms: string[];
    keywords: string[];
    date_range: {
        start: string;
        end: string;
    };
    search_date: string;
    results_count: number;
}

interface ProcessedArticle {
    pmid?: string;
    doi?: string;
    title: string;
    authors: string[];
    journal: string;
    year: number;
    abstract: string;
    relevance_score: number;
    key_findings: string[];
    methodology_notes: string;
    limitations: string[];
    full_text_available: boolean;
}

interface StudyDesign {
    type: string;
    subtype?: string;
    reporting_guideline: string;
    is_randomised: boolean;
    is_blinded: boolean;
    blinding_type?: string;
    control_type?: string;
    requires_sample_size: boolean;
    justification: string;
}

interface ParticipantSpec {
    inclusion_criteria: Criterion[];
    exclusion_criteria: Criterion[];
    sample_size?: {
        target: number;
        calculation_method: string;
        assumptions: {
            effect_size: number;
            power: number;
            alpha: number;
            attrition_rate: number;
        };
        justification: string;
    };
    recruitment_strategy: {
        method: string;
        sites: string[];
        estimated_duration: string;
        feasibility_justification: string;
    };
    capacity_issues: boolean;
    vulnerable_population: boolean;
}

interface OutcomeSpec {
    primary: {
        name: string;
        definition: string;
        measurement_tool: string;
        measurement_timing: string;
        clinically_meaningful_difference?: number;
    };
    secondary: {
        name: string;
        definition: string;
        measurement_tool: string;
        measurement_timing: string;
    }[];
}

interface EthicsPathway {
    pathway: 'QI_REGISTRATION' | 'LOW_RISK_RESEARCH' | 'FULL_HREC_REVIEW' | 'HYBRID_REVIEW';
    approval_body: string;
    requires_hrec: boolean;
    requires_rgo: boolean;
    estimated_timeline: string;
    forms: string[];
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUIRED';
    reference_number?: string;
}

interface RiskAssessment {
    level: 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'HIGH';
    factors: {
        category: string;
        risk_level: string;
        mitigation: string;
    }[];
    overall_justification: string;
    national_statement_reference: string;
}
```

### 4.2 Database Schema

```sql
-- Core project table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Intake data (JSONB for flexibility)
    intake JSONB NOT NULL,
    
    -- Classification results
    classification JSONB,
    frameworks JSONB,
    
    -- Stage outputs (JSONB)
    research JSONB,
    methodology JSONB,
    ethics JSONB,
    documents JSONB,
    
    -- Checkpoints
    checkpoints JSONB DEFAULT '{}',
    
    -- Owner
    owner_id UUID REFERENCES users(id),
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255),
    details JSONB,
    previous_state JSONB,
    new_state JSONB
);

-- Document storage metadata
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    document_type VARCHAR(100) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    version VARCHAR(20),
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Literature/references table
CREATE TABLE references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    pmid VARCHAR(20),
    doi VARCHAR(100),
    title TEXT NOT NULL,
    authors JSONB,
    journal VARCHAR(500),
    year INTEGER,
    abstract TEXT,
    relevance_score DECIMAL(3,2),
    key_findings JSONB,
    citation_formatted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_audit_project ON audit_log(project_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_references_project ON references(project_id);
```

---

## 5. n8n Workflow Specifications

### 5.1 Master Workflow

```json
{
  "name": "QI-Research Pipeline Master",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "qi-research-intake",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Validate Input",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Validate intake data...\nreturn items;"
      }
    },
    {
      "name": "Execute Intake Stage",
      "type": "n8n-nodes-base.executeWorkflow",
      "parameters": {
        "workflowId": "={{ $workflow.id }}_intake"
      }
    },
    {
      "name": "Checkpoint: Intake Review",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "resume": "webhook",
        "webhookSuffix": "intake-approved"
      }
    },
    {
      "name": "Execute Research Stage",
      "type": "n8n-nodes-base.executeWorkflow",
      "parameters": {
        "workflowId": "={{ $workflow.id }}_research"
      }
    },
    {
      "name": "Checkpoint: Research Review",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "resume": "webhook",
        "webhookSuffix": "research-approved"
      }
    },
    {
      "name": "Execute Methods Stage",
      "type": "n8n-nodes-base.executeWorkflow",
      "parameters": {
        "workflowId": "={{ $workflow.id }}_methodology"
      }
    },
    {
      "name": "Checkpoint: Methods Review",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "resume": "webhook",
        "webhookSuffix": "methods-approved"
      }
    },
    {
      "name": "Execute Ethics Stage",
      "type": "n8n-nodes-base.executeWorkflow",
      "parameters": {
        "workflowId": "={{ $workflow.id }}_ethics"
      }
    },
    {
      "name": "Checkpoint: Ethics Review",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "resume": "webhook",
        "webhookSuffix": "ethics-approved"
      }
    },
    {
      "name": "Execute Document Stage",
      "type": "n8n-nodes-base.executeWorkflow",
      "parameters": {
        "workflowId": "={{ $workflow.id }}_documents"
      }
    },
    {
      "name": "Final Review Notification",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "fromEmail": "qi-pipeline@metronorth.health.qld.gov.au",
        "toEmail": "={{ $json.principal_investigator.email }}",
        "subject": "Project Documents Ready for Review: {{ $json.project_title }}",
        "text": "Your project documents are ready for final review..."
      }
    },
    {
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}"
      }
    }
  ]
}
```

### 5.2 Research Sub-Workflow

```json
{
  "name": "QI-Research Pipeline: Research Stage",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.executeWorkflowTrigger"
    },
    {
      "name": "Generate Search Strategy",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "model": "claude-sonnet-4-20250514",
        "systemMessage": "You are a research librarian specialising in emergency medicine...",
        "prompt": "Generate a comprehensive search strategy for: {{ $json.clinical_problem }}"
      }
    },
    {
      "name": "Search PubMed",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
        "method": "GET",
        "qs": {
          "db": "pubmed",
          "term": "={{ $json.search_query }}",
          "retmax": "100",
          "retmode": "json"
        }
      }
    },
    {
      "name": "Fetch Abstracts",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
        "method": "GET",
        "qs": {
          "db": "pubmed",
          "id": "={{ $json.id_list.join(',') }}",
          "rettype": "abstract",
          "retmode": "xml"
        }
      }
    },
    {
      "name": "Process and Rank Articles",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "model": "claude-sonnet-4-20250514",
        "systemMessage": "You are analysing research articles for relevance...",
        "prompt": "Rank and summarise these articles for relevance to: {{ $json.clinical_problem }}"
      }
    },
    {
      "name": "Synthesise Evidence",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "model": "claude-sonnet-4-20250514",
        "systemMessage": "You are synthesising research evidence...",
        "prompt": "Create an evidence synthesis from these articles..."
      }
    },
    {
      "name": "Identify Gaps",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "model": "claude-sonnet-4-20250514",
        "systemMessage": "You are identifying knowledge gaps...",
        "prompt": "Identify knowledge gaps based on: {{ $json.evidence_synthesis }}"
      }
    },
    {
      "name": "Format Citations",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Format citations in Vancouver style..."
      }
    },
    {
      "name": "Update Project Record",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "update",
        "table": "projects",
        "columns": "research, status, updated_at"
      }
    },
    {
      "name": "Send Review Notification",
      "type": "n8n-nodes-base.emailSend"
    }
  ]
}
```

### 5.3 Document Generation Sub-Workflow

```json
{
  "name": "QI-Research Pipeline: Document Generation",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.executeWorkflowTrigger"
    },
    {
      "name": "Determine Required Documents",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Determine documents based on pathway..."
      }
    },
    {
      "name": "Split by Document Type",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": {
        "batchSize": 1
      }
    },
    {
      "name": "Load Template",
      "type": "n8n-nodes-base.readBinaryFiles",
      "parameters": {
        "fileSelector": "={{ '/templates/' + $json.template_name }}"
      }
    },
    {
      "name": "Generate Section Outlines",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "model": "claude-sonnet-4-20250514",
        "systemMessage": "Generate document section outlines following scientific writing principles...",
        "prompt": "Create outline for {{ $json.section_name }}..."
      }
    },
    {
      "name": "Convert to Prose",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "model": "claude-sonnet-4-20250514",
        "systemMessage": "Convert outlines to flowing prose paragraphs...",
        "prompt": "Convert this outline to full paragraphs: {{ $json.outline }}"
      }
    },
    {
      "name": "Populate Template",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "language": "javaScript",
        "jsCode": "// Use docx-js to populate template..."
      }
    },
    {
      "name": "Save Document",
      "type": "n8n-nodes-base.writeBinaryFile",
      "parameters": {
        "fileName": "={{ $json.output_filename }}"
      }
    },
    {
      "name": "Store Document Metadata",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "documents"
      }
    },
    {
      "name": "Merge Results",
      "type": "n8n-nodes-base.merge",
      "parameters": {
        "mode": "append"
      }
    },
    {
      "name": "Create Submission Package",
      "type": "n8n-nodes-base.compression",
      "parameters": {
        "operation": "create",
        "format": "zip"
      }
    }
  ]
}
```

---

## 6. LLM Integration Specifications

### 6.1 Model Selection

| Task Type | Recommended Model | Rationale |
|-----------|------------------|-----------|
| Complex analysis | Claude Sonnet 4 | Balance of capability and cost |
| Document generation | Claude Sonnet 4 | High-quality prose generation |
| Simple extraction | Claude Haiku 4 | Cost-effective for structured tasks |
| Code generation | Claude Sonnet 4 | Reliable code output |

### 6.2 Prompt Templates

#### 6.2.1 Project Classification Prompt

```markdown
You are an expert in healthcare research methodology and quality improvement. Analyse the following project concept and classify it appropriately.

## Project Concept
{{ concept_description }}

## Clinical Problem
{{ clinical_problem }}

## Intended Outcomes
{{ intended_outcomes }}

## Classification Criteria

### Quality Improvement (QI)
- Primary aim is to improve local processes, outcomes, or patient experience
- No intention to generate generalisable knowledge
- Uses established QI methodologies (PDSA, Lean, etc.)
- Results intended for local use and improvement

### Research
- Primary aim is to generate new generalisable knowledge
- Systematic investigation designed to develop or contribute to knowledge
- Results intended for publication and broader application
- May involve experimental manipulation or control groups

### Hybrid
- Elements of both QI and research
- Local improvement with secondary aim of generalisation
- May start as QI with potential to become research

## Task
1. Classify this project as QI, RESEARCH, or HYBRID
2. Provide confidence score (0-1)
3. Explain your reasoning
4. Suggest appropriate study designs
5. Identify the applicable reporting guideline

Respond in JSON format:
```json
{
  "classification": "QI|RESEARCH|HYBRID",
  "confidence": 0.0-1.0,
  "reasoning": "...",
  "suggested_designs": ["..."],
  "reporting_guideline": "..."
}
```
```

#### 6.2.2 Literature Synthesis Prompt

```markdown
You are an expert research synthesist specialising in emergency medicine. Synthesise the following research articles into a coherent evidence summary.

## Research Question
{{ research_question }}

## Articles to Synthesise
{{ formatted_articles }}

## Task
Create an evidence synthesis that:
1. Summarises the current state of knowledge
2. Identifies consistent findings across studies
3. Notes areas of disagreement or conflicting evidence
4. Highlights methodological strengths and limitations
5. Identifies clear knowledge gaps

## Requirements
- Write in flowing paragraphs, not bullet points
- Use Vancouver citation style [1], [2], etc.
- Maintain objective, scientific tone
- Maximum 1500 words
- Structure: Overview → Key Findings → Methodological Considerations → Gaps

Begin your synthesis:
```

#### 6.2.3 Methodology Development Prompt

```markdown
You are an expert in clinical research methodology. Develop an appropriate methodology for the following study.

## Project Overview
{{ project_summary }}

## Evidence Gaps to Address
{{ gap_analysis }}

## Constraints
- Setting: {{ setting }}
- Population: {{ target_population }}
- Timeline: {{ timeline_constraint }}
- Resources: {{ resource_constraints }}

## Task
Develop a complete methodology including:

1. **Study Design**
   - Type and justification
   - Applicable reporting guideline

2. **Participants**
   - Inclusion criteria (specific, measurable)
   - Exclusion criteria (justified)
   - Sample size calculation (if applicable)
   - Recruitment strategy

3. **Outcomes**
   - Primary outcome (single, clearly defined)
   - Secondary outcomes (limited, relevant)
   - Measurement tools and timing

4. **Procedures**
   - Step-by-step protocol
   - Data collection methods
   - Quality assurance measures

5. **Analysis Plan**
   - Statistical methods
   - Handling of missing data
   - Sensitivity analyses

## Response Format
Provide detailed methodology in structured sections. Use specific, operational definitions. Include statistical parameters where relevant.
```

#### 6.2.4 Document Section Generation Prompt

```markdown
You are writing a section of a {{ document_type }} for submission to {{ target_audience }}.

## Section: {{ section_name }}
## Word Limit: {{ word_limit }}

## Source Content
{{ source_content }}

## Writing Requirements
1. Write in flowing prose paragraphs - NO bullet points
2. Use {{ citation_style }} citation format
3. Maintain {{ tone }} tone
4. Follow {{ reporting_guideline }} requirements
5. Be specific and operational in language

## Template Requirements
{{ template_specific_requirements }}

## Task
Write this section as complete, publication-ready prose. Ensure logical flow between paragraphs and clear transitions. The text should be self-contained and comprehensible without reference to other sections.

Begin writing:
```

### 6.3 Error Handling

```javascript
// LLM API error handling
async function callLLM(prompt, options = {}) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await anthropic.messages.create({
                model: options.model || 'claude-sonnet-4-20250514',
                max_tokens: options.max_tokens || 4096,
                messages: [{ role: 'user', content: prompt }],
                system: options.system_prompt
            });
            
            // Validate response
            if (!response.content || response.content.length === 0) {
                throw new Error('Empty response from LLM');
            }
            
            return response.content[0].text;
            
        } catch (error) {
            console.error(`LLM call attempt ${attempt} failed:`, error);
            
            if (attempt === MAX_RETRIES) {
                throw new Error(`LLM call failed after ${MAX_RETRIES} attempts: ${error.message}`);
            }
            
            // Exponential backoff
            await sleep(RETRY_DELAY * Math.pow(2, attempt - 1));
        }
    }
}
```

---

## 7. Document Generation Specifications

### 7.1 Template Repository Structure

```
/templates/
├── protocols/
│   ├── mnh-protocol-template.docx
│   ├── mnh-qi-template.docx
│   └── spirit-template.docx
├── grants/
│   ├── emf-application-jumpstart.docx
│   ├── emf-application-leading-edge.docx
│   └── emf-budget-template.xlsx
├── ethics/
│   ├── hrec-cover-letter.docx
│   ├── picf-template.docx
│   ├── lnr-application.docx
│   └── consent-template.docx
├── governance/
│   ├── site-assessment.docx
│   └── investigator-agreement.docx
└── common/
    ├── reference-list-template.docx
    └── timeline-template.docx
```

### 7.2 Document Generation Engine

```javascript
// Document generation using docx-js
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, 
        TableCell, HeadingLevel, AlignmentType, BorderStyle } = docx;

class DocumentGenerator {
    constructor(template_path) {
        this.template_path = template_path;
    }
    
    async generateProtocol(project, research, methodology, ethics) {
        // Load and parse template
        const template = await this.loadTemplate(this.template_path);
        
        // Build document sections
        const sections = [];
        
        // Title page
        sections.push(this.buildTitlePage(project));
        
        // Version history
        sections.push(this.buildVersionHistory());
        
        // Synopsis table
        sections.push(this.buildSynopsis(project, methodology));
        
        // Main content sections
        sections.push(this.buildSection('Introduction', 
            await this.generateIntroduction(project)));
        
        sections.push(this.buildSection('Background', 
            research.literature_summary));
        
        sections.push(this.buildSection('Aims and Objectives',
            this.formatAimsObjectives(methodology.outcomes)));
        
        sections.push(this.buildSection('Methods',
            await this.generateMethods(methodology)));
        
        sections.push(this.buildSection('Participants',
            this.formatParticipants(methodology.participants)));
        
        sections.push(this.buildSection('Research Outcomes',
            this.formatOutcomes(methodology.outcomes)));
        
        sections.push(this.buildSection('Procedures',
            methodology.procedures.description));
        
        sections.push(this.buildSection('Data Management',
            ethics.data_governance.full_text));
        
        sections.push(this.buildSection('Ethical Considerations',
            this.formatEthics(ethics)));
        
        sections.push(this.buildSection('Dissemination',
            await this.generateDissemination(project)));
        
        sections.push(this.buildReferences(research.citations));
        
        // Create document
        const doc = new Document({
            styles: this.getDocumentStyles(),
            sections: [{
                properties: this.getPageProperties(),
                children: sections.flat()
            }]
        });
        
        // Generate buffer
        const buffer = await Packer.toBuffer(doc);
        return buffer;
    }
    
    getDocumentStyles() {
        return {
            default: {
                document: {
                    run: { font: 'Arial', size: 24 } // 12pt
                }
            },
            paragraphStyles: [
                {
                    id: 'Heading1',
                    name: 'Heading 1',
                    basedOn: 'Normal',
                    next: 'Normal',
                    quickFormat: true,
                    run: { size: 32, bold: true, font: 'Arial' },
                    paragraph: { 
                        spacing: { before: 240, after: 240 },
                        outlineLevel: 0
                    }
                },
                {
                    id: 'Heading2',
                    name: 'Heading 2',
                    basedOn: 'Normal',
                    next: 'Normal',
                    quickFormat: true,
                    run: { size: 28, bold: true, font: 'Arial' },
                    paragraph: {
                        spacing: { before: 180, after: 180 },
                        outlineLevel: 1
                    }
                }
            ]
        };
    }
    
    getPageProperties() {
        return {
            page: {
                size: {
                    width: 11906, // A4 width in DXA
                    height: 16838 // A4 height in DXA
                },
                margin: {
                    top: 1440,
                    right: 1440,
                    bottom: 1440,
                    left: 1440
                }
            }
        };
    }
    
    buildSection(title, content) {
        const elements = [
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun(title)]
            })
        ];
        
        // Split content into paragraphs
        const paragraphs = content.split('\n\n').filter(p => p.trim());
        
        for (const para of paragraphs) {
            elements.push(new Paragraph({
                children: [new TextRun(para.trim())],
                spacing: { after: 200 }
            }));
        }
        
        return elements;
    }
    
    buildSynopsis(project, methodology) {
        const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
        const borders = { top: border, bottom: border, left: border, right: border };
        
        const rows = [
            ['FULL TITLE', project.intake.project_title],
            ['SHORT TITLE', project.intake.project_title.substring(0, 50)],
            ['STUDY DESIGN', methodology.study_design.type],
            ['PRIMARY OUTCOME', methodology.outcomes.primary.name],
            ['SAMPLE SIZE', methodology.participants.sample_size?.target || 'N/A'],
            ['STUDY DURATION', methodology.timeline.total_duration],
            ['PRINCIPAL INVESTIGATOR', project.intake.principal_investigator.name]
        ];
        
        return new Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            rows: rows.map(([label, value]) => 
                new TableRow({
                    children: [
                        new TableCell({
                            borders,
                            width: { size: 3000, type: docx.WidthType.DXA },
                            shading: { fill: 'E8E8E8', type: docx.ShadingType.CLEAR },
                            children: [new Paragraph({
                                children: [new TextRun({ text: label, bold: true })]
                            })]
                        }),
                        new TableCell({
                            borders,
                            width: { size: 6360, type: docx.WidthType.DXA },
                            children: [new Paragraph({
                                children: [new TextRun(value)]
                            })]
                        })
                    ]
                })
            )
        });
    }
}
```

### 7.3 Citation Formatting

```javascript
// Vancouver citation formatter
function formatVancouverCitation(article) {
    const authors = formatAuthors(article.authors);
    const title = article.title.replace(/\.$/, '');
    const journal = abbreviateJournal(article.journal);
    const year = article.year;
    const volume = article.volume || '';
    const issue = article.issue ? `(${article.issue})` : '';
    const pages = article.pages || '';
    const doi = article.doi ? ` doi: ${article.doi}` : '';
    
    return `${authors}. ${title}. ${journal}. ${year};${volume}${issue}:${pages}.${doi}`;
}

function formatAuthors(authors) {
    if (!authors || authors.length === 0) return '';
    
    if (authors.length <= 6) {
        return authors.map(a => `${a.lastName} ${a.initials}`).join(', ');
    }
    
    // More than 6 authors: first 6 + et al.
    const firstSix = authors.slice(0, 6).map(a => `${a.lastName} ${a.initials}`).join(', ');
    return `${firstSix}, et al`;
}
```

---

## 8. Quality Assurance

### 8.1 Validation Rules

```javascript
// Document validation rules
const VALIDATION_RULES = {
    protocol: {
        required_sections: [
            'title', 'synopsis', 'introduction', 'background', 
            'aims', 'methods', 'participants', 'outcomes',
            'procedures', 'data_management', 'ethics', 'references'
        ],
        word_limits: {
            introduction: 250,
            background: 2000,
            methods: 3000,
            discussion: 1500
        },
        formatting: {
            font: 'Arial',
            size: 12,
            line_spacing: 1.5
        }
    },
    emf_application: {
        required_sections: [
            'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9',
            'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7',
            'C1', 'C2', 'D', 'E', 'F', 'G', 'H', 'I'
        ],
        word_limits: {
            A4: 250,
            A5: 450,
            B1: 1500,
            B2: 300,
            B3: 2000,
            B4: 750,
            B5: 400
        }
    }
};

async function validateDocument(document, document_type) {
    const rules = VALIDATION_RULES[document_type];
    const errors = [];
    const warnings = [];
    
    // Check required sections
    for (const section of rules.required_sections) {
        if (!document.sections[section]) {
            errors.push(`Missing required section: ${section}`);
        }
    }
    
    // Check word limits
    for (const [section, limit] of Object.entries(rules.word_limits)) {
        if (document.sections[section]) {
            const wordCount = countWords(document.sections[section]);
            if (wordCount > limit) {
                warnings.push(`Section ${section} exceeds word limit: ${wordCount}/${limit}`);
            }
        }
    }
    
    // Cross-reference consistency
    const inconsistencies = checkCrossReferences(document);
    errors.push(...inconsistencies);
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
```

### 8.2 Automated Testing

```javascript
// Test suite for pipeline stages
describe('QI-Research Pipeline', () => {
    describe('Stage 1: Intake', () => {
        it('should correctly classify QI projects', async () => {
            const qi_concept = {
                concept_description: 'Implement a checklist to improve medication administration times in ED',
                clinical_problem: 'Delayed medication administration',
                intended_outcomes: 'Reduce time to first dose by 20%'
            };
            
            const result = await classifyProjectType(qi_concept);
            expect(result.classification).toBe('QI');
            expect(result.confidence).toBeGreaterThan(0.8);
        });
        
        it('should correctly classify research projects', async () => {
            const research_concept = {
                concept_description: 'RCT comparing two resuscitation strategies for cardiac arrest',
                clinical_problem: 'Uncertainty about optimal CPR approach',
                intended_outcomes: 'Determine which strategy improves ROSC rates'
            };
            
            const result = await classifyProjectType(research_concept);
            expect(result.classification).toBe('RESEARCH');
        });
    });
    
    describe('Stage 2: Research', () => {
        it('should generate valid PubMed search queries', async () => {
            const strategy = await generateSearchStrategy({
                problem: 'Sepsis recognition in emergency department',
                population: 'Adult ED patients',
                outcomes: 'Time to antibiotic administration'
            });
            
            expect(strategy.pubmed_query).toContain('sepsis');
            expect(strategy.pubmed_query).toContain('emergency');
            expect(strategy.mesh_terms).toContain('Sepsis');
        });
    });
    
    describe('Stage 5: Documents', () => {
        it('should generate valid DOCX files', async () => {
            const project = createMockProject();
            const doc = await generateProtocol(project);
            
            // Verify DOCX structure
            expect(doc).toBeInstanceOf(Buffer);
            
            // Unzip and check XML
            const xml = await extractDocumentXml(doc);
            expect(xml).toContain('w:document');
        });
    });
});
```

---

## 9. Security Considerations

### 9.1 Data Protection

| Data Type | Classification | Protection Measures |
|-----------|---------------|---------------------|
| Project concepts | Internal | Encrypted at rest, access controls |
| Patient information | Highly sensitive | Not stored; anonymised references only |
| Investigator details | Internal | Encrypted, limited access |
| Generated documents | Internal | Encrypted, versioned, audit logged |
| API keys | Secret | Environment variables, key rotation |

### 9.2 Access Control

```javascript
// Role-based access control
const ROLES = {
    ADMIN: {
        permissions: ['*']
    },
    PI: {
        permissions: [
            'project:create',
            'project:read:own',
            'project:update:own',
            'project:approve:own',
            'documents:read:own',
            'documents:download:own'
        ]
    },
    CO_INVESTIGATOR: {
        permissions: [
            'project:read:assigned',
            'project:comment:assigned',
            'documents:read:assigned'
        ]
    },
    RESEARCH_ADMIN: {
        permissions: [
            'project:read:*',
            'project:approve:*',
            'documents:read:*',
            'reports:generate'
        ]
    }
};
```

### 9.3 Audit Logging

All system actions are logged with:

- Timestamp
- Actor (user or system)
- Action type
- Affected resource
- Previous state (for modifications)
- New state (for modifications)
- IP address
- Session identifier

---

## 10. Deployment

### 10.1 Infrastructure Requirements

| Component | Specification | Notes |
|-----------|--------------|-------|
| n8n Server | 4 CPU, 8GB RAM | Docker or bare metal |
| PostgreSQL | 2 CPU, 4GB RAM | Managed or self-hosted |
| File Storage | 100GB initial | S3-compatible or local |
| Redis | 1 CPU, 2GB RAM | Optional: caching, queues |

### 10.2 Environment Variables

```bash
# n8n Configuration
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://qi-pipeline.metronorth.health.qld.gov.au

# Database
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=qi_pipeline
DB_POSTGRESDB_USER=qi_pipeline
DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}

# LLM API
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

# Email
SMTP_HOST=smtp.health.qld.gov.au
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}

# Storage
S3_ENDPOINT=https://s3.metronorth.health.qld.gov.au
S3_BUCKET=qi-pipeline-documents
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
```

### 10.3 Docker Compose

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=${N8N_PORT}
      - N8N_PROTOCOL=${N8N_PROTOCOL}
      - WEBHOOK_URL=${WEBHOOK_URL}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${DB_NAME}
      - DB_POSTGRESDB_USER=${DB_USER}
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
      - ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
    volumes:
      - n8n_data:/home/node/.n8n
      - ./templates:/templates:ro
    depends_on:
      - postgres
    networks:
      - qi-pipeline

  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - qi-pipeline

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - qi-pipeline

volumes:
  n8n_data:
  postgres_data:
  redis_data:

networks:
  qi-pipeline:
    driver: bridge
```

---

## 11. Appendices

### A. EMF Grant Scoring Criteria Reference

| Criterion | Weight | Components |
|-----------|--------|------------|
| Scientific Quality | 30-35% | Hypothesis clarity, design rigour, analysis plan |
| Importance | 30-35% | Gap identification, patient impact, translation potential |
| Team | 20% | PI experience, team expertise, track record |
| Budget | 10% | Justification, cost-effectiveness |
| Translation | 10% | Dissemination plan, implementation pathway |

### B. Reporting Guidelines Quick Reference

| Study Type | Guideline | Key Checklist Items |
|------------|-----------|---------------------|
| RCT | CONSORT | Randomisation, blinding, flow diagram, ITT |
| Observational | STROBE | Selection, comparability, outcome assessment |
| Systematic Review | PRISMA | Search strategy, study selection, synthesis |
| QI | SQUIRE | Context, intervention, study of intervention |
| Diagnostic | STARD | Index test, reference standard, analysis |
| Case Report | CARE | Timeline, diagnostic assessment, follow-up |

### C. Metro North Ethics Pathways

| Category | Approval Body | Timeline | Forms Required |
|----------|--------------|----------|----------------|
| QI Project | Unit Director | 2-4 weeks | QI Project Plan |
| Low Risk Research | LNR Committee | 4-6 weeks | LNR Application, Protocol |
| Greater than Low Risk | HREC | 8-16 weeks | Full HREC Application |
| Multi-site Lead | Royal Brisbane HREC | 10-16 weeks | Coordinated submission |

---

## 12. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-27 | Sean | Initial specification |

---

*End of Specification Document*
