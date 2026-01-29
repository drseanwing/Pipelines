/**
 * Document Determination Logic
 * Phase 8 - Document Stage
 * Determines required documents based on project characteristics
 */

import type { Project } from '../types/project.js';
import type { EthicsEvaluation } from '../types/ethics.js';
import type { Methodology } from '../types/methodology.js';
import { ProjectType } from '../types/project.js';
import { EthicsPathwayType } from '../types/ethics.js';

/**
 * Document types available for generation
 */
export type DocumentType =
  | 'PROTOCOL'
  | 'PARTICIPANT_INFO_SHEET'
  | 'CONSENT_FORM'
  | 'DATA_MANAGEMENT_PLAN'
  | 'COVER_LETTER'
  | 'EMF_GRANT_APPLICATION'
  | 'SITE_ASSESSMENT_FORM'
  | 'INVESTIGATOR_CV'
  | 'BUDGET_JUSTIFICATION'
  | 'TIMELINE_GANTT'
  | 'REFERENCES_BIBLIOGRAPHY';

/**
 * Document requirement specification
 */
export interface DocumentRequirement {
  document_type: DocumentType;
  required: boolean;
  priority: 'ESSENTIAL' | 'RECOMMENDED' | 'OPTIONAL';
  rationale: string;
  dependencies?: DocumentType[];
  template_name?: string;
}

/**
 * Document package specification
 */
export interface DocumentPackage {
  package_type: 'QI_MINIMAL' | 'LOW_RISK_STANDARD' | 'FULL_HREC_COMPLETE' | 'HYBRID';
  required_documents: DocumentRequirement[];
  optional_documents: DocumentRequirement[];
  submission_order: DocumentType[];
  estimated_pages: number;
  notes: string[];
}

/**
 * Determine required documents based on project characteristics
 *
 * @param project - Project record with classification
 * @param ethics - Ethics evaluation with pathway
 * @param methodology - Methodology specification
 * @returns Document package specification
 */
export function determineRequiredDocuments(
  project: Project,
  ethics: EthicsEvaluation,
  methodology: Methodology
): DocumentPackage {
  const projectType = project.classification.project_type;
  const ethicsPathway = ethics.ethics_pathway.pathway;

  // Determine package type
  const packageType = determinePackageType(projectType, ethicsPathway);

  // Get base requirements for package type
  const baseRequirements = getBaseRequirements(packageType);

  // Adjust for specific project characteristics
  const adjustedRequirements = adjustRequirements(
    baseRequirements,
    project,
    ethics,
    methodology
  );

  // Separate required and optional
  const required = adjustedRequirements.filter(r => r.required);
  const optional = adjustedRequirements.filter(r => !r.required);

  // Determine submission order
  const submissionOrder = getSubmissionOrder(packageType, required);

  // Calculate estimated pages
  const estimatedPages = calculateEstimatedPages(required);

  // Generate notes
  const notes = generatePackageNotes(packageType, project, ethics);

  return {
    package_type: packageType,
    required_documents: required,
    optional_documents: optional,
    submission_order: submissionOrder,
    estimated_pages: estimatedPages,
    notes,
  };
}

/**
 * Determine package type based on project and ethics pathway
 */
function determinePackageType(
  projectType: ProjectType,
  ethicsPathway: EthicsPathwayType
): DocumentPackage['package_type'] {
  if (projectType === ProjectType.QI) {
    return 'QI_MINIMAL';
  }

  switch (ethicsPathway) {
    case EthicsPathwayType.QI_REGISTRATION:
    case EthicsPathwayType.EXEMPT:
      return 'QI_MINIMAL';

    case EthicsPathwayType.LOW_RISK_RESEARCH:
      return 'LOW_RISK_STANDARD';

    case EthicsPathwayType.FULL_HREC_REVIEW:
      return 'FULL_HREC_COMPLETE';

    case EthicsPathwayType.HYBRID_REVIEW:
      return 'HYBRID';

    default:
      return 'LOW_RISK_STANDARD';
  }
}

/**
 * Get base document requirements for package type
 */
function getBaseRequirements(packageType: DocumentPackage['package_type']): DocumentRequirement[] {
  switch (packageType) {
    case 'QI_MINIMAL':
      return [
        {
          document_type: 'PROTOCOL',
          required: false,
          priority: 'RECOMMENDED',
          rationale: 'QI projects benefit from documented methodology but formal protocol not required',
        },
        {
          document_type: 'DATA_MANAGEMENT_PLAN',
          required: false,
          priority: 'RECOMMENDED',
          rationale: 'Good practice for data handling even in QI projects',
        },
      ];

    case 'LOW_RISK_STANDARD':
      return [
        {
          document_type: 'PROTOCOL',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required for all research ethics applications',
          template_name: 'protocol-template.docx',
        },
        {
          document_type: 'PARTICIPANT_INFO_SHEET',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required to inform participants about the research',
          dependencies: ['PROTOCOL'],
          template_name: 'pis-template.docx',
        },
        {
          document_type: 'CONSENT_FORM',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required to document participant consent',
          dependencies: ['PARTICIPANT_INFO_SHEET'],
          template_name: 'consent-template.docx',
        },
        {
          document_type: 'DATA_MANAGEMENT_PLAN',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required for data governance compliance',
          template_name: 'dmp-template.docx',
        },
        {
          document_type: 'COVER_LETTER',
          required: false,
          priority: 'RECOMMENDED',
          rationale: 'Helpful for ethics submission context',
        },
        {
          document_type: 'INVESTIGATOR_CV',
          required: false,
          priority: 'RECOMMENDED',
          rationale: 'May be requested by ethics committee',
        },
      ];

    case 'FULL_HREC_COMPLETE':
      return [
        {
          document_type: 'PROTOCOL',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Mandatory for full HREC review',
          template_name: 'protocol-template.docx',
        },
        {
          document_type: 'PARTICIPANT_INFO_SHEET',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Mandatory participant information',
          dependencies: ['PROTOCOL'],
          template_name: 'pis-template.docx',
        },
        {
          document_type: 'CONSENT_FORM',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Mandatory consent documentation',
          dependencies: ['PARTICIPANT_INFO_SHEET'],
          template_name: 'consent-template.docx',
        },
        {
          document_type: 'DATA_MANAGEMENT_PLAN',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Mandatory for data governance',
          template_name: 'dmp-template.docx',
        },
        {
          document_type: 'COVER_LETTER',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required for HREC submission',
          template_name: 'cover-letter-template.docx',
        },
        {
          document_type: 'INVESTIGATOR_CV',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required for all investigators',
        },
        {
          document_type: 'BUDGET_JUSTIFICATION',
          required: false,
          priority: 'RECOMMENDED',
          rationale: 'Required if seeking funding',
        },
        {
          document_type: 'TIMELINE_GANTT',
          required: false,
          priority: 'RECOMMENDED',
          rationale: 'Helpful for demonstrating feasibility',
        },
        {
          document_type: 'EMF_GRANT_APPLICATION',
          required: false,
          priority: 'OPTIONAL',
          rationale: 'Only if applying for EMF funding',
        },
        {
          document_type: 'SITE_ASSESSMENT_FORM',
          required: false,
          priority: 'OPTIONAL',
          rationale: 'Required for multi-site studies',
        },
        {
          document_type: 'REFERENCES_BIBLIOGRAPHY',
          required: false,
          priority: 'OPTIONAL',
          rationale: 'Can be integrated into protocol',
        },
      ];

    case 'HYBRID':
      return [
        {
          document_type: 'PROTOCOL',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required for hybrid pathway',
          template_name: 'protocol-template.docx',
        },
        {
          document_type: 'PARTICIPANT_INFO_SHEET',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required for research component',
          dependencies: ['PROTOCOL'],
          template_name: 'pis-template.docx',
        },
        {
          document_type: 'CONSENT_FORM',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required for research component',
          dependencies: ['PARTICIPANT_INFO_SHEET'],
          template_name: 'consent-template.docx',
        },
        {
          document_type: 'DATA_MANAGEMENT_PLAN',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Required for data governance',
          template_name: 'dmp-template.docx',
        },
        {
          document_type: 'COVER_LETTER',
          required: true,
          priority: 'ESSENTIAL',
          rationale: 'Important for explaining hybrid nature',
        },
      ];

    default:
      return [];
  }
}

/**
 * Adjust requirements based on specific project characteristics
 */
function adjustRequirements(
  baseRequirements: DocumentRequirement[],
  project: Project,
  ethics: EthicsEvaluation,
  methodology: Methodology
): DocumentRequirement[] {
  const adjusted = [...baseRequirements];

  // Check for consent waiver
  if (ethics.consent_requirements.waiver_justified) {
    const consentIndex = adjusted.findIndex(r => r.document_type === 'CONSENT_FORM');
    if (consentIndex >= 0) {
      adjusted[consentIndex] = {
        ...adjusted[consentIndex],
        required: false,
        priority: 'OPTIONAL',
        rationale: 'Consent waiver approved - formal consent form not required',
      };
    }

    const pisIndex = adjusted.findIndex(r => r.document_type === 'PARTICIPANT_INFO_SHEET');
    if (pisIndex >= 0) {
      adjusted[pisIndex] = {
        ...adjusted[pisIndex],
        required: false,
        priority: 'OPTIONAL',
        rationale: 'Consent waiver approved - PIS may not be required',
      };
    }
  }

  // Check for multi-site requirements
  if (ethics.site_requirements.length > 1) {
    const siteFormIndex = adjusted.findIndex(r => r.document_type === 'SITE_ASSESSMENT_FORM');
    if (siteFormIndex >= 0) {
      adjusted[siteFormIndex] = {
        ...adjusted[siteFormIndex],
        required: true,
        priority: 'ESSENTIAL',
        rationale: 'Multi-site study requires site-specific assessment forms',
      };
    } else {
      adjusted.push({
        document_type: 'SITE_ASSESSMENT_FORM',
        required: true,
        priority: 'ESSENTIAL',
        rationale: 'Multi-site study requires site-specific assessment forms',
      });
    }
  }

  // Check if seeking EMF funding (based on governance requirements)
  if (project.frameworks?.governance_requirements?.some(r =>
    r.toLowerCase().includes('emf') || r.toLowerCase().includes('grant')
  )) {
    const emfIndex = adjusted.findIndex(r => r.document_type === 'EMF_GRANT_APPLICATION');
    if (emfIndex >= 0) {
      adjusted[emfIndex] = {
        ...adjusted[emfIndex],
        required: true,
        priority: 'ESSENTIAL',
        rationale: 'EMF funding application required based on project requirements',
      };
    } else {
      adjusted.push({
        document_type: 'EMF_GRANT_APPLICATION',
        required: true,
        priority: 'ESSENTIAL',
        rationale: 'EMF funding application required based on project requirements',
      });
    }
  }

  // Check for vulnerable populations requiring enhanced consent
  if (methodology.participants.vulnerable_population) {
    const consentIndex = adjusted.findIndex(r => r.document_type === 'CONSENT_FORM');
    if (consentIndex >= 0 && adjusted[consentIndex].required) {
      adjusted[consentIndex] = {
        ...adjusted[consentIndex],
        rationale: adjusted[consentIndex].rationale + ' - Enhanced consent required for vulnerable population',
      };
    }
  }

  return adjusted;
}

/**
 * Get document submission order
 */
function getSubmissionOrder(
  packageType: DocumentPackage['package_type'],
  requirements: DocumentRequirement[]
): DocumentType[] {
  // Standard submission order
  const standardOrder: DocumentType[] = [
    'COVER_LETTER',
    'PROTOCOL',
    'PARTICIPANT_INFO_SHEET',
    'CONSENT_FORM',
    'DATA_MANAGEMENT_PLAN',
    'INVESTIGATOR_CV',
    'BUDGET_JUSTIFICATION',
    'TIMELINE_GANTT',
    'EMF_GRANT_APPLICATION',
    'SITE_ASSESSMENT_FORM',
    'REFERENCES_BIBLIOGRAPHY',
  ];

  // Filter to only required documents
  const requiredTypes = requirements.map(r => r.document_type);
  return standardOrder.filter(doc => requiredTypes.includes(doc));
}

/**
 * Calculate estimated total pages
 */
function calculateEstimatedPages(requirements: DocumentRequirement[]): number {
  const pageEstimates: Record<DocumentType, number> = {
    'PROTOCOL': 25,
    'PARTICIPANT_INFO_SHEET': 4,
    'CONSENT_FORM': 2,
    'DATA_MANAGEMENT_PLAN': 5,
    'COVER_LETTER': 2,
    'EMF_GRANT_APPLICATION': 15,
    'SITE_ASSESSMENT_FORM': 3,
    'INVESTIGATOR_CV': 2,
    'BUDGET_JUSTIFICATION': 2,
    'TIMELINE_GANTT': 1,
    'REFERENCES_BIBLIOGRAPHY': 3,
  };

  return requirements.reduce((total, req) => {
    return total + (pageEstimates[req.document_type] || 2);
  }, 0);
}

/**
 * Generate package notes
 */
function generatePackageNotes(
  packageType: DocumentPackage['package_type'],
  project: Project,
  ethics: EthicsEvaluation
): string[] {
  const notes: string[] = [];

  switch (packageType) {
    case 'QI_MINIMAL':
      notes.push('This is a QI project requiring minimal formal documentation.');
      notes.push('Consider creating a protocol for internal documentation purposes.');
      break;

    case 'LOW_RISK_STANDARD':
      notes.push('Standard low-risk research documentation package.');
      notes.push('Ensure all documents reference the same protocol version.');
      break;

    case 'FULL_HREC_COMPLETE':
      notes.push('Complete documentation package for full HREC review.');
      notes.push('Allow 4-6 weeks for document preparation and review.');
      notes.push('All documents must be submitted together in the ethics portal.');
      break;

    case 'HYBRID':
      notes.push('Hybrid project requires documentation for both QI and research components.');
      notes.push('Clearly distinguish QI activities from research activities in all documents.');
      break;
  }

  // Add ethics-specific notes
  if (ethics.consent_requirements.waiver_justified) {
    notes.push('Consent waiver approved - include waiver justification in ethics application.');
  }

  if (ethics.site_requirements.length > 1) {
    notes.push(`Multi-site study (${ethics.site_requirements.length} sites) - coordinate site-specific approvals.`);
  }

  return notes;
}

/**
 * Validate document package completeness
 *
 * @param packageSpec - Document package specification
 * @param generatedDocuments - List of generated document types
 * @returns Validation result
 */
export function validateDocumentPackage(
  packageSpec: DocumentPackage,
  generatedDocuments: DocumentType[]
): {
  complete: boolean;
  missing: DocumentType[];
  warnings: string[];
} {
  const requiredTypes = packageSpec.required_documents.map(r => r.document_type);
  const missing = requiredTypes.filter(doc => !generatedDocuments.includes(doc));

  const warnings: string[] = [];

  // Check for dependency issues
  for (const req of packageSpec.required_documents) {
    if (req.dependencies) {
      for (const dep of req.dependencies) {
        if (generatedDocuments.includes(req.document_type) && !generatedDocuments.includes(dep)) {
          warnings.push(`${req.document_type} depends on ${dep} which is not generated`);
        }
      }
    }
  }

  return {
    complete: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Get document generation order respecting dependencies
 *
 * @param requirements - List of document requirements
 * @returns Ordered list of document types
 */
export function getGenerationOrder(requirements: DocumentRequirement[]): DocumentType[] {
  const result: DocumentType[] = [];
  const remaining = [...requirements];
  const generated = new Set<DocumentType>();

  while (remaining.length > 0) {
    // Find documents with no unmet dependencies
    const ready = remaining.filter(req => {
      if (!req.dependencies) return true;
      return req.dependencies.every(dep => generated.has(dep));
    });

    if (ready.length === 0 && remaining.length > 0) {
      // Circular dependency or missing dependency - add remaining in order
      result.push(...remaining.map(r => r.document_type));
      break;
    }

    for (const req of ready) {
      result.push(req.document_type);
      generated.add(req.document_type);
      const idx = remaining.indexOf(req);
      remaining.splice(idx, 1);
    }
  }

  return result;
}
