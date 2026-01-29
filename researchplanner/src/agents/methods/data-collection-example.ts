/**
 * Data Collection Planning - Example Usage
 * Phase 6.7 - Demonstrates data collection planning functionality
 */

import {
  planDataCollection,
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

/**
 * Example 1: Plan data collection for an RCT
 */
async function exampleRCTDataCollection() {
  console.log('\n=== Example 1: RCT Data Collection Planning ===\n');

  // Define study design
  const studyDesign: StudyDesign = {
    type: 'RCT',
    subtype: 'PARALLEL_GROUP',
    reporting_guideline: 'CONSORT',
    is_randomised: true,
    is_blinded: true,
    blinding_type: 'DOUBLE',
    control_type: 'PLACEBO',
    requires_sample_size: true,
    justification: 'Double-blind RCT to test efficacy of new intervention',
  };

  // Define outcomes
  const outcomes: OutcomeSpec = {
    primary: {
      name: 'Pain Intensity',
      definition: 'Change in pain intensity from baseline to 12 weeks',
      measurement_tool: 'Visual Analog Scale (VAS) for pain (0-100mm)',
      measurement_timing: 'Baseline, Week 4, Week 8, Week 12',
      clinically_meaningful_difference: 15,
    },
    secondary: [
      {
        name: 'Quality of Life',
        definition: 'Health-related quality of life',
        measurement_tool: 'EQ-5D-5L',
        measurement_timing: 'Baseline, Week 12',
      },
      {
        name: 'Functional Status',
        definition: 'Physical functional capacity',
        measurement_tool: 'Barthel Index',
        measurement_timing: 'Baseline, Week 6, Week 12',
      },
      {
        name: 'Adverse Events',
        definition: 'Number and severity of adverse events',
        measurement_tool: 'Clinical assessment and patient reporting',
        measurement_timing: 'Continuous monitoring throughout study',
      },
    ],
  };

  // Define procedures
  const procedures: ProcedureSpec = {
    overview:
      'Randomised double-blind placebo-controlled trial comparing new intervention to placebo',
    intervention_description:
      'Active intervention: New pharmaceutical compound administered daily for 12 weeks',
    control_description: 'Placebo: Matching placebo tablets administered daily for 12 weeks',
    step_by_step_protocol: [
      {
        step_number: 1,
        description: 'Screening and eligibility assessment',
        duration: '1 hour',
        responsible_party: 'Research Nurse',
      },
      {
        step_number: 2,
        description: 'Baseline assessment including outcome measures and blood tests',
        duration: '2 hours',
        responsible_party: 'Research Team',
      },
      {
        step_number: 3,
        description: 'Randomisation using central web-based system',
        duration: '10 minutes',
        responsible_party: 'Principal Investigator',
      },
      {
        step_number: 4,
        description: 'Dispense study medication/placebo',
        duration: '15 minutes',
        responsible_party: 'Research Pharmacist',
      },
      {
        step_number: 5,
        description: 'Follow-up assessments at weeks 4, 8, 12',
        duration: '1 hour per visit',
        responsible_party: 'Research Team',
      },
    ],
    quality_assurance_measures: [
      'Central randomisation to ensure allocation concealment',
      'Blinded outcome assessment',
      'Standard operating procedures for all assessments',
      'Regular monitoring visits',
    ],
  };

  // Define timeline
  const timeline: ProjectTimeline = {
    total_duration: '18 months',
    recruitment_period: '12 months',
    data_collection_period: '15 months',
    analysis_period: '3 months',
    milestones: [
      {
        name: 'Ethics approval',
        target_date: '2026-03-01',
        deliverable: 'HREC approval letter',
      },
      {
        name: 'First participant recruited',
        target_date: '2026-04-01',
        deliverable: 'First consent form signed',
      },
      {
        name: 'Recruitment complete',
        target_date: '2027-04-01',
        deliverable: 'Target sample size reached',
      },
      {
        name: 'Final follow-up complete',
        target_date: '2027-07-01',
        deliverable: 'Last participant 12-week assessment',
      },
    ],
  };

  // Plan data collection using LLM (commented out for non-API example)
  // const dataCollection = await planDataCollection(outcomes, procedures, studyDesign, timeline);

  // Use heuristic functions instead
  const dataTypes = determineDataTypes(outcomes, studyDesign);
  console.log('Data Types:', dataTypes);

  const hasIdentifiable = checkIdentifiableData(dataTypes, procedures);
  console.log('Includes Identifiable Data:', hasIdentifiable);

  const instruments = suggestInstruments(outcomes);
  console.log('\nSuggested Instruments:');
  instruments.forEach((inst) => {
    console.log(`  - ${inst.name} (${inst.type})`);
    console.log(`    Validated: ${inst.validated}`);
    if (inst.source) console.log(`    Source: ${inst.source}`);
  });

  const timepoints = defineCollectionTimepoints(studyDesign, timeline);
  console.log('\nCollection Timepoints:', timepoints);

  const missingDataStrategy = planMissingDataHandling(studyDesign, dataTypes);
  console.log('\nMissing Data Handling Strategy:');
  console.log(missingDataStrategy);

  // Construct complete data collection spec
  const dataCollectionSpec = {
    data_types: dataTypes,
    includes_identifiable_data: hasIdentifiable,
    instruments,
    collection_timepoints: timepoints,
    missing_data_handling: missingDataStrategy,
  };

  console.log('\n=== Complete Data Collection Specification ===');
  console.log(JSON.stringify(dataCollectionSpec, null, 2));
}

/**
 * Example 2: Plan data collection for a QI project
 */
function exampleQIDataCollection() {
  console.log('\n=== Example 2: QI Project Data Collection Planning ===\n');

  const studyDesign: StudyDesign = {
    type: 'PDSA_CYCLE',
    reporting_guideline: 'SQUIRE',
    is_randomised: false,
    is_blinded: false,
    requires_sample_size: false,
    justification: 'QI project using PDSA methodology',
  };

  const outcomes: OutcomeSpec = {
    primary: {
      name: 'Door-to-ECG Time',
      definition: 'Time from ED arrival to first ECG for chest pain patients',
      measurement_tool: 'Electronic medical record timestamps',
      measurement_timing: 'Continuous measurement throughout PDSA cycles',
      clinically_meaningful_difference: 5,
    },
    secondary: [
      {
        name: 'Staff Satisfaction',
        definition: 'Staff satisfaction with triage process',
        measurement_tool: 'Anonymous staff survey',
        measurement_timing: 'End of each PDSA cycle',
      },
    ],
  };

  const procedures: ProcedureSpec = {
    overview:
      'Iterative PDSA cycles to improve ED triage process for chest pain patients',
    step_by_step_protocol: [
      {
        step_number: 1,
        description: 'Measure baseline door-to-ECG times',
        duration: '4 weeks',
      },
      {
        step_number: 2,
        description: 'Implement triage process change (PDSA Cycle 1)',
        duration: '2 weeks',
      },
      {
        step_number: 3,
        description: 'Measure and analyze outcomes',
        duration: '2 weeks',
      },
      {
        step_number: 4,
        description: 'Refine and implement changes (PDSA Cycle 2)',
        duration: '2 weeks',
      },
    ],
    quality_assurance_measures: [
      'Regular data quality checks',
      'Staff training and feedback',
      'Weekly team meetings',
    ],
  };

  const dataTypes = determineDataTypes(outcomes, studyDesign);
  console.log('Data Types:', dataTypes);

  const hasIdentifiable = checkIdentifiableData(dataTypes, procedures);
  console.log('Includes Identifiable Data:', hasIdentifiable);

  const instruments = suggestInstruments(outcomes);
  console.log('\nSuggested Instruments:');
  instruments.forEach((inst) => {
    console.log(`  - ${inst.name} (${inst.type})`);
  });

  const timepoints = defineCollectionTimepoints(studyDesign);
  console.log('\nCollection Timepoints:', timepoints);

  const missingDataStrategy = planMissingDataHandling(studyDesign, dataTypes);
  console.log('\nMissing Data Handling Strategy:');
  console.log(missingDataStrategy);
}

/**
 * Example 3: Plan data collection for a cohort study
 */
function exampleCohortDataCollection() {
  console.log('\n=== Example 3: Cohort Study Data Collection Planning ===\n');

  const studyDesign: StudyDesign = {
    type: 'COHORT',
    subtype: 'PROSPECTIVE_COHORT',
    reporting_guideline: 'STROBE',
    is_randomised: false,
    is_blinded: false,
    requires_sample_size: true,
    justification: 'Prospective cohort to examine long-term outcomes',
  };

  const outcomes: OutcomeSpec = {
    primary: {
      name: 'Major Adverse Cardiac Events (MACE)',
      definition: 'Composite of cardiovascular death, MI, or stroke',
      measurement_tool: 'Medical record review and patient contact',
      measurement_timing: 'Baseline, 6 months, 12 months, 24 months, 60 months',
    },
    secondary: [
      {
        name: 'Biomarker Levels',
        definition: 'Serum biomarker concentration',
        measurement_tool: 'Laboratory analysis of blood samples',
        measurement_timing: 'Baseline, 12 months, 24 months',
      },
      {
        name: 'Quality of Life',
        definition: 'Health-related quality of life',
        measurement_tool: 'SF-36 Health Survey',
        measurement_timing: 'Baseline, 12 months, 24 months, 60 months',
      },
    ],
  };

  const procedures: ProcedureSpec = {
    overview:
      'Long-term prospective follow-up of patients to assess cardiovascular outcomes',
    step_by_step_protocol: [
      {
        step_number: 1,
        description: 'Baseline assessment including clinical data and biospecimens',
        duration: '2 hours',
      },
      {
        step_number: 2,
        description: 'Annual follow-up visits with outcome assessment',
        duration: '1 hour per visit',
      },
      {
        step_number: 3,
        description: 'Telephone follow-up between visits',
        duration: '15 minutes',
      },
    ],
    quality_assurance_measures: [
      'Standardized data collection protocols',
      'Regular quality checks',
      'Adjudication committee for outcome events',
    ],
  };

  const dataTypes = determineDataTypes(outcomes, studyDesign);
  console.log('Data Types:', dataTypes);

  const hasIdentifiable = checkIdentifiableData(dataTypes, procedures);
  console.log('Includes Identifiable Data:', hasIdentifiable);

  const instruments = suggestInstruments(outcomes);
  console.log('\nSuggested Instruments:');
  instruments.forEach((inst) => {
    console.log(`  - ${inst.name} (${inst.type})`);
  });

  const timepoints = defineCollectionTimepoints(studyDesign);
  console.log('\nCollection Timepoints:', timepoints);

  const missingDataStrategy = planMissingDataHandling(studyDesign, dataTypes);
  console.log('\nMissing Data Handling Strategy:');
  console.log(missingDataStrategy);
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await exampleRCTDataCollection();
    exampleQIDataCollection();
    exampleCohortDataCollection();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run examples
// runExamples();
