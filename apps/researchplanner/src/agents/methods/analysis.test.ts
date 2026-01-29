/**
 * Tests for Analysis Plan Development Module
 * Phase 6.8 - Test analysis plan generation
 */

import { describe, it, expect } from 'vitest';
import {
  determineOutcomeType,
  determineNumberOfGroups,
  isRepeatedMeasuresDesign,
  isClusteredDesign,
  selectPrimaryAnalysisMethod,
  generateSecondaryAnalyses,
  planSensitivityAnalyses,
  planSubgroupAnalyses,
  selectMissingDataStrategy,
  recommendStatisticalSoftware,
  STATISTICAL_TEST_MAPPINGS,
  MISSING_DATA_STRATEGIES,
  SOFTWARE_RECOMMENDATIONS,
} from './analysis.js';
import type { StudyDesign, OutcomeSpec } from '../../types/methodology.js';

describe('Analysis Plan Development', () => {
  describe('determineOutcomeType', () => {
    it('should identify continuous outcomes from scales', () => {
      const outcome = {
        name: 'Pain score',
        definition: 'Pain intensity measured on a numeric rating scale',
        measurement_tool: 'Numeric Rating Scale (NRS)',
      };
      expect(determineOutcomeType(outcome)).toBe('continuous');
    });

    it('should identify binary outcomes from mortality', () => {
      const outcome = {
        name: '30-day mortality',
        definition: 'All-cause mortality within 30 days',
        measurement_tool: 'Medical records review',
      };
      expect(determineOutcomeType(outcome)).toBe('binary');
    });

    it('should identify time-to-event outcomes', () => {
      const outcome = {
        name: 'Survival time',
        definition: 'Time from enrollment to death or end of study',
        measurement_tool: 'Medical records',
      };
      expect(determineOutcomeType(outcome)).toBe('time_to_event');
    });

    it('should identify count outcomes', () => {
      const outcome = {
        name: 'Number of hospitalizations',
        definition: 'Count of hospital admissions during follow-up',
        measurement_tool: 'Administrative data',
      };
      expect(determineOutcomeType(outcome)).toBe('count');
    });

    it('should identify ordinal outcomes', () => {
      const outcome = {
        name: 'Disease severity grade',
        definition: 'Ordinal severity classification (mild, moderate, severe)',
        measurement_tool: 'Clinical assessment',
      };
      expect(determineOutcomeType(outcome)).toBe('ordinal');
    });
  });

  describe('determineNumberOfGroups', () => {
    it('should return 2 for standard RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        blinding_type: 'DOUBLE',
        control_type: 'PLACEBO',
        requires_sample_size: true,
        justification: 'Testing intervention vs placebo',
      };
      expect(determineNumberOfGroups(design)).toBe(2);
    });

    it('should return 3 for three-arm trial', () => {
      const design: StudyDesign = {
        type: 'RCT three-arm',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Testing two dose levels vs placebo',
      };
      expect(determineNumberOfGroups(design)).toBe(3);
    });

    it('should return 2 for cohort study', () => {
      const design: StudyDesign = {
        type: 'COHORT',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Exposed vs unexposed comparison',
      };
      expect(determineNumberOfGroups(design)).toBe(2);
    });
  });

  describe('isRepeatedMeasuresDesign', () => {
    it('should return true for longitudinal cohort', () => {
      const design: StudyDesign = {
        type: 'COHORT longitudinal',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Long-term follow-up',
      };
      expect(isRepeatedMeasuresDesign(design)).toBe(true);
    });

    it('should return true for RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Intervention trial',
      };
      expect(isRepeatedMeasuresDesign(design)).toBe(true);
    });

    it('should return false for cross-sectional', () => {
      const design: StudyDesign = {
        type: 'CROSS_SECTIONAL',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Single time point survey',
      };
      expect(isRepeatedMeasuresDesign(design)).toBe(false);
    });
  });

  describe('isClusteredDesign', () => {
    it('should return true for cluster RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        subtype: 'CLUSTER_RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Cluster randomized trial',
      };
      expect(isClusteredDesign(design)).toBe(true);
    });

    it('should return false for standard RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Standard RCT',
      };
      expect(isClusteredDesign(design)).toBe(false);
    });
  });

  describe('selectPrimaryAnalysisMethod', () => {
    it('should select t-test for continuous outcome with 2 groups', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Two-group comparison',
      };
      const outcome = {
        name: 'Pain score',
        definition: 'Pain intensity',
        measurement_tool: 'Numeric Rating Scale',
      };
      const method = selectPrimaryAnalysisMethod(design, outcome);
      expect(method).toContain('t-test');
    });

    it('should select mixed model for continuous outcome with repeated measures', () => {
      const design: StudyDesign = {
        type: 'RCT longitudinal',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Longitudinal trial',
      };
      const outcome = {
        name: 'Quality of life',
        definition: 'QoL score over time',
        measurement_tool: 'SF-36',
      };
      const method = selectPrimaryAnalysisMethod(design, outcome);
      expect(method).toContain('mixed');
    });

    it('should select chi-square for binary outcome', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Binary outcome comparison',
      };
      const outcome = {
        name: 'Mortality',
        definition: '30-day mortality',
        measurement_tool: 'Medical records',
      };
      const method = selectPrimaryAnalysisMethod(design, outcome);
      expect(method).toContain('Chi-square');
    });

    it('should select Cox regression for time-to-event outcome', () => {
      const design: StudyDesign = {
        type: 'COHORT',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Survival analysis',
      };
      const outcome = {
        name: 'Time to death',
        definition: 'Survival time',
        measurement_tool: 'Medical records',
      };
      const method = selectPrimaryAnalysisMethod(design, outcome);
      expect(method).toContain('Cox');
    });

    it('should select cluster-aware method for cluster RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        subtype: 'CLUSTER_RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Cluster randomized',
      };
      const outcome = {
        name: 'Patient outcome',
        definition: 'Clinical measure',
        measurement_tool: 'Clinical assessment',
      };
      const method = selectPrimaryAnalysisMethod(design, outcome);
      expect(method).toContain('cluster');
    });
  });

  describe('generateSecondaryAnalyses', () => {
    it('should include adjusted analysis for continuous outcome', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Pain score',
          definition: 'Pain intensity',
          measurement_tool: 'NRS',
          measurement_timing: 'Baseline, 3 months',
        },
        secondary: [
          {
            name: 'Function',
            definition: 'Physical function',
            measurement_tool: 'FIM',
            measurement_timing: 'Baseline, 3 months',
          },
        ],
      };
      const analyses = generateSecondaryAnalyses(outcomes, design);
      expect(analyses.some(a => a.includes('regression'))).toBe(true);
    });

    it('should include per-protocol analysis for RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Outcome',
          definition: 'Primary outcome',
          measurement_tool: 'Tool',
          measurement_timing: 'Baseline, follow-up',
        },
        secondary: [],
      };
      const analyses = generateSecondaryAnalyses(outcomes, design);
      expect(analyses.some(a => a.includes('per-protocol'))).toBe(true);
    });
  });

  describe('planSensitivityAnalyses', () => {
    it('should include non-parametric alternative', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const analyses = planSensitivityAnalyses(design);
      expect(analyses.some(a => a.includes('non-parametric'))).toBe(true);
    });

    it('should include missing data sensitivity', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const analyses = planSensitivityAnalyses(design);
      expect(analyses.some(a => a.includes('missing data'))).toBe(true);
    });

    it('should include ITT sensitivity for RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const analyses = planSensitivityAnalyses(design);
      expect(analyses.some(a => a.includes('Intention-to-treat'))).toBe(true);
    });
  });

  describe('planSubgroupAnalyses', () => {
    it('should include age subgroups for adult population', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const analyses = planSubgroupAnalyses(design, 'Adult patients aged 18+');
      expect(analyses.some(a => a.includes('Age'))).toBe(true);
    });

    it('should include sex subgroups', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const analyses = planSubgroupAnalyses(design);
      expect(analyses.some(a => a.includes('Sex'))).toBe(true);
    });

    it('should include exploratory caveat', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const analyses = planSubgroupAnalyses(design);
      expect(analyses.some(a => a.includes('exploratory'))).toBe(true);
    });
  });

  describe('selectMissingDataStrategy', () => {
    it('should recommend multiple imputation for RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Trial',
      };
      const strategy = selectMissingDataStrategy(design, []);
      expect(strategy).toContain('imputation');
    });

    it('should recommend FIML for longitudinal studies', () => {
      const design: StudyDesign = {
        type: 'COHORT longitudinal',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Longitudinal cohort',
      };
      const strategy = selectMissingDataStrategy(design, []);
      expect(strategy).toContain('maximum likelihood');
    });
  });

  describe('recommendStatisticalSoftware', () => {
    it('should recommend R for mixed models', () => {
      const analyses = [
        'Linear mixed-effects model',
        'Random effects for clusters',
      ];
      const software = recommendStatisticalSoftware(analyses);
      expect(software).toContain('R');
    });

    it('should recommend R survival package for survival analysis', () => {
      const analyses = [
        'Kaplan-Meier survival curves',
        'Cox proportional hazards regression',
      ];
      const software = recommendStatisticalSoftware(analyses);
      expect(software).toContain('survival');
    });

    it('should recommend SAS for clinical trials', () => {
      const analyses = [
        'Intention-to-treat analysis',
        'Randomized controlled trial',
      ];
      const software = recommendStatisticalSoftware(analyses);
      expect(software).toContain('SAS');
    });
  });

  describe('Statistical test mappings', () => {
    it('should have mappings for continuous outcomes', () => {
      expect(STATISTICAL_TEST_MAPPINGS.continuous_two_groups).toBeDefined();
      expect(STATISTICAL_TEST_MAPPINGS.continuous_multiple_groups).toBeDefined();
      expect(STATISTICAL_TEST_MAPPINGS.continuous_with_time).toBeDefined();
    });

    it('should have mappings for binary outcomes', () => {
      expect(STATISTICAL_TEST_MAPPINGS.binary_outcome).toBeDefined();
    });

    it('should have mappings for time-to-event outcomes', () => {
      expect(STATISTICAL_TEST_MAPPINGS.time_to_event).toBeDefined();
    });

    it('should have mappings for clustered designs', () => {
      expect(STATISTICAL_TEST_MAPPINGS.clustered_design).toBeDefined();
    });
  });

  describe('Missing data strategies', () => {
    it('should include complete case analysis', () => {
      expect(MISSING_DATA_STRATEGIES.complete_case).toBeDefined();
    });

    it('should include multiple imputation', () => {
      expect(MISSING_DATA_STRATEGIES.multiple_imputation).toBeDefined();
    });

    it('should include maximum likelihood', () => {
      expect(MISSING_DATA_STRATEGIES.maximum_likelihood).toBeDefined();
    });
  });

  describe('Software recommendations', () => {
    it('should have recommendations for basic stats', () => {
      expect(SOFTWARE_RECOMMENDATIONS.basic_stats).toBeDefined();
      expect(SOFTWARE_RECOMMENDATIONS.basic_stats.length).toBeGreaterThan(0);
    });

    it('should have recommendations for mixed models', () => {
      expect(SOFTWARE_RECOMMENDATIONS.mixed_models).toBeDefined();
    });

    it('should have recommendations for survival analysis', () => {
      expect(SOFTWARE_RECOMMENDATIONS.survival_analysis).toBeDefined();
    });

    it('should have recommendations for clinical trials', () => {
      expect(SOFTWARE_RECOMMENDATIONS.clinical_trials).toBeDefined();
    });
  });
});
