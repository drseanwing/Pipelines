/**
 * Data Management Plan Generator Tests
 * Phase 8 - Document Stage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDataManagementPlan } from './dmp.js';
import type { Project } from '../types/project.js';
import type { EthicsEvaluation } from '../types/ethics.js';
import { ProjectType } from '../types/project.js';
import { EthicsPathwayType, RiskLevel } from '../types/ethics.js';

// Mock LLM
vi.mock('../utils/llm.js', () => ({
  callLLM: vi.fn().mockResolvedValue(JSON.stringify({
    dataDescription: { content: 'Test data description content.' },
    dataTypes: { content: 'Test data types content.' },
    dataVolume: { content: 'Test data volume content.' },
    dataCollection: { content: 'Test data collection content.' },
    collectionProcedures: { content: 'Test collection procedures.' },
    qualityAssurance: { content: 'Test QA content.' },
    storageSecurity: { content: 'Test storage security content.' },
    accessControls: { content: 'Test access controls content.' },
    backupRecovery: { content: 'Test backup content.' },
    dataSharing: { content: 'Test data sharing content.' },
    dataTransfer: { content: 'Test data transfer content.' },
    retentionDisposal: { content: 'Test retention content.' },
    legalCompliance: { content: 'Test legal compliance content.' },
    rolesResponsibilities: { content: 'Test roles content.' },
    reviewUpdates: { content: 'Test review content.' },
  })),
}));

describe('generateDataManagementPlan', () => {
  const mockProject: Project = {
    id: 'test-123',
    status: 'ETHICS_COMPLETE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    intake: {
      project_title: 'Test DMP Project',
      project_type: ProjectType.RESEARCH,
      concept_description: 'Testing DMP generation',
      clinical_problem: 'Test problem',
      target_population: 'Adult patients',
      setting: 'Hospital',
      principal_investigator: {
        name: 'Dr. Test PI',
        role: 'PI',
        title: 'Dr',
        institution: 'Test Hospital',
        department: 'Medicine',
        email: 'test@example.com',
        expertise: ['Research'],
      },
      co_investigators: [
        {
          name: 'Dr. Co-Investigator',
          role: 'CO_I',
          title: 'Dr',
          institution: 'Test Hospital',
          department: 'Research',
          email: 'coi@example.com',
          expertise: ['Statistics'],
        },
      ],
      intended_outcomes: 'New knowledge',
    },
    classification: {
      project_type: ProjectType.RESEARCH,
      confidence: 0.95,
      reasoning: 'Research project',
      suggested_designs: ['COHORT'],
    },
    frameworks: {
      reporting_guideline: 'STROBE',
      ethics_framework: 'HREC Review',
      governance_requirements: ['HREC Approval'],
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

  const mockEthics: EthicsEvaluation = {
    ethics_pathway: {
      pathway: EthicsPathwayType.LOW_RISK_RESEARCH,
      approval_body: 'Test HREC',
      requires_hrec: true,
      requires_rgo: true,
      estimated_timeline: '8-12 weeks',
      forms: ['NHMRC Form'],
      status: 'NOT_STARTED',
    },
    risk_assessment: {
      level: RiskLevel.LOW,
      factors: [],
      overall_justification: 'Low risk study',
      national_statement_reference: 'NS 2.1.6',
    },
    consent_requirements: {
      consent_type: 'FULL_WRITTEN',
      waiver_justified: false,
      capacity_assessment_required: false,
      third_party_consent_required: false,
      documentation_requirements: ['PIS', 'Consent Form'],
      opt_out_available: false,
      consent_process_description: 'Standard consent',
    },
    data_governance: {
      data_types: ['RE_IDENTIFIABLE', 'DE_IDENTIFIED'],
      storage_requirements: {
        location: 'Secure research server',
        encryption: true,
        access_controls: ['RBAC', 'MFA', 'Audit logging'],
        backup_strategy: 'Daily incremental, weekly full',
      },
      retention_period: '7 years post-publication',
      disposal_method: 'Secure deletion with certificate',
      privacy_compliance: {
        privacy_act_1988: true,
        information_privacy_act_2009_qld: true,
        gdpr_applicable: false,
      },
      data_breach_response_plan: 'Notify Privacy Officer within 24 hours',
    },
    site_requirements: [],
    governance_checklist: [],
  };

  it('should generate DMP document buffer', async () => {
    const buffer = await generateDataManagementPlan(mockProject, mockEthics);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should generate valid DOCX format', async () => {
    const buffer = await generateDataManagementPlan(mockProject, mockEthics);

    // DOCX files start with PK (ZIP signature)
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4B); // K
  });

  it('should handle data transfer plan when present', async () => {
    const ethicsWithTransfer = {
      ...mockEthics,
      data_governance: {
        ...mockEthics.data_governance,
        data_transfer_plan: {
          recipient: 'Partner University',
          method: 'SFTP',
          security_measures: ['Encryption', 'Data agreement'],
        },
      },
    };

    const buffer = await generateDataManagementPlan(mockProject, ethicsWithTransfer);
    expect(buffer).toBeInstanceOf(Buffer);
  });
});
