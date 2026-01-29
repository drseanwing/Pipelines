/**
 * Analysis Plan Development - Example Usage
 * Phase 6.8 - Demonstrates analysis plan generation
 */

import {
  developAnalysisPlan,
  selectPrimaryAnalysisMethod,
  generateSecondaryAnalyses,
  planSensitivityAnalyses,
  planSubgroupAnalyses,
  selectMissingDataStrategy,
  recommendStatisticalSoftware,
  determineOutcomeType,
  determineNumberOfGroups,
  isRepeatedMeasuresDesign,
  isClusteredDesign,
} from './analysis.js';
import type {
  StudyDesign,
  OutcomeSpec,
  SampleSize,
} from '../../types/methodology.js';

/**
 * Example 1: Simple RCT with continuous outcome
 */
async function exampleSimpleRCT() {
  console.log('\n=== Example 1: Simple RCT with Continuous Outcome ===\n');

  const studyDesign: StudyDesign = {
    type: 'RCT',
    reporting_guideline: 'CONSORT',
    is_randomised: true,
    is_blinded: true,
    blinding_type: 'DOUBLE',
    control_type: 'PLACEBO',
    requires_sample_size: true,
    justification: 'Testing new pain intervention vs placebo',
  };

  const outcomes: OutcomeSpec = {
    primary: {
      name: 'Pain intensity',
      definition: 'Patient-reported pain intensity on a numeric rating scale',
      measurement_tool: 'Numeric Rating Scale (NRS) 0-10',
      measurement_timing: 'Baseline, 4 weeks, 8 weeks, 12 weeks',
      clinically_meaningful_difference: 2.0,
    },
    secondary: [
      {
        name: 'Physical function',
        definition: 'Physical functioning and independence in daily activities',
        measurement_tool: 'Functional Independence Measure (FIM)',
        measurement_timing: 'Baseline, 12 weeks',
      },
      {
        name: 'Quality of life',
        definition: 'Health-related quality of life',
        measurement_tool: 'SF-36 Health Survey',
        measurement_timing: 'Baseline, 12 weeks',
      },
    ],
  };

  const sampleSize: SampleSize = {
    target: 120,
    calculation_method: 'POWER_ANALYSIS',
    assumptions: {
      effect_size: 0.5,
      power: 0.80,
      alpha: 0.05,
      attrition_rate: 0.15,
    },
    justification: 'Based on Cohen d=0.5, 80% power, 5% alpha, 15% attrition',
  };

  // Generate analysis plan using helper functions
  const primaryMethod = selectPrimaryAnalysisMethod(studyDesign, outcomes.primary);
  console.log('Primary Analysis Method:', primaryMethod);

  const secondaryAnalyses = generateSecondaryAnalyses(outcomes, studyDesign);
  console.log('\nSecondary Analyses:');
  secondaryAnalyses.forEach((analysis, idx) => {
    console.log(`  ${idx + 1}. ${analysis}`);
  });

  const sensitivityAnalyses = planSensitivityAnalyses(studyDesign);
  console.log('\nSensitivity Analyses:');
  sensitivityAnalyses.forEach((analysis, idx) => {
    console.log(`  ${idx + 1}. ${analysis}`);
  });

  const subgroupAnalyses = planSubgroupAnalyses(studyDesign, 'Adults aged 18-65 with chronic pain');
  console.log('\nSubgroup Analyses:');
  subgroupAnalyses.forEach((analysis, idx) => {
    console.log(`  ${idx + 1}. ${analysis}`);
  });

  const missingDataStrategy = selectMissingDataStrategy(studyDesign, ['CLINICAL', 'SURVEY']);
  console.log('\nMissing Data Strategy:', missingDataStrategy);

  const software = recommendStatisticalSoftware([primaryMethod, ...secondaryAnalyses]);
  console.log('\nRecommended Software:', software);

  // Generate complete analysis plan with LLM (commented out to avoid API calls)
  // const analysisPlan = await developAnalysisPlan(studyDesign, outcomes, sampleSize);
  // console.log('\nComplete Analysis Plan:', JSON.stringify(analysisPlan, null, 2));
}

/**
 * Example 2: Cluster RCT with binary outcome
 */
function exampleClusterRCT() {
  console.log('\n=== Example 2: Cluster RCT with Binary Outcome ===\n');

  const studyDesign: StudyDesign = {
    type: 'RCT',
    subtype: 'CLUSTER_RCT',
    reporting_guideline: 'CONSORT',
    is_randomised: true,
    is_blinded: false,
    control_type: 'USUAL_CARE',
    requires_sample_size: true,
    justification: 'Hospital-level randomization to test new protocol',
  };

  const outcomes: OutcomeSpec = {
    primary: {
      name: '30-day hospital readmission',
      definition: 'Unplanned hospital readmission within 30 days of discharge',
      measurement_tool: 'Administrative data review',
      measurement_timing: '30 days post-discharge',
    },
    secondary: [
      {
        name: 'Length of stay',
        definition: 'Hospital length of stay in days',
        measurement_tool: 'Electronic health records',
        measurement_timing: 'At discharge',
      },
      {
        name: 'Patient satisfaction',
        definition: 'Patient satisfaction with care',
        measurement_tool: 'HCAHPS survey',
        measurement_timing: 'Post-discharge',
      },
    ],
  };

  console.log('Study characteristics:');
  console.log('  Outcome type:', determineOutcomeType(outcomes.primary));
  console.log('  Number of groups:', determineNumberOfGroups(studyDesign));
  console.log('  Repeated measures:', isRepeatedMeasuresDesign(studyDesign));
  console.log('  Clustered design:', isClusteredDesign(studyDesign));

  const primaryMethod = selectPrimaryAnalysisMethod(studyDesign, outcomes.primary);
  console.log('\nPrimary Analysis Method:', primaryMethod);

  const secondaryAnalyses = generateSecondaryAnalyses(outcomes, studyDesign);
  console.log('\nSecondary Analyses:');
  secondaryAnalyses.slice(0, 3).forEach((analysis, idx) => {
    console.log(`  ${idx + 1}. ${analysis}`);
  });

  const missingDataStrategy = selectMissingDataStrategy(studyDesign, ['ADMINISTRATIVE', 'SURVEY']);
  console.log('\nMissing Data Strategy:', missingDataStrategy);

  const software = recommendStatisticalSoftware([primaryMethod, ...secondaryAnalyses]);
  console.log('\nRecommended Software:', software);
}

/**
 * Example 3: Cohort study with time-to-event outcome
 */
function exampleCohortStudy() {
  console.log('\n=== Example 3: Cohort Study with Time-to-Event Outcome ===\n');

  const studyDesign: StudyDesign = {
    type: 'COHORT',
    subtype: 'PROSPECTIVE_COHORT',
    reporting_guideline: 'STROBE',
    is_randomised: false,
    is_blinded: false,
    requires_sample_size: false,
    justification: 'Observational study of risk factors for mortality',
  };

  const outcomes: OutcomeSpec = {
    primary: {
      name: 'Survival time',
      definition: 'Time from enrollment to death or end of 5-year follow-up',
      measurement_tool: 'Medical records and vital statistics',
      measurement_timing: 'Continuous monitoring for 5 years',
    },
    secondary: [
      {
        name: 'Disease progression',
        definition: 'Time to disease progression',
        measurement_tool: 'Clinical assessments',
        measurement_timing: 'Annual follow-up',
      },
    ],
  };

  console.log('Study characteristics:');
  console.log('  Outcome type:', determineOutcomeType(outcomes.primary));
  console.log('  Number of groups:', determineNumberOfGroups(studyDesign));
  console.log('  Repeated measures:', isRepeatedMeasuresDesign(studyDesign));

  const primaryMethod = selectPrimaryAnalysisMethod(studyDesign, outcomes.primary);
  console.log('\nPrimary Analysis Method:', primaryMethod);

  const secondaryAnalyses = generateSecondaryAnalyses(outcomes, studyDesign);
  console.log('\nSecondary Analyses:');
  secondaryAnalyses.slice(0, 3).forEach((analysis, idx) => {
    console.log(`  ${idx + 1}. ${analysis}`);
  });

  const sensitivityAnalyses = planSensitivityAnalyses(studyDesign);
  console.log('\nSensitivity Analyses:');
  sensitivityAnalyses.slice(0, 3).forEach((analysis, idx) => {
    console.log(`  ${idx + 1}. ${analysis}`);
  });

  const missingDataStrategy = selectMissingDataStrategy(studyDesign, ['CLINICAL']);
  console.log('\nMissing Data Strategy:', missingDataStrategy);

  const software = recommendStatisticalSoftware([primaryMethod, ...secondaryAnalyses]);
  console.log('\nRecommended Software:', software);
}

/**
 * Example 4: Quality Improvement PDSA cycle
 */
function exampleQualityImprovement() {
  console.log('\n=== Example 4: Quality Improvement PDSA Cycle ===\n');

  const studyDesign: StudyDesign = {
    type: 'PDSA_CYCLE',
    reporting_guideline: 'SQUIRE',
    is_randomised: false,
    is_blinded: false,
    requires_sample_size: false,
    justification: 'Quality improvement project with iterative testing',
  };

  const outcomes: OutcomeSpec = {
    primary: {
      name: 'Hand hygiene compliance',
      definition: 'Percentage of hand hygiene opportunities with proper hand hygiene',
      measurement_tool: 'Direct observation using WHO 5 Moments protocol',
      measurement_timing: 'Weekly audits during implementation',
    },
    secondary: [
      {
        name: 'Healthcare-associated infections',
        definition: 'Rate of HAIs per 1000 patient-days',
        measurement_tool: 'CDC/NHSN surveillance definitions',
        measurement_timing: 'Monthly surveillance',
      },
    ],
  };

  console.log('Study characteristics:');
  console.log('  Outcome type:', determineOutcomeType(outcomes.primary));
  console.log('  Repeated measures:', isRepeatedMeasuresDesign(studyDesign));

  const primaryMethod = selectPrimaryAnalysisMethod(studyDesign, outcomes.primary);
  console.log('\nPrimary Analysis Method:', primaryMethod);

  const secondaryAnalyses = generateSecondaryAnalyses(outcomes, studyDesign);
  console.log('\nSecondary Analyses:');
  secondaryAnalyses.slice(0, 3).forEach((analysis, idx) => {
    console.log(`  ${idx + 1}. ${analysis}`);
  });

  const software = recommendStatisticalSoftware([primaryMethod, ...secondaryAnalyses]);
  console.log('\nRecommended Software:', software);
}

// Run examples
async function runExamples() {
  try {
    await exampleSimpleRCT();
    exampleClusterRCT();
    exampleCohortStudy();
    exampleQualityImprovement();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}

export {
  exampleSimpleRCT,
  exampleClusterRCT,
  exampleCohortStudy,
  exampleQualityImprovement,
};
