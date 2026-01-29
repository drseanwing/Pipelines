/**
 * Document Agent Index - Integration Tests
 * Phase 8 - Document Stage
 */

import { describe, it, expect, vi } from 'vitest';
import { getDocumentTypeName } from './index.js';
import { DocumentType } from '../types/documents.js';

// Mock all document generators to avoid LLM calls in tests
vi.mock('./protocol.js', () => ({
  generateProtocol: vi.fn().mockResolvedValue(Buffer.from('protocol')),
}));

vi.mock('./picf.js', () => ({
  generatePICF: vi.fn().mockResolvedValue(Buffer.from('picf')),
}));

vi.mock('./dmp.js', () => ({
  generateDataManagementPlan: vi.fn().mockResolvedValue(Buffer.from('dmp')),
}));

vi.mock('./cover-letter.js', () => ({
  generateHRECCoverLetter: vi.fn().mockResolvedValue(Buffer.from('cover')),
}));

vi.mock('./emf-grant.js', () => ({
  EMFGrantGenerator: vi.fn().mockImplementation(() => ({
    generateEMFApplication: vi.fn().mockResolvedValue(Buffer.from('emf')),
  })),
}));

describe('Document Agent Index', () => {
  describe('getDocumentTypeName', () => {
    it('should return display name for RESEARCH_PROTOCOL', () => {
      expect(getDocumentTypeName(DocumentType.RESEARCH_PROTOCOL)).toBe('Research Protocol');
    });

    it('should return display name for PICF', () => {
      expect(getDocumentTypeName(DocumentType.PICF)).toBe('Participant Information and Consent Form');
    });

    it('should return display name for DATA_MANAGEMENT_PLAN', () => {
      expect(getDocumentTypeName(DocumentType.DATA_MANAGEMENT_PLAN)).toBe('Data Management Plan');
    });

    it('should return display name for HREC_COVER_LETTER', () => {
      expect(getDocumentTypeName(DocumentType.HREC_COVER_LETTER)).toBe('HREC Cover Letter');
    });

    it('should return display name for EMF_APPLICATION', () => {
      expect(getDocumentTypeName(DocumentType.EMF_APPLICATION)).toBe('EMF Grant Application');
    });

    it('should return display name for SITE_ASSESSMENT', () => {
      expect(getDocumentTypeName(DocumentType.SITE_ASSESSMENT)).toBe('Site-Specific Assessment');
    });

    it('should return display name for LNR_APPLICATION', () => {
      expect(getDocumentTypeName(DocumentType.LNR_APPLICATION)).toBe('Low and Negligible Risk Application');
    });

    it('should return display name for QI_PROJECT_PLAN', () => {
      expect(getDocumentTypeName(DocumentType.QI_PROJECT_PLAN)).toBe('Quality Improvement Project Plan');
    });
  });
});
