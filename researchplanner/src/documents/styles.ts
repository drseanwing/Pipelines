/**
 * REdI (Resuscitation EDucation Initiative) - Document Styles Configuration
 *
 * This module defines the document styling configuration for DOCX generation
 * including paragraph styles, page properties, and table formatting.
 * Follows the REdI Brand Guidelines v1.0 (January 2026).
 *
 * @module documents/styles
 */

import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  LevelFormat,
  LineRuleType,
  ShadingType,
  UnderlineType,
  type IStylesOptions,
  type ITableBordersOptions,
  type ISectionPropertiesOptions,
  type ILevelsOptions,
} from 'docx';

// ============================================================================
// Constants
// ============================================================================

/**
 * Font configuration
 * REdI Brand: Montserrat (primary), Bebas Neue (display)
 *
 * Note: Montserrat and Bebas Neue are not standard system fonts.
 * They must be installed on the system generating documents for
 * correct rendering in DOCX output. If unavailable, the docx library
 * will embed the font name but the viewer application will substitute
 * a fallback (typically the system default sans-serif). For consistent
 * results, install both fonts from Google Fonts:
 *   - https://fonts.google.com/specimen/Montserrat
 *   - https://fonts.google.com/specimen/Bebas+Neue
 */
export const FONT_CONFIG = {
  PRIMARY_FONT: 'Montserrat',
  DISPLAY_FONT: 'Bebas Neue',
  FALLBACK_FONT: 'Segoe UI',
  CODE_FONT: 'Consolas',
} as const;

/**
 * Font sizes in half-points (12pt = 24 half-points)
 * Based on REdI Brand Print Type Scale
 */
export const FONT_SIZES = {
  TITLE: 56, // 28pt (REdI Print H1)
  HEADING1: 44, // 22pt (REdI Print H2)
  HEADING2: 32, // 16pt (REdI Print H3)
  HEADING3: 28, // 14pt
  NORMAL: 24, // 12pt (Body - improved accessibility)
  CAPTION: 18, // 9pt (REdI Print Caption)
  TABLE_TEXT: 20, // 10pt
  FOOTER: 18, // 9pt
} as const;

/**
 * Line spacing values (in twips - twentieths of a point)
 * 1.5 line spacing for 12pt font = 360 twips (18pt)
 */
export const LINE_SPACING = {
  SINGLE: 240, // 1.0 spacing
  ONE_POINT_FIFTEEN: 276, // 1.15 spacing
  ONE_POINT_FIVE: 360, // 1.5 spacing
  DOUBLE: 480, // 2.0 spacing
} as const;

/**
 * Spacing before/after paragraphs (in twips)
 */
export const PARAGRAPH_SPACING = {
  BEFORE_HEADING1: 400,
  AFTER_HEADING1: 200,
  BEFORE_HEADING2: 300,
  AFTER_HEADING2: 150,
  BEFORE_HEADING3: 240,
  AFTER_HEADING3: 120,
  BEFORE_NORMAL: 0,
  AFTER_NORMAL: 200,
  BEFORE_LIST: 0,
  AFTER_LIST: 120,
} as const;

/**
 * Page margin values in twips (1 inch = 1440 twips)
 */
export const PAGE_MARGINS = {
  TOP: convertInchesToTwip(1),
  RIGHT: convertInchesToTwip(1),
  BOTTOM: convertInchesToTwip(1),
  LEFT: convertInchesToTwip(1),
  HEADER: convertInchesToTwip(0.5),
  FOOTER: convertInchesToTwip(0.5),
  GUTTER: 0,
} as const;

/**
 * A4 page dimensions in twips
 */
export const A4_PAGE_SIZE = {
  WIDTH: 11906, // 210mm
  HEIGHT: 16838, // 297mm
} as const;

/**
 * Colors for document elements
 * Based on REdI Brand Guidelines color palette
 */
export const COLORS = {
  // Primary brand colors
  CORAL: 'E55B64', // REdI Coral - primary brand, highlights
  NAVY: '1B3A5F', // REdI Navy - headers, primary text
  TEAL: '2B9E9E', // REdI Teal - accents, interactive elements

  // Secondary brand colors
  LIGHT_TEAL: '8DD4D4', // Backgrounds, secondary elements
  LIME: 'B8CC26', // Event branding, callouts
  SKY: '5DADE2', // Information, links
  YELLOW: 'F4D03F', // Warnings, highlights

  // Semantic colors
  PRIMARY: '333333', // Dark gray - body text
  HEADING: '1B3A5F', // REdI Navy - headings
  LINK: '5DADE2', // REdI Sky Blue - hyperlinks
  BORDER: 'CCCCCC', // Light gray borders
  TABLE_HEADER_BG: '1B3A5F', // REdI Navy - table headers
  TABLE_HEADER_TEXT: 'FFFFFF', // White text on navy headers
  TABLE_ALT_ROW_BG: 'F5F5F5', // Light gray - alternating rows
  CAPTION: '666666', // Medium gray - captions
  WHITE: 'FFFFFF', // White
  BLACK: '000000', // Black

  // Clinical semantic colors
  ALERT_RED: 'DC3545', // Critical alerts
  WARNING_AMBER: 'FFC107', // Caution
  SUCCESS_GREEN: '28A745', // Positive actions
  INFO_BLUE: '17A2B8', // Informational
} as const;

// ============================================================================
// Document Styles
// ============================================================================

/**
 * Default document styles configuration for DOCX generation
 *
 * Includes styles for:
 * - Normal text
 * - Headings (1-3)
 * - Caption
 * - Table text
 * - List paragraphs
 *
 * @returns IStylesOptions configuration object for docx Document
 */
export function getDocumentStyles(): IStylesOptions {
  return {
    default: {
      document: {
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.NORMAL,
          color: COLORS.PRIMARY,
        },
        paragraph: {
          spacing: {
            after: PARAGRAPH_SPACING.AFTER_NORMAL,
            line: LINE_SPACING.ONE_POINT_FIVE,
            lineRule: LineRuleType.AUTO,
          },
        },
      },
      heading1: {
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.HEADING1,
          bold: true,
          color: COLORS.HEADING,
        },
        paragraph: {
          spacing: {
            before: PARAGRAPH_SPACING.BEFORE_HEADING1,
            after: PARAGRAPH_SPACING.AFTER_HEADING1,
          },
          outlineLevel: 0,
        },
      },
      heading2: {
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.HEADING2,
          bold: true,
          color: COLORS.HEADING,
        },
        paragraph: {
          spacing: {
            before: PARAGRAPH_SPACING.BEFORE_HEADING2,
            after: PARAGRAPH_SPACING.AFTER_HEADING2,
          },
          outlineLevel: 1,
        },
      },
      heading3: {
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.HEADING3,
          bold: true,
          color: COLORS.HEADING,
        },
        paragraph: {
          spacing: {
            before: PARAGRAPH_SPACING.BEFORE_HEADING3,
            after: PARAGRAPH_SPACING.AFTER_HEADING3,
          },
          outlineLevel: 2,
        },
      },
      hyperlink: {
        run: {
          color: COLORS.LINK,
          underline: {
            type: UnderlineType.SINGLE,
          },
        },
      },
    },
    paragraphStyles: [
      {
        id: 'Normal',
        name: 'Normal',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.NORMAL,
        },
        paragraph: {
          spacing: {
            after: PARAGRAPH_SPACING.AFTER_NORMAL,
            line: LINE_SPACING.ONE_POINT_FIVE,
            lineRule: LineRuleType.AUTO,
          },
        },
      },
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.HEADING1,
          bold: true,
          color: COLORS.HEADING,
        },
        paragraph: {
          spacing: {
            before: PARAGRAPH_SPACING.BEFORE_HEADING1,
            after: PARAGRAPH_SPACING.AFTER_HEADING1,
          },
          outlineLevel: 0,
        },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.HEADING2,
          bold: true,
          color: COLORS.HEADING,
        },
        paragraph: {
          spacing: {
            before: PARAGRAPH_SPACING.BEFORE_HEADING2,
            after: PARAGRAPH_SPACING.AFTER_HEADING2,
          },
          outlineLevel: 1,
        },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.HEADING3,
          bold: true,
          color: COLORS.HEADING,
        },
        paragraph: {
          spacing: {
            before: PARAGRAPH_SPACING.BEFORE_HEADING3,
            after: PARAGRAPH_SPACING.AFTER_HEADING3,
          },
          outlineLevel: 2,
        },
      },
      {
        id: 'Caption',
        name: 'Caption',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.CAPTION,
          italics: true,
          color: COLORS.CAPTION,
        },
        paragraph: {
          spacing: {
            before: 120,
            after: 240,
          },
        },
      },
      {
        id: 'TableText',
        name: 'Table Text',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.TABLE_TEXT,
        },
        paragraph: {
          spacing: {
            before: 60,
            after: 60,
            line: LINE_SPACING.SINGLE,
            lineRule: LineRuleType.AUTO,
          },
        },
      },
      {
        id: 'TableHeader',
        name: 'Table Header',
        basedOn: 'TableText',
        next: 'TableText',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.TABLE_TEXT,
          bold: true,
          color: COLORS.TABLE_HEADER_TEXT,
        },
        paragraph: {
          spacing: {
            before: 80,
            after: 80,
            line: LINE_SPACING.SINGLE,
            lineRule: LineRuleType.AUTO,
          },
        },
      },
      {
        id: 'ListParagraph',
        name: 'List Paragraph',
        basedOn: 'Normal',
        next: 'ListParagraph',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.NORMAL,
        },
        paragraph: {
          spacing: {
            before: PARAGRAPH_SPACING.BEFORE_LIST,
            after: PARAGRAPH_SPACING.AFTER_LIST,
            line: LINE_SPACING.ONE_POINT_FIVE,
            lineRule: LineRuleType.AUTO,
          },
          indent: {
            left: convertInchesToTwip(0.5),
          },
        },
      },
      {
        id: 'TitlePageTitle',
        name: 'Title Page Title',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.DISPLAY_FONT,
          size: FONT_SIZES.TITLE,
          bold: true,
          color: COLORS.NAVY,
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 0,
            after: 400,
          },
        },
      },
      {
        id: 'TitlePageSubtitle',
        name: 'Title Page Subtitle',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.HEADING2,
          color: COLORS.CORAL,
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 0,
            after: 200,
          },
        },
      },
      {
        id: 'Footer',
        name: 'Footer',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: FONT_CONFIG.PRIMARY_FONT,
          size: FONT_SIZES.FOOTER,
          color: COLORS.CAPTION,
        },
        paragraph: {
          spacing: {
            before: 0,
            after: 0,
          },
        },
      },
    ],
  };
}

// ============================================================================
// Page Properties
// ============================================================================

/**
 * Get A4 page properties with standard margins
 *
 * @returns ISectionPropertiesOptions for document sections
 */
export function getPageProperties(): ISectionPropertiesOptions {
  return {
    page: {
      size: {
        width: A4_PAGE_SIZE.WIDTH,
        height: A4_PAGE_SIZE.HEIGHT,
      },
      margin: {
        top: PAGE_MARGINS.TOP,
        right: PAGE_MARGINS.RIGHT,
        bottom: PAGE_MARGINS.BOTTOM,
        left: PAGE_MARGINS.LEFT,
        header: PAGE_MARGINS.HEADER,
        footer: PAGE_MARGINS.FOOTER,
        gutter: PAGE_MARGINS.GUTTER,
      },
    },
  };
}

/**
 * Get page properties with custom margins
 *
 * @param margins - Custom margin values in inches
 * @returns ISectionPropertiesOptions for document sections
 */
export function getCustomPageProperties(margins: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}): ISectionPropertiesOptions {
  return {
    page: {
      size: {
        width: A4_PAGE_SIZE.WIDTH,
        height: A4_PAGE_SIZE.HEIGHT,
      },
      margin: {
        top: margins.top !== undefined ? convertInchesToTwip(margins.top) : PAGE_MARGINS.TOP,
        right: margins.right !== undefined ? convertInchesToTwip(margins.right) : PAGE_MARGINS.RIGHT,
        bottom: margins.bottom !== undefined ? convertInchesToTwip(margins.bottom) : PAGE_MARGINS.BOTTOM,
        left: margins.left !== undefined ? convertInchesToTwip(margins.left) : PAGE_MARGINS.LEFT,
        header: PAGE_MARGINS.HEADER,
        footer: PAGE_MARGINS.FOOTER,
        gutter: PAGE_MARGINS.GUTTER,
      },
    },
  };
}

// ============================================================================
// Table Styling
// ============================================================================

/**
 * Standard table border configuration
 */
export function getTableBorders(): ITableBordersOptions {
  const border = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: COLORS.BORDER,
  };

  return {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };
}

/**
 * Table borders with no internal lines (for synopsis tables)
 */
export function getTableBordersOutlineOnly(): ITableBordersOptions {
  const border = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: COLORS.BORDER,
  };

  const noBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: 'FFFFFF',
  };

  return {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: noBorder,
    insideVertical: noBorder,
  };
}

/**
 * No borders (for layout tables)
 */
export function getTableBordersNone(): ITableBordersOptions {
  const noBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: 'FFFFFF',
  };

  return {
    top: noBorder,
    bottom: noBorder,
    left: noBorder,
    right: noBorder,
    insideHorizontal: noBorder,
    insideVertical: noBorder,
  };
}

/**
 * Table cell shading for headers
 */
export const TABLE_HEADER_SHADING = {
  fill: COLORS.TABLE_HEADER_BG,
  type: ShadingType.CLEAR,
  color: 'auto',
} as const;

/**
 * Table cell shading for alternating rows
 */
export const TABLE_ALT_ROW_SHADING = {
  fill: COLORS.TABLE_ALT_ROW_BG,
  type: ShadingType.CLEAR,
  color: 'auto',
} as const;

// ============================================================================
// Numbering (Lists)
// ============================================================================

/**
 * Standard bullet list numbering definition
 */
export function getBulletListNumbering(): ILevelsOptions[] {
  return [
    {
      level: 0,
      format: LevelFormat.BULLET,
      text: '\u2022', // Bullet
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: {
            left: convertInchesToTwip(0.5),
            hanging: convertInchesToTwip(0.25),
          },
        },
      },
    },
    {
      level: 1,
      format: LevelFormat.BULLET,
      text: '\u25E6', // White bullet
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: {
            left: convertInchesToTwip(1),
            hanging: convertInchesToTwip(0.25),
          },
        },
      },
    },
    {
      level: 2,
      format: LevelFormat.BULLET,
      text: '\u25AA', // Small black square
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: {
            left: convertInchesToTwip(1.5),
            hanging: convertInchesToTwip(0.25),
          },
        },
      },
    },
  ];
}

/**
 * Standard numbered list numbering definition
 */
export function getNumberedListNumbering(): ILevelsOptions[] {
  return [
    {
      level: 0,
      format: LevelFormat.DECIMAL,
      text: '%1.',
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: {
            left: convertInchesToTwip(0.5),
            hanging: convertInchesToTwip(0.25),
          },
        },
      },
    },
    {
      level: 1,
      format: LevelFormat.LOWER_LETTER,
      text: '%2.',
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: {
            left: convertInchesToTwip(1),
            hanging: convertInchesToTwip(0.25),
          },
        },
      },
    },
    {
      level: 2,
      format: LevelFormat.LOWER_ROMAN,
      text: '%3.',
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: {
            left: convertInchesToTwip(1.5),
            hanging: convertInchesToTwip(0.25),
          },
        },
      },
    },
  ];
}

// ============================================================================
// Exported Types
// ============================================================================

export type FontConfig = typeof FONT_CONFIG;
export type FontSizes = typeof FONT_SIZES;
export type LineSpacingValues = typeof LINE_SPACING;
export type ParagraphSpacingValues = typeof PARAGRAPH_SPACING;
export type PageMarginsValues = typeof PAGE_MARGINS;
export type PageSizeValues = typeof A4_PAGE_SIZE;
export type ColorsConfig = typeof COLORS;
