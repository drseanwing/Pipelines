# Methods Agent - Outcome Definition Module

Phase 6.5 implementation for defining primary and secondary research outcomes with validated measurement tools.

## Overview

The `outcomes.ts` module provides comprehensive functionality for:
- Defining primary and secondary outcomes for research studies
- Mapping outcomes to validated measurement instruments
- Determining appropriate measurement timing
- Estimating clinically meaningful differences (MCIDs)
- Ensuring compliance with reporting guidelines (CONSORT, STROBE, SQUIRE, etc.)

## Core Functions

### `defineOutcomes(intendedOutcomes, studyDesign, reportingGuideline?)`

Main entry point that generates a complete outcome specification using LLM-powered analysis.

**Parameters:**
- `intendedOutcomes` (string): Description of intended study outcomes from Stage 1
- `studyDesign` (StudyDesign): Study design specification including type, randomization, blinding
- `reportingGuideline` (string, optional): Override reporting guideline (e.g., 'CONSORT')

**Returns:** `Promise<OutcomeSpec>` containing:
- `primary` (PrimaryOutcome): Single most important outcome
- `secondary` (SecondaryOutcome[]): Array of 2-4 supporting outcomes

**Example:**
```typescript
const outcomes = await defineOutcomes(
  "Evaluate pain reduction and functional improvement in knee osteoarthritis patients",
  {
    type: 'RCT',
    is_randomised: true,
    is_blinded: true,
    blinding_type: 'DOUBLE',
    control_type: 'PLACEBO',
    reporting_guideline: 'CONSORT',
    requires_sample_size: true,
    justification: 'Gold standard for efficacy'
  }
);

// outcomes.primary = {
//   name: "Pain intensity",
//   definition: "Change in knee pain severity from baseline",
//   measurement_tool: "Visual Analog Scale (VAS)",
//   measurement_timing: "Baseline, 6 weeks, 12 weeks",
//   clinically_meaningful_difference: 1.5
// }
```

### `generatePrimaryOutcome(intendedOutcomes, design)`

Generates a single primary outcome using LLM with automated enhancement.

**Constraints:**
- Produces exactly ONE primary outcome (as per reporting guidelines)
- Uses validated measurement tools where available
- Estimates MCID for common outcomes
- Ensures SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)

### `generateSecondaryOutcomes(intendedOutcomes, design, count?)`

Generates 2-4 secondary outcomes that complement the primary outcome.

**Parameters:**
- `count` (number, optional): Number of secondary outcomes to generate (default: 3)

**Output characteristics:**
- Diverse outcome types (clinical, patient-reported, safety)
- Each with validated measurement tools
- Consistent measurement timing

### `suggestMeasurementTool(outcomeName, outcomeType?)`

Maps outcome names to validated measurement instruments using extensive knowledge base.

**Supported outcome domains:**
- **Pain**: VAS, NRS, McGill Pain Questionnaire, Brief Pain Inventory, PROMIS
- **Quality of Life**: SF-36, EQ-5D-5L, WHOQOL-BREF, PROMIS Global Health
- **Mental Health**: PHQ-9, GAD-7, BDI-II, HDRS, GDS, BAI, HAM-A, STAI
- **Functional Status**: Barthel Index, FIM, Karnofsky, WHO Performance Status, PROMIS Physical Function
- **Mobility**: Timed Up and Go (TUG), 6-Minute Walk Test (6MWT), Berg Balance Scale
- **Clinical Measures**: Blood pressure monitoring, HbA1c, CGM, mortality
- **Patient Satisfaction**: PSQ-18, HCAHPS, NPS
- **Healthcare Utilization**: Readmission rates, infection surveillance

**Example:**
```typescript
suggestMeasurementTool("depression severity")
// Returns: "Patient Health Questionnaire-9 (PHQ-9)"

suggestMeasurementTool("quality of life")
// Returns: "SF-36 Health Survey"

suggestMeasurementTool("mobility assessment")
// Returns: "Timed Up and Go Test (TUG)"
```

### `determineMeasurementTiming(studyDesign, duration?)`

Generates appropriate measurement schedule based on study design and duration.

**Logic:**
- **RCT (≤3 months)**: Baseline, end of intervention
- **RCT (6 months)**: Baseline, 3 months, 6 months
- **RCT (12 months)**: Baseline, quarterly assessments
- **Cohort studies**: Baseline, annual follow-up
- **Cross-sectional**: Single time point
- **PDSA cycles**: Pre-intervention, monthly, post-intervention

### `estimateClinicallyMeaningfulDifference(outcomeName, evidenceBase?)`

Provides MCID estimates based on published literature.

**Common MCIDs:**
- Pain NRS: 2.0 points (0-10 scale)
- Pain VAS: 1.5 cm (0-10 cm scale)
- SF-36 PCS/MCS: 5.0 points
- EQ-5D: 0.074 index points
- PHQ-9: 5.0 points (depression)
- GAD-7: 4.0 points (anxiety)
- HbA1c: 0.5 percentage points
- 6-Minute Walk Test: 50 meters
- Barthel Index: 2.0 points
- Mortality: 20% relative risk reduction
- Readmission: 15% relative risk reduction

**Returns:** `number | undefined` (undefined if no established MCID)

### `determineReportingGuideline(studyDesign)`

Auto-detects appropriate reporting guideline based on study design.

**Mapping:**
- Randomized designs → **CONSORT**
- Cohort/case-control/cross-sectional → **STROBE**
- Quality improvement/PDSA → **SQUIRE**
- Implementation studies → **StaRI**
- Diagnostic accuracy → **STARD**

## Data Structures

### `OutcomeSpec`
```typescript
interface OutcomeSpec {
  primary: PrimaryOutcome;
  secondary: SecondaryOutcome[];
}
```

### `PrimaryOutcome`
```typescript
interface PrimaryOutcome {
  name: string;                          // Concise outcome name
  definition: string;                    // Precise operational definition
  measurement_tool: string;              // Validated instrument/scale
  measurement_timing: string;            // When measurements occur
  clinically_meaningful_difference?: number; // MCID estimate
}
```

### `SecondaryOutcome`
```typescript
interface SecondaryOutcome {
  name: string;
  definition: string;
  measurement_tool: string;
  measurement_timing: string;
}
```

## Validated Measurement Tools

The module includes mappings for 70+ validated instruments across 13 outcome domains:

### Pain Measures
- Visual Analog Scale (VAS)
- Numeric Rating Scale (NRS)
- McGill Pain Questionnaire
- Brief Pain Inventory (BPI)
- PROMIS Pain Intensity Scale

### Quality of Life
- SF-36 Health Survey
- EQ-5D-5L
- WHO Quality of Life (WHOQOL-BREF)
- PROMIS Global Health

### Mental Health
- **Depression**: PHQ-9, BDI-II, HDRS, GDS
- **Anxiety**: GAD-7, BAI, HAM-A, STAI

### Functional Outcomes
- Barthel Index
- Functional Independence Measure (FIM)
- Karnofsky Performance Status
- WHO Performance Status
- PROMIS Physical Function Scale

### Mobility
- Timed Up and Go Test (TUG)
- 6-Minute Walk Test (6MWT)
- Berg Balance Scale
- Tinetti Mobility Test

### Clinical Measures
- Blood pressure (automated, ambulatory, home monitoring)
- Glycemic control (HbA1c, FBG, CGM)
- Mortality (all-cause, disease-specific)

### Patient Satisfaction
- Patient Satisfaction Questionnaire (PSQ-18)
- HCAHPS
- Net Promoter Score (NPS)

### Healthcare Utilization
- Readmission rates (30-day, 90-day)
- Infection surveillance (CDC/NHSN)

## Testing

Comprehensive test suite in `outcomes.test.ts` covering:
- Reporting guideline determination (CONSORT, STROBE, SQUIRE, StaRI, STARD)
- Measurement tool suggestions (50+ scenarios)
- Measurement timing logic (RCT, cohort, cross-sectional, PDSA)
- MCID estimation (20+ common outcomes)
- Data structure validation

**Run tests:**
```bash
npm test -- outcomes.test.ts
```

## Integration

### With Stage 1 (Intake Agent)
Receives `intendedOutcomes` string from intake form describing desired study endpoints.

### With Study Design Module
Receives `StudyDesign` specification to inform outcome definition, measurement timing, and reporting guideline selection.

### With Sample Size Calculation
Provides `clinically_meaningful_difference` as effect size estimate for power analysis.

### With Data Collection Planning
Informs instrument selection and data collection timepoints.

## Best Practices

1. **Primary Outcome First**: Always define primary outcome before secondary outcomes
2. **Single Primary**: Reporting guidelines require exactly ONE primary outcome
3. **Validated Tools**: Prefer validated instruments over ad-hoc measures
4. **MCID Consideration**: Include MCID when available for sample size calculation
5. **Timing Consistency**: Align measurement timing with study feasibility
6. **Domain Coverage**: Include diverse outcome types (efficacy, safety, patient-reported)

## References

- CONSORT 2010: Consolidated Standards of Reporting Trials
- STROBE: Strengthening the Reporting of Observational Studies in Epidemiology
- SQUIRE 2.0: Standards for Quality Improvement Reporting Excellence
- SPIRIT 2013: Standard Protocol Items for Randomized Trials
- COMET Initiative: Core Outcome Measures in Effectiveness Trials

## Future Enhancements

- Integration with COMET database for core outcome sets
- Support for patient and public involvement (PPI) in outcome selection
- Automated literature search for published MCIDs
- Outcome prioritization for multi-arm studies
- Composite outcome definition support
