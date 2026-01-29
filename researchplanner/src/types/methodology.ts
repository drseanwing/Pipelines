/**
 * Methodology stage types
 * Phase 2.8 - Methodology Type Definitions
 */

/**
 * Study design specification
 * Spec reference: Section 4.1.2
 */
export interface StudyDesign {
  type: string; // e.g., 'RCT', 'COHORT', 'PDSA_CYCLE', 'QUASI_EXPERIMENTAL'
  subtype?: string; // e.g., 'CLUSTER_RCT', 'PROSPECTIVE_COHORT'
  reporting_guideline: string; // e.g., 'CONSORT', 'STROBE', 'SQUIRE'
  is_randomised: boolean;
  is_blinded: boolean;
  blinding_type?: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'OPEN_LABEL';
  control_type?: 'PLACEBO' | 'ACTIVE' | 'USUAL_CARE' | 'HISTORICAL' | 'NONE';
  requires_sample_size: boolean;
  justification: string;
}

/**
 * Study site specification
 * Spec reference: Section 3.4.1
 */
export interface Site {
  name: string;
  type: 'PRIMARY' | 'SECONDARY' | 'COLLABORATING';
  location: string;
  capacity: string; // Description of site capacity
  contact_person?: string;
}

/**
 * Inclusion/exclusion criterion
 */
export interface Criterion {
  description: string;
  rationale?: string;
}

/**
 * Sample size calculation
 * Spec reference: Section 4.1.2
 */
export interface SampleSize {
  target: number;
  calculation_method: string; // e.g., 'POWER_ANALYSIS', 'PRACTICAL_CONVENIENCE'
  assumptions: {
    effect_size: number;
    power: number; // typically 0.80
    alpha: number; // typically 0.05
    attrition_rate: number; // expected dropout rate
  };
  justification: string;
}

/**
 * Recruitment strategy
 * Spec reference: Section 4.1.2
 */
export interface RecruitmentStrategy {
  method: string; // e.g., 'CONSECUTIVE_SAMPLING', 'PURPOSIVE', 'RANDOM'
  sites: string[];
  estimated_duration: string; // e.g., '6 months'
  feasibility_justification: string;
}

/**
 * Participant specification
 * Spec reference: Section 4.1.2
 */
export interface ParticipantSpec {
  inclusion_criteria: Criterion[];
  exclusion_criteria: Criterion[];
  sample_size?: SampleSize;
  recruitment_strategy: RecruitmentStrategy;
  capacity_issues: boolean;
  vulnerable_population: boolean;
}

/**
 * Primary outcome specification
 * Spec reference: Section 4.1.2
 */
export interface PrimaryOutcome {
  name: string;
  definition: string;
  measurement_tool: string; // e.g., validated scale, clinical measure
  measurement_timing: string; // e.g., 'Baseline, 3 months, 6 months'
  clinically_meaningful_difference?: number;
}

/**
 * Secondary outcome specification
 */
export interface SecondaryOutcome {
  name: string;
  definition: string;
  measurement_tool: string;
  measurement_timing: string;
}

/**
 * Outcomes specification
 * Spec reference: Section 4.1.2
 */
export interface OutcomeSpec {
  primary: PrimaryOutcome;
  secondary: SecondaryOutcome[];
}

/**
 * Study procedures specification
 * Spec reference: Section 3.4.2
 */
export interface ProcedureSpec {
  overview: string;
  intervention_description?: string; // If interventional study
  control_description?: string;
  step_by_step_protocol: {
    step_number: number;
    description: string;
    duration?: string;
    responsible_party?: string;
  }[];
  quality_assurance_measures: string[];
}

/**
 * Data collection specification
 * Spec reference: Section 3.4.2
 */
export interface DataCollectionSpec {
  data_types: ('CLINICAL' | 'ADMINISTRATIVE' | 'SURVEY' | 'QUALITATIVE' | 'BIOLOGICAL')[];
  includes_identifiable_data: boolean;
  instruments: {
    name: string;
    type: string;
    validated: boolean;
    source?: string;
  }[];
  collection_timepoints: string[];
  missing_data_handling: string;
}

/**
 * Statistical analysis plan
 * Spec reference: Section 3.4.2
 */
export interface AnalysisPlan {
  primary_analysis_method: string; // e.g., 't-test', 'chi-square', 'regression'
  secondary_analysis_methods: string[];
  sensitivity_analyses?: string[];
  subgroup_analyses?: string[];
  missing_data_approach: string; // e.g., 'complete case', 'multiple imputation'
  statistical_software: string; // e.g., 'R', 'SPSS', 'Stata'
  significance_level: number; // typically 0.05
}

/**
 * Project timeline
 * Spec reference: Section 3.4.2
 */
export interface ProjectTimeline {
  total_duration: string; // e.g., '18 months'
  milestones: {
    name: string;
    target_date: string; // ISO date
    deliverable: string;
    responsible_party?: string;
  }[];
  recruitment_period?: string;
  data_collection_period?: string;
  analysis_period?: string;
  grant_alignment?: {
    grant_deadline: string;
    submission_target: string;
  };
}

/**
 * Complete methodology specification (Stage 3 output)
 * Spec reference: Section 3.4.4
 */
export interface Methodology {
  study_design: StudyDesign;
  setting_sites: Site[];
  participants: ParticipantSpec;
  outcomes: OutcomeSpec;
  procedures: ProcedureSpec;
  data_collection: DataCollectionSpec;
  analysis_plan: AnalysisPlan;
  timeline: ProjectTimeline;
  methodology_summary?: string; // Markdown overview
  study_design_rationale?: string; // Markdown justification
  methods_draft?: string; // Draft methods section for protocol
}
