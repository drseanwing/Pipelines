# Submission Package Creation Module

## Files Created

1. **src/documents/package.ts** - Main package creation module
2. **src/documents/package.test.ts** - Comprehensive test suite

## Module Overview

The package.ts module implements submission package creation with ZIP archives per spec section 3.6.4.

### Key Features

- **Document Determination**: Automatically determines required documents based on project type, ethics pathway, and grant targets
- **Dependency Management**: Generates documents in correct order respecting dependencies
- **Package Validation**: Validates completeness and identifies missing required documents
- **ZIP Archive Creation**: Creates organized ZIP archives with all documents
- **Manifest Generation**: Creates detailed manifest.json with package metadata
- **Checklist Generation**: Generates human-readable submission checklist
- **Cross-reference Validation**: Validates consistency between documents (extensible)
- **Package Statistics**: Calculates document counts, sizes, and generation time ranges

### Document Requirements Logic

The module determines required documents based on:

1. **Project Type**:
   - RESEARCH → Requires RESEARCH_PROTOCOL
   - QI → Requires QI_PROJECT_PLAN
   - HYBRID → Requires RESEARCH_PROTOCOL

2. **Ethics Pathway**:
   - FULL_HREC_REVIEW → Requires HREC_COVER_LETTER
   - LOW_RISK_RESEARCH → Optional LNR_APPLICATION
   - QI_REGISTRATION → No HREC cover letter

3. **Participant Involvement**:
   - Research/Hybrid projects → Requires PICF
   - QI projects → PICF only if HREC review required

4. **Data Management**:
   - Research projects → Requires DATA_MANAGEMENT_PLAN
   - QI projects → No DMP required

5. **Grant Target**:
   - EMF_* grants → Requires EMF_APPLICATION

6. **Multi-site Studies**:
   - Multiple sites → Optional SITE_ASSESSMENT

### Package Structure

Generated packages have the following structure:

```
submission-{project-id}-{timestamp}/
├── protocol-{project-id}.docx
├── picf-{project-id}.docx
├── dmp-{project-id}.docx
├── cover-letter-{project-id}.docx
├── emf-application-{project-id}.docx
├── manifest.json
└── submission-checklist.txt
```

ZIP archive: `submission-{project-id}-{timestamp}.zip`

### Manifest Format

```json
{
  "package_id": "PKG-{project-id}-{timestamp}",
  "project_id": "uuid",
  "project_title": "Project Title",
  "package_type": "FULL_HREC|LOW_RISK_HREC|QI_REGISTRATION|EMF_GRANT_APPLICATION",
  "created_at": "ISO timestamp",
  "created_by": "PI name",
  "documents": [
    {
      "type": "RESEARCH_PROTOCOL",
      "filename": "protocol-uuid.docx",
      "size_bytes": 123456,
      "checksum": "abc12345",
      "required": true
    }
  ],
  "validation": {
    "complete": true,
    "missing_documents": [],
    "warnings": []
  },
  "submission_checklist": [
    {
      "item": "Generate research protocol",
      "status": "COMPLETE|PENDING|NOT_APPLICABLE"
    }
  ]
}
```

### Submission Checklist

The checklist includes:

1. Document generation tasks (auto-marked based on completion)
2. Review tasks (manual)
3. Signature tasks (manual)
4. Cross-reference verification (manual)
5. Portal upload tasks (manual)
6. Submission task (manual)

### Document Generation Order

Documents are generated in dependency order:

1. **Protocol** (RESEARCH_PROTOCOL or QI_PROJECT_PLAN) - No dependencies
2. **PICF** - May depend on protocol
3. **Data Management Plan** - No dependencies
4. **EMF Application** - No dependencies
5. **Cover Letter** - Depends on all other documents (references attachment list)

### Integration with Existing Generators

The module integrates with existing document generators:

- `generateProtocol()` from protocol.ts
- `generatePICF()` from picf.ts
- `generateHRECCoverLetter()` from cover-letter.ts
- `EMFGrantGenerator.generateEMFApplication()` from emf-grant.ts

### Missing Dependencies

The following npm package is required but not yet in package.json:

```bash
npm install archiver
npm install -D @types/archiver
```

### Placeholders

The following document types are currently placeholders:

1. **DATA_MANAGEMENT_PLAN** - Returns simple text placeholder
   - Future: Implement full DMP generator per spec section 3.6.3
2. **SITE_ASSESSMENT** - Returns null (not implemented)
3. **LNR_APPLICATION** - Returns null (not implemented)

### Cross-Reference Validation

Current implementation provides basic validation structure. Future enhancements:

1. Parse DOCX content to extract version numbers
2. Validate protocol version matches in PICF
3. Validate protocol version matches in cover letter
4. Validate investigator names are consistent
5. Validate ethics pathway references are consistent

### API Usage

```typescript
import { createSubmissionPackage } from './documents/package.js';

const result = await createSubmissionPackage(
  project,
  methodology,
  ethics,
  research,
  './output'
);

if (result.success) {
  console.log('Package created:', result.package_path);
  console.log('Manifest:', result.manifest);
} else {
  console.error('Errors:', result.errors);
}
```

### Utility Functions

Export utility functions for external use:

- `determineRequiredDocuments()` - Get document requirements for project
- `validateDocumentPackage()` - Validate package completeness
- `getGenerationOrder()` - Get dependency-ordered document list
- `validateCrossReferences()` - Check document consistency
- `getPackageStats()` - Calculate package statistics

### Testing

Comprehensive test coverage in package.test.ts:

- Document requirement determination for all project types
- Package validation with missing documents
- Dependency ordering
- Cross-reference validation
- Package statistics calculation
- Edge cases (empty lists, single documents, etc.)

### Future Enhancements

1. Implement full DMP generator
2. Implement site assessment form generator
3. Implement LNR application form generator
4. Enhanced cross-reference validation with content parsing
5. Version control for document packages
6. Digital signatures integration
7. Direct ethics portal upload integration
8. Package versioning and re-submission support
