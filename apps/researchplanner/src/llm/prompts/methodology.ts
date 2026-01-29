/**
 * Methodology Development Prompts
 *
 * Prompt templates for study design selection, participant criteria,
 * outcome definition, and statistical analysis planning.
 * Based on the QI/Research Project Development Pipeline specification.
 */

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export interface StudyDesignInput {
  projectType: 'QI' | 'RESEARCH' | 'HYBRID';
  researchQuestion: string;
  evidenceGaps: string;
  feasibilityConstraints?: {
    timeline?: string;
    budget?: string;
    sampleAccess?: string;
    resources?: string;
  };
  setting: string;
  intendedOutcomes: string;
}

export interface StudyDesignOutput {
  studyType: string;
  subtype?: string;
  reportingGuideline: string;
  isRandomised: boolean;
  isBlinded: boolean;
  blindingType?: string;
  controlType?: string;
  requiresSampleSize: boolean;
  justification: string;
  alternativeDesigns: Array<{
    design: string;
    pros: string[];
    cons: string[];
  }>;
}

export interface ParticipantCriteriaInput {
  targetPopulation: string;
  studyDesign: StudyDesignOutput;
  evidenceBase: string;
  setting: string;
  researchQuestion: string;
}

export interface ParticipantCriteriaOutput {
  inclusionCriteria: Array<{
    criterion: string;
    rationale: string;
    operationalDefinition: string;
  }>;
  exclusionCriteria: Array<{
    criterion: string;
    rationale: string;
    operationalDefinition: string;
  }>;
  sampleSizeEstimate?: {
    target: number;
    calculationMethod: string;
    assumptions: {
      effectSize: number;
      power: number;
      alpha: number;
      attritionRate: number;
    };
    justification: string;
  };
  recruitmentStrategy: {
    method: string;
    sites: string[];
    estimatedDuration: string;
    feasibilityJustification: string;
  };
  vulnerablePopulation: boolean;
  capacityIssues: boolean;
}

export interface OutcomeDefinitionInput {
  intendedOutcomes: string;
  studyDesign: StudyDesignOutput;
  reportingGuideline: string;
  clinicalProblem: string;
}

export interface OutcomeDefinitionOutput {
  primaryOutcome: {
    name: string;
    definition: string;
    measurementTool: string;
    measurementTiming: string;
    clinicallyMeaningfulDifference?: number;
    dataType: 'continuous' | 'binary' | 'categorical' | 'time-to-event' | 'ordinal';
    validationReference?: string;
  };
  secondaryOutcomes: Array<{
    name: string;
    definition: string;
    measurementTool: string;
    measurementTiming: string;
    dataType: string;
  }>;
  exploratoryOutcomes?: Array<{
    name: string;
    definition: string;
    rationale: string;
  }>;
  safetyOutcomes?: Array<{
    name: string;
    definition: string;
    monitoringPlan: string;
  }>;
}

export interface AnalysisPlanInput {
  studyDesign: StudyDesignOutput;
  outcomes: OutcomeDefinitionOutput;
  sampleSize?: number;
  participantCriteria: ParticipantCriteriaOutput;
}

export interface AnalysisPlanOutput {
  primaryAnalysis: {
    method: string;
    description: string;
    assumptions: string[];
    software: string;
  };
  secondaryAnalyses: Array<{
    outcome: string;
    method: string;
    description: string;
  }>;
  sensitivityAnalyses: Array<{
    name: string;
    purpose: string;
    method: string;
  }>;
  subgroupAnalyses?: Array<{
    subgroup: string;
    rationale: string;
    method: string;
  }>;
  missingDataStrategy: {
    approach: string;
    assumptions: string;
    sensitivityAnalysis: string;
  };
  multipleTesting?: {
    issue: string;
    adjustmentMethod: string;
  };
}

// -----------------------------------------------------------------------------
// System Prompts
// -----------------------------------------------------------------------------

export const METHODOLOGY_SYSTEM_PROMPT = `You are an expert clinical research methodologist with extensive experience in:

- Study design selection for QI and research projects
- Sample size calculations and power analysis
- Development of inclusion/exclusion criteria
- Outcome measure selection and validation
- Statistical analysis planning
- CONSORT, STROBE, SQUIRE, and other reporting guidelines

You understand the practical constraints of clinical research in emergency medicine settings and balance methodological rigor with feasibility. You provide specific, operational guidance that can be directly implemented.

When developing methodology, always:
1. Start with the research question and work backwards
2. Consider feasibility alongside ideal design
3. Provide clear operational definitions
4. Justify each methodological choice
5. Anticipate and address potential biases

Your outputs should be detailed enough to guide protocol development and ethics submissions.`;

// -----------------------------------------------------------------------------
// Study Design Selection
// -----------------------------------------------------------------------------

/**
 * Determines the optimal study design based on project parameters
 */
export function determineStudyDesignPrompt(input: StudyDesignInput): string {
  return `Determine the optimal study design for this project and provide detailed justification.

## Project Classification
${input.projectType}

## Research Question / Project Concept
${input.researchQuestion}

## Evidence Gaps to Address
${input.evidenceGaps}

## Clinical Setting
${input.setting}

## Intended Outcomes
${input.intendedOutcomes}

${input.feasibilityConstraints ? `## Feasibility Constraints
- Timeline: ${input.feasibilityConstraints.timeline || 'Not specified'}
- Budget: ${input.feasibilityConstraints.budget || 'Not specified'}
- Sample Access: ${input.feasibilityConstraints.sampleAccess || 'Not specified'}
- Resources: ${input.feasibilityConstraints.resources || 'Not specified'}
` : ''}

## Study Design Options by Project Type

### For QI Projects:
- PDSA Cycle (Plan-Do-Study-Act)
- IHI Model for Improvement
- Lean Six Sigma
- Pre-Post Implementation Study
- Reporting Guideline: SQUIRE 2.0

### For Research Projects:
**Interventional - Randomised:**
- Randomised Controlled Trial (RCT)
- Cluster RCT
- Stepped-Wedge Design
- Reporting: CONSORT

**Interventional - Non-Randomised:**
- Quasi-experimental (Pre-Post)
- Interrupted Time Series
- Controlled Before-After
- Reporting: TREND

**Observational:**
- Cohort Study
- Case-Control Study
- Cross-Sectional Study
- Reporting: STROBE

**Qualitative:**
- Thematic Analysis
- Grounded Theory
- Phenomenology
- Reporting: SRQR

**Mixed Methods:**
- Convergent Parallel
- Explanatory Sequential
- Exploratory Sequential
- Reporting: GRAMMS

**Systematic Review:**
- Systematic Review
- Scoping Review
- Meta-Analysis
- Reporting: PRISMA

## Task
Select the most appropriate study design considering:
1. Alignment with project aims and classification
2. Evidence gap being addressed
3. Feasibility within stated constraints
4. Methodological rigor
5. Ethics and governance requirements

Also provide 2-3 alternative designs with pros/cons.

Respond ONLY with valid JSON:
\`\`\`json
{
  "studyType": "Primary study design type",
  "subtype": "Specific subtype if applicable",
  "reportingGuideline": "CONSORT | STROBE | SQUIRE | etc.",
  "isRandomised": true | false,
  "isBlinded": true | false,
  "blindingType": "Single | Double | None | Not applicable",
  "controlType": "Usual care | Placebo | Active comparator | Historical | None",
  "requiresSampleSize": true | false,
  "justification": "Detailed justification for this design choice (3-5 sentences)...",
  "alternativeDesigns": [
    {
      "design": "Alternative design name",
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1", "Disadvantage 2"]
    }
  ]
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Participant Criteria Definition
// -----------------------------------------------------------------------------

/**
 * Generates inclusion/exclusion criteria and recruitment strategy
 */
export function defineParticipantsPrompt(input: ParticipantCriteriaInput): string {
  const studyDesignJson = JSON.stringify(input.studyDesign, null, 2);

  return `Define comprehensive participant criteria for this study.

## Target Population
${input.targetPopulation}

## Study Design
${studyDesignJson}

## Clinical Setting
${input.setting}

## Research Question
${input.researchQuestion}

## Evidence Base Summary
${input.evidenceBase}

## Requirements

### Inclusion Criteria
- Should be specific, measurable, and operationally defined
- Include age range, clinical condition, setting requirements
- Specify timeframes where relevant
- Include rationale for each criterion

### Exclusion Criteria
- Should be justified and minimized to maximize generalizability
- Consider safety, feasibility, and scientific reasons
- Avoid unnecessary exclusions that limit external validity

### Sample Size (if applicable for design type)
- Provide calculation based on appropriate method
- State all assumptions clearly
- Account for expected attrition

### Recruitment Strategy
- Identify recruitment methods and sites
- Estimate recruitment timeline
- Assess feasibility with justification

### Special Considerations
- Identify if population includes vulnerable groups
- Note any capacity/consent considerations

Respond ONLY with valid JSON:
\`\`\`json
{
  "inclusionCriteria": [
    {
      "criterion": "Clear statement of criterion",
      "rationale": "Why this criterion is included",
      "operationalDefinition": "How this will be assessed/measured"
    }
  ],
  "exclusionCriteria": [
    {
      "criterion": "Clear statement of exclusion",
      "rationale": "Why this exclusion is necessary",
      "operationalDefinition": "How this will be assessed"
    }
  ],
  "sampleSizeEstimate": {
    "target": 100,
    "calculationMethod": "Method used (e.g., two-sample t-test, chi-square)",
    "assumptions": {
      "effectSize": 0.5,
      "power": 0.80,
      "alpha": 0.05,
      "attritionRate": 0.15
    },
    "justification": "Detailed justification including source of effect size estimate..."
  },
  "recruitmentStrategy": {
    "method": "Description of recruitment approach",
    "sites": ["Site 1", "Site 2"],
    "estimatedDuration": "X months",
    "feasibilityJustification": "Why this is achievable..."
  },
  "vulnerablePopulation": false,
  "capacityIssues": false
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Outcome Definition
// -----------------------------------------------------------------------------

/**
 * Defines primary and secondary outcomes with measurement specifications
 */
export function defineOutcomesPrompt(input: OutcomeDefinitionInput): string {
  const studyDesignJson = JSON.stringify(input.studyDesign, null, 2);

  return `Define study outcomes according to ${input.reportingGuideline} guidelines.

## Intended Outcomes
${input.intendedOutcomes}

## Clinical Problem
${input.clinicalProblem}

## Study Design
${studyDesignJson}

## Reporting Guideline
${input.reportingGuideline}

## Requirements

### Primary Outcome
- Should be single, clinically meaningful outcome
- Must be clearly defined with specific measurement tool
- Specify timing of measurement
- Define clinically meaningful difference if applicable
- Identify data type for statistical planning

### Secondary Outcomes
- Limited number (typically 3-5)
- Each should have clear relevance to research question
- Defined with same rigor as primary outcome

### Safety Outcomes (if interventional)
- Define adverse events to monitor
- Specify monitoring and reporting procedures

### Measurement Considerations
- Use validated instruments where possible
- Specify who will collect outcome data
- Address potential for bias in outcome assessment

Respond ONLY with valid JSON:
\`\`\`json
{
  "primaryOutcome": {
    "name": "Short name for outcome",
    "definition": "Precise operational definition",
    "measurementTool": "Specific tool or method (e.g., validated scale, chart review)",
    "measurementTiming": "When measured relative to enrollment/intervention",
    "clinicallyMeaningfulDifference": 10,
    "dataType": "continuous | binary | categorical | time-to-event | ordinal",
    "validationReference": "Citation for validation study if applicable"
  },
  "secondaryOutcomes": [
    {
      "name": "Outcome name",
      "definition": "Operational definition",
      "measurementTool": "Tool or method",
      "measurementTiming": "When measured",
      "dataType": "continuous | binary | etc."
    }
  ],
  "exploratoryOutcomes": [
    {
      "name": "Outcome name",
      "definition": "Definition",
      "rationale": "Why included as exploratory"
    }
  ],
  "safetyOutcomes": [
    {
      "name": "Adverse event type",
      "definition": "How defined",
      "monitoringPlan": "How and when monitored"
    }
  ]
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Statistical Analysis Plan
// -----------------------------------------------------------------------------

/**
 * Develops a comprehensive statistical analysis plan
 */
export function developAnalysisPlanPrompt(input: AnalysisPlanInput): string {
  const studyDesignJson = JSON.stringify(input.studyDesign, null, 2);
  const outcomesJson = JSON.stringify(input.outcomes, null, 2);

  return `Develop a comprehensive statistical analysis plan for this study.

## Study Design
${studyDesignJson}

## Outcomes
${outcomesJson}

## Sample Size
${input.sampleSize ? `Target: ${input.sampleSize} participants` : 'Not yet determined'}

## Requirements

### Primary Analysis
- Select appropriate statistical method for primary outcome
- State all assumptions of the method
- Describe how analysis addresses research question
- Specify statistical software

### Secondary Analyses
- Methods for each secondary outcome
- Appropriate methods for each data type

### Sensitivity Analyses
- Analyses to test robustness of findings
- Alternative assumptions or methods

### Missing Data
- Strategy for handling missing data
- Assumptions about missingness mechanism
- Sensitivity analyses for missing data

### Multiple Comparisons
- If applicable, method for controlling Type I error

### Subgroup Analyses (if pre-specified)
- Pre-specified subgroups with rationale
- Appropriate methods for subgroup comparisons

### For QI Projects (if applicable)
- Run chart or control chart specifications
- Process capability analysis
- Balancing measures

Respond ONLY with valid JSON:
\`\`\`json
{
  "primaryAnalysis": {
    "method": "Statistical test or method name",
    "description": "Detailed description of how analysis will be performed",
    "assumptions": ["Assumption 1", "Assumption 2", "Assumption 3"],
    "software": "R | Stata | SPSS | SAS"
  },
  "secondaryAnalyses": [
    {
      "outcome": "Outcome name",
      "method": "Statistical method",
      "description": "Brief description of analysis"
    }
  ],
  "sensitivityAnalyses": [
    {
      "name": "Sensitivity analysis name",
      "purpose": "What assumption or scenario this tests",
      "method": "Statistical approach"
    }
  ],
  "subgroupAnalyses": [
    {
      "subgroup": "Subgroup definition",
      "rationale": "Why this subgroup is of interest",
      "method": "Statistical approach for comparison"
    }
  ],
  "missingDataStrategy": {
    "approach": "Complete case | Multiple imputation | Mixed models | etc.",
    "assumptions": "Assumptions about missingness mechanism",
    "sensitivityAnalysis": "How missing data assumptions will be tested"
  },
  "multipleTesting": {
    "issue": "Description of multiple testing concern",
    "adjustmentMethod": "Bonferroni | Holm | FDR | No adjustment with justification"
  }
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Parses study design response
 */
export function parseStudyDesignResponse(response: string): StudyDesignOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    const parsed = JSON.parse(jsonString.trim());
    return {
      studyType: parsed.studyType || '',
      subtype: parsed.subtype,
      reportingGuideline: parsed.reportingGuideline || '',
      isRandomised: Boolean(parsed.isRandomised),
      isBlinded: Boolean(parsed.isBlinded),
      blindingType: parsed.blindingType,
      controlType: parsed.controlType,
      requiresSampleSize: Boolean(parsed.requiresSampleSize),
      justification: parsed.justification || '',
      alternativeDesigns: Array.isArray(parsed.alternativeDesigns) ? parsed.alternativeDesigns : []
    };
  } catch (error) {
    throw new Error(`Failed to parse study design response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses participant criteria response
 */
export function parseParticipantCriteriaResponse(response: string): ParticipantCriteriaOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    return JSON.parse(jsonString.trim());
  } catch (error) {
    throw new Error(`Failed to parse participant criteria response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses outcome definition response
 */
export function parseOutcomeDefinitionResponse(response: string): OutcomeDefinitionOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    return JSON.parse(jsonString.trim());
  } catch (error) {
    throw new Error(`Failed to parse outcome definition response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses analysis plan response
 */
export function parseAnalysisPlanResponse(response: string): AnalysisPlanOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    return JSON.parse(jsonString.trim());
  } catch (error) {
    throw new Error(`Failed to parse analysis plan response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Returns the reporting guideline requirements for a given guideline
 */
export function getReportingGuidelineRequirements(guideline: string): {
  name: string;
  fullName: string;
  requiredSections: string[];
  checklistUrl: string;
} {
  const guidelines: Record<string, {
    name: string;
    fullName: string;
    requiredSections: string[];
    checklistUrl: string;
  }> = {
    CONSORT: {
      name: 'CONSORT',
      fullName: 'Consolidated Standards of Reporting Trials',
      requiredSections: [
        'Title and abstract',
        'Introduction (background, objectives)',
        'Methods (trial design, participants, interventions, outcomes, sample size, randomisation, blinding)',
        'Results (participant flow, recruitment, baseline data, outcomes, harms)',
        'Discussion (limitations, generalisability, interpretation)',
        'Other (registration, protocol, funding)'
      ],
      checklistUrl: 'https://www.consort-statement.org/checklists/view/32-consort/66-title'
    },
    STROBE: {
      name: 'STROBE',
      fullName: 'Strengthening the Reporting of Observational Studies in Epidemiology',
      requiredSections: [
        'Title and abstract',
        'Introduction (background, objectives)',
        'Methods (study design, setting, participants, variables, data sources, bias, study size, statistical methods)',
        'Results (participants, descriptive data, outcome data, main results)',
        'Discussion (key results, limitations, interpretation, generalisability)',
        'Funding'
      ],
      checklistUrl: 'https://www.strobe-statement.org/checklists/'
    },
    SQUIRE: {
      name: 'SQUIRE',
      fullName: 'Standards for Quality Improvement Reporting Excellence',
      requiredSections: [
        'Title and abstract',
        'Introduction (problem description, available knowledge, rationale, specific aims)',
        'Methods (context, intervention, study of the intervention, measures, analysis, ethical considerations)',
        'Results (details of process and outcome)',
        'Discussion (summary, interpretation, limitations, conclusions)'
      ],
      checklistUrl: 'http://squire-statement.org/index.cfm?fuseaction=Page.ViewPage&PageID=471'
    },
    PRISMA: {
      name: 'PRISMA',
      fullName: 'Preferred Reporting Items for Systematic Reviews and Meta-Analyses',
      requiredSections: [
        'Title',
        'Abstract',
        'Introduction (rationale, objectives)',
        'Methods (eligibility criteria, information sources, search strategy, selection process, data collection, risk of bias, effect measures, synthesis methods)',
        'Results (study selection, study characteristics, risk of bias, individual results, synthesis results)',
        'Discussion (summary, limitations, conclusions)',
        'Other (registration, funding)'
      ],
      checklistUrl: 'http://www.prisma-statement.org/PRISMAStatement/Checklist'
    },
    SRQR: {
      name: 'SRQR',
      fullName: 'Standards for Reporting Qualitative Research',
      requiredSections: [
        'Title',
        'Abstract',
        'Introduction (problem formulation, purpose)',
        'Methods (approach, researcher characteristics, context, sampling, data collection, data processing, data analysis, trustworthiness)',
        'Results/findings',
        'Discussion (interpretation, integration, limitations, conclusions)'
      ],
      checklistUrl: 'https://journals.lww.com/academicmedicine/Fulltext/2014/09000/Standards_for_Reporting_Qualitative_Research__A.21.aspx'
    }
  };

  return guidelines[guideline] || {
    name: guideline,
    fullName: guideline,
    requiredSections: [],
    checklistUrl: ''
  };
}
