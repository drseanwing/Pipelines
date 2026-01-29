# Ethics Agent - Output Assembly Module

**Phase 7.8 - Output Assembly and Document Generation**

This module provides formatters and generators for ethics evaluation outputs, producing both structured JSON and human-readable documents for research governance workflows.

## Overview

The output assembly module transforms raw ethics evaluation data into publication-ready formats:

- **JSON Formatters**: Structured data with annotations for system integration
- **Markdown Formatters**: Human-readable documents for review and submission
- **LLM Generators**: AI-generated comprehensive documents (DMP, ethics sections)

## Functions

### 1. `formatEthicsPathway(pathway: EthicsPathway): string`

Formats ethics pathway specification as annotated JSON.

**Input:**
```typescript
{
  pathway: 'LOW_RISK_RESEARCH',
  approval_body: 'MN_HREC',
  requires_hrec: true,
  requires_rgo: true,
  estimated_timeline: '8-12 weeks',
  forms: ['NHMRC Low Risk Form'],
  status: 'NOT_STARTED'
}
```

**Output:** JSON string with `_annotations` object explaining the pathway selection, approval body, timeline, and required forms.

**Use Case:** System integration, workflow tracking, ethics submission planning.

---

### 2. `formatRiskAssessment(risk: RiskAssessment): string`

Formats risk assessment as Markdown with visual risk matrix.

**Input:**
```typescript
{
  level: 'LOW',
  factors: [
    {
      category: 'PARTICIPANT_VULNERABILITY',
      risk_level: 'LOW',
      mitigation: 'Capacity assessment for cognitively impaired patients'
    }
  ],
  overall_justification: '...',
  national_statement_reference: 'National Statement 2.1.6'
}
```

**Output:** Markdown document with:
- Overall risk level with emoji indicator (🟢/🟡/🟠/🔴)
- Risk matrix table with all factors
- Mitigation strategies
- Risk legend
- National Statement reference

**Use Case:** Ethics committee submissions, risk communication, protocol documentation.

---

### 3. `formatConsentSpec(consent: ConsentSpec): string`

Formats consent specification as annotated JSON.

**Input:**
```typescript
{
  consent_type: 'WAIVER',
  waiver_justified: true,
  waiver_justification: 'Retrospective review, impracticable to obtain consent',
  capacity_assessment_required: false,
  third_party_consent_required: false,
  documentation_requirements: ['Waiver Justification Form'],
  opt_out_available: true,
  consent_process_description: 'Consent waived under NS 2.3.10'
}
```

**Output:** JSON string with `_annotations` explaining consent mechanism, waiver justification, capacity requirements, and documentation needs.

**Use Case:** Ethics submissions, consent process planning, governance compliance.

---

### 4. `generateDataManagementPlan(dataGovernance: DataGovernanceSpec, project): Promise<string>`

Generates comprehensive Data Management Plan using LLM.

**Input:**
- `dataGovernance`: Complete data governance specification
- `project`: Project context (title, investigators, dates)

**Output:** 3-5 page Markdown document with sections:

1. **Data Types and Formats** (200-300 words)
   - Data types and identifiability levels
   - Data formats and estimated volumes
   - De-identification methods

2. **Data Collection Methods** (200-300 words)
   - Collection procedures
   - Data collection tools
   - Quality control measures

3. **Storage and Security** (400-500 words)
   - Storage infrastructure
   - Encryption and access controls
   - Backup strategy
   - Physical and technical security

4. **Access and Sharing** (200-300 words)
   - Access permissions and conditions
   - Data sharing plans
   - Transfer protocols (if applicable)
   - Restrictions and embargoes

5. **Retention and Disposal** (200-300 words)
   - Retention period (e.g., "7 years post-publication")
   - Disposal method
   - Archival procedures

6. **Compliance and Governance** (200-300 words)
   - Privacy Act 1988 compliance
   - Information Privacy Act 2009 (QLD)
   - GDPR (if applicable)
   - Data breach response plan

7. **Roles and Responsibilities** (100-200 words)
   - Data custodian
   - Data manager
   - Access approvers
   - Audit and oversight

**Use Case:** Ethics submissions, grant applications, institutional compliance.

**Note:** Requires `ANTHROPIC_API_KEY` environment variable.

---

### 5. `formatGovernanceChecklist(checklist: ChecklistItem[]): string`

Formats governance checklist as JSON with table structure and summary.

**Input:**
```typescript
[
  {
    item: 'Submit HREC application',
    requirement_source: 'NHMRC_NATIONAL_STATEMENT',
    status: 'IN_PROGRESS',
    assigned_to: 'Dr Smith',
    due_date: '2024-03-01'
  },
  // ... more items
]
```

**Output:** JSON with:
- Summary counts (total, not_started, in_progress, complete)
- Checklist array with status icons (⬜/🔄/✅)
- Instructions for status management

**Use Case:** Project management, compliance tracking, governance workflow.

---

### 6. `generateEthicsConsiderationsDraft(ethics: EthicsEvaluation): Promise<string>`

Generates ethics considerations section for research protocol using LLM.

**Input:** Complete `EthicsEvaluation` object

**Output:** 800-1200 word Markdown document with sections:

1. **Ethics Pathway and Approval** (150-200 words)
   - Ethics pathway classification
   - Approval body and requirements
   - Current status
   - Required forms

2. **Risk Assessment Summary** (200-250 words)
   - Overall risk level
   - Key risk factors
   - Mitigation strategies
   - National Statement references

3. **Consent Process** (200-250 words)
   - Consent type and mechanism
   - Consent process description
   - Waiver justification (if applicable)
   - Capacity and third-party consent
   - Documentation requirements

4. **Data Management and Privacy** (200-250 words)
   - Data types and storage
   - Security measures
   - Retention and disposal
   - Privacy compliance
   - Breach response plan

5. **Site Governance** (150-200 words)
   - Site-specific requirements
   - Governance approval processes
   - Investigator agreements

**Use Case:** Protocol writing, ethics submissions, grant applications.

**Note:** Requires `ANTHROPIC_API_KEY` environment variable.

---

### 7. `assembleEthicsOutputs(ethics: EthicsEvaluation, project): Promise<OutputPackage>`

Orchestrates complete output generation, producing all formats.

**Input:**
- `ethics`: Complete ethics evaluation
- `project`: Project context

**Output:** Object containing:
```typescript
{
  ethics_pathway_json: string;
  risk_assessment_md: string;
  consent_spec_json: string;
  data_management_plan_md: string;      // LLM-generated
  governance_checklist_json: string;
  ethics_considerations_md: string;     // LLM-generated
}
```

**Use Case:** One-stop output generation for complete ethics package.

---

## Usage Examples

### Example 1: Format Individual Components

```typescript
import { formatEthicsPathway, formatRiskAssessment } from './output.js';

// Format ethics pathway
const pathwayJson = formatEthicsPathway(ethicsEvaluation.ethics_pathway);
console.log(pathwayJson);

// Format risk assessment
const riskMd = formatRiskAssessment(ethicsEvaluation.risk_assessment);
console.log(riskMd);
```

### Example 2: Generate Complete Output Package

```typescript
import { assembleEthicsOutputs } from './output.js';

const outputs = await assembleEthicsOutputs(
  ethicsEvaluation,
  {
    title: 'ED Wait Time Analysis',
    investigators: ['Dr Smith', 'Dr Jones'],
    start_date: '2024-03-01',
    end_date: '2024-12-31',
  }
);

// Save outputs to files
await fs.writeFile('ethics_pathway.json', outputs.ethics_pathway_json);
await fs.writeFile('risk_assessment.md', outputs.risk_assessment_md);
await fs.writeFile('data_management_plan.md', outputs.data_management_plan_md);
// ... etc
```

### Example 3: Run Complete Demo

```bash
# Set API key
export ANTHROPIC_API_KEY=your_key_here

# Run example
npm run dev -- src/agents/ethics/output-example.ts
```

---

## Testing

Run tests:
```bash
npm test src/agents/ethics/output.test.ts
```

Test coverage:
- ✅ Ethics pathway formatting with annotations
- ✅ Risk assessment with markdown tables and emoji indicators
- ✅ Consent specification with waiver handling
- ✅ Governance checklist with status icons and summary
- ✅ Empty and edge case handling

---

## Dependencies

### Direct Dependencies
- `../../utils/llm.js` - LLM client utilities
- `../../types/ethics.ts` - Ethics type definitions

### Environment Variables
- `ANTHROPIC_API_KEY` - Required for LLM-based generators (DMP, ethics considerations)

---

## Output Specifications

### JSON Formats
All JSON outputs include `_annotations` or `_instructions` objects that provide:
- Human-readable explanations
- Metadata about selections/calculations
- Usage instructions

### Markdown Formats
All Markdown outputs follow:
- Clear heading hierarchy (H1 > H2 > H3)
- Tables for structured data
- Bullet points for lists
- Professional academic tone
- Suitable for direct inclusion in submissions

### LLM-Generated Documents
- Professional, formal tone
- Compliant with Australian research governance standards
- Reference NHMRC National Statement where applicable
- Include all required sections per specification
- Word count targets enforced

---

## Integration with Pipeline

This module is Phase 7.8 of the Ethics Agent (Stage 4). It depends on:
- Phase 7.1: Ethics pathway selection
- Phase 7.2: Risk assessment
- Phase 7.3: Consent requirements
- Phase 7.4: Data governance planning
- Phase 7.5: Site requirements
- Phase 7.6: Governance checklist generation

Outputs from this module feed into:
- **Stage 5 (Document Agent)**: Protocol and grant document generation
- **Database**: Ethics evaluation storage
- **User Interface**: Review and approval workflows
- **Notification System**: Checkpoint triggers for user review

---

## Error Handling

All functions include comprehensive error handling:

1. **LLM Failures**: Retry with exponential backoff (handled by `llm.js`)
2. **Missing Data**: Graceful degradation with default values
3. **Invalid Input**: TypeScript type checking prevents most issues
4. **API Errors**: Clear error messages with context

---

## Performance Considerations

### LLM Calls
- `generateDataManagementPlan`: ~30-60 seconds (8K tokens)
- `generateEthicsConsiderationsDraft`: ~20-40 seconds (8K tokens)

### Optimization Strategies
- Parallel LLM calls in `assembleEthicsOutputs()`
- Template caching for repeated generations
- Incremental regeneration (only changed sections)

---

## Future Enhancements

1. **Template Customization**: Allow institution-specific DMP templates
2. **Multi-Language Support**: Generate outputs in multiple languages
3. **Version Control**: Track changes to ethics evaluations over time
4. **Diff Generation**: Show what changed between versions
5. **Export Formats**: PDF, DOCX export for submissions
6. **Validation**: Schema validation for all JSON outputs

---

## Specification Compliance

This module implements requirements from:
- **Section 3.5.4**: Complete ethics evaluation output structure
- **Section 4.1.2**: Risk assessment formatting requirements
- **Section 3.5.2**: Consent and data governance specifications

All outputs comply with:
- NHMRC National Statement (2007, updated 2018)
- Queensland Health Research Governance Framework
- Privacy Act 1988
- Information Privacy Act 2009 (QLD)

---

## Support

For issues or questions:
1. Check test files for usage examples
2. Run example file: `output-example.ts`
3. Review type definitions in `../../types/ethics.ts`
4. Check LLM utility documentation in `../../utils/llm.ts`
