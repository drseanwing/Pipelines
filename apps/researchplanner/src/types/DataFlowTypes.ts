/**
 * Data Flow Type Contracts
 *
 * This file documents the complete data flow through the Research Pipeline system,
 * from intake through document generation. It serves as the canonical reference
 * for understanding how data transforms across pipeline stages.
 *
 * @module DataFlowTypes
 */

/**
 * =============================================================================
 * DATA FLOW OVERVIEW
 * =============================================================================
 *
 * The Research Pipeline processes data through five main stages:
 *
 * 1. INTAKE → IntakeData (user input, snake_case properties)
 * 2. RESEARCH → ResearchStageData (literature synthesis, citations)
 * 3. METHODOLOGY → MethodologyStageData (study design, procedures)
 * 4. ETHICS → EthicsStageData (pathways, governance, consent)
 * 5. DOCUMENTS → Buffer[] (generated DOCX files)
 *
 * Each stage:
 * - Reads data from previous stages (stored in JSONB columns)
 * - Processes and enriches the data
 * - Stores results back to the database
 * - Triggers the next stage via n8n workflows
 */

/**
 * =============================================================================
 * STAGE 1: INTAKE
 * =============================================================================
 *
 * Input: User-submitted web form
 * Processing: Validation, classification, initial project creation
 * Output: IntakeData (stored in projects.intake_data JSONB column)
 *
 * @typedef {Object} IntakeDataContract
 * @property {string} project_title - Project title (snake_case from form)
 * @property {string} clinical_problem - Clinical problem description
 * @property {string} principal_investigator - PI name
 * @property {string} department - Department/unit
 * @property {string} contact_email - Contact email
 * @property {string} [population_description] - Optional population details
 * @property {string} [intervention_description] - Optional intervention details
 * @property {string} [outcome_measures] - Optional outcome measures
 * @property {string} [timeline_expectations] - Optional timeline
 *
 * Next Stage: CLASSIFICATION (n8n determines project type)
 */

/**
 * =============================================================================
 * STAGE 2: RESEARCH
 * =============================================================================
 *
 * Input: IntakeData + ProjectType
 * Processing: PubMed literature search, article extraction, synthesis
 * Output: ResearchStageData (stored in projects.research_data JSONB column)
 *
 * Key Types:
 * - ProcessedArticle: Individual article with extracted metadata
 * - Citation: Formatted reference for document generation
 * - ResearchResults: Complete literature synthesis
 *
 * @typedef {Object} ProcessedArticleContract
 * @property {string} [pmid] - PubMed ID
 * @property {string} [doi] - Digital Object Identifier
 * @property {string} title - Article title
 * @property {string[]} authors - Author list
 * @property {string} journal - Journal name
 * @property {number} year - Publication year
 * @property {string} [volume] - Journal volume
 * @property {string} [issue] - Journal issue
 * @property {string} [pages] - Page range
 * @property {string} abstract - Article abstract
 * @property {number} relevance_score - Relevance score (0-100)
 * @property {string[]} key_findings - Extracted findings
 * @property {string} methodology_notes - Methodology summary
 * @property {string[]} limitations - Study limitations
 * @property {boolean} full_text_available - Full text availability
 *
 * @typedef {Object} CitationContract
 * @property {string} id - Unique citation ID
 * @property {string} authors - Formatted author string
 * @property {string} year - Publication year
 * @property {string} title - Article title
 * @property {string} journal - Journal name
 * @property {string} [volume] - Volume number
 * @property {string} [issue] - Issue number
 * @property {string} [pages] - Page range
 * @property {string} [doi] - DOI
 * @property {string} formatted - Complete formatted citation
 *
 * Next Stage: METHODOLOGY
 */

/**
 * =============================================================================
 * STAGE 3: METHODOLOGY
 * =============================================================================
 *
 * Input: IntakeData + ResearchStageData
 * Processing: Study design, sample size, procedures, analysis plan
 * Output: MethodologyStageData (stored in projects.methodology_data JSONB column)
 *
 * Key Types:
 * - StudyDesign: Design type and rationale
 * - SampleSize: Calculation and justification
 * - DataCollectionSpec: Methods, instruments, procedures
 * - StatisticalAnalysis: Analysis plan
 *
 * @typedef {Object} DataCollectionSpecContract
 * @property {string} data_sources - Description of data sources
 * @property {string[]} methods - Data collection methods (e.g., ['survey', 'interview'])
 * @property {string} instruments - Measurement instruments
 * @property {string} procedures - Collection procedures
 * @property {string} timeline - Collection timeline
 *
 * Next Stage: ETHICS
 */

/**
 * =============================================================================
 * STAGE 4: ETHICS
 * =============================================================================
 *
 * Input: IntakeData + ResearchStageData + MethodologyStageData
 * Processing: Ethics pathway determination, risk assessment, governance requirements
 * Output: EthicsStageData (stored in projects.ethics_data JSONB column)
 *
 * Key Types:
 * - EthicsPathway: HREC, LNR, or QI determination
 * - RiskAssessment: Risk level and mitigation strategies
 * - ConsentRequirements: Consent forms and processes
 * - DataGovernance: Data management and security
 *
 * Next Stage: DOCUMENTS
 */

/**
 * =============================================================================
 * STAGE 5: DOCUMENT GENERATION
 * =============================================================================
 *
 * Input: Complete Project record (all stage data)
 * Processing: Template-based DOCX generation using docx library
 * Output: Buffer[] (DOCX binary data for each required document)
 *
 * Key Types:
 * - DocumentType: Enum of all possible document types
 * - DocumentMetadata: Generation timestamp, version, template
 * - GeneratedDocument: Database record linking project to generated file
 *
 * @typedef {Object} DocumentGenerationContract
 * @property {Project} input - Complete project with all stage data
 * @property {DocumentType[]} document_types - Which documents to generate
 * @property {Buffer[]} output - Array of DOCX file buffers
 * @property {DocumentMetadata[]} metadata - Generation metadata for each file
 *
 * Document Types:
 * - RESEARCH_PROTOCOL: Full research protocol
 * - QI_PROJECT_PLAN: Quality improvement project plan
 * - PARTICIPANT_INFO_SHEET: Participant information and consent form (PICF)
 * - DATA_MANAGEMENT_PLAN: Data management plan (DMP)
 * - HREC_COVER_LETTER: HREC application cover letter
 * - SITE_ASSESSMENT: Site-specific assessment form
 * - LNR_APPLICATION: Low/Negligible Risk application
 * - EMF_APPLICATION: Emergency Medicine Foundation grant application
 */

/**
 * =============================================================================
 * TYPE NAMING CONVENTIONS
 * =============================================================================
 *
 * Database/JSONB Properties: snake_case
 * - Example: project_title, principal_investigator, contact_email
 * - Reason: Matches PostgreSQL column naming conventions
 *
 * TypeScript Interfaces: PascalCase
 * - Example: IntakeData, ProcessedArticle, DocumentMetadata
 * - Reason: Standard TypeScript interface naming
 *
 * Interface Properties: snake_case (for DB-sourced data)
 * - Example: intake.project_title, article.relevance_score
 * - Reason: Direct mapping from JSONB columns
 *
 * Enum Values: SCREAMING_SNAKE_CASE
 * - Example: DocumentType.RESEARCH_PROTOCOL, ProjectStatus.INTAKE_COMPLETE
 * - Reason: Standard enum value convention
 */

/**
 * =============================================================================
 * VALIDATION STRATEGY
 * =============================================================================
 *
 * Each stage should validate its inputs and outputs using Zod schemas:
 *
 * 1. Input Validation: Validate data from previous stage
 * 2. Processing: Transform and enrich data
 * 3. Output Validation: Validate before storing to database
 *
 * Schema locations:
 * - /src/validation/schemas.ts - All Zod schemas
 * - /src/validation/validators.ts - Validation helper functions
 *
 * Error Handling:
 * - Validation errors should include field path and expected type
 * - Use @pipelines/logging for structured error logging
 * - Never expose sensitive data in error messages
 */

export {};
