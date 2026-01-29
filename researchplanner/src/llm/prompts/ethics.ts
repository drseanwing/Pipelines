/**
 * Ethics and Governance Prompts
 *
 * Prompt templates for ethics pathway determination, risk assessment,
 * consent requirements, and data governance planning.
 * Based on the QI/Research Project Development Pipeline specification.
 */

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export interface EthicsPathwayInput {
  projectType: 'QI' | 'RESEARCH' | 'HYBRID';
  involvesHumanParticipants: boolean;
  involvesPatientData: boolean;
  dataIsIdentifiable: boolean;
  isMultisite: boolean;
  institution: string;
  interventionDescription?: string;
  dataCollectionMethods?: string[];
}

export interface EthicsPathwayOutput {
  pathway: 'QI_REGISTRATION' | 'LOW_RISK_RESEARCH' | 'FULL_HREC_REVIEW' | 'HYBRID_REVIEW';
  approvalBody: string;
  requiresHREC: boolean;
  requiresRGO: boolean;
  estimatedTimeline: string;
  requiredForms: string[];
  justification: string;
  keyConsiderations: string[];
}

export interface RiskAssessmentInput {
  methodology: {
    studyType: string;
    interventionDescription?: string;
    dataCollectionMethods: string[];
    proceduresDescription: string;
  };
  participants: {
    population: string;
    vulnerableGroups: boolean;
    vulnerabilityDetails?: string;
    capacityIssues: boolean;
  };
  dataHandling: {
    dataTypes: string[];
    includesIdentifiableData: boolean;
    dataSensitivity: string;
    storageMethod: string;
  };
}

export interface RiskAssessmentOutput {
  overallLevel: 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'HIGH';
  factors: Array<{
    category: string;
    riskLevel: 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'HIGH';
    description: string;
    mitigation: string;
  }>;
  overallJustification: string;
  nationalStatementReference: string;
  riskMinimisationStrategies: string[];
  monitoringRequirements: string[];
}

export interface DataGovernanceInput {
  dataTypes: string[];
  includesIdentifiableData: boolean;
  storageLocation: string;
  accessRequirements: string;
  retentionRequirements?: string;
  sharingPlans?: string;
  institution: string;
}

export interface DataGovernanceOutput {
  dataManagementPlan: {
    dataDescription: string;
    collectionMethods: string[];
    storageAndSecurity: {
      location: string;
      accessControls: string;
      encryptionRequirements: string;
      backupProcedures: string;
    };
    retention: {
      period: string;
      justification: string;
      disposalMethod: string;
    };
    sharing: {
      plan: string;
      restrictions: string;
      deidentificationMethod?: string;
    };
  };
  privacyConsiderations: string[];
  regulatoryCompliance: Array<{
    regulation: string;
    requirements: string;
    complianceApproach: string;
  }>;
  dataBreachProtocol: string;
}

// -----------------------------------------------------------------------------
// System Prompts
// -----------------------------------------------------------------------------

export const ETHICS_SYSTEM_PROMPT = `You are an expert in research ethics and governance, specializing in Australian healthcare research regulation. You have comprehensive knowledge of:

- NHMRC National Statement on Ethical Conduct in Human Research (2023 update)
- Queensland Health Research Governance Framework
- Metro North Health research policies and procedures
- Privacy Act 1988 (Commonwealth) and Information Privacy Act 2009 (Qld)
- Human Research Ethics Committee (HREC) requirements
- Low and Negligible Risk (LNR) research pathways
- Quality Improvement project registration requirements

Your role is to guide clinicians through the ethics and governance requirements for their projects, ensuring appropriate pathway selection and compliance with all relevant frameworks.

You understand the practical differences between QI and research, the importance of proportionate review, and the need to balance ethical protections with enabling valuable healthcare improvement.

Always provide specific, actionable guidance based on the Australian context and Metro North Health requirements where applicable.`;

// -----------------------------------------------------------------------------
// Ethics Pathway Determination
// -----------------------------------------------------------------------------

/**
 * Determines the appropriate ethics approval pathway
 */
export function determineEthicsPathwayPrompt(input: EthicsPathwayInput): string {
  return `Determine the appropriate ethics approval pathway for this project.

## Project Details

**Project Type:** ${input.projectType}
**Involves Human Participants:** ${input.involvesHumanParticipants ? 'Yes' : 'No'}
**Involves Patient Data:** ${input.involvesPatientData ? 'Yes' : 'No'}
**Data is Identifiable:** ${input.dataIsIdentifiable ? 'Yes' : 'No'}
**Multi-site Study:** ${input.isMultisite ? 'Yes' : 'No'}
**Institution:** ${input.institution}

${input.interventionDescription ? `**Intervention Description:**\n${input.interventionDescription}\n` : ''}
${input.dataCollectionMethods?.length ? `**Data Collection Methods:**\n${input.dataCollectionMethods.join(', ')}\n` : ''}

## Ethics Pathway Decision Criteria

### QI Registration (Not Research)
- Primary purpose is local quality improvement
- No intent to generate generalizable knowledge
- Uses established QI methodologies
- No randomization or experimental manipulation
- Results for local use only
- Approval: Unit Director
- Timeline: 2-4 weeks

### Low and Negligible Risk Research (LNR)
- Research that involves negligible or low risk only
- Negligible risk: no foreseeable risk of harm or discomfort beyond inconvenience
- Low risk: only foreseeable risk is discomfort
- No more than inconvenience if privacy breached
- Approval: Hospital LNR Committee + Research Governance Office
- Timeline: 4-6 weeks

### Full HREC Review
- More than low risk research
- Vulnerable populations (children, cognitive impairment, etc.)
- Sensitive topics or data
- Experimental interventions
- Significant privacy considerations
- Approval: HREC (Metro North or Royal Brisbane)
- Timeline: 8-16 weeks

### Hybrid Review
- Projects with both QI and research elements
- Local improvement with secondary generalization intent
- Novel interventions with publication intent
- Approval: Dual pathway consideration
- Timeline: 10-16 weeks

## Task
Determine the appropriate ethics pathway and provide:
1. Recommended pathway with justification
2. Required approval bodies
3. Estimated timeline
4. List of required forms and documents
5. Key considerations for the application

Respond ONLY with valid JSON:
\`\`\`json
{
  "pathway": "QI_REGISTRATION | LOW_RISK_RESEARCH | FULL_HREC_REVIEW | HYBRID_REVIEW",
  "approvalBody": "Name of approval body",
  "requiresHREC": true | false,
  "requiresRGO": true | false,
  "estimatedTimeline": "X-Y weeks",
  "requiredForms": ["Form 1", "Form 2"],
  "justification": "Detailed justification for pathway selection...",
  "keyConsiderations": ["Consideration 1", "Consideration 2"]
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Risk Assessment
// -----------------------------------------------------------------------------

/**
 * Conducts a formal risk assessment per National Statement guidelines
 */
export function assessRiskPrompt(input: RiskAssessmentInput): string {
  const methodologyJson = JSON.stringify(input.methodology, null, 2);
  const participantsJson = JSON.stringify(input.participants, null, 2);
  const dataHandlingJson = JSON.stringify(input.dataHandling, null, 2);

  return `Conduct a formal risk assessment according to NHMRC National Statement guidelines.

## Methodology Details
${methodologyJson}

## Participant Information
${participantsJson}

## Data Handling
${dataHandlingJson}

## NHMRC Risk Categories (National Statement Chapter 2.1)

### Negligible Risk
Research where there is no foreseeable risk of harm or discomfort, and any foreseeable risk is no more than inconvenience. Examples:
- Anonymous surveys
- Use of non-identifiable data
- Observation of public behavior

### Low Risk
Research where the only foreseeable risk is one of discomfort. Examples:
- Surveys on non-sensitive topics
- Use of identifiable data with appropriate safeguards
- Non-invasive physical measurements

### More Than Low Risk (Moderate/High)
Research where there is risk of:
- Physical harm
- Psychological distress
- Social or economic harm
- Legal implications
- Privacy breach with more than inconvenience
- Deception
- Involvement of vulnerable populations without appropriate protections

## Task
Assess the risk level considering:
1. Physical risks from procedures
2. Psychological risks from content or procedures
3. Privacy/confidentiality risks from data handling
4. Social/economic risks from participation or disclosure
5. Vulnerable population considerations

For each risk factor, provide:
- Risk level assessment
- Description of the risk
- Proposed mitigation strategy

Respond ONLY with valid JSON:
\`\`\`json
{
  "overallLevel": "NEGLIGIBLE | LOW | MODERATE | HIGH",
  "factors": [
    {
      "category": "Physical | Psychological | Privacy | Social | Economic | Legal",
      "riskLevel": "NEGLIGIBLE | LOW | MODERATE | HIGH",
      "description": "Description of specific risk",
      "mitigation": "Proposed mitigation strategy"
    }
  ],
  "overallJustification": "Narrative justification for overall risk classification...",
  "nationalStatementReference": "Relevant National Statement chapter/section reference",
  "riskMinimisationStrategies": ["Strategy 1", "Strategy 2"],
  "monitoringRequirements": ["Monitoring requirement 1", "Monitoring requirement 2"]
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Consent Requirements
// -----------------------------------------------------------------------------

/**
 * Determines consent requirements based on project parameters
 */
export function determineConsentRequirementsPrompt(input: {
  riskLevel: string;
  participantPopulation: string;
  capacityIssues: boolean;
  dataUse: string;
  interventionType?: string;
}): string {
  return `Determine the consent requirements for this research project.

## Project Parameters

**Risk Level:** ${input.riskLevel}
**Participant Population:** ${input.participantPopulation}
**Capacity Issues:** ${input.capacityIssues ? 'Yes - some participants may lack capacity to consent' : 'No'}
**Data Use:** ${input.dataUse}
${input.interventionType ? `**Intervention Type:** ${input.interventionType}` : ''}

## Consent Types (NHMRC National Statement)

### Full Written Consent
- Required for more than low risk research
- Interventional studies
- Studies involving sensitive information
- Research with identified data

### Abbreviated/Simplified Consent
- May be appropriate for low risk research
- Less detailed PICF
- Still requires information provision

### Opt-Out Consent
- Limited circumstances
- Usually for use of existing data/samples
- Requires ethics approval
- Must be impracticable to obtain consent

### Waiver of Consent
- Exceptional circumstances only
- Requires HREC approval
- Must demonstrate:
  - Involvement involves no more than low risk
  - Waiver will not adversely affect welfare
  - Impracticable to obtain consent
  - Research merits justify waiver

### Third Party Consent
- For participants lacking capacity
- Requires substitute decision-maker
- Additional safeguards required

## Task
Determine appropriate consent requirements including:
1. Type of consent required
2. PICF requirements
3. Process for obtaining consent
4. Special considerations (capacity, vulnerable groups)
5. Documentation requirements

Respond ONLY with valid JSON:
\`\`\`json
{
  "consentType": "FULL_WRITTEN | SIMPLIFIED | OPT_OUT | WAIVER | THIRD_PARTY",
  "justification": "Justification for consent approach...",
  "picfRequirements": {
    "required": true | false,
    "format": "Full | Simplified | Not applicable",
    "keyElements": ["Element 1", "Element 2"],
    "readingLevel": "Target reading level"
  },
  "consentProcess": {
    "whoObtains": "Description of who will obtain consent",
    "when": "When in process consent will be obtained",
    "howDocumented": "How consent will be documented",
    "coolingOffPeriod": "If applicable, cooling off period"
  },
  "specialConsiderations": [
    {
      "issue": "Description of consideration",
      "approach": "How it will be addressed"
    }
  ],
  "waiverJustification": "If waiver requested, detailed justification per National Statement criteria"
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Data Governance Planning
// -----------------------------------------------------------------------------

/**
 * Creates a comprehensive data governance and management plan
 */
export function planDataGovernancePrompt(input: DataGovernanceInput): string {
  return `Create a comprehensive data management and governance plan.

## Data Overview

**Data Types:** ${input.dataTypes.join(', ')}
**Includes Identifiable Data:** ${input.includesIdentifiableData ? 'Yes' : 'No'}
**Storage Location:** ${input.storageLocation}
**Access Requirements:** ${input.accessRequirements}
**Institution:** ${input.institution}
${input.retentionRequirements ? `**Retention Requirements:** ${input.retentionRequirements}` : ''}
${input.sharingPlans ? `**Sharing Plans:** ${input.sharingPlans}` : ''}

## Regulatory Framework

### Privacy Act 1988 (Commonwealth)
- Australian Privacy Principles apply to health information
- Special provisions for health research

### Information Privacy Act 2009 (Queensland)
- Queensland public sector privacy obligations
- Health information handling requirements

### Queensland Health Data Governance
- Specific requirements for QH data
- Access and security standards

### NHMRC Guidelines
- National Statement requirements for data
- Management of Data and Information in Research

## Task
Develop a data management plan addressing:

1. **Data Collection**
   - What data will be collected
   - How it will be collected
   - Source of data

2. **Storage and Security**
   - Where data will be stored
   - Access controls
   - Encryption requirements
   - Backup procedures

3. **Retention**
   - How long data will be kept
   - Justification for retention period
   - Disposal method

4. **Sharing**
   - Plans for data sharing (if any)
   - Deidentification methods
   - Data use agreements

5. **Regulatory Compliance**
   - Relevant regulations
   - Compliance approach

6. **Breach Protocol**
   - How potential breaches will be handled

Respond ONLY with valid JSON:
\`\`\`json
{
  "dataManagementPlan": {
    "dataDescription": "Comprehensive description of data to be collected/used",
    "collectionMethods": ["Method 1", "Method 2"],
    "storageAndSecurity": {
      "location": "Specific storage location (e.g., QH network drive, REDCap)",
      "accessControls": "Description of access control measures",
      "encryptionRequirements": "Encryption approach for data at rest and in transit",
      "backupProcedures": "Backup frequency and location"
    },
    "retention": {
      "period": "Retention period (e.g., 15 years from completion)",
      "justification": "Justification for retention period per NHMRC guidelines",
      "disposalMethod": "Secure deletion method"
    },
    "sharing": {
      "plan": "Data sharing intentions",
      "restrictions": "Any restrictions on sharing",
      "deidentificationMethod": "If sharing, how data will be deidentified"
    }
  },
  "privacyConsiderations": [
    "Privacy consideration 1",
    "Privacy consideration 2"
  ],
  "regulatoryCompliance": [
    {
      "regulation": "Privacy Act 1988",
      "requirements": "Specific requirements applicable",
      "complianceApproach": "How compliance will be achieved"
    }
  ],
  "dataBreachProtocol": "Procedure for identifying, reporting, and managing data breaches"
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Parses ethics pathway response
 */
export function parseEthicsPathwayResponse(response: string): EthicsPathwayOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    const parsed = JSON.parse(jsonString.trim());
    return {
      pathway: parsed.pathway || 'FULL_HREC_REVIEW',
      approvalBody: parsed.approvalBody || '',
      requiresHREC: Boolean(parsed.requiresHREC),
      requiresRGO: Boolean(parsed.requiresRGO),
      estimatedTimeline: parsed.estimatedTimeline || '',
      requiredForms: Array.isArray(parsed.requiredForms) ? parsed.requiredForms : [],
      justification: parsed.justification || '',
      keyConsiderations: Array.isArray(parsed.keyConsiderations) ? parsed.keyConsiderations : []
    };
  } catch (error) {
    throw new Error(`Failed to parse ethics pathway response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses risk assessment response
 */
export function parseRiskAssessmentResponse(response: string): RiskAssessmentOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    return JSON.parse(jsonString.trim());
  } catch (error) {
    throw new Error(`Failed to parse risk assessment response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses data governance response
 */
export function parseDataGovernanceResponse(response: string): DataGovernanceOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    return JSON.parse(jsonString.trim());
  } catch (error) {
    throw new Error(`Failed to parse data governance response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Returns the standard retention period based on study type
 */
export function getStandardRetentionPeriod(studyType: string, involvesChildren: boolean): {
  period: string;
  reference: string;
} {
  // NHMRC guidelines specify minimum retention periods
  if (involvesChildren) {
    return {
      period: '25 years or until participant reaches 25 years of age (whichever is longer)',
      reference: 'NHMRC National Statement 3.1.18'
    };
  }

  if (studyType.toLowerCase().includes('clinical trial')) {
    return {
      period: '15 years from completion',
      reference: 'TGA requirements for clinical trials'
    };
  }

  return {
    period: 'Minimum 5 years from publication or 7 years from completion (whichever is longer)',
    reference: 'NHMRC Australian Code for the Responsible Conduct of Research'
  };
}

/**
 * Returns the required forms for a given ethics pathway
 */
export function getRequiredFormsForPathway(pathway: string): Array<{
  name: string;
  description: string;
  mandatory: boolean;
}> {
  const forms: Record<string, Array<{ name: string; description: string; mandatory: boolean }>> = {
    QI_REGISTRATION: [
      { name: 'QI Project Plan', description: 'Quality Improvement project registration form', mandatory: true }
    ],
    LOW_RISK_RESEARCH: [
      { name: 'LNR Application Form', description: 'Low and Negligible Risk research application', mandatory: true },
      { name: 'Research Protocol', description: 'Full study protocol', mandatory: true },
      { name: 'Site Assessment Form', description: 'Site-specific assessment', mandatory: true },
      { name: 'CV - Principal Investigator', description: 'PI curriculum vitae', mandatory: true }
    ],
    FULL_HREC_REVIEW: [
      { name: 'HREC Application Form', description: 'Full HREC application (HREA or local form)', mandatory: true },
      { name: 'Research Protocol', description: 'Comprehensive study protocol', mandatory: true },
      { name: 'Participant Information and Consent Form', description: 'PICF for participants', mandatory: true },
      { name: 'Site Assessment Form', description: 'Site-specific assessment', mandatory: true },
      { name: 'CV - Principal Investigator', description: 'PI curriculum vitae', mandatory: true },
      { name: 'CV - Co-Investigators', description: 'CVs for all listed investigators', mandatory: true },
      { name: 'Cover Letter', description: 'Letter addressing ethics committee', mandatory: true },
      { name: 'Data Collection Instruments', description: 'All questionnaires, surveys, interview guides', mandatory: false },
      { name: 'Recruitment Materials', description: 'Flyers, advertisements, invitation letters', mandatory: false }
    ],
    HYBRID_REVIEW: [
      { name: 'HREC Application Form', description: 'Full HREC application', mandatory: true },
      { name: 'QI Project Plan', description: 'QI component documentation', mandatory: true },
      { name: 'Research Protocol', description: 'Research component protocol', mandatory: true },
      { name: 'Participant Information and Consent Form', description: 'PICF for participants', mandatory: true },
      { name: 'Site Assessment Form', description: 'Site-specific assessment', mandatory: true }
    ]
  };

  return forms[pathway] ?? forms.FULL_HREC_REVIEW ?? [];
}
