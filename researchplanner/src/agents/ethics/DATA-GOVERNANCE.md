# Data Governance Planning Module

**Module:** `src/agents/ethics/data-governance.ts`
**Phase:** 7.5
**Status:** Complete

## Overview

The Data Governance Planning module implements comprehensive data governance planning for healthcare research projects, covering data classification, storage, retention, disposal, privacy compliance, and breach response planning.

## Features Implemented

### 1. Data Classification (`classifyDataTypes`)

Classifies collected data into four categories based on identifiability:

- **IDENTIFIABLE**: Direct identifiers present (name, MRN, DOB)
- **RE_IDENTIFIABLE**: Coded data with key file linking to identifiers
- **DE_IDENTIFIED**: No direct identifiers, minimal re-identification risk
- **ANONYMOUS**: No identifiers, cannot be re-identified

**Logic:**
- Identifiable data → `IDENTIFIABLE` + `RE_IDENTIFIABLE` (if clinical/biological)
- No identifiers + clinical/admin → `RE_IDENTIFIABLE`
- No identifiers + survey/qualitative → `DE_IDENTIFIED`
- Anonymous surveys (no linkage) → `ANONYMOUS`

### 2. Storage Requirements (`getStorageRequirements`)

Determines storage specifications based on data sensitivity:

**For Identifiable Data:**
- Location: Secure REDCap server
- Encryption: Required (AES-256)
- Access Controls: MFA, role-based access, audit trail, PI approval for exports
- Backup: Encrypted daily backups to institutional server + offline monthly backups

**For Re-Identifiable Data:**
- Location: REDCap or institutional server
- Encryption: Required
- Access Controls: Separate key storage (PI only), team access to coded data only
- Backup: Encrypted backups with key separation

**For De-Identified Data:**
- Location: Institutional research server
- Encryption: Not required
- Access Controls: Password-protected, team member access with approval
- Backup: Standard institutional backups

### 3. Retention Period (`calculateRetentionPeriod`)

Calculates retention period per NHMRC and TGA guidelines:

| Study Type | Retention Period | Rationale |
|------------|------------------|-----------|
| Clinical Trials (RCT, TRIAL) | 15 years post-completion | TGA requirement for clinical trials |
| QI Projects (PDSA, QI) | 7 years post-completion | Institutional policy |
| Clinical Research (Cohort, Case-Control) | 7 years post-publication | NHMRC guidelines |
| Qualitative Research | 7 years post-publication | NHMRC guidelines |
| Default | 7 years post-publication or completion | NHMRC guidelines |

### 4. Disposal Method (`determineDisposalMethod`)

Specifies secure disposal procedures:

**For Identifiable Data:**
- 7-pass overwrite for electronic files (data sanitization software)
- Cross-cut shredding for paper records
- Physical destruction of backup media (degaussing)
- Certificate of destruction from IT services
- Audit trail of disposal maintained for 2 years

**For Re-Identifiable Data:**
- Secure deletion of data files
- Separate destruction of linking key (7-pass overwrite)
- Shredding of printed coded data
- Verification by IT services

**For De-Identified Data:**
- Standard secure deletion
- Shredding of printed materials
- Removal from backup systems

### 5. Data Transfer Planning (`planDataTransfer`)

Creates secure transfer plan for multi-site studies:

**Security Measures:**
- End-to-end encryption (AES-256)
- Password-protected encrypted files
- Institutional secure network or approved cloud (OneDrive, SharePoint)
- Data sharing agreement between sites
- Central data management by primary site
- No email transfer of identifiable data
- Audit trail of transfers
- Regular integrity verification

Returns `undefined` for single-site studies.

### 6. Breach Response Plan (`generateBreachResponsePlan`)

Uses LLM to generate comprehensive, context-specific data breach response plan covering:

1. **Immediate containment** (first 24 hours)
2. **Assessment and investigation**
3. **Notification requirements** (who and when)
4. **Remediation and mitigation**
5. **Documentation requirements**
6. **Prevention measures**

Response plan is tailored to data classification level (more comprehensive for identifiable data).

### 7. Privacy Compliance (`checkPrivacyCompliance`)

Determines applicable privacy legislation:

**Privacy Act 1988 (Commonwealth):**
- Applies to: All Australian health research with identifiable/re-identifiable data
- Triggered by: `IDENTIFIABLE` or `RE_IDENTIFIABLE` classification

**Information Privacy Act 2009 (QLD):**
- Applies to: Queensland public sector research
- Triggered by: Identifiable data + Queensland site (Metro North, Gold Coast, QLD Health)

**GDPR:**
- Applies to: Data involving EU residents or EU transfer
- Triggered by: Identifiable data + international (non-Australian) site

### 8. Orchestration (`planDataGovernance`)

Main function orchestrating all governance planning:

```typescript
async function planDataGovernance(
  dataCollection: DataCollectionSpec,
  methodology: { study_design: StudyDesign },
  sites: Site[]
): Promise<DataGovernanceSpec>
```

**Process:**
1. Classify data types
2. Determine storage requirements
3. Calculate retention period
4. Determine disposal method
5. Plan data transfer (if multi-site)
6. Generate breach response plan (LLM)
7. Check privacy compliance

**Returns:** Complete `DataGovernanceSpec` ready for ethics application.

## Usage Examples

### Example 1: Single-Site Clinical Trial

```typescript
const dataCollection = {
  data_types: ['CLINICAL', 'ADMINISTRATIVE'],
  includes_identifiable_data: true,
  instruments: [{ name: 'VAS Pain Scale', ... }],
  collection_timepoints: ['Baseline', 'Week 4', 'Week 12'],
  missing_data_handling: 'Multiple imputation'
};

const methodology = {
  study_design: {
    type: 'RCT',
    is_randomised: true,
    ...
  }
};

const sites = [
  { name: 'Metro North Health', type: 'PRIMARY', location: 'Brisbane, Queensland', ... }
];

const governance = await planDataGovernance(dataCollection, methodology, sites);

// Result:
// - data_types: ['IDENTIFIABLE', 'RE_IDENTIFIABLE']
// - storage: Secure REDCap with encryption
// - retention: 15 years (clinical trial)
// - privacy_act_1988: true
// - information_privacy_act_2009_qld: true
```

### Example 2: Multi-Site Cohort Study

```typescript
const sites = [
  { name: 'Metro North Health', type: 'PRIMARY', ... },
  { name: 'Gold Coast Health', type: 'SECONDARY', ... }
];

const governance = await planDataGovernance(dataCollection, methodology, sites);

// Result includes data transfer plan:
// - recipient: 'Gold Coast Health'
// - method: 'Encrypted REDCap data export/import or SFTP'
// - security_measures: [AES-256, password protection, audit trail, ...]
```

### Example 3: QI Project with De-Identified Data

```typescript
const dataCollection = {
  data_types: ['SURVEY'],
  includes_identifiable_data: false,
  ...
};

const methodology = {
  study_design: { type: 'QI_PDSA', ... }
};

const governance = await planDataGovernance(dataCollection, methodology, sites);

// Result:
// - data_types: ['DE_IDENTIFIED', 'ANONYMOUS']
// - storage: Institutional server (no encryption required)
// - retention: 7 years (QI project)
// - privacy_act_1988: false (de-identified)
```

## Compliance Standards

### NHMRC Guidelines
- 7-year retention for clinical research
- Data security and privacy requirements
- Disposal procedures

### TGA Guidelines
- 15-year retention for clinical trials
- GCP compliance for trial data

### Privacy Legislation
- **Privacy Act 1988**: Australian Privacy Principles (APPs)
- **Information Privacy Act 2009 (QLD)**: Information Privacy Principles (IPPs)
- **GDPR**: If international data transfer

### Institutional Policies
- REDCap for sensitive data
- MFA for identifiable data access
- IT-verified secure deletion

## Testing

Comprehensive test suite: `src/agents/ethics/data-governance.test.ts`

**Test Coverage:**
- Data classification for all data types
- Storage requirements for each classification level
- Retention period calculation for all study designs
- Disposal methods for each classification
- Data transfer planning (single vs multi-site)
- Privacy compliance checking (all legislations)
- Integration tests for complete governance planning

**Example Tests:**
```typescript
// Classification tests
expect(classifyDataTypes(identifiableData)).toContain('IDENTIFIABLE');
expect(classifyDataTypes(surveyData)).toContain('DE_IDENTIFIED');

// Storage tests
expect(getStorageRequirements(['IDENTIFIABLE'], 'Metro North').encryption).toBe(true);

// Retention tests
expect(calculateRetentionPeriod(rctDesign)).toContain('15 years');
expect(calculateRetentionPeriod(qiDesign)).toContain('7 years');

// Privacy tests
expect(checkPrivacyCompliance(['IDENTIFIABLE'], qldSites).privacy_act_1988).toBe(true);
```

## Dependencies

- `src/types/ethics.ts`: `DataGovernanceSpec` interface
- `src/types/methodology.ts`: `DataCollectionSpec`, `StudyDesign`, `Site` interfaces
- `src/utils/llm.ts`: `callLLM` function for breach response plan generation

## API Reference

### Main Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `planDataGovernance` | Orchestrate complete governance planning | `Promise<DataGovernanceSpec>` |
| `classifyDataTypes` | Classify data by identifiability | `DataClassification[]` |
| `getStorageRequirements` | Determine storage specs | `StorageRequirements` |
| `calculateRetentionPeriod` | Calculate retention period | `string` |
| `determineDisposalMethod` | Specify disposal procedures | `string` |
| `planDataTransfer` | Plan multi-site data transfer | `DataTransferPlan \| undefined` |
| `generateBreachResponsePlan` | Generate breach response plan | `Promise<string>` |
| `checkPrivacyCompliance` | Check applicable legislation | `PrivacyCompliance` |

### Type Definitions

```typescript
type DataClassification =
  | 'IDENTIFIABLE'
  | 'RE_IDENTIFIABLE'
  | 'DE_IDENTIFIED'
  | 'ANONYMOUS';

interface StorageRequirements {
  location: string;
  encryption: boolean;
  access_controls: string[];
  backup_strategy: string;
}

interface DataTransferPlan {
  recipient: string;
  method: string;
  security_measures: string[];
}

interface PrivacyCompliance {
  privacy_act_1988: boolean;
  information_privacy_act_2009_qld: boolean;
  gdpr_applicable: boolean;
}
```

## Implementation Notes

### Design Decisions

1. **Classification Logic**: Multiple classifications possible (e.g., both IDENTIFIABLE and RE_IDENTIFIABLE) to capture data throughout its lifecycle
2. **Storage Requirements**: Tiered approach based on sensitivity, aligned with institutional standards
3. **Retention Periods**: Hard-coded per regulatory requirements to ensure compliance
4. **LLM for Breach Response**: Complex, context-dependent planning best handled by LLM
5. **Queensland Focus**: Special handling for QLD sites due to Information Privacy Act 2009

### Future Enhancements

- [ ] Add support for additional international privacy legislation (PIPEDA, HIPAA)
- [ ] Integrate with institutional REDCap API for automated storage setup
- [ ] Add data flow diagram generation for multi-site studies
- [ ] Implement automated compliance checklist generation
- [ ] Add support for commercial-in-confidence data classification

## Related Modules

- `src/agents/ethics/consent.ts`: Consent planning (uses data classification)
- `src/agents/ethics/pathway.ts`: Ethics pathway determination (considers data sensitivity)
- `src/agents/methods/data-collection.ts`: Data collection planning (provides input)

## Change Log

**Phase 7.5 (2026-01-28):**
- Initial implementation
- All 8 functions implemented per specification
- Comprehensive test suite
- Example usage file
- Documentation complete
