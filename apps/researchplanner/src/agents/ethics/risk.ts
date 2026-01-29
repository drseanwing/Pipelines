/**
 * Risk Assessment Module for Ethics Evaluation
 * Phase 7.3 - Risk Assessment per National Statement
 *
 * Implements risk assessment following the NHMRC National Statement on Ethical Conduct
 * in Human Research (2007, updated 2018).
 *
 * Risk Level Classification:
 * - NEGLIGIBLE: Anonymous surveys, retrospective audit
 * - LOW: Non-invasive procedures, re-identifiable data
 * - MODERATE: Minor physical procedures, identifiable data
 * - HIGH: Invasive procedures, vulnerable populations, highly sensitive data
 */

import { RiskLevel, RiskFactor, RiskAssessment } from '../../types/ethics.js';
import { callLLM } from '../../utils/llm.js';

/**
 * Assess vulnerability of participant population
 * @param participants - Participant description and inclusion/exclusion criteria
 * @returns Risk factor for participant vulnerability
 */
export function assessVulnerability(participants: {
  target_population?: string;
  inclusion_criteria?: string[];
  exclusion_criteria?: string[];
  vulnerable_groups?: string[];
}): RiskFactor {
  const vulnerableGroups = participants.vulnerable_groups || [];
  const targetPop = participants.target_population?.toLowerCase() || '';

  // Detect vulnerable populations
  const highVulnerabilityIndicators = [
    'children',
    'minors',
    'under 18',
    'pediatric',
    'paediatric',
    'cognitively impaired',
    'dementia',
    'intellectual disability',
    'prisoners',
    'incarcerated',
    'refugees',
    'asylum seekers',
    'highly dependent',
    'emergency',
    'unconscious',
  ];

  const moderateVulnerabilityIndicators = [
    'pregnant',
    'elderly',
    'aged care',
    'indigenous',
    'aboriginal',
    'torres strait',
    'culturally diverse',
    'non-english speaking',
    'low literacy',
    'economically disadvantaged',
  ];

  // Check for high vulnerability
  const hasHighVulnerability = highVulnerabilityIndicators.some(indicator =>
    targetPop.includes(indicator) ||
    vulnerableGroups.some(group => group.toLowerCase().includes(indicator))
  );

  if (hasHighVulnerability) {
    return {
      category: 'PARTICIPANT_VULNERABILITY',
      risk_level: RiskLevel.HIGH,
      mitigation: 'Implement enhanced consent procedures, appoint independent consent monitor, ensure capacity assessment protocol, provide culturally appropriate information, consider therapeutic misconception safeguards.',
    };
  }

  // Check for moderate vulnerability
  const hasModerateVulnerability = moderateVulnerabilityIndicators.some(indicator =>
    targetPop.includes(indicator) ||
    vulnerableGroups.some(group => group.toLowerCase().includes(indicator))
  );

  if (hasModerateVulnerability) {
    return {
      category: 'PARTICIPANT_VULNERABILITY',
      risk_level: RiskLevel.MODERATE,
      mitigation: 'Provide additional time for decision-making, ensure accessible information formats, consider cultural consultation, provide interpreter services where needed.',
    };
  }

  // Check if general adult population with no specific vulnerabilities
  if (targetPop.includes('adult') || targetPop.includes('staff') || targetPop.includes('healthcare professional')) {
    return {
      category: 'PARTICIPANT_VULNERABILITY',
      risk_level: RiskLevel.NEGLIGIBLE,
      mitigation: 'Standard consent procedures appropriate for competent adults.',
    };
  }

  // Default to low for unspecified populations
  return {
    category: 'PARTICIPANT_VULNERABILITY',
    risk_level: RiskLevel.LOW,
    mitigation: 'Ensure clear participant information, adequate time for decision-making, and voluntary participation.',
  };
}

/**
 * Assess risk from intervention or procedure invasiveness
 * @param procedures - Description of procedures and interventions
 * @returns Risk factor for intervention/procedure risk
 */
export function assessInterventionRisk(procedures: {
  data_collection_methods?: string[];
  interventions?: string[];
  procedure_description?: string;
}): RiskFactor {
  const methods = procedures.data_collection_methods || [];
  const interventions = procedures.interventions || [];
  const description = procedures.procedure_description?.toLowerCase() || '';

  const allMethods = [
    ...methods.map(m => m.toLowerCase()),
    ...interventions.map(i => i.toLowerCase()),
    description,
  ].join(' ');

  // High risk interventions
  const highRiskIndicators = [
    'surgery',
    'surgical',
    'invasive',
    'biopsy',
    'catheter',
    'injection',
    'drug trial',
    'medication trial',
    'experimental treatment',
    'radiation',
    'radiotherapy',
    'ionizing',
    'general anesthesia',
    'general anaesthesia',
  ];

  const hasHighRisk = highRiskIndicators.some(indicator => allMethods.includes(indicator));

  if (hasHighRisk) {
    return {
      category: 'INTERVENTION_RISK',
      risk_level: RiskLevel.HIGH,
      mitigation: 'Detailed risk disclosure in consent form, clinical monitoring plan, adverse event reporting protocol, insurance coverage verification, stopping rules defined, data safety monitoring board if appropriate.',
    };
  }

  // Moderate risk interventions
  const moderateRiskIndicators = [
    'blood draw',
    'venipuncture',
    'phlebotomy',
    'physical examination',
    'exercise test',
    'stress test',
    'muscle biopsy',
    'local anesthesia',
    'local anaesthesia',
    'imaging',
    'mri',
    'ct scan',
    'x-ray',
  ];

  const hasModerateRisk = moderateRiskIndicators.some(indicator => allMethods.includes(indicator));

  if (hasModerateRisk) {
    return {
      category: 'INTERVENTION_RISK',
      risk_level: RiskLevel.MODERATE,
      mitigation: 'Clear description of procedure risks and discomforts, trained personnel, standard clinical protocols, adverse event monitoring, right to withdraw at any time.',
    };
  }

  // Low risk interventions
  const lowRiskIndicators = [
    'interview',
    'focus group',
    'questionnaire',
    'observation',
    'non-invasive',
  ];

  const hasLowRisk = lowRiskIndicators.some(indicator => allMethods.includes(indicator));

  if (hasLowRisk) {
    return {
      category: 'INTERVENTION_RISK',
      risk_level: RiskLevel.LOW,
      mitigation: 'Ensure participant comfort, provide breaks as needed, allow withdrawal without consequence, minimize time burden.',
    };
  }

  // Negligible risk - observational, retrospective
  const negligibleRiskIndicators = [
    'retrospective',
    'audit',
    'chart review',
    'medical record review',
    'administrative data',
    'existing data',
    'secondary data',
  ];

  const hasNegligibleRisk = negligibleRiskIndicators.some(indicator => allMethods.includes(indicator));

  if (hasNegligibleRisk) {
    return {
      category: 'INTERVENTION_RISK',
      risk_level: RiskLevel.NEGLIGIBLE,
      mitigation: 'Standard data security and confidentiality protections.',
    };
  }

  // Default to low for unspecified
  return {
    category: 'INTERVENTION_RISK',
    risk_level: RiskLevel.LOW,
    mitigation: 'Minimize time burden, ensure participant comfort, provide clear information about procedures.',
  };
}

/**
 * Assess sensitivity of data being collected
 * @param dataCollection - Description of data collection
 * @returns Risk factor for data sensitivity
 */
export function assessDataSensitivity(dataCollection: {
  data_types?: ('IDENTIFIABLE' | 'RE_IDENTIFIABLE' | 'DE_IDENTIFIED' | 'ANONYMOUS')[];
  variables_collected?: string[];
  data_sources?: string[];
}): RiskFactor {
  const dataTypes = dataCollection.data_types || [];
  const variables = dataCollection.variables_collected || [];
  const sources = dataCollection.data_sources || [];

  const allData = [
    ...variables.map(v => v.toLowerCase()),
    ...sources.map(s => s.toLowerCase()),
  ].join(' ');

  // High sensitivity data
  const highSensitivityIndicators = [
    'hiv',
    'aids',
    'sexual history',
    'sexual abuse',
    'mental health',
    'psychiatric',
    'substance abuse',
    'drug use',
    'alcohol',
    'criminal history',
    'domestic violence',
    'child abuse',
    'genetic',
    'genomic',
    'biometric',
    'financial',
    'income',
    'bank',
  ];

  const hasHighSensitivity = highSensitivityIndicators.some(indicator => allData.includes(indicator));
  const isIdentifiable = dataTypes.includes('IDENTIFIABLE');

  if (hasHighSensitivity && isIdentifiable) {
    return {
      category: 'DATA_SENSITIVITY',
      risk_level: RiskLevel.HIGH,
      mitigation: 'Store identifiable data separately from sensitive data, use encryption at rest and in transit, implement strict access controls with audit logging, consider data breach insurance, develop detailed breach response plan, obtain explicit consent for sensitive data collection.',
    };
  }

  if (hasHighSensitivity) {
    return {
      category: 'DATA_SENSITIVITY',
      risk_level: RiskLevel.MODERATE,
      mitigation: 'Use de-identification or re-identifiable codes, secure storage with encryption, limited access on need-to-know basis, data breach response plan.',
    };
  }

  // Moderate sensitivity - clinical data
  const moderateSensitivityIndicators = [
    'medical record',
    'clinical',
    'diagnosis',
    'treatment',
    'medication',
    'health condition',
    'patient',
  ];

  const hasModerateSensitivity = moderateSensitivityIndicators.some(indicator => allData.includes(indicator));

  if (isIdentifiable && hasModerateSensitivity) {
    return {
      category: 'DATA_SENSITIVITY',
      risk_level: RiskLevel.MODERATE,
      mitigation: 'Store identifiable data separately, use secure server with encryption, implement role-based access controls, regular access audits, data breach response plan.',
    };
  }

  if (hasModerateSensitivity) {
    return {
      category: 'DATA_SENSITIVITY',
      risk_level: RiskLevel.LOW,
      mitigation: 'Use re-identifiable codes or de-identification, secure storage, access controls, retention plan.',
    };
  }

  // Anonymous or de-identified data
  if (dataTypes.includes('ANONYMOUS')) {
    return {
      category: 'DATA_SENSITIVITY',
      risk_level: RiskLevel.NEGLIGIBLE,
      mitigation: 'Verify data is truly anonymous with no reasonable means of re-identification, standard data security practices.',
    };
  }

  // Re-identifiable or de-identified non-sensitive data
  if (dataTypes.includes('RE_IDENTIFIABLE') || dataTypes.includes('DE_IDENTIFIED')) {
    return {
      category: 'DATA_SENSITIVITY',
      risk_level: RiskLevel.LOW,
      mitigation: 'Secure storage of re-identification key if applicable, standard access controls, retention and disposal plan.',
    };
  }

  // Default to moderate for identifiable data
  if (isIdentifiable) {
    return {
      category: 'DATA_SENSITIVITY',
      risk_level: RiskLevel.MODERATE,
      mitigation: 'Implement secure storage with encryption, access controls, and data governance procedures.',
    };
  }

  // Default
  return {
    category: 'DATA_SENSITIVITY',
    risk_level: RiskLevel.LOW,
    mitigation: 'Standard data security and confidentiality protections.',
  };
}

/**
 * Determine overall risk level from individual factors
 * Uses the highest risk level among all factors
 * @param factors - Array of risk factors
 * @returns Overall risk level
 */
export function determineOverallRiskLevel(factors: RiskFactor[]): RiskLevel {
  if (factors.length === 0) {
    return RiskLevel.LOW;
  }

  // Risk level hierarchy
  const riskHierarchy = {
    [RiskLevel.NEGLIGIBLE]: 0,
    [RiskLevel.LOW]: 1,
    [RiskLevel.MODERATE]: 2,
    [RiskLevel.HIGH]: 3,
  };

  // Find the highest risk level
  let maxRiskLevel = RiskLevel.NEGLIGIBLE;
  let maxRiskValue = 0;

  for (const factor of factors) {
    const riskValue = riskHierarchy[factor.risk_level];
    if (riskValue > maxRiskValue) {
      maxRiskValue = riskValue;
      maxRiskLevel = factor.risk_level;
    }
  }

  return maxRiskLevel;
}

/**
 * Generate justification text for risk assessment
 * @param level - Overall risk level
 * @param factors - Risk factors
 * @returns Justification text
 */
export async function generateJustification(
  level: RiskLevel,
  factors: RiskFactor[]
): Promise<string> {
  const factorsSummary = factors.map(f =>
    `- ${f.category}: ${f.risk_level} (${f.mitigation})`
  ).join('\n');

  const prompt = `You are an expert in research ethics and the NHMRC National Statement on Ethical Conduct in Human Research.

Generate a concise justification (2-3 sentences) for the following risk assessment:

Overall Risk Level: ${level}

Risk Factors:
${factorsSummary}

The justification should:
1. Explain why this overall risk level is appropriate
2. Reference the key risk factors
3. Be suitable for inclusion in an ethics application
4. Use professional academic language

Provide ONLY the justification text, no preamble or explanation.`;

  try {
    const response = await callLLM(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 500,
      temperature: 0.3,
      systemPrompt: 'You are an expert in research ethics and governance.',
    });

    return response.trim();
  } catch (error) {
    // Fallback to template-based justification
    return generateTemplateJustification(level, factors);
  }
}

/**
 * Generate template-based justification (fallback)
 * @param level - Overall risk level
 * @param factors - Risk factors
 * @returns Template justification
 */
function generateTemplateJustification(level: RiskLevel, factors: RiskFactor[]): string {
  const primaryFactors = factors.filter(f => f.risk_level === level);
  const primaryCategories = primaryFactors.map(f => f.category.toLowerCase().replace(/_/g, ' '));

  const templates = {
    [RiskLevel.NEGLIGIBLE]: `This study is classified as negligible risk as it involves ${primaryCategories.join(' and ')} with minimal potential for harm or discomfort to participants. The research design ensures that any risks are no greater than those encountered in everyday life.`,

    [RiskLevel.LOW]: `This study is classified as low risk, with primary considerations being ${primaryCategories.join(' and ')}. Appropriate safeguards including ${factors[0]?.mitigation.split(',')[0] || 'standard protections'} ensure that risks are minimal and well-managed.`,

    [RiskLevel.MODERATE]: `This study is classified as moderate risk due to ${primaryCategories.join(' and ')}. Comprehensive risk mitigation strategies including ${factors[0]?.mitigation.split(',')[0]} and ${factors[1]?.mitigation.split(',')[0] || 'additional safeguards'} have been implemented to protect participants and ensure ethical conduct.`,

    [RiskLevel.HIGH]: `This study is classified as high risk due to ${primaryCategories.join(' and ')}. Extensive risk mitigation measures including ${factors[0]?.mitigation.split(',')[0]}, ${factors[1]?.mitigation.split(',')[0] || 'enhanced safeguards'}, and ongoing monitoring ensure participant safety and welfare remain paramount throughout the research.`,
  };

  return templates[level] || templates[RiskLevel.LOW];
}

/**
 * Get National Statement reference for risk level and factors
 * @param level - Overall risk level
 * @param primaryFactor - Primary risk factor category
 * @returns Citation to relevant National Statement section
 */
export function getNationalStatementReference(
  level: RiskLevel,
  primaryFactor?: string
): string {
  // Map risk levels and categories to National Statement sections

  // General risk assessment references
  const generalReferences = {
    [RiskLevel.NEGLIGIBLE]: 'National Statement Chapter 2.1 (Risk and benefit), particularly 2.1.6-2.1.7 on negligible risk research.',
    [RiskLevel.LOW]: 'National Statement Chapter 2.1 (Risk and benefit), particularly 2.1.8 on low risk research.',
    [RiskLevel.MODERATE]: 'National Statement Chapter 2.1 (Risk and benefit), particularly 2.1.1-2.1.5 on assessing and managing risk.',
    [RiskLevel.HIGH]: 'National Statement Chapter 2.1 (Risk and benefit), particularly 2.1.1-2.1.5 on assessing and managing risk in higher-risk research.',
  };

  // Category-specific references
  const categoryReferences: Record<string, string> = {
    'PARTICIPANT_VULNERABILITY': 'National Statement Chapter 4 (Special ethical considerations) covering vulnerable populations including children (4.2), people with cognitive impairment (4.5), people highly dependent on medical care (4.6).',
    'INTERVENTION_RISK': 'National Statement Chapter 3.1 (Consent) and Chapter 2.1 (Risk and benefit), particularly sections on physical risks and clinical trial oversight.',
    'DATA_SENSITIVITY': 'National Statement Chapter 3.1.45-3.1.51 (Privacy, confidentiality and management of data and information).',
  };

  // Combine references
  const baseReference = generalReferences[level];

  if (primaryFactor && categoryReferences[primaryFactor]) {
    return `${baseReference} Also relevant: ${categoryReferences[primaryFactor]}`;
  }

  return baseReference;
}

/**
 * Main risk assessment function
 * Orchestrates all risk assessment components
 * @param methodology - Methodology data including participants, procedures, and data collection
 * @returns Complete risk assessment
 */
export async function assessRisk(methodology: {
  participants?: {
    target_population?: string;
    inclusion_criteria?: string[];
    exclusion_criteria?: string[];
    vulnerable_groups?: string[];
  };
  procedures?: {
    data_collection_methods?: string[];
    interventions?: string[];
    procedure_description?: string;
  };
  data_collection?: {
    data_types?: ('IDENTIFIABLE' | 'RE_IDENTIFIABLE' | 'DE_IDENTIFIED' | 'ANONYMOUS')[];
    variables_collected?: string[];
    data_sources?: string[];
  };
}): Promise<RiskAssessment> {
  // Assess individual risk factors
  const factors: RiskFactor[] = [];

  if (methodology.participants) {
    factors.push(assessVulnerability(methodology.participants));
  }

  if (methodology.procedures) {
    factors.push(assessInterventionRisk(methodology.procedures));
  }

  if (methodology.data_collection) {
    factors.push(assessDataSensitivity(methodology.data_collection));
  }

  // Determine overall risk level (highest of all factors)
  const overallLevel = determineOverallRiskLevel(factors);

  // Find primary risk factor (highest level)
  const primaryFactor = factors.find(f => f.risk_level === overallLevel)?.category;

  // Generate justification
  const justification = await generateJustification(overallLevel, factors);

  // Get National Statement reference
  const nsReference = getNationalStatementReference(overallLevel, primaryFactor);

  return {
    level: overallLevel,
    factors,
    overall_justification: justification,
    national_statement_reference: nsReference,
  };
}
