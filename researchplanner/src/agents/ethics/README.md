# Ethics Agent - Governance Checklist Module

Phase 7.7 implementation for generating comprehensive governance checklists for research and QI projects.

## Overview

The checklist module generates project-specific governance checklists by combining requirements from multiple regulatory frameworks:

- **NHMRC National Statement** (2007, updated 2023) - Ethical conduct in human research
- **QH Research Governance Framework** - Queensland Health governance requirements
- **MN Clinical Governance Policy** - Mater Health governance requirements
- **Privacy Act 1988** (Commonwealth) - Australian Privacy Principles
- **Information Privacy Act 2009 (Qld)** - Queensland privacy requirements

## Key Features

### 1. Multi-Source Requirement Integration

```typescript
const checklist = generateGovernanceChecklist(
  EthicsPathwayType.LOW_RISK_RESEARCH,
  'SURVEY',
  'QH',
  RiskLevel.LOW,
  ['IDENTIFIABLE']
);
```

Automatically combines requirements from all applicable sources based on:
- Ethics pathway (QI vs Research, risk level)
- Institution (determines governance framework)
- Data types (triggers privacy requirements)

### 2. Dependency Resolution

Checklist items are automatically ordered based on logical dependencies:

```typescript
const withDependencies = resolveDependencies(items);
const sorted = sortByDependencyOrder(withDependencies);
```

Example dependency chain:
1. Complete Risk Assessment
2. → Prepare Ethics Application (depends on #1)
3. → Develop PICF (depends on #2)
4. → Draft Recruitment Materials (depends on #3)

### 3. Progress Tracking

```typescript
interface ChecklistItem {
  item: string;
  requirement_source: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  assigned_to?: string;
  due_date?: string;
  notes?: string;
  dependencies?: string[];
}
```

Track status, assignments, due dates, and notes for each item.

### 4. Actionable Items

```typescript
const nextSteps = getNextActionableItems(checklist);
// Returns only items that:
// - Are NOT_STARTED or IN_PROGRESS
// - Have no dependencies OR all dependencies are COMPLETE
```

### 5. Progress Metrics

```typescript
const stats = getChecklistStats(checklist);
// Returns: { total, notStarted, inProgress, complete, percentComplete }
```

## Requirement Sources

### NHMRC National Statement

Base requirements for all research (not QI):

1. **Risk Assessment** - NS Chapter 2.1
2. **Ethics Application** - HREA or institutional form
3. **Research Protocol** - Background, aims, methods, ethics
4. **PICF** - Plain language, voluntary participation
5. **Conflict of Interest Declaration** - All investigators

Additional for moderate/high risk:
- Clinical trial insurance (NS 3.3.32)
- Safety monitoring and adverse event reporting
- DSMB if applicable

Additional for full HREC review:
- Investigator CVs and GCP certificates
- Recruitment materials for review

### QH Research Governance

Queensland Health sites:

1. **RGO Application** - Via QH Online Forms (after ethics approval)
2. **Site Specific Assessment (SSA)** - For each QH site
3. **Investigator Agreements** - All site PIs and co-investigators
4. **Research Coordinator** - Confirm availability

Additional for clinical trials:
- Clinical Trials Site Feasibility Assessment
- Clinical Trial Agreement (CTA) with sponsor

### MN Clinical Governance Policy

Mater Health sites:

1. **MN Research Governance Application** - After ethics approval
2. **Head of Department Approval** - From relevant department
3. **Resource Allocation Assessment** - Staff, equipment, space
4. **MN Research Register** - Register study

QI-specific:
- QI Registration Form → Unit Director approval
- Present at departmental meeting

### Privacy Act 1988

All projects with personal data:

1. **Privacy Collection Notice** - APP 5 compliance
2. **Consent for Use/Disclosure** - Unless exemption applies
3. **Secure Storage** - APP 11 reasonable security steps
4. **Data Breach Response** - Notifiable Data Breaches scheme

Additional for identifiable data:
- Document lawful basis (sensitive information = APP 3.3/3.4)
- Conduct Privacy Impact Assessment (PIA)

### Information Privacy Act 2009 (Qld)

Queensland institutions with personal data:

1. **Queensland IPP Compliance** - IPP 2 (collection), IPP 9 (security), IPP 11 (disclosure)
2. **Collection Purpose** - Document necessity and relevance

Additional for identifiable data:
- Public Interest Entity (PIE) approval if using data without consent

## Usage Examples

### Example 1: QI Project at Mater

```typescript
import { generateGovernanceChecklist } from './checklist.js';
import { EthicsPathwayType, RiskLevel } from '../../types/ethics.js';

const checklist = generateGovernanceChecklist(
  EthicsPathwayType.QI_REGISTRATION,
  'RETROSPECTIVE_AUDIT',
  'MN',
  RiskLevel.NEGLIGIBLE,
  ['DE_IDENTIFIED']
);

// Result includes:
// - MN QI Registration Form
// - Unit Director approval
// - Resource allocation
// - MN Research Register
// - Institutional requirements
```

### Example 2: Low-Risk Research at QH

```typescript
const checklist = generateGovernanceChecklist(
  EthicsPathwayType.LOW_RISK_RESEARCH,
  'SURVEY',
  'QH',
  RiskLevel.LOW,
  ['IDENTIFIABLE']
);

// Result includes:
// - NHMRC requirements (risk assessment, ethics app, protocol, PICF, COI)
// - QH governance (RGO, SSA, investigator agreements)
// - Privacy Act (notice, consent, security, breach response, PIA)
// - Qld IPA (IPP compliance, collection purpose)
```

### Example 3: Clinical Trial (High Risk)

```typescript
const checklist = generateGovernanceChecklist(
  EthicsPathwayType.FULL_HREC_REVIEW,
  'CLINICAL_TRIAL',
  'QH',
  RiskLevel.HIGH,
  ['IDENTIFIABLE']
);

// Result includes:
// - All NHMRC requirements
// - Insurance and safety monitoring
// - Investigator credentials
// - Recruitment materials
// - QH clinical trial requirements (feasibility, CTA)
// - Privacy and Qld IPA requirements
```

### Example 4: Track Progress

```typescript
// Get initial checklist
const checklist = generateGovernanceChecklist(...);

// Update item status
checklist[0].status = 'COMPLETE';
checklist[1].status = 'IN_PROGRESS';
checklist[1].assigned_to = 'Dr. Smith';
checklist[1].due_date = '2026-02-15';
checklist[1].notes = 'Waiting on department approval';

// Check progress
const stats = getChecklistStats(checklist);
console.log(`Progress: ${stats.percentComplete}%`);

// Get next steps
const nextSteps = getNextActionableItems(checklist);
console.log(`You can now work on: ${nextSteps.map(i => i.item).join(', ')}`);
```

## API Reference

### Main Functions

#### `generateGovernanceChecklist(pathway, methodology, institution, riskLevel?, dataTypes?)`

Generate complete governance checklist for a project.

**Parameters:**
- `pathway: EthicsPathwayType` - Ethics approval pathway
- `methodology: string` - Research/QI methodology
- `institution: string` - Primary institution code ('MN', 'QH', etc.)
- `riskLevel?: RiskLevel` - Risk assessment level (default: LOW)
- `dataTypes?: string[]` - Data types being collected (default: ['DE_IDENTIFIED'])

**Returns:** `ChecklistItem[]` - Sorted checklist with dependencies resolved

#### `getNHMRCRequirements(pathway, riskLevel)`

Get NHMRC National Statement requirements.

**Returns:** Base ethics requirements + additional for moderate/high risk + full HREC specifics

#### `getQHGovernanceRequirements(pathway)`

Get Queensland Health governance requirements.

**Returns:** RGO, SSA, agreements, resources + clinical trial specifics

#### `getMNGovernanceRequirements(pathway)`

Get Mater Health governance requirements.

**Returns:** MN governance, HoD approval, resources + QI specifics

#### `getPrivacyActRequirements(dataTypes)`

Get Privacy Act 1988 requirements.

**Returns:** Base privacy requirements + PIA/lawful basis for identifiable data

#### `getIPAQLDRequirements(dataTypes)`

Get Information Privacy Act 2009 (Qld) requirements.

**Returns:** Queensland IPP compliance + PIE approval for identifiable data

#### `resolveDependencies(checklist)`

Set dependency arrays based on logical sequencing.

**Returns:** Checklist with dependencies populated

#### `sortByDependencyOrder(checklist)`

Topological sort by dependencies (dependency-free items first).

**Returns:** Sorted checklist

#### `getChecklistStats(checklist)`

Calculate progress statistics.

**Returns:** `{ total, notStarted, inProgress, complete, percentComplete }`

#### `getNextActionableItems(checklist)`

Get items that can be started now (dependencies met).

**Returns:** `ChecklistItem[]` - Items ready to work on

## Implementation Notes

### Priority System

Internal priority field (1-5) determines sorting within dependency groups:
- **Priority 1**: Foundation items (risk assessment, QI registration)
- **Priority 2**: Core documentation (ethics app, protocol, privacy notices)
- **Priority 3**: Supporting documents (PICF, consent, resource plans)
- **Priority 4**: Governance submissions (RGO, MN governance)
- **Priority 5**: Final items (registrations, agreements)

### Dependency Rules

Key dependency chains:

1. **Ethics pathway**: Risk Assessment → Ethics Application → PICF → Recruitment
2. **Governance**: Ethics Application → RGO/MN Submission → SSA → Agreements
3. **Privacy**: Protocol → Privacy Notice → Consent
4. **Registration**: Governance Approvals → Research Register

### Topological Sort

The `sortByDependencyOrder` function implements topological sort with:
- Circular dependency detection
- Priority-based fallback for cycles
- Safety limit to prevent infinite loops
- Warning for unresolvable dependencies

## Testing

Comprehensive unit tests in `checklist.test.ts`:

```bash
npm test src/agents/ethics/checklist.test.ts
```

Tests cover:
- ✓ All requirement source functions
- ✓ Multi-source integration
- ✓ Dependency resolution
- ✓ Topological sorting
- ✓ Progress tracking
- ✓ Actionable item filtering
- ✓ Edge cases (circular dependencies, empty checklists)

## Integration

This module integrates with Phase 7 Ethics Agent:

1. **Input**: Ethics evaluation produces pathway, risk level, data types
2. **Processing**: Generate checklist combining all applicable requirements
3. **Output**: Structured checklist for `governance_checklist` field
4. **Updates**: Track status as project progresses through governance

Next phase (7.8) will format checklist for database storage and user presentation.

## References

- [NHMRC National Statement 2023](https://www.nhmrc.gov.au/about-us/publications/national-statement-ethical-conduct-human-research-2007-updated-2018)
- [QH Research Governance Framework](https://www.health.qld.gov.au/research-reports/research-governance)
- [Privacy Act 1988](https://www.legislation.gov.au/Series/C2004A03712)
- [Information Privacy Act 2009 (Qld)](https://www.legislation.qld.gov.au/view/html/inforce/current/act-2009-014)
