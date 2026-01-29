/**
 * Data Governance Planning Tests
 * Phase 7.5 - Test data governance planning functions
 */

import { describe, it, expect } from 'vitest';
import type { DataCollectionSpec, StudyDesign, Site } from '../../types/index.js';
import {
  classifyDataTypes,
  getStorageRequirements,
  calculateRetentionPeriod,
  determineDisposalMethod,
  planDataTransfer,
  checkPrivacyCompliance,
  planDataGovernance,
} from './data-governance.js';

describe('classifyDataTypes', () => {
  it('should classify identifiable clinical data correctly', () => {
    const dataCollection: DataCollectionSpec = {
      data_types: ['CLINICAL', 'ADMINISTRATIVE'],
      includes_identifiable_data: true,
      instruments: [],
      collection_timepoints: ['Baseline'],
      missing_data_handling: 'Complete case analysis',
    };

    const result = classifyDataTypes(dataCollection);

    expect(result).toContain('IDENTIFIABLE');
    expect(result).toContain('RE_IDENTIFIABLE');
  });

  it('should classify de-identified survey data correctly', () => {
    const dataCollection: DataCollectionSpec = {
      data_types: ['SURVEY'],
      includes_identifiable_data: false,
      instruments: [],
      collection_timepoints: ['Baseline'],
      missing_data_handling: 'Complete case analysis',
    };

    const result = classifyDataTypes(dataCollection);

    expect(result).toContain('DE_IDENTIFIED');
  });

  it('should classify anonymous survey data correctly', () => {
    const dataCollection: DataCollectionSpec = {
      data_types: ['SURVEY'],
      includes_identifiable_data: false,
      instruments: [],
      collection_timepoints: ['Single assessment'],
      missing_data_handling: 'Complete case analysis',
    };

    const result = classifyDataTypes(dataCollection);

    expect(result).toContain('ANONYMOUS');
  });

  it('should classify re-identifiable administrative data correctly', () => {
    const dataCollection: DataCollectionSpec = {
      data_types: ['ADMINISTRATIVE'],
      includes_identifiable_data: false,
      instruments: [],
      collection_timepoints: ['Baseline'],
      missing_data_handling: 'Complete case analysis',
    };

    const result = classifyDataTypes(dataCollection);

    expect(result).toContain('RE_IDENTIFIABLE');
  });
});

describe('getStorageRequirements', () => {
  it('should require encryption for identifiable data', () => {
    const result = getStorageRequirements(
      ['IDENTIFIABLE'],
      'Metro North Health'
    );

    expect(result.encryption).toBe(true);
    expect(result.location).toContain('Secure REDCap');
    expect(result.access_controls).toContain(
      'Password-protected with multi-factor authentication'
    );
    expect(result.backup_strategy).toContain('Encrypted daily backups');
  });

  it('should have separate key storage for re-identifiable data', () => {
    const result = getStorageRequirements(
      ['RE_IDENTIFIABLE'],
      'Royal Melbourne Hospital'
    );

    expect(result.encryption).toBe(true);
    expect(result.access_controls.some((ac) => ac.includes('Separate storage of linking key'))).toBe(
      true
    );
  });

  it('should have minimal controls for de-identified data', () => {
    const result = getStorageRequirements(
      ['DE_IDENTIFIED'],
      'University of Queensland'
    );

    expect(result.encryption).toBe(false);
    expect(result.location).toContain('Institutional research server');
    expect(result.access_controls.length).toBeGreaterThan(0);
  });
});

describe('calculateRetentionPeriod', () => {
  it('should require 15 years for clinical trials', () => {
    const design: StudyDesign = {
      type: 'RCT',
      reporting_guideline: 'CONSORT',
      is_randomised: true,
      is_blinded: true,
      blinding_type: 'DOUBLE',
      control_type: 'PLACEBO',
      requires_sample_size: true,
      justification: 'Randomised trial',
    };

    const result = calculateRetentionPeriod(design);

    expect(result).toContain('15 years');
    expect(result).toContain('clinical trial');
  });

  it('should require 7 years for cohort studies', () => {
    const design: StudyDesign = {
      type: 'COHORT',
      subtype: 'PROSPECTIVE',
      reporting_guideline: 'STROBE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: true,
      justification: 'Cohort study',
    };

    const result = calculateRetentionPeriod(design);

    expect(result).toContain('7 years');
    expect(result).toContain('post-publication');
  });

  it('should require 7 years for QI projects', () => {
    const design: StudyDesign = {
      type: 'QI_PDSA',
      reporting_guideline: 'SQUIRE',
      is_randomised: false,
      is_blinded: false,
      requires_sample_size: false,
      justification: 'Quality improvement',
    };

    const result = calculateRetentionPeriod(design);

    expect(result).toContain('7 years');
    expect(result).toContain('QI project');
  });
});

describe('determineDisposalMethod', () => {
  it('should require secure deletion for identifiable data', () => {
    const result = determineDisposalMethod(['IDENTIFIABLE']);

    expect(result).toContain('7-pass overwrite');
    expect(result).toContain('cross-cut shredding');
    expect(result).toContain('Certificate of destruction');
  });

  it('should require key destruction for re-identifiable data', () => {
    const result = determineDisposalMethod(['RE_IDENTIFIABLE']);

    expect(result).toContain('destruction of linking key');
    expect(result).toContain('Secure deletion');
  });

  it('should use standard deletion for de-identified data', () => {
    const result = determineDisposalMethod(['DE_IDENTIFIED']);

    expect(result).toContain('Standard secure deletion');
    expect(result).not.toContain('7-pass');
  });
});

describe('planDataTransfer', () => {
  it('should return undefined for single-site studies', () => {
    const sites: Site[] = [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
    ];

    const result = planDataTransfer(sites);

    expect(result).toBeUndefined();
  });

  it('should create transfer plan for multi-site studies', () => {
    const sites: Site[] = [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
      {
        name: 'Gold Coast Health',
        type: 'SECONDARY',
        location: 'Gold Coast, Queensland',
        capacity: 'ED sees 50,000 patients annually',
      },
    ];

    const result = planDataTransfer(sites);

    expect(result).toBeDefined();
    expect(result?.recipient).toContain('Gold Coast Health');
    expect(result?.method).toContain('Encrypted');
    expect(result?.security_measures).toContain(
      'End-to-end encryption during transfer (AES-256)'
    );
  });

  it('should list all secondary sites as recipients', () => {
    const sites: Site[] = [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
      {
        name: 'Gold Coast Health',
        type: 'SECONDARY',
        location: 'Gold Coast, Queensland',
        capacity: 'ED sees 50,000 patients annually',
      },
      {
        name: 'Sunshine Coast Health',
        type: 'SECONDARY',
        location: 'Sunshine Coast, Queensland',
        capacity: 'ED sees 40,000 patients annually',
      },
    ];

    const result = planDataTransfer(sites);

    expect(result?.recipient).toContain('Gold Coast Health');
    expect(result?.recipient).toContain('Sunshine Coast Health');
  });
});

describe('checkPrivacyCompliance', () => {
  it('should flag Privacy Act 1988 for identifiable data', () => {
    const result = checkPrivacyCompliance(['IDENTIFIABLE'], [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
    ]);

    expect(result.privacy_act_1988).toBe(true);
  });

  it('should flag QLD privacy act for Queensland sites', () => {
    const result = checkPrivacyCompliance(['IDENTIFIABLE'], [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
    ]);

    expect(result.information_privacy_act_2009_qld).toBe(true);
  });

  it('should not flag QLD privacy act for non-Queensland sites', () => {
    const result = checkPrivacyCompliance(['IDENTIFIABLE'], [
      {
        name: 'Royal Melbourne Hospital',
        type: 'PRIMARY',
        location: 'Melbourne, Victoria',
        capacity: 'ED sees 80,000 patients annually',
      },
    ]);

    expect(result.information_privacy_act_2009_qld).toBe(false);
  });

  it('should not flag privacy acts for de-identified data', () => {
    const result = checkPrivacyCompliance(['DE_IDENTIFIED'], [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
    ]);

    expect(result.privacy_act_1988).toBe(false);
    expect(result.information_privacy_act_2009_qld).toBe(false);
  });

  it('should flag GDPR for international sites', () => {
    const result = checkPrivacyCompliance(['IDENTIFIABLE'], [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
      {
        name: 'University Hospital Munich',
        type: 'SECONDARY',
        location: 'Munich, Germany',
        capacity: 'Large academic hospital',
      },
    ]);

    expect(result.gdpr_applicable).toBe(true);
  });
});

describe('planDataGovernance (integration)', () => {
  it('should create complete governance plan for identifiable clinical study', async () => {
    const dataCollection: DataCollectionSpec = {
      data_types: ['CLINICAL', 'ADMINISTRATIVE'],
      includes_identifiable_data: true,
      instruments: [
        {
          name: 'VAS Pain Scale',
          type: 'Clinical scale',
          validated: true,
          source: 'Hawker et al., 2011',
        },
      ],
      collection_timepoints: ['Baseline', '3 months', '6 months'],
      missing_data_handling: 'Multiple imputation',
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
        justification: 'RCT for pain intervention',
      },
    };

    const sites: Site[] = [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
    ];

    const result = await planDataGovernance(dataCollection, methodology, sites);

    expect(result.data_types).toContain('IDENTIFIABLE');
    expect(result.storage_requirements.encryption).toBe(true);
    expect(result.retention_period).toContain('15 years');
    expect(result.disposal_method).toContain('7-pass overwrite');
    expect(result.privacy_compliance.privacy_act_1988).toBe(true);
    expect(result.privacy_compliance.information_privacy_act_2009_qld).toBe(true);
    expect(result.data_breach_response_plan).toBeTruthy();
    expect(result.data_breach_response_plan.length).toBeGreaterThan(100);
  }, 30000); // 30 second timeout for LLM call

  it('should create complete governance plan for multi-site study', async () => {
    const dataCollection: DataCollectionSpec = {
      data_types: ['CLINICAL', 'SURVEY'],
      includes_identifiable_data: true,
      instruments: [
        {
          name: 'EQ-5D-5L',
          type: 'Quality of life',
          validated: true,
          source: 'EuroQol',
        },
      ],
      collection_timepoints: ['Baseline', '6 months'],
      missing_data_handling: 'Complete case analysis',
    };

    const methodology = {
      study_design: {
        type: 'COHORT',
        subtype: 'PROSPECTIVE',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Prospective cohort study',
      },
    };

    const sites: Site[] = [
      {
        name: 'Metro North Health',
        type: 'PRIMARY',
        location: 'Brisbane, Queensland',
        capacity: 'ED sees 70,000 patients annually',
      },
      {
        name: 'Gold Coast Health',
        type: 'SECONDARY',
        location: 'Gold Coast, Queensland',
        capacity: 'ED sees 50,000 patients annually',
      },
    ];

    const result = await planDataGovernance(dataCollection, methodology, sites);

    expect(result.data_transfer_plan).toBeDefined();
    expect(result.data_transfer_plan?.recipient).toContain('Gold Coast Health');
    expect(result.data_transfer_plan?.security_measures.length).toBeGreaterThan(5);
    expect(result.retention_period).toContain('7 years');
  }, 30000);
});
