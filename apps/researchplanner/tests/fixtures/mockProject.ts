/**
 * Mock Data Fixtures for QI Research Pipeline Tests
 *
 * This module provides factory functions for creating realistic test data
 * for all major types in the QI Research Pipeline.
 */

import type {
  Project,
  ProjectStatus,
  ProjectType,
  IntakeData,
  Investigator,
  InvestigatorRole,
  Classification,
  Frameworks,
  TimelineConstraint,
  ResearchStageData,
  MethodologyStageData,
  EthicsStageData,
  DocumentsStageData,
  Checkpoints,
  AuditEntry,
  GrantType,
} from '../../src/types/index.js';

import type {
  SearchStrategy,
  ProcessedArticle,
  GapAnalysis,
  Citation,
  KnowledgeGap,
} from '../../src/types/research.js';

import type {
  StudyDesign,
  ParticipantSpec,
  OutcomeSpec,
  ProcedureSpec,
  AnalysisPlan,
  ProjectTimeline,
  DataCollectionSpec,
  Site,
  Criterion,
  RecruitmentStrategy,
  SampleSizeCalculation,
} from '../../src/types/methodology.js';

import type {
  EthicsPathway,
  RiskAssessment,
  ConsentSpec,
  DataGovernanceSpec,
  SiteRequirement,
  ChecklistItem,
  RiskFactor,
} from '../../src/types/ethics.js';

import type {
  GeneratedDocument,
  DocumentMetadata,
  DocumentSection,
  DocumentValidationResult,
} from '../../src/types/documents.js';

// ============================================================================
// Base IDs and Timestamps
// ============================================================================

let idCounter = 1;

/**
 * Generate a unique test ID
 */
export function generateMockId(prefix: string = 'mock'): string {
  return `${prefix}-${Date.now()}-${idCounter++}`;
}

/**
 * Get a consistent test timestamp
 */
export function getMockTimestamp(offsetDays: number = 0): string {
  const date = new Date('2026-01-27T10:00:00Z');
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

// ============================================================================
// Investigator Mock Factory
// ============================================================================

/**
 * Create a mock investigator
 */
export function createMockInvestigator(
  overrides: Partial<Investigator> = {}
): Investigator {
  return {
    name: 'Dr. Jane Smith',
    role: 'PI' as InvestigatorRole,
    title: 'Associate Professor',
    institution: 'Royal Brisbane Hospital',
    department: 'Emergency Medicine',
    email: 'jane.smith@health.qld.gov.au',
    phone: '+61 7 3636 8111',
    orcid: '0000-0001-2345-6789',
    expertise: ['Emergency Medicine', 'Sepsis', 'Quality Improvement'],
    ...overrides,
  };
}

/**
 * Create a list of mock co-investigators
 */
export function createMockCoInvestigators(count: number = 2): Investigator[] {
  const coIs: Investigator[] = [];
  const names = [
    { first: 'John', last: 'Davis' },
    { first: 'Sarah', last: 'Williams' },
    { first: 'Michael', last: 'Brown' },
    { first: 'Emily', last: 'Johnson' },
  ];

  for (let i = 0; i < count && i < names.length; i++) {
    const name = names[i];
    coIs.push(
      createMockInvestigator({
        name: `Dr. ${name?.first} ${name?.last}`,
        role: 'CO_I' as InvestigatorRole,
        email: `${name?.first?.toLowerCase()}.${name?.last?.toLowerCase()}@health.qld.gov.au`,
        orcid: `0000-0002-${1000 + i}-${2000 + i}`,
      })
    );
  }

  return coIs;
}

// ============================================================================
// IntakeData Mock Factory
// ============================================================================

/**
 * Create mock intake data
 */
export function createMockIntakeData(
  overrides: Partial<IntakeData> = {}
): IntakeData {
  return {
    projectTitle: 'Improving Early Sepsis Recognition in Emergency Department Triage',
    projectType: 'RESEARCH' as ProjectType,
    conceptDescription:
      'This project aims to evaluate the implementation of an enhanced sepsis screening ' +
      'protocol at emergency department triage. The current approach relies heavily on ' +
      'clinical judgment, which can lead to delays in recognition and treatment initiation. ' +
      'We propose to implement and evaluate a modified qSOFA-based screening tool that ' +
      'integrates with the existing electronic triage system. The tool will automatically ' +
      'flag high-risk patients and trigger a sepsis alert pathway. We hypothesize that ' +
      'this intervention will reduce time to antibiotic administration and improve patient ' +
      'outcomes. The study will use a stepped-wedge cluster randomized design across three ' +
      'emergency departments within the Metro North Hospital and Health Service. Primary ' +
      'outcomes include time to first antibiotic dose, sepsis bundle compliance, and ' +
      'in-hospital mortality rates.',
    clinicalProblem:
      'Sepsis is a leading cause of mortality in emergency departments. Early recognition ' +
      'and timely treatment are critical but often delayed due to non-specific presentation ' +
      'and reliance on clinical judgment alone.',
    targetPopulation:
      'Adult patients (age >= 18 years) presenting to emergency departments with suspected ' +
      'infection or meeting SIRS criteria.',
    setting: 'Emergency Departments at Royal Brisbane, The Prince Charles, and Redcliffe Hospitals',
    principalInvestigator: createMockInvestigator(),
    coInvestigators: createMockCoInvestigators(2),
    intendedOutcomes:
      'Reduce time to antibiotic administration by 30%, improve sepsis bundle compliance ' +
      'to >90%, and reduce sepsis-related in-hospital mortality by 10%.',
    grantTarget: 'EMF_LEADING_EDGE' as GrantType,
    timelineConstraint: {
      submissionDeadline: '2026-03-15T23:59:59Z',
      targetStartDate: '2026-07-01T00:00:00Z',
      targetEndDate: '2028-06-30T23:59:59Z',
      milestones: [
        {
          name: 'Ethics Approval',
          targetDate: '2026-05-15T00:00:00Z',
          description: 'Obtain HREC approval from Metro North',
        },
        {
          name: 'Site Training Complete',
          targetDate: '2026-06-30T00:00:00Z',
          description: 'Complete training at all three sites',
        },
      ],
    } as TimelineConstraint,
    ...overrides,
  };
}

// ============================================================================
// Classification Mock Factory
// ============================================================================

/**
 * Create mock classification data
 */
export function createMockClassification(
  overrides: Partial<Classification> = {}
): Classification {
  return {
    projectType: 'RESEARCH' as ProjectType,
    confidence: 0.92,
    reasoning:
      'This project is classified as RESEARCH because it aims to generate generalizable ' +
      'knowledge through a systematic investigation using a stepped-wedge cluster randomized ' +
      'design. The study involves multiple sites, formal hypothesis testing, and intends to ' +
      'publish findings for broader application beyond the local context.',
    suggestedDesigns: ['STEPPED_WEDGE', 'CLUSTER_RCT', 'QUASI_EXPERIMENTAL'],
    ...overrides,
  };
}

// ============================================================================
// Frameworks Mock Factory
// ============================================================================

/**
 * Create mock frameworks data
 */
export function createMockFrameworks(
  overrides: Partial<Frameworks> = {}
): Frameworks {
  return {
    reportingGuideline: 'CONSORT',
    ethicsFramework: 'NHMRC_NATIONAL_STATEMENT',
    governanceRequirements: [
      'MN_CLINICAL_GOVERNANCE',
      'QH_RESEARCH_GOVERNANCE',
      'PRIVACY_ACT_1988',
    ],
    ...overrides,
  };
}

// ============================================================================
// Research Stage Mock Factory
// ============================================================================

/**
 * Create mock search strategy
 */
export function createMockSearchStrategy(
  overrides: Partial<SearchStrategy> = {}
): SearchStrategy {
  return {
    pubmedQuery:
      '(sepsis[MeSH Terms] OR "septic shock"[All Fields]) AND ' +
      '("emergency service, hospital"[MeSH Terms] OR "emergency department"[All Fields]) AND ' +
      '("triage"[MeSH Terms] OR "screening"[All Fields])',
    semanticQuery: 'sepsis early recognition screening emergency department triage outcomes',
    cochraneQuery: 'sepsis AND emergency AND screening',
    meshTerms: [
      'Sepsis',
      'Emergency Service, Hospital',
      'Triage',
      'Early Diagnosis',
      'Mass Screening',
    ],
    keywords: [
      'sepsis',
      'septic shock',
      'early warning score',
      'qSOFA',
      'emergency department',
      'triage',
      'screening tool',
    ],
    dateRange: {
      start: '2019',
      end: '2026',
    },
    searchDate: getMockTimestamp(),
    resultsCount: 247,
    inclusionCriteria: [
      'Studies evaluating sepsis screening tools in emergency settings',
      'Published in English',
      'Adult population (>=18 years)',
      'Original research or systematic reviews',
    ],
    exclusionCriteria: [
      'Pediatric populations',
      'ICU-only settings',
      'Case reports with <5 patients',
      'Conference abstracts without full text',
    ],
    ...overrides,
  };
}

/**
 * Create mock processed article
 */
export function createMockProcessedArticle(
  overrides: Partial<ProcessedArticle> = {}
): ProcessedArticle {
  return {
    pmid: '35123456',
    doi: '10.1016/j.annemergmed.2025.01.001',
    title: 'Machine Learning-Enhanced Sepsis Screening in Emergency Department Triage: A Multicenter Validation Study',
    authors: ['Smith JA', 'Jones BM', 'Williams CD', 'Brown EF'],
    journal: 'Annals of Emergency Medicine',
    year: 2025,
    volume: '85',
    issue: '1',
    pages: '45-56',
    abstract:
      'Background: Early sepsis detection remains challenging in emergency departments. ' +
      'Objective: To validate a machine learning-enhanced screening tool for sepsis detection. ' +
      'Methods: Prospective cohort study across 12 emergency departments. ' +
      'Results: The ML-enhanced tool demonstrated sensitivity of 0.89 and specificity of 0.82. ' +
      'Conclusions: ML-enhanced screening significantly improves early sepsis detection.',
    relevanceScore: 0.94,
    keyFindings: [
      'ML algorithm improved early detection sensitivity by 23%',
      'Reduced time to antibiotics by median 45 minutes',
      'Alert fatigue reduced by 34% compared to traditional tools',
      'Implementation associated with 12% reduction in sepsis mortality',
    ],
    methodologyNotes:
      'Prospective multicenter cohort study with external validation. Strong methodology ' +
      'with appropriate sample size calculation and pre-registered analysis plan.',
    limitations: [
      'Limited to urban tertiary centers',
      'Predominantly adult Caucasian population',
      'Requires EMR integration for full functionality',
    ],
    fullTextAvailable: true,
    studyType: 'COHORT',
    evidenceLevel: 'MODERATE',
    source: 'PUBMED',
    retrievedAt: getMockTimestamp(),
    ...overrides,
  };
}

/**
 * Create mock gap analysis
 */
export function createMockGapAnalysis(
  overrides: Partial<GapAnalysis> = {}
): GapAnalysis {
  const identifiedGaps: KnowledgeGap[] = [
    {
      description: 'Limited evidence on sepsis screening tool performance in geriatric ED patients',
      category: 'population',
      priority: 'HIGH',
      supportingEvidence: ['pmid:35123456', 'pmid:34987654'],
      suggestedApproach: 'Include stratified analysis for patients >=65 years',
    },
    {
      description: 'Few studies evaluate screening tool implementation in Australian healthcare context',
      category: 'setting',
      priority: 'HIGH',
      supportingEvidence: ['pmid:35111222', 'pmid:34999888'],
      suggestedApproach: 'Conduct local validation and implementation study',
    },
    {
      description: 'Lack of long-term outcome data beyond index admission',
      category: 'outcome',
      priority: 'MEDIUM',
      supportingEvidence: ['pmid:35123456'],
      suggestedApproach: 'Include 30-day and 90-day follow-up outcomes',
    },
  ];

  return {
    identifiedGaps,
    methodologicalLimitations: [
      'Most studies are retrospective or single-center',
      'Variable definitions of sepsis across studies',
      'Limited external validation of screening tools',
      'Few studies report implementation outcomes',
    ],
    populationGaps: [
      'Geriatric patients (>=65 years)',
      'Immunocompromised patients',
      'Patients with atypical presentations',
    ],
    outcomeGaps: [
      'Long-term functional outcomes',
      'Quality of life measures',
      'Healthcare utilization post-discharge',
      'Cost-effectiveness data',
    ],
    settingGaps: [
      'Rural and regional emergency departments',
      'Australian healthcare settings',
      'Resource-limited environments',
    ],
    summary:
      'The literature demonstrates that sepsis screening tools can improve early detection ' +
      'and treatment initiation. However, significant gaps exist in evidence for specific ' +
      'populations (geriatric, immunocompromised), settings (Australian healthcare, rural EDs), ' +
      'and long-term outcomes. Most studies are single-center or retrospective, limiting ' +
      'generalizability. This project addresses these gaps through a rigorous multicenter ' +
      'stepped-wedge design in the Australian context.',
    researchQuestions: [
      'What is the effectiveness of modified qSOFA-based screening in improving time to antibiotics?',
      'Does implementation of the screening tool reduce sepsis-related mortality?',
      'What factors influence successful implementation across different ED settings?',
    ],
    ...overrides,
  };
}

/**
 * Create mock citation
 */
export function createMockCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    id: generateMockId('cite'),
    pmid: '35123456',
    doi: '10.1016/j.annemergmed.2025.01.001',
    formattedCitation:
      'Smith JA, Jones BM, Williams CD, Brown EF. Machine Learning-Enhanced Sepsis Screening ' +
      'in Emergency Department Triage: A Multicenter Validation Study. Ann Emerg Med. ' +
      '2025;85(1):45-56. doi: 10.1016/j.annemergmed.2025.01.001',
    style: 'VANCOUVER',
    inTextCitation: '[1]',
    referenceNumber: 1,
    bibtex:
      '@article{smith2025machine,\n' +
      '  title={Machine Learning-Enhanced Sepsis Screening},\n' +
      '  author={Smith, JA and Jones, BM and Williams, CD and Brown, EF},\n' +
      '  journal={Ann Emerg Med},\n' +
      '  volume={85},\n' +
      '  number={1},\n' +
      '  pages={45--56},\n' +
      '  year={2025}\n' +
      '}',
    ...overrides,
  };
}

/**
 * Create mock research stage data
 */
export function createMockResearchData(
  overrides: Partial<ResearchStageData> = {}
): ResearchStageData {
  return {
    searchStrategy: createMockSearchStrategy(),
    primaryLiterature: [
      createMockProcessedArticle(),
      createMockProcessedArticle({
        pmid: '35234567',
        title: 'Effectiveness of qSOFA-based Screening in Emergency Departments',
        relevanceScore: 0.91,
      }),
      createMockProcessedArticle({
        pmid: '35345678',
        title: 'Implementation of Sepsis Alert Systems: A Systematic Review',
        relevanceScore: 0.88,
        studyType: 'SYSTEMATIC_REVIEW',
        evidenceLevel: 'HIGH',
      }),
    ],
    secondaryLiterature: [
      createMockProcessedArticle({
        pmid: '35456789',
        title: 'Barriers to Sepsis Recognition in Triage',
        relevanceScore: 0.65,
      }),
      createMockProcessedArticle({
        pmid: '35567890',
        title: 'Cost-effectiveness of Early Sepsis Intervention',
        relevanceScore: 0.58,
      }),
    ],
    gapAnalysis: createMockGapAnalysis(),
    evidenceSynthesis:
      'The current evidence strongly supports the use of structured sepsis screening tools ' +
      'in emergency department settings. Systematic reviews and meta-analyses demonstrate ' +
      'that implementation of screening protocols is associated with reduced time to ' +
      'antibiotics (weighted mean difference: -35 minutes), improved sepsis bundle compliance ' +
      '(OR 2.3, 95% CI 1.8-2.9), and reduced mortality (OR 0.78, 95% CI 0.68-0.89). However, ' +
      'the evidence is predominantly from North American and European settings, with limited ' +
      'data from the Australian healthcare context. Implementation factors and sustainability ' +
      'remain under-studied.',
    citations: [
      createMockCitation(),
      createMockCitation({
        id: generateMockId('cite'),
        pmid: '35234567',
        referenceNumber: 2,
        inTextCitation: '[2]',
      }),
      createMockCitation({
        id: generateMockId('cite'),
        pmid: '35345678',
        referenceNumber: 3,
        inTextCitation: '[3]',
      }),
    ],
    ...overrides,
  };
}

// ============================================================================
// Methodology Stage Mock Factory
// ============================================================================

/**
 * Create mock study design
 */
export function createMockStudyDesign(
  overrides: Partial<StudyDesign> = {}
): StudyDesign {
  return {
    type: 'STEPPED_WEDGE',
    subtype: 'Cluster Randomized',
    reportingGuideline: 'CONSORT',
    isRandomised: true,
    isBlinded: false,
    blindingType: 'OPEN_LABEL',
    controlType: 'USUAL_CARE',
    requiresSampleSize: true,
    justification:
      'A stepped-wedge cluster randomized design was chosen because: (1) it is ethically ' +
      'appropriate when the intervention is expected to be beneficial, (2) it allows all ' +
      'sites to eventually receive the intervention, (3) it is logistically feasible for ' +
      'sequential implementation across sites, and (4) it provides robust evidence while ' +
      'accounting for secular trends.',
    phases: ['Control Phase', 'Transition', 'Intervention Phase'],
    arms: [
      {
        name: 'Control',
        description: 'Standard triage and sepsis recognition practices',
        allocation: 1,
      },
      {
        name: 'Intervention',
        description: 'Enhanced qSOFA-based screening protocol with automated alerts',
        allocation: 1,
      },
    ],
    ...overrides,
  } as StudyDesign;
}

/**
 * Create mock participant specification
 */
export function createMockParticipantSpec(
  overrides: Partial<ParticipantSpec> = {}
): ParticipantSpec {
  const inclusionCriteria: Criterion[] = [
    {
      criterion: 'Age >= 18 years',
      rationale: 'Adult population focus; pediatric sepsis has different characteristics',
      measurementMethod: 'Date of birth verification in EMR',
    },
    {
      criterion: 'Presenting to emergency department with suspected infection',
      rationale: 'Target population for sepsis screening',
      measurementMethod: 'Triage assessment and presenting complaint',
    },
    {
      criterion: 'Meeting >= 2 SIRS criteria at triage',
      rationale: 'Identifies patients at risk for sepsis',
      measurementMethod: 'Automated calculation from triage vital signs',
    },
  ];

  const exclusionCriteria: Criterion[] = [
    {
      criterion: 'Pregnancy',
      rationale: 'Different physiological parameters and treatment considerations',
      measurementMethod: 'Patient self-report and EMR review',
    },
    {
      criterion: 'Pre-existing DNR/NFR orders',
      rationale: 'May not receive full sepsis bundle',
      measurementMethod: 'EMR documentation review',
    },
    {
      criterion: 'Transfer from another facility already on antibiotics',
      rationale: 'Cannot assess time to first antibiotic',
      measurementMethod: 'Transfer documentation review',
    },
  ];

  const sampleSize: SampleSizeCalculation = {
    target: 1200,
    calculationMethod: 'POWER_ANALYSIS',
    assumptions: {
      effectSize: 0.25,
      power: 0.80,
      alpha: 0.05,
      attritionRate: 0.10,
      clusterSize: 400,
      icc: 0.02,
    },
    justification:
      'Sample size calculated using methods for stepped-wedge cluster randomized trials. ' +
      'Based on baseline time to antibiotics of 120 minutes (SD 60), detecting a 30-minute ' +
      'reduction with 80% power and alpha 0.05, accounting for clustering (ICC 0.02) and ' +
      '10% attrition. Total required: 1080 patients; recruiting 1200 to ensure adequacy.',
    sensitivity:
      'Sensitivity analyses show adequate power (>80%) maintained for ICC up to 0.05 ' +
      'and attrition up to 15%.',
  };

  const recruitmentStrategy: RecruitmentStrategy = {
    method: 'Consecutive sampling of eligible patients',
    sites: ['Royal Brisbane Hospital ED', 'Prince Charles Hospital ED', 'Redcliffe Hospital ED'],
    estimatedDuration: '18 months',
    feasibilityJustification:
      'Based on historical data, approximately 150 patients per month meet eligibility ' +
      'criteria across the three sites. With 18-month recruitment, we expect to exceed ' +
      'the target sample size.',
    screeningProcess: 'Automated EMR screening at triage with manual verification',
  };

  return {
    inclusionCriteria,
    exclusionCriteria,
    sampleSize,
    recruitmentStrategy,
    capacityIssues: true,
    vulnerablePopulation: true,
    vulnerabilityDetails:
      'Study may include patients with acute cognitive impairment due to sepsis. ' +
      'Waiver of consent will be sought with notification to next of kin.',
    ...overrides,
  };
}

/**
 * Create mock outcome specification
 */
export function createMockOutcomeSpec(
  overrides: Partial<OutcomeSpec> = {}
): OutcomeSpec {
  return {
    primary: {
      name: 'Time to first antibiotic administration',
      definition:
        'Minutes from ED arrival (triage timestamp) to administration of first dose of ' +
        'appropriate antibiotic therapy',
      measurementTool: 'Electronic medical record timestamp extraction',
      measurementTiming: 'At time of antibiotic administration',
      clinicallyMeaningfulDifference: 30,
      validationStatus: 'Validated EMR data extraction protocol established',
    },
    secondary: [
      {
        name: 'Sepsis bundle compliance',
        definition: 'Proportion of patients receiving all elements of SEP-1 bundle within 3 hours',
        measurementTool: 'EMR-based bundle compliance calculator',
        measurementTiming: 'Within 3 hours of sepsis identification',
      },
      {
        name: 'In-hospital mortality',
        definition: 'Death during index hospital admission',
        measurementTool: 'Hospital discharge data',
        measurementTiming: 'At hospital discharge',
      },
      {
        name: 'ICU admission rate',
        definition: 'Proportion of patients requiring ICU admission during index hospitalization',
        measurementTool: 'Hospital administrative data',
        measurementTiming: 'At hospital discharge',
      },
    ],
    exploratoryOutcomes: [
      {
        name: 'Alert fatigue metrics',
        definition: 'Proportion of alerts acknowledged and actioned by clinical staff',
        measurementTool: 'Alert system logs',
      },
      {
        name: 'Staff satisfaction',
        definition: 'Triage nurse satisfaction with screening tool',
        measurementTool: 'Post-implementation survey',
      },
    ],
    safetyOutcomes: [
      {
        name: 'Antibiotic adverse events',
        definition: 'Documented adverse reactions to antibiotics administered',
        monitoringPlan: 'Weekly safety monitoring via adverse event reporting system',
      },
    ],
    ...overrides,
  };
}

/**
 * Create mock procedure specification
 */
export function createMockProcedureSpec(
  overrides: Partial<ProcedureSpec> = {}
): ProcedureSpec {
  return {
    description:
      'Implementation of enhanced sepsis screening protocol integrated with electronic triage system',
    steps: [
      {
        stepNumber: 1,
        name: 'Triage Assessment',
        description: 'Patient presents to ED and undergoes standard triage assessment',
        responsible: 'Triage Nurse',
        timing: '5-10 minutes',
        materials: ['Triage documentation', 'Vital signs equipment'],
        qualityChecks: ['Complete vital signs recorded', 'Chief complaint documented'],
      },
      {
        stepNumber: 2,
        name: 'Automated Screening',
        description: 'EMR system automatically calculates qSOFA score from triage data',
        responsible: 'EMR System (Automated)',
        timing: 'Immediate (automated)',
        qualityChecks: ['Score calculation verified', 'Alert generated if threshold met'],
      },
      {
        stepNumber: 3,
        name: 'Alert Generation',
        description: 'If qSOFA >= 2, automated alert sent to treating clinician',
        responsible: 'EMR System (Automated)',
        timing: 'Within 1 minute of triage completion',
        qualityChecks: ['Alert received by clinician', 'Alert acknowledged'],
      },
      {
        stepNumber: 4,
        name: 'Clinical Assessment',
        description: 'Treating clinician reviews patient and confirms/rules out sepsis',
        responsible: 'Emergency Physician',
        timing: '15-30 minutes from alert',
        materials: ['Sepsis assessment checklist'],
        qualityChecks: ['Assessment documented', 'Decision recorded in EMR'],
      },
      {
        stepNumber: 5,
        name: 'Sepsis Bundle Initiation',
        description: 'If sepsis confirmed, initiate sepsis management bundle',
        responsible: 'Emergency Physician and Nursing Staff',
        timing: 'Within 60 minutes of sepsis confirmation',
        materials: ['Sepsis bundle checklist', 'IV access equipment', 'Antibiotics'],
        qualityChecks: ['Bundle elements documented', 'Timing recorded'],
      },
    ],
    interventionDetails:
      'The intervention consists of a modified qSOFA-based screening tool integrated into ' +
      'the existing FirstNet EMR system. The tool automatically calculates a sepsis risk ' +
      'score using triage vital signs and generates an interruptive alert when the score ' +
      'exceeds the threshold. The alert includes recommended actions and links to the ' +
      'sepsis management bundle order set.',
    fidelityMeasures: [
      'Weekly audit of screening tool activation and alert response rates',
      'Monthly review of documentation completeness',
      'Quarterly fidelity assessment by research team',
    ],
    protocolDeviationHandling:
      'Protocol deviations will be documented and reported to the DSMB. Major deviations ' +
      'affecting patient safety will be reported within 24 hours.',
    ...overrides,
  };
}

/**
 * Create mock analysis plan
 */
export function createMockAnalysisPlan(
  overrides: Partial<AnalysisPlan> = {}
): AnalysisPlan {
  return {
    primaryAnalysis: {
      method: 'Mixed-effects linear regression',
      description:
        'Primary analysis will use mixed-effects linear regression with time to antibiotics ' +
        'as the outcome, intervention status as the primary predictor, random effects for ' +
        'site and time period, and fixed effects for patient-level covariates.',
      software: 'R version 4.3 with lme4 package',
    },
    secondaryAnalyses: [
      {
        name: 'Bundle compliance analysis',
        method: 'Mixed-effects logistic regression',
        description:
          'Binary outcome of bundle compliance analyzed using mixed-effects logistic ' +
          'regression with similar structure to primary analysis.',
      },
      {
        name: 'Mortality analysis',
        method: 'Cox proportional hazards with frailty',
        description:
          'Time-to-event analysis of in-hospital mortality accounting for clustering.',
      },
      {
        name: 'Interrupted time series',
        method: 'Segmented regression',
        description:
          'Within-site analysis of trend changes at intervention implementation.',
      },
    ],
    sensitivityAnalyses: [
      {
        name: 'Per-protocol analysis',
        description:
          'Analysis restricted to patients where screening protocol was correctly applied.',
        rationale:
          'To assess efficacy under ideal implementation conditions.',
      },
      {
        name: 'Complete case analysis',
        description:
          'Analysis excluding patients with missing primary outcome data.',
        rationale:
          'To assess impact of missing data on conclusions.',
      },
      {
        name: 'Varying ICC assumption',
        description:
          'Sensitivity to ICC assumption tested with values from 0.01 to 0.10.',
        rationale:
          'ICC estimate may vary from assumed value.',
      },
    ],
    subgroupAnalyses: [
      {
        subgroup: 'Age >= 65 years vs < 65 years',
        justification:
          'Geriatric patients may have different presentation and response to intervention.',
      },
      {
        subgroup: 'By site',
        justification:
          'To assess consistency of effect across different ED settings.',
      },
    ],
    missingDataHandling:
      'Multiple imputation using chained equations (MICE) for missing covariate data. ' +
      'Primary outcome missingness expected to be <5%; patients with missing primary outcome ' +
      'will be included in sensitivity analysis using pattern mixture models.',
    interimAnalyses:
      'One interim analysis planned at 50% enrollment for DSMB review. O\'Brien-Fleming ' +
      'spending function used to preserve overall alpha.',
    multipleTesting:
      'No adjustment for secondary outcomes as these are considered exploratory. Primary ' +
      'analysis uses single primary outcome to preserve power.',
    ...overrides,
  };
}

/**
 * Create mock project timeline
 */
export function createMockProjectTimeline(
  overrides: Partial<ProjectTimeline> = {}
): ProjectTimeline {
  return {
    totalDuration: '24 months',
    phases: [
      {
        name: 'Setup Phase',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        milestones: ['Ethics approval', 'Site agreements', 'Staff training'],
        deliverables: ['Final protocol', 'Training materials', 'Data collection tools'],
      },
      {
        name: 'Recruitment Phase',
        startDate: '2026-10-01',
        endDate: '2028-03-31',
        milestones: [
          'First patient enrolled',
          '25% recruitment',
          '50% recruitment',
          '75% recruitment',
          'Recruitment complete',
        ],
        deliverables: ['Monthly recruitment reports', 'Interim analysis report'],
      },
      {
        name: 'Analysis Phase',
        startDate: '2028-04-01',
        endDate: '2028-05-31',
        milestones: ['Data cleaning complete', 'Primary analysis complete'],
        deliverables: ['Statistical analysis report', 'Final study database'],
      },
      {
        name: 'Dissemination Phase',
        startDate: '2028-06-01',
        endDate: '2028-06-30',
        milestones: ['Manuscript submitted', 'Final report submitted'],
        deliverables: ['Final report to funder', 'Manuscript for publication'],
      },
    ],
    milestones: [
      { name: 'Ethics approval', targetDate: '2026-08-15', description: 'HREC approval obtained' },
      { name: 'First patient enrolled', targetDate: '2026-10-15' },
      { name: 'Site 2 transition', targetDate: '2027-04-01' },
      { name: 'Site 3 transition', targetDate: '2027-10-01' },
      { name: 'Recruitment complete', targetDate: '2028-03-31' },
      { name: 'Final report', targetDate: '2028-06-30' },
    ],
    ...overrides,
  };
}

/**
 * Create mock site
 */
export function createMockSite(overrides: Partial<Site> = {}): Site {
  return {
    id: generateMockId('site'),
    name: 'Royal Brisbane Hospital Emergency Department',
    institution: 'Metro North Hospital and Health Service',
    department: 'Emergency Medicine',
    siteInvestigator: 'Dr. Jane Smith',
    expectedRecruitment: 400,
    considerations: 'Largest site with highest patient volume; will implement first',
    ...overrides,
  };
}

/**
 * Create mock data collection specification
 */
export function createMockDataCollectionSpec(
  overrides: Partial<DataCollectionSpec> = {}
): DataCollectionSpec {
  return {
    dataTypes: ['QUANTITATIVE'],
    variables: [
      {
        name: 'time_to_antibiotics',
        type: 'continuous',
        description: 'Minutes from ED arrival to first antibiotic dose',
        source: 'EMR extraction',
        timing: 'Real-time',
      },
      {
        name: 'qsofa_score',
        type: 'ordinal',
        description: 'qSOFA score at triage (0-3)',
        source: 'Automated calculation',
        timing: 'At triage',
      },
      {
        name: 'bundle_compliance',
        type: 'binary',
        description: 'Complete sepsis bundle within 3 hours',
        source: 'EMR extraction',
        timing: 'At 3 hours',
      },
      {
        name: 'mortality',
        type: 'binary',
        description: 'In-hospital mortality',
        source: 'Hospital records',
        timing: 'At discharge',
      },
    ],
    methods: ['EMR data extraction', 'Administrative data linkage', 'Direct observation'],
    instruments: ['REDCap data collection forms', 'EMR extraction scripts', 'Alert system logs'],
    includesIdentifiableData: true,
    qualityAssurance: [
      'Double data entry for 10% of records',
      'Range checks and logic validation',
      'Monthly data quality reports',
      'Source document verification for 5% of records',
    ],
    ...overrides,
  } as DataCollectionSpec;
}

/**
 * Create mock methodology stage data
 */
export function createMockMethodologyData(
  overrides: Partial<MethodologyStageData> = {}
): MethodologyStageData {
  return {
    studyDesign: createMockStudyDesign(),
    settingSites: [
      createMockSite(),
      createMockSite({
        id: generateMockId('site'),
        name: 'Prince Charles Hospital ED',
        expectedRecruitment: 400,
      }),
      createMockSite({
        id: generateMockId('site'),
        name: 'Redcliffe Hospital ED',
        expectedRecruitment: 400,
      }),
    ],
    participants: createMockParticipantSpec(),
    outcomes: createMockOutcomeSpec(),
    procedures: createMockProcedureSpec(),
    dataCollection: createMockDataCollectionSpec(),
    analysisPlan: createMockAnalysisPlan(),
    timeline: createMockProjectTimeline(),
    ...overrides,
  };
}

// ============================================================================
// Ethics Stage Mock Factory
// ============================================================================

/**
 * Create mock ethics pathway
 */
export function createMockEthicsPathway(
  overrides: Partial<EthicsPathway> = {}
): EthicsPathway {
  return {
    pathway: 'FULL_HREC_REVIEW',
    approvalBody: 'Metro North HREC',
    requiresHrec: true,
    requiresRgo: true,
    estimatedTimeline: '8-12 weeks',
    forms: [
      'HREC_APPLICATION',
      'RESEARCH_PROTOCOL',
      'PICF',
      'SITE_ASSESSMENT',
      'DATA_MANAGEMENT_PLAN',
      'INVESTIGATOR_CV',
    ],
    status: 'NOT_STARTED',
    ...overrides,
  } as EthicsPathway;
}

/**
 * Create mock risk assessment
 */
export function createMockRiskAssessment(
  overrides: Partial<RiskAssessment> = {}
): RiskAssessment {
  const factors: RiskFactor[] = [
    {
      category: 'Privacy',
      description: 'Collection of identifiable health information',
      riskLevel: 'LOW',
      mitigation:
        'Data stored on secure institutional servers with access controls. ' +
        'Re-identification minimized through coded study IDs.',
      residualRisk: 'NEGLIGIBLE',
    },
    {
      category: 'Physical',
      description: 'No additional physical interventions beyond standard care',
      riskLevel: 'NEGLIGIBLE',
      mitigation: 'Study evaluates change in care delivery, not additional interventions',
      residualRisk: 'NEGLIGIBLE',
    },
    {
      category: 'Psychological',
      description: 'Potential for staff alert fatigue',
      riskLevel: 'LOW',
      mitigation: 'Alert system designed to minimize false positives; monitoring in place',
      residualRisk: 'NEGLIGIBLE',
    },
  ];

  return {
    level: 'LOW',
    factors,
    overallJustification:
      'This study poses low risk as it involves evaluation of a quality improvement ' +
      'intervention within standard care pathways. No additional physical interventions ' +
      'are performed. Privacy risks are mitigated through standard data protection measures.',
    nationalStatementReference: 'Section 2.1.6 - Low risk research',
    benefitRiskBalance:
      'Potential benefits include improved sepsis detection and reduced mortality. ' +
      'Risks are minimal and outweighed by potential benefits to participants and ' +
      'future patients.',
    monitoringPlan:
      'Ongoing safety monitoring by DSMB with quarterly reviews. Any unexpected serious ' +
      'adverse events reported within 24 hours.',
    ...overrides,
  };
}

/**
 * Create mock consent specification
 */
export function createMockConsentSpec(
  overrides: Partial<ConsentSpec> = {}
): ConsentSpec {
  return {
    type: 'WAIVER',
    justification:
      'Waiver of consent requested under NHMRC National Statement 2.3.10 because: ' +
      '(1) involvement in research carries no more than low risk; ' +
      '(2) waiver is necessary for the research to be conducted; ' +
      '(3) benefits justify the risks; ' +
      '(4) impracticable to obtain consent in emergency setting; ' +
      '(5) no known objection by participants.',
    processDescription:
      'Waiver of consent for data collection. Opt-out notification posted in ED waiting areas. ' +
      'Patient notification letter sent post-discharge with option to withdraw data.',
    capacityAssessment:
      'Not applicable - waiver of consent sought. Patients with impaired capacity due to ' +
      'sepsis would not be able to provide informed consent in the acute setting.',
    proxyConsent: {
      required: false,
      relationship: 'Not applicable',
      process: 'Not applicable - waiver of consent sought',
    },
    withdrawalProcess:
      'Patients may withdraw their data at any time by contacting the research team. ' +
      'Contact details provided in opt-out notification and patient letter.',
    informationProvided: [
      'Study purpose and procedures',
      'Data being collected',
      'How to opt out',
      'Contact details for research team',
      'Contact details for HREC',
    ],
    documentVersion: 'Patient Notification Letter v1.0 dated 2026-01-27',
    languageRequirements: ['English', 'Simplified Chinese', 'Vietnamese', 'Arabic'],
    ...overrides,
  } as ConsentSpec;
}

/**
 * Create mock data governance specification
 */
export function createMockDataGovernanceSpec(
  overrides: Partial<DataGovernanceSpec> = {}
): DataGovernanceSpec {
  return {
    dataTypes: [
      'Demographics (age, sex)',
      'Clinical observations (vital signs, symptoms)',
      'Treatment data (medications, timing)',
      'Outcome data (mortality, LOS, ICU admission)',
    ],
    sensitivity: 'SENSITIVE',
    storageLocation: 'ON_PREMISES',
    storageDetails:
      'Data stored on Metro North Health secure research drive (REDCap database hosted ' +
      'on institutional servers). Physical servers located in Brisbane data center with ' +
      '24/7 security and access controls.',
    accessControls: [
      'Role-based access control in REDCap',
      'Multi-factor authentication required',
      'Audit logging enabled for all data access',
      'Access reviewed quarterly',
      'Data access agreement required for all team members',
    ],
    encryptionMethods:
      'AES-256 encryption at rest. TLS 1.3 encryption in transit. Backup data encrypted ' +
      'using institutional backup encryption.',
    retentionPeriod:
      '15 years post-publication per NHMRC guidelines and institutional requirements',
    disposalMethod:
      'Secure deletion using institutional certified data destruction service. ' +
      'Certificate of destruction obtained and retained.',
    transferRequirements:
      'Any data transfer uses secure file transfer protocol. No international data transfer ' +
      'without additional ethics approval and appropriate agreements.',
    breachResponsePlan:
      'Immediate notification to Metro North Privacy Officer and HREC within 24 hours of ' +
      'any suspected breach. Follow institutional data breach response procedure. ' +
      'Affected participants notified as required.',
    dataSharing: {
      planned: true,
      recipients: ['Collaborating research institutions (de-identified data only)'],
      agreements: ['Data sharing agreement required before any external sharing'],
    },
    ...overrides,
  } as DataGovernanceSpec;
}

/**
 * Create mock site requirement
 */
export function createMockSiteRequirement(
  overrides: Partial<SiteRequirement> = {}
): SiteRequirement {
  return {
    siteId: generateMockId('site'),
    siteName: 'Royal Brisbane Hospital',
    requiresLocalApproval: true,
    approvalBody: 'Metro North Research Governance Office',
    additionalForms: ['Site-Specific Assessment Form', 'Investigator Agreement'],
    siteSpecificConsiderations: [
      'Integration with FirstNet EMR system',
      'Coordination with existing sepsis committee',
      'Staff training requirements',
    ],
    status: 'NOT_STARTED',
    ...overrides,
  } as SiteRequirement;
}

/**
 * Create mock checklist item
 */
export function createMockChecklistItem(
  overrides: Partial<ChecklistItem> = {}
): ChecklistItem {
  return {
    id: generateMockId('checklist'),
    category: 'Ethics',
    requirement: 'HREC Application',
    description: 'Complete and submit HREC application form',
    completed: false,
    framework: 'NHMRC_NATIONAL_STATEMENT',
    ...overrides,
  } as ChecklistItem;
}

/**
 * Create mock ethics stage data
 */
export function createMockEthicsData(
  overrides: Partial<EthicsStageData> = {}
): EthicsStageData {
  return {
    ethicsPathway: createMockEthicsPathway(),
    riskAssessment: createMockRiskAssessment(),
    consentRequirements: createMockConsentSpec(),
    dataGovernance: createMockDataGovernanceSpec(),
    siteRequirements: [
      createMockSiteRequirement(),
      createMockSiteRequirement({
        siteId: generateMockId('site'),
        siteName: 'Prince Charles Hospital',
      }),
      createMockSiteRequirement({
        siteId: generateMockId('site'),
        siteName: 'Redcliffe Hospital',
      }),
    ],
    governanceChecklist: [
      createMockChecklistItem(),
      createMockChecklistItem({
        id: generateMockId('checklist'),
        requirement: 'Research Protocol',
        description: 'Complete research protocol document',
      }),
      createMockChecklistItem({
        id: generateMockId('checklist'),
        category: 'Data',
        requirement: 'Data Management Plan',
        description: 'Complete data management plan',
        framework: 'PRIVACY_ACT_1988',
      }),
    ],
    ...overrides,
  };
}

// ============================================================================
// Documents Stage Mock Factory
// ============================================================================

/**
 * Create mock document section
 */
export function createMockDocumentSection(
  overrides: Partial<DocumentSection> = {}
): DocumentSection {
  return {
    id: generateMockId('section'),
    type: 'BACKGROUND',
    title: 'Background and Rationale',
    content:
      'Sepsis is a life-threatening condition that arises when the body\'s response to ' +
      'infection causes organ dysfunction. Early recognition and treatment are critical ' +
      'for improving patient outcomes...',
    wordCount: 1450,
    wordLimit: 1500,
    order: 3,
    isRequired: true,
    sourceFields: ['research.evidenceSynthesis', 'research.gapAnalysis.summary'],
    ...overrides,
  } as DocumentSection;
}

/**
 * Create mock document validation result
 */
export function createMockDocumentValidationResult(
  overrides: Partial<DocumentValidationResult> = {}
): DocumentValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: ['Background section is approaching word limit (1450/1500 words)'],
    ...overrides,
  };
}

/**
 * Create mock generated document
 */
export function createMockGeneratedDocument(
  overrides: Partial<GeneratedDocument> = {}
): GeneratedDocument {
  return {
    id: generateMockId('doc'),
    type: 'RESEARCH_PROTOCOL',
    filename: 'sepsis-screening-protocol-v1.0.docx',
    path: '/outputs/2026/01/sepsis-screening-protocol-v1.0.docx',
    format: 'DOCX',
    status: 'DRAFT',
    version: '1.0',
    createdAt: getMockTimestamp(),
    updatedAt: getMockTimestamp(),
    createdBy: 'system',
    fileSize: 245678,
    checksum: 'sha256:abc123def456...',
    sections: [
      createMockDocumentSection({ type: 'TITLE_PAGE', title: 'Title Page', order: 1 }),
      createMockDocumentSection({ type: 'SYNOPSIS', title: 'Synopsis', order: 2 }),
      createMockDocumentSection({ type: 'BACKGROUND', title: 'Background', order: 3 }),
      createMockDocumentSection({ type: 'METHODS', title: 'Methods', order: 4 }),
    ] as DocumentSection[],
    validationResult: createMockDocumentValidationResult(),
    ...overrides,
  } as GeneratedDocument;
}

/**
 * Create mock document metadata
 */
export function createMockDocumentMetadata(
  overrides: Partial<DocumentMetadata> = {}
): DocumentMetadata {
  return {
    projectId: generateMockId('proj'),
    totalDocuments: 5,
    totalPages: 42,
    totalWordCount: 12500,
    generatedAt: getMockTimestamp(),
    generatedBy: 'system',
    submissionChecklist: [
      { item: 'Research Protocol', required: true, completed: true },
      { item: 'HREC Cover Letter', required: true, completed: true },
      { item: 'PICF', required: true, completed: false },
      { item: 'Site Assessment', required: true, completed: false },
      { item: 'Data Management Plan', required: true, completed: true },
    ],
    packageInfo: {
      packagePath: '/outputs/2026/01/submission-package.zip',
      packageSize: 1234567,
      packageChecksum: 'sha256:xyz789...',
    },
    ...overrides,
  };
}

/**
 * Create mock document content (for specific document types)
 */
export function createMockDocumentContent(
  documentType: string = 'RESEARCH_PROTOCOL'
): Record<string, string> {
  switch (documentType) {
    case 'RESEARCH_PROTOCOL':
      return {
        title: 'Improving Early Sepsis Recognition in Emergency Department Triage',
        synopsis:
          'This stepped-wedge cluster randomized trial evaluates the implementation of an ' +
          'enhanced qSOFA-based sepsis screening protocol across three emergency departments.',
        background:
          'Sepsis is a leading cause of mortality in emergency departments. Early recognition ' +
          'is critical but often delayed. This study addresses a significant gap in the ' +
          'Australian healthcare context.',
        aims:
          'Primary aim: Evaluate the effectiveness of enhanced sepsis screening on time to ' +
          'antibiotic administration. Secondary aims: Assess bundle compliance and mortality.',
        methods:
          'Stepped-wedge cluster randomized design across 3 EDs. 1200 patients over 18 months. ' +
          'Primary outcome: time to antibiotics. Analysis: mixed-effects regression.',
        ethics:
          'Low risk research. Waiver of consent sought under National Statement 2.3.10. ' +
          'Data stored securely with appropriate access controls.',
      };
    case 'EMF_APPLICATION':
      return {
        plainLanguageSummary:
          'This project will test a new way to identify patients with serious infections ' +
          '(sepsis) earlier when they arrive at emergency departments.',
        scientificAbstract:
          'Background: Sepsis recognition is often delayed. Aims: Evaluate enhanced screening. ' +
          'Methods: Stepped-wedge cluster RCT. Outcomes: Time to antibiotics, mortality.',
        emergencyRelevance:
          'Directly addresses emergency medicine practice. High impact potential for ' +
          'improving sepsis outcomes in Australian EDs.',
        backgroundRationale:
          'Current evidence supports screening tools but implementation in Australian ' +
          'context is lacking. This study addresses this critical gap.',
        designMethods:
          'Stepped-wedge cluster RCT across 3 Metro North EDs. 1200 patients. ' +
          'Mixed-effects analysis accounting for clustering.',
        innovationImpact:
          'First multicenter stepped-wedge trial of sepsis screening in Australian EDs. ' +
          'High potential for system-wide implementation if effective.',
        translationPlan:
          'Results will inform Metro North sepsis policy. Findings disseminated through ' +
          'ACEM and peer-reviewed publication.',
      };
    default:
      return {
        content: 'Default document content for testing purposes.',
      };
  }
}

// ============================================================================
// Complete Project Mock Factory
// ============================================================================

/**
 * Create a complete mock project with all stages
 */
export function createMockProject(overrides: Partial<Project> = {}): Project {
  const projectId = overrides.id || generateMockId('proj');
  const timestamp = getMockTimestamp();

  return {
    id: projectId,
    status: 'DRAFT' as ProjectStatus,
    createdAt: timestamp,
    updatedAt: timestamp,
    intake: createMockIntakeData(),
    classification: createMockClassification(),
    frameworks: createMockFrameworks(),
    auditLog: [
      {
        timestamp,
        action: 'PROJECT_CREATED',
        actor: 'system',
        details: { source: 'test' },
      } as AuditEntry,
    ],
    checkpoints: {
      intakeApproved: false,
      researchApproved: false,
      methodologyApproved: false,
      ethicsApproved: false,
      documentsApproved: false,
    } as Checkpoints,
    ...overrides,
  };
}

/**
 * Create a mock project at a specific stage
 */
export function createMockProjectAtStage(
  stage: 'INTAKE' | 'RESEARCH' | 'METHODOLOGY' | 'ETHICS' | 'DOCUMENTS'
): Project {
  const base = createMockProject();

  switch (stage) {
    case 'INTAKE':
      return {
        ...base,
        status: 'INTAKE_COMPLETE' as ProjectStatus,
        checkpoints: { ...base.checkpoints, intakeApproved: true },
      };
    case 'RESEARCH':
      return {
        ...base,
        status: 'RESEARCH_COMPLETE' as ProjectStatus,
        checkpoints: {
          ...base.checkpoints,
          intakeApproved: true,
          researchApproved: true,
        },
        research: createMockResearchData(),
      };
    case 'METHODOLOGY':
      return {
        ...base,
        status: 'METHODOLOGY_COMPLETE' as ProjectStatus,
        checkpoints: {
          ...base.checkpoints,
          intakeApproved: true,
          researchApproved: true,
          methodologyApproved: true,
        },
        research: createMockResearchData(),
        methodology: createMockMethodologyData(),
      };
    case 'ETHICS':
      return {
        ...base,
        status: 'ETHICS_COMPLETE' as ProjectStatus,
        checkpoints: {
          ...base.checkpoints,
          intakeApproved: true,
          researchApproved: true,
          methodologyApproved: true,
          ethicsApproved: true,
        },
        research: createMockResearchData(),
        methodology: createMockMethodologyData(),
        ethics: createMockEthicsData(),
      };
    case 'DOCUMENTS':
      return {
        ...base,
        status: 'DOCUMENTS_COMPLETE' as ProjectStatus,
        checkpoints: {
          intakeApproved: true,
          researchApproved: true,
          methodologyApproved: true,
          ethicsApproved: true,
          documentsApproved: true,
        },
        research: createMockResearchData(),
        methodology: createMockMethodologyData(),
        ethics: createMockEthicsData(),
        documents: {
          generated: [createMockGeneratedDocument()],
          pendingReview: ['PICF', 'SITE_ASSESSMENT'],
          metadata: createMockDocumentMetadata({ projectId: base.id }),
        },
      };
    default:
      return base;
  }
}

// ============================================================================
// Export All Mock Factories
// ============================================================================

export const mockFactories = {
  // ID and timestamp utilities
  generateMockId,
  getMockTimestamp,

  // Core project
  createMockProject,
  createMockProjectAtStage,
  createMockIntakeData,
  createMockClassification,
  createMockFrameworks,

  // Investigators
  createMockInvestigator,
  createMockCoInvestigators,

  // Research stage
  createMockResearchData,
  createMockSearchStrategy,
  createMockProcessedArticle,
  createMockGapAnalysis,
  createMockCitation,

  // Methodology stage
  createMockMethodologyData,
  createMockStudyDesign,
  createMockParticipantSpec,
  createMockOutcomeSpec,
  createMockProcedureSpec,
  createMockAnalysisPlan,
  createMockProjectTimeline,
  createMockSite,
  createMockDataCollectionSpec,

  // Ethics stage
  createMockEthicsData,
  createMockEthicsPathway,
  createMockRiskAssessment,
  createMockConsentSpec,
  createMockDataGovernanceSpec,
  createMockSiteRequirement,
  createMockChecklistItem,

  // Documents stage
  createMockGeneratedDocument,
  createMockDocumentMetadata,
  createMockDocumentSection,
  createMockDocumentValidationResult,
  createMockDocumentContent,
};
