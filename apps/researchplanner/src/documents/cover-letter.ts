/**
 * HREC Cover Letter Generation
 * Phase 8.5 - HREC Cover Letter Generation Implementation
 *
 * This module generates formal cover letters for HREC (Human Research Ethics Committee)
 * submissions in Metro North Health letterhead style.
 */

import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  convertInchesToTwip,
} from 'docx';
import type { Project, Investigator } from '../types/project.js';
import type { EthicsEvaluation } from '../types/ethics.js';
import { callLLM } from '../utils/llm.js';
import { FONT_CONFIG } from './styles.js';

/**
 * HREC cover letter content mapping schema
 */
export interface HRECCoverLetterContent {
  project_title: string;
  protocol_version: string;
  submission_date: string;
  principal_investigator: Investigator;
  project_summary_paragraphs: Paragraph[];
  pathway_justification_paragraphs: Paragraph[];
  risk_explanation_paragraphs: Paragraph[];
  key_points: string[];
  attachments: string[];
}

/**
 * Generate HREC cover letter as DOCX document
 *
 * @param project - Complete project data
 * @param ethics - Ethics evaluation results
 * @param attachments - List of attached document names
 * @returns DOCX document buffer
 */
export async function generateHRECCoverLetter(
  project: Project,
  ethics: EthicsEvaluation,
  attachments: string[]
): Promise<Buffer> {
  const date = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Generate content sections
  const [projectSummary, pathwayJustification, riskExplanation] = await Promise.all([
    generateProjectSummary(project),
    generatePathwayJustification(ethics),
    generateRiskExplanation(ethics),
  ]);

  // Extract key points for summary
  const keyPoints = extractKeyPoints(project, ethics);

  // Build document sections
  const sections: Paragraph[] = [
    ...buildLetterHeader(date),
    ...buildAddressee(ethics.ethics_pathway.approval_body),
    ...buildSubjectLine(project.intake.project_title, '1.0'),
    ...buildOpeningParagraph(),
    ...projectSummary,
    new Paragraph({ text: '' }), // Spacing
    ...pathwayJustification,
    new Paragraph({ text: '' }), // Spacing
    ...riskExplanation,
    new Paragraph({ text: '' }), // Spacing
    ...buildKeyPointsSummary(keyPoints),
    new Paragraph({ text: '' }), // Spacing
    ...formatAttachmentsList(attachments),
    new Paragraph({ text: '' }), // Spacing
    ...buildClosingParagraph(),
    new Paragraph({ text: '' }), // Spacing
    ...buildSignatureBlock(project.intake.principal_investigator),
  ];

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.0),
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(1.0),
              right: convertInchesToTwip(1.0),
            },
          },
        },
        children: sections,
      },
    ],
  });

  // Convert to buffer
  const Packer = (await import('docx')).Packer;
  return await Packer.toBuffer(doc);
}

/**
 * Build letter header with Metro North Health letterhead style
 *
 * @param date - Formatted date string
 * @returns Paragraph array for header
 */
export function buildLetterHeader(date: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Metro North Health',
          bold: true,
          size: FONT_SIZES.HEADING3,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Research Governance Office',
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({ text: '' }), // Blank line
    new Paragraph({
      children: [
        new TextRun({
          text: date,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({ text: '' }), // Blank line
  ];
}

/**
 * Build addressee section
 *
 * @param approvalBody - Name of the approval body
 * @returns Paragraph array for addressee
 */
function buildAddressee(approvalBody: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: getApprovalBodyTitle(approvalBody),
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    new Paragraph({ text: '' }), // Blank line
  ];
}

/**
 * Build subject line with project title
 *
 * @param projectTitle - Project title
 * @param protocolVersion - Protocol version number
 * @returns Paragraph array for subject line
 */
function buildSubjectLine(projectTitle: string, protocolVersion: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'RE: Ethics Submission',
          bold: true,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Project: ${projectTitle}`,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Protocol Version: ${protocolVersion}`,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    new Paragraph({ text: '' }), // Blank line
  ];
}

/**
 * Build opening paragraph
 *
 * @returns Paragraph array for opening
 */
function buildOpeningParagraph(): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Dear Committee Members,',
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    new Paragraph({ text: '' }), // Blank line
    new Paragraph({
      children: [
        new TextRun({
          text: 'Please find enclosed our submission for ethics review. This letter provides an overview of the project and outlines the key considerations for your review.',
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
      spacing: {
        after: 200,
      },
    }),
  ];
}

/**
 * Generate project summary paragraphs (2-3 paragraphs)
 * Uses LLM to create flowing prose summarizing the project
 *
 * @param project - Project data
 * @returns Array of summary paragraphs
 */
export async function generateProjectSummary(project: Project): Promise<Paragraph[]> {
  const prompt = `Generate a 2-3 paragraph project summary for an HREC cover letter based on the following project information:

Project Title: ${project.intake.project_title}
Project Type: ${project.intake.project_type}
Clinical Problem: ${project.intake.clinical_problem}
Target Population: ${project.intake.target_population}
Setting: ${project.intake.setting}
Intended Outcomes: ${project.intake.intended_outcomes}

${project.methodology ? `Study Design: ${project.methodology.study_design.design_type}
Sample Size: ${project.methodology.participants.sample_size.total_required}
Duration: ${project.methodology.timeline.total_duration}` : ''}

Requirements:
- Write in formal, professional tone suitable for HREC submission
- Start with project rationale and aims
- Describe the methodology briefly
- Explain expected benefits and significance
- Keep total length to 200-250 words
- Use flowing prose (NOT bullet points)
- Write in third person

Generate only the summary paragraphs, no preamble.`;

  const systemPrompt = `You are a medical research writer specializing in ethics submissions.
Generate clear, professional prose for HREC cover letters.`;

  const response = await callLLM(prompt, {
    systemPrompt,
    temperature: 0.7,
    maxTokens: 1024,
  });

  // Split response into paragraphs and convert to docx Paragraph objects
  return response
    .trim()
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(
      paraText =>
        new Paragraph({
          children: [
            new TextRun({
              text: paraText.trim(),
              size: FONT_SIZES.NORMAL,
              font: FONT_CONFIG.PRIMARY_FONT,
            }),
          ],
          spacing: {
            after: 200,
          },
        })
    );
}

/**
 * Generate ethics pathway justification paragraphs
 * Explains why the chosen pathway is appropriate
 *
 * @param ethics - Ethics evaluation
 * @returns Array of justification paragraphs
 */
export async function generatePathwayJustification(
  ethics: EthicsEvaluation
): Promise<Paragraph[]> {
  const prompt = `Generate a 1-2 paragraph justification for the ethics approval pathway for an HREC cover letter:

Ethics Pathway: ${ethics.ethics_pathway.pathway}
Approval Body: ${ethics.ethics_pathway.approval_body}
Requires HREC: ${ethics.ethics_pathway.requires_hrec}
Risk Level: ${ethics.risk_assessment.level}
Risk Justification: ${ethics.risk_assessment.overall_justification}

Requirements:
- Explain why this pathway is appropriate for the project
- Reference the National Statement criteria where relevant
- Be concise (100-150 words)
- Use formal, professional tone
- Write in third person

Generate only the justification paragraphs, no preamble.`;

  const systemPrompt = `You are a medical research ethics expert specializing in NHMRC National Statement compliance.
Generate clear justifications for ethics review pathways.`;

  const response = await callLLM(prompt, {
    systemPrompt,
    temperature: 0.6,
    maxTokens: 512,
  });

  return response
    .trim()
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(
      paraText =>
        new Paragraph({
          children: [
            new TextRun({
              text: paraText.trim(),
              size: FONT_SIZES.NORMAL,
              font: FONT_CONFIG.PRIMARY_FONT,
            }),
          ],
          spacing: {
            after: 200,
          },
        })
    );
}

/**
 * Generate risk level explanation paragraphs
 * Explains the risk classification and mitigation strategies
 *
 * @param ethics - Ethics evaluation
 * @returns Array of risk explanation paragraphs
 */
export async function generateRiskExplanation(
  ethics: EthicsEvaluation
): Promise<Paragraph[]> {
  const riskFactorsText = ethics.risk_assessment.factors
    .map(f => `${f.category}: ${f.risk_level} - ${f.mitigation}`)
    .join('\n');

  const prompt = `Generate a 1-2 paragraph explanation of the risk assessment for an HREC cover letter:

Overall Risk Level: ${ethics.risk_assessment.level}
Risk Factors:
${riskFactorsText}

Overall Justification: ${ethics.risk_assessment.overall_justification}
National Statement Reference: ${ethics.risk_assessment.national_statement_reference}

Requirements:
- Explain the overall risk classification
- Highlight key risk factors and their mitigation
- Reference National Statement compliance
- Be concise (100-150 words)
- Use formal, professional tone
- Write in third person

Generate only the risk explanation paragraphs, no preamble.`;

  const systemPrompt = `You are a medical research ethics expert specializing in risk assessment.
Generate clear explanations of risk classifications for ethics submissions.`;

  const response = await callLLM(prompt, {
    systemPrompt,
    temperature: 0.6,
    maxTokens: 512,
  });

  return response
    .trim()
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(
      paraText =>
        new Paragraph({
          children: [
            new TextRun({
              text: paraText.trim(),
              size: FONT_SIZES.NORMAL,
              font: FONT_CONFIG.PRIMARY_FONT,
            }),
          ],
          spacing: {
            after: 200,
          },
        })
    );
}

/**
 * Format attachments list
 *
 * @param attachments - Array of attachment filenames
 * @returns Paragraph array with formatted list
 */
export function formatAttachmentsList(attachments: string[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Attached Documents:',
          bold: true,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
  ];

  attachments.forEach((attachment, index) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${index + 1}. ${attachment}`,
            size: FONT_SIZES.NORMAL,
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
        bullet: {
          level: 0,
        },
      })
    );
  });

  return paragraphs;
}

/**
 * Build key points summary section
 *
 * @param keyPoints - Array of key point strings
 * @returns Paragraph array with key points
 */
function buildKeyPointsSummary(keyPoints: string[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Key Points for Consideration:',
          bold: true,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
  ];

  keyPoints.forEach(point => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: point,
            size: FONT_SIZES.NORMAL,
            font: FONT_CONFIG.PRIMARY_FONT,
          }),
        ],
        bullet: {
          level: 0,
        },
      })
    );
  });

  return paragraphs;
}

/**
 * Build closing paragraph
 *
 * @returns Paragraph array for closing
 */
function buildClosingParagraph(): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'We are available to provide any additional information or clarification that may be required. We look forward to your review and feedback.',
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
      spacing: {
        after: 200,
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Yours sincerely,',
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
  ];
}

/**
 * Build signature block
 *
 * @param pi - Principal investigator details
 * @returns Paragraph array for signature
 */
export function buildSignatureBlock(pi: Investigator): Paragraph[] {
  return [
    new Paragraph({ text: '' }), // Space for signature
    new Paragraph({ text: '' }), // Space for signature
    new Paragraph({
      children: [
        new TextRun({
          text: pi.name,
          bold: true,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: pi.title,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${pi.department}, ${pi.institution}`,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Email: ${pi.email}`,
          size: FONT_SIZES.NORMAL,
          font: FONT_CONFIG.PRIMARY_FONT,
        }),
      ],
    }),
    ...(pi.phone
      ? [
          new Paragraph({
            children: [
              new TextRun({
                text: `Phone: ${pi.phone}`,
                size: FONT_SIZES.NORMAL,
                font: FONT_CONFIG.PRIMARY_FONT,
              }),
            ],
          }),
        ]
      : []),
  ];
}

/**
 * Extract key points from project and ethics data
 *
 * @param project - Project data
 * @param ethics - Ethics evaluation
 * @returns Array of key point strings
 */
function extractKeyPoints(project: Project, ethics: EthicsEvaluation): string[] {
  const points: string[] = [];

  // Risk level
  points.push(`Risk classification: ${ethics.risk_assessment.level} risk`);

  // Consent type
  points.push(`Consent approach: ${ethics.consent_requirements.consent_type}`);

  // Data handling
  const dataTypes = ethics.data_governance.data_types.join(', ');
  points.push(`Data types: ${dataTypes}`);

  // Study duration (if available)
  if (project.methodology?.timeline) {
    points.push(`Study duration: ${project.methodology.timeline.total_duration}`);
  }

  // Sample size (if available)
  if (project.methodology?.participants) {
    points.push(
      `Target sample size: ${project.methodology.participants.sample_size.total_required} participants`
    );
  }

  return points;
}

/**
 * Get formal title for approval body
 *
 * @param approvalBody - Approval body code
 * @returns Formal title string
 */
function getApprovalBodyTitle(approvalBody: string): string {
  const titles: Record<string, string> = {
    MN_HREC: 'Metro North Human Research Ethics Committee',
    RMH_HREC: 'Royal Melbourne Hospital Human Research Ethics Committee',
    UNIT_DIRECTOR: 'Unit Director',
    QH_HREC: 'Queensland Health Human Research Ethics Committee',
  };

  return titles[approvalBody] || approvalBody;
}
