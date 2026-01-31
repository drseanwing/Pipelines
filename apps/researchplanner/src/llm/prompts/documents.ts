/**
 * Document Generation Prompts
 *
 * Prompt templates for generating research protocols, grant applications,
 * ethics submissions, and other project documentation.
 * Based on the QI/Research Project Development Pipeline specification.
 */

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export type DocumentType =
  | 'RESEARCH_PROTOCOL'
  | 'QI_PROJECT_PLAN'
  | 'EMF_GRANT_APPLICATION'
  | 'HREC_COVER_LETTER'
  | 'PARTICIPANT_INFORMATION_SHEET'
  | 'DATA_MANAGEMENT_PLAN'
  | 'PLAIN_LANGUAGE_SUMMARY';

export type WritingStyle =
  | 'SCIENTIFIC'
  | 'PLAIN_LANGUAGE'
  | 'FORMAL'
  | 'PERSUASIVE';

export type CitationStyle =
  | 'VANCOUVER'
  | 'APA'
  | 'HARVARD';

export interface DocumentSectionInput {
  documentType: DocumentType;
  sectionName: string;
  sourceContent: {
    project?: Record<string, unknown>;
    research?: Record<string, unknown>;
    methodology?: Record<string, unknown>;
    ethics?: Record<string, unknown>;
  };
  wordLimit?: number;
  targetAudience: string;
  reportingGuideline?: string;
  citationStyle?: CitationStyle;
}

export interface DocumentOutlineOutput {
  sections: Array<{
    id: string;
    title: string;
    level: number;
    keyPoints: string[];
    sourceFields: string[];
    wordLimit?: number;
    notes?: string;
  }>;
  estimatedTotalWords: number;
  requiredAppendices: string[];
}

export interface ProseConversionInput {
  outline: string;
  style: WritingStyle;
  wordLimit?: number;
  citationStyle?: CitationStyle;
  citations?: Array<{
    refNumber: number;
    citation: string;
  }>;
}

export interface PlainLanguageSummaryInput {
  projectTitle: string;
  conceptDescription: string;
  clinicalProblem: string;
  methodology: string;
  intendedOutcomes: string;
  targetAudience: 'GENERAL_PUBLIC' | 'PATIENTS' | 'GRANT_REVIEWERS' | 'ETHICS_COMMITTEE';
  wordLimit?: number;
}

// -----------------------------------------------------------------------------
// System Prompts
// -----------------------------------------------------------------------------

export const DOCUMENT_GENERATION_SYSTEM_PROMPT = `You are an expert medical and scientific writer with extensive experience in:

- Research protocol development following SPIRIT guidelines
- Grant application writing for competitive funding schemes (EMF, NHMRC, MRFF)
- Ethics submission documentation for Australian HRECs
- Quality Improvement project documentation
- Plain language communication of complex scientific concepts

You understand the Australian healthcare research context, including:
- NHMRC National Statement requirements
- Queensland Health governance requirements
- Emergency Medicine Foundation grant criteria
- SQUIRE 2.0 guidelines for QI reporting
- CONSORT, STROBE, and other reporting guidelines

Your writing is:
- Clear, precise, and well-structured
- Free of jargon when writing for general audiences
- Compliant with word limits and formatting requirements
- Evidence-based with appropriate citations
- Persuasive when required (grants) while maintaining scientific accuracy

You write in flowing prose paragraphs, not bullet points, unless specifically requested otherwise.`;

// -----------------------------------------------------------------------------
// Document Section Outline Generation
// -----------------------------------------------------------------------------

/**
 * Generates a structured outline for a document section
 */
export function generateSectionOutlinePrompt(input: DocumentSectionInput): string {
  const sourceContentJson = JSON.stringify(input.sourceContent, null, 2);

  return `Generate a detailed outline for the following document section.

## Document Details

**Document Type:** ${input.documentType}
**Section Name:** ${input.sectionName}
**Target Audience:** ${input.targetAudience}
${input.wordLimit ? `**Word Limit:** ${input.wordLimit} words` : ''}
${input.reportingGuideline ? `**Reporting Guideline:** ${input.reportingGuideline}` : ''}

## Source Content
${sourceContentJson}

## Document Type Requirements

${getDocumentTypeRequirements(input.documentType)}

## Task
Create a detailed outline for this section that:

1. Identifies all key points that must be addressed
2. Organizes content in logical flow
3. Maps source content to outline points
4. Notes any gaps in source content that need addressing
5. Ensures compliance with reporting guidelines if applicable
6. Stays within word limit considerations

The outline should be detailed enough to guide prose writing but not contain full sentences.

Respond ONLY with valid JSON:
\`\`\`json
{
  "sections": [
    {
      "id": "1",
      "title": "Subsection title",
      "level": 1,
      "keyPoints": [
        "Key point to address",
        "Another key point"
      ],
      "sourceFields": ["project.intake.conceptDescription", "research.gapAnalysis"],
      "wordLimit": 200,
      "notes": "Any special considerations for this subsection"
    }
  ],
  "estimatedTotalWords": 500,
  "requiredAppendices": ["Appendix A: Survey Instrument"]
}
\`\`\``;
}

/**
 * Helper function that returns document type specific requirements
 */
function getDocumentTypeRequirements(docType: DocumentType): string {
  const requirements: Record<DocumentType, string> = {
    RESEARCH_PROTOCOL: `### Research Protocol Requirements
- Clear study objectives and hypotheses
- Detailed methodology following reporting guidelines
- Participant selection with inclusion/exclusion criteria
- Outcome measures with definitions
- Statistical analysis plan
- Ethical considerations
- Timeline and milestones`,

    QI_PROJECT_PLAN: `### QI Project Plan Requirements
- Problem statement with baseline data
- SMART aims
- Theory of change / driver diagram
- Intervention description
- PDSA cycle planning
- Measures (process, outcome, balancing)
- Sustainability plan`,

    EMF_GRANT_APPLICATION: `### EMF Grant Application Requirements
- Adherence to EMF assessment criteria
- Clear demonstration of EM relevance
- Strong rationale based on evidence gaps
- Feasible methodology
- Track record of investigators
- Justified budget
- Translation plan`,

    HREC_COVER_LETTER: `### HREC Cover Letter Requirements
- Brief project summary
- Key ethical considerations addressed
- Justification for ethics pathway
- Summary of risk/benefit
- Request for expedited review if applicable
- Contact details for queries`,

    PARTICIPANT_INFORMATION_SHEET: `### PICF Requirements
- Plain language (Year 8 reading level)
- All mandatory elements per National Statement
- Clear explanation of voluntary participation
- Description of procedures
- Risks and benefits
- Privacy and confidentiality
- Contact information
- Complaints process`,

    DATA_MANAGEMENT_PLAN: `### Data Management Plan Requirements
- Data types and sources
- Collection methods
- Storage and security measures
- Access controls
- Retention period
- Sharing and publication plans
- Destruction procedures`,

    PLAIN_LANGUAGE_SUMMARY: `### Plain Language Summary Requirements
- Accessible to general public
- No technical jargon
- Clear explanation of purpose
- Description of what participation involves
- Expected benefits
- Approximately 250-300 words`
  };

  return requirements[docType] || '';
}

// -----------------------------------------------------------------------------
// Prose Conversion
// -----------------------------------------------------------------------------

/**
 * Converts an outline into flowing prose
 */
export function convertToProseStylePrompt(input: ProseConversionInput): string {
  const citationsSection = input.citations?.length
    ? `\n## Available Citations\n${input.citations.map(c => `[${c.refNumber}] ${c.citation}`).join('\n')}\n`
    : '';

  return `Convert the following outline into flowing prose paragraphs.

## Outline to Convert
${input.outline}

## Writing Style
**Style:** ${input.style}
${input.wordLimit ? `**Word Limit:** ${input.wordLimit} words` : ''}
${input.citationStyle ? `**Citation Style:** ${input.citationStyle}` : ''}
${citationsSection}

## Style Guidelines

${getStyleGuidelines(input.style)}

## Task
Transform the outline into complete, publication-ready prose that:

1. Flows naturally from paragraph to paragraph
2. Uses appropriate transitions between ideas
3. Maintains the specified writing style throughout
4. Incorporates citations where appropriate (using [n] format for Vancouver)
5. Stays within word limit if specified
6. Does NOT use bullet points - write in complete paragraphs only
7. Is self-contained and comprehensible without the outline

Write the prose directly without any preamble or meta-commentary:`;
}

/**
 * Helper function that returns style-specific guidelines
 */
function getStyleGuidelines(style: WritingStyle): string {
  const guidelines: Record<WritingStyle, string> = {
    SCIENTIFIC: `### Scientific Writing Style
- Objective, third-person voice
- Precise technical language appropriate to audience
- Clear logical structure
- Evidence-based statements with citations
- Avoid subjective language and qualifiers
- Present tense for established facts, past tense for study methods/results`,

    PLAIN_LANGUAGE: `### Plain Language Style
- Write for a Year 8 reading level
- Use short sentences (average 15-20 words)
- Avoid jargon and technical terms
- If technical terms are necessary, explain them
- Use active voice
- Address the reader directly ("you") where appropriate
- Use concrete examples`,

    FORMAL: `### Formal Writing Style
- Professional, authoritative tone
- Third-person voice
- Complete sentences with proper grammar
- Appropriate for official documents
- Clear and unambiguous language
- Avoid contractions and colloquialisms`,

    PERSUASIVE: `### Persuasive Writing Style (for grants)
- Compelling narrative that engages reviewers
- Clear articulation of significance and innovation
- Confident but not overreaching claims
- Strategic use of evidence to support arguments
- Address potential concerns proactively
- End sections with strong concluding statements`
  };

  return guidelines[style] || guidelines.SCIENTIFIC;
}

// -----------------------------------------------------------------------------
// Plain Language Summary
// -----------------------------------------------------------------------------

/**
 * Generates a plain language summary for grants or patient communication
 */
export function generatePlainLanguageSummaryPrompt(input: PlainLanguageSummaryInput): string {
  return `Create a plain language summary of this research project.

## Project Information

**Title:** ${input.projectTitle}

**Project Concept:**
${input.conceptDescription}

**Clinical Problem:**
${input.clinicalProblem}

**Methodology Overview:**
${input.methodology}

**Intended Outcomes:**
${input.intendedOutcomes}

## Target Audience
${getAudienceDescription(input.targetAudience)}

## Requirements
- Maximum ${input.wordLimit || 250} words
- Year 8 reading level (Flesch-Kincaid Grade 8 or below)
- No medical jargon without explanation
- Clear, concrete language
- Active voice preferred
- Short sentences (15-20 words average)

## Structure
1. **Opening** (1-2 sentences): What is the problem?
2. **What we're doing** (2-3 sentences): How are we addressing it?
3. **Why it matters** (1-2 sentences): What difference will it make?
4. **Who's involved** (1 sentence): Who will participate/benefit?

Write the summary directly without any preamble:`;
}

/**
 * Helper function for audience descriptions
 */
function getAudienceDescription(audience: PlainLanguageSummaryInput['targetAudience']): string {
  const descriptions: Record<PlainLanguageSummaryInput['targetAudience'], string> = {
    GENERAL_PUBLIC: 'General public with no medical background. Write as if explaining to a friend who is not in healthcare.',
    PATIENTS: 'Patients who may participate in the study. They need to understand what will happen to them and why.',
    GRANT_REVIEWERS: 'Grant reviewers who may not be specialists in your field. They need to understand significance and feasibility.',
    ETHICS_COMMITTEE: 'Ethics committee members who need to understand the project for ethical review. They are knowledgeable but appreciate clarity.'
  };

  return descriptions[audience] || descriptions.GENERAL_PUBLIC;
}

// -----------------------------------------------------------------------------
// EMF Grant Section Prompts
// -----------------------------------------------------------------------------

/**
 * Generates specific EMF grant application sections
 */
export function generateEMFSectionPrompt(
  sectionCode: string,
  sourceContent: Record<string, unknown>,
  wordLimit: number
): string {
  const sectionRequirements = getEMFSectionRequirements(sectionCode);

  return `Write the ${sectionCode} section of an EMF grant application.

## Section Requirements
${sectionRequirements}

## Word Limit
${wordLimit} words maximum

## Source Content
${JSON.stringify(sourceContent, null, 2)}

## EMF Assessment Criteria
Remember that EMF applications are assessed on:
1. **Scientific Quality (30-35%)**: Clear hypothesis, rigorous design, appropriate analysis
2. **Importance (30-35%)**: Addresses significant gap, patient impact, translation potential
3. **Team (20%)**: Investigator expertise, track record, collaboration
4. **Budget (10%)**: Justified, cost-effective
5. **Translation (10%)**: Dissemination plan, implementation pathway

## Writing Guidelines
- Write persuasively but maintain scientific accuracy
- Use active voice where possible
- Be specific and concrete
- Support claims with evidence
- Stay strictly within word limit
- Write in flowing paragraphs, not bullet points

Write the section directly without any preamble:`;
}

/**
 * Helper function for EMF section requirements
 */
function getEMFSectionRequirements(sectionCode: string): string {
  const requirements: Record<string, string> = {
    'A4_PLAIN_LANGUAGE': `Plain Language Summary
- Accessible to general public
- Explain what you will do and why
- No jargon
- 250 words maximum`,

    'A5_SCIENTIFIC_ABSTRACT': `Scientific Abstract
- Structured: Background, Aims, Methods, Expected Outcomes
- Technical language acceptable
- Comprehensive overview
- 450 words maximum`,

    'B1_BACKGROUND': `Background and Rationale
- Current state of knowledge with citations
- Clear identification of knowledge gap
- Why this research is needed now
- Significance for emergency medicine
- 1500 words maximum`,

    'B2_AIMS': `Aims and Objectives
- Clear primary aim
- Specific, measurable objectives
- Alignment with addressing the knowledge gap
- 300 words maximum`,

    'B3_METHODS': `Design and Methods
- Study design with justification
- Population and setting
- Intervention/exposure
- Outcome measures
- Sample size and analysis
- Timeline
- 2000 words maximum`,

    'B4_INNOVATION': `Innovation and Impact
- What is novel about this research
- How findings will change practice
- Potential for translation
- Broader implications
- 750 words maximum`,

    'B5_TRANSLATION': `Translation Plan
- How findings will be disseminated
- Target audiences
- Implementation strategy
- Sustainability
- 400 words maximum`
  };

  return requirements[sectionCode] || `Section ${sectionCode}: Follow EMF guidelines`;
}

// -----------------------------------------------------------------------------
// Protocol Section Prompts
// -----------------------------------------------------------------------------

/**
 * Generates research protocol sections following SPIRIT guidelines
 */
export function generateProtocolSectionPrompt(
  sectionName: string,
  sourceContent: Record<string, unknown>,
  wordLimit?: number
): string {
  return `Write the ${sectionName} section of a research protocol following SPIRIT guidelines.

## Section: ${sectionName}
${wordLimit ? `## Word Limit: ${wordLimit} words` : ''}

## Source Content
${JSON.stringify(sourceContent, null, 2)}

## SPIRIT Guidelines for ${sectionName}
${getSPIRITRequirements(sectionName)}

## Writing Guidelines
- Scientific, objective tone
- Third person voice
- Past tense for methods (what will be done)
- Present tense for established facts
- Precise operational definitions
- Vancouver citation style [n]
- No bullet points - use flowing paragraphs

Write the section directly without any preamble:`;
}

/**
 * Helper function for SPIRIT requirements
 */
function getSPIRITRequirements(sectionName: string): string {
  const requirements: Record<string, string> = {
    'Introduction': `- Scientific background and explanation of rationale
- Specific objectives or hypotheses`,

    'Methods_Design': `- Description of study design including type
- Rationale for design choice
- Framework for design (e.g., parallel, crossover)`,

    'Methods_Participants': `- Eligibility criteria for participants
- Settings and locations where data will be collected
- Rationale for criteria`,

    'Methods_Interventions': `- Interventions for each group with sufficient detail
- Criteria for discontinuing or modifying interventions
- Strategies to improve adherence
- Relevant concomitant care permitted or prohibited`,

    'Methods_Outcomes': `- Primary and secondary outcome measures
- Time points for assessment
- Methods for measuring outcomes
- Strategies to improve validity`,

    'Methods_SampleSize': `- How sample size was determined
- Explanation of interim analyses if planned`,

    'Methods_Randomisation': `- Method of generating allocation sequence
- Mechanism for implementing allocation concealment
- Who will generate sequence, enrol, and assign`,

    'Methods_Blinding': `- Who will be blinded
- How blinding will be maintained
- Procedure for unblinding if necessary`,

    'Methods_DataCollection': `- Plans for assessment and collection of data
- Plans for participant retention
- Plans for promoting completion of follow-up`,

    'Methods_Analysis': `- Statistical methods for primary and secondary outcomes
- Methods for additional analyses
- Methods for handling missing data
- Plans for interim analysis and stopping rules`,

    'Ethics': `- Ethical approval status
- Protocol amendments process
- Consent procedures
- Confidentiality measures
- Access to data
- Ancillary and post-trial care
- Dissemination policy`
  };

  return requirements[sectionName] || 'Follow SPIRIT guidelines for this section';
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Parses document outline response
 */
export function parseDocumentOutlineResponse(response: string): DocumentOutlineOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    return JSON.parse(jsonString.trim());
  } catch (error) {
    throw new Error(`Failed to parse document outline response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Counts words in a text string
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Checks if text exceeds word limit
 */
export function checkWordLimit(text: string, limit: number): {
  withinLimit: boolean;
  wordCount: number;
  excess: number;
} {
  const wordCount = countWords(text);
  return {
    withinLimit: wordCount <= limit,
    wordCount,
    excess: Math.max(0, wordCount - limit)
  };
}

/**
 * Returns the content mapping for a document type
 */
export function getDocumentContentMapping(docType: DocumentType): Record<string, {
  source: string[];
  templateSection: string;
  wordLimit?: number;
}> {
  if (docType === 'RESEARCH_PROTOCOL') {
    return {
      'title_page': {
        source: ['project.intake.projectTitle', 'project.intake.principalInvestigator'],
        templateSection: 'header'
      },
      'synopsis': {
        source: ['project.intake', 'methodology'],
        templateSection: 'synopsis_table',
        wordLimit: 500
      },
      'introduction': {
        source: ['research.backgroundDraft'],
        templateSection: 'section_1',
        wordLimit: 250
      },
      'background': {
        source: ['research.literatureSummary', 'research.gapAnalysis'],
        templateSection: 'section_2',
        wordLimit: 1500
      },
      'aims_objectives': {
        source: ['methodology.outcomes'],
        templateSection: 'section_3',
        wordLimit: 300
      },
      'methods': {
        source: ['methodology'],
        templateSection: 'section_4',
        wordLimit: 2000
      },
      'participants': {
        source: ['methodology.participants'],
        templateSection: 'section_5'
      },
      'outcomes': {
        source: ['methodology.outcomes'],
        templateSection: 'section_6'
      },
      'data_management': {
        source: ['ethics.data_governance'],
        templateSection: 'section_10'
      },
      'ethical_considerations': {
        source: ['ethics'],
        templateSection: 'section_11'
      },
      'references': {
        source: ['research.citations'],
        templateSection: 'section_13'
      }
    };
  }

  if (docType === 'EMF_GRANT_APPLICATION') {
    return {
      'A4_plain_language_summary': {
        source: ['project.intake.conceptDescription', 'methodology'],
        templateSection: 'A4',
        wordLimit: 250
      },
      'A5_scientific_abstract': {
        source: ['research', 'methodology'],
        templateSection: 'A5',
        wordLimit: 450
      },
      'B1_background_rationale': {
        source: ['research.literatureSummary', 'research.gapAnalysis'],
        templateSection: 'B1',
        wordLimit: 1500
      },
      'B2_aims_objectives': {
        source: ['methodology.outcomes'],
        templateSection: 'B2',
        wordLimit: 300
      },
      'B3_design_methods': {
        source: ['methodology'],
        templateSection: 'B3',
        wordLimit: 2000
      },
      'B4_innovation_impact': {
        source: ['research.gapAnalysis', 'project.intake.intendedOutcomes'],
        templateSection: 'B4',
        wordLimit: 750
      },
      'B5_translation_plan': {
        source: ['project.intake.intendedOutcomes', 'methodology'],
        templateSection: 'B5',
        wordLimit: 400
      }
    };
  }

  return {};
}
