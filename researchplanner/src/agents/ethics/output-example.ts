/**
 * Ethics Agent - Output Assembly Example
 * Phase 7.8 - Demonstrates complete output generation workflow
 */

import {
  formatEthicsPathway,
  formatRiskAssessment,
  formatConsentSpec,
  formatGovernanceChecklist,
  assembleEthicsOutputs,
} from './output.js';
import type { EthicsEvaluation } from '../../types/ethics.ts';
import { EthicsPathwayType, RiskLevel } from '../../types/ethics.ts';

/**
 * Example: Complete ethics evaluation output generation
 */
export async function runOutputExample(): Promise<void> {
  console.log('=== Ethics Output Assembly Example ===\n');

  // Example ethics evaluation
  const ethicsEvaluation: EthicsEvaluation = {
    ethics_pathway: {
      pathway: EthicsPathwayType.LOW_RISK_RESEARCH,
      approval_body: 'MN_HREC',
      requires_hrec: true,
      requires_rgo: true,
      estimated_timeline: '8-12 weeks',
      forms: [
        'NHMRC Low Risk Application',
        'Site Specific Assessment Form',
        'Investigator CV',
      ],
      status: 'NOT_STARTED',
    },
    risk_assessment: {
      level: RiskLevel.LOW,
      factors: [
        {
          category: 'PARTICIPANT_VULNERABILITY',
          risk_level: RiskLevel.LOW,
          mitigation:
            'Patients with cognitive impairment will undergo capacity assessment',
        },
        {
          category: 'INTERVENTION_RISK',
          risk_level: RiskLevel.NEGLIGIBLE,
          mitigation: 'No intervention - data collection from medical records only',
        },
        {
          category: 'DATA_SENSITIVITY',
          risk_level: RiskLevel.LOW,
          mitigation: 'Data will be de-identified and stored on secure servers',
        },
      ],
      overall_justification:
        'This study presents low risk to participants as it involves retrospective review of medical records with no intervention. Identified risks relate to data sensitivity and participant vulnerability, both mitigated through appropriate governance measures.',
      national_statement_reference:
        'National Statement 2.1.6 (Low Risk Research)',
    },
    consent_requirements: {
      consent_type: 'WAIVER',
      waiver_justified: true,
      waiver_justification:
        'Retrospective medical record review. Impracticable to obtain consent from all participants. Research involves low risk and could not be conducted without waiver. Waiver justified under National Statement 2.3.10.',
      capacity_assessment_required: false,
      third_party_consent_required: false,
      documentation_requirements: [
        'Waiver Justification Statement',
        'Data Handling Protocol',
        'Privacy Impact Assessment',
      ],
      opt_out_available: true,
      consent_process_description:
        'Consent waiver approved under National Statement 2.3.10. Participants will be notified via clinic signage of ongoing research and opt-out mechanism. Opt-out requests will result in immediate data exclusion.',
    },
    data_governance: {
      data_types: ['RE_IDENTIFIABLE', 'DE_IDENTIFIED'],
      storage_requirements: {
        location: 'Metro North Research Data Repository (secure server)',
        encryption: true,
        access_controls: [
          'Role-based access control (RBAC)',
          'Multi-factor authentication',
          'Audit logging',
          'VPN access only',
        ],
        backup_strategy: 'Daily incremental backup, weekly full backup to offsite location',
      },
      retention_period: '7 years post-publication',
      disposal_method: 'Secure deletion with certificate of destruction',
      data_transfer_plan: {
        recipient: 'University of Queensland',
        method: 'Secure File Transfer Protocol (SFTP)',
        security_measures: [
          'End-to-end encryption',
          'Data transfer agreement',
          'Access logs',
        ],
      },
      privacy_compliance: {
        privacy_act_1988: true,
        information_privacy_act_2009_qld: true,
        gdpr_applicable: false,
      },
      data_breach_response_plan:
        'Immediate notification to Metro North Research Governance Officer, Privacy Officer, and affected participants. Incident investigation within 24 hours. Mitigation measures implemented immediately.',
    },
    site_requirements: [
      {
        site_name: 'Royal Brisbane and Women\'s Hospital',
        site_type: 'PRIMARY',
        governance_requirements: [
          'Metro North HREC approval',
          'Site Specific Assessment',
          'Research Governance Office approval',
        ],
        site_specific_approval_required: true,
        estimated_approval_timeline: '4-6 weeks post-HREC',
        site_assessment_form_required: true,
        investigator_agreement_required: true,
      },
    ],
    governance_checklist: [
      {
        item: 'Complete NHMRC Low Risk Application',
        requirement_source: 'NHMRC_NATIONAL_STATEMENT',
        status: 'NOT_STARTED',
        assigned_to: 'Principal Investigator',
        due_date: '2024-02-15',
      },
      {
        item: 'Obtain Hospital Executive approval for data access',
        requirement_source: 'QH_RESEARCH_GOVERNANCE',
        status: 'NOT_STARTED',
        assigned_to: 'Research Manager',
        due_date: '2024-02-20',
      },
      {
        item: 'Complete Site Specific Assessment Form',
        requirement_source: 'MN_CLINICAL_GOVERNANCE_POLICY',
        status: 'NOT_STARTED',
        dependencies: ['Complete NHMRC Low Risk Application'],
      },
      {
        item: 'Submit to Metro North HREC',
        requirement_source: 'NHMRC_NATIONAL_STATEMENT',
        status: 'NOT_STARTED',
        dependencies: [
          'Complete NHMRC Low Risk Application',
          'Complete Site Specific Assessment Form',
        ],
      },
      {
        item: 'Conduct Privacy Impact Assessment',
        requirement_source: 'PRIVACY_ACT_1988',
        status: 'NOT_STARTED',
        assigned_to: 'Data Manager',
      },
      {
        item: 'Establish data sharing agreement with UQ',
        requirement_source: 'INFORMATION_PRIVACY_ACT_2009_QLD',
        status: 'NOT_STARTED',
        dependencies: ['Obtain Hospital Executive approval for data access'],
      },
    ],
  };

  // Project context for DMP generation
  const projectContext = {
    title: 'Emergency Department Wait Time Analysis',
    investigators: ['Dr Jane Smith', 'Dr John Doe'],
    start_date: '2024-03-01',
    end_date: '2024-12-31',
  };

  console.log('1. Formatting Ethics Pathway...\n');
  const pathwayJson = formatEthicsPathway(ethicsEvaluation.ethics_pathway);
  console.log(pathwayJson);
  console.log('\n---\n');

  console.log('2. Formatting Risk Assessment...\n');
  const riskMd = formatRiskAssessment(ethicsEvaluation.risk_assessment);
  console.log(riskMd);
  console.log('\n---\n');

  console.log('3. Formatting Consent Specification...\n');
  const consentJson = formatConsentSpec(ethicsEvaluation.consent_requirements);
  console.log(consentJson);
  console.log('\n---\n');

  console.log('4. Formatting Governance Checklist...\n');
  const checklistJson = formatGovernanceChecklist(
    ethicsEvaluation.governance_checklist
  );
  console.log(checklistJson);
  console.log('\n---\n');

  console.log('5. Assembling Complete Output Package...\n');
  console.log('(This will call LLM to generate DMP and ethics considerations)\n');

  // Only run LLM generation if API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const outputs = await assembleEthicsOutputs(ethicsEvaluation, projectContext);

      console.log('=== DATA MANAGEMENT PLAN ===\n');
      console.log(outputs.data_management_plan_md);
      console.log('\n---\n');

      console.log('=== ETHICS CONSIDERATIONS DRAFT ===\n');
      console.log(outputs.ethics_considerations_md);
      console.log('\n---\n');

      console.log('✅ Complete output package generated successfully!');
    } catch (error) {
      console.error('Error generating LLM outputs:', error);
      console.log('(Continuing with non-LLM outputs only)');
    }
  } else {
    console.log('⚠️  ANTHROPIC_API_KEY not set - skipping LLM generation');
    console.log('Set ANTHROPIC_API_KEY to generate DMP and ethics considerations');
  }

  console.log('\n=== Output Assembly Complete ===');
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOutputExample().catch(console.error);
}
