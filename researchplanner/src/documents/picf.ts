/**
 * Participant Information and Consent Form (PICF) Generation
 * Phase 8.6 - PICF Template Content Mapping
 *
 * Generates participant-facing documents in plain language (grade 8 reading level)
 * following NHMRC and HREC guidelines.
 */

import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  UnderlineType,
} from 'docx';
import type { Project } from '../types/project.js';
import type { Methodology } from '../types/methodology.js';
import type { EthicsEvaluation } from '../types/ethics.js';
import type { Investigator } from '../types/project.js';
import { callLLM } from '../utils/llm.js';
import { FONT_CONFIG } from './styles.js';

/**
 * Generate complete PICF document
 * @param project - The project data
 * @param methodology - The methodology specification
 * @param ethics - The ethics evaluation
 * @returns DOCX document buffer
 */
export async function generatePICF(
  project: Project,
  methodology: Methodology,
  ethics: EthicsEvaluation
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title page
          ...buildTitleSection(project),

          // Principal investigator contact
          ...generateContactInfo(project.intake.principal_investigator),

          new Paragraph({
            text: '',
            spacing: { after: 400 },
          }),

          // Part 1: Information Sheet heading
          new Paragraph({
            text: 'PART 1: INFORMATION SHEET',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 400 },
          }),

          new Paragraph({
            text: 'Please read this information carefully before deciding whether to participate in this research.',
            spacing: { after: 400 },
            italics: true,
          }),

          // Information sheet sections
          ...(await generateStudyDescription(project, methodology)),
          ...(await generateWhatYouWillDo(methodology)),
          ...(await generateRisksBenefits(methodology, ethics)),
          ...(await generatePrivacySection(ethics)),
          ...generateVoluntaryStatement(),

          new Paragraph({
            text: '',
            spacing: { after: 400 },
          }),

          // Part 2: Consent Form
          new Paragraph({
            text: 'PART 2: CONSENT FORM',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 400 },
          }),

          new Paragraph({
            text: 'If you would like to participate in this research, please indicate your consent by signing below.',
            spacing: { after: 400 },
            italics: true,
          }),

          // Consent statements
          ...buildConsentForm(generateConsentStatements(ethics)),

          // Signature blocks
          ...buildSignatureBlocks(determineWitnessRequired(project, ethics)),
        ],
      },
    ],
  });

  // Generate buffer using Packer
  const { Packer } = await import('docx');
  return await Packer.toBuffer(doc);
}

/**
 * Build title section with study title and version info
 */
function buildTitleSection(project: Project): Paragraph[] {
  return [
    new Paragraph({
      text: 'PARTICIPANT INFORMATION SHEET AND CONSENT FORM',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),

    new Paragraph({
      text: '',
      spacing: { after: 200 },
    }),

    new Paragraph({
      text: project.intake.project_title,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    new Paragraph({
      text: `Version: 1.0`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),

    new Paragraph({
      text: `Date: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    new Paragraph({
      text: project.ethics?.ethics_pathway.reference_number
        ? `Ethics Reference: ${project.ethics.ethics_pathway.reference_number}`
        : '',
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
  ];
}

/**
 * Generate contact information section
 */
export function generateContactInfo(pi: Investigator): Paragraph[] {
  return [
    new Paragraph({
      text: 'Principal Investigator Contact Details',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Name: ', bold: true }),
        new TextRun({ text: `${pi.title} ${pi.name}` }),
      ],
      spacing: { after: 100 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Position: ', bold: true }),
        new TextRun({ text: pi.role === 'PI' ? 'Principal Investigator' : pi.role }),
      ],
      spacing: { after: 100 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Institution: ', bold: true }),
        new TextRun({ text: pi.institution }),
      ],
      spacing: { after: 100 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Department: ', bold: true }),
        new TextRun({ text: pi.department }),
      ],
      spacing: { after: 100 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Email: ', bold: true }),
        new TextRun({ text: pi.email }),
      ],
      spacing: { after: 100 },
    }),

    ...(pi.phone ? [
      new Paragraph({
        children: [
          new TextRun({ text: 'Phone: ', bold: true }),
          new TextRun({ text: pi.phone }),
        ],
        spacing: { after: 100 },
      }),
    ] : []),
  ];
}

/**
 * Generate study description in plain language
 */
export async function generateStudyDescription(
  project: Project,
  methodology: Methodology
): Promise<Paragraph[]> {
  const prompt = `You are writing a participant information sheet for a research study. Your goal is to explain the study in simple, clear language that anyone can understand (grade 8 reading level).

Study Title: ${project.intake.project_title}

Clinical Problem: ${project.intake.clinical_problem}

Study Type: ${project.intake.project_type}

Study Design: ${methodology.study_design.type}

Target Population: ${project.intake.target_population}

Setting: ${project.intake.setting}

Intended Outcomes: ${project.intake.intended_outcomes}

Write 2-3 short paragraphs that explain:
1. What is this study about? (What are we trying to learn?)
2. Why is this study important? (Why does it matter?)
3. Who is conducting the study?

Use:
- Short sentences (max 20 words)
- Simple, everyday words (avoid medical jargon)
- Active voice ("We will..." not "It will be...")
- "You" to address the reader directly

Avoid:
- Technical terms unless necessary (if used, explain them)
- Long complex sentences
- Passive voice
- Academic language

Return only the paragraphs as plain text, separated by blank lines.`;

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2000,
    temperature: 0.7,
  });

  const paragraphs = response
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(text => new Paragraph({
      text: text.trim(),
      spacing: { after: 200 },
    }));

  return [
    new Paragraph({
      text: 'What is this study about?',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    ...paragraphs,
  ];
}

/**
 * Generate "What you will be asked to do" section
 */
export async function generateWhatYouWillDo(
  methodology: Methodology
): Promise<Paragraph[]> {
  const prompt = `You are writing a participant information sheet. Explain what participants will be asked to do in this study.

Study Design: ${methodology.study_design.type}

Procedures Overview: ${methodology.procedures.overview}

${methodology.procedures.intervention_description ? `Intervention: ${methodology.procedures.intervention_description}` : ''}

Data Collection:
${methodology.data_collection.instruments.map(inst => `- ${inst.name} (${inst.type})`).join('\n')}

Collection Timepoints: ${methodology.data_collection.collection_timepoints.join(', ')}

Timeline: ${methodology.timeline.total_duration}

Write 2-3 short paragraphs explaining:
1. What will participants do in this study?
2. How long will their involvement take?
3. What will happen at each visit/session?

Use plain language (grade 8 reading level):
- Short sentences
- Simple words
- Active voice
- Direct address ("You will...")
- Specific time commitments

Format as a step-by-step explanation if helpful.

Return only the paragraphs as plain text, separated by blank lines.`;

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2000,
    temperature: 0.7,
  });

  const paragraphs = response
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(text => new Paragraph({
      text: text.trim(),
      spacing: { after: 200 },
    }));

  return [
    new Paragraph({
      text: 'What will I be asked to do?',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    ...paragraphs,
  ];
}

/**
 * Generate risks and benefits section
 */
export async function generateRisksBenefits(
  methodology: Methodology,
  ethics: EthicsEvaluation
): Promise<Paragraph[]> {
  const prompt = `You are writing a participant information sheet. Explain the possible risks and benefits clearly and honestly.

Risk Level: ${ethics.risk_assessment.level}

Risk Factors:
${ethics.risk_assessment.factors.map(f => `- ${f.category}: ${f.mitigation}`).join('\n')}

Study Type: ${methodology.study_design.type}

${methodology.procedures.intervention_description ? `Intervention: ${methodology.procedures.intervention_description}` : ''}

Write two sections:

1. "What are the possible benefits?" (2-3 sentences)
   - Be honest: may be no direct benefit to participant
   - Explain potential benefits to others/future patients
   - Mention any compensation if applicable

2. "What are the possible risks?" (2-3 sentences)
   - List main risks clearly
   - Explain how risks will be minimized
   - Be transparent about uncertainties

Use plain language:
- Short sentences
- Simple words
- Honest and balanced tone
- Avoid minimizing or exaggerating

Return the two sections separated by "---" on its own line.`;

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2000,
    temperature: 0.7,
  });

  const sections = response.split(/\n---\n/);
  const benefitsText = sections[0]?.trim() || '';
  const risksText = sections[1]?.trim() || '';

  return [
    new Paragraph({
      text: 'What are the possible benefits?',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: benefitsText,
      spacing: { after: 400 },
    }),

    new Paragraph({
      text: 'What are the possible risks?',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: risksText,
      spacing: { after: 400 },
    }),
  ];
}

/**
 * Generate privacy and confidentiality section
 */
export async function generatePrivacySection(
  ethics: EthicsEvaluation
): Promise<Paragraph[]> {
  const prompt = `You are writing a participant information sheet. Explain how participant information will be kept private and secure.

Data Types: ${ethics.data_governance.data_types.join(', ')}

Storage Location: ${ethics.data_governance.storage_requirements.location}

Encryption: ${ethics.data_governance.storage_requirements.encryption ? 'Yes' : 'No'}

Access Controls: ${ethics.data_governance.storage_requirements.access_controls.join(', ')}

Retention Period: ${ethics.data_governance.retention_period}

Disposal Method: ${ethics.data_governance.disposal_method}

Privacy Compliance:
- Privacy Act 1988: ${ethics.data_governance.privacy_compliance.privacy_act_1988 ? 'Yes' : 'No'}
- QLD Information Privacy Act 2009: ${ethics.data_governance.privacy_compliance.information_privacy_act_2009_qld ? 'Yes' : 'No'}

Write 2-3 short paragraphs explaining:
1. How will my information be kept confidential?
2. Who will have access to my information?
3. How long will my information be kept?
4. What happens to my information after the study ends?

Use plain language:
- Short sentences
- Simple explanations of technical terms
- Reassuring but accurate tone
- Specific details about security measures

Return only the paragraphs as plain text, separated by blank lines.`;

  const response = await callLLM(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2000,
    temperature: 0.7,
  });

  const paragraphs = response
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(text => new Paragraph({
      text: text.trim(),
      spacing: { after: 200 },
    }));

  return [
    new Paragraph({
      text: 'How will my information be kept confidential?',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    ...paragraphs,
  ];
}

/**
 * Generate voluntary participation statement
 */
export function generateVoluntaryStatement(): Paragraph[] {
  return [
    new Paragraph({
      text: 'Do I have to take part?',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),

    new Paragraph({
      text: 'Participation in this study is completely voluntary. You do not have to take part if you do not want to. If you decide to take part and later change your mind, you are free to withdraw at any time.',
      spacing: { after: 200 },
    }),

    new Paragraph({
      text: 'Your decision whether to participate will not affect your current or future relationship with the researchers or your medical care. If you withdraw, the information you have already provided will be kept unless you specifically request it to be destroyed.',
      spacing: { after: 400 },
    }),

    new Paragraph({
      text: 'What if I have concerns or complaints?',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),

    new Paragraph({
      text: 'If you have any concerns or complaints about this study, please contact the Principal Investigator (contact details provided above). They will do their best to answer your questions.',
      spacing: { after: 200 },
    }),

    new Paragraph({
      text: 'If you have concerns about the way this study is being conducted, or if you wish to make a confidential complaint, you can contact:',
      spacing: { after: 200 },
    }),

    new Paragraph({
      text: 'Metro North Health Human Research Ethics Committee',
      spacing: { after: 100 },
    }),

    new Paragraph({
      text: 'Email: MNHHS-ResearchEthics@health.qld.gov.au',
      spacing: { after: 100 },
    }),

    new Paragraph({
      text: 'Phone: (07) 3646 9246',
      spacing: { after: 400 },
    }),
  ];
}

/**
 * Generate standard consent statements based on ethics requirements
 */
function generateConsentStatements(ethics: EthicsEvaluation): string[] {
  const statements: string[] = [
    'I have read and understood the information sheet for this study.',
    'The nature and purpose of the research has been explained to me.',
    'I have had an opportunity to ask questions and I am satisfied with the answers I received.',
    'I understand that my participation is voluntary.',
    'I understand that I can withdraw from the study at any time without giving a reason.',
    'I understand that withdrawing will not affect my medical care or relationship with the research team.',
  ];

  // Add consent-specific statements
  if (ethics.consent_requirements.consent_type === 'FULL_WRITTEN') {
    statements.push('I agree to participate in this study and provide written consent.');
  }

  // Add data-specific statements
  if (ethics.data_governance.data_types.includes('IDENTIFIABLE')) {
    statements.push('I understand that identifiable information about me will be collected and stored securely.');
    statements.push(`I understand that my data will be stored for ${ethics.data_governance.retention_period}.`);
  }

  if (ethics.data_governance.data_types.includes('RE_IDENTIFIABLE')) {
    statements.push('I understand that my data will be coded to protect my identity.');
  }

  // Add publication statement
  statements.push('I understand that the results of this study may be published, but my identity will not be revealed.');

  // Add contact statement
  statements.push('I have been given a copy of this information sheet and consent form to keep.');

  return statements;
}

/**
 * Build consent form with checkboxes
 */
export function buildConsentForm(consentItems: string[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: 'Please tick each box if you agree:',
      spacing: { after: 200 },
      bold: true,
    }),
  ];

  consentItems.forEach((item, index) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: '☐  ', font: FONT_CONFIG.PRIMARY_FONT }),
          new TextRun({ text: item }),
        ],
        spacing: { after: 150 },
      })
    );
  });

  return paragraphs;
}

/**
 * Build signature blocks
 */
export function buildSignatureBlocks(requiresWitness: boolean): Paragraph[] {
  const blocks: Paragraph[] = [
    new Paragraph({
      text: '',
      spacing: { before: 400, after: 400 },
    }),

    // Participant signature
    new Paragraph({
      text: 'PARTICIPANT',
      spacing: { after: 200 },
      bold: true,
      underline: { type: UnderlineType.SINGLE },
    }),

    new Paragraph({
      text: '',
      spacing: { after: 200 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Name: ' }),
        new TextRun({ text: '_'.repeat(50) }),
      ],
      spacing: { after: 200 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Signature: ' }),
        new TextRun({ text: '_'.repeat(50) }),
      ],
      spacing: { after: 200 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ' }),
        new TextRun({ text: '_'.repeat(30) }),
      ],
      spacing: { after: 400 },
    }),
  ];

  // Add witness block if required
  if (requiresWitness) {
    blocks.push(
      new Paragraph({
        text: 'WITNESS (if required)',
        spacing: { before: 400, after: 200 },
        bold: true,
        underline: { type: UnderlineType.SINGLE },
      }),

      new Paragraph({
        text: 'I certify that I was present when the participant signed this consent form.',
        spacing: { after: 200 },
        italics: true,
      }),

      new Paragraph({
        children: [
          new TextRun({ text: 'Name: ' }),
          new TextRun({ text: '_'.repeat(50) }),
        ],
        spacing: { after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({ text: 'Signature: ' }),
          new TextRun({ text: '_'.repeat(50) }),
        ],
        spacing: { after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({ text: 'Date: ' }),
          new TextRun({ text: '_'.repeat(30) }),
        ],
        spacing: { after: 400 },
      })
    );
  }

  // Add investigator signature block
  blocks.push(
    new Paragraph({
      text: 'INVESTIGATOR STATEMENT',
      spacing: { before: 400, after: 200 },
      bold: true,
      underline: { type: UnderlineType.SINGLE },
    }),

    new Paragraph({
      text: 'I have explained the nature and purpose of this study to the participant. I have answered all questions to the best of my ability.',
      spacing: { after: 200 },
      italics: true,
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Name: ' }),
        new TextRun({ text: '_'.repeat(50) }),
      ],
      spacing: { after: 200 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Signature: ' }),
        new TextRun({ text: '_'.repeat(50) }),
      ],
      spacing: { after: 200 },
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ' }),
        new TextRun({ text: '_'.repeat(30) }),
      ],
      spacing: { after: 200 },
    })
  );

  return blocks;
}

/**
 * Determine if witness signature is required
 */
function determineWitnessRequired(
  project: Project,
  ethics: EthicsEvaluation
): boolean {
  // Witness required for vulnerable populations or third-party consent
  return (
    project.methodology?.participants.vulnerable_population ||
    ethics.consent_requirements.third_party_consent_required ||
    ethics.consent_requirements.capacity_assessment_required
  ) ?? false;
}
