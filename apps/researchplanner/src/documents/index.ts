/**
 * Document Agent - Main Orchestration Module
 * Phase 8 - Document Stage
 *
 * Exports all Document Agent modules and provides main orchestration function
 * that coordinates document generation, assembly, and submission package creation.
 */

// Export document engine
export { DocumentGenerator } from './engine.js';

// Export section builders
export {
  buildTitlePage,
  buildVersionHistory,
  buildSection,
  buildSynopsis,
  buildReferences,
  markdownToDocx,
} from './sections.js';

// Export document generators
export { generateProtocol } from './protocol.js';
export { generatePICF } from './picf.js';
export { generateDataManagementPlan } from './dmp.js';
export { generateHRECCoverLetter } from './cover-letter.js';
export { EMFGrantGenerator } from './emf-grant.js';

// Import types for orchestration
import type { Project } from '../types/project.js';
import type { Methodology } from '../types/methodology.js';
import type { EthicsEvaluation } from '../types/ethics.js';
import type { ResearchResults as ResearchSynthesis } from '../types/research.js';
import { DocumentType } from '../types/documents.js';

// Import functions for orchestration
import { generateProtocol } from './protocol.js';
import { generatePICF } from './picf.js';
import { generateDataManagementPlan } from './dmp.js';
import { generateHRECCoverLetter } from './cover-letter.js';
import { EMFGrantGenerator } from './emf-grant.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Document generation result
 */
export interface DocumentGenerationResult {
  success: boolean;
  documents: Array<{
    type: DocumentType;
    filename: string;
    file_path: string;
    size_bytes: number;
    generated_at: string;
  }>;
  errors: string[];
  warnings: string[];
}

/**
 * Document generation options
 */
export interface DocumentGenerationOptions {
  /** Output directory for generated documents */
  outputDir: string;
  /** Specific document types to generate (default: all required) */
  documentTypes?: DocumentType[];
  /** Whether to skip optional documents */
  skipOptional?: boolean;
}

/**
 * Main orchestration function for document generation
 *
 * Coordinates complete document generation per spec section 3.6:
 * 1. Determine required documents based on project/ethics
 * 2. Generate documents in dependency order
 * 3. Save to output directory
 *
 * @param project - Complete project record
 * @param methodology - Methodology specification
 * @param ethics - Ethics evaluation
 * @param research - Research synthesis (for references)
 * @param options - Generation options
 * @returns Document generation result
 *
 * @example
 * ```typescript
 * const result = await generateDocuments(
 *   project,
 *   methodology,
 *   ethics,
 *   research,
 *   { outputDir: './output' }
 * );
 * console.log(result.documents.length); // Number of generated documents
 * ```
 */
export async function generateDocuments(
  project: Project,
  methodology: Methodology,
  ethics: EthicsEvaluation,
  research: ResearchSynthesis,
  options: DocumentGenerationOptions
): Promise<DocumentGenerationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const generatedDocs: DocumentGenerationResult['documents'] = [];

  console.log('[Documents] Starting document generation...');

  // Ensure output directory exists
  try {
    await fs.mkdir(options.outputDir, { recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to create output directory: ${message}`);
    return { success: false, documents: [], errors, warnings };
  }

  // Determine which documents to generate
  const documentsToGenerate = options.documentTypes || determineRequiredDocuments(project, ethics, methodology);

  console.log(`[Documents] Generating ${documentsToGenerate.length} documents...`);

  // Generate documents in order
  for (const docType of documentsToGenerate) {
    console.log(`[Documents] Generating ${docType}...`);

    try {
      const buffer = await generateSingleDocument(
        docType,
        project,
        methodology,
        ethics,
        research
      );

      if (buffer) {
        const filename = getFilename(docType, project.id);
        const filePath = path.join(options.outputDir, filename);

        await fs.writeFile(filePath, buffer);

        generatedDocs.push({
          type: docType,
          filename,
          file_path: filePath,
          size_bytes: buffer.length,
          generated_at: new Date().toISOString(),
        });

        console.log(`[Documents] Generated ${docType} (${buffer.length} bytes)`);
      } else {
        warnings.push(`${docType} generation returned null - may require manual creation`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to generate ${docType}: ${message}`);
      console.error(`[Documents] Error generating ${docType}:`, message);
    }
  }

  console.log(`[Documents] Generated ${generatedDocs.length} documents successfully`);

  return {
    success: errors.length === 0,
    documents: generatedDocs,
    errors,
    warnings,
  };
}

/**
 * Determine required documents based on project classification and ethics pathway
 */
function determineRequiredDocuments(
  project: Project,
  ethics: EthicsEvaluation,
  methodology: Methodology
): DocumentType[] {
  const required: DocumentType[] = [];

  // Always generate protocol
  required.push(DocumentType.RESEARCH_PROTOCOL);

  // PICF required for research with participants
  if (ethics.ethics_pathway.requires_hrec || methodology.participants.sample_size) {
    required.push(DocumentType.PICF);
  }

  // Cover letter required for HREC submissions
  if (ethics.ethics_pathway.requires_hrec) {
    required.push(DocumentType.HREC_COVER_LETTER);
  }

  // Data management plan required for identifiable data
  if (ethics.data_governance.data_types.some(type =>
    type === 'IDENTIFIABLE' || type === 'RE_IDENTIFIABLE'
  )) {
    required.push(DocumentType.DATA_MANAGEMENT_PLAN);
  }

  // EMF application if grant target specified
  if (project.intake.grant_target && project.intake.grant_target.startsWith('EMF_')) {
    required.push(DocumentType.EMF_APPLICATION);
  }

  // Site assessment for multi-site studies
  if (methodology.setting_sites.length > 1) {
    required.push(DocumentType.SITE_ASSESSMENT);
  }

  return required;
}

/**
 * Generate a single document
 */
async function generateSingleDocument(
  type: DocumentType,
  project: Project,
  methodology: Methodology,
  ethics: EthicsEvaluation,
  research: ResearchSynthesis
): Promise<Buffer | null> {
  switch (type) {
    case DocumentType.RESEARCH_PROTOCOL:
      return generateProtocol(project, research, methodology, ethics);

    case DocumentType.PICF:
      return generatePICF(project, methodology, ethics);

    case DocumentType.HREC_COVER_LETTER: {
      // generateHRECCoverLetter expects (project, ethics, attachments)
      const attachments = [
        'Research Protocol',
        'Participant Information and Consent Form',
        'Data Management Plan',
      ];
      return generateHRECCoverLetter(project, ethics, attachments);
    }

    case DocumentType.EMF_APPLICATION: {
      // EMFGrantGenerator is a class - need to instantiate and call method
      const generator = new EMFGrantGenerator(project.id);
      return generator.generateEMFApplication(
        project.intake,
        research,
        methodology,
        ethics
      );
    }

    case DocumentType.DATA_MANAGEMENT_PLAN:
      return generateDataManagementPlan(project, ethics);

    // Documents requiring manual input
    case DocumentType.SITE_ASSESSMENT:
    case DocumentType.LNR_APPLICATION:
    case DocumentType.QI_PROJECT_PLAN:
      return null;

    default:
      return null;
  }
}

/**
 * Get filename for document type
 */
function getFilename(type: DocumentType, projectId: string): string {
  const names: Record<DocumentType, string> = {
    [DocumentType.RESEARCH_PROTOCOL]: `protocol-${projectId}.docx`,
    [DocumentType.PICF]: `picf-${projectId}.docx`,
    [DocumentType.HREC_COVER_LETTER]: `cover-letter-${projectId}.docx`,
    [DocumentType.EMF_APPLICATION]: `emf-application-${projectId}.docx`,
    [DocumentType.DATA_MANAGEMENT_PLAN]: `dmp-${projectId}.docx`,
    [DocumentType.SITE_ASSESSMENT]: `site-assessment-${projectId}.docx`,
    [DocumentType.LNR_APPLICATION]: `lnr-application-${projectId}.docx`,
    [DocumentType.QI_PROJECT_PLAN]: `qi-plan-${projectId}.docx`,
  };

  return names[type] || `document-${projectId}.docx`;
}

/**
 * Quick document generation for specific type
 *
 * @param type - Document type to generate
 * @param project - Project record
 * @param methodology - Methodology specification
 * @param ethics - Ethics evaluation
 * @param research - Research synthesis
 * @returns Buffer or null
 */
export async function generateSingleDocumentType(
  type: DocumentType,
  project: Project,
  methodology: Methodology,
  ethics: EthicsEvaluation,
  research: ResearchSynthesis
): Promise<Buffer | null> {
  return generateSingleDocument(type, project, methodology, ethics, research);
}

/**
 * Get document type display name
 */
export function getDocumentTypeName(type: DocumentType): string {
  const names: Record<DocumentType, string> = {
    [DocumentType.RESEARCH_PROTOCOL]: 'Research Protocol',
    [DocumentType.PICF]: 'Participant Information and Consent Form',
    [DocumentType.HREC_COVER_LETTER]: 'HREC Cover Letter',
    [DocumentType.EMF_APPLICATION]: 'EMF Grant Application',
    [DocumentType.DATA_MANAGEMENT_PLAN]: 'Data Management Plan',
    [DocumentType.SITE_ASSESSMENT]: 'Site-Specific Assessment',
    [DocumentType.LNR_APPLICATION]: 'Low and Negligible Risk Application',
    [DocumentType.QI_PROJECT_PLAN]: 'Quality Improvement Project Plan',
  };

  return names[type] || type.replace(/_/g, ' ');
}
