/**
 * Data Governance Planning - Example Usage
 * Phase 7.5 - Demonstrates data governance planning functions
 */

import type { DataCollectionSpec, StudyDesign, Site } from '../../types/index.js';
import {
  planDataGovernance,
  classifyDataTypes,
  getStorageRequirements,
  calculateRetentionPeriod,
  determineDisposalMethod,
  planDataTransfer,
  checkPrivacyCompliance,
} from './data-governance.js';

/**
 * Example 1: Single-site RCT with identifiable clinical data
 */
async function example1_ClinicalTrial() {
  console.log('\n=== Example 1: Clinical Trial Data Governance ===\n');

  const dataCollection: DataCollectionSpec = {
    data_types: ['CLINICAL', 'ADMINISTRATIVE', 'SURVEY'],
    includes_identifiable_data: true,
    instruments: [
      {
        name: 'Visual Analog Scale (VAS) for Pain',
        type: 'Clinical scale',
        validated: true,
        source: 'Hawker et al., 2011, J Rheumatol',
      },
      {
        name: 'EQ-5D-5L',
        type: 'Quality of life questionnaire',
        validated: true,
        source: 'EuroQol Group',
      },
      {
        name: 'Hospital anxiety data',
        type: 'Administrative data',
        validated: false,
      },
    ],
    collection_timepoints: ['Baseline', 'Week 4', 'Week 12', '6 months'],
    missing_data_handling:
      'Intention-to-treat analysis with multiple imputation for missing outcome data; Sensitivity analyses using complete case analysis',
  };

  const methodology = {
    study_design: {
      type: 'RCT',
      reporting_guideline: 'CONSORT',
      is_randomised: true,
      is_blinded: true,
      blinding_type: 'DOUBLE' as const,
      control_type: 'PLACEBO' as const,
      requires_sample_size: true,
      justification: 'Randomised controlled trial to test intervention effectiveness',
    },
  };

  const sites: Site[] = [
    {
      name: 'Metro North Health',
      type: 'PRIMARY',
      location: 'Brisbane, Queensland',
      capacity: 'Emergency Department sees 70,000 patients annually',
    },
  ];

  // Generate complete data governance plan
  const governance = await planDataGovernance(dataCollection, methodology, sites);

  console.log('Data Classification:', governance.data_types);
  console.log('\nStorage Location:', governance.storage_requirements.location);
  console.log('Encryption Required:', governance.storage_requirements.encryption);
  console.log('\nAccess Controls:');
  governance.storage_requirements.access_controls.forEach((control, idx) => {
    console.log(`  ${idx + 1}. ${control}`);
  });
  console.log('\nBackup Strategy:', governance.storage_requirements.backup_strategy);
  console.log('\nRetention Period:', governance.retention_period);
  console.log('\nDisposal Method:', governance.disposal_method);
  console.log('\nPrivacy Compliance:');
  console.log('  - Privacy Act 1988:', governance.privacy_compliance.privacy_act_1988);
  console.log(
    '  - Information Privacy Act 2009 (QLD):',
    governance.privacy_compliance.information_privacy_act_2009_qld
  );
  console.log('  - GDPR Applicable:', governance.privacy_compliance.gdpr_applicable);
  console.log('\nData Breach Response Plan:');
  console.log(governance.data_breach_response_plan);
}

/**
 * Example 2: Multi-site cohort study with data transfer requirements
 */
async function example2_MultiSiteCohort() {
  console.log('\n\n=== Example 2: Multi-Site Cohort Study Data Governance ===\n');

  const dataCollection: DataCollectionSpec = {
    data_types: ['CLINICAL', 'BIOLOGICAL', 'ADMINISTRATIVE'],
    includes_identifiable_data: true,
    instruments: [
      {
        name: 'Blood samples for biomarker analysis',
        type: 'Biological specimen',
        validated: false,
      },
      {
        name: 'Clinical disease severity score',
        type: 'Clinical scale',
        validated: true,
        source: 'Published instrument',
      },
    ],
    collection_timepoints: ['Baseline', '6 months', '12 months', '24 months'],
    missing_data_handling:
      'Mixed-effects models to handle missing longitudinal data; Multiple imputation for baseline covariates',
  };

  const methodology = {
    study_design: {
      type: 'COHORT',
      subtype: 'PROSPECTIVE',
      reporting_guideline: 'STROBE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: true,
      justification: 'Prospective cohort study to examine disease progression',
    },
  };

  const sites: Site[] = [
    {
      name: 'Metro North Health',
      type: 'PRIMARY',
      location: 'Brisbane, Queensland',
      capacity: 'Large tertiary hospital with research infrastructure',
    },
    {
      name: 'Gold Coast University Hospital',
      type: 'SECONDARY',
      location: 'Gold Coast, Queensland',
      capacity: 'Tertiary hospital with specialist services',
    },
    {
      name: 'Royal Melbourne Hospital',
      type: 'SECONDARY',
      location: 'Melbourne, Victoria',
      capacity: 'Major metropolitan teaching hospital',
    },
  ];

  const governance = await planDataGovernance(dataCollection, methodology, sites);

  console.log('Data Classification:', governance.data_types);
  console.log('\nRetention Period:', governance.retention_period);
  console.log('\nData Transfer Plan:');
  if (governance.data_transfer_plan) {
    console.log('  Recipient:', governance.data_transfer_plan.recipient);
    console.log('  Method:', governance.data_transfer_plan.method);
    console.log('  Security Measures:');
    governance.data_transfer_plan.security_measures.forEach((measure, idx) => {
      console.log(`    ${idx + 1}. ${measure}`);
    });
  }
  console.log('\nPrivacy Compliance:');
  console.log('  - Privacy Act 1988:', governance.privacy_compliance.privacy_act_1988);
  console.log(
    '  - Information Privacy Act 2009 (QLD):',
    governance.privacy_compliance.information_privacy_act_2009_qld
  );
}

/**
 * Example 3: QI project with de-identified survey data
 */
async function example3_QIProject() {
  console.log('\n\n=== Example 3: QI Project Data Governance ===\n');

  const dataCollection: DataCollectionSpec = {
    data_types: ['SURVEY', 'ADMINISTRATIVE'],
    includes_identifiable_data: false,
    instruments: [
      {
        name: 'Patient Satisfaction Questionnaire (PSQ-18)',
        type: 'Patient-reported outcome',
        validated: true,
        source: 'Marshall & Hays, 1994',
      },
      {
        name: 'Wait time data from hospital records',
        type: 'Administrative data',
        validated: false,
      },
    ],
    collection_timepoints: ['End of Cycle 1', 'End of Cycle 2', 'End of Cycle 3'],
    missing_data_handling:
      'Run charts with missing data points excluded; Document reasons for missing data at each cycle',
  };

  const methodology = {
    study_design: {
      type: 'QI_PDSA',
      reporting_guideline: 'SQUIRE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'Quality improvement project using PDSA cycles',
    },
  };

  const sites: Site[] = [
    {
      name: 'Metro North Health Emergency Department',
      type: 'PRIMARY',
      location: 'Brisbane, Queensland',
      capacity: 'ED sees 70,000 patients annually',
    },
  ];

  // Demonstrate individual functions
  console.log('Data Classification:');
  const dataTypes = classifyDataTypes(dataCollection);
  console.log(' ', dataTypes);

  console.log('\nStorage Requirements:');
  const storage = getStorageRequirements(dataTypes, sites[0].name);
  console.log('  Location:', storage.location);
  console.log('  Encryption:', storage.encryption);
  console.log('  Access Controls:', storage.access_controls.length, 'controls defined');

  console.log('\nRetention Period:');
  const retention = calculateRetentionPeriod(methodology.study_design);
  console.log(' ', retention);

  console.log('\nDisposal Method:');
  const disposal = determineDisposalMethod(dataTypes);
  console.log(' ', disposal);

  console.log('\nPrivacy Compliance:');
  const compliance = checkPrivacyCompliance(dataTypes, sites);
  console.log('  - Privacy Act 1988:', compliance.privacy_act_1988);
  console.log(
    '  - Information Privacy Act 2009 (QLD):',
    compliance.information_privacy_act_2009_qld
  );
  console.log('  - GDPR Applicable:', compliance.gdpr_applicable);
}

/**
 * Example 4: Anonymous survey study
 */
async function example4_AnonymousSurvey() {
  console.log('\n\n=== Example 4: Anonymous Survey Data Governance ===\n');

  const dataCollection: DataCollectionSpec = {
    data_types: ['SURVEY'],
    includes_identifiable_data: false,
    instruments: [
      {
        name: 'Anonymous staff satisfaction survey',
        type: 'Survey',
        validated: false,
      },
    ],
    collection_timepoints: ['Single assessment'],
    missing_data_handling: 'Complete case analysis',
  };

  const methodology = {
    study_design: {
      type: 'CROSS_SECTIONAL',
      reporting_guideline: 'STROBE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'Cross-sectional survey of staff perceptions',
    },
  };

  const sites: Site[] = [
    {
      name: 'Queensland Health Statewide',
      type: 'PRIMARY',
      location: 'Queensland',
      capacity: 'All Queensland Health facilities',
    },
  ];

  const governance = await planDataGovernance(dataCollection, methodology, sites);

  console.log('Data Classification:', governance.data_types);
  console.log('Storage Encryption Required:', governance.storage_requirements.encryption);
  console.log('Retention Period:', governance.retention_period);
  console.log('\nPrivacy Compliance:');
  console.log('  All privacy regulations:', governance.privacy_compliance);
  console.log('\n(Note: Minimal privacy requirements for anonymous data)');
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await example1_ClinicalTrial();
    await example2_MultiSiteCohort();
    await example3_QIProject();
    await example4_AnonymousSurvey();

    console.log('\n\n=== All Examples Completed Successfully ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
    throw error;
  }
}

// Run examples if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export { example1_ClinicalTrial, example2_MultiSiteCohort, example3_QIProject, example4_AnonymousSurvey };
