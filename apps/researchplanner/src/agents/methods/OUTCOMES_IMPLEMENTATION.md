# Outcomes Module Implementation Summary

**Phase 6.5 - Outcome Definition**
**Implementation Date:** 2026-01-28
**Status:** COMPLETED ✓

## Files Created

### Core Implementation
1. **`outcomes.ts`** (17KB)
   - Main outcome definition module
   - LLM-powered primary and secondary outcome generation
   - Validated measurement tool mappings (70+ instruments)
   - MCID estimation database (20+ common outcomes)
   - Measurement timing logic
   - Reporting guideline determination

### Testing
2. **`outcomes.test.ts`** (13KB)
   - Comprehensive test suite with 35+ test cases
   - Tests for all public functions
   - Validates measurement tool suggestions
   - Verifies timing logic for different study designs
   - Confirms MCID estimates
   - Checks reporting guideline mapping

### Documentation
3. **`README.md`** (9KB)
   - Complete module documentation
   - Function reference with examples
   - Validated measurement tools catalog
   - MCID reference table
   - Integration guide
   - Best practices

4. **`outcomes-example.ts`** (9KB)
   - 6 complete usage examples
   - RCT pain management study
   - QI PDSA cycle
   - Measurement tool suggestions
   - Timing determination
   - MCID estimation
   - Complete workflow demonstration

## Implementation Details

### Functions Implemented

✓ **`defineOutcomes(intendedOutcomes, studyDesign, reportingGuideline?)`**
  - Main entry point for outcome specification
  - Generates complete OutcomeSpec with primary and secondary outcomes
  - Uses LLM with structured prompts

✓ **`generatePrimaryOutcome(intendedOutcomes, design)`**
  - Creates single primary outcome (per reporting guidelines)
  - Enforces SMART criteria
  - Auto-enhances with validated tools and MCIDs

✓ **`generateSecondaryOutcomes(intendedOutcomes, design, count?)`**
  - Generates 2-4 secondary outcomes
  - Ensures diversity (clinical, patient-reported, safety)
  - Consistent measurement timing

✓ **`suggestMeasurementTool(outcomeName, outcomeType?)`**
  - Maps outcomes to validated instruments
  - 13 outcome domains covered
  - 70+ validated tools in database

✓ **`determineMeasurementTiming(studyDesign, duration?)`**
  - Generates appropriate measurement schedule
  - Adapts to RCT, cohort, cross-sectional, PDSA designs
  - Parses duration strings (months, weeks, years)

✓ **`estimateClinicallyMeaningfulDifference(outcomeName, evidenceBase?)`**
  - Provides MCID estimates from literature
  - 20+ common outcomes covered
  - Returns undefined for novel outcomes

✓ **`determineReportingGuideline(studyDesign)`**
  - Auto-detects reporting guideline
  - Supports CONSORT, STROBE, SQUIRE, StaRI, STARD

### Data Structures

✓ **`VALIDATED_MEASUREMENT_TOOLS`** (70+ instruments)
  - Pain measures (VAS, NRS, MPQ, BPI, PROMIS)
  - Quality of life (SF-36, EQ-5D, WHOQOL, PROMIS)
  - Mental health (PHQ-9, GAD-7, BDI, HDRS, GDS, BAI, HAM-A, STAI)
  - Functional status (Barthel, FIM, Karnofsky, WHO, PROMIS)
  - Mobility (TUG, 6MWT, Berg, Tinetti)
  - Clinical measures (BP, glucose, mortality)
  - Patient satisfaction (PSQ-18, HCAHPS, NPS)
  - Utilization (readmissions, infections)

✓ **`CLINICAL_DIFFERENCE_ESTIMATES`** (20+ MCIDs)
  - Pain scales (NRS: 2.0, VAS: 1.5)
  - Quality of life (SF-36: 5.0, EQ-5D: 0.074)
  - Mental health (PHQ-9: 5.0, GAD-7: 4.0)
  - Functional (Barthel: 2.0, FIM: 22.0, 6MWT: 50m)
  - Clinical (HbA1c: 0.5%, SBP: 5mmHg)
  - Relative risk reductions (Mortality: 20%, Readmission: 15%)

## Type Safety

All functions use TypeScript interfaces from `src/types/methodology.ts`:
- `OutcomeSpec`
- `PrimaryOutcome`
- `SecondaryOutcome`
- `StudyDesign`

Full type safety with strict mode enabled.

## LLM Integration

Uses `callLLM()` utility from `src/utils/llm.ts`:
- Temperature: 0.3 (focused, deterministic output)
- Model: Claude 3.5 Sonnet
- Structured JSON responses
- System prompts enforce research best practices
- Automatic response validation and enhancement

## Test Coverage

35+ test cases covering:
- ✓ Reporting guideline determination (5 tests)
- ✓ Measurement tool suggestions (11 tests)
- ✓ Measurement timing logic (7 tests)
- ✓ MCID estimation (10 tests)
- ✓ Data structure validation (2 tests)

All tests follow vitest framework conventions.

## Integration Points

### Inputs (from previous stages)
- `intendedOutcomes` string from Stage 1 (Intake Agent)
- `StudyDesign` specification from Phase 6.1-6.4

### Outputs (to subsequent stages)
- `OutcomeSpec` for methodology specification
- `clinically_meaningful_difference` for sample size calculation
- Measurement timing for data collection planning
- Instrument list for data collection instruments

### Module Exports
All functions and constants exported via `index.ts`:
```typescript
export {
  defineOutcomes,
  generatePrimaryOutcome,
  generateSecondaryOutcomes,
  suggestMeasurementTool,
  determineMeasurementTiming,
  estimateClinicallyMeaningfulDifference,
  determineReportingGuideline,
  VALIDATED_MEASUREMENT_TOOLS,
  CLINICAL_DIFFERENCE_ESTIMATES,
} from './outcomes.js';
```

## Dependencies

### Runtime
- `@anthropic-ai/sdk` - LLM API client
- `src/utils/llm.ts` - LLM utility functions
- `src/types/methodology.ts` - Type definitions

### Development
- `vitest` - Testing framework
- `typescript` - Type checking

## Code Quality

- ✓ ES module syntax with `.js` extensions
- ✓ Comprehensive JSDoc comments
- ✓ Exported constants for reusability
- ✓ Error handling in LLM calls
- ✓ Input validation
- ✓ Consistent naming conventions
- ✓ Helper function decomposition
- ✓ No hardcoded magic numbers
- ✓ Type-safe throughout

## Validation

The implementation satisfies all Phase 6.5 requirements:

✓ Create `determineReportingGuideline` function
✓ Create `defineOutcomes` LLM prompt template
✓ Implement primary outcome generator (single outcome constraint)
✓ Implement secondary outcomes generator (array of outcomes)
✓ Create `measurement_tool` suggestion logic
✓ Create `measurement_timing` definition logic
✓ Implement `clinically_meaningful_difference` estimator
✓ Use types from `src/types/methodology.ts`
✓ Include validated measurement tool mappings
✓ Follow TypeScript ES module conventions
✓ Use LLM utility from `src/utils/llm.ts`

## Next Steps

To use this module in the Methods Agent workflow:

1. **Import the module:**
   ```typescript
   import { defineOutcomes } from './agents/methods/outcomes.js';
   ```

2. **Call with study design:**
   ```typescript
   const outcomes = await defineOutcomes(
     intendedOutcomes,
     studyDesign
   );
   ```

3. **Use outputs for:**
   - Sample size calculation (effect size = MCID)
   - Data collection planning (instruments + timing)
   - Protocol writing (outcome definitions)
   - Statistical analysis planning

## References

Implementation follows standards from:
- CONSORT 2010 (RCT reporting)
- STROBE (observational studies)
- SQUIRE 2.0 (quality improvement)
- SPIRIT 2013 (protocol reporting)
- COMET Initiative (core outcome sets)

## Maintenance Notes

To add new outcome domains:
1. Add entries to `VALIDATED_MEASUREMENT_TOOLS`
2. Add MCIDs to `CLINICAL_DIFFERENCE_ESTIMATES`
3. Update pattern matching in `suggestMeasurementTool()`
4. Update pattern matching in `estimateClinicallyMeaningfulDifference()`
5. Add test cases
6. Update README documentation

---

**Implementation Status:** ✅ COMPLETE
**Files Modified:** 0 (new module)
**Files Created:** 4
**Lines of Code:** ~650
**Test Cases:** 35+
**Documentation:** Comprehensive
