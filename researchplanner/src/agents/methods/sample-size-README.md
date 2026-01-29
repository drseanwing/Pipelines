# Methods Agent - Sample Size Calculation

## Overview

This module implements sample size calculation for Phase 6.4 of the QI/Research Pipeline. It provides statistical power analysis for different outcome types and study designs.

## Module: `sample-size.ts`

### Main Function

#### `calculateSampleSize(design, outcomes, evidenceSynthesis)`

Main entry point that determines appropriate sample size based on:
- Study design type (RCT, cohort, etc.)
- Outcome type (continuous, binary, survival)
- Effect size from evidence synthesis
- Standard power analysis parameters (power=0.80, alpha=0.05)
- Attrition rate estimation
- Design complexity adjustments

**Returns:** `SampleSize` object or `null` for qualitative/QI studies

### Core Functions

#### `requiresSampleSize(designType): boolean`

Determines if formal sample size calculation is needed.

**Returns false for:**
- Qualitative studies (interviews, focus groups, ethnography)
- PDSA/QI cycles
- Case studies/series
- Pilot studies

#### `estimateEffectSize(evidenceSynthesis): number`

Extracts effect size estimates from literature review.

**Priority:**
1. Median of extracted effect sizes from articles
2. Text analysis for descriptors ("large effect" → 0.8, "moderate" → 0.5, "small" → 0.3)
3. Default conservative estimate (0.4)

#### `calculateContinuousSampleSize(effectSize, power, alpha): number`

Two-sample t-test power analysis.

**Formula:** `n = 2 * (Z_α/2 + Z_β)² / d²`

Where:
- `d` = Cohen's d (standardized effect size)
- `Z_α/2` = critical value for two-tailed test
- `Z_β` = critical value for power

#### `calculateBinarySampleSize(p1, p2, power, alpha): number`

Two-proportion z-test power analysis.

**Formula:** `n = (Z_α/2 + Z_β)² * [p1(1-p1) + p2(1-p2)] / (p1-p2)²`

Where:
- `p1` = proportion in control group
- `p2` = proportion in intervention group

#### `calculateSurvivalSampleSize(hazardRatio, power, alpha): number`

Log-rank test power analysis for time-to-event outcomes.

**Formula:** `n = 4 * (Z_α/2 + Z_β)² / [log(HR)]²`

Converts event count to sample size assuming 70% event rate.

#### `estimateAttritionRate(designType, duration): number`

Estimates expected dropout rate based on:
- Study design (RCTs: 20%, Cohorts: 25%, Surveys: 30%)
- Study duration (adds 2% per 6 months)
- Capped at 50%

#### `generateSampleSizeJustification(sampleSize): string`

Generates human-readable protocol text explaining:
- Target sample size
- Calculation method
- Statistical assumptions
- Effect size interpretation
- Attrition adjustment

### Internal Helpers

#### `classifyOutcome(outcome): OutcomeType`

Classifies primary outcome as CONTINUOUS, BINARY, or SURVIVAL based on text analysis of:
- Outcome definition
- Outcome name
- Measurement tool

#### `adjustForDesignComplexity(baseSampleSize, design): number`

Adjusts sample size for:
- **Cluster RCTs:** Applies design effect (ICC=0.05, cluster size=20)
- **Crossover designs:** Reduces by 50% (participants are own controls)
- **Non-inferiority trials:** Increases by 30%

#### `extractStudyDuration(design): number | undefined`

Parses study duration from design justification text or uses defaults:
- RCT: 12 months
- Cohort: 24 months

#### `getZScore(p): number`

Calculates Z-score for given probability using Abramowitz and Stegun approximation.

**Optimized for common values:**
- p=0.975 → z=1.96 (95% CI)
- p=0.8 → z=0.84 (80% power)

## Statistical Formulas

### Cohen's d Effect Sizes
- **Small:** 0.2 - 0.3
- **Medium:** 0.4 - 0.6
- **Large:** 0.7 - 1.0

### Standard Parameters
- **Power (1-β):** 0.80 (80% - conventional)
- **Significance (α):** 0.05 (two-tailed - conventional)
- **Attrition buffer:** Design-specific (15-25% typical)

### Design Effect (Cluster RCTs)
```
DE = 1 + (m - 1) * ICC
```
Where:
- `m` = cluster size
- `ICC` = intraclass correlation coefficient

## Usage Examples

### Example 1: RCT with Continuous Outcome

```typescript
import { calculateSampleSize } from './sample-size.js';

const design = {
  type: 'RCT',
  reporting_guideline: 'CONSORT',
  is_randomised: true,
  is_blinded: true,
  blinding_type: 'DOUBLE',
  control_type: 'PLACEBO',
  requires_sample_size: true,
  justification: '12 month double-blind RCT'
};

const outcomes = {
  primary: {
    name: 'Depression severity',
    definition: 'Change in PHQ-9 score from baseline to 12 months',
    measurement_tool: 'PHQ-9 validated questionnaire',
    measurement_timing: 'Baseline, 3, 6, 12 months',
    clinically_meaningful_difference: 5
  },
  secondary: []
};

const evidenceSynthesis = {
  synthesis: 'Previous RCTs showed moderate effect sizes...',
  articles: [
    { effect_size: 0.6, sample_size: 100 },
    { effect_size: 0.5, sample_size: 150 }
  ]
};

const sampleSize = await calculateSampleSize(design, outcomes, evidenceSynthesis);
// Returns: { target: 90, calculation_method: '...', assumptions: {...}, justification: '...' }
```

### Example 2: Qualitative Study (No Sample Size)

```typescript
const design = {
  type: 'QUALITATIVE_INTERVIEW',
  reporting_guideline: 'COREQ',
  is_randomised: false,
  is_blinded: false,
  requires_sample_size: false,
  justification: 'Thematic saturation approach'
};

const sampleSize = await calculateSampleSize(design, outcomes, evidenceSynthesis);
// Returns: null (no formal calculation needed)
```

### Example 3: Cluster RCT

```typescript
const design = {
  type: 'CLUSTER_RCT',
  subtype: 'CLUSTER_RANDOMIZED',
  reporting_guideline: 'CONSORT_CLUSTER',
  is_randomised: true,
  is_blinded: false,
  control_type: 'USUAL_CARE',
  requires_sample_size: true,
  justification: '12 month cluster RCT across 20 practices'
};

const sampleSize = await calculateSampleSize(design, outcomes, evidenceSynthesis);
// Automatically applies design effect inflation
```

## Integration Points

### Input Dependencies
- `StudyDesign` from study design determination (Phase 6.2)
- `OutcomeSpec` from outcome definition (Phase 6.5)
- `EvidenceSynthesis` from research agent (Phase 5.9)

### Output Usage
- Included in `ParticipantSpec.sample_size` (Phase 6.3)
- Referenced in methods section generation (Phase 6.7)
- Used for feasibility assessment (Phase 6.8)

## Testing

Run tests with:
```bash
npm test src/agents/methods/sample-size.test.ts
```

Test coverage includes:
- Design type classification
- Effect size estimation strategies
- All three outcome type calculations
- Attrition rate estimation
- Justification text generation
- Edge cases and error handling

## References

### Statistical Methods
- Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
- Lachin, J.M. (1981). Introduction to sample size determination and power analysis.
- Schoenfeld, D. (1983). Sample-size formula for the proportional-hazards regression model.

### Reporting Guidelines
- CONSORT 2010 (RCTs)
- STROBE (Observational studies)
- SPIRIT (Protocols)

## Limitations

1. **No Dependencies:** Implements basic statistical calculations without external libraries. For complex designs, consider statistical consultation.

2. **Simplified Assumptions:** Uses standard ICC (0.05) and event rates (0.7) for complex designs. Real studies should validate these.

3. **Effect Size Estimation:** Relies on text analysis and median values. Manual review recommended for critical studies.

4. **Outcome Classification:** Automated text analysis may misclassify complex outcomes. Verify outcome type for unusual measures.

## Future Enhancements

- [ ] Support for three-arm trials
- [ ] Non-inferiority/equivalence margin calculations
- [ ] Stepped-wedge cluster designs
- [ ] Multiple primary outcomes with Bonferroni correction
- [ ] Integration with power calculation packages (optional)
- [ ] Sensitivity analysis for parameter ranges
