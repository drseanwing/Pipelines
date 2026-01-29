# Document Generation Engine

## Overview

The document generation engine provides a base class for creating research project documents from templates using the `docx` package.

## Implementation Status: Phase 8.1 Complete

### Tasks Completed

- ✅ 8.1.1: Create DocumentGenerator base class with template loading interface
- ✅ 8.1.2: Implement template repository file structure
- ✅ 8.1.3: Create document metadata schema (version, generated_at, project_id)
- ✅ 8.1.4: Implement loadTemplate() method with DOCX binary file reading
- ✅ 8.1.5: Implement getDocumentStyles() method returning Arial 12pt default styles
- ✅ 8.1.6: Implement getPageProperties() method for A4 page with 1440 DXA margins

## Files

### `engine.ts`

Core document generator base class providing:

- **Template Loading**: Load DOCX templates from `templates/` directory
- **Style Management**: Default Arial 12pt with 1.5 line spacing
- **Page Setup**: A4 page with 2.54cm (1440 twips) margins
- **Metadata**: Document versioning and tracking
- **Document Generation**: Convert docx Document objects to buffers
- **Storage**: Save documents to project-scoped directories

### `engine-example.ts`

Example usage demonstrating how to:
- Create a DocumentGenerator instance
- Generate metadata
- Apply default styles and page properties
- Create a simple document
- Save to storage

## Template Directory Structure

```
templates/
├── protocols/
│   └── mnh-protocol-template.docx
├── grants/
│   └── EMF-R44-Application-form.docx
├── ethics/
│   ├── hrec-coverletter.docx
│   └── picf-template.docx
├── governance/
│   └── (governance templates)
└── common/
    └── dmp-template.docx
```

## Usage Example

```typescript
import { DocumentGenerator } from './engine.js';
import { Document, Paragraph, TextRun } from 'docx';

// Create generator
const generator = new DocumentGenerator('PROJECT-001', '1.0');

// Create metadata
const metadata = generator.createMetadata('protocol', 'Dr. Smith');
// { version: '1.0', generated_at: '2026-01-28T...', project_id: 'PROJECT-001', ... }

// Load a template (if needed)
const templateBuffer = await generator.loadTemplate('protocols/mnh-protocol-template.docx');

// Create document with default styles
const doc = new Document({
  styles: generator.getDocumentStyles(),
  sections: [{
    ...generator.getPageProperties(),
    children: [
      new Paragraph({
        children: [new TextRun({ text: 'Hello World' })]
      })
    ]
  }]
});

// Generate and save
const buffer = await generator.generateDocument(doc);
const filePath = await generator.saveDocument(buffer, 'protocol-v1.0.docx');
// Saved to: storage/documents/PROJECT-001/protocol-v1.0.docx
```

## API Reference

### DocumentGenerator Class

#### Constructor

```typescript
constructor(projectId: string, version?: string)
```

- `projectId`: Unique project identifier
- `version`: Document version (default: "1.0")

#### Methods

##### Template Loading

```typescript
async loadTemplate(templateName: string): Promise<Buffer>
```

Load a DOCX template from the templates directory.

**Parameters:**
- `templateName`: Path relative to templates directory (e.g., "protocols/mnh-protocol-template.docx")

**Returns:** Buffer containing DOCX binary data

**Throws:** Error if template not found

##### Style Management

```typescript
getDocumentStyles(): IStylesOptions
```

Get default document styles with:
- Font: Arial 12pt
- Line spacing: 1.5
- Heading styles (H1: 16pt bold, H2: 14pt bold, H3: 13pt bold)

##### Page Setup

```typescript
getPageProperties(): ISectionOptions
```

Get A4 page properties:
- Size: 210mm × 297mm (8.27" × 11.69")
- Orientation: Portrait
- Margins: 2.54cm (1 inch / 1440 twips) all sides

##### Metadata

```typescript
createMetadata(documentType?: string, author?: string): DocumentMetadata
```

Create document metadata with version, timestamp, and project ID.

**Parameters:**
- `documentType`: Optional document type identifier
- `author`: Optional author name

**Returns:** DocumentMetadata object

##### Document Generation

```typescript
async generateDocument(doc: Document): Promise<Buffer>
```

Convert a docx Document instance to a binary buffer.

**Parameters:**
- `doc`: docx Document instance

**Returns:** Promise resolving to Buffer containing DOCX binary

##### Storage

```typescript
async saveDocument(buffer: Buffer, filename: string): Promise<string>
```

Save document buffer to storage with automatic directory creation.

**Storage Path:** `storage/documents/{projectId}/{filename}`

**Parameters:**
- `buffer`: DOCX buffer to save
- `filename`: Output filename

**Returns:** Promise resolving to absolute path of saved file

##### Configuration

```typescript
setTemplateDirectory(dir: string): void
getTemplateDirectory(): string
setStorageDirectory(dir: string): void
getStorageDirectory(): string
```

Configure custom template and storage directories.

## Document Metadata Schema

```typescript
interface DocumentMetadata {
  version: string;           // Document version (e.g., "1.0")
  generated_at: string;      // ISO 8601 timestamp
  project_id: string;        // Unique project identifier
  document_type?: string;    // Optional document type
  author?: string;           // Optional author name
}
```

## Specifications Met

### Typography
- **Font:** Arial 12pt (24 half-points)
- **Line Spacing:** 1.5 (360 twips)
- **Headings:** Bold with appropriate sizes (H1: 16pt, H2: 14pt, H3: 13pt)

### Page Layout
- **Page Size:** A4 (210mm × 297mm)
- **Orientation:** Portrait
- **Margins:** 2.54cm (1 inch = 1440 twips) on all sides

### Storage
- **Structure:** Project-scoped directories under `storage/documents/`
- **Path Format:** `storage/documents/{projectId}/{filename}`
- **Auto-creation:** Directories created automatically if missing

## Next Steps

Phase 8.2 will implement section building components:
- `buildTitlePage()` method
- `buildVersionHistory()` method
- `buildSection()` method (markdown to Paragraph conversion)
- `buildSynopsis()` method (table structure)
- `buildReferences()` method (reference list generation)

## Dependencies

- **docx** (v9.0.2): Document generation
- **Node.js fs/promises**: File system operations
- **Node.js path**: Path manipulation
- **Node.js url**: ES module path resolution
