/**
 * Example Usage of Outcome Definition Module
 * Phase 6.5 - Demonstrates outcome specification for different study types
 */

import {
  defineOutcomes,
  generatePrimaryOutcome,
  generateSecondaryOutcomes,
  suggestMeasurementTool,
  determineMeasurementTiming,
  estimateClinicallyMeaningfulDifference,
  determineReportingGuideline,
} from './outcomes.js';
import type { StudyDesign } from '../../types/methodology.js';

/**
 * Example 1: Define outcomes for an RCT studying pain management
 */
async function exampleRCTPainStudy() {
  console.log('\n=== Example 1: RCT Pain Management Study ===\n');

  const intendedOutcomes = `
    Primary: Reduce chronic lower back pain intensity
    Secondary:
    - Improve functional status and mobility
    - Reduce opioid medication use
    - Enhance quality of life
    - Monitor adverse events
  `;

  const studyDesign: StudyDesign = {
    type: 'RCT',
    subtype: 'PARALLEL_GROUP',
    reporting_guideline: 'CONSORT',
    is_randomised: true,
    is_blinded: true,
    blinding_type: 'DOUBLE',
    control_type: 'PLACEBO',
    requires_sample_size: true,
    justification: 'Gold standard design for evaluating intervention efficacy',
  };

  const outcomes = await defineOutcomes(intendedOutcomes, studyDesign);

  console.log('Primary Outcome:');
  console.log(`  Name: ${outcomes.primary.name}`);
  console.log(`  Definition: ${outcomes.primary.definition}`);
  console.log(`  Tool: ${outcomes.primary.measurement_tool}`);
  console.log(`  Timing: ${outcomes.primary.measurement_timing}`);
  console.log(`  MCID: ${outcomes.primary.clinically_meaningful_difference}`);

  console.log('\nSecondary Outcomes:');
  outcomes.secondary.forEach((outcome, idx) => {
    console.log(`  ${idx + 1}. ${outcome.name}`);
    console.log(`     Tool: ${outcome.measurement_tool}`);
  });
}

/**
 * Example 2: Define outcomes for a quality improvement PDSA cycle
 */
async function exampleQIPDSAStudy() {
  console.log('\n=== Example 2: QI PDSA Cycle - Reducing Readmissions ===\n');

  const intendedOutcomes = `
    Reduce 30-day hospital readmissions for heart failure patients through
    enhanced discharge planning and follow-up care coordination.
  `;

  const studyDesign: StudyDesign = {
    type: 'PDSA_CYCLE',
    reporting_guideline: 'SQUIRE',
    is_randomised: false,
    is_blinded: false,
    requires_sample_size: false,
    justification: 'Iterative quality improvement methodology',
  };

  const outcomes = await defineOutcomes(intendedOutcomes, studyDesign);

  console.log('Outcomes Specification:');
  console.log(`  Reporting Guideline: ${determineReportingGuideline(studyDesign)}`);
  console.log(`  Primary: ${outcomes.primary.name}`);
  console.log(`  Measurement: ${outcomes.primary.measurement_tool}`);
  console.log(`  Timing: ${outcomes.primary.measurement_timing}`);
}

/**
 * Example 3: Suggest measurement tools for various outcomes
 */
function exampleMeasurementTools() {
  console.log('\n=== Example 3: Measurement Tool Suggestions ===\n');

  const outcomes = [
    'depression severity',
    'anxiety symptoms',
    'health-related quality of life',
    'functional independence',
    'pain intensity',
    'blood pressure control',
    'diabetes management',
    'patient satisfaction',
  ];

  outcomes.forEach(outcome => {
    const tool = suggestMeasurementTool(outcome);
    console.log(`${outcome.padEnd(35)} → ${tool}`);
  });
}

/**
 * Example 4: Determine measurement timing for different study designs
 */
function exampleMeasurementTiming() {
  console.log('\n=== Example 4: Measurement Timing by Design ===\n');

  const designs: Array<{ name: string; design: StudyDesign; duration?: string }> = [
    {
      name: '3-month RCT',
      design: {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Short-term efficacy',
      },
      duration: '3 months',
    },
    {
      name: '12-month RCT',
      design: {
        type: 'RCT',
        reporting_guideline: 'CONSORT',
        is_randomised: true,
        is_blinded: true,
        requires_sample_size: true,
        justification: 'Long-term efficacy',
      },
      duration: '1 year',
    },
    {
      name: 'Prospective Cohort',
      design: {
        type: 'PROSPECTIVE_COHORT',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Observational follow-up',
      },
    },
    {
      name: 'Cross-Sectional Survey',
      design: {
        type: 'CROSS_SECTIONAL',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'Point prevalence',
      },
    },
  ];

  designs.forEach(({ name, design, duration }) => {
    const timing = determineMeasurementTiming(design, duration);
    console.log(`${name}:`);
    console.log(`  ${timing}\n`);
  });
}

/**
 * Example 5: Estimate clinically meaningful differences
 */
function exampleClinicalDifferences() {
  console.log('\n=== Example 5: Clinically Meaningful Differences ===\n');

  const outcomes = [
    'pain numeric rating scale',
    'SF-36 physical component score',
    'PHQ-9 depression score',
    'GAD-7 anxiety score',
    'HbA1c percentage',
    '6-minute walk test',
    'EQ-5D-5L index',
    'all-cause mortality',
  ];

  outcomes.forEach(outcome => {
    const mcid = estimateClinicallyMeaningfulDifference(outcome);
    const mcidStr = mcid !== undefined ? mcid.toString() : 'Not established';
    console.log(`${outcome.padEnd(35)} → ${mcidStr}`);
  });
}

/**
 * Example 6: Complete workflow for defining outcomes
 */
async function exampleCompleteWorkflow() {
  console.log('\n=== Example 6: Complete Outcome Definition Workflow ===\n');

  // Step 1: Define study design
  const studyDesign: StudyDesign = {
    type: 'RCT',
    subtype: 'CLUSTER_RCT',
    reporting_guideline: 'CONSORT',
    is_randomised: true,
    is_blinded: false,
    blinding_type: 'OPEN_LABEL',
    control_type: 'USUAL_CARE',
    requires_sample_size: true,
    justification: 'Cluster randomization by clinical site',
  };

  console.log('Step 1: Study Design');
  console.log(`  Type: ${studyDesign.type}`);
  console.log(`  Reporting: ${determineReportingGuideline(studyDesign)}`);

  // Step 2: Define intended outcomes
  const intendedOutcomes = `
    Evaluate the effectiveness of a multidisciplinary diabetes management program
    in improving glycemic control, reducing complications, and enhancing patient
    self-management skills.
  `;

  console.log('\nStep 2: Intended Outcomes');
  console.log(intendedOutcomes.trim());

  // Step 3: Generate outcomes
  console.log('\nStep 3: Generating Primary Outcome...');
  const primary = await generatePrimaryOutcome(intendedOutcomes, studyDesign);

  console.log(`  Name: ${primary.name}`);
  console.log(`  Definition: ${primary.definition}`);
  console.log(`  Tool: ${primary.measurement_tool}`);
  console.log(`  MCID: ${primary.clinically_meaningful_difference || 'N/A'}`);

  console.log('\nStep 4: Generating Secondary Outcomes...');
  const secondary = await generateSecondaryOutcomes(
    intendedOutcomes,
    studyDesign,
    4
  );

  secondary.forEach((outcome, idx) => {
    console.log(`\n  ${idx + 1}. ${outcome.name}`);
    console.log(`     Definition: ${outcome.definition}`);
    console.log(`     Tool: ${outcome.measurement_tool}`);
    console.log(`     Timing: ${outcome.measurement_timing}`);
  });

  // Step 5: Complete specification
  console.log('\nStep 5: Complete Outcomes Specification Generated ✓');
}

// Main execution
async function main() {
  try {
    // Run synchronous examples
    exampleMeasurementTools();
    exampleMeasurementTiming();
    exampleClinicalDifferences();

    // Run async examples (commented out to avoid API calls in example file)
    // Uncomment to test with actual LLM calls
    // await exampleRCTPainStudy();
    // await exampleQIPDSAStudy();
    // await exampleCompleteWorkflow();

    console.log('\n=== Examples completed successfully ===\n');
    console.log('Note: Async examples are commented out to avoid API calls.');
    console.log('Uncomment them in the code to test with actual LLM integration.\n');
  } catch (error) {
    console.error('Error running examples:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  exampleRCTPainStudy,
  exampleQIPDSAStudy,
  exampleMeasurementTools,
  exampleMeasurementTiming,
  exampleClinicalDifferences,
  exampleCompleteWorkflow,
};
