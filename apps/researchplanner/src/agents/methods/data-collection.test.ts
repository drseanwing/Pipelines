/**
 * Data Collection Planning Tests
 * Phase 6.7 - Test suite for data collection planning functions
 */

import { describe, it, expect } from 'vitest';
import {
  determineDataTypes,
  checkIdentifiableData,
  suggestInstruments,
  defineCollectionTimepoints,
  planMissingDataHandling,
} from './data-collection.js';
import type {
  OutcomeSpec,
  ProcedureSpec,
  StudyDesign,
  ProjectTimeline,
} from '../../types/methodology.js';

describe('Data Collection Planning', () => {
  describe('determineDataTypes', () => {
    it('should identify CLINICAL data type from clinical outcomes', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Blood Pressure Control',
          definition: 'Systolic BP < 140 mmHg',
          measurement_tool: 'Clinical blood pressure measurement',
          measurement_timing: 'Baseline, 3 months, 6 months',
        },
        secondary: [],
      };

      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const dataTypes = determineDataTypes(outcomes, design);

      expect(dataTypes).toContain('CLINICAL');
      expect(dataTypes).toContain('ADMINISTRATIVE');
    });

    it('should identify SURVEY data type from patient-reported outcomes', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Quality of Life',
          definition: 'Patient-reported quality of life',
          measurement_tool: 'EQ-5D-5L questionnaire',
          measurement_timing: 'Baseline, 12 months',
        },
        secondary: [],
      };

      const design: StudyDesign = {
        type: 'COHORT',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const dataTypes = determineDataTypes(outcomes, design);

      expect(dataTypes).toContain('SURVEY');
    });

    it('should identify QUALITATIVE data type from interview outcomes', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Patient Experience',
          definition: 'Qualitative understanding of patient experience',
          measurement_tool: 'Semi-structured interview',
          measurement_timing: 'Post-intervention',
        },
        secondary: [],
      };

      const design: StudyDesign = {
        type: 'QUALITATIVE',
        reporting_guideline: 'SRQR',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Test design',
      };

      const dataTypes = determineDataTypes(outcomes, design);

      expect(dataTypes).toContain('QUALITATIVE');
    });

    it('should identify ADMINISTRATIVE data type from length of stay', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Hospital Length of Stay',
          definition: 'Days from admission to discharge',
          measurement_tool: 'Administrative data extraction',
          measurement_timing: 'At discharge',
        },
        secondary: [],
      };

      const design: StudyDesign = {
        type: 'QUASI_EXPERIMENTAL',
        reporting_guideline: 'TREND',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const dataTypes = determineDataTypes(outcomes, design);

      expect(dataTypes).toContain('ADMINISTRATIVE');
    });

    it('should identify BIOLOGICAL data type from specimen collection', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Biomarker Levels',
          definition: 'Serum biomarker concentration',
          measurement_tool: 'Biological sample analysis',
          measurement_timing: 'Baseline, 6 months',
        },
        secondary: [],
      };

      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        blinding_type: 'DOUBLE',
        requires_sample_size: true,
        justification: 'Test design',
      };

      const dataTypes = determineDataTypes(outcomes, design);

      expect(dataTypes).toContain('BIOLOGICAL');
    });
  });

  describe('checkIdentifiableData', () => {
    it('should return true for CLINICAL data types', () => {
      const procedures: ProcedureSpec = {
        overview: 'Standard clinical procedures',
        step_by_step_protocol: [],
        quality_assurance_measures: [],
      };

      const hasIdentifiable = checkIdentifiableData(['CLINICAL'], procedures);

      expect(hasIdentifiable).toBe(true);
    });

    it('should return true for ADMINISTRATIVE data types', () => {
      const procedures: ProcedureSpec = {
        overview: 'Administrative data extraction',
        step_by_step_protocol: [],
        quality_assurance_measures: [],
      };

      const hasIdentifiable = checkIdentifiableData(['ADMINISTRATIVE'], procedures);

      expect(hasIdentifiable).toBe(true);
    });

    it('should return true for BIOLOGICAL data types', () => {
      const procedures: ProcedureSpec = {
        overview: 'Biological specimen collection',
        step_by_step_protocol: [],
        quality_assurance_measures: [],
      };

      const hasIdentifiable = checkIdentifiableData(['BIOLOGICAL'], procedures);

      expect(hasIdentifiable).toBe(true);
    });

    it('should return true when procedures mention MRN', () => {
      const procedures: ProcedureSpec = {
        overview: 'Collect patient data using MRN for linkage',
        step_by_step_protocol: [],
        quality_assurance_measures: [],
      };

      const hasIdentifiable = checkIdentifiableData(['SURVEY'], procedures);

      expect(hasIdentifiable).toBe(true);
    });

    it('should return false for anonymous survey data', () => {
      const procedures: ProcedureSpec = {
        overview: 'Anonymous survey collection without identifiers',
        step_by_step_protocol: [],
        quality_assurance_measures: [],
      };

      const hasIdentifiable = checkIdentifiableData(['SURVEY'], procedures);

      expect(hasIdentifiable).toBe(false);
    });
  });

  describe('suggestInstruments', () => {
    it('should suggest VAS for pain outcomes', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Pain Intensity',
          definition: 'Self-reported pain intensity',
          measurement_tool: 'Pain assessment scale',
          measurement_timing: 'Baseline, weekly',
        },
        secondary: [],
      };

      const instruments = suggestInstruments(outcomes);

      expect(instruments.some(i => i.name.includes('VAS'))).toBe(true);
      expect(instruments.some(i => i.validated === true)).toBe(true);
    });

    it('should suggest EQ-5D for quality of life outcomes', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Quality of Life',
          definition: 'Health-related quality of life',
          measurement_tool: 'QoL questionnaire',
          measurement_timing: 'Baseline, 6 months',
        },
        secondary: [],
      };

      const instruments = suggestInstruments(outcomes);

      expect(instruments.some(i => i.name.includes('EQ-5D'))).toBe(true);
    });

    it('should suggest PHQ-9 for depression outcomes', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Depression Severity',
          definition: 'Depressive symptom severity',
          measurement_tool: 'Depression scale',
          measurement_timing: 'Baseline, monthly',
        },
        secondary: [],
      };

      const instruments = suggestInstruments(outcomes);

      expect(instruments.some(i => i.name.includes('PHQ-9'))).toBe(true);
    });

    it('should include specified measurement tools', () => {
      const outcomes: OutcomeSpec = {
        primary: {
          name: 'Functional Status',
          definition: 'Functional independence',
          measurement_tool: 'Barthel Index',
          measurement_timing: 'Baseline, discharge',
        },
        secondary: [
          {
            name: 'Mobility',
            definition: 'Mobility assessment',
            measurement_tool: 'Timed Up and Go Test',
            measurement_timing: 'Baseline, weekly',
          },
        ],
      };

      const instruments = suggestInstruments(outcomes);

      expect(instruments.some(i => i.name === 'Barthel Index')).toBe(true);
      expect(instruments.some(i => i.name === 'Timed Up and Go Test')).toBe(true);
    });
  });

  describe('defineCollectionTimepoints', () => {
    it('should define appropriate timepoints for RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        blinding_type: 'DOUBLE',
        requires_sample_size: true,
        justification: 'Test design',
      };

      const timepoints = defineCollectionTimepoints(design);

      expect(timepoints).toContain('Baseline');
      expect(timepoints.length).toBeGreaterThan(1);
      expect(timepoints.some(t => t.includes('month'))).toBe(true);
    });

    it('should define single timepoint for cross-sectional study', () => {
      const design: StudyDesign = {
        type: 'CROSS_SECTIONAL',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const timepoints = defineCollectionTimepoints(design);

      expect(timepoints).toEqual(['Single assessment']);
    });

    it('should define retrospective timepoint for case-control', () => {
      const design: StudyDesign = {
        type: 'CASE_CONTROL',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const timepoints = defineCollectionTimepoints(design);

      expect(timepoints).toEqual(['Baseline (retrospective)']);
    });

    it('should define PDSA cycle timepoints for QI study', () => {
      const design: StudyDesign = {
        type: 'PDSA_CYCLE',
        reporting_guideline: 'SQUIRE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Test design',
      };

      const timepoints = defineCollectionTimepoints(design);

      expect(timepoints).toContain('Baseline');
      expect(timepoints.some(t => t.includes('Cycle'))).toBe(true);
    });

    it('should define cohort timepoints with long-term follow-up', () => {
      const design: StudyDesign = {
        type: 'COHORT',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const timepoints = defineCollectionTimepoints(design);

      expect(timepoints).toContain('Baseline');
      expect(timepoints.some(t => t.includes('24 months'))).toBe(true);
    });
  });

  describe('planMissingDataHandling', () => {
    it('should recommend ITT with imputation for RCT', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        blinding_type: 'DOUBLE',
        requires_sample_size: true,
        justification: 'Test design',
      };

      const strategy = planMissingDataHandling(design, ['CLINICAL', 'SURVEY']);

      expect(strategy.toLowerCase()).toContain('intention-to-treat');
      expect(strategy.toLowerCase()).toContain('multiple imputation');
    });

    it('should recommend mixed-effects models for cohort', () => {
      const design: StudyDesign = {
        type: 'COHORT',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const strategy = planMissingDataHandling(design, ['CLINICAL']);

      expect(strategy.toLowerCase()).toContain('mixed-effects');
    });

    it('should recommend run charts for QI study', () => {
      const design: StudyDesign = {
        type: 'PDSA_CYCLE',
        reporting_guideline: 'SQUIRE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Test design',
      };

      const strategy = planMissingDataHandling(design, ['CLINICAL']);

      expect(strategy.toLowerCase()).toContain('run chart');
    });

    it('should include survey-specific strategies', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const strategy = planMissingDataHandling(design, ['SURVEY']);

      expect(strategy.toLowerCase()).toContain('item-level imputation');
    });

    it('should include qualitative data handling', () => {
      const design: StudyDesign = {
        type: 'MIXED_METHODS',
        reporting_guideline: 'GRAMMS',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Test design',
      };

      const strategy = planMissingDataHandling(design, ['QUALITATIVE', 'SURVEY']);

      expect(strategy.toLowerCase()).toContain('qualitative');
      expect(strategy.toLowerCase()).toContain('saturation');
    });

    it('should include attrition documentation', () => {
      const design: StudyDesign = {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        blinding_type: 'DOUBLE',
        requires_sample_size: true,
        justification: 'Test design',
      };

      const strategy = planMissingDataHandling(design, ['CLINICAL']);

      expect(strategy.toLowerCase()).toContain('attrition');
      expect(strategy.toLowerCase()).toContain('withdrawal');
    });
  });
});
