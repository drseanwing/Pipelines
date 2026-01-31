# TypeScript Refactoring Plan: Document Generation System

**Created:** 2026-01-30
**Status:** Phases 1-3 Completed (2026-01-30)
**Target:** Phase 8 Document Generation System

## Completion Status

**Completed:**
- ✅ **Phase 1: Type System Foundation** - All type definitions consolidated, JSDoc added, DataFlowTypes.ts created
- ✅ **Phase 2: Function API Contracts** - sections-api.ts created, all functions renamed and documented
- ✅ **Phase 3: Interface Completion** - DataCollectionSpec.methods added, document_type duplication fixed, Zod schemas created

**Remaining:**
- ⚠️ **Phase 4: Build System Validation** - Test files need updates, agent files have property naming issues
- ⚠️ **Phase 5: Documentation & Testing** - Integration tests, API documentation generation

**Commit:** e7a2968 - "refactor(types): comprehensive TypeScript refactoring - Phases 1-3"

## Executive Summary

The current document generation implementation has ~13 TypeScript compilation errors stemming from architectural inconsistencies between different modules. This plan outlines a phased, spec-driven refactor to create a type-safe, maintainable document generation system.

## Current State Analysis

### Issues Identified

1. **Function Signature Mismatches**
   - `buildSection()` called as `(title, content)` but defined as `(markdown, headingLevel?)`
   - `buildSubsection()` imported but not implemented
   - Multiple call sites expect different behavior

2. **Type Definition Conflicts**
   - `DocumentType` has competing definitions (local type alias vs. enum)
   - `Citation` interface has duplicate properties (old vs. new naming)
   - Property naming inconsistencies (snake_case vs camelCase)

3. **Interface Incompleteness**
   - `ProcessedArticle` missing volume/issue/pages properties
   - `DataCollectionSpec` missing methods property
   - `DocumentRequirement` allows undefined required fields

4. **Import/Export Inconsistencies**
   - `CitationStyle` not properly exported from types barrel
   - Functions imported that don't exist (`buildSubsection`)
   - Duplicate type definitions across modules

### Root Causes

1. **Lack of Central Type Authority**: Types defined in multiple places
2. **No API Contract**: Function signatures not formally specified
3. **Evolution Without Refactoring**: Code added without updating dependent code
4. **Missing Validation Layer**: No runtime type checking for data flow

## Data Flow Map

```
┌─────────────┐
│   INTAKE    │ → IntakeData (snake_case)
└──────┬──────┘
       ↓
┌─────────────┐
│  RESEARCH   │ → ResearchResults, ProcessedArticle[], Citation[]
└──────┬──────┘
       ↓
┌─────────────┐
│ METHODOLOGY │ → MethodologyStageData, StudyDesign, SampleSize
└──────┬──────┘
       ↓
┌─────────────┐
│   ETHICS    │ → EthicsEvaluation, DataGovernance, ConsentRequirements
└──────┬──────┘
       ↓
┌─────────────┐
│  DOCUMENTS  │ → DOCX Buffers (protocol, PICF, cover letter, etc.)
└─────────────┘
```

### Data Contract Specification

**Input Types** (from database JSONB columns):
- `Project` → Complete project record with all stage data
- `IntakeData` → User-submitted project concept
- `ResearchStageData` → Literature synthesis + citations
- `MethodologyStageData` → Study design + procedures
- `EthicsStageData` → Ethics pathway + governance

**Processing Types** (internal):
- `DocumentSection` → Structured content blocks
- `Citation` → Formatted reference
- `VersionHistoryEntry` → Document version tracking

**Output Types**:
- `Buffer` → DOCX binary data
- `DocumentMetadata` → Generation metadata
- `GeneratedDocument` → Database record of generated doc

## Refactoring Strategy

### Phase 1: Type System Foundation (Priority: CRITICAL)

**Goal:** Establish single source of truth for all types

**Tasks:**
1. ✅ Consolidate `DocumentType` into single enum in `types/documents.ts`
2. ✅ Create canonical `Citation` interface with all properties
3. ✅ Add missing properties to `ProcessedArticle`
4. ✅ Export `CitationStyle` from types barrel
5. ✅ Create `DataFlowTypes.ts` documenting input→output contracts
6. ✅ Add JSDoc with @typedef for all interfaces

**Validation Criteria:**
- Zero duplicate type definitions
- All imports resolve to single canonical source
- `pnpm build:packages` succeeds

**Files to Modify:**
- `src/types/documents.ts` - DocumentType enum
- `src/types/research.ts` - Citation, ProcessedArticle
- `src/types/methodology.ts` - Add missing properties
- `src/types/index.ts` - Centralized exports
- `src/types/DataFlowTypes.ts` - NEW: Contract documentation

### Phase 2: Function API Contracts (Priority: HIGH)

**Goal:** Define and implement consistent function signatures

**Tasks:**
1. ✅ Create `sections-api.ts` with formal API definitions
2. ✅ Implement `buildSection(title: string, content: string): Paragraph[]`
3. ✅ Implement `buildSubsection(title: string, content: string): Paragraph[]`
4. ✅ Deprecate/rename old `buildSection(markdown, headingLevel)`  to `markdownToParagraphs()`
5. ✅ Update all call sites to use new API
6. ✅ Add comprehensive JSDoc with examples

**Validation Criteria:**
- All `buildSection` calls match signature
- No "cannot assign string to heading enum" errors
- Unit tests pass for all section builders

**Files to Modify:**
- `src/documents/sections.ts` - Implement new API
- `src/documents/sections-api.ts` - NEW: API specification
- `src/documents/DocumentGenerator.ts` - Update call sites
- `src/documents/protocol.ts` - Update call sites
- `src/documents/picf.ts` - Update call sites
- `src/documents/dmp.ts` - Update call sites

### Phase 3: Interface Completion (Priority: HIGH)

**Goal:** Ensure all interfaces match actual usage

**Tasks:**
1. ✅ Add `methods: string[]` to `DataCollectionSpec`
2. ✅ Make `DocumentRequirement.document_type` non-nullable
3. ✅ Fix duplicate `document_type` in object spreads
4. ✅ Add validation schemas for all interfaces
5. ✅ Create interface usage examples (in DataFlowTypes.ts and schemas.ts)

**Validation Criteria:**
- No "property does not exist" errors
- No "undefined not assignable" errors
- Zod schemas validate all data flows

**Files to Modify:**
- `src/types/methodology.ts` - DataCollectionSpec
- `src/documents/determination.ts` - DocumentRequirement fixes
- `src/validation/schemas.ts` - Add Zod schemas

### Phase 4: Build System Validation (Priority: MEDIUM)

**Goal:** Ensure build succeeds with strict type checking

**Tasks:**
1. ⚠️ Enable `--strict` mode in tsconfig.json
2. ⚠️ Fix all strict mode violations
3. ⚠️ Add pre-commit type checking hook
4. ⚠️ Document build process

**Validation Criteria:**
- `pnpm build` succeeds with zero errors
- `tsc --noEmit --strict` passes
- Docker build completes successfully

**Files to Modify:**
- `tsconfig.json` - Enable strict mode
- `.husky/pre-commit` - Add type checking
- `package.json` - Add type-check script

### Phase 5: Documentation & Testing (Priority: MEDIUM)

**Goal:** Prevent regression through documentation and tests

**Tasks:**
1. ⚠️ Document data flow contracts
2. ⚠️ Create type testing suite
3. ⚠️ Add integration tests for document generation
4. ⚠️ Generate API documentation
5. ⚠️ Create troubleshooting guide

**Validation Criteria:**
- All public APIs have JSDoc
- Type tests cover all interfaces
- Integration tests generate valid DOCX files

**Files to Create:**
- `src/types/DataFlowTypes.md` - Contract documentation
- `src/documents/__tests__/types.test.ts` - Type tests
- `src/documents/__tests__/integration.test.ts` - Integration tests
- `docs/API_REFERENCE.md` - Generated API docs

## Implementation Plan

### Week 1: Foundation
- [ ] Phase 1: Type System Foundation (Days 1-2)
- [ ] Phase 2: Function API Contracts (Days 3-5)

### Week 2: Completion
- [ ] Phase 3: Interface Completion (Days 1-2)
- [ ] Phase 4: Build System Validation (Day 3)
- [ ] Phase 5: Documentation & Testing (Days 4-5)

## Success Metrics

1. **Zero TypeScript Errors**: `pnpm build` completes with no errors
2. **Zero Type Warnings**: No implicit any, no unsafe assignments
3. **100% Type Coverage**: All public APIs fully typed
4. **Test Coverage**: >80% coverage on document generation
5. **Docker Build**: qi-app builds successfully
6. **Documentation**: All interfaces documented with examples

## Risk Mitigation

1. **Breaking Changes**:
   - Create feature branch for refactor
   - Tag current state before starting
   - Keep old functions deprecated but functional

2. **Scope Creep**:
   - Strict phase boundaries
   - No new features during refactor
   - Document future improvements separately

3. **Testing Gaps**:
   - Add tests before changing code
   - Validate each phase independently
   - Keep integration tests running

## Rollback Plan

If refactor blocks progress:
1. Revert to tagged commit
2. Apply minimal fixes for critical errors only
3. Schedule refactor for dedicated sprint

## Approval Required

- [ ] Architecture review completed
- [ ] Phase plan approved
- [ ] Resource allocation confirmed
- [ ] Testing strategy validated

## Notes

**Current Errors Remaining:** ~13 TypeScript compilation errors
**Estimated Effort:** 2 weeks (1 developer)
**Dependencies:** None - can proceed immediately
**Blocking:** Docker build, Production deployment

---

**Next Steps:**
1. Review this plan
2. Approve phases 1-3 for immediate work
3. Create feature branch `refactor/document-types`
4. Begin Phase 1 implementation
