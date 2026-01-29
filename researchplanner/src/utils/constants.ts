/**
 * Constants
 * Phase 3.8 - Application-wide constants and configuration
 */

import type { ProjectStatus } from '../types/index.js';

/**
 * All valid project statuses
 */
export const PROJECT_STATUSES: ProjectStatus[] = [
  'DRAFT',
  'INTAKE_COMPLETE',
  'INTAKE_APPROVED',
  'RESEARCH_COMPLETE',
  'RESEARCH_APPROVED',
  'METHODOLOGY_COMPLETE',
  'METHODOLOGY_APPROVED',
  'ETHICS_COMPLETE',
  'ETHICS_APPROVED',
  'DOCUMENTS_COMPLETE',
  'DOCUMENTS_APPROVED',
  'SUBMITTED',
  'REVISION_REQUIRED',
  'COMPLETED',
  'ARCHIVED',
];

/**
 * Grant types with metadata
 */
export const GRANT_TYPES = {
  EMF_JUMPSTART: {
    name: 'EMF Jumpstart Grant',
    max_amount: 10000,
    duration_months: 12,
  },
  EMF_LEADING_EDGE: {
    name: 'EMF Leading Edge Grant',
    max_amount: 50000,
    duration_months: 24,
  },
  EMF_TRANSLATED: {
    name: 'EMF Translated Grant',
    max_amount: 100000,
    duration_months: 36,
  },
  INTERNAL: {
    name: 'Internal Funding',
    max_amount: null,
    duration_months: null,
  },
  OTHER: {
    name: 'Other External Funding',
    max_amount: null,
    duration_months: null,
  },
};

/**
 * Ethics pathway definitions
 * Spec reference: Section 3.5.3
 */
export const ETHICS_PATHWAYS = {
  QI_REGISTRATION: {
    name: 'QI Registration',
    approval_body: 'Metro North Clinical Governance',
    requires_hrec: false,
    requires_rgo: false,
    estimated_timeline_weeks: 2,
    forms: ['QI_REGISTRATION_FORM'],
  },
  LOW_RISK_RESEARCH: {
    name: 'Low Risk Research',
    approval_body: 'HREC via LNR pathway',
    requires_hrec: true,
    requires_rgo: false,
    estimated_timeline_weeks: 6,
    forms: ['HREA', 'LNR_APPLICATION', 'PROTOCOL', 'PICF'],
  },
  FULL_HREC_REVIEW: {
    name: 'Full HREC Review',
    approval_body: 'HREC',
    requires_hrec: true,
    requires_rgo: true,
    estimated_timeline_weeks: 12,
    forms: ['HREA', 'FULL_HREC_APPLICATION', 'PROTOCOL', 'PICF', 'INVESTIGATORS_BROCHURE'],
  },
  HYBRID_REVIEW: {
    name: 'Hybrid (QI + Research)',
    approval_body: 'HREC + Clinical Governance',
    requires_hrec: true,
    requires_rgo: true,
    estimated_timeline_weeks: 14,
    forms: ['HREA', 'FULL_HREC_APPLICATION', 'QI_REGISTRATION_FORM', 'PROTOCOL', 'PICF'],
  },
};

/**
 * Study Design Decision Matrix
 * Spec reference: Section 3.4.3 (lines 426-467)
 */
export const DESIGN_MATRIX = {
  QI: {
    default: 'PDSA_CYCLE',
    options: ['PDSA_CYCLE', 'IHI_MODEL', 'LEAN_SIX_SIGMA', 'PRE_POST'],
    reporting_guideline: 'SQUIRE',
  },
  RESEARCH: {
    interventional: {
      randomised: {
        default: 'RCT',
        options: ['RCT', 'CLUSTER_RCT', 'STEPPED_WEDGE'],
        reporting_guideline: 'CONSORT',
      },
      non_randomised: {
        default: 'QUASI_EXPERIMENTAL',
        options: ['PRE_POST', 'ITS', 'CONTROLLED_BA'],
        reporting_guideline: 'TREND',
      },
    },
    observational: {
      default: 'COHORT',
      options: ['COHORT', 'CASE_CONTROL', 'CROSS_SECTIONAL'],
      reporting_guideline: 'STROBE',
    },
    qualitative: {
      default: 'THEMATIC_ANALYSIS',
      options: ['THEMATIC', 'GROUNDED_THEORY', 'PHENOMENOLOGY'],
      reporting_guideline: 'SRQR',
    },
    mixed_methods: {
      default: 'CONVERGENT_PARALLEL',
      options: ['CONVERGENT', 'EXPLANATORY_SEQUENTIAL', 'EXPLORATORY'],
      reporting_guideline: 'GRAMMS',
    },
    systematic_review: {
      default: 'SYSTEMATIC_REVIEW',
      options: ['SYSTEMATIC_REVIEW', 'SCOPING_REVIEW', 'META_ANALYSIS'],
      reporting_guideline: 'PRISMA',
    },
  },
};

/**
 * Reporting guidelines mapping
 */
export const REPORTING_GUIDELINES = {
  SQUIRE: {
    name: 'SQUIRE 2.0',
    full_name: 'Standards for QUality Improvement Reporting Excellence',
    url: 'http://www.squire-statement.org/',
    applicable_to: ['QI'],
  },
  CONSORT: {
    name: 'CONSORT',
    full_name: 'Consolidated Standards of Reporting Trials',
    url: 'http://www.consort-statement.org/',
    applicable_to: ['RCT', 'CLUSTER_RCT', 'STEPPED_WEDGE'],
  },
  STROBE: {
    name: 'STROBE',
    full_name: 'Strengthening the Reporting of Observational Studies in Epidemiology',
    url: 'https://www.strobe-statement.org/',
    applicable_to: ['COHORT', 'CASE_CONTROL', 'CROSS_SECTIONAL'],
  },
  TREND: {
    name: 'TREND',
    full_name: 'Transparent Reporting of Evaluations with Nonrandomized Designs',
    url: 'https://www.cdc.gov/trendstatement/',
    applicable_to: ['QUASI_EXPERIMENTAL', 'PRE_POST', 'ITS'],
  },
  SRQR: {
    name: 'SRQR',
    full_name: 'Standards for Reporting Qualitative Research',
    url: 'https://www.equator-network.org/reporting-guidelines/srqr/',
    applicable_to: ['THEMATIC', 'GROUNDED_THEORY', 'PHENOMENOLOGY'],
  },
  GRAMMS: {
    name: 'GRAMMS',
    full_name: 'Good Reporting of A Mixed Methods Study',
    url: 'https://www.equator-network.org/reporting-guidelines/gramms/',
    applicable_to: ['MIXED_METHODS'],
  },
  PRISMA: {
    name: 'PRISMA',
    full_name: 'Preferred Reporting Items for Systematic Reviews and Meta-Analyses',
    url: 'http://www.prisma-statement.org/',
    applicable_to: ['SYSTEMATIC_REVIEW', 'META_ANALYSIS'],
  },
};

/**
 * Word limits for document sections
 */
export const WORD_LIMITS = {
  // Protocol sections
  protocol: {
    introduction: 250,
    aims_objectives: 300,
    methods: 2000,
    dissemination: 250,
  },
  // EMF grant application sections
  emf: {
    plain_language_summary: 250,
    scientific_abstract: 450,
    em_relevance: 100,
    background_rationale: 1500,
    aims_objectives: 300,
    design_methods: 2000,
    innovation_impact: 750,
    translation_plan: 400,
  },
  // PICF sections
  picf: {
    study_description: 500,
    what_you_will_do: 400,
    risks_benefits: 600,
  },
};

/**
 * Validation rules for documents
 */
export const VALIDATION_RULES = {
  protocol: {
    required_sections: [
      'title',
      'introduction',
      'aims_objectives',
      'methods',
      'participants',
      'outcomes',
      'analysis_plan',
      'ethics',
      'dissemination',
      'references',
    ],
    word_limits: WORD_LIMITS.protocol,
  },
  emf_application: {
    required_sections: [
      'A4_plain_language_summary',
      'A5_scientific_abstract',
      'A6_em_relevance',
      'B1_background_rationale',
      'B2_aims_objectives',
      'B3_design_methods',
      'B4_innovation_impact',
      'B5_translation_plan',
      'C1_ethics_status',
      'E_budget',
      'F_principal_investigator',
    ],
    word_limits: WORD_LIMITS.emf,
  },
  picf: {
    required_sections: [
      'title',
      'study_description',
      'what_you_will_do',
      'risks_benefits',
      'privacy_confidentiality',
      'voluntary_participation',
      'contact_information',
      'consent_signature',
    ],
    word_limits: WORD_LIMITS.picf,
  },
};
