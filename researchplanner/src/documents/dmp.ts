/**
 * Data Management Plan (DMP) Generator
 * Phase 8 - Document Stage
 * Generates ANDS/ARDC compliant Data Management Plans
 */

import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType } from 'docx';
import { DocumentGenerator } from './engine.js';
import { buildTitlePage, buildSection, buildVersionHistory, buildSimpleTable } from './sections.js';
import { callLLM } from '../utils/llm.js';
import { COLORS } from './styles.js';
import type { Project } from '../types/project.js';
import type { EthicsEvaluation, DataGovernanceSpec } from '../types/ethics.js';

/**
 * DMP Section content structure
 */
interface DMPSection {
  title: string;
  content: string;
  subsections?: Array<{
    title: string;
    content: string;
  }>;
}

/**
 * Helper: Build DMP title page
 */
function buildDMPTitlePage(project: Project): Paragraph[] {
  return buildTitlePage(
    `Data Management Plan\n${project.intake.project_title}`,
    project.intake.principal_investigator.name,
    new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );
}

/**
 * Helper: Build DMP version history
 */
function buildDMPVersionHistory(project: Project): Table {
  return buildVersionHistory('1.0', ['Initial DMP creation']);
}

/**
 * Helper: Build DMP section with heading
 */
function buildDMPSection(title: string, content: string, level: HeadingLevel): Paragraph[] {
  const markdown = `${'#'.repeat(level === HeadingLevel.HEADING_1 ? 1 : level === HeadingLevel.HEADING_2 ? 2 : 3)} ${title}\n\n${content}`;
  return buildSection(markdown);
}

/**
 * Generate Data Management Plan document
 *
 * @param project - Project record
 * @param ethics - Ethics evaluation with data governance spec
 * @returns DOCX buffer
 */
export async function generateDataManagementPlan(
  project: Project,
  ethics: EthicsEvaluation
): Promise<Buffer> {
  const generator = new DocumentGenerator(project.id);
  const dataGov = ethics.data_governance;

  // Generate section content using LLM
  const sections = await generateDMPSections(project, dataGov);

  // Build document
  const doc = new Document({
    styles: generator.getDocumentStyles(),
    sections: [
      {
        ...generator.getPageProperties(),
        children: [
          // Title page
          ...buildDMPTitlePage(project),

          // Version history
          buildDMPVersionHistory(project),

          // 1. Data Description
          ...buildDMPSection(
            '1. Data Description',
            sections.dataDescription.content,
            HeadingLevel.HEADING_1
          ),

          // 1.1 Data Types
          ...buildDMPSection(
            '1.1 Data Types and Formats',
            sections.dataTypes.content,
            HeadingLevel.HEADING_2
          ),

          // Data types table
          ...buildDataTypesTable(dataGov),

          // 1.2 Data Volume
          ...buildDMPSection(
            '1.2 Expected Data Volume',
            sections.dataVolume.content,
            HeadingLevel.HEADING_2
          ),

          // 2. Data Collection
          ...buildDMPSection(
            '2. Data Collection Methods',
            sections.dataCollection.content,
            HeadingLevel.HEADING_1
          ),

          // 2.1 Collection Procedures
          ...buildDMPSection(
            '2.1 Collection Procedures',
            sections.collectionProcedures.content,
            HeadingLevel.HEADING_2
          ),

          // 2.2 Quality Assurance
          ...buildDMPSection(
            '2.2 Quality Assurance',
            sections.qualityAssurance.content,
            HeadingLevel.HEADING_2
          ),

          // 3. Storage and Security
          ...buildDMPSection(
            '3. Data Storage and Security',
            sections.storageSecurity.content,
            HeadingLevel.HEADING_1
          ),

          // Storage requirements table
          ...buildStorageTable(dataGov),

          // 3.1 Access Controls
          ...buildDMPSection(
            '3.1 Access Controls',
            sections.accessControls.content,
            HeadingLevel.HEADING_2
          ),

          // 3.2 Backup Strategy
          ...buildDMPSection(
            '3.2 Backup and Recovery',
            sections.backupRecovery.content,
            HeadingLevel.HEADING_2
          ),

          // 4. Data Sharing
          ...buildDMPSection(
            '4. Data Access and Sharing',
            sections.dataSharing.content,
            HeadingLevel.HEADING_1
          ),

          // 4.1 Data Transfer
          ...(dataGov.data_transfer_plan
            ? buildDMPSection(
                '4.1 Data Transfer Arrangements',
                sections.dataTransfer.content,
                HeadingLevel.HEADING_2
              )
            : []),

          // 5. Retention and Disposal
          ...buildDMPSection(
            '5. Data Retention and Disposal',
            sections.retentionDisposal.content,
            HeadingLevel.HEADING_1
          ),

          // Retention table
          ...buildRetentionTable(dataGov),

          // 6. Legal and Ethical Compliance
          ...buildDMPSection(
            '6. Legal and Ethical Compliance',
            sections.legalCompliance.content,
            HeadingLevel.HEADING_1
          ),

          // Privacy compliance table
          ...buildPrivacyComplianceTable(dataGov),

          // 6.1 Data Breach Response
          ...buildDMPSection(
            '6.1 Data Breach Response Plan',
            dataGov.data_breach_response_plan,
            HeadingLevel.HEADING_2
          ),

          // 7. Roles and Responsibilities
          ...buildDMPSection(
            '7. Roles and Responsibilities',
            sections.rolesResponsibilities.content,
            HeadingLevel.HEADING_1
          ),

          // Roles table
          ...buildRolesTable(project),

          // 8. Review and Updates
          ...buildDMPSection(
            '8. DMP Review and Updates',
            sections.reviewUpdates.content,
            HeadingLevel.HEADING_1
          ),
        ],
      },
    ],
  });

  return generator.generateDocument(doc);
}

/**
 * Generate DMP section content using LLM
 */
async function generateDMPSections(
  project: Project,
  dataGov: DataGovernanceSpec
): Promise<Record<string, DMPSection>> {
  const prompt = `Generate professional Data Management Plan (DMP) section content for a healthcare research project.

PROJECT: ${project.intake.project_title}
DESCRIPTION: ${project.intake.concept_description}
SETTING: ${project.intake.setting}
TARGET POPULATION: ${project.intake.target_population}

DATA GOVERNANCE SPECIFICATION:
${JSON.stringify(dataGov, null, 2)}

Generate concise, professional content for each DMP section. Each section should be 2-4 paragraphs.
Follow ANDS/ARDC DMP guidelines and Australian health research standards.

Return JSON with these sections:
{
  "dataDescription": { "content": "Overview of research data to be collected..." },
  "dataTypes": { "content": "Description of data types and formats..." },
  "dataVolume": { "content": "Expected volume and growth estimates..." },
  "dataCollection": { "content": "Overview of data collection approach..." },
  "collectionProcedures": { "content": "Specific procedures for data collection..." },
  "qualityAssurance": { "content": "Quality control measures..." },
  "storageSecurity": { "content": "Storage infrastructure and security overview..." },
  "accessControls": { "content": "Who can access data and under what conditions..." },
  "backupRecovery": { "content": "Backup frequency and disaster recovery..." },
  "dataSharing": { "content": "Data sharing policies and restrictions..." },
  "dataTransfer": { "content": "If applicable, how data will be transferred..." },
  "retentionDisposal": { "content": "Retention periods and disposal procedures..." },
  "legalCompliance": { "content": "Applicable legislation and compliance measures..." },
  "rolesResponsibilities": { "content": "Overview of data management responsibilities..." },
  "reviewUpdates": { "content": "Schedule for DMP review and update procedures..." }
}`;

  const response = await callLLM(prompt, {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4000,
    systemPrompt: 'You are a research data management expert. Generate professional DMP content following ANDS/ARDC guidelines. Return valid JSON only.',
  });

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse DMP sections from LLM response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Build data types table
 */
function buildDataTypesTable(dataGov: DataGovernanceSpec): Paragraph[] {
  const rows = dataGov.data_types.map(dataType =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: dataType, size: 22 })] })],
          width: { size: 3000, type: WidthType.DXA },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: getDataTypeDescription(dataType), size: 22 })] })],
          width: { size: 4000, type: WidthType.DXA },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: getIdentifiabilityLevel(dataType), size: 22 })] })],
          width: { size: 2000, type: WidthType.DXA },
        }),
      ],
    })
  );

  const table = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Data Type', bold: true, size: 22, color: COLORS.TABLE_HEADER_TEXT })] })],
            shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true, size: 22, color: COLORS.TABLE_HEADER_TEXT })] })],
            shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Identifiability', bold: true, size: 22, color: COLORS.TABLE_HEADER_TEXT })] })],
            shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
          }),
        ],
      }),
      ...rows,
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return [
    new Paragraph({ spacing: { before: 200, after: 200 } }),
    table as unknown as Paragraph,
    new Paragraph({ spacing: { before: 200 } }),
  ];
}

/**
 * Build storage requirements table
 */
function buildStorageTable(dataGov: DataGovernanceSpec): Paragraph[] {
  const storage = dataGov.storage_requirements;

  const table = new Table({
    rows: [
      createTableRow('Storage Location', storage.location),
      createTableRow('Encryption', storage.encryption ? 'AES-256 encryption enabled' : 'Not required'),
      createTableRow('Backup Strategy', storage.backup_strategy),
      createTableRow('Access Controls', storage.access_controls.join('; ')),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return [
    new Paragraph({ spacing: { before: 200, after: 200 } }),
    table as unknown as Paragraph,
    new Paragraph({ spacing: { before: 200 } }),
  ];
}

/**
 * Build retention table
 */
function buildRetentionTable(dataGov: DataGovernanceSpec): Paragraph[] {
  const table = new Table({
    rows: [
      createTableRow('Retention Period', dataGov.retention_period),
      createTableRow('Disposal Method', dataGov.disposal_method),
      createTableRow('Responsible Officer', 'Principal Investigator or delegate'),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return [
    new Paragraph({ spacing: { before: 200, after: 200 } }),
    table as unknown as Paragraph,
    new Paragraph({ spacing: { before: 200 } }),
  ];
}

/**
 * Build privacy compliance table
 */
function buildPrivacyComplianceTable(dataGov: DataGovernanceSpec): Paragraph[] {
  const compliance = dataGov.privacy_compliance;

  const table = new Table({
    rows: [
      createTableRow('Privacy Act 1988 (Cth)', compliance.privacy_act_1988 ? '✓ Compliant' : 'N/A'),
      createTableRow('Information Privacy Act 2009 (Qld)', compliance.information_privacy_act_2009_qld ? '✓ Compliant' : 'N/A'),
      createTableRow('GDPR', compliance.gdpr_applicable ? '✓ Applicable' : 'Not applicable'),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return [
    new Paragraph({ spacing: { before: 200, after: 200 } }),
    table as unknown as Paragraph,
    new Paragraph({ spacing: { before: 200 } }),
  ];
}

/**
 * Build roles table
 */
function buildRolesTable(project: Project): Paragraph[] {
  const table = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Role', bold: true, size: 22, color: COLORS.TABLE_HEADER_TEXT })] })],
            shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Person', bold: true, size: 22, color: COLORS.TABLE_HEADER_TEXT })] })],
            shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Responsibilities', bold: true, size: 22, color: COLORS.TABLE_HEADER_TEXT })] })],
            shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
          }),
        ],
      }),
      createRoleRow('Data Custodian', project.intake.principal_investigator.name, 'Overall responsibility for data governance'),
      createRoleRow('Data Manager', 'To be assigned', 'Day-to-day data management and quality'),
      createRoleRow('Privacy Officer', 'Institutional Privacy Officer', 'Privacy compliance oversight'),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return [
    new Paragraph({ spacing: { before: 200, after: 200 } }),
    table as unknown as Paragraph,
    new Paragraph({ spacing: { before: 200 } }),
  ];
}

/**
 * Helper: Create table row with label and value
 */
function createTableRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22 })] })],
        width: { size: 3000, type: WidthType.DXA },
        shading: { fill: COLORS.TABLE_ALT_ROW_BG, type: ShadingType.CLEAR, color: 'auto' },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 22 })] })],
      }),
    ],
  });
}

/**
 * Helper: Create role table row
 */
function createRoleRow(role: string, person: string, responsibilities: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: role, size: 22 })] })],
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: person, size: 22 })] })],
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: responsibilities, size: 22 })] })],
      }),
    ],
  });
}

/**
 * Get description for data type
 */
function getDataTypeDescription(dataType: string): string {
  const descriptions: Record<string, string> = {
    'IDENTIFIABLE': 'Data that can directly identify individuals',
    'RE_IDENTIFIABLE': 'Data that can be re-linked to individuals via a code',
    'DE_IDENTIFIED': 'Data with identifiers permanently removed',
    'ANONYMISED': 'Data that cannot be linked to individuals',
  };
  return descriptions[dataType] || dataType;
}

/**
 * Get identifiability level for data type
 */
function getIdentifiabilityLevel(dataType: string): string {
  const levels: Record<string, string> = {
    'IDENTIFIABLE': 'High',
    'RE_IDENTIFIABLE': 'Medium',
    'DE_IDENTIFIED': 'Low',
    'ANONYMISED': 'None',
  };
  return levels[dataType] || 'Unknown';
}
