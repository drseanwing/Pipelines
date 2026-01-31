/**
 * Protocol Document Generation Tests
 * Phase 8.3 - Protocol Document Generation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateProtocol,
  generateIntroduction,
  formatAimsObjectives,
  generateMethods,
  formatParticipants,
  formatOutcomes,
  formatEthics,
  generateDissemination,
} from './protocol.js';
import type {
  Project,
  ResearchResults,
  Methodology,
  EthicsEvaluation,
  ProjectType,
  GrantType,
  EthicsPathwayType,
  RiskLevel,
} from '../types/index.js';

// Mock project data for testing
const mockProject: Project = {
  id: 'test-project-123',
  status: 'DOCUMENTS_COMPLETE',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-20T00:00:00Z',
  intake: {
    project_title: 'Improving Post-Operative Pain Management in Emergency Medicine',
    project_type: 'RESEARCH' as ProjectType,
    concept_description:
      'A randomized controlled trial to evaluate the effectiveness of a multimodal pain management protocol in reducing post-operative pain scores in emergency department patients.',
    clinical_problem:
      'Post-operative pain management in emergency departments is often suboptimal, leading to patient discomfort and delayed discharge.',
    target_population: 'Adult patients (18+ years) presenting to the emergency department requiring surgical intervention',
    setting: 'Metro North Emergency Departments (Royal Brisbane, TPCH)',
    principal_investigator: {
      name: 'Dr. Sarah Johnson',
      role: 'PI',
      title: 'Emergency Medicine Consultant',
      institution: 'Royal Brisbane and Women\'s Hospital',
      department: 'Emergency Medicine',
      email: 'sarah.johnson@health.qld.gov.au',
      expertise: ['Pain Management', 'Emergency Medicine', 'Clinical Trials'],
    },
    co_investigators: [],
    intended_outcomes: 'Reduce post-operative pain scores by 30%, improve patient satisfaction, reduce ED length of stay',
    grant_target: 'EMF_JUMPSTART' as GrantType,
    timeline_constraint: {
      grant_deadline: '2024-03-31',
      submission_deadline: '2024-02-28',
    },
  },
  classification: {
    project_type: 'RESEARCH' as ProjectType,
    confidence: 0.95,
    reasoning: 'Randomized controlled trial with hypothesis testing',
    suggested_designs: ['RCT', 'CLUSTER_RCT'],
  },
  frameworks: {
    reporting_guideline: 'CONSORT',
    ethics_framework: 'NHMRC_NATIONAL_STATEMENT',
    governance_requirements: ['HREC_APPROVAL', 'SITE_SSA'],
  },
  audit_log: [],
  checkpoints: {
    intake_approved: true,
    research_approved: true,
    methodology_approved: true,
    ethics_approved: true,
    documents_approved: false,
  },
};

const mockResearch: ResearchResults = {
  search_strategy: {
    pubmed_query: 'post-operative pain management emergency',
    semantic_query: 'multimodal analgesia emergency surgery',
    mesh_terms: ['Pain, Postoperative', 'Emergency Service, Hospital', 'Analgesia'],
    keywords: ['pain management', 'emergency', 'post-operative'],
    date_range: {
      start: '2019-01-01',
      end: '2024-01-01',
    },
    search_date: '2024-01-15T10:00:00Z',
    results_count: 245,
  },
  primary_literature: [],
  secondary_literature: [],
  gap_analysis: {
    identified_gaps: [
      {
        gap_type: 'methodology',
        description: 'Limited RCT evidence in emergency settings',
        severity: 'moderate',
        relevance_to_project: 'Our RCT will address this gap',
      },
    ],
    opportunities: ['First Australian ED-based multimodal pain trial'],
    recommendations: ['Conduct rigorous RCT', 'Include patient-reported outcomes'],
    overall_summary: 'Strong evidence for multimodal analgesia but limited ED-specific data',
  },
  evidence_synthesis:
    'Multimodal pain management has demonstrated efficacy in reducing post-operative pain across various settings. However, emergency department-specific evidence remains limited. Existing studies show that combining pharmacological and non-pharmacological approaches can reduce opioid requirements and improve patient satisfaction. The current evidence gap necessitates high-quality trials in emergency medicine contexts.',
  citations: [
    {
      article_id: 'pmid-12345678',
      citation_number: 1,
      formatted_citation:
        'Smith J, Jones A. Multimodal analgesia in emergency settings. J Emerg Med. 2023;45(2):123-135.',
      citation_style: 'VANCOUVER',
    },
  ],
};

const mockMethodology: Methodology = {
  study_design: {
    type: 'RCT',
    subtype: 'PARALLEL_GROUP',
    reporting_guideline: 'CONSORT',
    is_randomised: true,
    is_blinded: true,
    blinding_type: 'DOUBLE',
    control_type: 'USUAL_CARE',
    requires_sample_size: true,
    justification: 'RCT is gold standard for evaluating effectiveness of interventions',
  },
  setting_sites: [
    {
      name: 'Royal Brisbane and Women\'s Hospital',
      type: 'PRIMARY',
      location: 'Herston, Brisbane',
      capacity: '500 ED presentations per day',
    },
  ],
  participants: {
    inclusion_criteria: [
      {
        description: 'Age 18 years or older',
        rationale: 'Adult population only',
      },
      {
        description: 'Presenting to ED requiring surgical intervention',
      },
      {
        description: 'Able to provide informed consent',
      },
    ],
    exclusion_criteria: [
      {
        description: 'Allergy to study medications',
      },
      {
        description: 'Pregnancy or breastfeeding',
      },
      {
        description: 'Cognitive impairment preventing consent',
      },
    ],
    sample_size: {
      target: 200,
      calculation_method: 'POWER_ANALYSIS',
      assumptions: {
        effect_size: 0.5,
        power: 0.8,
        alpha: 0.05,
        attrition_rate: 0.15,
      },
      justification: 'Powered to detect 30% reduction in pain scores',
    },
    recruitment_strategy: {
      method: 'CONSECUTIVE_SAMPLING',
      sites: ['RBWH ED'],
      estimated_duration: '12 months',
      feasibility_justification: 'RBWH ED sees 500+ presentations daily',
    },
    capacity_issues: false,
    vulnerable_population: false,
  },
  outcomes: {
    primary: {
      name: 'Pain Score Reduction',
      definition: 'Change in numerical rating scale (NRS) pain score from baseline to 2 hours post-intervention',
      measurement_tool: 'Numerical Rating Scale (NRS 0-10)',
      measurement_timing: 'Baseline, 30 min, 1 hour, 2 hours',
      clinically_meaningful_difference: 2.0,
    },
    secondary: [
      {
        name: 'Patient Satisfaction',
        definition: 'Patient satisfaction with pain management',
        measurement_tool: 'Likert scale (1-5)',
        measurement_timing: 'At discharge',
      },
      {
        name: 'ED Length of Stay',
        definition: 'Time from ED arrival to discharge',
        measurement_tool: 'Electronic medical record timestamps',
        measurement_timing: 'At discharge',
      },
    ],
  },
  procedures: {
    overview: 'Patients will be randomized to multimodal protocol or usual care',
    intervention_description: 'Multimodal protocol including paracetamol, ibuprofen, and opioid sparing approach',
    control_description: 'Usual care per treating physician discretion',
    step_by_step_protocol: [
      {
        step_number: 1,
        description: 'Screen eligible patients presenting to ED',
        responsible_party: 'Research nurse',
      },
      {
        step_number: 2,
        description: 'Obtain informed consent',
        responsible_party: 'Research nurse',
      },
      {
        step_number: 3,
        description: 'Randomize patient to intervention or control',
        responsible_party: 'Research coordinator',
      },
      {
        step_number: 4,
        description: 'Administer allocated treatment',
        responsible_party: 'ED nurse',
      },
      {
        step_number: 5,
        description: 'Collect outcome measures',
        responsible_party: 'Research nurse',
      },
    ],
    quality_assurance_measures: ['Protocol adherence monitoring', 'Data quality checks'],
  },
  data_collection: {
    data_types: ['CLINICAL', 'SURVEY'],
    includes_identifiable_data: true,
    methods: ['survey', 'chart_review'],
    instruments: [
      {
        name: 'Numerical Rating Scale',
        type: 'Pain assessment',
        validated: true,
        source: 'Standard validated tool',
      },
    ],
    collection_timepoints: ['Baseline', '30 min', '1 hour', '2 hours', 'Discharge'],
    missing_data_handling: 'Multiple imputation for missing outcome data',
  },
  analysis_plan: {
    primary_analysis_method: 'Linear mixed model',
    secondary_analysis_methods: ['Chi-square test', 'Mann-Whitney U test'],
    missing_data_approach: 'Multiple imputation',
    statistical_software: 'R 4.3',
    significance_level: 0.05,
  },
  timeline: {
    total_duration: '18 months',
    milestones: [
      {
        name: 'Ethics approval',
        target_date: '2024-03-01',
        deliverable: 'HREC approval letter',
      },
      {
        name: 'Recruitment completion',
        target_date: '2025-03-01',
        deliverable: '200 participants enrolled',
      },
      {
        name: 'Data analysis',
        target_date: '2025-06-01',
        deliverable: 'Analysis complete',
      },
    ],
    recruitment_period: '12 months',
    data_collection_period: '12 months',
    analysis_period: '3 months',
  },
};

const mockEthics: EthicsEvaluation = {
  ethics_pathway: {
    pathway: 'LOW_RISK_RESEARCH' as EthicsPathwayType,
    approval_body: 'MN_HREC',
    requires_hrec: true,
    requires_rgo: true,
    estimated_timeline: '4-6 weeks',
    forms: ['LNR_APPLICATION', 'RESEARCH_PROTOCOL', 'PICF'],
    status: 'NOT_STARTED',
  },
  risk_assessment: {
    level: 'LOW' as RiskLevel,
    factors: [
      {
        category: 'INTERVENTION_RISK',
        risk_level: 'LOW' as RiskLevel,
        mitigation: 'Standard medications with known safety profiles',
      },
      {
        category: 'DATA_SENSITIVITY',
        risk_level: 'LOW' as RiskLevel,
        mitigation: 'De-identified data storage with access controls',
      },
    ],
    overall_justification: 'Low risk study using standard pain medications in routine care context',
    national_statement_reference: 'National Statement 2.1.6',
  },
  consent_requirements: {
    consent_type: 'FULL_WRITTEN',
    waiver_justified: false,
    capacity_assessment_required: false,
    third_party_consent_required: false,
    documentation_requirements: ['Written PICF', 'Signed consent form'],
    opt_out_available: false,
    consent_process_description: 'Written informed consent obtained by trained research nurse prior to enrolment',
  },
  data_governance: {
    data_types: ['RE_IDENTIFIABLE'],
    storage_requirements: {
      location: 'Secure REDCap server',
      encryption: true,
      access_controls: ['Password protected', 'Role-based access'],
      backup_strategy: 'Daily automated backups',
    },
    retention_period: '7 years post-publication',
    disposal_method: 'Secure deletion per NHMRC guidelines',
    privacy_compliance: {
      privacy_act_1988: true,
      information_privacy_act_2009_qld: true,
      gdpr_applicable: false,
    },
    data_breach_response_plan: 'Immediate notification to ethics committee and participants per institutional policy',
  },
  site_requirements: [
    {
      site_name: 'Royal Brisbane and Women\'s Hospital',
      site_type: 'PRIMARY',
      governance_requirements: ['SSA', 'Site approval'],
      site_specific_approval_required: true,
      estimated_approval_timeline: '2-4 weeks',
      site_assessment_form_required: true,
      investigator_agreement_required: true,
    },
  ],
  governance_checklist: [
    {
      item: 'HREC application submitted',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
    },
    {
      item: 'Site-specific assessment completed',
      requirement_source: 'QH_RESEARCH_GOVERNANCE',
      status: 'NOT_STARTED',
    },
  ],
};

describe('Protocol Document Generation', () => {
  it('should format aims and objectives correctly', () => {
    const paragraphs = formatAimsObjectives(mockMethodology);
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it('should format participants section correctly', () => {
    const paragraphs = formatParticipants(mockMethodology.participants);
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it('should format outcomes section correctly', () => {
    const paragraphs = formatOutcomes(mockMethodology.outcomes);
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it('should format ethics section correctly', () => {
    const paragraphs = formatEthics(mockEthics);
    expect(paragraphs.length).toBeGreaterThan(0);
  });
});
