/**
 * Analysis Plan Development Module
 * Phase 6.8 - Develop statistical analysis plan with appropriate methods
 */

import { callLLM, parseJSONResponse } from '../../utils/llm.js';
import type {
  AnalysisPlan,
  StudyDesign,
  OutcomeSpec,
  SampleSize,
} from '../../types/methodology.js';

/**
 * Statistical test mappings based on outcome type and study design
 * Maps study characteristics to appropriate primary analysis methods
 */
export const STATISTICAL_TEST_MAPPINGS: Record<string, Record<string, string>> = {
  continuous_two_groups: {
    parametric: 't-test (independent samples)',
    non_parametric: 'Mann-Whitney U test',
    paired: 'Paired t-test',
    paired_non_parametric: 'Wilcoxon signed-rank test',
  },

  continuous_multiple_groups: {
    parametric: 'One-way ANOVA',
    non_parametric: 'Kruskal-Wallis test',
    repeated_measures: 'Repeated measures ANOVA',
    mixed_model: 'Linear mixed-effects model',
  },

  continuous_with_time: {
    linear: 'Linear mixed-effects model',
    growth_curve: 'Growth curve analysis',
    repeated_measures: 'Repeated measures ANOVA',
    gee: 'Generalized Estimating Equations (GEE)',
  },

  binary_outcome: {
    two_groups: 'Chi-square test',
    two_groups_small: "Fisher's exact test",
    multiple_groups: 'Chi-square test for multiple groups',
    regression: 'Logistic regression',
    clustered: 'Mixed-effects logistic regression',
  },

  time_to_event: {
    univariate: 'Kaplan-Meier survival curves',
    comparison: 'Log-rank test',
    regression: 'Cox proportional hazards regression',
    competing_risks: 'Competing risks regression (Fine-Gray)',
  },

  count_outcome: {
    simple: 'Poisson regression',
    overdispersed: 'Negative binomial regression',
    zero_inflated: 'Zero-inflated Poisson/negative binomial',
  },

  categorical_outcome: {
    ordinal: 'Ordinal logistic regression (proportional odds)',
    nominal: 'Multinomial logistic regression',
  },

  clustered_design: {
    continuous: 'Linear mixed-effects model with cluster random effects',
    binary: 'Mixed-effects logistic regression with cluster random effects',
    gee_approach: 'GEE with exchangeable correlation structure',
  },
};

/**
 * Missing data handling strategies
 */
export const MISSING_DATA_STRATEGIES: Record<string, string> = {
  complete_case: 'Complete case analysis (listwise deletion)',
  available_case: 'Available case analysis (pairwise deletion)',
  last_observation: 'Last observation carried forward (LOCF)',
  multiple_imputation: 'Multiple imputation by chained equations (MICE)',
  maximum_likelihood: 'Full information maximum likelihood (FIML)',
  simple_imputation: 'Simple mean/median imputation',
};

/**
 * Statistical software recommendations based on analysis type
 */
export const SOFTWARE_RECOMMENDATIONS: Record<string, string[]> = {
  basic_stats: ['SPSS', 'Stata', 'R', 'SAS'],
  mixed_models: ['R (lme4, nlme)', 'SAS PROC MIXED', 'Stata mixed', 'MLwiN'],
  survival_analysis: ['R (survival)', 'SAS PROC LIFETEST/PHREG', 'Stata stcox'],
  bayesian: ['Stan', 'JAGS', 'WinBUGS', 'R (brms, rstan)'],
  machine_learning: ['Python (scikit-learn)', 'R (caret, tidymodels)', 'MATLAB'],
  clinical_trials: ['SAS', 'R', 'Stata'],
  quality_improvement: ['R', 'SPSS', 'Minitab'],
};

/**
 * Determine outcome type from outcome specification
 * @param outcome - Outcome specification
 * @returns Outcome type classification
 */
export function determineOutcomeType(outcome: {
  name: string;
  definition: string;
  measurement_tool: string;
}): string {
  const name = outcome.name.toLowerCase();
  const definition = outcome.definition.toLowerCase();
  const tool = outcome.measurement_tool.toLowerCase();

  // Continuous outcomes
  if (
    tool.includes('scale') ||
    tool.includes('questionnaire') ||
    tool.includes('inventory') ||
    name.includes('score') ||
    name.includes('pain') ||
    name.includes('function')
  ) {
    // Check if it's a specific continuous measure
    if (tool.includes('vas') || tool.includes('numeric rating')) {
      return 'continuous';
    }
    return 'continuous';
  }

  // Binary outcomes
  if (
    name.includes('mortality') ||
    name.includes('death') ||
    name.includes('readmission') ||
    name.includes('complication') ||
    name.includes('success') ||
    name.includes('failure') ||
    definition.includes('yes/no') ||
    definition.includes('dichotomous')
  ) {
    return 'binary';
  }

  // Time-to-event outcomes
  if (
    name.includes('survival') ||
    name.includes('time to') ||
    name.includes('event-free') ||
    definition.includes('time until') ||
    definition.includes('duration until')
  ) {
    return 'time_to_event';
  }

  // Count outcomes
  if (
    name.includes('number of') ||
    name.includes('count') ||
    name.includes('frequency') ||
    definition.includes('count of')
  ) {
    return 'count';
  }

  // Ordinal outcomes
  if (
    definition.includes('ordinal') ||
    definition.includes('likert') ||
    name.includes('grade') ||
    name.includes('stage')
  ) {
    return 'ordinal';
  }

  // Default to continuous for most clinical scales
  return 'continuous';
}

/**
 * Determine number of comparison groups from study design
 * @param design - Study design specification
 * @returns Number of groups (2 for two-group comparison, 3+ for multiple groups)
 */
export function determineNumberOfGroups(design: StudyDesign): number {
  const designType = design.type.toLowerCase();

  if (designType.includes('rct') || designType.includes('trial')) {
    // Standard RCT is 2 groups (intervention vs control)
    if (designType.includes('three-arm') || designType.includes('3-arm')) {
      return 3;
    }
    if (designType.includes('multi-arm') || designType.includes('factorial')) {
      return 4; // 4+ groups
    }
    return 2;
  }

  if (designType.includes('cohort')) {
    // Cohort studies often have exposed vs unexposed
    return 2;
  }

  if (designType.includes('cross_sectional')) {
    // Cross-sectional may compare multiple groups
    return 3; // Assume multiple groups unless specified
  }

  // Default to 2 groups
  return 2;
}

/**
 * Check if study design involves repeated measures over time
 * @param design - Study design specification
 * @returns True if repeated measures design
 */
export function isRepeatedMeasuresDesign(design: StudyDesign): boolean {
  const designType = design.type.toLowerCase();

  return (
    designType.includes('longitudinal') ||
    designType.includes('cohort') ||
    designType.includes('repeated') ||
    designType.includes('crossover') ||
    design.type.includes('RCT') // Most RCTs have repeated measures
  );
}

/**
 * Check if study design involves clustering
 * @param design - Study design specification
 * @returns True if clustered design
 */
export function isClusteredDesign(design: StudyDesign): boolean {
  const designType = design.type.toLowerCase();
  const subtype = design.subtype?.toLowerCase() || '';

  return (
    designType.includes('cluster') ||
    subtype.includes('cluster') ||
    designType.includes('multi-site') ||
    designType.includes('multisite')
  );
}

/**
 * Select primary analysis method based on study characteristics
 * @param design - Study design specification
 * @param primaryOutcome - Primary outcome specification
 * @returns Primary statistical analysis method
 */
export function selectPrimaryAnalysisMethod(
  design: StudyDesign,
  primaryOutcome: { name: string; definition: string; measurement_tool: string }
): string {
  const outcomeType = determineOutcomeType(primaryOutcome);
  const numGroups = determineNumberOfGroups(design);
  const isRepeated = isRepeatedMeasuresDesign(design);
  const isClustered = isClusteredDesign(design);

  // Clustered designs require mixed models or GEE
  if (isClustered) {
    if (outcomeType === 'continuous') {
      return STATISTICAL_TEST_MAPPINGS.clustered_design.continuous;
    } else if (outcomeType === 'binary') {
      return STATISTICAL_TEST_MAPPINGS.clustered_design.binary;
    }
  }

  // Time-to-event outcomes
  if (outcomeType === 'time_to_event') {
    if (numGroups === 2 && !isRepeated) {
      return STATISTICAL_TEST_MAPPINGS.time_to_event.comparison;
    }
    return STATISTICAL_TEST_MAPPINGS.time_to_event.regression;
  }

  // Continuous outcomes
  if (outcomeType === 'continuous') {
    if (isRepeated) {
      return STATISTICAL_TEST_MAPPINGS.continuous_with_time.linear;
    } else if (numGroups === 2) {
      return STATISTICAL_TEST_MAPPINGS.continuous_two_groups.parametric;
    } else {
      return STATISTICAL_TEST_MAPPINGS.continuous_multiple_groups.parametric;
    }
  }

  // Binary outcomes
  if (outcomeType === 'binary') {
    if (numGroups === 2 && !isRepeated) {
      return STATISTICAL_TEST_MAPPINGS.binary_outcome.two_groups;
    }
    return STATISTICAL_TEST_MAPPINGS.binary_outcome.regression;
  }

  // Count outcomes
  if (outcomeType === 'count') {
    return STATISTICAL_TEST_MAPPINGS.count_outcome.simple;
  }

  // Ordinal outcomes
  if (outcomeType === 'ordinal') {
    return STATISTICAL_TEST_MAPPINGS.categorical_outcome.ordinal;
  }

  // Default to appropriate parametric test
  return numGroups === 2
    ? STATISTICAL_TEST_MAPPINGS.continuous_two_groups.parametric
    : STATISTICAL_TEST_MAPPINGS.continuous_multiple_groups.parametric;
}

/**
 * Generate secondary analysis methods
 * @param outcomes - All outcomes specification
 * @param design - Study design specification
 * @returns Array of secondary analysis methods
 */
export function generateSecondaryAnalyses(
  outcomes: OutcomeSpec,
  design: StudyDesign
): string[] {
  const secondaryAnalyses: string[] = [];

  // Add adjusted analysis for primary outcome
  const primaryOutcomeType = determineOutcomeType(outcomes.primary);
  if (primaryOutcomeType === 'continuous') {
    secondaryAnalyses.push('Multiple linear regression adjusting for baseline covariates');
  } else if (primaryOutcomeType === 'binary') {
    secondaryAnalyses.push('Multivariable logistic regression adjusting for baseline covariates');
  } else if (primaryOutcomeType === 'time_to_event') {
    secondaryAnalyses.push('Adjusted Cox proportional hazards model');
  }

  // Add per-protocol analysis for RCTs
  if (design.is_randomised) {
    secondaryAnalyses.push('Per-protocol analysis (excluding protocol deviations)');
    secondaryAnalyses.push('As-treated analysis');
  }

  // Add descriptive statistics
  secondaryAnalyses.push('Descriptive statistics for all secondary outcomes');

  // Add analysis for each secondary outcome
  for (const secondary of outcomes.secondary) {
    const outcomeType = determineOutcomeType(secondary);
    const method = selectPrimaryAnalysisMethod(design, secondary);
    secondaryAnalyses.push(`${secondary.name}: ${method}`);
  }

  return secondaryAnalyses;
}

/**
 * Plan sensitivity analyses to test robustness of findings
 * @param design - Study design specification
 * @param assumptions - Key assumptions in the analysis
 * @returns Array of planned sensitivity analyses
 */
export function planSensitivityAnalyses(
  design: StudyDesign,
  assumptions?: string[]
): string[] {
  const sensitivityAnalyses: string[] = [];

  // Non-parametric alternative
  sensitivityAnalyses.push('Non-parametric test as sensitivity check for primary outcome');

  // Missing data sensitivity
  sensitivityAnalyses.push('Sensitivity analysis for missing data assumptions (best/worst case)');

  // Outliers
  sensitivityAnalyses.push('Analysis excluding outliers (>3 SD from mean)');

  // RCT-specific sensitivity analyses
  if (design.is_randomised) {
    sensitivityAnalyses.push('Intention-to-treat analysis with different imputation methods');
  }

  // Clustered design sensitivity
  if (isClusteredDesign(design)) {
    sensitivityAnalyses.push('Sensitivity to intra-cluster correlation assumptions');
  }

  // Add assumption-specific sensitivity analyses
  if (assumptions && assumptions.length > 0) {
    for (const assumption of assumptions) {
      if (assumption.toLowerCase().includes('normality')) {
        sensitivityAnalyses.push('Sensitivity to normality assumptions using non-parametric methods');
      }
      if (assumption.toLowerCase().includes('proportional hazards')) {
        sensitivityAnalyses.push('Test proportional hazards assumption using Schoenfeld residuals');
      }
    }
  }

  return sensitivityAnalyses;
}

/**
 * Plan subgroup analyses based on study population characteristics
 * @param design - Study design specification
 * @param population - Description of study population
 * @returns Array of planned subgroup analyses
 */
export function planSubgroupAnalyses(
  design: StudyDesign,
  population?: string
): string[] {
  const subgroupAnalyses: string[] = [];

  // Standard demographic subgroups
  if (population && population.toLowerCase().includes('adult')) {
    subgroupAnalyses.push('Age subgroups (e.g., <65 years vs ≥65 years)');
  }

  subgroupAnalyses.push('Sex/gender subgroups');

  // Disease-specific subgroups
  if (population && (population.toLowerCase().includes('severity') ||
                      population.toLowerCase().includes('stage'))) {
    subgroupAnalyses.push('Disease severity/stage subgroups');
  }

  // RCT-specific subgroups
  if (design.is_randomised) {
    subgroupAnalyses.push('Baseline risk subgroups (low vs high risk)');
  }

  // Site subgroups for multi-site studies
  if (isClusteredDesign(design)) {
    subgroupAnalyses.push('By study site (exploratory)');
  }

  // Add caveat about multiple testing
  subgroupAnalyses.push('Note: All subgroup analyses are exploratory and hypothesis-generating');

  return subgroupAnalyses;
}

/**
 * Select appropriate missing data handling strategy
 * @param design - Study design specification
 * @param dataTypes - Types of data being collected
 * @returns Missing data handling approach
 */
export function selectMissingDataStrategy(
  design: StudyDesign,
  dataTypes: string[]
): string {
  // RCTs typically use intention-to-treat with multiple imputation
  if (design.is_randomised) {
    return MISSING_DATA_STRATEGIES.multiple_imputation;
  }

  // Longitudinal studies benefit from full information maximum likelihood
  if (isRepeatedMeasuresDesign(design)) {
    return MISSING_DATA_STRATEGIES.maximum_likelihood;
  }

  // For observational studies, multiple imputation is often appropriate
  if (
    design.type.toLowerCase().includes('cohort') ||
    design.type.toLowerCase().includes('cross_sectional')
  ) {
    return MISSING_DATA_STRATEGIES.multiple_imputation;
  }

  // Default to complete case with sensitivity analysis
  return `${MISSING_DATA_STRATEGIES.complete_case} with sensitivity analysis for missing data`;
}

/**
 * Recommend appropriate statistical software
 * @param analyses - Array of planned analysis methods
 * @returns Recommended statistical software
 */
export function recommendStatisticalSoftware(analyses: string[]): string {
  const analysesText = analyses.join(' ').toLowerCase();

  // Check for specialized analysis types
  if (analysesText.includes('mixed-effects') || analysesText.includes('mixed model')) {
    return SOFTWARE_RECOMMENDATIONS.mixed_models[0]; // R with lme4
  }

  if (
    analysesText.includes('survival') ||
    analysesText.includes('cox') ||
    analysesText.includes('kaplan-meier')
  ) {
    return SOFTWARE_RECOMMENDATIONS.survival_analysis[0]; // R with survival package
  }

  if (analysesText.includes('bayesian')) {
    return SOFTWARE_RECOMMENDATIONS.bayesian[0]; // Stan
  }

  if (
    analysesText.includes('machine learning') ||
    analysesText.includes('prediction model')
  ) {
    return SOFTWARE_RECOMMENDATIONS.machine_learning[0]; // Python scikit-learn
  }

  // For clinical trials and RCTs, recommend established software
  if (
    analysesText.includes('randomized') ||
    analysesText.includes('trial') ||
    analysesText.includes('intention-to-treat')
  ) {
    return SOFTWARE_RECOMMENDATIONS.clinical_trials[0]; // SAS (FDA standard)
  }

  // Default to R for most academic research
  return 'R (version 4.0 or higher) with appropriate packages';
}

/**
 * Develop complete analysis plan using LLM
 * @param studyDesign - Study design specification
 * @param outcomes - Outcomes specification
 * @param sampleSize - Sample size specification
 * @returns Complete statistical analysis plan
 */
export async function developAnalysisPlan(
  studyDesign: StudyDesign,
  outcomes: OutcomeSpec,
  sampleSize?: SampleSize
): Promise<AnalysisPlan> {
  // Generate initial suggestions using helper functions
  const primaryAnalysisMethod = selectPrimaryAnalysisMethod(
    studyDesign,
    outcomes.primary
  );
  const secondaryAnalysisMethods = generateSecondaryAnalyses(outcomes, studyDesign);
  const sensitivityAnalyses = planSensitivityAnalyses(studyDesign);
  const subgroupAnalyses = planSubgroupAnalyses(studyDesign);
  const missingDataApproach = selectMissingDataStrategy(studyDesign, []);
  const statisticalSoftware = recommendStatisticalSoftware([
    primaryAnalysisMethod,
    ...secondaryAnalysisMethods,
  ]);

  const systemPrompt = `You are a biostatistician specializing in clinical research and healthcare studies.
Your task is to develop a comprehensive statistical analysis plan that is rigorous, appropriate, and feasible.

Key principles:
- Analysis methods must match the study design and outcomes
- Primary analysis should address the primary research question
- Include appropriate adjustments for multiple testing if applicable
- Consider both efficacy and safety analyses
- Specify handling of missing data
- Plan sensitivity and subgroup analyses appropriately
- Follow statistical reporting guidelines (e.g., SAMPL, ICH E9 for trials)

Respond with valid JSON matching this structure:
{
  "primary_analysis_method": "string (main statistical test/model)",
  "secondary_analysis_methods": ["array of secondary analysis approaches"],
  "sensitivity_analyses": ["array of sensitivity analyses"],
  "subgroup_analyses": ["array of planned subgroup analyses"],
  "missing_data_approach": "string (strategy for handling missing data)",
  "statistical_software": "string (recommended software)",
  "significance_level": number (typically 0.05)
}`;

  const prompt = `Develop a statistical analysis plan for this study:

STUDY DESIGN:
- Type: ${studyDesign.type}
- Subtype: ${studyDesign.subtype || 'Not specified'}
- Randomised: ${studyDesign.is_randomised}
- Blinded: ${studyDesign.is_blinded}
- Reporting guideline: ${studyDesign.reporting_guideline}

PRIMARY OUTCOME:
- Name: ${outcomes.primary.name}
- Definition: ${outcomes.primary.definition}
- Measurement tool: ${outcomes.primary.measurement_tool}
- Measurement timing: ${outcomes.primary.measurement_timing}
${outcomes.primary.clinically_meaningful_difference ? `- Clinically meaningful difference: ${outcomes.primary.clinically_meaningful_difference}` : ''}

SECONDARY OUTCOMES:
${outcomes.secondary.map(o => `- ${o.name}: ${o.definition}`).join('\n')}

${sampleSize ? `SAMPLE SIZE:
- Target: ${sampleSize.target}
- Method: ${sampleSize.calculation_method}
- Power: ${sampleSize.assumptions.power}
- Alpha: ${sampleSize.assumptions.alpha}
- Effect size: ${sampleSize.assumptions.effect_size}` : ''}

SUGGESTED ANALYSIS PLAN (refine as needed):
- Primary method: ${primaryAnalysisMethod}
- Secondary methods: ${secondaryAnalysisMethods.slice(0, 3).join('; ')}
- Missing data: ${missingDataApproach}
- Software: ${statisticalSoftware}

REQUIREMENTS:
1. Confirm or refine the primary analysis method
2. Specify secondary analyses for all outcomes
3. Plan appropriate sensitivity analyses
4. Define subgroup analyses (if justified)
5. Specify missing data handling strategy
6. Recommend statistical software
7. Set significance level (adjust for multiple testing if needed)

Return JSON only.`;

  const response = await callLLM(prompt, {
    systemPrompt,
    temperature: 0.3,
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
  });

  const analysisPlan = parseJSONResponse<AnalysisPlan>(response);

  // Validate and provide defaults if LLM response is incomplete
  if (!analysisPlan.primary_analysis_method) {
    analysisPlan.primary_analysis_method = primaryAnalysisMethod;
  }

  if (!analysisPlan.secondary_analysis_methods || analysisPlan.secondary_analysis_methods.length === 0) {
    analysisPlan.secondary_analysis_methods = secondaryAnalysisMethods;
  }

  if (!analysisPlan.missing_data_approach) {
    analysisPlan.missing_data_approach = missingDataApproach;
  }

  if (!analysisPlan.statistical_software) {
    analysisPlan.statistical_software = statisticalSoftware;
  }

  if (!analysisPlan.significance_level) {
    analysisPlan.significance_level = sampleSize?.assumptions.alpha || 0.05;
  }

  // Ensure arrays exist
  if (!analysisPlan.sensitivity_analyses) {
    analysisPlan.sensitivity_analyses = sensitivityAnalyses;
  }

  if (!analysisPlan.subgroup_analyses) {
    analysisPlan.subgroup_analyses = subgroupAnalyses;
  }

  return analysisPlan;
}
