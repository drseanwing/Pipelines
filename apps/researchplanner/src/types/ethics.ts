/**
 * Ethics and governance types
 * Phase 2.9 - Ethics Type Definitions
 */

/**
 * Ethics approval pathway types
 * Spec reference: Section 3.5.3
 */
export enum EthicsPathwayType {
  QI_REGISTRATION = 'QI_REGISTRATION',
  LOW_RISK_RESEARCH = 'LOW_RISK_RESEARCH',
  FULL_HREC_REVIEW = 'FULL_HREC_REVIEW',
  HYBRID_REVIEW = 'HYBRID_REVIEW',
}

/**
 * Ethics pathway specification
 * Spec reference: Section 4.1.2
 */
export interface EthicsPathway {
  pathway: EthicsPathwayType;
  approval_body: string; // e.g., 'UNIT_DIRECTOR', 'MN_HREC', 'RMH_HREC'
  requires_hrec: boolean;
  requires_rgo: boolean; // Research Governance Office
  estimated_timeline: string; // e.g., '2-4 weeks', '8-16 weeks'
  forms: string[]; // Required forms/documents
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUIRED';
  reference_number?: string; // Ethics approval reference
}

/**
 * Risk level classification per National Statement
 * Spec reference: Section 4.1.2
 */
export enum RiskLevel {
  NEGLIGIBLE = 'NEGLIGIBLE',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  category: string; // e.g., 'PARTICIPANT_VULNERABILITY', 'INTERVENTION_RISK', 'DATA_SENSITIVITY'
  risk_level: RiskLevel;
  mitigation: string;
}

/**
 * Risk assessment
 * Spec reference: Section 4.1.2
 */
export interface RiskAssessment {
  level: RiskLevel;
  factors: RiskFactor[];
  overall_justification: string;
  national_statement_reference: string; // Citation to relevant section
}

/**
 * Consent specification
 * Spec reference: Section 3.5.2
 */
export interface ConsentSpec {
  consent_type: 'FULL_WRITTEN' | 'VERBAL' | 'WAIVER' | 'OPT_OUT' | 'THIRD_PARTY';
  waiver_justified: boolean;
  waiver_justification?: string;
  capacity_assessment_required: boolean;
  third_party_consent_required: boolean;
  documentation_requirements: string[];
  opt_out_available: boolean;
  consent_process_description: string;
}

/**
 * Data governance specification
 * Spec reference: Section 3.5.2
 */
export interface DataGovernanceSpec {
  data_types: ('IDENTIFIABLE' | 'RE_IDENTIFIABLE' | 'DE_IDENTIFIED' | 'ANONYMOUS')[];
  storage_requirements: {
    location: string; // e.g., 'Secure server', 'REDCap'
    encryption: boolean;
    access_controls: string[];
    backup_strategy: string;
  };
  retention_period: string; // e.g., '7 years post-publication'
  disposal_method: string;
  data_transfer_plan?: {
    recipient: string;
    method: string;
    security_measures: string[];
  };
  privacy_compliance: {
    privacy_act_1988: boolean;
    information_privacy_act_2009_qld: boolean;
    gdpr_applicable: boolean;
  };
  data_breach_response_plan: string;
}

/**
 * Site-specific requirements
 * Spec reference: Section 3.5.2
 */
export interface SiteRequirement {
  site_id?: string;
  site_name: string;
  site_type: 'PRIMARY' | 'SECONDARY';
  governance_requirements: string[];
  site_specific_approval_required: boolean;
  requires_local_approval?: boolean;
  estimated_approval_timeline: string;
  site_assessment_form_required: boolean;
  investigator_agreement_required: boolean;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'APPROVED' | 'PENDING';
}

/**
 * Governance checklist item
 * Spec reference: Section 3.5.2
 */
export interface ChecklistItem {
  item: string;
  requirement_source: string; // e.g., 'NHMRC_NATIONAL_STATEMENT', 'QH_RESEARCH_GOVERNANCE'
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  assigned_to?: string;
  due_date?: string; // ISO date
  notes?: string;
  dependencies?: string[]; // Other checklist items that must be completed first
}

/**
 * Complete ethics evaluation (Stage 4 output)
 * Spec reference: Section 3.5.4
 */
export interface EthicsEvaluation {
  ethics_pathway: EthicsPathway;
  risk_assessment: RiskAssessment;
  consent_requirements: ConsentSpec;
  data_governance: DataGovernanceSpec;
  site_requirements: SiteRequirement[];
  governance_checklist: ChecklistItem[];
  ethics_considerations_draft?: string; // Draft ethics section for protocol
  data_management_plan_draft?: string; // Draft DMP
}
