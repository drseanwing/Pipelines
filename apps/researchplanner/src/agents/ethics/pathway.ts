/**
 * Ethics pathway determination logic
 * Phase 7.2 - Ethics Pathway Logic Implementation
 * Spec reference: Section 3.5.3, 4.1.2
 */

import type { ProjectType } from '../../types/project.js';
import type { Methodology } from '../../types/methodology.js';
import {
  EthicsPathway,
  EthicsPathwayType,
  RiskLevel,
} from '../../types/ethics.js';

/**
 * Assess if research methodology qualifies as low-risk
 * Spec reference: Section 4.1.2 - National Statement risk classification
 *
 * Low risk criteria:
 * - No vulnerable populations (children, cognitively impaired, prisoners)
 * - No more than minimal discomfort/inconvenience
 * - Standard care/observational only
 * - No experimental interventions
 * - De-identified or aggregated data preferred
 */
export function assessIfLowRisk(methodology: Methodology): boolean {
  const riskFactors: boolean[] = [];

  // Check participant vulnerability
  const hasVulnerablePopulation =
    methodology.participant_criteria.inclusion_criteria.some((criteria) =>
      criteria.toLowerCase().match(/child|minor|under 18|cognitiv|impair|prison|detain|pregnan/)
    );
  riskFactors.push(!hasVulnerablePopulation);

  // Check intervention risk
  const isObservationalOnly =
    methodology.study_type === 'OBSERVATIONAL' ||
    methodology.study_type === 'AUDIT' ||
    methodology.study_type === 'SURVEY';
  riskFactors.push(isObservationalOnly);

  // Check if experimental intervention present
  const hasExperimentalIntervention =
    methodology.study_type === 'RCT' ||
    methodology.study_type === 'QUASI_EXPERIMENTAL' ||
    methodology.intervention_description?.toLowerCase().match(/trial|experimental|drug|device/);
  riskFactors.push(!hasExperimentalIntervention);

  // Check sample size (very large studies have higher complexity)
  const hasManageableSampleSize =
    !methodology.sample_size || methodology.sample_size < 500;
  riskFactors.push(hasManageableSampleSize);

  // Check data collection methods (invasive procedures = higher risk)
  const hasNonInvasiveDataCollection =
    !methodology.data_collection_methods.some((method) =>
      method.toLowerCase().match(/biops|blood|tissue|invas|surger|specimen/)
    );
  riskFactors.push(hasNonInvasiveDataCollection);

  // Low risk if majority of factors are positive
  const lowRiskScore = riskFactors.filter(Boolean).length;
  return lowRiskScore >= 4;
}

/**
 * Determine approval body based on pathway and institutional context
 * Spec reference: Section 3.5.3
 *
 * Approval bodies:
 * - UNIT_DIRECTOR: QI projects at departmental level
 * - HOSPITAL_LNR: Low-risk research (single site)
 * - MN_HREC: Mater HREC for Mater-led research
 * - RMH_HREC: Royal Melbourne HREC for complex/multisite
 * - HYBRID_REVIEW: Both QI and HREC review required
 */
export function getApprovalBody(
  pathway: EthicsPathwayType,
  isMultisite: boolean
): string {
  switch (pathway) {
    case EthicsPathwayType.QI_REGISTRATION:
      return 'UNIT_DIRECTOR';

    case EthicsPathwayType.LOW_RISK_RESEARCH:
      return isMultisite ? 'MN_HREC' : 'HOSPITAL_LNR';

    case EthicsPathwayType.FULL_HREC_REVIEW:
      // Multi-site or complex projects go to RMH HREC (lead HREC for network)
      // Single-site Mater projects go to MN HREC
      return isMultisite ? 'RMH_HREC' : 'MN_HREC';

    case EthicsPathwayType.HYBRID_REVIEW:
      return 'HYBRID_REVIEW';

    default:
      throw new Error(`Unknown pathway type: ${pathway}`);
  }
}

/**
 * Get required forms/documents for pathway
 * Spec reference: Section 3.5.3
 */
export function getRequiredForms(pathway: EthicsPathwayType): string[] {
  switch (pathway) {
    case EthicsPathwayType.QI_REGISTRATION:
      return ['QI_PROJECT_PLAN'];

    case EthicsPathwayType.LOW_RISK_RESEARCH:
      return ['LNR_APPLICATION', 'RESEARCH_PROTOCOL', 'SITE_ASSESSMENT'];

    case EthicsPathwayType.FULL_HREC_REVIEW:
      return [
        'HREC_APPLICATION',
        'RESEARCH_PROTOCOL',
        'PICF',
        'SITE_ASSESSMENT',
        'INVESTIGATOR_CV',
        'COVER_LETTER',
      ];

    case EthicsPathwayType.HYBRID_REVIEW:
      return [
        'HREC_APPLICATION',
        'QI_PROJECT_PLAN',
        'RESEARCH_PROTOCOL',
      ];

    default:
      throw new Error(`Unknown pathway type: ${pathway}`);
  }
}

/**
 * Estimate approval timeline based on pathway
 * Spec reference: Section 3.5.3
 *
 * Timelines per pathway:
 * - QI: 2-4 weeks (departmental review)
 * - Low risk: 4-6 weeks (LNR expedited review)
 * - Full HREC: 8-16 weeks (monthly HREC meetings + RGO)
 * - Hybrid: 10-16 weeks (dual review process)
 *
 * Multi-site adds 2-4 weeks for site-specific approvals
 */
export function estimateApprovalTimeline(
  pathway: EthicsPathwayType,
  isMultisite: boolean
): string {
  const baseTimelines: Record<EthicsPathwayType, string> = {
    [EthicsPathwayType.QI_REGISTRATION]: '2-4 weeks',
    [EthicsPathwayType.LOW_RISK_RESEARCH]: '4-6 weeks',
    [EthicsPathwayType.FULL_HREC_REVIEW]: '8-16 weeks',
    [EthicsPathwayType.HYBRID_REVIEW]: '10-16 weeks',
  };

  let timeline = baseTimelines[pathway];

  if (isMultisite) {
    // Add multi-site overhead
    const match = timeline.match(/(\d+)-(\d+)/);
    if (match) {
      const minWeeks = parseInt(match[1]) + 2;
      const maxWeeks = parseInt(match[2]) + 4;
      timeline = `${minWeeks}-${maxWeeks} weeks (multi-site)`;
    }
  }

  return timeline;
}

/**
 * Determine ethics pathway for a project
 * Spec reference: Section 3.5.3
 *
 * Decision logic:
 * 1. QI → QI_REGISTRATION
 * 2. Research + low risk → LOW_RISK_RESEARCH
 * 3. Research + higher risk → FULL_HREC_REVIEW
 * 4. Hybrid → HYBRID_REVIEW
 *
 * @param projectType - QI, RESEARCH, or HYBRID
 * @param methodology - Methodology specification
 * @param institution - Primary institution (affects HREC selection)
 * @returns Complete ethics pathway specification
 */
export function determineEthicsPathway(
  projectType: ProjectType,
  methodology: Methodology,
  institution: string
): EthicsPathway {
  let pathwayType: EthicsPathwayType;

  // Determine pathway type
  if (projectType === 'HYBRID') {
    pathwayType = EthicsPathwayType.HYBRID_REVIEW;
  } else if (projectType === 'QI') {
    pathwayType = EthicsPathwayType.QI_REGISTRATION;
  } else {
    // RESEARCH - assess risk level
    const isLowRisk = assessIfLowRisk(methodology);
    pathwayType = isLowRisk
      ? EthicsPathwayType.LOW_RISK_RESEARCH
      : EthicsPathwayType.FULL_HREC_REVIEW;
  }

  // Determine if multi-site (affects approval body and timeline)
  const isMultisite =
    methodology.settings?.length > 1 ||
    methodology.settings?.some((setting) =>
      setting.toLowerCase().match(/multi.?site|network|multiple hospital/)
    ) ||
    false;

  // Build pathway object
  const pathway: EthicsPathway = {
    pathway: pathwayType,
    approval_body: getApprovalBody(pathwayType, isMultisite),
    requires_hrec: pathwayType === EthicsPathwayType.FULL_HREC_REVIEW ||
                   pathwayType === EthicsPathwayType.HYBRID_REVIEW,
    requires_rgo: pathwayType !== EthicsPathwayType.QI_REGISTRATION,
    estimated_timeline: estimateApprovalTimeline(pathwayType, isMultisite),
    forms: getRequiredForms(pathwayType),
    status: 'NOT_STARTED',
  };

  return pathway;
}
