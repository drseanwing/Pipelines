/**
 * Ethics Agent - Main Orchestration Module
 * Phase 7.8 - Ethics Agent Index and Orchestration
 *
 * Exports all Ethics Agent modules and provides main orchestration function
 * that coordinates ethics pathway determination, risk assessment, consent
 * requirements, data governance, site requirements, and checklist generation.
 */

// Export pathway determination functions
export {
  determineEthicsPathway,
  assessIfLowRisk,
  getApprovalBody,
  getRequiredForms,
  estimateApprovalTimeline,
} from './pathway.js';

// Export risk assessment functions
export {
  assessRisk,
  assessVulnerability,
  assessInterventionRisk,
  assessDataSensitivity,
  determineOverallRiskLevel,
  generateJustification,
  getNationalStatementReference,
} from './risk.js';

// Export consent determination functions
export {
  determineConsentRequirements,
  selectConsentType,
  evaluateWaiverEligibility,
  requiresCapacityAssessment,
  requiresThirdPartyConsent,
  getDocumentationRequirements,
  canUseOptOut,
  generateConsentProcessDescription,
} from './consent.js';

// Export data governance functions
export {
  planDataGovernance,
  classifyDataTypes,
  getStorageRequirements,
  calculateRetentionPeriod,
  determineDisposalMethod,
  planDataTransfer,
  generateBreachResponsePlan,
  checkPrivacyCompliance,
} from './data-governance.js';

// Export site requirements functions
export {
  identifySiteRequirements,
  generateSingleSiteRequirements,
  generateMultiSiteRequirements,
  getGovernanceDocuments,
  requiresSiteAssessmentForm,
  requiresInvestigatorAgreement,
  estimateSiteApprovalTimeline,
  validateSiteConfiguration,
  generateMultiSiteCoordinationChecklist,
} from './sites.js';

// Export checklist generation functions
export {
  generateGovernanceChecklist,
  getNHMRCRequirements,
  getQHGovernanceRequirements,
  getMNGovernanceRequirements,
  getPrivacyActRequirements,
  getIPAQLDRequirements,
  resolveDependencies,
  sortByDependencyOrder,
  getChecklistStats,
  getNextActionableItems,
} from './checklist.js';

// Import types
import type { Project } from '../../types/project.js';
import type { Methodology } from '../../types/methodology.js';
import type { EthicsEvaluation } from '../../types/ethics.js';
import type { SiteInfo } from './sites.js';
import type { ParticipantProfile, DataCollectionProfile, MethodologyProfile } from './consent.js';

// Import functions for orchestration
import { determineEthicsPathway } from './pathway.js';
import { assessRisk } from './risk.js';
import { determineConsentRequirements } from './consent.js';
import { planDataGovernance } from './data-governance.js';
import { identifySiteRequirements } from './sites.js';
import { generateGovernanceChecklist } from './checklist.js';

/**
 * Main orchestration function for ethics evaluation
 *
 * Coordinates all ethics evaluation components per spec section 3.5.2:
 * 1. Determine ethics approval pathway based on project type and methodology
 * 2. Conduct risk assessment per National Statement
 * 3. Determine consent requirements based on risk and participants
 * 4. Plan data governance based on data collection
 * 5. Identify site-specific requirements
 * 6. Generate governance compliance checklist
 * 7. Generate ethics considerations draft for protocol
 * 8. Generate data management plan draft
 *
 * @param project - Complete project record with intake and classification
 * @param methodology - Complete methodology specification
 * @returns Complete ethics evaluation
 *
 * @example
 * ```typescript
 * const ethics = await evaluateEthicsGovernance(project, methodology);
 * console.log(ethics.ethics_pathway.pathway); // 'LOW_RISK_RESEARCH'
 * console.log(ethics.risk_assessment.level); // 'LOW'
 * console.log(ethics.governance_checklist.length); // 15 items
 * ```
 */
export async function evaluateEthicsGovernance(
  project: Project,
  methodology: Methodology
): Promise<EthicsEvaluation> {
  // Extract key information
  const projectType = project.classification.project_type;
  const institution = project.intake.principal_investigator.institution;

  // Step 1: Determine ethics approval pathway
  const ethicsPathway = determineEthicsPathway(
    projectType,
    {
      study_type: methodology.study_design.type,
      participant_criteria: {
        inclusion_criteria: methodology.participants.inclusion_criteria.map(c => c.description),
        exclusion_criteria: methodology.participants.exclusion_criteria.map(c => c.description),
      },
      sample_size: methodology.participants.sample_size?.target,
      data_collection_methods: methodology.data_collection.instruments.map(i => i.name),
      intervention_description: methodology.procedures.intervention_description,
      settings: methodology.setting_sites.map(s => s.location),
    } as any,
    institution
  );

  // Step 2: Conduct risk assessment per National Statement
  const riskAssessment = await assessRisk({
    participants: {
      target_population: project.intake.target_population,
      inclusion_criteria: methodology.participants.inclusion_criteria.map(c => c.description),
      exclusion_criteria: methodology.participants.exclusion_criteria.map(c => c.description),
      vulnerable_groups: methodology.participants.vulnerable_population ? ['vulnerable'] : [],
    },
    procedures: {
      data_collection_methods: methodology.data_collection.instruments.map(i => i.name),
      interventions: methodology.procedures.intervention_description ? [methodology.procedures.intervention_description] : [],
      procedure_description: methodology.procedures.overview,
    },
    data_collection: {
      data_types: methodology.data_collection.includes_identifiable_data
        ? ['IDENTIFIABLE' as const]
        : ['DE_IDENTIFIED' as const],
      variables_collected: methodology.data_collection.instruments.map(i => i.name),
      data_sources: methodology.data_collection.data_types,
    },
  });

  // Step 3: Determine consent requirements based on risk and participants
  const participantProfile: ParticipantProfile = {
    includes_children: methodology.participants.inclusion_criteria.some(c =>
      c.description.toLowerCase().match(/child|minor|under 18|pediatric|paediatric/)
    ),
    includes_cognitive_impairment: methodology.participants.inclusion_criteria.some(c =>
      c.description.toLowerCase().match(/cognitive|impair|dementia/)
    ),
    includes_mental_health_conditions: methodology.participants.inclusion_criteria.some(c =>
      c.description.toLowerCase().match(/mental health|psychiatric/)
    ),
    includes_critical_illness: methodology.participants.inclusion_criteria.some(c =>
      c.description.toLowerCase().match(/critical|icu|intensive care/)
    ),
    includes_emergency_settings: methodology.setting_sites.some(s =>
      s.name.toLowerCase().match(/emergency|ed/)
    ),
    includes_vulnerable_populations: methodology.participants.vulnerable_population,
    participant_description: project.intake.target_population,
  };

  const dataCollectionProfile: DataCollectionProfile = {
    data_types: methodology.data_collection.includes_identifiable_data
      ? ['IDENTIFIABLE']
      : ['DE_IDENTIFIED'],
    sensitive_data: methodology.data_collection.data_types.some(dt =>
      dt === 'CLINICAL' || dt === 'BIOLOGICAL'
    ),
    ongoing_contact_required: methodology.data_collection.collection_timepoints.length > 1,
  };

  const methodologyProfile: MethodologyProfile = {
    uses_existing_data: methodology.data_collection.data_types.includes('ADMINISTRATIVE'),
    retrospective_chart_review: methodology.study_design.type.toLowerCase().includes('retrospective'),
    observational_only: !methodology.procedures.intervention_description,
    no_direct_contact: methodology.data_collection.data_types.includes('ADMINISTRATIVE') &&
      !methodology.data_collection.data_types.includes('SURVEY'),
    impracticable_to_obtain_consent: false, // Determined during planning
  };

  const consentRequirements = await determineConsentRequirements(
    riskAssessment.level,
    participantProfile,
    dataCollectionProfile,
    methodologyProfile
  );

  // Step 4: Plan data governance based on data collection
  const dataGovernance = await planDataGovernance(
    methodology.data_collection,
    methodology,
    methodology.setting_sites
  );

  // Step 5: Identify site-specific requirements
  const siteInfo: SiteInfo[] = methodology.setting_sites.map((site, index) => ({
    site_name: site.name,
    site_type: index === 0 ? 'PRIMARY' : 'SECONDARY',
    has_hrec: true, // Assume major sites have HRECs
    jurisdiction: site.location.includes('QLD') || site.location.includes('Queensland') ? 'QLD' :
                  site.location.includes('NSW') ? 'NSW' :
                  site.location.includes('VIC') ? 'VIC' : 'QLD',
  }));

  const siteRequirements = identifySiteRequirements(siteInfo, ethicsPathway);

  // Step 6: Generate governance compliance checklist
  const governanceChecklist = generateGovernanceChecklist(
    ethicsPathway.pathway,
    methodology.study_design.type,
    institution,
    riskAssessment.level,
    dataGovernance.data_types
  );

  // Step 7: Generate ethics considerations draft for protocol
  const ethicsConsiderationsDraft = generateEthicsConsiderationsDraft(
    ethicsPathway,
    riskAssessment,
    consentRequirements
  );

  // Step 8: Generate data management plan draft
  const dataManagementPlanDraft = generateDataManagementPlanDraft(
    dataGovernance,
    methodology
  );

  return {
    ethics_pathway: ethicsPathway,
    risk_assessment: riskAssessment,
    consent_requirements: consentRequirements,
    data_governance: dataGovernance,
    site_requirements: siteRequirements,
    governance_checklist: governanceChecklist,
    ethics_considerations_draft: ethicsConsiderationsDraft,
    data_management_plan_draft: dataManagementPlanDraft,
  };
}

/**
 * Generate ethics considerations draft for protocol
 *
 * Creates a formatted text section suitable for inclusion in research protocol
 * covering ethics approval pathway, risk assessment, consent process, and
 * data governance.
 *
 * @param pathway - Ethics pathway specification
 * @param risk - Risk assessment results
 * @param consent - Consent requirements
 * @returns Formatted ethics considerations text
 */
function generateEthicsConsiderationsDraft(
  pathway: any,
  risk: any,
  consent: any
): string {
  const sections: string[] = [];

  sections.push('# Ethics Considerations\n');

  // Ethics approval pathway
  sections.push('## Ethics Approval');
  sections.push(`This project will seek approval via the ${pathway.pathway.replace(/_/g, ' ').toLowerCase()} pathway.`);
  sections.push(`Ethics approval will be obtained from ${pathway.approval_body}.`);
  if (pathway.requires_hrec) {
    sections.push(`Full Human Research Ethics Committee (HREC) review is required.`);
  }
  if (pathway.requires_rgo) {
    sections.push(`Research Governance Office authorization will be obtained prior to study commencement.`);
  }
  sections.push(`Estimated approval timeline: ${pathway.estimated_timeline}.\n`);

  // Risk assessment
  sections.push('## Risk Assessment');
  sections.push(`This study has been assessed as ${risk.level.toLowerCase()} risk per the NHMRC National Statement on Ethical Conduct in Human Research.`);
  sections.push(`${risk.overall_justification}\n`);

  if (risk.factors.length > 0) {
    sections.push('### Risk Factors and Mitigation');
    for (const factor of risk.factors) {
      sections.push(`**${factor.category.replace(/_/g, ' ')}** (${factor.risk_level}): ${factor.mitigation}`);
    }
    sections.push('');
  }

  // Consent process
  sections.push('## Consent Process');
  sections.push(`Consent type: ${consent.consent_type.replace(/_/g, ' ').toLowerCase()}`);

  if (consent.waiver_justified) {
    sections.push(`\n**Consent Waiver**: ${consent.waiver_justification}`);
  }

  sections.push(`\n${consent.consent_process_description}\n`);

  if (consent.capacity_assessment_required) {
    sections.push('**Capacity Assessment**: Formal capacity assessment will be conducted as described in the consent process.');
  }

  if (consent.third_party_consent_required) {
    sections.push('**Third-Party Consent**: Third-party consent will be obtained from legally authorized representatives as described above.');
  }

  return sections.join('\n');
}

/**
 * Generate data management plan draft
 *
 * Creates a formatted data management plan suitable for ethics applications
 * covering data classification, storage, retention, privacy compliance, and
 * breach response.
 *
 * @param governance - Data governance specification
 * @param methodology - Methodology specification for context
 * @returns Formatted data management plan text
 */
function generateDataManagementPlanDraft(
  governance: any,
  methodology: Methodology
): string {
  const sections: string[] = [];

  sections.push('# Data Management Plan\n');

  // Data classification
  sections.push('## Data Classification');
  sections.push(`Data types: ${governance.data_types.join(', ')}`);
  sections.push('');

  // Data storage
  sections.push('## Data Storage and Security');
  sections.push(`**Storage Location**: ${governance.storage_requirements.location}`);
  sections.push(`**Encryption**: ${governance.storage_requirements.encryption ? 'Yes (AES-256 or equivalent)' : 'Not required'}`);
  sections.push('');
  sections.push('**Access Controls**:');
  for (const control of governance.storage_requirements.access_controls) {
    sections.push(`- ${control}`);
  }
  sections.push('');
  sections.push(`**Backup Strategy**: ${governance.storage_requirements.backup_strategy}`);
  sections.push('');

  // Data transfer (if multi-site)
  if (governance.data_transfer_plan) {
    sections.push('## Data Transfer');
    sections.push(`**Recipient Sites**: ${governance.data_transfer_plan.recipient}`);
    sections.push(`**Transfer Method**: ${governance.data_transfer_plan.method}`);
    sections.push('');
    sections.push('**Security Measures**:');
    for (const measure of governance.data_transfer_plan.security_measures) {
      sections.push(`- ${measure}`);
    }
    sections.push('');
  }

  // Data retention and disposal
  sections.push('## Data Retention and Disposal');
  sections.push(`**Retention Period**: ${governance.retention_period}`);
  sections.push(`**Disposal Method**: ${governance.disposal_method}`);
  sections.push('');

  // Privacy compliance
  sections.push('## Privacy Compliance');
  const complianceActs: string[] = [];
  if (governance.privacy_compliance.privacy_act_1988) {
    complianceActs.push('Privacy Act 1988 (Commonwealth)');
  }
  if (governance.privacy_compliance.information_privacy_act_2009_qld) {
    complianceActs.push('Information Privacy Act 2009 (Queensland)');
  }
  if (governance.privacy_compliance.gdpr_applicable) {
    complianceActs.push('General Data Protection Regulation (GDPR)');
  }

  if (complianceActs.length > 0) {
    sections.push(`This research will comply with: ${complianceActs.join(', ')}`);
  } else {
    sections.push('Standard privacy protections will be implemented.');
  }
  sections.push('');

  // Data breach response
  sections.push('## Data Breach Response');
  sections.push(governance.data_breach_response_plan);
  sections.push('');

  return sections.join('\n');
}
