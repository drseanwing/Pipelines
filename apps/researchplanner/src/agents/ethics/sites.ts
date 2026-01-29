/**
 * Site Requirements Identification
 * Phase 7.6 - Ethics Agent Site Requirements
 *
 * Identifies site-specific governance requirements for research projects.
 * Handles single-site and multi-site requirements with Lead HREC vs local HREC considerations.
 */

import type {
  EthicsPathway,
  EthicsPathwayType,
  SiteRequirement,
} from '../../types/ethics.js';

/**
 * Site information for requirements assessment
 */
export interface SiteInfo {
  site_name: string;
  site_type: 'PRIMARY' | 'SECONDARY';
  has_hrec: boolean;
  jurisdiction: string; // e.g., 'QLD', 'NSW', 'VIC'
}

/**
 * Identifies site requirements for all research sites
 *
 * @param sites - List of sites involved in the research
 * @param ethicsPathway - Ethics pathway for the project
 * @returns Array of site-specific requirements
 */
export function identifySiteRequirements(
  sites: SiteInfo[],
  ethicsPathway: EthicsPathway
): SiteRequirement[] {
  if (sites.length === 0) {
    return [];
  }

  if (sites.length === 1) {
    return [generateSingleSiteRequirements(sites[0], ethicsPathway)];
  }

  return generateMultiSiteRequirements(sites, ethicsPathway);
}

/**
 * Generates requirements for a single-site research project
 *
 * @param site - The research site
 * @param pathway - Ethics pathway
 * @returns Site requirement specification
 */
export function generateSingleSiteRequirements(
  site: SiteInfo,
  pathway: EthicsPathway
): SiteRequirement {
  const governanceDocs = getGovernanceDocuments(site.site_type, pathway);
  const siteAssessmentRequired = requiresSiteAssessmentForm(pathway);
  const investigatorAgreementRequired = requiresInvestigatorAgreement(
    site.site_type,
    pathway
  );
  const approvalTimeline = estimateSiteApprovalTimeline(site.site_type, pathway);

  // For single-site, site-specific approval needed if HREC review required
  const siteSpecificApproval = pathway.requires_hrec || pathway.requires_rgo;

  return {
    site_name: site.site_name,
    site_type: site.site_type,
    governance_requirements: governanceDocs,
    site_specific_approval_required: siteSpecificApproval,
    estimated_approval_timeline: approvalTimeline,
    site_assessment_form_required: siteAssessmentRequired,
    investigator_agreement_required: investigatorAgreementRequired,
  };
}

/**
 * Generates requirements for multi-site research projects
 * Implements Lead HREC vs local HREC model per NHMRC guidelines
 *
 * @param sites - All research sites
 * @param pathway - Ethics pathway
 * @returns Array of site requirements with lead/local HREC considerations
 */
export function generateMultiSiteRequirements(
  sites: SiteInfo[],
  pathway: EthicsPathway
): SiteRequirement[] {
  const requirements: SiteRequirement[] = [];

  // Primary site is the lead site
  const primarySite = sites.find((s) => s.site_type === 'PRIMARY');
  const secondarySites = sites.filter((s) => s.site_type === 'SECONDARY');

  // Primary site - full governance approval
  if (primarySite) {
    const primaryGovDocs = getGovernanceDocuments('PRIMARY', pathway);

    // Add multi-site specific documents for primary/lead site
    primaryGovDocs.push(
      'Multi-Site Research Coordination Plan',
      'Lead HREC Application',
      'Site-Specific Information (SSI) for Lead Site',
      'Data Sharing Agreement Template',
      'Communication Plan for Participating Sites'
    );

    requirements.push({
      site_name: primarySite.site_name,
      site_type: 'PRIMARY',
      governance_requirements: primaryGovDocs,
      site_specific_approval_required: true,
      estimated_approval_timeline: estimateSiteApprovalTimeline('PRIMARY', pathway),
      site_assessment_form_required: true,
      investigator_agreement_required: true,
    });
  }

  // Secondary sites - local governance and SSA
  for (const site of secondarySites) {
    const secondaryGovDocs = getGovernanceDocuments('SECONDARY', pathway);

    // Add multi-site specific documents for secondary sites
    secondaryGovDocs.push(
      'Site-Specific Assessment (SSA) Form',
      'Local Governance Authorization',
      'Site-Specific Information (SSI)',
      'Data Sharing Agreement (signed)',
      'Local Investigator CV and GCP Certificate'
    );

    // Secondary sites need local governance approval even if Lead HREC approves ethics
    requirements.push({
      site_name: site.site_name,
      site_type: 'SECONDARY',
      governance_requirements: secondaryGovDocs,
      site_specific_approval_required: true, // Local governance always required
      estimated_approval_timeline: estimateSiteApprovalTimeline('SECONDARY', pathway),
      site_assessment_form_required: true, // SSA form always required for multi-site
      investigator_agreement_required: true,
    });
  }

  return requirements;
}

/**
 * Gets governance documentation requirements by site type and pathway
 *
 * @param siteType - PRIMARY or SECONDARY site
 * @param pathway - Ethics pathway
 * @returns List of required governance documents
 */
export function getGovernanceDocuments(
  siteType: 'PRIMARY' | 'SECONDARY',
  pathway: EthicsPathway
): string[] {
  const documents: string[] = [];

  // Common documents for all sites
  documents.push(
    'Research Protocol',
    'Participant Information and Consent Form (PICF)',
    'Investigator CV',
    'GCP Training Certificate'
  );

  if (siteType === 'PRIMARY') {
    // Primary site - comprehensive governance package
    documents.push(
      'Research Governance Application',
      'Site Resource Assessment',
      'Feasibility Assessment',
      'Budget and Financial Approval',
      'Indemnity Arrangement',
      'Clinical Trial Agreement (if applicable)',
      'Data Management Plan',
      'Privacy Impact Assessment'
    );

    if (pathway.requires_hrec) {
      documents.push(
        'HREC Application Form (NEAF or equivalent)',
        'Recruitment Materials',
        'Data Collection Forms',
        'Investigator Brochure (if applicable)'
      );
    }

    if (pathway.requires_rgo) {
      documents.push(
        'Research Governance Office (RGO) Authorization Form',
        'Site-Specific Governance Requirements'
      );
    }

    // Pathway-specific documents
    if (pathway.pathway === 'QI_REGISTRATION') {
      documents.push(
        'QI Registration Form',
        'Quality Improvement Charter',
        'QI Methodology Description'
      );
    } else if (pathway.pathway === 'LOW_RISK_RESEARCH') {
      documents.push(
        'Low Risk Ethics Application',
        'Risk Assessment and Mitigation Plan'
      );
    }
  } else {
    // SECONDARY site - streamlined governance for participating sites
    documents.push(
      'Local Research Governance Authorization',
      'Site Capacity and Capability Assessment',
      'Local Investigator Agreement',
      'Budget Approval (if applicable)'
    );

    if (pathway.requires_rgo) {
      documents.push(
        'Local RGO Authorization',
        'Site-Specific Governance Acceptance'
      );
    }
  }

  return documents;
}

/**
 * Determines if Site-Specific Assessment (SSA) form is required
 *
 * @param pathway - Ethics pathway
 * @returns True if SSA form required
 */
export function requiresSiteAssessmentForm(pathway: EthicsPathway): boolean {
  // SSA required for all multi-site research
  // For single-site, required if HREC or RGO review needed
  return pathway.requires_hrec || pathway.requires_rgo;
}

/**
 * Determines if investigator agreement is required
 *
 * @param siteType - PRIMARY or SECONDARY site
 * @param pathway - Ethics pathway
 * @returns True if investigator agreement required
 */
export function requiresInvestigatorAgreement(
  siteType: 'PRIMARY' | 'SECONDARY',
  pathway: EthicsPathway
): boolean {
  // Primary site: investigator agreement required for HREC or RGO review
  if (siteType === 'PRIMARY') {
    return pathway.requires_hrec || pathway.requires_rgo;
  }

  // Secondary site: investigator agreement always required to formalize collaboration
  return true;
}

/**
 * Estimates site approval timeline based on site type and pathway
 *
 * @param siteType - PRIMARY or SECONDARY site
 * @param pathway - Ethics pathway
 * @returns Estimated timeline string
 */
export function estimateSiteApprovalTimeline(
  siteType: 'PRIMARY' | 'SECONDARY',
  pathway: EthicsPathway
): string {
  if (siteType === 'PRIMARY') {
    // Primary site timelines based on pathway
    switch (pathway.pathway) {
      case 'QI_REGISTRATION':
        return '2-4 weeks'; // Unit director approval + QI registration
      case 'LOW_RISK_RESEARCH':
        return '4-8 weeks'; // Low risk HREC review
      case 'FULL_HREC_REVIEW':
        return '8-16 weeks'; // Full HREC review + governance
      case 'HYBRID_REVIEW':
        return '6-12 weeks'; // Hybrid pathway
      default:
        return '4-8 weeks';
    }
  } else {
    // Secondary site - typically faster as ethics already approved by Lead HREC
    // Only need local governance authorization
    if (pathway.requires_rgo) {
      return '4-8 weeks'; // Local governance review
    }
    return '2-4 weeks'; // Site acceptance and investigator agreement
  }
}

/**
 * Validates site configuration for multi-site research
 *
 * @param sites - Research sites to validate
 * @returns Validation result with any errors
 */
export function validateSiteConfiguration(sites: SiteInfo[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Must have at least one site
  if (sites.length === 0) {
    errors.push('At least one research site must be specified');
  }

  // Must have exactly one primary site
  const primarySites = sites.filter((s) => s.site_type === 'PRIMARY');
  if (primarySites.length === 0) {
    errors.push('One site must be designated as PRIMARY');
  } else if (primarySites.length > 1) {
    errors.push('Only one site can be designated as PRIMARY');
  }

  // Check for duplicate site names
  const siteNames = sites.map((s) => s.site_name);
  const duplicates = siteNames.filter(
    (name, index) => siteNames.indexOf(name) !== index
  );
  if (duplicates.length > 0) {
    errors.push(`Duplicate site names found: ${duplicates.join(', ')}`);
  }

  // Multi-site should have HREC at primary site
  if (sites.length > 1) {
    const primary = sites.find((s) => s.site_type === 'PRIMARY');
    if (primary && !primary.has_hrec) {
      errors.push(
        'PRIMARY site in multi-site research should have HREC for Lead HREC model'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates multi-site coordination checklist
 * Additional governance items specific to multi-site research
 *
 * @returns Array of coordination tasks
 */
export function generateMultiSiteCoordinationChecklist(): string[] {
  return [
    'Establish communication protocol between sites',
    'Define data sharing procedures and agreements',
    'Designate site coordinators at each location',
    'Create site-specific protocol amendments process',
    'Establish adverse event reporting chain',
    'Define protocol deviation management across sites',
    'Set up regular site coordination meetings',
    'Create document version control system',
    'Establish training requirements for site staff',
    'Define monitoring and audit procedures',
    'Create site closure procedures',
  ];
}
