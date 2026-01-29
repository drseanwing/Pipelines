/**
 * Ethics Agent - Output Assembly Tests
 * Phase 7.8 - Test output formatting functions
 */

import { describe, it, expect } from 'vitest';
import {
  formatEthicsPathway,
  formatRiskAssessment,
  formatConsentSpec,
  formatGovernanceChecklist,
} from './output.js';
import type {
  EthicsPathway,
  RiskAssessment,
  ConsentSpec,
  ChecklistItem,
} from '../../types/ethics.ts';
import { EthicsPathwayType, RiskLevel } from '../../types/ethics.ts';

describe('formatEthicsPathway', () => {
  it('should format ethics pathway with annotations', () => {
    const pathway: EthicsPathway = {
      pathway: EthicsPathwayType.LOW_RISK_RESEARCH,
      approval_body: 'MN_HREC',
      requires_hrec: true,
      requires_rgo: true,
      estimated_timeline: '8-12 weeks',
      forms: ['NHMRC Low Risk Form', 'Site Assessment Form'],
      status: 'NOT_STARTED',
    };

    const result = formatEthicsPathway(pathway);
    expect(result).toContain('"pathway": "LOW_RISK_RESEARCH"');
    expect(result).toContain('"approval_body": "MN_HREC"');
    expect(result).toContain('_annotations');
    expect(result).toContain('NHMRC Low Risk Form');
  });

  it('should include reference number if provided', () => {
    const pathway: EthicsPathway = {
      pathway: EthicsPathwayType.FULL_HREC_REVIEW,
      approval_body: 'MN_HREC',
      requires_hrec: true,
      requires_rgo: true,
      estimated_timeline: '12-16 weeks',
      forms: ['NHMRC Full Application'],
      status: 'APPROVED',
      reference_number: 'HREC/2024/MN/12345',
    };

    const result = formatEthicsPathway(pathway);
    expect(result).toContain('"reference_number": "HREC/2024/MN/12345"');
  });
});

describe('formatRiskAssessment', () => {
  it('should format risk assessment with markdown table', () => {
    const risk: RiskAssessment = {
      level: RiskLevel.LOW,
      factors: [
        {
          category: 'PARTICIPANT_VULNERABILITY',
          risk_level: RiskLevel.LOW,
          mitigation: 'Capacity assessment for patients with cognitive impairment',
        },
        {
          category: 'INTERVENTION_RISK',
          risk_level: RiskLevel.NEGLIGIBLE,
          mitigation: 'Data collection only, no intervention',
        },
      ],
      overall_justification: 'Research involves minimal risk to participants',
      national_statement_reference: 'National Statement 2.1.6',
    };

    const result = formatRiskAssessment(risk);
    expect(result).toContain('# Risk Assessment');
    expect(result).toContain('## Overall Risk Level');
    expect(result).toContain('LOW');
    expect(result).toContain('## Risk Matrix');
    expect(result).toContain('| Category | Risk Level | Mitigation |');
    expect(result).toContain('PARTICIPANT_VULNERABILITY');
    expect(result).toContain('INTERVENTION_RISK');
    expect(result).toContain('## Risk Legend');
  });

  it('should include correct emoji for each risk level', () => {
    const risk: RiskAssessment = {
      level: RiskLevel.MODERATE,
      factors: [
        {
          category: 'DATA_SENSITIVITY',
          risk_level: RiskLevel.MODERATE,
          mitigation: 'De-identification and secure storage',
        },
      ],
      overall_justification: 'Moderate risk due to sensitive data',
      national_statement_reference: 'National Statement 2.1.7',
    };

    const result = formatRiskAssessment(risk);
    expect(result).toContain('🟠');
  });
});

describe('formatConsentSpec', () => {
  it('should format consent specification with annotations', () => {
    const consent: ConsentSpec = {
      consent_type: 'FULL_WRITTEN',
      waiver_justified: false,
      capacity_assessment_required: true,
      third_party_consent_required: false,
      documentation_requirements: [
        'Participant Information Sheet',
        'Consent Form',
        'Capacity Assessment Form',
      ],
      opt_out_available: true,
      consent_process_description:
        'Written informed consent obtained prior to data collection',
    };

    const result = formatConsentSpec(consent);
    expect(result).toContain('"consent_type": "FULL_WRITTEN"');
    expect(result).toContain('"capacity_assessment_required": true');
    expect(result).toContain('_annotations');
    expect(result).toContain('Participant Information Sheet');
  });

  it('should include waiver justification if applicable', () => {
    const consent: ConsentSpec = {
      consent_type: 'WAIVER',
      waiver_justified: true,
      waiver_justification: 'Retrospective data review, impracticable to obtain consent',
      capacity_assessment_required: false,
      third_party_consent_required: false,
      documentation_requirements: ['Waiver Justification Form'],
      opt_out_available: false,
      consent_process_description: 'Consent waived under National Statement 2.3.10',
    };

    const result = formatConsentSpec(consent);
    expect(result).toContain('"waiver_justified": true');
    expect(result).toContain('Retrospective data review');
    expect(result).toContain('National Statement Section 2.3.10');
  });
});

describe('formatGovernanceChecklist', () => {
  it('should format checklist with summary and table structure', () => {
    const checklist: ChecklistItem[] = [
      {
        item: 'Submit HREC application',
        requirement_source: 'NHMRC_NATIONAL_STATEMENT',
        status: 'IN_PROGRESS',
        assigned_to: 'Dr Smith',
        due_date: '2024-03-01',
      },
      {
        item: 'Obtain site approval',
        requirement_source: 'QH_RESEARCH_GOVERNANCE',
        status: 'NOT_STARTED',
        dependencies: ['Submit HREC application'],
      },
      {
        item: 'Complete data security training',
        requirement_source: 'MN_CLINICAL_GOVERNANCE_POLICY',
        status: 'COMPLETE',
        assigned_to: 'Dr Smith',
      },
    ];

    const result = formatGovernanceChecklist(checklist);
    expect(result).toContain('"total": 3');
    expect(result).toContain('"not_started": 1');
    expect(result).toContain('"in_progress": 1');
    expect(result).toContain('"complete": 1');
    expect(result).toContain('Submit HREC application');
    expect(result).toContain('_status_icon');
    expect(result).toContain('⬜');
    expect(result).toContain('🔄');
    expect(result).toContain('✅');
  });

  it('should handle empty checklist', () => {
    const checklist: ChecklistItem[] = [];
    const result = formatGovernanceChecklist(checklist);
    expect(result).toContain('"total": 0');
    expect(result).toContain('"checklist": []');
  });
});
