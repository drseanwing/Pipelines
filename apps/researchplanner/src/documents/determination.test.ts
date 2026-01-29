/**
 * Document Determination Logic Tests
 * Phase 8 - Document Stage
 */

import { describe, it, expect } from 'vitest';
import {
  determineRequiredDocuments,
  validateDocumentPackage,
  getGenerationOrder,
  type DocumentType,
} from './determination.js';
import type { Project } from '../types/project.js';
import type { EthicsEvaluation } from '../types/ethics.js';
import type { Methodology } from '../types/methodology.js';
import { ProjectType } from '../types/project.js';
import { EthicsPathwayType, RiskLevel } from '../types/ethics.js';

describe('determineRequiredDocuments', () => {
  const baseProject: Project = {
    id: 'test-123',
    status: 'ETHICS_COMPLETE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    intake: {
      project_title: 'Test Project',
      project_type: ProjectType.RESEARCH,
      concept_description: 'Test description',
      clinical_problem: 'Test problem',
      target_population: 'Adults',
      setting: 'Hospital',
      principal_investigator: {
        name: 'Dr. Test',
        role: 'PI',
        title: 'Dr',
        institution: 'Test Hospital',
        department: 'Medicine',
        email: 'test@example.com',
        expertise: ['Research'],
      },
      co_investigators: [],
      intended_outcomes: 'Knowledge',
    },
    classification: {
      project_type: ProjectType.RESEARCH,
      confidence: 0.95,
      reasoning: 'Research',
      suggested_designs: ['COHORT'],
    },
    frameworks: {
      reporting_guideline: 'STROBE',
      ethics_framework: 'HREC',
      governance_requirements: [],
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

  const baseMethodology: Methodology = {
    study_design: {
      type: 'COHORT',
      reporting_guideline: 'STROBE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: true,
      justification: 'Appropriate for observational study',
    },
    setting_sites: [{ name: 'Test Hospital', type: 'PRIMARY', location: 'QLD', capacity: 'Adequate' }],
    participants: {
      inclusion_criteria: [{ description: 'Adults' }],
      exclusion_criteria: [],
      recruitment_strategy: {
        method: 'CONSECUTIVE_SAMPLING',
        sites: ['Test Hospital'],
        estimated_duration: '12 months',
        feasibility_justification: 'Adequate volume',
      },
      capacity_issues: false,
      vulnerable_population: false,
    },
    outcomes: {
      primary: {
        name: 'Test Outcome',
        definition: 'Primary outcome',
        measurement_tool: 'Assessment',
        measurement_timing: 'Baseline',
      },
      secondary: [],
    },
    procedures: {
      overview: 'Observational study',
      step_by_step_protocol: [],
      quality_assurance_measures: [],
    },
    data_collection: {
      data_types: ['CLINICAL'],
      includes_identifiable_data: true,
      instruments: [],
      collection_timepoints: ['Baseline'],
      missing_data_handling: 'Complete case',
    },
    analysis_plan: {
      primary_analysis_method: 'Regression',
      secondary_analysis_methods: [],
      missing_data_approach: 'Complete case',
      statistical_software: 'R',
      significance_level: 0.05,
    },
    timeline: {
      total_duration: '12 months',
      milestones: [],
    },
  };

  it('should return QI_MINIMAL package for QI projects', () => {
    const qiProject = {
      ...baseProject,
      classification: { ...baseProject.classification, project_type: ProjectType.QI },
    };
    const ethics: EthicsEvaluation = {
      ethics_pathway: {
        pathway: EthicsPathwayType.QI_REGISTRATION,
        approval_body: 'Unit Director',
        requires_hrec: false,
        requires_rgo: false,
        estimated_timeline: '1-2 weeks',
        forms: [],
        status: 'NOT_STARTED',
      },
      risk_assessment: { level: RiskLevel.NEGLIGIBLE, factors: [], overall_justification: '', national_statement_reference: '' },
      consent_requirements: { consent_type: 'NOT_REQUIRED', waiver_justified: false, capacity_assessment_required: false, third_party_consent_required: false, documentation_requirements: [], opt_out_available: false, consent_process_description: '' },
      data_governance: { data_types: [], storage_requirements: { location: '', encryption: false, access_controls: [], backup_strategy: '' }, retention_period: '', disposal_method: '', privacy_compliance: { privacy_act_1988: false, information_privacy_act_2009_qld: false, gdpr_applicable: false }, data_breach_response_plan: '' },
      site_requirements: [],
      governance_checklist: [],
    };

    const result = determineRequiredDocuments(qiProject, ethics, baseMethodology);

    expect(result.package_type).toBe('QI_MINIMAL');
    expect(result.required_documents.length).toBe(0);
  });

  it('should return LOW_RISK_STANDARD package for low-risk research', () => {
    const ethics: EthicsEvaluation = {
      ethics_pathway: {
        pathway: EthicsPathwayType.LOW_RISK_RESEARCH,
        approval_body: 'HREC',
        requires_hrec: true,
        requires_rgo: true,
        estimated_timeline: '8-12 weeks',
        forms: ['NHMRC Low Risk'],
        status: 'NOT_STARTED',
      },
      risk_assessment: { level: RiskLevel.LOW, factors: [], overall_justification: '', national_statement_reference: '' },
      consent_requirements: { consent_type: 'FULL_WRITTEN', waiver_justified: false, capacity_assessment_required: false, third_party_consent_required: false, documentation_requirements: ['PIS', 'Consent'], opt_out_available: false, consent_process_description: 'Standard' },
      data_governance: { data_types: ['RE_IDENTIFIABLE'], storage_requirements: { location: 'Server', encryption: true, access_controls: ['RBAC'], backup_strategy: 'Daily' }, retention_period: '7 years', disposal_method: 'Secure delete', privacy_compliance: { privacy_act_1988: true, information_privacy_act_2009_qld: true, gdpr_applicable: false }, data_breach_response_plan: 'Notify' },
      site_requirements: [{ site_name: 'Test', site_type: 'PRIMARY', governance_requirements: [], site_specific_approval_required: false, estimated_approval_timeline: '4 weeks', site_assessment_form_required: false, investigator_agreement_required: false }],
      governance_checklist: [],
    };

    const result = determineRequiredDocuments(baseProject, ethics, baseMethodology);

    expect(result.package_type).toBe('LOW_RISK_STANDARD');
    expect(result.required_documents.some(d => d.document_type === 'PROTOCOL')).toBe(true);
    expect(result.required_documents.some(d => d.document_type === 'DATA_MANAGEMENT_PLAN')).toBe(true);
  });

  it('should return FULL_HREC_COMPLETE package for full HREC review', () => {
    const ethics: EthicsEvaluation = {
      ethics_pathway: {
        pathway: EthicsPathwayType.FULL_HREC_REVIEW,
        approval_body: 'HREC',
        requires_hrec: true,
        requires_rgo: true,
        estimated_timeline: '12-16 weeks',
        forms: ['NHMRC Full'],
        status: 'NOT_STARTED',
      },
      risk_assessment: { level: RiskLevel.MODERATE, factors: [], overall_justification: '', national_statement_reference: '' },
      consent_requirements: { consent_type: 'FULL_WRITTEN', waiver_justified: false, capacity_assessment_required: false, third_party_consent_required: false, documentation_requirements: ['PIS', 'Consent'], opt_out_available: false, consent_process_description: 'Standard' },
      data_governance: { data_types: ['IDENTIFIABLE'], storage_requirements: { location: 'Server', encryption: true, access_controls: ['RBAC'], backup_strategy: 'Daily' }, retention_period: '15 years', disposal_method: 'Secure delete', privacy_compliance: { privacy_act_1988: true, information_privacy_act_2009_qld: true, gdpr_applicable: false }, data_breach_response_plan: 'Notify' },
      site_requirements: [{ site_name: 'Test', site_type: 'PRIMARY', governance_requirements: [], site_specific_approval_required: true, estimated_approval_timeline: '6 weeks', site_assessment_form_required: true, investigator_agreement_required: true }],
      governance_checklist: [],
    };

    const result = determineRequiredDocuments(baseProject, ethics, baseMethodology);

    expect(result.package_type).toBe('FULL_HREC_COMPLETE');
    expect(result.required_documents.some(d => d.document_type === 'COVER_LETTER')).toBe(true);
    expect(result.required_documents.some(d => d.document_type === 'INVESTIGATOR_CV')).toBe(true);
  });

  it('should adjust for consent waiver', () => {
    const ethics: EthicsEvaluation = {
      ethics_pathway: {
        pathway: EthicsPathwayType.LOW_RISK_RESEARCH,
        approval_body: 'HREC',
        requires_hrec: true,
        requires_rgo: true,
        estimated_timeline: '8-12 weeks',
        forms: [],
        status: 'NOT_STARTED',
      },
      risk_assessment: { level: RiskLevel.LOW, factors: [], overall_justification: '', national_statement_reference: '' },
      consent_requirements: { consent_type: 'WAIVER', waiver_justified: true, waiver_justification: 'Retrospective review', capacity_assessment_required: false, third_party_consent_required: false, documentation_requirements: [], opt_out_available: false, consent_process_description: 'Waiver approved' },
      data_governance: { data_types: ['DE_IDENTIFIED'], storage_requirements: { location: 'Server', encryption: true, access_controls: ['RBAC'], backup_strategy: 'Daily' }, retention_period: '7 years', disposal_method: 'Delete', privacy_compliance: { privacy_act_1988: true, information_privacy_act_2009_qld: true, gdpr_applicable: false }, data_breach_response_plan: 'Notify' },
      site_requirements: [],
      governance_checklist: [],
    };

    const result = determineRequiredDocuments(baseProject, ethics, baseMethodology);

    const consentReq = result.required_documents.find(d => d.document_type === 'CONSENT_FORM');
    expect(consentReq).toBeUndefined(); // Should be in optional now

    const consentOpt = result.optional_documents.find(d => d.document_type === 'CONSENT_FORM');
    expect(consentOpt).toBeDefined();
  });

  it('should require site assessment for multi-site studies', () => {
    const ethics: EthicsEvaluation = {
      ethics_pathway: {
        pathway: EthicsPathwayType.FULL_HREC_REVIEW,
        approval_body: 'HREC',
        requires_hrec: true,
        requires_rgo: true,
        estimated_timeline: '12-16 weeks',
        forms: [],
        status: 'NOT_STARTED',
      },
      risk_assessment: { level: RiskLevel.LOW, factors: [], overall_justification: '', national_statement_reference: '' },
      consent_requirements: { consent_type: 'FULL_WRITTEN', waiver_justified: false, capacity_assessment_required: false, third_party_consent_required: false, documentation_requirements: [], opt_out_available: false, consent_process_description: 'Standard' },
      data_governance: { data_types: ['RE_IDENTIFIABLE'], storage_requirements: { location: 'Server', encryption: true, access_controls: ['RBAC'], backup_strategy: 'Daily' }, retention_period: '7 years', disposal_method: 'Delete', privacy_compliance: { privacy_act_1988: true, information_privacy_act_2009_qld: true, gdpr_applicable: false }, data_breach_response_plan: 'Notify' },
      site_requirements: [
        { site_name: 'Site A', site_type: 'PRIMARY', governance_requirements: [], site_specific_approval_required: true, estimated_approval_timeline: '4 weeks', site_assessment_form_required: true, investigator_agreement_required: true },
        { site_name: 'Site B', site_type: 'SECONDARY', governance_requirements: [], site_specific_approval_required: true, estimated_approval_timeline: '4 weeks', site_assessment_form_required: true, investigator_agreement_required: true },
      ],
      governance_checklist: [],
    };

    const result = determineRequiredDocuments(baseProject, ethics, baseMethodology);

    const siteForm = result.required_documents.find(d => d.document_type === 'SITE_ASSESSMENT_FORM');
    expect(siteForm).toBeDefined();
    expect(siteForm?.required).toBe(true);
  });
});

describe('validateDocumentPackage', () => {
  it('should validate complete package', () => {
    const packageSpec = {
      package_type: 'LOW_RISK_STANDARD' as const,
      required_documents: [
        { document_type: 'PROTOCOL' as DocumentType, required: true, priority: 'ESSENTIAL' as const, rationale: 'Required' },
        { document_type: 'DATA_MANAGEMENT_PLAN' as DocumentType, required: true, priority: 'ESSENTIAL' as const, rationale: 'Required' },
      ],
      optional_documents: [],
      submission_order: ['PROTOCOL' as DocumentType, 'DATA_MANAGEMENT_PLAN' as DocumentType],
      estimated_pages: 30,
      notes: [],
    };

    const result = validateDocumentPackage(packageSpec, ['PROTOCOL', 'DATA_MANAGEMENT_PLAN']);

    expect(result.complete).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('should identify missing documents', () => {
    const packageSpec = {
      package_type: 'FULL_HREC_COMPLETE' as const,
      required_documents: [
        { document_type: 'PROTOCOL' as DocumentType, required: true, priority: 'ESSENTIAL' as const, rationale: 'Required' },
        { document_type: 'CONSENT_FORM' as DocumentType, required: true, priority: 'ESSENTIAL' as const, rationale: 'Required' },
        { document_type: 'DATA_MANAGEMENT_PLAN' as DocumentType, required: true, priority: 'ESSENTIAL' as const, rationale: 'Required' },
      ],
      optional_documents: [],
      submission_order: [],
      estimated_pages: 30,
      notes: [],
    };

    const result = validateDocumentPackage(packageSpec, ['PROTOCOL']);

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('CONSENT_FORM');
    expect(result.missing).toContain('DATA_MANAGEMENT_PLAN');
  });
});

describe('getGenerationOrder', () => {
  it('should respect dependencies', () => {
    const requirements = [
      { document_type: 'CONSENT_FORM' as DocumentType, required: true, priority: 'ESSENTIAL' as const, rationale: '', dependencies: ['PARTICIPANT_INFO_SHEET' as DocumentType] },
      { document_type: 'PARTICIPANT_INFO_SHEET' as DocumentType, required: true, priority: 'ESSENTIAL' as const, rationale: '', dependencies: ['PROTOCOL' as DocumentType] },
      { document_type: 'PROTOCOL' as DocumentType, required: true, priority: 'ESSENTIAL' as const, rationale: '' },
    ];

    const order = getGenerationOrder(requirements);

    expect(order.indexOf('PROTOCOL')).toBeLessThan(order.indexOf('PARTICIPANT_INFO_SHEET'));
    expect(order.indexOf('PARTICIPANT_INFO_SHEET')).toBeLessThan(order.indexOf('CONSENT_FORM'));
  });
});
