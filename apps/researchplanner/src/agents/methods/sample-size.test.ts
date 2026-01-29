/**
 * Sample Size Calculation Tests
 * Phase 6.4 - Sample Size Calculation Testing
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateSampleSize,
  requiresSampleSize,
  estimateEffectSize,
  calculateContinuousSampleSize,
  calculateBinarySampleSize,
  calculateSurvivalSampleSize,
  estimateAttritionRate,
  generateSampleSizeJustification,
  type EvidenceSynthesis,
} from './sample-size.js';
import type { StudyDesign, OutcomeSpec, SampleSize } from '../../types/methodology.js';

describe('Sample Size Calculation', () => {
  describe('requiresSampleSize', () => {
    it('should return false for qualitative studies', () => {
      expect(requiresSampleSize('QUALITATIVE')).toBe(false);
      expect(requiresSampleSize('QUALITATIVE_INTERVIEW')).toBe(false);
    });

    it('should return false for QI cycles', () => {
      expect(requiresSampleSize('PDSA_CYCLE')).toBe(false);
      expect(requiresSampleSize('QI_CYCLE')).toBe(false);
    });

    it('should return true for RCTs', () => {
      expect(requiresSampleSize('RCT')).toBe(true);
      expect(requiresSampleSize('RANDOMIZED_CONTROLLED_TRIAL')).toBe(true);
    });

    it('should return true for cohort studies', () => {
      expect(requiresSampleSize('COHORT')).toBe(true);
      expect(requiresSampleSize('PROSPECTIVE_COHORT')).toBe(true);
    });
  });

  describe('estimateEffectSize', () => {
    it('should extract effect size from articles', () => {
      const synthesis: EvidenceSynthesis = {
        synthesis: 'Test synthesis',
        articles: [
          { effect_size: 0.5 },
          { effect_size: 0.6 },
          { effect_size: 0.4 },
        ],
      };
      const effectSize = estimateEffectSize(synthesis);
      expect(effectSize).toBeGreaterThan(0);
      expect(effectSize).toBeLessThanOrEqual(0.6);
    });

    it('should infer large effect from text', () => {
      const synthesis: EvidenceSynthesis = {
        synthesis: 'Studies showed a large effect on outcomes',
      };
      const effectSize = estimateEffectSize(synthesis);
      expect(effectSize).toBe(0.8);
    });

    it('should infer medium effect from text', () => {
      const synthesis: EvidenceSynthesis = {
        synthesis: 'Studies showed a moderate effect on outcomes',
      };
      const effectSize = estimateEffectSize(synthesis);
      expect(effectSize).toBe(0.5);
    });

    it('should default to small-medium effect', () => {
      const synthesis: EvidenceSynthesis = {
        synthesis: 'General findings from the literature',
      };
      const effectSize = estimateEffectSize(synthesis);
      expect(effectSize).toBe(0.4);
    });
  });

  describe('calculateContinuousSampleSize', () => {
    it('should calculate sample size for medium effect', () => {
      const sampleSize = calculateContinuousSampleSize(0.5, 0.8, 0.05);
      expect(sampleSize).toBeGreaterThan(0);
      expect(sampleSize).toBeLessThan(200); // Reasonable bound
    });

    it('should require larger sample for small effect', () => {
      const smallEffect = calculateContinuousSampleSize(0.3, 0.8, 0.05);
      const mediumEffect = calculateContinuousSampleSize(0.5, 0.8, 0.05);
      expect(smallEffect).toBeGreaterThan(mediumEffect);
    });

    it('should require smaller sample for large effect', () => {
      const largeEffect = calculateContinuousSampleSize(0.8, 0.8, 0.05);
      const mediumEffect = calculateContinuousSampleSize(0.5, 0.8, 0.05);
      expect(largeEffect).toBeLessThan(mediumEffect);
    });
  });

  describe('calculateBinarySampleSize', () => {
    it('should calculate sample size for binary outcome', () => {
      const sampleSize = calculateBinarySampleSize(0.4, 0.6, 0.8, 0.05);
      expect(sampleSize).toBeGreaterThan(0);
      expect(sampleSize).toBeLessThan(500);
    });

    it('should throw for invalid proportions', () => {
      expect(() => calculateBinarySampleSize(0, 0.5, 0.8, 0.05)).toThrow();
      expect(() => calculateBinarySampleSize(1, 0.5, 0.8, 0.05)).toThrow();
    });

    it('should throw for identical proportions', () => {
      expect(() => calculateBinarySampleSize(0.5, 0.5, 0.8, 0.05)).toThrow();
    });
  });

  describe('calculateSurvivalSampleSize', () => {
    it('should calculate sample size for survival outcome', () => {
      const sampleSize = calculateSurvivalSampleSize(1.5, 0.8, 0.05);
      expect(sampleSize).toBeGreaterThan(0);
      expect(sampleSize).toBeLessThan(1000);
    });

    it('should throw for invalid hazard ratio', () => {
      expect(() => calculateSurvivalSampleSize(0, 0.8, 0.05)).toThrow();
      expect(() => calculateSurvivalSampleSize(-1, 0.8, 0.05)).toThrow();
    });

    it('should throw for hazard ratio near 1.0', () => {
      expect(() => calculateSurvivalSampleSize(1.0, 0.8, 0.05)).toThrow();
    });
  });

  describe('estimateAttritionRate', () => {
    it('should estimate higher attrition for RCTs', () => {
      const rctRate = estimateAttritionRate('RCT');
      const crossSectionalRate = estimateAttritionRate('CROSS_SECTIONAL');
      expect(rctRate).toBeGreaterThan(crossSectionalRate);
    });

    it('should increase attrition with duration', () => {
      const shortStudy = estimateAttritionRate('RCT', 6);
      const longStudy = estimateAttritionRate('RCT', 24);
      expect(longStudy).toBeGreaterThan(shortStudy);
    });

    it('should cap attrition at 50%', () => {
      const rate = estimateAttritionRate('COHORT', 120); // 10 years
      expect(rate).toBeLessThanOrEqual(0.5);
    });
  });

  describe('generateSampleSizeJustification', () => {
    it('should generate complete justification', () => {
      const sampleSize: SampleSize = {
        target: 120,
        calculation_method: 'Two-sample t-test power analysis',
        assumptions: {
          effect_size: 0.5,
          power: 0.8,
          alpha: 0.05,
          attrition_rate: 0.2,
        },
        justification: '',
      };

      const justification = generateSampleSizeJustification(sampleSize);

      expect(justification).toContain('120');
      expect(justification).toContain('0.5');
      expect(justification).toContain('80%');
      expect(justification).toContain('20%');
      expect(justification.length).toBeGreaterThan(100);
    });
  });

  describe('calculateSampleSize (integration)', () => {
    it('should return null for qualitative studies', async () => {
      const design: StudyDesign = {
        type: 'QUALITATIVE',
        reporting_guideline: 'COREQ',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Qualitative exploration',
      };

      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Patient experiences',
          definition: 'Thematic analysis of interviews',
          measurement_tool: 'Semi-structured interviews',
          measurement_timing: 'Post-intervention',
        },
        secondary: [],
      };

      const synthesis: EvidenceSynthesis = {
        synthesis: 'Evidence suggests medium effects',
      };

      const result = await calculateSampleSize(design, outcomes, synthesis);
      expect(result).toBeNull();
    });

    it('should calculate sample size for RCT with continuous outcome', async () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        blinding_type: 'DOUBLE',
        control_type: 'PLACEBO',
        requires_sample_size: true,
        justification: '12 month randomized trial',
      };

      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Depression severity',
          definition: 'Change in PHQ-9 score from baseline',
          measurement_tool: 'PHQ-9 validated scale',
          measurement_timing: 'Baseline, 3, 6, 12 months',
          clinically_meaningful_difference: 5,
        },
        secondary: [],
      };

      const synthesis: EvidenceSynthesis = {
        synthesis: 'Studies showed moderate effect sizes',
        articles: [{ effect_size: 0.6 }],
      };

      const result = await calculateSampleSize(design, outcomes, synthesis);

      expect(result).not.toBeNull();
      expect(result!.target).toBeGreaterThan(0);
      expect(result!.assumptions.effect_size).toBe(0.6);
      expect(result!.assumptions.power).toBe(0.8);
      expect(result!.justification).toContain('120');
    });
  });
});
