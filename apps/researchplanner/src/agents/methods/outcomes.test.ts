/**
 * Tests for Outcome Definition Module
 * Phase 6.5
 */

import { describe, it, expect } from 'vitest';
import {
  determineReportingGuideline,
  suggestMeasurementTool,
  determineMeasurementTiming,
  estimateClinicallyMeaningfulDifference,
  VALIDATED_MEASUREMENT_TOOLS,
  CLINICAL_DIFFERENCE_ESTIMATES,
} from './outcomes.js';
import type { StudyDesign } from '../../types/methodology.js';

describe('determineReportingGuideline', () => {
  it('should return CONSORT for randomized studies', () => {
    const design: StudyDesign = {
      type: 'RCT',
      reporting_guideline: '',
      is_randomised: true,
      is_blinded: true,
      blinding_type: 'DOUBLE',
      control_type: 'PLACEBO',
      requires_sample_size: true,
      justification: 'Gold standard design',
    };

    expect(determineReportingGuideline(design)).toBe('CONSORT');
  });

  it('should return STROBE for cohort studies', () => {
    const design: StudyDesign = {
      type: 'PROSPECTIVE_COHORT',
      reporting_guideline: '',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'Observational study',
    };

    expect(determineReportingGuideline(design)).toBe('STROBE');
  });

  it('should return SQUIRE for quality improvement studies', () => {
    const design: StudyDesign = {
      type: 'PDSA_CYCLE',
      reporting_guideline: '',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'QI initiative',
    };

    expect(determineReportingGuideline(design)).toBe('SQUIRE');
  });

  it('should preserve existing reporting guideline', () => {
    const design: StudyDesign = {
      type: 'RCT',
      reporting_guideline: 'SPIRIT',
      is_randomised: true,
      is_blinded: true,
      requires_sample_size: true,
      justification: 'Protocol reporting',
    };

    expect(determineReportingGuideline(design)).toBe('SPIRIT');
  });

  it('should return StaRI for implementation studies', () => {
    const design: StudyDesign = {
      type: 'IMPLEMENTATION_STUDY',
      reporting_guideline: '',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'Implementation research',
    };

    expect(determineReportingGuideline(design)).toBe('StaRI');
  });
});

describe('suggestMeasurementTool', () => {
  it('should suggest VAS for pain outcomes', () => {
    const tool = suggestMeasurementTool('pain intensity', 'pain');
    expect(tool).toBe('Visual Analog Scale (VAS)');
  });

  it('should suggest PHQ-9 for depression outcomes', () => {
    const tool = suggestMeasurementTool('depression severity');
    expect(tool).toBe('Patient Health Questionnaire-9 (PHQ-9)');
  });

  it('should suggest GAD-7 for anxiety outcomes', () => {
    const tool = suggestMeasurementTool('anxiety symptoms');
    expect(tool).toBe('Generalized Anxiety Disorder-7 (GAD-7)');
  });

  it('should suggest SF-36 for quality of life', () => {
    const tool = suggestMeasurementTool('health-related quality of life');
    expect(tool).toBe('SF-36 Health Survey');
  });

  it('should suggest Barthel Index for functional status', () => {
    const tool = suggestMeasurementTool('functional independence');
    expect(tool).toBe('Barthel Index');
  });

  it('should suggest TUG for mobility outcomes', () => {
    const tool = suggestMeasurementTool('mobility assessment');
    expect(tool).toBe('Timed Up and Go Test (TUG)');
  });

  it('should suggest HbA1c for glycemic control', () => {
    const tool = suggestMeasurementTool('diabetes control');
    expect(tool).toBe('HbA1c');
  });

  it('should suggest blood pressure monitoring', () => {
    const tool = suggestMeasurementTool('blood pressure control');
    expect(tool).toBe('Automated office blood pressure measurement');
  });

  it('should suggest mortality measure', () => {
    const tool = suggestMeasurementTool('all-cause mortality');
    expect(tool).toBe('All-cause mortality');
  });

  it('should suggest readmission measure', () => {
    const tool = suggestMeasurementTool('hospital readmission');
    expect(tool).toBe('30-day hospital readmission rate');
  });

  it('should return default for unknown outcomes', () => {
    const tool = suggestMeasurementTool('unknown outcome measure');
    expect(tool).toContain('Clinical measurement per protocol');
  });
});

describe('determineMeasurementTiming', () => {
  it('should return appropriate timing for short RCT (3 months)', () => {
    const design: StudyDesign = {
      type: 'RCT',
      reporting_guideline: 'CONSORT',
      is_randomised: true,
      is_blinded: true,
      requires_sample_size: true,
      justification: 'Test',
    };

    const timing = determineMeasurementTiming(design, '3 months');
    expect(timing).toContain('Baseline');
    expect(timing).toContain('week 12');
  });

  it('should return quarterly timing for 6-month RCT', () => {
    const design: StudyDesign = {
      type: 'RCT',
      reporting_guideline: 'CONSORT',
      is_randomised: true,
      is_blinded: true,
      requires_sample_size: true,
      justification: 'Test',
    };

    const timing = determineMeasurementTiming(design, '6 months');
    expect(timing).toContain('Baseline');
    expect(timing).toContain('3 months');
    expect(timing).toContain('6 months');
  });

  it('should return appropriate timing for 12-month RCT', () => {
    const design: StudyDesign = {
      type: 'RCT',
      reporting_guideline: 'CONSORT',
      is_randomised: true,
      is_blinded: true,
      requires_sample_size: true,
      justification: 'Test',
    };

    const timing = determineMeasurementTiming(design, '12 months');
    expect(timing).toContain('Baseline');
    expect(timing).toContain('12 months');
  });

  it('should return annual timing for cohort studies', () => {
    const design: StudyDesign = {
      type: 'COHORT',
      reporting_guideline: 'STROBE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'Test',
    };

    const timing = determineMeasurementTiming(design);
    expect(timing).toContain('annual');
  });

  it('should return single timepoint for cross-sectional studies', () => {
    const design: StudyDesign = {
      type: 'CROSS_SECTIONAL',
      reporting_guideline: 'STROBE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'Test',
    };

    const timing = determineMeasurementTiming(design);
    expect(timing).toContain('Single time point');
  });

  it('should return monthly timing for PDSA cycles', () => {
    const design: StudyDesign = {
      type: 'PDSA_CYCLE',
      reporting_guideline: 'SQUIRE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'Test',
    };

    const timing = determineMeasurementTiming(design);
    expect(timing).toContain('monthly');
    expect(timing).toContain('Pre-intervention');
  });

  it('should handle year duration correctly', () => {
    const design: StudyDesign = {
      type: 'RCT',
      reporting_guideline: 'CONSORT',
      is_randomised: true,
      is_blinded: true,
      requires_sample_size: true,
      justification: 'Test',
    };

    const timing = determineMeasurementTiming(design, '1 year');
    expect(timing).toContain('Baseline');
    expect(timing).toContain('months');
  });
});

describe('estimateClinicallyMeaningfulDifference', () => {
  it('should return MCID for pain NRS', () => {
    const mcid = estimateClinicallyMeaningfulDifference('pain numeric rating scale');
    expect(mcid).toBe(2.0);
  });

  it('should return MCID for SF-36', () => {
    const mcid = estimateClinicallyMeaningfulDifference('SF-36 physical component score');
    expect(mcid).toBe(5.0);
  });

  it('should return MCID for EQ-5D', () => {
    const mcid = estimateClinicallyMeaningfulDifference('EQ-5D-5L');
    expect(mcid).toBe(0.074);
  });

  it('should return MCID for PHQ-9', () => {
    const mcid = estimateClinicallyMeaningfulDifference('PHQ-9 depression score');
    expect(mcid).toBe(5.0);
  });

  it('should return MCID for GAD-7', () => {
    const mcid = estimateClinicallyMeaningfulDifference('GAD-7 anxiety score');
    expect(mcid).toBe(4.0);
  });

  it('should return MCID for HbA1c', () => {
    const mcid = estimateClinicallyMeaningfulDifference('HbA1c percentage');
    expect(mcid).toBe(0.5);
  });

  it('should return relative risk reduction for mortality', () => {
    const rrr = estimateClinicallyMeaningfulDifference('all-cause mortality rate');
    expect(rrr).toBe(0.2);
  });

  it('should return relative risk reduction for readmission', () => {
    const rrr = estimateClinicallyMeaningfulDifference('30-day readmission rate');
    expect(rrr).toBe(0.15);
  });

  it('should return undefined for unknown outcomes', () => {
    const mcid = estimateClinicallyMeaningfulDifference('custom outcome measure');
    expect(mcid).toBeUndefined();
  });

  it('should return undefined when evidence base mentions MCID', () => {
    const mcid = estimateClinicallyMeaningfulDifference(
      'custom scale',
      'Literature reports MCID of 3.5 points'
    );
    expect(mcid).toBeUndefined();
  });
});

describe('VALIDATED_MEASUREMENT_TOOLS', () => {
  it('should contain pain measurement tools', () => {
    expect(VALIDATED_MEASUREMENT_TOOLS.pain).toBeDefined();
    expect(VALIDATED_MEASUREMENT_TOOLS.pain.length).toBeGreaterThan(0);
    expect(VALIDATED_MEASUREMENT_TOOLS.pain).toContain('Visual Analog Scale (VAS)');
  });

  it('should contain quality of life tools', () => {
    expect(VALIDATED_MEASUREMENT_TOOLS.quality_of_life).toBeDefined();
    expect(VALIDATED_MEASUREMENT_TOOLS.quality_of_life).toContain('SF-36 Health Survey');
  });

  it('should contain mental health assessment tools', () => {
    expect(VALIDATED_MEASUREMENT_TOOLS.depression).toBeDefined();
    expect(VALIDATED_MEASUREMENT_TOOLS.anxiety).toBeDefined();
  });

  it('should contain functional assessment tools', () => {
    expect(VALIDATED_MEASUREMENT_TOOLS.functional_status).toBeDefined();
    expect(VALIDATED_MEASUREMENT_TOOLS.mobility).toBeDefined();
  });

  it('should contain clinical measurement tools', () => {
    expect(VALIDATED_MEASUREMENT_TOOLS.blood_pressure).toBeDefined();
    expect(VALIDATED_MEASUREMENT_TOOLS.glycemic_control).toBeDefined();
  });
});

describe('CLINICAL_DIFFERENCE_ESTIMATES', () => {
  it('should contain pain scale MCIDs', () => {
    expect(CLINICAL_DIFFERENCE_ESTIMATES.pain_vas).toBeDefined();
    expect(CLINICAL_DIFFERENCE_ESTIMATES.pain_nrs).toBeDefined();
    expect(CLINICAL_DIFFERENCE_ESTIMATES.pain_nrs).toBeGreaterThan(0);
  });

  it('should contain quality of life MCIDs', () => {
    expect(CLINICAL_DIFFERENCE_ESTIMATES.sf36_pcs).toBeDefined();
    expect(CLINICAL_DIFFERENCE_ESTIMATES.eq5d).toBeDefined();
  });

  it('should contain mental health MCIDs', () => {
    expect(CLINICAL_DIFFERENCE_ESTIMATES.phq9).toBeDefined();
    expect(CLINICAL_DIFFERENCE_ESTIMATES.gad7).toBeDefined();
  });

  it('should contain functional measure MCIDs', () => {
    expect(CLINICAL_DIFFERENCE_ESTIMATES.barthel_index).toBeDefined();
    expect(CLINICAL_DIFFERENCE_ESTIMATES['6mwt']).toBeDefined();
  });

  it('should contain clinical measure MCIDs', () => {
    expect(CLINICAL_DIFFERENCE_ESTIMATES.hba1c).toBeDefined();
    expect(CLINICAL_DIFFERENCE_ESTIMATES.systolic_bp).toBeDefined();
  });

  it('should contain relative risk reductions', () => {
    expect(CLINICAL_DIFFERENCE_ESTIMATES.mortality_rrr).toBeDefined();
    expect(CLINICAL_DIFFERENCE_ESTIMATES.readmission_rrr).toBeDefined();
    expect(CLINICAL_DIFFERENCE_ESTIMATES.mortality_rrr).toBeLessThan(1);
  });
});
