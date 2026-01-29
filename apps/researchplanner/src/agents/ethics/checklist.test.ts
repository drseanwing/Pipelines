/**
 * Unit tests for governance checklist generation
 * Phase 7.7 - Checklist Generation Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateGovernanceChecklist,
  getNHMRCRequirements,
  getQHGovernanceRequirements,
  getMNGovernanceRequirements,
  getPrivacyActRequirements,
  getIPAQLDRequirements,
  resolveDependencies,
  sortByDependencyOrder,
  getChecklistStats,
  getNextActionableItems,
} from './checklist.js';
import { EthicsPathwayType, RiskLevel } from '../../types/ethics.js';

describe('Governance Checklist Generation', () => {
  describe('generateGovernanceChecklist', () => {
    it('should generate QI checklist for MN institution', () => {
      const checklist = generateGovernanceChecklist(
        EthicsPathwayType.QI_REGISTRATION,
        'RETROSPECTIVE_AUDIT',
        'MN',
        RiskLevel.NEGLIGIBLE,
        ['DE_IDENTIFIED']
      );

      expect(checklist.length).toBeGreaterThan(0);

      // Should include MN QI registration
      const qiRegistration = checklist.find(item =>
        item.item.includes('QI Registration')
      );
      expect(qiRegistration).toBeDefined();
      expect(qiRegistration?.requirement_source).toBe('MN_CLINICAL_GOVERNANCE_POLICY');
    });

    it('should generate research checklist for QH institution', () => {
      const checklist = generateGovernanceChecklist(
        EthicsPathwayType.LOW_RISK_RESEARCH,
        'SURVEY',
        'QH',
        RiskLevel.LOW,
        ['IDENTIFIABLE']
      );

      expect(checklist.length).toBeGreaterThan(0);

      // Should include NHMRC requirements
      const ethicsApp = checklist.find(item =>
        item.item.includes('ethics application')
      );
      expect(ethicsApp).toBeDefined();

      // Should include QH governance
      const rgoApp = checklist.find(item =>
        item.item.includes('RGO')
      );
      expect(rgoApp).toBeDefined();

      // Should include Privacy Act
      const privacyNotice = checklist.find(item =>
        item.item.includes('Privacy Collection Notice')
      );
      expect(privacyNotice).toBeDefined();

      // Should include Qld IPA
      const ipa = checklist.find(item =>
        item.requirement_source === 'INFORMATION_PRIVACY_ACT_2009_QLD'
      );
      expect(ipa).toBeDefined();
    });

    it('should include insurance for moderate risk research', () => {
      const checklist = generateGovernanceChecklist(
        EthicsPathwayType.FULL_HREC_REVIEW,
        'CLINICAL_TRIAL',
        'MN',
        RiskLevel.MODERATE,
        ['IDENTIFIABLE']
      );

      const insurance = checklist.find(item =>
        item.item.includes('insurance')
      );
      expect(insurance).toBeDefined();
      expect(insurance?.requirement_source).toBe('NHMRC_NATIONAL_STATEMENT');
    });
  });

  describe('getNHMRCRequirements', () => {
    it('should return base requirements for low risk research', () => {
      const items = getNHMRCRequirements(
        EthicsPathwayType.LOW_RISK_RESEARCH,
        RiskLevel.LOW
      );

      expect(items.length).toBeGreaterThanOrEqual(5);

      const riskAssessment = items.find(i => i.item.includes('Risk Assessment'));
      expect(riskAssessment).toBeDefined();
      expect(riskAssessment?.priority).toBe(1);
    });

    it('should include additional requirements for high risk', () => {
      const lowRisk = getNHMRCRequirements(
        EthicsPathwayType.LOW_RISK_RESEARCH,
        RiskLevel.LOW
      );
      const highRisk = getNHMRCRequirements(
        EthicsPathwayType.FULL_HREC_REVIEW,
        RiskLevel.HIGH
      );

      expect(highRisk.length).toBeGreaterThan(lowRisk.length);

      const insurance = highRisk.find(i => i.item.includes('insurance'));
      expect(insurance).toBeDefined();
    });
  });

  describe('getQHGovernanceRequirements', () => {
    it('should return QH RGO requirements', () => {
      const items = getQHGovernanceRequirements(EthicsPathwayType.LOW_RISK_RESEARCH);

      expect(items.length).toBeGreaterThan(0);

      const rgo = items.find(i => i.item.includes('RGO'));
      expect(rgo).toBeDefined();
      expect(rgo?.requirement_source).toBe('QH_RESEARCH_GOVERNANCE');
    });

    it('should include CTA for clinical trials', () => {
      const items = getQHGovernanceRequirements(EthicsPathwayType.FULL_HREC_REVIEW);

      const cta = items.find(i => i.item.includes('clinical trial agreement'));
      expect(cta).toBeDefined();
    });
  });

  describe('getMNGovernanceRequirements', () => {
    it('should include QI registration for QI pathway', () => {
      const items = getMNGovernanceRequirements(EthicsPathwayType.QI_REGISTRATION);

      const qiReg = items.find(i => i.item.includes('QI Registration'));
      expect(qiReg).toBeDefined();
      expect(qiReg?.priority).toBe(1);
    });

    it('should include standard governance for research', () => {
      const items = getMNGovernanceRequirements(EthicsPathwayType.LOW_RISK_RESEARCH);

      const mnGov = items.find(i => i.item.includes('Mater Research Governance'));
      expect(mnGov).toBeDefined();
    });
  });

  describe('getPrivacyActRequirements', () => {
    it('should return base privacy requirements', () => {
      const items = getPrivacyActRequirements(['RE_IDENTIFIABLE']);

      expect(items.length).toBeGreaterThan(0);

      const notice = items.find(i => i.item.includes('Privacy Collection Notice'));
      expect(notice).toBeDefined();
      expect(notice?.requirement_source).toBe('PRIVACY_ACT_1988');
    });

    it('should include PIA for identifiable data', () => {
      const items = getPrivacyActRequirements(['IDENTIFIABLE']);

      const pia = items.find(i => i.item.includes('Privacy Impact Assessment'));
      expect(pia).toBeDefined();
    });

    it('should not include PIA for de-identified data', () => {
      const items = getPrivacyActRequirements(['DE_IDENTIFIED']);

      const pia = items.find(i => i.item.includes('Privacy Impact Assessment'));
      expect(pia).toBeUndefined();
    });
  });

  describe('getIPAQLDRequirements', () => {
    it('should return Queensland privacy requirements', () => {
      const items = getIPAQLDRequirements(['IDENTIFIABLE']);

      expect(items.length).toBeGreaterThan(0);

      const qldReq = items.find(i =>
        i.requirement_source === 'INFORMATION_PRIVACY_ACT_2009_QLD'
      );
      expect(qldReq).toBeDefined();
    });

    it('should include PIE approval for identifiable data', () => {
      const items = getIPAQLDRequirements(['IDENTIFIABLE']);

      const pie = items.find(i => i.item.includes('PIE approval'));
      expect(pie).toBeDefined();
    });
  });

  describe('resolveDependencies', () => {
    it('should set dependencies for ethics application', () => {
      const items = getNHMRCRequirements(
        EthicsPathwayType.LOW_RISK_RESEARCH,
        RiskLevel.LOW
      );
      const withDeps = resolveDependencies(items);

      const ethicsApp = withDeps.find(i => i.item.includes('ethics application'));
      expect(ethicsApp?.dependencies).toBeDefined();
      expect(ethicsApp?.dependencies).toContain('Complete NHMRC National Statement Risk Assessment');
    });

    it('should set dependencies for PICF', () => {
      const items = getNHMRCRequirements(
        EthicsPathwayType.LOW_RISK_RESEARCH,
        RiskLevel.LOW
      );
      const withDeps = resolveDependencies(items);

      const picf = withDeps.find(i => i.item.includes('PICF'));
      expect(picf?.dependencies).toBeDefined();
      expect(picf?.dependencies?.length).toBeGreaterThan(0);
    });
  });

  describe('sortByDependencyOrder', () => {
    it('should sort items by dependencies (topological sort)', () => {
      const items = getNHMRCRequirements(
        EthicsPathwayType.LOW_RISK_RESEARCH,
        RiskLevel.LOW
      );
      const withDeps = resolveDependencies(items);
      const sorted = sortByDependencyOrder(withDeps);

      // Risk assessment should come before ethics application
      const riskIdx = sorted.findIndex(i => i.item.includes('Risk Assessment'));
      const ethicsIdx = sorted.findIndex(i => i.item.includes('ethics application'));

      expect(riskIdx).toBeLessThan(ethicsIdx);
    });

    it('should handle circular dependencies gracefully', () => {
      const items = [
        {
          item: 'Task A',
          requirement_source: 'TEST',
          status: 'NOT_STARTED' as const,
          priority: 1,
          category: 'TEST',
          dependencies: ['Task B'],
        },
        {
          item: 'Task B',
          requirement_source: 'TEST',
          status: 'NOT_STARTED' as const,
          priority: 2,
          category: 'TEST',
          dependencies: ['Task A'],
        },
      ];

      const sorted = sortByDependencyOrder(items);
      expect(sorted.length).toBe(2);
    });
  });

  describe('getChecklistStats', () => {
    it('should calculate checklist statistics', () => {
      const checklist = [
        { item: 'Task 1', requirement_source: 'TEST', status: 'COMPLETE' as const },
        { item: 'Task 2', requirement_source: 'TEST', status: 'COMPLETE' as const },
        { item: 'Task 3', requirement_source: 'TEST', status: 'IN_PROGRESS' as const },
        { item: 'Task 4', requirement_source: 'TEST', status: 'NOT_STARTED' as const },
      ];

      const stats = getChecklistStats(checklist);

      expect(stats.total).toBe(4);
      expect(stats.complete).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.notStarted).toBe(1);
      expect(stats.percentComplete).toBe(50);
    });
  });

  describe('getNextActionableItems', () => {
    it('should return items with no dependencies', () => {
      const checklist = [
        {
          item: 'Task 1',
          requirement_source: 'TEST',
          status: 'NOT_STARTED' as const,
        },
        {
          item: 'Task 2',
          requirement_source: 'TEST',
          status: 'NOT_STARTED' as const,
          dependencies: ['Task 1'],
        },
      ];

      const actionable = getNextActionableItems(checklist);

      expect(actionable.length).toBe(1);
      expect(actionable[0].item).toBe('Task 1');
    });

    it('should return items whose dependencies are complete', () => {
      const checklist = [
        {
          item: 'Task 1',
          requirement_source: 'TEST',
          status: 'COMPLETE' as const,
        },
        {
          item: 'Task 2',
          requirement_source: 'TEST',
          status: 'NOT_STARTED' as const,
          dependencies: ['Task 1'],
        },
        {
          item: 'Task 3',
          requirement_source: 'TEST',
          status: 'NOT_STARTED' as const,
          dependencies: ['Task 1', 'Task 2'],
        },
      ];

      const actionable = getNextActionableItems(checklist);

      expect(actionable.length).toBe(1);
      expect(actionable[0].item).toBe('Task 2');
    });

    it('should not return completed items', () => {
      const checklist = [
        {
          item: 'Task 1',
          requirement_source: 'TEST',
          status: 'COMPLETE' as const,
        },
      ];

      const actionable = getNextActionableItems(checklist);

      expect(actionable.length).toBe(0);
    });
  });
});
