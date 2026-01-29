/**
 * Sample Size Calculation Module
 * Phase 6.4 - Sample Size Calculation
 *
 * Implements sample size calculation for different outcome types
 * using standard statistical formulas for power analysis.
 */

import type { SampleSize, StudyDesign, OutcomeSpec, PrimaryOutcome } from '../../types/methodology.js';

/**
 * Evidence synthesis data structure for effect size estimation
 */
export interface EvidenceSynthesis {
  synthesis: string;
  articles?: Array<{
    effect_size?: number;
    sample_size?: number;
    methodology_notes?: string;
  }>;
}

/**
 * Outcome type classification
 */
export type OutcomeType = 'CONTINUOUS' | 'BINARY' | 'SURVIVAL' | 'UNKNOWN';

/**
 * Calculate sample size for a study design
 *
 * Main entry point that determines the appropriate calculation method
 * based on study design and outcome types.
 *
 * @param design - Study design specification
 * @param outcomes - Outcome measures specification
 * @param evidenceSynthesis - Evidence synthesis for effect size estimation
 * @returns Sample size calculation with justification
 */
export async function calculateSampleSize(
  design: StudyDesign,
  outcomes: OutcomeSpec,
  evidenceSynthesis: EvidenceSynthesis
): Promise<SampleSize | null> {
  // Check if sample size calculation is required
  if (!requiresSampleSize(design.type)) {
    return null;
  }

  // Estimate effect size from evidence
  const effectSize = estimateEffectSize(evidenceSynthesis);

  // Standard power analysis parameters
  const power = 0.80; // 80% power is conventional
  const alpha = 0.05; // 5% significance level (two-tailed)

  // Determine outcome type
  const outcomeType = classifyOutcome(outcomes.primary);

  // Calculate base sample size based on outcome type
  let baseSampleSize: number;
  let calculationMethod: string;

  switch (outcomeType) {
    case 'CONTINUOUS':
      baseSampleSize = calculateContinuousSampleSize(effectSize, power, alpha);
      calculationMethod = 'Two-sample t-test power analysis';
      break;

    case 'BINARY':
      // For binary outcomes, assume equal proportions
      const p1 = 0.5; // Baseline proportion (conservative estimate)
      const p2 = p1 + (effectSize * 0.15); // Convert effect size to proportion difference
      baseSampleSize = calculateBinarySampleSize(p1, p2, power, alpha);
      calculationMethod = 'Two-proportion z-test power analysis';
      break;

    case 'SURVIVAL':
      // Convert effect size to hazard ratio
      const hazardRatio = 1 + effectSize;
      baseSampleSize = calculateSurvivalSampleSize(hazardRatio, power, alpha);
      calculationMethod = 'Log-rank test power analysis';
      break;

    default:
      // Unknown outcome type - use conservative continuous calculation
      baseSampleSize = calculateContinuousSampleSize(effectSize, power, alpha);
      calculationMethod = 'Conservative power analysis (continuous outcome assumed)';
      break;
  }

  // Adjust for study design complexity
  baseSampleSize = adjustForDesignComplexity(baseSampleSize, design);

  // Estimate attrition rate
  const attritionRate = estimateAttritionRate(design.type, extractStudyDuration(design));

  // Calculate target sample size accounting for attrition
  const targetSampleSize = Math.ceil(baseSampleSize / (1 - attritionRate));

  // Generate justification
  const justification = generateSampleSizeJustification({
    target: targetSampleSize,
    calculation_method: calculationMethod,
    assumptions: {
      effect_size: effectSize,
      power,
      alpha,
      attrition_rate: attritionRate,
    },
    justification: '', // Will be filled by generator
  });

  return {
    target: targetSampleSize,
    calculation_method: calculationMethod,
    assumptions: {
      effect_size: effectSize,
      power,
      alpha,
      attrition_rate: attritionRate,
    },
    justification,
  };
}

/**
 * Determine if a study design requires sample size calculation
 *
 * Qualitative studies, quality improvement cycles, and some observational
 * studies may not require formal sample size calculations.
 *
 * @param designType - Study design type
 * @returns True if sample size calculation is required
 */
export function requiresSampleSize(designType: string): boolean {
  const noSampleSizeTypes = [
    'QUALITATIVE',
    'QUALITATIVE_INTERVIEW',
    'QUALITATIVE_FOCUS_GROUP',
    'QUALITATIVE_ETHNOGRAPHY',
    'PDSA_CYCLE',
    'PDSA',
    'QI_CYCLE',
    'CASE_STUDY',
    'CASE_SERIES',
    'PILOT_STUDY', // May use convenience sample
  ];

  const normalized = designType.toUpperCase().replace(/[_\s-]/g, '_');

  return !noSampleSizeTypes.some((type) =>
    normalized.includes(type)
  );
}

/**
 * Estimate effect size from evidence synthesis
 *
 * Extracts effect size estimates from the literature review.
 * Falls back to conventional small-medium effect size if no data available.
 *
 * @param evidenceSynthesis - Evidence synthesis with article data
 * @returns Estimated effect size (Cohen's d or equivalent)
 */
export function estimateEffectSize(evidenceSynthesis: EvidenceSynthesis): number {
  // Try to extract effect sizes from articles
  if (evidenceSynthesis.articles && evidenceSynthesis.articles.length > 0) {
    const effectSizes = evidenceSynthesis.articles
      .map((article) => article.effect_size)
      .filter((es): es is number => es !== undefined && es > 0);

    if (effectSizes.length > 0) {
      // Use median effect size (more robust than mean)
      const sorted = effectSizes.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      return median;
    }
  }

  // Parse synthesis text for effect size mentions
  const synthesis = evidenceSynthesis.synthesis.toLowerCase();

  // Look for common effect size descriptors
  if (synthesis.includes('large effect') || synthesis.includes('substantial')) {
    return 0.8; // Large effect size
  }

  if (synthesis.includes('moderate effect') || synthesis.includes('medium')) {
    return 0.5; // Medium effect size
  }

  if (synthesis.includes('small effect') || synthesis.includes('modest')) {
    return 0.3; // Small effect size
  }

  // Default to small-medium effect size (conservative)
  return 0.4;
}

/**
 * Calculate sample size for continuous outcomes
 *
 * Uses the formula for two-sample t-test with equal variances.
 * Formula: n = 2 * (Z_α/2 + Z_β)² * σ² / δ²
 * Where δ = effect size (Cohen's d), σ = 1 (standardized)
 *
 * @param effectSize - Standardized effect size (Cohen's d)
 * @param power - Statistical power (typically 0.80)
 * @param alpha - Significance level (typically 0.05 for two-tailed)
 * @returns Sample size per group
 */
export function calculateContinuousSampleSize(
  effectSize: number,
  power: number,
  alpha: number
): number {
  // Get Z-scores for alpha and beta
  const zAlpha = getZScore(1 - alpha / 2); // Two-tailed
  const zBeta = getZScore(power);

  // Formula: n = 2 * (Z_α/2 + Z_β)² / d²
  const nPerGroup = (2 * Math.pow(zAlpha + zBeta, 2)) / Math.pow(effectSize, 2);

  // Total sample size (both groups)
  return Math.ceil(nPerGroup * 2);
}

/**
 * Calculate sample size for binary outcomes
 *
 * Uses the formula for two-proportion z-test.
 * Formula: n = (Z_α/2 + Z_β)² * [p1(1-p1) + p2(1-p2)] / (p1-p2)²
 *
 * @param p1 - Proportion in control group
 * @param p2 - Proportion in intervention group
 * @param power - Statistical power (typically 0.80)
 * @param alpha - Significance level (typically 0.05)
 * @returns Total sample size (both groups)
 */
export function calculateBinarySampleSize(
  p1: number,
  p2: number,
  power: number,
  alpha: number
): number {
  // Validate proportions
  if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1) {
    throw new Error('Proportions must be between 0 and 1 (exclusive)');
  }

  const diff = Math.abs(p2 - p1);
  if (diff < 0.001) {
    throw new Error('Proportions must be meaningfully different');
  }

  // Get Z-scores
  const zAlpha = getZScore(1 - alpha / 2);
  const zBeta = getZScore(power);

  // Pooled variance
  const variance = p1 * (1 - p1) + p2 * (1 - p2);

  // Sample size per group
  const nPerGroup = (Math.pow(zAlpha + zBeta, 2) * variance) / Math.pow(diff, 2);

  // Total sample size (both groups)
  return Math.ceil(nPerGroup * 2);
}

/**
 * Calculate sample size for survival outcomes
 *
 * Uses the formula for log-rank test.
 * Formula: n = 4 * (Z_α/2 + Z_β)² / [log(HR)]²
 *
 * @param hazardRatio - Expected hazard ratio
 * @param power - Statistical power (typically 0.80)
 * @param alpha - Significance level (typically 0.05)
 * @returns Total number of events required
 */
export function calculateSurvivalSampleSize(
  hazardRatio: number,
  power: number,
  alpha: number
): number {
  if (hazardRatio <= 0) {
    throw new Error('Hazard ratio must be positive');
  }

  if (Math.abs(hazardRatio - 1.0) < 0.01) {
    throw new Error('Hazard ratio must be meaningfully different from 1.0');
  }

  // Get Z-scores
  const zAlpha = getZScore(1 - alpha / 2);
  const zBeta = getZScore(power);

  // Log hazard ratio
  const logHR = Math.log(hazardRatio);

  // Number of events required
  const events = (4 * Math.pow(zAlpha + zBeta, 2)) / Math.pow(logHR, 2);

  // Convert to sample size (assuming ~70% event rate)
  const eventRate = 0.7;
  const totalSampleSize = Math.ceil(events / eventRate);

  return totalSampleSize;
}

/**
 * Estimate attrition (dropout) rate based on study design and duration
 *
 * @param designType - Study design type
 * @param duration - Study duration in months (or undefined)
 * @returns Estimated attrition rate (0.0 to 1.0)
 */
export function estimateAttritionRate(designType: string, duration?: number): number {
  const normalized = designType.toUpperCase();

  // Base attrition rates by design type
  let baseRate = 0.15; // Default 15%

  if (normalized.includes('RCT') || normalized.includes('RANDOMIZED')) {
    baseRate = 0.20; // RCTs tend to have higher attrition
  } else if (normalized.includes('COHORT')) {
    baseRate = 0.25; // Cohort studies can have substantial attrition
  } else if (normalized.includes('CROSS_SECTIONAL')) {
    baseRate = 0.05; // Single timepoint - minimal attrition
  } else if (normalized.includes('SURVEY')) {
    baseRate = 0.30; // Surveys can have high non-response
  }

  // Adjust for duration if known
  if (duration !== undefined && duration > 0) {
    // Add 2% per 6 months of follow-up
    const durationFactor = Math.floor(duration / 6) * 0.02;
    baseRate += durationFactor;
  }

  // Cap at 50% attrition
  return Math.min(baseRate, 0.50);
}

/**
 * Generate human-readable justification for sample size calculation
 *
 * @param sampleSize - Calculated sample size structure
 * @returns Justification text suitable for protocol
 */
export function generateSampleSizeJustification(sampleSize: SampleSize): string {
  const { target, calculation_method, assumptions } = sampleSize;
  const { effect_size, power, alpha, attrition_rate } = assumptions;

  // Format effect size description
  let effectDesc: string;
  if (effect_size < 0.3) {
    effectDesc = 'small';
  } else if (effect_size < 0.6) {
    effectDesc = 'medium';
  } else {
    effectDesc = 'large';
  }

  // Calculate base sample size before attrition
  const baseSampleSize = Math.round(target * (1 - attrition_rate));

  const justification = `
The target sample size of ${target} participants was determined using ${calculation_method}.
This calculation assumes a ${effectDesc} effect size (d = ${effect_size.toFixed(2)}),
statistical power of ${(power * 100).toFixed(0)}%, and a two-tailed significance level of ${alpha.toFixed(3)}.

The base sample size calculation yields ${baseSampleSize} participants. To account for an anticipated
attrition rate of ${(attrition_rate * 100).toFixed(0)}% over the study period, we inflated the sample
size to ${target} participants. This ensures adequate statistical power even with expected dropout.

This sample size provides sufficient power to detect clinically meaningful differences in the primary
outcome measure while maintaining acceptable Type I and Type II error rates.
  `.trim();

  return justification;
}

/**
 * Classify outcome type from primary outcome specification
 *
 * @param outcome - Primary outcome specification
 * @returns Outcome type classification
 */
function classifyOutcome(outcome: PrimaryOutcome): OutcomeType {
  const definition = outcome.definition.toLowerCase();
  const name = outcome.name.toLowerCase();
  const tool = outcome.measurement_tool.toLowerCase();

  // Check for survival/time-to-event outcomes
  if (
    definition.includes('survival') ||
    definition.includes('time to') ||
    definition.includes('time-to-event') ||
    name.includes('survival') ||
    tool.includes('kaplan')
  ) {
    return 'SURVIVAL';
  }

  // Check for binary outcomes
  if (
    definition.includes('yes/no') ||
    definition.includes('binary') ||
    definition.includes('dichotomous') ||
    definition.includes('proportion') ||
    definition.includes('rate of') ||
    definition.includes('incidence') ||
    definition.includes('presence of') ||
    tool.includes('binary')
  ) {
    return 'BINARY';
  }

  // Check for continuous outcomes
  if (
    definition.includes('score') ||
    definition.includes('scale') ||
    definition.includes('mean') ||
    definition.includes('average') ||
    definition.includes('continuous') ||
    tool.includes('scale') ||
    tool.includes('questionnaire')
  ) {
    return 'CONTINUOUS';
  }

  // Default to continuous (most common)
  return 'CONTINUOUS';
}

/**
 * Adjust sample size for design complexity
 *
 * Cluster randomized trials, crossover designs, and other complex
 * designs require sample size adjustments.
 *
 * @param baseSampleSize - Base sample size from power calculation
 * @param design - Study design specification
 * @returns Adjusted sample size
 */
function adjustForDesignComplexity(
  baseSampleSize: number,
  design: StudyDesign
): number {
  let adjustedSize = baseSampleSize;

  // Cluster randomization requires inflation
  if (design.subtype?.includes('CLUSTER') || design.type.includes('CLUSTER')) {
    // Design effect = 1 + (cluster_size - 1) * ICC
    // Assume moderate ICC of 0.05 and average cluster size of 20
    const icc = 0.05;
    const clusterSize = 20;
    const designEffect = 1 + (clusterSize - 1) * icc;
    adjustedSize = Math.ceil(baseSampleSize * designEffect);
  }

  // Crossover designs can use smaller samples
  if (design.type.includes('CROSSOVER')) {
    // Each participant serves as their own control
    adjustedSize = Math.ceil(baseSampleSize * 0.5);
  }

  // Non-inferiority trials may need larger samples
  if (design.justification.toLowerCase().includes('non-inferiority')) {
    adjustedSize = Math.ceil(baseSampleSize * 1.3);
  }

  return adjustedSize;
}

/**
 * Extract study duration from design specification
 *
 * @param design - Study design specification
 * @returns Duration in months or undefined
 */
function extractStudyDuration(design: StudyDesign): number | undefined {
  const justification = design.justification.toLowerCase();

  // Look for duration mentions
  const monthMatch = justification.match(/(\d+)\s*months?/);
  if (monthMatch) {
    return parseInt(monthMatch[1], 10);
  }

  const yearMatch = justification.match(/(\d+)\s*years?/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10) * 12;
  }

  // Default durations by design type
  if (design.type.includes('RCT')) {
    return 12; // Typical RCT is 12 months
  }

  if (design.type.includes('COHORT')) {
    return 24; // Cohort studies often longer
  }

  return undefined;
}

/**
 * Get Z-score for a given probability
 *
 * Approximation using the inverse normal CDF.
 * Based on Abramowitz and Stegun approximation.
 *
 * @param p - Probability (0 to 1)
 * @returns Z-score
 */
function getZScore(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1 (exclusive)');
  }

  // Common values for efficiency
  const commonValues: Record<string, number> = {
    '0.5': 0,
    '0.8': 0.84162123,
    '0.9': 1.28155157,
    '0.95': 1.64485363,
    '0.975': 1.95996398,
    '0.99': 2.32634787,
    '0.995': 2.57583152,
  };

  const key = p.toFixed(3);
  if (commonValues[key]) {
    return commonValues[key];
  }

  // Abramowitz and Stegun approximation
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  const z =
    t -
    (c0 + c1 * t + c2 * t * t) /
      (1 + d1 * t + d2 * t * t + d3 * t * t * t);

  return z;
}
