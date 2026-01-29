/**
 * Framework Determination Module
 * Phase 4.4 - Map project type to frameworks, guidelines, and governance
 *
 * Determines applicable reporting guidelines, ethics frameworks, and governance
 * requirements based on project type, setting, population, and grant target.
 */

import type { ProjectType, GrantType, Frameworks } from '../../types/index.js';
import { DESIGN_MATRIX, REPORTING_GUIDELINES } from '../../utils/index.js';

/**
 * QI framework options
 * Spec reference: Section 3.4.3
 */
export const QI_FRAMEWORKS = {
  PDSA_CYCLE: {
    name: 'Plan-Do-Study-Act Cycle',
    description: 'Iterative improvement methodology',
    reporting_guideline: 'SQUIRE',
  },
  IHI_MODEL: {
    name: 'IHI Model for Improvement',
    description: 'Institute for Healthcare Improvement framework',
    reporting_guideline: 'SQUIRE',
  },
  LEAN_SIX_SIGMA: {
    name: 'Lean Six Sigma',
    description: 'Process improvement and variation reduction',
    reporting_guideline: 'SQUIRE',
  },
  PRE_POST: {
    name: 'Pre-Post Comparison',
    description: 'Before and after measurement',
    reporting_guideline: 'SQUIRE',
  },
} as const;

/**
 * Research framework options with reporting guidelines
 * Spec reference: Section 3.4.3, Section 5 (Reporting Guidelines)
 */
export const RESEARCH_FRAMEWORKS = {
  // Interventional - Randomised
  RCT: {
    name: 'Randomised Controlled Trial',
    reporting_guideline: 'CONSORT',
  },
  CLUSTER_RCT: {
    name: 'Cluster Randomised Controlled Trial',
    reporting_guideline: 'CONSORT',
  },
  STEPPED_WEDGE: {
    name: 'Stepped Wedge Trial',
    reporting_guideline: 'CONSORT',
  },

  // Interventional - Non-randomised
  QUASI_EXPERIMENTAL: {
    name: 'Quasi-Experimental Study',
    reporting_guideline: 'TREND',
  },
  ITS: {
    name: 'Interrupted Time Series',
    reporting_guideline: 'TREND',
  },
  CONTROLLED_BA: {
    name: 'Controlled Before-After Study',
    reporting_guideline: 'TREND',
  },

  // Observational
  COHORT: {
    name: 'Cohort Study',
    reporting_guideline: 'STROBE',
  },
  CASE_CONTROL: {
    name: 'Case-Control Study',
    reporting_guideline: 'STROBE',
  },
  CROSS_SECTIONAL: {
    name: 'Cross-Sectional Study',
    reporting_guideline: 'STROBE',
  },

  // Qualitative
  THEMATIC: {
    name: 'Thematic Analysis',
    reporting_guideline: 'SRQR',
  },
  GROUNDED_THEORY: {
    name: 'Grounded Theory',
    reporting_guideline: 'SRQR',
  },
  PHENOMENOLOGY: {
    name: 'Phenomenology',
    reporting_guideline: 'SRQR',
  },

  // Mixed Methods
  CONVERGENT: {
    name: 'Convergent Parallel Design',
    reporting_guideline: 'GRAMMS',
  },
  EXPLANATORY_SEQUENTIAL: {
    name: 'Explanatory Sequential Design',
    reporting_guideline: 'GRAMMS',
  },
  EXPLORATORY: {
    name: 'Exploratory Sequential Design',
    reporting_guideline: 'GRAMMS',
  },

  // Systematic Reviews
  SYSTEMATIC_REVIEW: {
    name: 'Systematic Review',
    reporting_guideline: 'PRISMA',
  },
  SCOPING_REVIEW: {
    name: 'Scoping Review',
    reporting_guideline: 'PRISMA',
  },
  META_ANALYSIS: {
    name: 'Meta-Analysis',
    reporting_guideline: 'PRISMA',
  },
} as const;

/**
 * Determine applicable frameworks based on project characteristics
 *
 * Maps project type to:
 * - Reporting guideline (from DESIGN_MATRIX)
 * - Ethics framework requirements
 * - Governance requirements (based on setting)
 *
 * @param projectType - QI, RESEARCH, or HYBRID
 * @param setting - Project setting (e.g., "Metro North ED", "Multi-site")
 * @param population - Target population description
 * @param grantTarget - Optional grant funding target
 * @returns Frameworks object with reporting guideline, ethics, and governance
 *
 * @example
 * ```typescript
 * const frameworks = determineFrameworks(
 *   'QI',
 *   'Metro North Emergency Department',
 *   'Adult patients presenting with chest pain',
 *   'INTERNAL'
 * );
 * console.log(frameworks.reporting_guideline); // 'SQUIRE'
 * console.log(frameworks.governance_requirements); // ['MN_CLINICAL_GOVERNANCE']
 * ```
 */
export function determineFrameworks(
  projectType: ProjectType,
  setting: string,
  population: string,
  grantTarget?: GrantType
): Frameworks {
  // Step 1: Map project type to reporting guideline from DESIGN_MATRIX
  const reportingGuideline = mapProjectTypeToReportingGuideline(projectType);

  // Step 2: Map project type to ethics framework requirements
  const ethicsFramework = mapProjectTypeToEthicsFramework(projectType);

  // Step 3: Map setting to governance requirements
  const governanceRequirements = mapSettingToGovernance(setting, projectType);

  // Step 4: Add grant-specific requirements if applicable
  if (grantTarget) {
    governanceRequirements.push(...mapGrantToRequirements(grantTarget));
  }

  // Step 5: Check for special population considerations
  if (isVulnerablePopulation(population)) {
    governanceRequirements.push('VULNERABLE_POPULATION_PROTOCOLS');
  }

  return {
    reporting_guideline: reportingGuideline,
    ethics_framework: ethicsFramework,
    governance_requirements: Array.from(new Set(governanceRequirements)), // Deduplicate
  };
}

/**
 * Map project type to applicable reporting guideline
 * Uses DESIGN_MATRIX from constants
 */
function mapProjectTypeToReportingGuideline(projectType: ProjectType): string {
  switch (projectType) {
    case 'QI':
      return DESIGN_MATRIX.QI.reporting_guideline;

    case 'RESEARCH':
      // Default to CONSORT for research (will be refined in methodology stage)
      return DESIGN_MATRIX.RESEARCH.interventional.randomised.reporting_guideline;

    case 'HYBRID':
      // Hybrid projects typically follow SQUIRE with research components
      return 'SQUIRE + Research Guidelines';

    default:
      return 'SQUIRE'; // Fallback to SQUIRE
  }
}

/**
 * Map project type to ethics framework requirements
 */
function mapProjectTypeToEthicsFramework(projectType: ProjectType): string {
  switch (projectType) {
    case 'QI':
      return 'NHMRC_NATIONAL_STATEMENT_QI';

    case 'RESEARCH':
      return 'NHMRC_NATIONAL_STATEMENT_RESEARCH';

    case 'HYBRID':
      return 'NHMRC_NATIONAL_STATEMENT_HYBRID';

    default:
      return 'NHMRC_NATIONAL_STATEMENT';
  }
}

/**
 * Map setting to governance requirements
 * Detects Metro North, Royal Melbourne, multi-site, etc.
 */
function mapSettingToGovernance(setting: string, projectType: ProjectType): string[] {
  const requirements: string[] = [];
  const settingLower = setting.toLowerCase();

  // Base governance requirement for all projects
  requirements.push('NHMRC_NATIONAL_STATEMENT');

  // Check for Metro North Health
  if (settingLower.includes('metro north') || settingLower.includes('mn')) {
    requirements.push('QH_RESEARCH_GOVERNANCE');
    requirements.push('MN_CLINICAL_GOVERNANCE_POLICY');
  }

  // Check for Royal Melbourne Hospital
  if (settingLower.includes('royal melbourne') || settingLower.includes('rmh')) {
    requirements.push('RMH_RESEARCH_GOVERNANCE');
  }

  // Check for multi-site
  if (settingLower.includes('multi-site') || settingLower.includes('multisite')) {
    requirements.push('MULTI_SITE_GOVERNANCE');
    requirements.push('SITE_SPECIFIC_ASSESSMENT');
  }

  // Privacy requirements (applicable to all)
  requirements.push('PRIVACY_ACT_1988');

  // Queensland-specific
  if (settingLower.includes('queensland') || settingLower.includes('qld')) {
    requirements.push('INFORMATION_PRIVACY_ACT_2009_QLD');
  }

  return requirements;
}

/**
 * Map grant target to additional requirements
 */
function mapGrantToRequirements(grantTarget: GrantType): string[] {
  const requirements: string[] = [];

  switch (grantTarget) {
    case 'EMF_JUMPSTART':
    case 'EMF_LEADING_EDGE':
    case 'EMF_TRANSLATED':
      requirements.push('EMF_REPORTING_REQUIREMENTS');
      requirements.push('EMF_BUDGET_JUSTIFICATION');
      break;

    case 'INTERNAL':
      requirements.push('INTERNAL_FUNDING_GOVERNANCE');
      break;

    case 'OTHER':
      requirements.push('FUNDER_SPECIFIC_REQUIREMENTS');
      break;
  }

  return requirements;
}

/**
 * Check if population is considered vulnerable
 * Triggers additional governance requirements
 */
function isVulnerablePopulation(population: string): boolean {
  const populationLower = population.toLowerCase();

  const vulnerableIndicators = [
    'children',
    'pediatric',
    'paediatric',
    'pregnant',
    'indigenous',
    'aboriginal',
    'torres strait',
    'cognitive impairment',
    'dementia',
    'prisoners',
    'detained',
    'mental health',
    'psychiatric',
    'intellectual disability',
  ];

  return vulnerableIndicators.some(indicator =>
    populationLower.includes(indicator)
  );
}
