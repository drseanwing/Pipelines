/**
 * Consent Requirements Determination
 * Phase 7.4 - Consent type selection and requirements
 */

import { ConsentSpec, RiskLevel } from '../../types/ethics.js';
import { callLLM } from '../../utils/llm.js';

/**
 * Participant demographics and characteristics
 */
export interface ParticipantProfile {
  includes_children?: boolean;
  includes_cognitive_impairment?: boolean;
  includes_mental_health_conditions?: boolean;
  includes_critical_illness?: boolean;
  includes_emergency_settings?: boolean;
  includes_vulnerable_populations?: boolean;
  participant_description?: string;
}

/**
 * Data collection characteristics
 */
export interface DataCollectionProfile {
  data_types: ('IDENTIFIABLE' | 'RE_IDENTIFIABLE' | 'DE_IDENTIFIED' | 'ANONYMOUS')[];
  sensitive_data: boolean;
  ongoing_contact_required: boolean;
}

/**
 * Methodology characteristics for waiver evaluation
 */
export interface MethodologyProfile {
  uses_existing_data?: boolean;
  retrospective_chart_review?: boolean;
  observational_only?: boolean;
  no_direct_contact?: boolean;
  impracticable_to_obtain_consent?: boolean;
  impracticability_reason?: string;
}

/**
 * Waiver eligibility evaluation result
 */
export interface WaiverEligibility {
  eligible: boolean;
  justification?: string;
  criteria_met: {
    impracticable: boolean;
    low_risk: boolean;
    no_adverse_effects: boolean;
    research_merit: boolean;
  };
}

/**
 * Determine complete consent requirements for a research project
 *
 * @param riskLevel - Overall risk level classification
 * @param participants - Participant profile
 * @param dataCollection - Data collection profile
 * @param methodology - Optional methodology profile for waiver evaluation
 * @returns Complete consent specification
 */
export async function determineConsentRequirements(
  riskLevel: RiskLevel,
  participants: ParticipantProfile,
  dataCollection: DataCollectionProfile,
  methodology?: MethodologyProfile
): Promise<ConsentSpec> {
  // Determine basic consent type
  const consentType = selectConsentType(riskLevel, participants, dataCollection);

  // Evaluate waiver eligibility if applicable
  const waiverEval = methodology
    ? evaluateWaiverEligibility(riskLevel, methodology)
    : { eligible: false, justification: undefined };

  // Determine if capacity assessment is required
  const capacityAssessmentRequired = requiresCapacityAssessment(participants);

  // Determine if third-party consent is required
  const thirdPartyConsentRequired = requiresThirdPartyConsent(participants);

  // Get documentation requirements
  const documentationRequirements = getDocumentationRequirements(
    consentType,
    capacityAssessmentRequired,
    thirdPartyConsentRequired
  );

  // Determine if opt-out is available
  const optOutAvailable = canUseOptOut(riskLevel, dataCollection);

  // Generate consent process description
  const consentProcessDescription = await generateConsentProcessDescription(
    consentType,
    {
      riskLevel,
      participants,
      dataCollection,
      methodology,
      capacityAssessmentRequired,
      thirdPartyConsentRequired,
    }
  );

  return {
    consent_type: consentType as ConsentSpec['consent_type'],
    waiver_justified: waiverEval.eligible,
    waiver_justification: waiverEval.justification,
    capacity_assessment_required: capacityAssessmentRequired,
    third_party_consent_required: thirdPartyConsentRequired,
    documentation_requirements: documentationRequirements,
    opt_out_available: optOutAvailable,
    consent_process_description: consentProcessDescription,
  };
}

/**
 * Select appropriate consent type based on risk and participant characteristics
 *
 * @param riskLevel - Risk level classification
 * @param participants - Participant profile
 * @param dataCollection - Data collection profile
 * @returns Consent type
 */
export function selectConsentType(
  riskLevel: RiskLevel,
  participants: ParticipantProfile,
  dataCollection: DataCollectionProfile
): string {
  // Third-party consent takes priority for participants lacking capacity
  if (requiresThirdPartyConsent(participants)) {
    return 'THIRD_PARTY';
  }

  // Full written consent for high/moderate risk or identifiable data
  if (
    riskLevel === RiskLevel.HIGH ||
    riskLevel === RiskLevel.MODERATE ||
    dataCollection.data_types.includes('IDENTIFIABLE')
  ) {
    return 'FULL_WRITTEN';
  }

  // Opt-out for low-risk, de-identified quality improvement
  if (canUseOptOut(riskLevel, dataCollection)) {
    return 'OPT_OUT';
  }

  // Verbal consent for low risk with re-identifiable data
  if (
    riskLevel === RiskLevel.LOW &&
    dataCollection.data_types.includes('RE_IDENTIFIABLE')
  ) {
    return 'VERBAL';
  }

  // Default to full written consent for safety
  return 'FULL_WRITTEN';
}

/**
 * Evaluate eligibility for consent waiver under NHMRC criteria
 *
 * NHMRC National Statement criteria:
 * 1. Impracticable to obtain consent
 * 2. Research is no more than low risk
 * 3. Not likely to adversely affect participants
 * 4. Research has merit
 *
 * @param riskLevel - Risk level classification
 * @param methodology - Methodology profile
 * @returns Waiver eligibility evaluation
 */
export function evaluateWaiverEligibility(
  riskLevel: RiskLevel,
  methodology: MethodologyProfile
): WaiverEligibility {
  const criteriaMet = {
    impracticable: false,
    low_risk: false,
    no_adverse_effects: false,
    research_merit: false,
  };

  // Criterion 1: Impracticable to obtain consent
  criteriaMet.impracticable = !!(
    methodology.impracticable_to_obtain_consent ||
    methodology.retrospective_chart_review ||
    (methodology.uses_existing_data && methodology.no_direct_contact)
  );

  // Criterion 2: No more than low risk
  criteriaMet.low_risk =
    riskLevel === RiskLevel.LOW ||
    riskLevel === RiskLevel.NEGLIGIBLE;

  // Criterion 3: Not likely to adversely affect participants
  // Conservative assumption: true for retrospective data-only studies
  criteriaMet.no_adverse_effects = !!(
    methodology.retrospective_chart_review ||
    (methodology.uses_existing_data && methodology.observational_only)
  );

  // Criterion 4: Research has merit
  // This requires human judgment, but we assume merit if waiver is being considered
  criteriaMet.research_merit = true;

  // All four criteria must be met
  const eligible = Object.values(criteriaMet).every(v => v);

  let justification: string | undefined;
  if (eligible) {
    const reasons: string[] = [];

    if (methodology.retrospective_chart_review) {
      reasons.push('retrospective chart review where obtaining consent is impracticable');
    }
    if (methodology.uses_existing_data) {
      reasons.push('uses existing data with no direct participant contact');
    }
    if (methodology.impracticability_reason) {
      reasons.push(methodology.impracticability_reason);
    }

    justification =
      `Consent waiver is justified under NHMRC National Statement criteria: ` +
      `${reasons.join('; ')}. ` +
      `The research is ${riskLevel.toLowerCase()} risk, will not adversely affect participants, ` +
      `and has sufficient merit.`;
  }

  return {
    eligible,
    justification,
    criteria_met: criteriaMet,
  };
}

/**
 * Determine if capacity assessment is required
 *
 * Required for:
 * - Children under 18
 * - Cognitive impairment
 * - Mental health conditions affecting capacity
 * - Critical illness/emergency settings
 *
 * @param participants - Participant profile
 * @returns True if capacity assessment required
 */
export function requiresCapacityAssessment(participants: ParticipantProfile): boolean {
  return !!(
    participants.includes_children ||
    participants.includes_cognitive_impairment ||
    participants.includes_mental_health_conditions ||
    participants.includes_critical_illness ||
    participants.includes_emergency_settings
  );
}

/**
 * Determine if third-party consent is required
 *
 * Required when participants cannot provide informed consent themselves:
 * - Children (parent/guardian consent)
 * - Cognitive impairment (legally authorized representative)
 * - Emergency settings where patient cannot consent
 *
 * @param participants - Participant profile
 * @returns True if third-party consent required
 */
export function requiresThirdPartyConsent(participants: ParticipantProfile): boolean {
  return !!(
    participants.includes_children ||
    participants.includes_cognitive_impairment ||
    (participants.includes_emergency_settings && participants.includes_critical_illness)
  );
}

/**
 * Get documentation requirements for consent process
 *
 * @param consentType - Type of consent
 * @param capacityAssessmentRequired - Whether capacity assessment is required
 * @param thirdPartyConsentRequired - Whether third-party consent is required
 * @returns Array of documentation requirements
 */
export function getDocumentationRequirements(
  consentType: string,
  capacityAssessmentRequired: boolean,
  thirdPartyConsentRequired: boolean
): string[] {
  const requirements: string[] = [];

  switch (consentType) {
    case 'FULL_WRITTEN':
      requirements.push('Written participant information and consent form (PICF)');
      requirements.push('Signed consent forms stored securely');
      requirements.push('Record of consent date, time, and consenting researcher');
      requirements.push('Documentation of participant questions and responses');
      break;

    case 'VERBAL':
      requirements.push('Verbal consent script approved by HREC');
      requirements.push('Documentation of verbal consent in research records');
      requirements.push('Record of consent date, time, and witness if applicable');
      requirements.push('Participant information sheet provided');
      break;

    case 'WAIVER':
      requirements.push('HREC-approved consent waiver justification');
      requirements.push('Documentation that waiver criteria are met');
      requirements.push('Alternative information provision method (if applicable)');
      break;

    case 'OPT_OUT':
      requirements.push('Participant information sheet with opt-out instructions');
      requirements.push('Record of information provision (e.g., posted notice, letter sent)');
      requirements.push('Documentation of opt-out requests');
      requirements.push('Process for removing opted-out participants from study');
      break;

    case 'THIRD_PARTY':
      requirements.push('Parent/guardian or legally authorized representative consent form');
      requirements.push('Documentation of relationship to participant');
      requirements.push('Participant assent form (if applicable, e.g., for children 7+)');
      requirements.push('Capacity assessment documentation');
      break;
  }

  if (capacityAssessmentRequired) {
    requirements.push('Formal capacity assessment tool or process');
    requirements.push('Documentation of capacity assessment results');
    requirements.push('Re-assessment schedule for fluctuating capacity');
  }

  if (thirdPartyConsentRequired && consentType !== 'THIRD_PARTY') {
    requirements.push('Third-party consent procedures in addition to primary consent');
  }

  // Universal requirements
  requirements.push('Record of all consent-related communications');
  requirements.push('Process for withdrawing consent');
  requirements.push('Consent audit trail');

  return requirements;
}

/**
 * Determine if opt-out consent model is appropriate
 *
 * Opt-out appropriate for:
 * - Negligible or low risk
 * - De-identified or anonymous data
 * - Quality improvement activities
 * - Minimal burden on participants
 *
 * @param riskLevel - Risk level classification
 * @param dataCollection - Data collection profile
 * @returns True if opt-out can be used
 */
export function canUseOptOut(
  riskLevel: RiskLevel,
  dataCollection: DataCollectionProfile
): boolean {
  // Must be negligible or low risk
  if (riskLevel !== RiskLevel.NEGLIGIBLE && riskLevel !== RiskLevel.LOW) {
    return false;
  }

  // Must not use identifiable or sensitive data
  if (
    dataCollection.data_types.includes('IDENTIFIABLE') ||
    dataCollection.sensitive_data
  ) {
    return false;
  }

  // Must not require ongoing contact
  if (dataCollection.ongoing_contact_required) {
    return false;
  }

  return true;
}

/**
 * Generate detailed consent process description
 *
 * Uses LLM to create narrative description of the consent process
 * tailored to the specific study characteristics
 *
 * @param consentType - Type of consent
 * @param context - Study context including risk, participants, methodology
 * @returns Detailed consent process description
 */
export async function generateConsentProcessDescription(
  consentType: string,
  context: {
    riskLevel: RiskLevel;
    participants: ParticipantProfile;
    dataCollection: DataCollectionProfile;
    methodology?: MethodologyProfile;
    capacityAssessmentRequired: boolean;
    thirdPartyConsentRequired: boolean;
  }
): Promise<string> {
  const prompt = `Generate a detailed consent process description for a research study with the following characteristics:

Consent Type: ${consentType}
Risk Level: ${context.riskLevel}
Capacity Assessment Required: ${context.capacityAssessmentRequired}
Third-Party Consent Required: ${context.thirdPartyConsentRequired}

Participant Characteristics:
${JSON.stringify(context.participants, null, 2)}

Data Collection:
${JSON.stringify(context.dataCollection, null, 2)}

${context.methodology ? `Methodology:\n${JSON.stringify(context.methodology, null, 2)}` : ''}

Please provide:
1. Step-by-step description of the consent process
2. Timing of consent (when in study timeline)
3. Who will obtain consent
4. How participant questions will be addressed
5. How consent will be documented
6. Process for ongoing consent (if applicable)
7. Withdrawal process

The description should be suitable for inclusion in an ethics application and should reference relevant NHMRC National Statement guidelines.`;

  const systemPrompt = `You are an expert in research ethics and consent processes, particularly under Australian NHMRC National Statement guidelines. Provide clear, detailed, and ethically sound consent process descriptions.`;

  try {
    const description = await callLLM(prompt, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });

    return description.trim();
  } catch (error) {
    // Fallback to template-based description
    return generateTemplateConsentDescription(consentType, context);
  }
}

/**
 * Generate template-based consent description (fallback)
 *
 * @param consentType - Type of consent
 * @param context - Study context
 * @returns Template consent process description
 */
function generateTemplateConsentDescription(
  consentType: string,
  context: {
    riskLevel: RiskLevel;
    participants: ParticipantProfile;
    dataCollection: DataCollectionProfile;
    capacityAssessmentRequired: boolean;
    thirdPartyConsentRequired: boolean;
  }
): string {
  const sections: string[] = [];

  sections.push(`Consent Type: ${consentType}`);
  sections.push(`\nConsent Process:`);

  switch (consentType) {
    case 'FULL_WRITTEN':
      sections.push(
        `Potential participants will be approached by a member of the research team and provided with a written Participant Information and Consent Form (PICF). ` +
        `The researcher will explain the study purpose, procedures, risks, and benefits in clear language. ` +
        `Participants will be given adequate time (at least 24 hours for ${context.riskLevel.toLowerCase()} risk studies) to consider participation and ask questions. ` +
        `Written consent will be obtained before any study procedures commence. ` +
        `A copy of the signed consent form will be provided to the participant.`
      );
      break;

    case 'VERBAL':
      sections.push(
        `Verbal consent will be obtained using an HREC-approved script. ` +
        `Participants will be provided with written information but will provide consent verbally. ` +
        `The researcher will document the date, time, and details of the verbal consent in the research records. ` +
        `This process is appropriate given the ${context.riskLevel.toLowerCase()} risk nature of the study.`
      );
      break;

    case 'WAIVER':
      sections.push(
        `Consent will be waived under NHMRC National Statement criteria. ` +
        `This is justified because obtaining consent is impracticable, the research is ${context.riskLevel.toLowerCase()} risk, ` +
        `and is not likely to adversely affect participants. ` +
        `${context.methodology?.retrospective_chart_review ? 'The study involves retrospective chart review with no direct participant contact.' : ''}`
      );
      break;

    case 'OPT_OUT':
      sections.push(
        `An opt-out consent model will be used, appropriate for this ${context.riskLevel.toLowerCase()} risk study using de-identified data. ` +
        `Participants will be provided with information about the study and given the opportunity to opt out. ` +
        `Information will be provided via [specify method, e.g., posted notices, letters]. ` +
        `Participants will have [specify timeframe, e.g., 2 weeks] to opt out before data collection commences. ` +
        `A clear and accessible opt-out process will be provided.`
      );
      break;

    case 'THIRD_PARTY':
      sections.push(
        `Third-party consent will be obtained from parents/guardians or legally authorized representatives. ` +
        `${context.participants.includes_children ? 'For children aged 7 and above, assent will also be sought. ' : ''}` +
        `The third-party consenter will be provided with full information about the study and their role. ` +
        `Capacity assessment will be conducted to determine the participant's ability to provide consent or assent.`
      );
      break;
  }

  if (context.capacityAssessmentRequired) {
    sections.push(
      `\nCapacity Assessment: ` +
      `A formal capacity assessment will be conducted to determine the participant's ability to understand the study information and provide informed consent. ` +
      `This is required due to ${context.participants.includes_children ? 'child participants' : ''} ` +
      `${context.participants.includes_cognitive_impairment ? 'cognitive impairment' : ''} ` +
      `${context.participants.includes_critical_illness ? 'critical illness' : ''}.`
    );
  }

  sections.push(
    `\nWithdrawal: ` +
    `Participants may withdraw consent at any time without penalty or impact on their care. ` +
    `The process for withdrawal will be clearly explained in the consent materials.`
  );

  return sections.join('\n');
}
