/**
 * Submission Package Creation Tests
 * Phase 8 - Document Stage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  determineRequiredDocuments,
  validateDocumentPackage,
  getGenerationOrder,
  validateCrossReferences,
  getPackageStats,
  type GeneratedDocument,
  type DocumentRequirement,
} from './package.js';
import type { Project, ProjectType } from '../types/project.js';
import type { EthicsEvaluation, EthicsPathwayType } from '../types/ethics.js';
import { DocumentType } from '../types/documents.js';

// Test fixtures
function createMockProject(type: ProjectType = ProjectType.RESEARCH, grantTarget?: string): Project {
  return {
    id: 'test-project-1',
    status: 'METHODOLOGY_APPROVED',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    intake: {
      project_title: 'Test Project',
      project_type: type,
      concept_description: 'Test description',
      clinical_problem: 'Test problem',
      target_population: 'Test population',
      setting: 'Test setting',
      principal_investigator: {
        name: 'Dr. Test',
        role: 'PI',
        title: 'Professor',
        institution: 'Test Hospital',
        department: 'Test Department',
        email: 'test@example.com',
        expertise: ['Testing'],
      },
      co_investigators: [],
      intended_outcomes: 'Test outcomes',
      grant_target: grantTarget as any,
    },
    classification: {
      project_type: type,
      confidence: 0.95,
      reasoning: 'Test reasoning',
      suggested_designs: ['RCT'],
    },
    frameworks: {
      reporting_guideline: 'CONSORT',
      ethics_framework: 'National Statement',
      governance_requirements: ['HREC'],
    },
    audit_log: [],
    checkpoints: {
      intake_approved: true,
      research_approved: true,
      methodology_approved: true,
      ethics_approved: false,
      documents_approved: false,
    },
  } as Project;
}

function createMockEthics(pathway: EthicsPathwayType = 'FULL_HREC_REVIEW'): EthicsEvaluation {
  return {
    ethics_pathway: {
      pathway,
      approval_body: 'Test HREC',
      requires_hrec: pathway === 'FULL_HREC_REVIEW' || pathway === 'LOW_RISK_RESEARCH',
      requires_rgo: true,
      estimated_timeline: '8-12 weeks',
      forms: ['NEAF'],
      status: 'NOT_STARTED',
    },
    risk_assessment: {
      level: 'LOW',
      factors: [],
      overall_justification: 'Test justification',
      national_statement_reference: 'NS 2.1',
    },
    consent_requirements: {
      consent_type: 'FULL_WRITTEN',
      waiver_justified: false,
      capacity_assessment_required: false,
      third_party_consent_required: false,
      documentation_requirements: [DocumentType.PICF],
      opt_out_available: false,
      consent_process_description: 'Test consent process',
    },
    data_governance: {
      data_types: ['IDENTIFIABLE'],
      storage_requirements: {
        location: 'Secure server',
        encryption: true,
        access_controls: ['Password'],
        backup_strategy: 'Daily',
      },
      retention_period: '7 years',
      disposal_method: 'Secure deletion',
      privacy_compliance: {
        privacy_act_1988: true,
        information_privacy_act_2009_qld: true,
        gdpr_applicable: false,
      },
      data_breach_response_plan: 'Test plan',
    },
    site_requirements: [],
    governance_checklist: [],
  } as EthicsEvaluation;
}

describe('determineRequiredDocuments', () => {
  it('should require protocol for research project', () => {
    const project = createMockProject('RESEARCH');
    const ethics = createMockEthics();

    const result = determineRequiredDocuments(project, ethics);

    const hasProtocol = result.required_documents.some(
      d => d.document_type === DocumentType.RESEARCH_PROTOCOL
    );
    expect(hasProtocol).toBe(true);
  });

  it('should require QI plan for QI project', () => {
    const project = createMockProject('QI');
    const ethics = createMockEthics('QI_REGISTRATION');

    const result = determineRequiredDocuments(project, ethics);

    const hasQIPlan = result.required_documents.some(
      d => d.document_type === 'QI_PROJECT_PLAN'
    );
    expect(hasQIPlan).toBe(true);
  });

  it('should require PICF for research project', () => {
    const project = createMockProject('RESEARCH');
    const ethics = createMockEthics();

    const result = determineRequiredDocuments(project, ethics);

    const hasPICF = result.required_documents.some(
      d => d.document_type === DocumentType.PICF
    );
    expect(hasPICF).toBe(true);
  });

  it('should require cover letter for HREC submission', () => {
    const project = createMockProject('RESEARCH');
    const ethics = createMockEthics('FULL_HREC_REVIEW');

    const result = determineRequiredDocuments(project, ethics);

    const hasCoverLetter = result.required_documents.some(
      d => d.document_type === DocumentType.HREC_COVER_LETTER
    );
    expect(hasCoverLetter).toBe(true);
  });

  it('should not require cover letter for QI registration', () => {
    const project = createMockProject('QI');
    const ethics = createMockEthics('QI_REGISTRATION');

    const result = determineRequiredDocuments(project, ethics);

    const hasCoverLetter = result.required_documents.some(
      d => d.document_type === DocumentType.HREC_COVER_LETTER
    );
    expect(hasCoverLetter).toBe(false);
  });

  it('should require EMF application when grant target specified', () => {
    const project = createMockProject(ProjectType.RESEARCH, 'EMF_JUMPSTART');
    const ethics = createMockEthics();

    const result = determineRequiredDocuments(project, ethics);

    const hasEMF = result.required_documents.some(
      d => d.document_type === 'EMF_APPLICATION'
    );
    expect(hasEMF).toBe(true);
  });

  it('should require data management plan for research', () => {
    const project = createMockProject('RESEARCH');
    const ethics = createMockEthics();

    const result = determineRequiredDocuments(project, ethics);

    const hasDMP = result.required_documents.some(
      d => d.document_type === DocumentType.DATA_MANAGEMENT_PLAN
    );
    expect(hasDMP).toBe(true);
  });

  it('should not require data management plan for QI', () => {
    const project = createMockProject('QI');
    const ethics = createMockEthics('QI_REGISTRATION');

    const result = determineRequiredDocuments(project, ethics);

    const hasDMP = result.required_documents.some(
      d => d.document_type === DocumentType.DATA_MANAGEMENT_PLAN
    );
    expect(hasDMP).toBe(false);
  });
});

describe('validateDocumentPackage', () => {
  it('should validate complete package', () => {
    const packageSpec = {
      package_type: 'FULL_HREC',
      required_documents: [
        { document_type: DocumentType.RESEARCH_PROTOCOL as DocumentType, required: true, reason: 'Test' },
        { document_type: DocumentType.PICF as DocumentType, required: true, reason: 'Test' },
      ],
      optional_documents: [],
    };

    const generatedTypes: DocumentType[] = [DocumentType.RESEARCH_PROTOCOL, DocumentType.PICF];

    const result = validateDocumentPackage(packageSpec, generatedTypes);

    expect(result.complete).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('should detect missing required documents', () => {
    const packageSpec = {
      package_type: 'FULL_HREC',
      required_documents: [
        { document_type: DocumentType.RESEARCH_PROTOCOL as DocumentType, required: true, reason: 'Test' },
        { document_type: DocumentType.PICF as DocumentType, required: true, reason: 'Test' },
      ],
      optional_documents: [],
    };

    const generatedTypes: DocumentType[] = [DocumentType.RESEARCH_PROTOCOL];

    const result = validateDocumentPackage(packageSpec, generatedTypes);

    expect(result.complete).toBe(false);
    expect(result.missing).toContain(DocumentType.PICF);
  });

  it('should warn about missing optional documents', () => {
    const packageSpec = {
      package_type: 'FULL_HREC',
      required_documents: [],
      optional_documents: [
        { document_type: 'SITE_ASSESSMENT' as DocumentType, required: false, reason: 'Multi-site' },
      ],
    };

    const generatedTypes: DocumentType[] = [];

    const result = validateDocumentPackage(packageSpec, generatedTypes);

    expect(result.complete).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('getGenerationOrder', () => {
  it('should return documents in order when no dependencies', () => {
    const requirements: DocumentRequirement[] = [
      { document_type: DocumentType.RESEARCH_PROTOCOL, required: true, reason: 'Test' },
      { document_type: DocumentType.PICF, required: true, reason: 'Test' },
    ];

    const order = getGenerationOrder(requirements);

    expect(order).toHaveLength(2);
    expect(order).toContain(DocumentType.RESEARCH_PROTOCOL);
    expect(order).toContain(DocumentType.PICF);
  });

  it('should respect dependencies', () => {
    const requirements: DocumentRequirement[] = [
      {
        document_type: DocumentType.PICF,
        required: true,
        reason: 'Test',
        depends_on: [DocumentType.RESEARCH_PROTOCOL],
      },
      { document_type: DocumentType.RESEARCH_PROTOCOL, required: true, reason: 'Test' },
    ];

    const order = getGenerationOrder(requirements);

    const protocolIndex = order.indexOf(DocumentType.RESEARCH_PROTOCOL);
    const picfIndex = order.indexOf(DocumentType.PICF);

    expect(protocolIndex).toBeLessThan(picfIndex);
  });

  it('should handle multiple dependencies', () => {
    const requirements: DocumentRequirement[] = [
      {
        document_type: DocumentType.HREC_COVER_LETTER,
        required: true,
        reason: 'Test',
        depends_on: [DocumentType.RESEARCH_PROTOCOL, DocumentType.PICF],
      },
      { document_type: DocumentType.RESEARCH_PROTOCOL, required: true, reason: 'Test' },
      {
        document_type: DocumentType.PICF,
        required: true,
        reason: 'Test',
        depends_on: [DocumentType.RESEARCH_PROTOCOL],
      },
    ];

    const order = getGenerationOrder(requirements);

    const protocolIndex = order.indexOf(DocumentType.RESEARCH_PROTOCOL);
    const picfIndex = order.indexOf(DocumentType.PICF);
    const letterIndex = order.indexOf(DocumentType.HREC_COVER_LETTER);

    expect(protocolIndex).toBeLessThan(picfIndex);
    expect(picfIndex).toBeLessThan(letterIndex);
  });
});

describe('validateCrossReferences', () => {
  it('should return empty array when no issues', () => {
    const documents: GeneratedDocument[] = [
      {
        type: DocumentType.RESEARCH_PROTOCOL,
        filename: 'protocol.docx',
        buffer: Buffer.from('test'),
        generated_at: new Date().toISOString(),
        checksum: '12345678',
      },
    ];

    const issues = validateCrossReferences(documents);
    expect(issues).toHaveLength(0);
  });

  it('should handle multiple documents', () => {
    const documents: GeneratedDocument[] = [
      {
        type: DocumentType.RESEARCH_PROTOCOL,
        filename: 'protocol.docx',
        buffer: Buffer.from('test'),
        generated_at: new Date().toISOString(),
        checksum: '12345678',
      },
      {
        type: DocumentType.PICF,
        filename: 'picf.docx',
        buffer: Buffer.from('test'),
        generated_at: new Date().toISOString(),
        checksum: '87654321',
      },
    ];

    const issues = validateCrossReferences(documents);
    expect(issues).toHaveLength(0);
  });
});

describe('getPackageStats', () => {
  it('should calculate correct statistics', () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);

    const documents: GeneratedDocument[] = [
      {
        type: DocumentType.RESEARCH_PROTOCOL,
        filename: 'protocol.docx',
        buffer: Buffer.alloc(1000),
        generated_at: earlier.toISOString(),
        checksum: '12345678',
      },
      {
        type: DocumentType.DATA_MANAGEMENT_PLAN,
        filename: 'dmp.docx',
        buffer: Buffer.alloc(500),
        generated_at: now.toISOString(),
        checksum: '87654321',
      },
    ];

    const stats = getPackageStats(documents);

    expect(stats.total_documents).toBe(2);
    expect(stats.total_size_bytes).toBe(1500);
    expect(stats.document_types).toContain(DocumentType.RESEARCH_PROTOCOL);
    expect(stats.document_types).toContain(DocumentType.DATA_MANAGEMENT_PLAN);
  });

  it('should handle empty document list', () => {
    const stats = getPackageStats([]);

    expect(stats.total_documents).toBe(0);
    expect(stats.total_size_bytes).toBe(0);
    expect(stats.document_types).toHaveLength(0);
  });

  it('should calculate time range correctly', () => {
    const time1 = new Date('2024-01-01T10:00:00Z');
    const time2 = new Date('2024-01-01T11:00:00Z');
    const time3 = new Date('2024-01-01T12:00:00Z');

    const documents: GeneratedDocument[] = [
      {
        type: DocumentType.RESEARCH_PROTOCOL,
        filename: 'protocol.docx',
        buffer: Buffer.from('test'),
        generated_at: time2.toISOString(),
        checksum: '12345678',
      },
      {
        type: DocumentType.PICF,
        filename: 'picf.docx',
        buffer: Buffer.from('test'),
        generated_at: time1.toISOString(),
        checksum: '87654321',
      },
      {
        type: DocumentType.HREC_COVER_LETTER,
        filename: 'letter.docx',
        buffer: Buffer.from('test'),
        generated_at: time3.toISOString(),
        checksum: 'abcdef12',
      },
    ];

    const stats = getPackageStats(documents);

    expect(stats.generation_time_range.earliest).toBe(time1.toISOString());
    expect(stats.generation_time_range.latest).toBe(time3.toISOString());
  });
});
