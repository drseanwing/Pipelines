/**
 * Data Governance Planning Module
 * Phase 7.5 - Data governance specification and compliance checking
 *
 * Plans data storage, retention, privacy compliance, and breach response
 * based on data collection specifications and study design.
 */

import type {
  DataGovernanceSpec,
  DataCollectionSpec,
  StudyDesign,
  Site,
} from '../../types/index.js';
import { callLLM } from '../../utils/llm.js';

/**
 * Data classification level
 */
type DataClassification =
  | 'IDENTIFIABLE'
  | 'RE_IDENTIFIABLE'
  | 'DE_IDENTIFIED'
  | 'ANONYMOUS';

/**
 * Storage requirements specification
 */
interface StorageRequirements {
  location: string;
  encryption: boolean;
  access_controls: string[];
  backup_strategy: string;
}

/**
 * Data transfer plan specification
 */
interface DataTransferPlan {
  recipient: string;
  method: string;
  security_measures: string[];
}

/**
 * Privacy compliance checklist
 */
interface PrivacyCompliance {
  privacy_act_1988: boolean;
  information_privacy_act_2009_qld: boolean;
  gdpr_applicable: boolean;
}

/**
 * Plan comprehensive data governance strategy
 *
 * Orchestrates all data governance planning functions to create a complete
 * specification covering classification, storage, retention, disposal, privacy,
 * and breach response.
 *
 * @param dataCollection - Data collection specification
 * @param methodology - Complete methodology specification with study design
 * @param sites - Array of study sites
 * @returns Complete data governance specification
 *
 * @example
 * ```typescript
 * const governance = await planDataGovernance(
 *   dataCollection,
 *   methodology,
 *   sites
 * );
 * console.log(governance.data_types); // ['IDENTIFIABLE', 'RE_IDENTIFIABLE']
 * console.log(governance.retention_period); // '7 years post-publication'
 * ```
 */
export async function planDataGovernance(
  dataCollection: DataCollectionSpec,
  methodology: { study_design: StudyDesign },
  sites: Site[]
): Promise<DataGovernanceSpec> {
  // Classify data types based on identifiability
  const dataTypes = classifyDataTypes(dataCollection);

  // Determine storage requirements
  const storageRequirements = getStorageRequirements(
    dataTypes,
    sites[0]?.name || 'Institution'
  );

  // Calculate retention period based on study design
  const retentionPeriod = calculateRetentionPeriod(methodology.study_design);

  // Determine disposal method
  const disposalMethod = determineDisposalMethod(dataTypes);

  // Plan data transfer if multi-site
  const dataTransferPlan =
    sites.length > 1 ? planDataTransfer(sites) : undefined;

  // Generate data breach response plan
  const breachResponsePlan = await generateBreachResponsePlan(dataTypes);

  // Check privacy compliance requirements
  const privacyCompliance = checkPrivacyCompliance(dataTypes, sites);

  return {
    data_types: dataTypes,
    storage_requirements: storageRequirements,
    retention_period: retentionPeriod,
    disposal_method: disposalMethod,
    data_transfer_plan: dataTransferPlan,
    privacy_compliance: privacyCompliance,
    data_breach_response_plan: breachResponsePlan,
  };
}

/**
 * Classify data types based on identifiability
 *
 * Determines the classification level(s) for collected data based on whether
 * it includes identifiable information and how identifiers are managed.
 *
 * Classification levels:
 * - IDENTIFIABLE: Direct identifiers present (name, MRN, DOB)
 * - RE_IDENTIFIABLE: Coded with key file linking to identifiers
 * - DE_IDENTIFIED: No direct identifiers, minimal re-identification risk
 * - ANONYMOUS: No identifiers, cannot be re-identified
 *
 * @param dataCollection - Data collection specification
 * @returns Array of applicable data classification levels
 *
 * @example
 * ```typescript
 * const classifications = classifyDataTypes({
 *   includes_identifiable_data: true,
 *   data_types: ['CLINICAL', 'ADMINISTRATIVE'],
 *   instruments: [...],
 *   collection_timepoints: [...],
 *   missing_data_handling: '...'
 * });
 * // ['IDENTIFIABLE', 'RE_IDENTIFIABLE']
 * ```
 */
export function classifyDataTypes(
  dataCollection: DataCollectionSpec
): DataClassification[] {
  const classifications: DataClassification[] = [];

  if (dataCollection.includes_identifiable_data) {
    // Has direct identifiers
    classifications.push('IDENTIFIABLE');

    // Will also have re-identifiable data after coding/linkage
    if (
      dataCollection.data_types.includes('CLINICAL') ||
      dataCollection.data_types.includes('BIOLOGICAL')
    ) {
      classifications.push('RE_IDENTIFIABLE');
    }
  } else {
    // No direct identifiers

    // Check if re-identifiable through linkage
    if (
      dataCollection.data_types.includes('CLINICAL') ||
      dataCollection.data_types.includes('ADMINISTRATIVE')
    ) {
      // Clinical/admin data likely has codes that could be linked
      classifications.push('RE_IDENTIFIABLE');
    } else if (
      dataCollection.data_types.includes('SURVEY') ||
      dataCollection.data_types.includes('QUALITATIVE')
    ) {
      // Survey/qualitative data without direct identifiers is typically de-identified
      classifications.push('DE_IDENTIFIED');
    }

    // Anonymous data only if explicitly no linkage possible
    if (
      dataCollection.data_types.includes('SURVEY') &&
      !dataCollection.data_types.includes('CLINICAL') &&
      !dataCollection.data_types.includes('ADMINISTRATIVE') &&
      !dataCollection.includes_identifiable_data
    ) {
      // Anonymous survey (e.g., satisfaction survey with no identifiers)
      classifications.push('ANONYMOUS');
    }
  }

  // Default to de-identified if no clear classification
  if (classifications.length === 0) {
    classifications.push('DE_IDENTIFIED');
  }

  return classifications;
}

/**
 * Determine storage requirements based on data classification
 *
 * Specifies storage location, encryption, access controls, and backup strategy
 * based on data sensitivity and institutional context.
 *
 * @param dataTypes - Array of data classification levels
 * @param institution - Name of primary institution
 * @returns Storage requirements specification
 *
 * @example
 * ```typescript
 * const storage = getStorageRequirements(
 *   ['IDENTIFIABLE', 'RE_IDENTIFIABLE'],
 *   'Metro North Health'
 * );
 * console.log(storage.encryption); // true
 * console.log(storage.location); // 'Secure REDCap server (Metro North Health)'
 * ```
 */
export function getStorageRequirements(
  dataTypes: DataClassification[],
  institution: string
): StorageRequirements {
  const hasIdentifiable =
    dataTypes.includes('IDENTIFIABLE') ||
    dataTypes.includes('RE_IDENTIFIABLE');

  const requirements: StorageRequirements = {
    location: hasIdentifiable
      ? `Secure REDCap server (${institution})`
      : `Institutional research server (${institution})`,
    encryption: hasIdentifiable, // Encrypt identifiable/re-identifiable data
    access_controls: [],
    backup_strategy: '',
  };

  // Access controls based on sensitivity
  if (dataTypes.includes('IDENTIFIABLE')) {
    requirements.access_controls = [
      'Password-protected with multi-factor authentication',
      'Role-based access (Principal Investigator, Research Coordinators only)',
      'Audit trail of all data access',
      'Screen lock after 15 minutes inactivity',
      'No data export without PI approval',
    ];
  } else if (dataTypes.includes('RE_IDENTIFIABLE')) {
    requirements.access_controls = [
      'Password-protected access',
      'Separate storage of linking key (PI access only)',
      'Research team access to coded data only',
      'Audit trail of data access',
    ];
  } else {
    requirements.access_controls = [
      'Password-protected access',
      'Research team member access with approval',
      'No data sharing outside research team without approval',
    ];
  }

  // Backup strategy based on sensitivity
  if (hasIdentifiable) {
    requirements.backup_strategy =
      'Encrypted daily backups to institutional secure server; monthly backups to offline encrypted storage; backup retention for duration of project plus 1 year';
  } else {
    requirements.backup_strategy =
      'Daily backups to institutional server; monthly backups to secure cloud storage; backup retention for duration of project';
  }

  return requirements;
}

/**
 * Calculate data retention period based on study design
 *
 * Determines appropriate retention period per NHMRC guidelines:
 * - Clinical research: 7 years post-publication
 * - Clinical trials: 15 years post-completion
 * - QI projects: 7 years post-completion
 *
 * @param studyDesign - Study design specification
 * @returns Retention period description
 *
 * @example
 * ```typescript
 * const retention = calculateRetentionPeriod({
 *   type: 'RCT',
 *   subtype: 'PHASE_III_TRIAL',
 *   ...
 * });
 * // '15 years post-study completion (clinical trial)'
 * ```
 */
export function calculateRetentionPeriod(studyDesign: StudyDesign): string {
  const designType = studyDesign.type.toUpperCase();

  // Clinical trials require 15 years retention (TGA requirement)
  if (
    designType.includes('TRIAL') ||
    designType === 'RCT' ||
    studyDesign.subtype?.includes('TRIAL')
  ) {
    return '15 years post-study completion (clinical trial per TGA guidelines)';
  }

  // QI projects - 7 years
  if (
    designType.includes('QI') ||
    designType.includes('PDSA') ||
    designType.includes('QUALITY_IMPROVEMENT')
  ) {
    return '7 years post-project completion (QI project per institutional policy)';
  }

  // Standard clinical research - 7 years post-publication
  if (
    designType.includes('COHORT') ||
    designType.includes('CASE_CONTROL') ||
    designType.includes('CROSS_SECTIONAL')
  ) {
    return '7 years post-publication or study completion (per NHMRC guidelines)';
  }

  // Qualitative research - 7 years
  if (designType.includes('QUALITATIVE')) {
    return '7 years post-publication (qualitative research per NHMRC guidelines)';
  }

  // Default: 7 years post-publication
  return '7 years post-publication or study completion, whichever is later (per NHMRC guidelines)';
}

/**
 * Determine secure disposal method based on data classification
 *
 * Specifies appropriate disposal procedures for different data types:
 * - Identifiable data: Secure deletion + physical destruction
 * - Re-identifiable data: Secure deletion + key destruction
 * - De-identified/anonymous: Standard deletion
 *
 * @param dataTypes - Array of data classification levels
 * @returns Disposal method description
 *
 * @example
 * ```typescript
 * const disposal = determineDisposalMethod(['IDENTIFIABLE', 'RE_IDENTIFIABLE']);
 * // 'Secure deletion of electronic files using data sanitization software...'
 * ```
 */
export function determineDisposalMethod(
  dataTypes: DataClassification[]
): string {
  const methods: string[] = [];

  if (dataTypes.includes('IDENTIFIABLE')) {
    methods.push(
      'Secure deletion of electronic files using data sanitization software (minimum 7-pass overwrite)',
      'Physical destruction of paper records via cross-cut shredding',
      'Destruction of backup media (degaussing or physical destruction)',
      'Certificate of destruction obtained from IT services',
      'Audit trail of disposal maintained for 2 years'
    );
  } else if (dataTypes.includes('RE_IDENTIFIABLE')) {
    methods.push(
      'Secure deletion of electronic data files',
      'Separate destruction of linking key/code file (7-pass overwrite)',
      'Destruction of any printed coded data via cross-cut shredding',
      'Verification of complete deletion by IT services'
    );
  } else {
    methods.push(
      'Standard secure deletion of electronic files',
      'Destruction of any printed materials via shredding',
      'Removal from all backup systems after retention period'
    );
  }

  return methods.join('; ');
}

/**
 * Plan data transfer requirements for multi-site studies
 *
 * Specifies secure transfer methods and security measures when data
 * needs to be shared between study sites.
 *
 * @param sites - Array of study sites
 * @returns Data transfer plan or undefined if single-site
 *
 * @example
 * ```typescript
 * const transferPlan = planDataTransfer([
 *   { name: 'Metro North Health', type: 'PRIMARY', ... },
 *   { name: 'Gold Coast Health', type: 'SECONDARY', ... }
 * ]);
 * console.log(transferPlan.method); // 'Encrypted REDCap data export'
 * ```
 */
export function planDataTransfer(sites: Site[]): DataTransferPlan | undefined {
  if (sites.length <= 1) {
    return undefined;
  }

  const primarySite = sites.find((s) => s.type === 'PRIMARY') || sites[0];
  const secondarySites = sites
    .filter((s) => s.type !== 'PRIMARY')
    .map((s) => s.name);

  return {
    recipient: secondarySites.join(', '),
    method: 'Encrypted REDCap data export/import or secure file transfer protocol (SFTP)',
    security_measures: [
      'End-to-end encryption during transfer (AES-256)',
      'Password-protected encrypted files',
      'Transfer via institutional secure network or approved cloud service (e.g., OneDrive for Business, institutional SharePoint)',
      'Data sharing agreement between sites specifying permitted uses',
      'Recipient site data access limited to authorized personnel only',
      'Audit trail of data transfers maintained',
      `Central data management by ${primarySite.name}`,
      'No email transfer of identifiable data',
      'Regular verification of data integrity after transfer',
    ],
  };
}

/**
 * Generate comprehensive data breach response plan
 *
 * Uses LLM to create a detailed, context-specific data breach response plan
 * appropriate for the data classification levels involved.
 *
 * @param dataTypes - Array of data classification levels
 * @returns Data breach response plan description
 *
 * @example
 * ```typescript
 * const plan = await generateBreachResponsePlan(['IDENTIFIABLE', 'RE_IDENTIFIABLE']);
 * // Returns comprehensive response plan with containment, notification, remediation steps
 * ```
 */
export async function generateBreachResponsePlan(
  dataTypes: DataClassification[]
): Promise<string> {
  const hasIdentifiable =
    dataTypes.includes('IDENTIFIABLE') ||
    dataTypes.includes('RE_IDENTIFIABLE');

  const prompt = `Generate a concise but comprehensive data breach response plan for a healthcare research study with the following data classification:

Data Types: ${dataTypes.join(', ')}
Contains Identifiable Data: ${hasIdentifiable ? 'Yes' : 'No'}

The plan should include:
1. Immediate containment steps (first 24 hours)
2. Assessment and investigation procedures
3. Notification requirements (who must be notified and when)
4. Remediation and mitigation steps
5. Documentation requirements
6. Prevention measures for future breaches

Format as a clear, actionable plan in 4-6 sentences. Focus on specific actions and timelines.`;

  const responseText = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1024,
    temperature: 0.5,
    systemPrompt:
      'You are an expert in healthcare data security and privacy compliance. Generate practical, compliant data breach response plans.',
  });

  return responseText.trim();
}

/**
 * Check privacy compliance requirements
 *
 * Determines which privacy legislation applies based on data classification,
 * jurisdiction (Australian sites), and potential international data sharing.
 *
 * Legislation checked:
 * - Privacy Act 1988 (Commonwealth): Applies to all Australian health research
 * - Information Privacy Act 2009 (QLD): Applies to QLD public sector research
 * - GDPR: Applies if data involves EU residents or EU data transfer
 *
 * @param dataTypes - Array of data classification levels
 * @param sites - Array of study sites
 * @returns Privacy compliance requirements
 *
 * @example
 * ```typescript
 * const compliance = checkPrivacyCompliance(
 *   ['IDENTIFIABLE'],
 *   [{ name: 'Metro North Health', location: 'Queensland', ... }]
 * );
 * console.log(compliance.privacy_act_1988); // true
 * console.log(compliance.information_privacy_act_2009_qld); // true
 * ```
 */
export function checkPrivacyCompliance(
  dataTypes: DataClassification[],
  sites: Site[]
): PrivacyCompliance {
  const hasIdentifiable =
    dataTypes.includes('IDENTIFIABLE') ||
    dataTypes.includes('RE_IDENTIFIABLE');

  // Privacy Act 1988 (Commonwealth) - applies to all Australian health research
  // with identifiable or re-identifiable data
  const privacyAct1988 = hasIdentifiable;

  // Information Privacy Act 2009 (QLD) - applies to QLD public sector
  // Check if any site is in Queensland
  const hasQldSite = sites.some(
    (site) =>
      site.location?.toLowerCase().includes('queensland') ||
      site.location?.toLowerCase().includes('qld') ||
      site.name?.toLowerCase().includes('metro north') ||
      site.name?.toLowerCase().includes('gold coast') ||
      site.name?.toLowerCase().includes('queensland health')
  );
  const informationPrivacyAct2009Qld = hasIdentifiable && hasQldSite;

  // GDPR - only applicable if data involves EU residents or EU transfer
  // Default to false unless explicitly international
  const hasInternationalSite = sites.some(
    (site) =>
      !site.location?.toLowerCase().includes('australia') &&
      !site.location?.toLowerCase().includes('queensland') &&
      !site.location?.toLowerCase().includes('qld')
  );
  const gdprApplicable = hasIdentifiable && hasInternationalSite;

  return {
    privacy_act_1988: privacyAct1988,
    information_privacy_act_2009_qld: informationPrivacyAct2009Qld,
    gdpr_applicable: gdprApplicable,
  };
}
