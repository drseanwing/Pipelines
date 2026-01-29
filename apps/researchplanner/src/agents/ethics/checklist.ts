/**
 * Governance Checklist Generation
 * Phase 7.7 - Ethics Agent Checklist Generation
 *
 * Generates comprehensive governance checklists based on:
 * - Ethics pathway (QI vs Research)
 * - Applicable regulatory frameworks
 * - Data types and privacy requirements
 * - Institution-specific governance
 */

import type {
  ChecklistItem,
  EthicsPathwayType,
  RiskLevel,
} from '../../types/ethics.js';

/**
 * Checklist item with internal priority and dependency info
 */
interface ChecklistItemInternal extends ChecklistItem {
  priority: number; // 1 = highest priority (must complete first)
  category: string;
}

/**
 * Generate complete governance checklist for a project
 *
 * @param pathway - Ethics pathway type (QI_REGISTRATION, LOW_RISK_RESEARCH, etc.)
 * @param methodology - Research/QI methodology
 * @param institution - Primary institution code (e.g., 'MN', 'RMH')
 * @param riskLevel - Risk assessment level
 * @param dataTypes - Types of data being collected
 * @returns Sorted checklist with dependencies resolved
 */
export function generateGovernanceChecklist(
  pathway: EthicsPathwayType,
  methodology: string,
  institution: string,
  riskLevel: RiskLevel = RiskLevel.LOW,
  dataTypes: string[] = ['DE_IDENTIFIED']
): ChecklistItem[] {
  const items: ChecklistItemInternal[] = [];

  // 1. NHMRC National Statement requirements (all research)
  if (pathway !== EthicsPathwayType.QI_REGISTRATION) {
    items.push(...getNHMRCRequirements(pathway, riskLevel));
  }

  // 2. QH Research Governance requirements (QH sites)
  if (institution === 'QH' || institution.startsWith('QH_')) {
    items.push(...getQHGovernanceRequirements(pathway));
  }

  // 3. MN Clinical Governance requirements (MN sites)
  if (institution === 'MN') {
    items.push(...getMNGovernanceRequirements(pathway));
  }

  // 4. Privacy Act 1988 (Commonwealth) - all projects with personal data
  const hasPersonalData = dataTypes.some(dt =>
    dt === 'IDENTIFIABLE' || dt === 'RE_IDENTIFIABLE'
  );
  if (hasPersonalData) {
    items.push(...getPrivacyActRequirements(dataTypes));
  }

  // 5. Information Privacy Act 2009 (Qld) - Queensland institutions
  const qldInstitutions = ['QH', 'QH_MN', 'QH_RMH', 'QH_GCUH'];
  if (qldInstitutions.includes(institution) && hasPersonalData) {
    items.push(...getIPAQLDRequirements(dataTypes));
  }

  // 6. Add institutional-specific items
  items.push(...getInstitutionalRequirements(institution, pathway));

  // 7. Resolve dependencies and sort
  const withDependencies = resolveDependencies(items);
  const sorted = sortByDependencyOrder(withDependencies);

  // 8. Remove internal fields and return
  return sorted.map(({ priority, category, ...item }) => item);
}

/**
 * Get NHMRC National Statement requirements
 * Ref: National Statement on Ethical Conduct in Human Research (2007, updated 2023)
 */
export function getNHMRCRequirements(
  pathway: EthicsPathwayType,
  riskLevel: RiskLevel
): ChecklistItemInternal[] {
  const items: ChecklistItemInternal[] = [
    {
      item: 'Complete NHMRC National Statement Risk Assessment',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 1,
      category: 'ETHICS_ASSESSMENT',
      notes: 'Assess research merit, risk, consent requirements per NS Chapter 2.1',
    },
    {
      item: 'Prepare ethics application (HREA or institutional form)',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'ETHICS_APPLICATION',
      notes: 'Use HREA form for multi-site or institutional form for single-site',
    },
    {
      item: 'Draft research protocol with ethics considerations',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'DOCUMENTATION',
      notes: 'Include background, aims, methods, ethical considerations, references',
    },
    {
      item: 'Develop Participant Information and Consent Form (PICF)',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'CONSENT',
      notes: 'Must meet NS requirements for plain language, comprehension, voluntary participation',
    },
    {
      item: 'Complete conflict of interest declaration',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'GOVERNANCE',
      notes: 'All investigators must declare financial and non-financial conflicts',
    },
  ];

  // Additional requirements for higher risk research
  if (riskLevel === RiskLevel.MODERATE || riskLevel === RiskLevel.HIGH) {
    items.push({
      item: 'Obtain clinical trial insurance or indemnity',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'INSURANCE',
      notes: 'Required for interventional research with more than low risk (NS 3.3.32)',
    });

    items.push({
      item: 'Develop safety monitoring and adverse event reporting plan',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'SAFETY',
      notes: 'Must specify stopping rules, SAE reporting timelines, DSMB if applicable',
    });
  }

  // Full HREC review specific requirements
  if (pathway === EthicsPathwayType.FULL_HREC_REVIEW) {
    items.push({
      item: 'Prepare investigator CVs and GCP certificates',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'INVESTIGATOR_CREDENTIALS',
      notes: 'All named investigators need current CVs; CI needs GCP certification',
    });

    items.push({
      item: 'Draft recruitment materials for HREC review',
      requirement_source: 'NHMRC_NATIONAL_STATEMENT',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'RECRUITMENT',
      notes: 'Include advertisements, flyers, social media posts, email scripts',
    });
  }

  return items;
}

/**
 * Get Queensland Health Research Governance Office requirements
 * Ref: QH Research Governance Framework
 */
export function getQHGovernanceRequirements(
  pathway: EthicsPathwayType
): ChecklistItemInternal[] {
  const items: ChecklistItemInternal[] = [
    {
      item: 'Submit Research Governance Office (RGO) application',
      requirement_source: 'QH_RESEARCH_GOVERNANCE',
      status: 'NOT_STARTED',
      priority: 4,
      category: 'GOVERNANCE_SUBMISSION',
      notes: 'Submit via QH Online Forms system after HREC approval obtained',
    },
    {
      item: 'Complete Site Specific Assessment (SSA) form',
      requirement_source: 'QH_RESEARCH_GOVERNANCE',
      status: 'NOT_STARTED',
      priority: 4,
      category: 'SITE_ASSESSMENT',
      notes: 'Required for each QH site where research will be conducted',
    },
    {
      item: 'Obtain site investigator agreement signatures',
      requirement_source: 'QH_RESEARCH_GOVERNANCE',
      status: 'NOT_STARTED',
      priority: 5,
      category: 'AGREEMENTS',
      notes: 'All site PIs and co-investigators must sign investigator agreement',
    },
    {
      item: 'Confirm QH research coordinator availability',
      requirement_source: 'QH_RESEARCH_GOVERNANCE',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'RESOURCES',
      notes: 'Some studies require research coordinator support - check with RGO',
    },
  ];

  // Additional items for clinical trials
  if (pathway === EthicsPathwayType.FULL_HREC_REVIEW) {
    items.push({
      item: 'Complete Clinical Trials Site Feasibility Assessment',
      requirement_source: 'QH_RESEARCH_GOVERNANCE',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'FEASIBILITY',
      notes: 'Required for interventional trials to assess site capacity',
    });

    items.push({
      item: 'Establish clinical trial agreement (CTA) with sponsor',
      requirement_source: 'QH_RESEARCH_GOVERNANCE',
      status: 'NOT_STARTED',
      priority: 4,
      category: 'CONTRACTS',
      notes: 'Industry-sponsored trials require CTA negotiation via QH Legal',
    });
  }

  return items;
}

/**
 * Get Mater Health (MN) Clinical Governance requirements
 * Ref: MN Research Governance Policy
 */
export function getMNGovernanceRequirements(
  pathway: EthicsPathwayType
): ChecklistItemInternal[] {
  const items: ChecklistItemInternal[] = [
    {
      item: 'Submit Mater Research Governance application',
      requirement_source: 'MN_CLINICAL_GOVERNANCE_POLICY',
      status: 'NOT_STARTED',
      priority: 4,
      category: 'GOVERNANCE_SUBMISSION',
      notes: 'Submit to MN Research Office after ethics approval obtained',
    },
    {
      item: 'Obtain Head of Department approval',
      requirement_source: 'MN_CLINICAL_GOVERNANCE_POLICY',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'DEPARTMENTAL_APPROVAL',
      notes: 'Required from HoD of department where research will be conducted',
    },
    {
      item: 'Complete resource allocation assessment',
      requirement_source: 'MN_CLINICAL_GOVERNANCE_POLICY',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'RESOURCES',
      notes: 'Document staff time, equipment, space requirements',
    },
    {
      item: 'Register study with Mater Research Register',
      requirement_source: 'MN_CLINICAL_GOVERNANCE_POLICY',
      status: 'NOT_STARTED',
      priority: 5,
      category: 'REGISTRATION',
      notes: 'All MN studies must be registered on internal research register',
    },
  ];

  // QI-specific requirements at MN
  if (pathway === EthicsPathwayType.QI_REGISTRATION) {
    items.push({
      item: 'Complete QI Registration Form and submit to Unit Director',
      requirement_source: 'MN_CLINICAL_GOVERNANCE_POLICY',
      status: 'NOT_STARTED',
      priority: 1,
      category: 'QI_REGISTRATION',
      notes: 'MN QI projects require Unit Director approval via QI Registration Form',
    });

    items.push({
      item: 'Present QI project at departmental meeting',
      requirement_source: 'MN_CLINICAL_GOVERNANCE_POLICY',
      status: 'NOT_STARTED',
      priority: 5,
      category: 'QI_PRESENTATION',
      notes: 'Required for department awareness and stakeholder engagement',
    });
  }

  return items;
}

/**
 * Get Privacy Act 1988 (Commonwealth) requirements
 * Ref: Privacy Act 1988, Australian Privacy Principles
 */
export function getPrivacyActRequirements(
  dataTypes: string[]
): ChecklistItemInternal[] {
  const items: ChecklistItemInternal[] = [
    {
      item: 'Prepare Privacy Collection Notice (APP 5)',
      requirement_source: 'PRIVACY_ACT_1988',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'PRIVACY_NOTICE',
      notes: 'Must notify individuals about data collection at or before collection',
    },
    {
      item: 'Obtain consent for use and disclosure of personal information',
      requirement_source: 'PRIVACY_ACT_1988',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'CONSENT',
      notes: 'Required unless exemption applies (e.g., impracticable, research in public interest)',
    },
    {
      item: 'Implement secure storage and access controls (APP 11)',
      requirement_source: 'PRIVACY_ACT_1988',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'DATA_SECURITY',
      notes: 'Must take reasonable steps to protect personal information from misuse and loss',
    },
    {
      item: 'Establish data breach response protocol',
      requirement_source: 'PRIVACY_ACT_1988',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'BREACH_RESPONSE',
      notes: 'Notifiable Data Breaches scheme requires breach notification if serious harm likely',
    },
  ];

  const hasIdentifiable = dataTypes.includes('IDENTIFIABLE');
  if (hasIdentifiable) {
    items.push({
      item: 'Document lawful basis for collection of sensitive information',
      requirement_source: 'PRIVACY_ACT_1988',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'LAWFUL_BASIS',
      notes: 'Health information is sensitive - must meet APP 3.3 or 3.4 conditions',
    });

    items.push({
      item: 'Conduct Privacy Impact Assessment (PIA)',
      requirement_source: 'PRIVACY_ACT_1988',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'PRIVACY_ASSESSMENT',
      notes: 'Recommended for projects involving sensitive personal information',
    });
  }

  return items;
}

/**
 * Get Information Privacy Act 2009 (Qld) requirements
 * Ref: Information Privacy Act 2009 (Qld), Information Privacy Principles
 */
export function getIPAQLDRequirements(
  dataTypes: string[]
): ChecklistItemInternal[] {
  const items: ChecklistItemInternal[] = [
    {
      item: 'Ensure compliance with Queensland Information Privacy Principles',
      requirement_source: 'INFORMATION_PRIVACY_ACT_2009_QLD',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'QLD_PRIVACY',
      notes: 'IPP 2 (collection), IPP 9 (security), IPP 11 (disclosure) apply to Qld agencies',
    },
    {
      item: 'Document purpose for personal information collection',
      requirement_source: 'INFORMATION_PRIVACY_ACT_2009_QLD',
      status: 'NOT_STARTED',
      priority: 2,
      category: 'COLLECTION_PURPOSE',
      notes: 'Must collect only what is necessary and directly related to function (IPP 2)',
    },
  ];

  const hasIdentifiable = dataTypes.includes('IDENTIFIABLE');
  if (hasIdentifiable) {
    items.push({
      item: 'Obtain Public Interest Entity (PIE) approval if applicable',
      requirement_source: 'INFORMATION_PRIVACY_ACT_2009_QLD',
      status: 'NOT_STARTED',
      priority: 3,
      category: 'PIE_APPROVAL',
      notes: 'Required for Qld agency research using identifiable data without consent',
    });
  }

  return items;
}

/**
 * Get institution-specific governance requirements
 */
function getInstitutionalRequirements(
  institution: string,
  pathway: EthicsPathwayType
): ChecklistItemInternal[] {
  const items: ChecklistItemInternal[] = [];

  // Generic items for all institutions
  items.push({
    item: 'Register study on institutional research register',
    requirement_source: `${institution}_GOVERNANCE`,
    status: 'NOT_STARTED',
    priority: 5,
    category: 'REGISTRATION',
    notes: 'Most institutions maintain research registers for governance oversight',
  });

  // Site-specific items can be added here as requirements are identified
  // Example: RMH, GCUH, etc.

  return items;
}

/**
 * Resolve dependencies between checklist items
 * Sets dependency arrays based on priority and logical sequencing
 */
export function resolveDependencies(
  checklist: ChecklistItemInternal[]
): ChecklistItemInternal[] {
  const dependencyMap: Record<string, string[]> = {
    // Ethics application depends on risk assessment
    'Prepare ethics application (HREA or institutional form)': [
      'Complete NHMRC National Statement Risk Assessment',
    ],

    // PICF depends on ethics application
    'Develop Participant Information and Consent Form (PICF)': [
      'Prepare ethics application (HREA or institutional form)',
    ],

    // Protocol depends on risk assessment
    'Draft research protocol with ethics considerations': [
      'Complete NHMRC National Statement Risk Assessment',
    ],

    // Recruitment materials depend on PICF
    'Draft recruitment materials for HREC review': [
      'Develop Participant Information and Consent Form (PICF)',
    ],

    // RGO submission depends on HREC approval (implied by priority 4)
    'Submit Research Governance Office (RGO) application': [
      'Prepare ethics application (HREA or institutional form)',
    ],

    'Submit Mater Research Governance application': [
      'Prepare ethics application (HREA or institutional form)',
    ],

    // SSA depends on RGO submission
    'Complete Site Specific Assessment (SSA) form': [
      'Submit Research Governance Office (RGO) application',
    ],

    // Investigator agreements depend on SSA
    'Obtain site investigator agreement signatures': [
      'Complete Site Specific Assessment (SSA) form',
    ],

    // CTA depends on RGO submission
    'Establish clinical trial agreement (CTA) with sponsor': [
      'Submit Research Governance Office (RGO) application',
    ],

    // Privacy notice depends on protocol
    'Prepare Privacy Collection Notice (APP 5)': [
      'Draft research protocol with ethics considerations',
    ],

    // Consent for data depends on privacy notice
    'Obtain consent for use and disclosure of personal information': [
      'Prepare Privacy Collection Notice (APP 5)',
    ],

    // Storage security can be parallel with privacy notice
    'Implement secure storage and access controls (APP 11)': [
      'Draft research protocol with ethics considerations',
    ],

    // PIA depends on protocol
    'Conduct Privacy Impact Assessment (PIA)': [
      'Draft research protocol with ethics considerations',
    ],

    // Registration happens after all governance approvals
    'Register study on institutional research register': [
      'Submit Research Governance Office (RGO) application',
      'Submit Mater Research Governance application',
    ],
  };

  return checklist.map(item => {
    const dependencies = dependencyMap[item.item]?.filter(dep =>
      checklist.some(other => other.item === dep)
    ) || [];

    return {
      ...item,
      dependencies: dependencies.length > 0 ? dependencies : undefined,
    };
  });
}

/**
 * Sort checklist by dependency order using topological sort
 * Items with no dependencies come first, then items whose dependencies are met
 */
export function sortByDependencyOrder(
  checklist: ChecklistItemInternal[]
): ChecklistItemInternal[] {
  const sorted: ChecklistItemInternal[] = [];
  const remaining = [...checklist];
  const addedItems = new Set<string>();

  // Safety counter to prevent infinite loops
  let iterations = 0;
  const maxIterations = checklist.length * 2;

  while (remaining.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find items whose dependencies are all satisfied
    const ready = remaining.filter(item => {
      if (!item.dependencies || item.dependencies.length === 0) {
        return true;
      }
      return item.dependencies.every(dep => addedItems.has(dep));
    });

    if (ready.length === 0) {
      // Circular dependency or orphaned dependency - add by priority
      const next = remaining.sort((a, b) => a.priority - b.priority)[0];
      sorted.push(next);
      addedItems.add(next.item);
      remaining.splice(remaining.indexOf(next), 1);
    } else {
      // Add all ready items, sorted by priority
      ready.sort((a, b) => a.priority - b.priority);
      for (const item of ready) {
        sorted.push(item);
        addedItems.add(item.item);
        remaining.splice(remaining.indexOf(item), 1);
      }
    }
  }

  // Add any remaining items (shouldn't happen with valid dependencies)
  if (remaining.length > 0) {
    console.warn(`Warning: ${remaining.length} items could not be sorted by dependencies`);
    sorted.push(...remaining);
  }

  return sorted;
}

/**
 * Get checklist summary statistics
 */
export function getChecklistStats(checklist: ChecklistItem[]): {
  total: number;
  notStarted: number;
  inProgress: number;
  complete: number;
  percentComplete: number;
} {
  const total = checklist.length;
  const notStarted = checklist.filter(i => i.status === 'NOT_STARTED').length;
  const inProgress = checklist.filter(i => i.status === 'IN_PROGRESS').length;
  const complete = checklist.filter(i => i.status === 'COMPLETE').length;
  const percentComplete = total > 0 ? Math.round((complete / total) * 100) : 0;

  return {
    total,
    notStarted,
    inProgress,
    complete,
    percentComplete,
  };
}

/**
 * Get next actionable items (no dependencies or all dependencies complete)
 */
export function getNextActionableItems(
  checklist: ChecklistItem[]
): ChecklistItem[] {
  const completedItems = new Set(
    checklist.filter(i => i.status === 'COMPLETE').map(i => i.item)
  );

  return checklist.filter(item => {
    // Skip if already complete
    if (item.status === 'COMPLETE') {
      return false;
    }

    // If no dependencies, it's actionable
    if (!item.dependencies || item.dependencies.length === 0) {
      return true;
    }

    // Check if all dependencies are complete
    return item.dependencies.every(dep => completedItems.has(dep));
  });
}
