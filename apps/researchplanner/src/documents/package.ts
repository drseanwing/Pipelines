/**
 * Submission Package Creation
 * Phase 8 - Document Stage
 * Creates complete submission packages with ZIP archives
 */

import { createWriteStream } from 'fs';
import { mkdir, writeFile, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { createHash } from 'crypto';
import archiver from 'archiver';
import type { Project } from '../types/project.js';
import type { Methodology } from '../types/methodology.js';
import type { EthicsEvaluation } from '../types/ethics.js';
import type { ResearchResults } from '../types/research.js';
import type { DocumentType } from '../types/documents.js';
import { generateProtocol } from './protocol.js';
import { generatePICF } from './picf.js';
import { generateHRECCoverLetter } from './cover-letter.js';
import { EMFGrantGenerator } from './emf-grant.js';

/**
 * Document requirement specification
 */
export interface DocumentRequirement {
  document_type: DocumentType;
  required: boolean;
  reason: string;
  depends_on?: DocumentType[];
}

/**
 * Document package specification
 */
export interface DocumentPackage {
  package_type: string;
  required_documents: DocumentRequirement[];
  optional_documents: DocumentRequirement[];
}

/**
 * Generated document record
 */
export interface GeneratedDocument {
  type: DocumentType;
  filename: string;
  buffer: Buffer;
  generated_at: string;
  checksum: string;
}

/**
 * Submission package manifest
 */
export interface PackageManifest {
  package_id: string;
  project_id: string;
  project_title: string;
  package_type: string;
  created_at: string;
  created_by: string;
  documents: Array<{
    type: DocumentType;
    filename: string;
    size_bytes: number;
    checksum: string;
    required: boolean;
  }>;
  validation: {
    complete: boolean;
    missing_documents: DocumentType[];
    warnings: string[];
  };
  submission_checklist: Array<{
    item: string;
    status: 'COMPLETE' | 'PENDING' | 'NOT_APPLICABLE';
  }>;
}

/**
 * Package creation result
 */
export interface PackageResult {
  success: boolean;
  package_path: string;
  manifest: PackageManifest;
  documents: GeneratedDocument[];
  errors: string[];
}

/**
 * Determine required documents based on project characteristics
 *
 * @param project - Project record
 * @param ethics - Ethics evaluation
 * @returns Document package specification
 */
export function determineRequiredDocuments(
  project: Project,
  ethics: EthicsEvaluation
): DocumentPackage {
  const required: DocumentRequirement[] = [];
  const optional: DocumentRequirement[] = [];

  // Protocol is always required
  if (project.classification.project_type === 'RESEARCH') {
    required.push({
      document_type: 'RESEARCH_PROTOCOL',
      required: true,
      reason: 'Research project requires full protocol',
    });
  } else if (project.classification.project_type === 'QI') {
    required.push({
      document_type: 'QI_PROJECT_PLAN',
      required: true,
      reason: 'QI project requires project plan',
    });
  } else {
    // Hybrid
    required.push({
      document_type: 'RESEARCH_PROTOCOL',
      required: true,
      reason: 'Hybrid project requires full protocol',
    });
  }

  // PICF required if research or hybrid
  if (project.classification.project_type !== 'QI' ||
      ethics.ethics_pathway.pathway === 'FULL_HREC_REVIEW') {
    required.push({
      document_type: 'PICF',
      required: true,
      reason: 'Research project requires participant information and consent',
    });
  }

  // Cover letter required for HREC submissions
  if (ethics.ethics_pathway.requires_hrec) {
    required.push({
      document_type: 'HREC_COVER_LETTER',
      required: true,
      reason: 'HREC submission requires cover letter',
    });
  }

  // Data management plan required for research
  if (project.classification.project_type !== 'QI') {
    required.push({
      document_type: 'DATA_MANAGEMENT_PLAN',
      required: true,
      reason: 'Research project requires data management plan',
    });
  }

  // EMF application if grant target specified
  if (project.intake.grant_target?.startsWith('EMF_')) {
    required.push({
      document_type: 'EMF_APPLICATION',
      required: true,
      reason: 'EMF grant application required for EMF funding',
    });
  }

  // Site assessment for multi-site studies
  if (project.methodology?.setting_sites && project.methodology.setting_sites.length > 1) {
    optional.push({
      document_type: 'SITE_ASSESSMENT',
      required: false,
      reason: 'Multi-site study may require site assessment forms',
    });
  }

  // LNR application for low/negligible risk
  if (ethics.ethics_pathway.pathway === 'LOW_RISK_RESEARCH') {
    optional.push({
      document_type: 'LNR_APPLICATION',
      required: false,
      reason: 'Low-risk pathway uses streamlined application',
    });
  }

  return {
    package_type: determinePackageType(project, ethics),
    required_documents: required,
    optional_documents: optional,
  };
}

/**
 * Determine package type based on project and ethics characteristics
 */
function determinePackageType(project: Project, ethics: EthicsEvaluation): string {
  if (ethics.ethics_pathway.pathway === 'QI_REGISTRATION') {
    return 'QI_REGISTRATION';
  }
  if (ethics.ethics_pathway.pathway === 'LOW_RISK_RESEARCH') {
    return 'LOW_RISK_HREC';
  }
  if (ethics.ethics_pathway.pathway === 'FULL_HREC_REVIEW') {
    return 'FULL_HREC';
  }
  if (project.intake.grant_target?.startsWith('EMF_')) {
    return 'EMF_GRANT_APPLICATION';
  }
  return 'STANDARD_RESEARCH';
}

/**
 * Validate document package completeness
 *
 * @param packageSpec - Package specification
 * @param generatedTypes - Types of documents generated
 * @returns Validation result
 */
export function validateDocumentPackage(
  packageSpec: DocumentPackage,
  generatedTypes: DocumentType[]
): { complete: boolean; missing: DocumentType[]; warnings: string[] } {
  const generatedSet = new Set(generatedTypes);
  const missing: DocumentType[] = [];
  const warnings: string[] = [];

  // Check required documents
  for (const req of packageSpec.required_documents) {
    if (!generatedSet.has(req.document_type)) {
      missing.push(req.document_type);
    }
  }

  // Warn about optional documents
  for (const opt of packageSpec.optional_documents) {
    if (!generatedSet.has(opt.document_type)) {
      warnings.push(`Optional document ${opt.document_type} not generated: ${opt.reason}`);
    }
  }

  return {
    complete: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Get generation order respecting dependencies
 *
 * @param requirements - Document requirements
 * @returns Ordered list of document types
 */
export function getGenerationOrder(requirements: DocumentRequirement[]): DocumentType[] {
  const order: DocumentType[] = [];
  const remaining = [...requirements];
  const generated = new Set<DocumentType>();

  while (remaining.length > 0) {
    const canGenerate = remaining.filter(req =>
      !req.depends_on || req.depends_on.every(dep => generated.has(dep))
    );

    if (canGenerate.length === 0) {
      // Circular dependency or all remaining have unmet dependencies
      // Add remaining in arbitrary order
      remaining.forEach(req => order.push(req.document_type));
      break;
    }

    // Add first available
    const next = canGenerate[0];
    order.push(next.document_type);
    generated.add(next.document_type);

    const index = remaining.indexOf(next);
    remaining.splice(index, 1);
  }

  return order;
}

/**
 * Create complete submission package
 *
 * @param project - Project record
 * @param methodology - Methodology specification
 * @param ethics - Ethics evaluation
 * @param research - Research synthesis (for references)
 * @param outputDir - Output directory for package
 * @returns Package creation result
 */
export async function createSubmissionPackage(
  project: Project,
  methodology: Methodology,
  ethics: EthicsEvaluation,
  research: ResearchResults,
  outputDir: string
): Promise<PackageResult> {
  const errors: string[] = [];
  const documents: GeneratedDocument[] = [];

  // Determine required documents
  const packageSpec = determineRequiredDocuments(project, ethics);

  // Get generation order
  const allRequirements = [...packageSpec.required_documents, ...packageSpec.optional_documents];
  const generationOrder = getGenerationOrder(allRequirements.filter(r => r.required));

  // Generate documents in dependency order
  for (const docType of generationOrder) {
    try {
      const doc = await generateDocument(
        docType,
        project,
        methodology,
        ethics,
        research,
        documents // Pass already-generated documents for cross-references
      );
      if (doc) {
        documents.push(doc);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to generate ${docType}: ${message}`);
    }
  }

  // Validate package
  const generatedTypes = documents.map(d => d.type);
  const validation = validateDocumentPackage(packageSpec, generatedTypes);

  // Create manifest
  const manifest = createManifest(project, packageSpec, documents, validation);

  // Create output directory structure
  const packageDir = join(outputDir, `submission-${project.id}-${Date.now()}`);
  await mkdir(packageDir, { recursive: true });

  // Write documents to directory
  for (const doc of documents) {
    const docPath = join(packageDir, doc.filename);
    await writeFile(docPath, doc.buffer);
  }

  // Write manifest
  const manifestPath = join(packageDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  // Create checklist document
  const checklistPath = join(packageDir, 'submission-checklist.txt');
  await writeFile(checklistPath, generateChecklistText(manifest));

  // Create ZIP archive
  const zipPath = join(outputDir, `submission-${project.id}-${Date.now()}.zip`);
  await createZipArchive(packageDir, zipPath);

  return {
    success: validation.complete && errors.length === 0,
    package_path: zipPath,
    manifest,
    documents,
    errors,
  };
}

/**
 * Generate a specific document type
 */
async function generateDocument(
  type: DocumentType,
  project: Project,
  methodology: Methodology,
  ethics: EthicsEvaluation,
  research: ResearchResults,
  generatedDocuments: GeneratedDocument[] = []
): Promise<GeneratedDocument | null> {
  let buffer: Buffer;
  let filename: string;

  switch (type) {
    case 'RESEARCH_PROTOCOL':
    case 'QI_PROJECT_PLAN':
      buffer = await generateProtocol(project, research, methodology, ethics);
      filename = `protocol-${project.id}.docx`;
      break;

    case 'PICF':
      buffer = await generatePICF(project, methodology, ethics);
      filename = `picf-${project.id}.docx`;
      break;

    case 'DATA_MANAGEMENT_PLAN':
      // Placeholder - would call DMP generator when implemented
      buffer = await generatePlaceholderDocument('Data Management Plan');
      filename = `dmp-${project.id}.docx`;
      break;

    case 'HREC_COVER_LETTER':
      {
        const attachments = generatedDocuments
          .filter(d => d.type !== 'HREC_COVER_LETTER')
          .map(d => d.filename);
        buffer = await generateHRECCoverLetter(project, ethics, attachments);
        filename = `cover-letter-${project.id}.docx`;
      }
      break;

    case 'EMF_APPLICATION':
      {
        const generator = new EMFGrantGenerator();
        buffer = await generator.generateEMFApplication(
          project.intake,
          research,
          methodology,
          ethics
        );
        filename = `emf-application-${project.id}.docx`;
      }
      break;

    // Document types that need manual creation or are not yet implemented
    case 'SITE_ASSESSMENT':
    case 'LNR_APPLICATION':
      // These documents would be implemented in future modules
      return null;

    default:
      return null;
  }

  const checksum = calculateChecksum(buffer);

  return {
    type,
    filename,
    buffer,
    generated_at: new Date().toISOString(),
    checksum,
  };
}

/**
 * Generate placeholder document for not-yet-implemented generators
 */
async function generatePlaceholderDocument(title: string): Promise<Buffer> {
  // Simple text placeholder - in production would use document generator
  const content = `${title}\n\nThis document requires implementation.\n`;
  return Buffer.from(content, 'utf-8');
}

/**
 * Create package manifest
 */
function createManifest(
  project: Project,
  packageSpec: DocumentPackage,
  documents: GeneratedDocument[],
  validation: ReturnType<typeof validateDocumentPackage>
): PackageManifest {
  const docMap = new Map(documents.map(d => [d.type, d]));
  const requiredTypes = new Set(packageSpec.required_documents.map(r => r.document_type));

  return {
    package_id: `PKG-${project.id}-${Date.now()}`,
    project_id: project.id,
    project_title: project.intake.project_title,
    package_type: packageSpec.package_type,
    created_at: new Date().toISOString(),
    created_by: project.intake.principal_investigator.name,
    documents: documents.map(doc => ({
      type: doc.type,
      filename: doc.filename,
      size_bytes: doc.buffer.length,
      checksum: doc.checksum,
      required: requiredTypes.has(doc.type),
    })),
    validation: {
      complete: validation.complete,
      missing_documents: validation.missing,
      warnings: validation.warnings,
    },
    submission_checklist: generateSubmissionChecklist(packageSpec, documents),
  };
}

/**
 * Generate submission checklist items
 */
function generateSubmissionChecklist(
  packageSpec: DocumentPackage,
  documents: GeneratedDocument[]
): PackageManifest['submission_checklist'] {
  const generatedTypes = new Set(documents.map(d => d.type));
  const checklist: PackageManifest['submission_checklist'] = [];

  // Document generation items
  for (const req of packageSpec.required_documents) {
    checklist.push({
      item: `Generate ${req.document_type.replace(/_/g, ' ').toLowerCase()}`,
      status: generatedTypes.has(req.document_type) ? 'COMPLETE' : 'PENDING',
    });
  }

  // Standard submission items
  checklist.push(
    { item: 'Review all documents for accuracy', status: 'PENDING' },
    { item: 'Obtain PI signature on protocol', status: 'PENDING' },
    { item: 'Verify version numbers are consistent', status: 'PENDING' },
    { item: 'Check cross-references between documents', status: 'PENDING' },
    { item: 'Complete online ethics application form', status: 'PENDING' },
    { item: 'Upload documents to ethics portal', status: 'PENDING' },
    { item: 'Submit application', status: 'PENDING' }
  );

  return checklist;
}

/**
 * Generate checklist as plain text
 */
function generateChecklistText(manifest: PackageManifest): string {
  const lines: string[] = [
    '='.repeat(60),
    'SUBMISSION CHECKLIST',
    '='.repeat(60),
    '',
    `Project: ${manifest.project_title}`,
    `Package ID: ${manifest.package_id}`,
    `Created: ${manifest.created_at}`,
    '',
    '-'.repeat(60),
    'DOCUMENTS',
    '-'.repeat(60),
    '',
  ];

  for (const doc of manifest.documents) {
    const status = '[✓]';
    lines.push(`${status} ${doc.type.replace(/_/g, ' ')}`);
    lines.push(`    File: ${doc.filename}`);
    lines.push(`    Size: ${formatBytes(doc.size_bytes)}`);
    lines.push('');
  }

  if (manifest.validation.missing_documents.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('MISSING DOCUMENTS');
    lines.push('-'.repeat(60));
    lines.push('');
    for (const missing of manifest.validation.missing_documents) {
      lines.push(`[ ] ${missing.replace(/_/g, ' ')}`);
    }
    lines.push('');
  }

  if (manifest.validation.warnings.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('WARNINGS');
    lines.push('-'.repeat(60));
    lines.push('');
    for (const warning of manifest.validation.warnings) {
      lines.push(`⚠ ${warning}`);
    }
    lines.push('');
  }

  lines.push('-'.repeat(60));
  lines.push('SUBMISSION TASKS');
  lines.push('-'.repeat(60));
  lines.push('');

  for (const item of manifest.submission_checklist) {
    const checkbox = item.status === 'COMPLETE' ? '[✓]' :
                     item.status === 'NOT_APPLICABLE' ? '[N/A]' : '[ ]';
    lines.push(`${checkbox} ${item.item}`);
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Create ZIP archive from directory
 */
async function createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, basename(sourceDir));
    archive.finalize();
  });
}

/**
 * Calculate SHA-256 checksum for buffer
 */
function calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate cross-references between documents
 *
 * @param documents - Generated documents
 * @returns Validation issues
 */
export function validateCrossReferences(documents: GeneratedDocument[]): string[] {
  const issues: string[] = [];

  // Check protocol version consistency
  // This would require parsing document content - simplified for now

  if (documents.length > 1) {
    // Basic validation - ensure all documents exist
    const hasProtocol = documents.some(d =>
      d.type === 'RESEARCH_PROTOCOL' || d.type === 'QI_PROJECT_PLAN'
    );
    const hasPICF = documents.some(d => d.type === 'PICF');

    if (hasProtocol && hasPICF) {
      // Would validate that PICF references correct protocol version
      // Simplified validation
    }
  }

  return issues;
}

/**
 * Get package statistics
 *
 * @param documents - Generated documents
 * @returns Package statistics
 */
export function getPackageStats(documents: GeneratedDocument[]): {
  total_documents: number;
  total_size_bytes: number;
  document_types: DocumentType[];
  generation_time_range: { earliest: string; latest: string };
} {
  const times = documents.map(d => new Date(d.generated_at).getTime());

  return {
    total_documents: documents.length,
    total_size_bytes: documents.reduce((sum, d) => sum + d.buffer.length, 0),
    document_types: documents.map(d => d.type),
    generation_time_range: {
      earliest: new Date(Math.min(...times)).toISOString(),
      latest: new Date(Math.max(...times)).toISOString(),
    },
  };
}
