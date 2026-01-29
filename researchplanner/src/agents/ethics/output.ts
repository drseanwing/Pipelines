/**
 * Ethics Agent - Output Assembly and Document Generation
 * Phase 7.8 - Format ethics evaluation outputs and generate documents
 */

import { callLLM } from '../../utils/llm.js';
import type {
  EthicsEvaluation,
  EthicsPathway,
  RiskAssessment,
  ConsentSpec,
  DataGovernanceSpec,
  ChecklistItem,
  RiskLevel,
} from '../../types/ethics.ts';

/**
 * Format ethics pathway as annotated JSON
 * @param pathway - Ethics pathway specification
 * @returns JSON string with inline comments
 */
export function formatEthicsPathway(pathway: EthicsPathway): string {
  const output = {
    pathway: pathway.pathway,
    approval_body: pathway.approval_body,
    requires_hrec: pathway.requires_hrec,
    requires_rgo: pathway.requires_rgo,
    estimated_timeline: pathway.estimated_timeline,
    forms: pathway.forms,
    status: pathway.status,
    reference_number: pathway.reference_number || null,
    _annotations: {
      pathway: `${pathway.pathway} pathway selected based on risk assessment and research classification`,
      approval_body: `Primary approval authority: ${pathway.approval_body}`,
      timeline: `Expected approval timeline: ${pathway.estimated_timeline}`,
      forms: `${pathway.forms.length} form(s) required for submission`,
    },
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Format risk assessment as Markdown with risk matrix
 * @param risk - Risk assessment specification
 * @returns Markdown formatted risk assessment
 */
export function formatRiskAssessment(risk: RiskAssessment): string {
  const riskLevelEmoji: Record<RiskLevel, string> = {
    NEGLIGIBLE: '🟢',
    LOW: '🟡',
    MODERATE: '🟠',
    HIGH: '🔴',
  };

  let markdown = '# Risk Assessment\n\n';
  markdown += `## Overall Risk Level: ${riskLevelEmoji[risk.level]} **${risk.level}**\n\n`;
  markdown += `### Justification\n\n${risk.overall_justification}\n\n`;
  markdown += `**Reference:** ${risk.national_statement_reference}\n\n`;

  markdown += '## Risk Matrix\n\n';
  markdown += '| Category | Risk Level | Mitigation |\n';
  markdown += '|----------|------------|------------|\n';

  for (const factor of risk.factors) {
    const emoji = riskLevelEmoji[factor.risk_level];
    markdown += `| ${factor.category} | ${emoji} ${factor.risk_level} | ${factor.mitigation} |\n`;
  }

  markdown += '\n## Risk Legend\n\n';
  markdown += '- 🟢 **NEGLIGIBLE**: Minimal or no foreseeable risk\n';
  markdown += '- 🟡 **LOW**: Minor discomfort, minor side effects, or temporary inconvenience\n';
  markdown += '- 🟠 **MODERATE**: Moderate discomfort or side effects, psychological distress\n';
  markdown += '- 🔴 **HIGH**: Serious harm, permanent harm, or death\n\n';

  return markdown;
}

/**
 * Format consent specification as JSON with comments
 * @param consent - Consent specification
 * @returns JSON string with inline comments
 */
export function formatConsentSpec(consent: ConsentSpec): string {
  const output = {
    consent_type: consent.consent_type,
    waiver_justified: consent.waiver_justified,
    waiver_justification: consent.waiver_justification || null,
    capacity_assessment_required: consent.capacity_assessment_required,
    third_party_consent_required: consent.third_party_consent_required,
    documentation_requirements: consent.documentation_requirements,
    opt_out_available: consent.opt_out_available,
    consent_process_description: consent.consent_process_description,
    _annotations: {
      consent_type: `Primary consent mechanism: ${consent.consent_type}`,
      waiver: consent.waiver_justified
        ? 'Consent waiver or alteration justified under National Statement Section 2.3.10'
        : 'Standard consent process applies',
      capacity: consent.capacity_assessment_required
        ? 'Capacity assessment required for vulnerable participants'
        : 'Standard capacity presumed',
      documentation: `${consent.documentation_requirements.length} documentation requirement(s)`,
    },
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Generate comprehensive Data Management Plan document
 * @param dataGovernance - Data governance specification
 * @param project - Project context for DMP generation
 * @returns Markdown formatted DMP (3-5 pages)
 */
export async function generateDataManagementPlan(
  dataGovernance: DataGovernanceSpec,
  project: {
    title: string;
    investigators: string[];
    start_date?: string;
    end_date?: string;
  }
): Promise<string> {
  const prompt = `Generate a comprehensive Data Management Plan (DMP) for the following research project.

**Project Title:** ${project.title}
**Principal Investigator(s):** ${project.investigators.join(', ')}
${project.start_date ? `**Project Start Date:** ${project.start_date}` : ''}
${project.end_date ? `**Project End Date:** ${project.end_date}` : ''}

**Data Governance Specification:**
${JSON.stringify(dataGovernance, null, 2)}

Create a detailed DMP in Markdown format (3-5 pages, approximately 1500-2500 words) that includes:

1. **Data Types and Formats** (200-300 words)
   - List all data types (${dataGovernance.data_types.join(', ')})
   - Describe data formats and volumes
   - Specify identifiability levels and de-identification methods

2. **Data Collection Methods** (200-300 words)
   - Describe how data will be collected
   - Identify data collection tools and instruments
   - Specify quality control measures

3. **Storage and Security** (400-500 words)
   - Storage location: ${dataGovernance.storage_requirements.location}
   - Encryption: ${dataGovernance.storage_requirements.encryption ? 'Enabled' : 'Not required'}
   - Access controls: ${dataGovernance.storage_requirements.access_controls.join(', ')}
   - Backup strategy: ${dataGovernance.storage_requirements.backup_strategy}
   - Physical and technical security measures

4. **Access and Sharing** (200-300 words)
   - Who can access the data and under what conditions
   - Data sharing plans (if applicable)
${dataGovernance.data_transfer_plan ? `   - Data transfer plan: ${dataGovernance.data_transfer_plan.recipient} via ${dataGovernance.data_transfer_plan.method}` : ''}
   - Restrictions and embargoes

5. **Retention and Disposal** (200-300 words)
   - Retention period: ${dataGovernance.retention_period}
   - Disposal method: ${dataGovernance.disposal_method}
   - Archival procedures
   - Long-term preservation considerations

6. **Compliance and Governance** (200-300 words)
   - Privacy Act 1988: ${dataGovernance.privacy_compliance.privacy_act_1988 ? 'Compliant' : 'Not applicable'}
   - Information Privacy Act 2009 (QLD): ${dataGovernance.privacy_compliance.information_privacy_act_2009_qld ? 'Compliant' : 'Not applicable'}
   - GDPR: ${dataGovernance.privacy_compliance.gdpr_applicable ? 'Applicable' : 'Not applicable'}
   - Data breach response: ${dataGovernance.data_breach_response_plan}
   - Institutional policies and procedures

7. **Roles and Responsibilities** (100-200 words)
   - Data custodian
   - Data manager
   - Access approvers
   - Audit and oversight

The DMP should be formal, professional, and suitable for ethics committee review. Use clear headings and bullet points where appropriate. Ensure all technical requirements are addressed.`;

  const systemPrompt = `You are a research data management expert specializing in Australian health research governance. Generate detailed, compliant Data Management Plans that meet NHMRC requirements, HREC expectations, and institutional policies.`;

  const dmpText = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    systemPrompt,
    temperature: 0.3,
  });

  return dmpText.trim();
}

/**
 * Format governance checklist as JSON table format
 * @param checklist - List of governance checklist items
 * @returns JSON string with table-friendly structure
 */
export function formatGovernanceChecklist(checklist: ChecklistItem[]): string {
  const tableFormat = checklist.map((item, index) => ({
    id: index + 1,
    item: item.item,
    requirement_source: item.requirement_source,
    status: item.status,
    assigned_to: item.assigned_to || 'Unassigned',
    due_date: item.due_date || 'TBD',
    notes: item.notes || '',
    dependencies: item.dependencies || [],
    _status_icon: getStatusIcon(item.status),
  }));

  const summary = {
    total: checklist.length,
    not_started: checklist.filter(i => i.status === 'NOT_STARTED').length,
    in_progress: checklist.filter(i => i.status === 'IN_PROGRESS').length,
    complete: checklist.filter(i => i.status === 'COMPLETE').length,
  };

  const output = {
    summary,
    checklist: tableFormat,
    _instructions: {
      status_values: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'],
      icons: {
        NOT_STARTED: '⬜',
        IN_PROGRESS: '🔄',
        COMPLETE: '✅',
      },
      note: 'Update status and assigned_to fields as work progresses',
    },
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Get status icon for checklist item
 */
function getStatusIcon(status: ChecklistItem['status']): string {
  const icons: Record<ChecklistItem['status'], string> = {
    NOT_STARTED: '⬜',
    IN_PROGRESS: '🔄',
    COMPLETE: '✅',
  };
  return icons[status];
}

/**
 * Generate ethics considerations draft for protocol document
 * @param ethics - Complete ethics evaluation
 * @returns Markdown formatted ethics section (800-1200 words)
 */
export async function generateEthicsConsiderationsDraft(
  ethics: EthicsEvaluation
): Promise<string> {
  const prompt = `Generate a comprehensive ethics considerations section for a research protocol document based on the following ethics evaluation.

**Ethics Evaluation Data:**
${JSON.stringify(ethics, null, 2)}

Create a formal ethics considerations section in Markdown format (800-1200 words) suitable for inclusion in a research protocol. The section should include:

1. **Ethics Pathway and Approval** (150-200 words)
   - State the ethics pathway: ${ethics.ethics_pathway.pathway}
   - Identify approval body: ${ethics.ethics_pathway.approval_body}
   - Indicate HREC requirement: ${ethics.ethics_pathway.requires_hrec ? 'Yes' : 'No'}
   - Indicate RGO requirement: ${ethics.ethics_pathway.requires_rgo ? 'Yes' : 'No'}
   - Note current status: ${ethics.ethics_pathway.status}
   - List required forms: ${ethics.ethics_pathway.forms.join(', ')}

2. **Risk Assessment Summary** (200-250 words)
   - Overall risk level: ${ethics.risk_assessment.level}
   - Key risk factors identified (${ethics.risk_assessment.factors.length} factors)
   - Mitigation strategies for each risk category
   - Reference to National Statement: ${ethics.risk_assessment.national_statement_reference}

3. **Consent Process** (200-250 words)
   - Consent type: ${ethics.consent_requirements.consent_type}
   - Describe the consent process: ${ethics.consent_requirements.consent_process_description}
   - Waiver justification (if applicable): ${ethics.consent_requirements.waiver_justified ? ethics.consent_requirements.waiver_justification : 'N/A'}
   - Capacity assessment: ${ethics.consent_requirements.capacity_assessment_required ? 'Required' : 'Not required'}
   - Third-party consent: ${ethics.consent_requirements.third_party_consent_required ? 'Required' : 'Not required'}
   - Documentation requirements: ${ethics.consent_requirements.documentation_requirements.join(', ')}

4. **Data Management and Privacy** (200-250 words)
   - Data types: ${ethics.data_governance.data_types.join(', ')}
   - Storage: ${ethics.data_governance.storage_requirements.location}
   - Security measures: Encryption ${ethics.data_governance.storage_requirements.encryption ? 'enabled' : 'not required'}, access controls: ${ethics.data_governance.storage_requirements.access_controls.join(', ')}
   - Retention: ${ethics.data_governance.retention_period}
   - Disposal: ${ethics.data_governance.disposal_method}
   - Privacy compliance: Privacy Act 1988 ${ethics.data_governance.privacy_compliance.privacy_act_1988 ? '✓' : '✗'}, Info Privacy Act 2009 QLD ${ethics.data_governance.privacy_compliance.information_privacy_act_2009_qld ? '✓' : '✗'}
   - Data breach response plan

5. **Site Governance** (150-200 words)
   - Number of sites: ${ethics.site_requirements.length}
   - Site-specific requirements for each site
   - Governance approval processes
   - Investigator agreements

The text should be formal, comprehensive, and demonstrate full consideration of ethical principles and governance requirements. Use clear section headings and maintain professional academic tone throughout.`;

  const systemPrompt = `You are a research ethics expert with extensive experience in Australian health research governance. Write clear, compliant ethics sections for research protocols that meet HREC and institutional requirements.`;

  const ethicsText = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    systemPrompt,
    temperature: 0.3,
  });

  return ethicsText.trim();
}

/**
 * Assemble complete ethics evaluation output package
 * @param ethics - Complete ethics evaluation
 * @param project - Project context
 * @returns Object containing all formatted outputs
 */
export async function assembleEthicsOutputs(
  ethics: EthicsEvaluation,
  project: {
    title: string;
    investigators: string[];
    start_date?: string;
    end_date?: string;
  }
): Promise<{
  ethics_pathway_json: string;
  risk_assessment_md: string;
  consent_spec_json: string;
  data_management_plan_md: string;
  governance_checklist_json: string;
  ethics_considerations_md: string;
}> {
  // Generate all outputs
  const [dmp, ethicsConsiderations] = await Promise.all([
    generateDataManagementPlan(ethics.data_governance, project),
    generateEthicsConsiderationsDraft(ethics),
  ]);

  return {
    ethics_pathway_json: formatEthicsPathway(ethics.ethics_pathway),
    risk_assessment_md: formatRiskAssessment(ethics.risk_assessment),
    consent_spec_json: formatConsentSpec(ethics.consent_requirements),
    data_management_plan_md: dmp,
    governance_checklist_json: formatGovernanceChecklist(ethics.governance_checklist),
    ethics_considerations_md: ethicsConsiderations,
  };
}
