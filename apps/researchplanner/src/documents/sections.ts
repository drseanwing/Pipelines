import {
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  BorderStyle,
  WidthType,
  AlignmentType,
  VerticalAlign,
  ShadingType,
} from 'docx';
import { COLORS } from './styles.js';

/**
 * Build title page with project title, PI, date
 */
export function buildTitlePage(
  title: string,
  principalInvestigator: string,
  date: string
): Paragraph[] {
  return [
    new Paragraph({
      text: '',
      spacing: { before: 4000 }, // Add space before
    }),
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: '',
      spacing: { after: 2000 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Principal Investigator: ',
          bold: true,
        }),
        new TextRun({
          text: principalInvestigator,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Date: ',
          bold: true,
        }),
        new TextRun({
          text: date,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    }),
  ];
}

/**
 * Build version history table
 */
export function buildVersionHistory(
  version: string,
  changes?: string[]
): Table {
  const rows: TableRow[] = [
    // Header row
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Version', bold: true, color: COLORS.TABLE_HEADER_TEXT })] })],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, color: COLORS.TABLE_HEADER_TEXT })] })],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Changes', bold: true, color: COLORS.TABLE_HEADER_TEXT })] })],
          width: { size: 60, type: WidthType.PERCENTAGE },
          shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
        }),
      ],
    }),
    // Version row
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph(version)],
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph(new Date().toLocaleDateString())],
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children:
            changes && changes.length > 0
              ? changes.map((change) => new Paragraph(change))
              : [new Paragraph('Initial version')],
          width: { size: 60, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  ];

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

/**
 * Convert markdown text to Paragraph elements
 *
 * This is the low-level function for converting markdown to docx Paragraphs.
 * Prefer using buildSection() or buildSubsection() for structured content.
 *
 * @param {string} markdown - Markdown-formatted text
 * @param {HeadingLevel} [headingLevel] - Optional heading level for first paragraph
 * @returns {Paragraph[]} Array of Paragraph elements
 *
 * @see {@link buildSection} for creating sections with title + content
 * @see {@link buildSubsection} for creating subsections
 */
export function markdownToParagraphs(
  markdown: string,
  headingLevel?: typeof HeadingLevel[keyof typeof HeadingLevel]
): Paragraph[] {
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      // Empty line - add spacing
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    // Check for markdown headers
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch?.[1] && headerMatch?.[2]) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const heading = getHeadingLevel(level);

      paragraphs.push(
        new Paragraph({
          text,
          heading,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    // Check for bullet lists
    if (trimmedLine.match(/^[\*\-]\s+/)) {
      const text = trimmedLine.replace(/^[\*\-]\s+/, '');
      paragraphs.push(
        new Paragraph({
          children: markdownToDocx(text),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Check for numbered lists
    if (trimmedLine.match(/^\d+\.\s+/)) {
      const text = trimmedLine.replace(/^\d+\.\s+/, '');
      paragraphs.push(
        new Paragraph({
          children: markdownToDocx(text),
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Regular paragraph
    paragraphs.push(
      new Paragraph({
        children: markdownToDocx(trimmedLine),
        spacing: { after: 120 },
      })
    );
  }

  return paragraphs;
}

/**
 * Build protocol synopsis table (key-value pairs)
 */
export function buildSynopsis(data: Record<string, string>): Table {
  const rows: TableRow[] = Object.entries(data).map(
    ([key, value]) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: key, bold: true })],
              }),
            ],
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: COLORS.TABLE_ALT_ROW_BG, type: ShadingType.CLEAR, color: 'auto' },
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [new Paragraph(value)],
            width: { size: 70, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      })
  );

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

/**
 * Build numbered reference list
 */
export function buildReferences(citations: string[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: 'References',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 480, after: 240 },
    }),
  ];

  citations.forEach((citation, index) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${index + 1}. `,
            bold: true,
          }),
          new TextRun({
            text: citation,
          }),
        ],
        spacing: { after: 120 },
        indent: { left: 360, hanging: 360 },
      })
    );
  });

  return paragraphs;
}

/**
 * Parse markdown to docx elements (bold, italic, lists)
 */
export function markdownToDocx(text: string): TextRun[] {
  const runs: TextRun[] = [];

  // Pattern to match **bold**, *italic*, or plain text
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|[^*]+)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const fullMatch = match[1];
    const boldText = match[2];
    const italicText = match[3];

    if (boldText) {
      // Bold text
      runs.push(new TextRun({ text: boldText, bold: true }));
    } else if (italicText) {
      // Italic text
      runs.push(new TextRun({ text: italicText, italics: true }));
    } else {
      // Plain text
      runs.push(new TextRun({ text: fullMatch }));
    }
  }

  // If no markdown formatting found, return plain text
  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}

/**
 * Build a simple table from rows
 */
export function buildSimpleTable(
  headers: string[],
  rows: string[][]
): Table {
  const tableRows: TableRow[] = [
    // Header row
    new TableRow({
      children: headers.map(
        (header) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: header, bold: true, color: COLORS.TABLE_HEADER_TEXT })],
              }),
            ],
            shading: { fill: COLORS.TABLE_HEADER_BG, type: ShadingType.CLEAR, color: 'auto' },
            verticalAlign: VerticalAlign.CENTER,
          })
      ),
    }),
    // Data rows
    ...rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph(cell)],
                verticalAlign: VerticalAlign.CENTER,
              })
          ),
        })
    ),
  ];

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

/**
 * Build numbered list
 */
export function buildNumberedList(items: string[]): Paragraph[] {
  return items.map(
    (item, index) =>
      new Paragraph({
        children: [
          new TextRun({
            text: `${index + 1}. `,
            bold: true,
          }),
          ...markdownToDocx(item),
        ],
        spacing: { after: 60 },
      })
  );
}

/**
 * Build bullet list
 */
export function buildBulletList(items: string[]): Paragraph[] {
  return items.map(
    (item) =>
      new Paragraph({
        children: markdownToDocx(item),
        bullet: { level: 0 },
        spacing: { after: 60 },
      })
  );
}

/**
 * Helper function to convert markdown header level to docx HeadingLevel
 */
function getHeadingLevel(level: number): typeof HeadingLevel[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    case 6:
      return HeadingLevel.HEADING_6;
    default:
      return HeadingLevel.HEADING_1;
  }
}

/**
 * Build a section with a heading and content
 *
 * Creates a section with:
 * - Heading 1 (H1) for the title
 * - Content paragraphs (supports markdown formatting)
 *
 * @param {string} title - Section title (will be rendered as H1)
 * @param {string} content - Section content (supports markdown: **bold**, *italic*, lists)
 * @returns {Paragraph[]} Array of Paragraph elements ready for docx Document
 *
 * @example
 * const section = buildSection("Introduction", "This study aims to...");
 */
export function buildSection(title: string, content: string): Paragraph[] {
  const markdown = `# ${title}\n\n${content}`;
  return markdownToParagraphs(markdown);
}

/**
 * Build a subsection with a heading and content
 *
 * Creates a subsection with:
 * - Heading 2 (H2) for the title
 * - Content paragraphs (supports markdown formatting)
 *
 * @param {string} title - Subsection title (will be rendered as H2)
 * @param {string} content - Subsection content (supports markdown)
 * @returns {Paragraph[]} Array of Paragraph elements
 *
 * @example
 * const subsection = buildSubsection("Sample Size", "We calculated a sample size of 120 participants...");
 */
export function buildSubsection(title: string, content: string): Paragraph[] {
  const markdown = `## ${title}\n\n${content}`;
  return markdownToParagraphs(markdown, HeadingLevel.HEADING_2);
}
