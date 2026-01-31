/**
 * Document Generation Engine Core
 *
 * Provides base class for generating research project documents from templates.
 * Implements template loading, style management, and document assembly.
 *
 * Phase 8.1: Document Engine Core
 */

import {
  Document,
  Packer,
  PageOrientation,
  type IStylesOptions,
  type ISectionOptions,
  type ISectionPropertiesOptions,
  convertInchesToTwip,
} from 'docx';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FONT_CONFIG, FONT_SIZES, COLORS, LINE_SPACING } from './styles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Document metadata structure
 */
export interface DocumentMetadata {
  version: string;
  generated_at: string;
  project_id: string;
  document_type?: string;
  author?: string;
}

/**
 * Base class for document generation
 *
 * Responsibilities:
 * - Load DOCX templates from templates/ directory
 * - Provide default document styles (Montserrat, REdI brand type scale, 1.5 line spacing)
 * - Provide A4 page properties with standard margins
 * - Generate document metadata
 * - Convert Document objects to DOCX buffers
 * - Save documents to storage
 */
export class DocumentGenerator {
  protected projectId: string;
  protected version: string;
  protected templateDir: string;
  protected storageDir: string;

  /**
   * Create a new document generator
   *
   * @param projectId - Unique project identifier
   * @param version - Document version (default "1.0")
   */
  constructor(projectId: string, version: string = '1.0') {
    this.projectId = projectId;
    this.version = version;

    // Default template directory (root/templates)
    this.templateDir = path.resolve(__dirname, '../../templates');

    // Default storage directory (root/storage/documents)
    this.storageDir = path.resolve(__dirname, '../../storage/documents');
  }

  /**
   * Load a DOCX template from the templates directory
   *
   * Template directory structure:
   * - templates/protocols/mnh-protocol-template.docx
   * - templates/grants/EMF-R44-Application-form.docx
   * - templates/ethics/hrec-coverletter.docx
   * - templates/ethics/picf-template.docx
   * - templates/common/dmp-template.docx
   *
   * @param templateName - Template filename (e.g., "protocols/mnh-protocol-template.docx")
   * @returns Buffer containing the DOCX template binary data
   * @throws Error if template file not found
   */
  async loadTemplate(templateName: string): Promise<Buffer> {
    const templatePath = path.join(this.templateDir, templateName);
    const normalizedPath = path.normalize(templatePath);

    // Security: Prevent path traversal
    if (!normalizedPath.startsWith(path.normalize(this.templateDir))) {
      throw new Error('Invalid template path: path traversal detected');
    }

    try {
      const buffer = await fs.readFile(templatePath);
      return buffer;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Template not found: ${templateName}`);
      }
      throw new Error(`Failed to load template ${templateName}: ${(error as Error).message}`);
    }
  }

  /**
   * Get default document styles
   *
   * Returns Montserrat with REdI brand type scale and 1.5 line spacing.
   *
   * @returns Style options for document
   */
  getDocumentStyles(): IStylesOptions {
    return {
      default: {
        document: {
          run: {
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.NORMAL,
          },
          paragraph: {
            spacing: {
              line: LINE_SPACING.ONE_POINT_FIVE,
              before: 200,
              after: 200,
            },
          },
        },
        heading1: {
          run: {
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.HEADING1,
            bold: true,
            color: COLORS.HEADING,
          },
          paragraph: {
            spacing: {
              before: 480,
              after: 240,
            },
          },
        },
        heading2: {
          run: {
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.HEADING2,
            bold: true,
            color: COLORS.HEADING,
          },
          paragraph: {
            spacing: {
              before: 360,
              after: 200,
            },
          },
        },
        heading3: {
          run: {
            font: FONT_CONFIG.PRIMARY_FONT,
            size: FONT_SIZES.HEADING3,
            bold: true,
            color: COLORS.HEADING,
          },
          paragraph: {
            spacing: {
              before: 280,
              after: 160,
            },
          },
        },
      },
    };
  }

  /**
   * Get A4 page properties with standard margins
   *
   * Page: A4 (210mm x 297mm)
   * Margins: 2.54cm (1 inch = 1440 twips) on all sides
   *
   * @returns Section options for A4 page with margins
   */
  getPageProperties(): ISectionPropertiesOptions {
    const marginTwips = convertInchesToTwip(1.0); // 2.54cm = 1 inch = 1440 twips

    return {
      page: {
        size: {
          width: convertInchesToTwip(8.27), // A4 width: 210mm = 8.27 inches
          height: convertInchesToTwip(11.69), // A4 height: 297mm = 11.69 inches
          orientation: PageOrientation.PORTRAIT,
        },
        margin: {
          top: marginTwips,
          right: marginTwips,
          bottom: marginTwips,
          left: marginTwips,
        },
      },
    };
  }

  /**
   * Create document metadata
   *
   * Includes version, generation timestamp, and project identifier.
   *
   * @param documentType - Optional document type identifier
   * @param author - Optional author name
   * @returns Document metadata object
   */
  createMetadata(documentType?: string, author?: string): DocumentMetadata {
    return {
      version: this.version,
      generated_at: new Date().toISOString(),
      project_id: this.projectId,
      ...(documentType && { document_type: documentType }),
      ...(author && { author }),
    };
  }

  /**
   * Generate a DOCX buffer from a Document object
   *
   * Converts the docx Document instance to a binary Buffer that can be
   * saved to disk or streamed to a client.
   *
   * @param doc - docx Document instance
   * @returns Promise resolving to Buffer containing DOCX binary data
   */
  async generateDocument(doc: Document): Promise<Buffer> {
    try {
      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      throw new Error(`Failed to generate document: ${(error as Error).message}`);
    }
  }

  /**
   * Save document buffer to storage
   *
   * Creates storage directory if it doesn't exist.
   * Saves with project-scoped subdirectory: storage/documents/{projectId}/{filename}
   *
   * @param buffer - DOCX buffer to save
   * @param filename - Output filename (e.g., "protocol-v1.0.docx")
   * @returns Promise resolving to absolute path of saved file
   */
  async saveDocument(buffer: Buffer, filename: string): Promise<string> {
    // Create project-specific storage directory
    const projectStorageDir = path.join(this.storageDir, this.projectId);

    try {
      await fs.mkdir(projectStorageDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create storage directory: ${(error as Error).message}`);
    }

    const filePath = path.join(projectStorageDir, filename);

    try {
      await fs.writeFile(filePath, buffer);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save document to ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Set custom template directory
   *
   * @param dir - Absolute path to template directory
   */
  setTemplateDirectory(dir: string): void {
    this.templateDir = dir;
  }

  /**
   * Set custom storage directory
   *
   * @param dir - Absolute path to storage directory
   */
  setStorageDirectory(dir: string): void {
    this.storageDir = dir;
  }

  /**
   * Get current template directory path
   *
   * @returns Absolute path to template directory
   */
  getTemplateDirectory(): string {
    return this.templateDir;
  }

  /**
   * Get current storage directory path
   *
   * @returns Absolute path to storage directory
   */
  getStorageDirectory(): string {
    return this.storageDir;
  }
}
