/**
 * QI Research Pipeline - Citation Formatting Utilities
 *
 * This module provides comprehensive citation formatting functions for
 * various citation styles (Vancouver, APA) and export formats (BibTeX, RIS).
 * Designed for academic and research document generation.
 *
 * @module documents/citations
 */

import type { ProcessedArticle, Citation, CitationStyle } from '../types/index.js';

// ============================================================================
// Journal Abbreviation Mappings
// ============================================================================

/**
 * Common medical journal abbreviations following NLM/ISO standards
 */
const JOURNAL_ABBREVIATIONS: Record<string, string> = {
  // Emergency Medicine
  'Annals of Emergency Medicine': 'Ann Emerg Med',
  'Academic Emergency Medicine': 'Acad Emerg Med',
  'Emergency Medicine Journal': 'Emerg Med J',
  'Journal of Emergency Medicine': 'J Emerg Med',
  'American Journal of Emergency Medicine': 'Am J Emerg Med',
  'Emergency Medicine Australasia': 'Emerg Med Australas',
  'European Journal of Emergency Medicine': 'Eur J Emerg Med',
  'Resuscitation': 'Resuscitation',

  // Critical Care
  'Critical Care Medicine': 'Crit Care Med',
  'Intensive Care Medicine': 'Intensive Care Med',
  'Critical Care': 'Crit Care',
  'Journal of Critical Care': 'J Crit Care',
  'Chest': 'Chest',

  // General Medicine
  'New England Journal of Medicine': 'N Engl J Med',
  'JAMA': 'JAMA',
  'The Lancet': 'Lancet',
  'British Medical Journal': 'BMJ',
  'BMJ': 'BMJ',
  'Annals of Internal Medicine': 'Ann Intern Med',
  'JAMA Internal Medicine': 'JAMA Intern Med',
  'The Lancet Respiratory Medicine': 'Lancet Respir Med',

  // Infectious Disease
  'Clinical Infectious Diseases': 'Clin Infect Dis',
  'Journal of Infectious Diseases': 'J Infect Dis',
  'Lancet Infectious Diseases': 'Lancet Infect Dis',

  // Quality Improvement
  'BMJ Quality & Safety': 'BMJ Qual Saf',
  'Quality and Safety in Health Care': 'Qual Saf Health Care',
  'Journal for Healthcare Quality': 'J Healthc Qual',
  'Implementation Science': 'Implement Sci',

  // Nursing
  'Journal of Emergency Nursing': 'J Emerg Nurs',
  'Journal of Clinical Nursing': 'J Clin Nurs',
  'International Emergency Nursing': 'Int Emerg Nurs',

  // Pediatrics
  'Pediatrics': 'Pediatrics',
  'Pediatric Emergency Care': 'Pediatr Emerg Care',
  'Journal of Pediatrics': 'J Pediatr',
  'Archives of Disease in Childhood': 'Arch Dis Child',

  // Surgery
  'Annals of Surgery': 'Ann Surg',
  'JAMA Surgery': 'JAMA Surg',
  'British Journal of Surgery': 'Br J Surg',

  // Anesthesia
  'Anesthesiology': 'Anesthesiology',
  'British Journal of Anaesthesia': 'Br J Anaesth',
  'Anaesthesia': 'Anaesthesia',

  // Trauma
  'Journal of Trauma and Acute Care Surgery': 'J Trauma Acute Care Surg',
  'Injury': 'Injury',

  // Cardiology
  'Circulation': 'Circulation',
  'Journal of the American College of Cardiology': 'J Am Coll Cardiol',
  'European Heart Journal': 'Eur Heart J',
  'Heart': 'Heart',

  // Research Methods
  'Trials': 'Trials',
  'BMC Medical Research Methodology': 'BMC Med Res Methodol',
  'Systematic Reviews': 'Syst Rev',
  'Cochrane Database of Systematic Reviews': 'Cochrane Database Syst Rev',

  // Medical Education
  'Medical Education': 'Med Educ',
  'Academic Medicine': 'Acad Med',

  // Diagnostic
  'Diagnostic and Interventional Imaging': 'Diagn Interv Imaging',
  'Radiology': 'Radiology',

  // Public Health
  'American Journal of Public Health': 'Am J Public Health',
  'International Journal of Epidemiology': 'Int J Epidemiol',

  // PLoS
  'PLoS ONE': 'PLoS One',
  'PLoS Medicine': 'PLoS Med',

  // Australian
  'Medical Journal of Australia': 'Med J Aust',
  'Australian Critical Care': 'Aust Crit Care',
  'Australasian Emergency Nursing Journal': 'Australas Emerg Nurs J',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Abbreviates a journal name using standard NLM/ISO abbreviations
 *
 * @param journal - Full journal name
 * @returns Abbreviated journal name or original if no abbreviation found
 *
 * @example
 * ```typescript
 * abbreviateJournalName('Annals of Emergency Medicine');
 * // Returns: 'Ann Emerg Med'
 *
 * abbreviateJournalName('Unknown Journal');
 * // Returns: 'Unknown Journal'
 * ```
 */
export function abbreviateJournalName(journal: string): string {
  if (!journal || typeof journal !== 'string') {
    return '';
  }

  // Direct lookup
  if (JOURNAL_ABBREVIATIONS[journal]) {
    return JOURNAL_ABBREVIATIONS[journal];
  }

  // Case-insensitive lookup
  const lowerJournal = journal.toLowerCase();
  for (const [fullName, abbrev] of Object.entries(JOURNAL_ABBREVIATIONS)) {
    if (fullName.toLowerCase() === lowerJournal) {
      return abbrev;
    }
  }

  // Handle "The" prefix
  if (journal.startsWith('The ')) {
    const withoutThe = journal.substring(4);
    if (JOURNAL_ABBREVIATIONS[withoutThe]) {
      return JOURNAL_ABBREVIATIONS[withoutThe];
    }
  }

  // Return original if no abbreviation found
  return journal;
}

/**
 * Formats author name for Vancouver style (LastName Initials)
 *
 * @param author - Author name string (may be "LastName FirstName" or "FirstName LastName" or "LastName, FirstName")
 * @returns Formatted author name for Vancouver style
 */
function formatAuthorVancouver(author: string): string {
  if (!author || typeof author !== 'string') {
    return '';
  }

  const trimmed = author.trim();

  // Already in "LastName Initials" format (e.g., "Smith JA")
  if (/^[A-Z][a-z]+\s+[A-Z]+$/.test(trimmed)) {
    return trimmed;
  }

  // Handle "LastName, FirstName" format
  if (trimmed.includes(',')) {
    const splitParts = trimmed.split(',').map((s) => s.trim());
    const lastName = splitParts[0] ?? '';
    const rest = splitParts[1];
    if (rest) {
      const initials = rest
        .split(/\s+/)
        .map((name) => name.charAt(0).toUpperCase())
        .join('');
      return `${lastName} ${initials}`;
    }
    return lastName;
  }

  // Handle "FirstName LastName" format
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1];
    const initials = parts
      .slice(0, -1)
      .map((name) => name.charAt(0).toUpperCase())
      .join('');
    return `${lastName} ${initials}`;
  }

  return trimmed;
}

/**
 * Formats author name for APA style (LastName, F. M.)
 *
 * @param author - Author name string
 * @returns Formatted author name for APA style
 */
function formatAuthorAPA(author: string): string {
  if (!author || typeof author !== 'string') {
    return '';
  }

  const trimmed = author.trim();

  // Handle "LastName, FirstName MiddleName" format
  if (trimmed.includes(',')) {
    const splitParts = trimmed.split(',').map((s) => s.trim());
    const lastName = splitParts[0] ?? '';
    const rest = splitParts[1];
    if (rest) {
      const initials = rest
        .split(/\s+/)
        .map((name) => `${name.charAt(0).toUpperCase()}.`)
        .join(' ');
      return `${lastName}, ${initials}`;
    }
    return lastName;
  }

  // Handle "FirstName MiddleName LastName" format
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1];
    const initials = parts
      .slice(0, -1)
      .map((name) => `${name.charAt(0).toUpperCase()}.`)
      .join(' ');
    return `${lastName}, ${initials}`;
  }

  return trimmed;
}

/**
 * Formats the author list according to the citation style rules
 *
 * @param authors - Array of author names
 * @param style - Citation style (VANCOUVER or APA)
 * @returns Formatted author string
 */
function formatAuthorList(authors: string[], style: CitationStyle): string {
  if (!authors || authors.length === 0) {
    return '';
  }

  const formatFn = style === 'VANCOUVER' ? formatAuthorVancouver : formatAuthorAPA;

  if (style === 'VANCOUVER') {
    // Vancouver: If >6 authors, first 6 then "et al."
    if (authors.length > 6) {
      const formatted = authors.slice(0, 6).map(formatFn);
      return `${formatted.join(', ')}, et al`;
    }
    return authors.map(formatFn).join(', ');
  } else {
    // APA: Different rules
    // 1 author: Author, A. A.
    // 2 authors: Author, A. A., & Author, B. B.
    // 3-20 authors: list all with & before last
    // 21+ authors: first 19, ..., last author
    const firstAuthor = authors[0];
    const secondAuthor = authors[1];

    if (authors.length === 1 && firstAuthor) {
      return formatFn(firstAuthor);
    } else if (authors.length === 2 && firstAuthor && secondAuthor) {
      return `${formatFn(firstAuthor)}, & ${formatFn(secondAuthor)}`;
    } else if (authors.length <= 20) {
      const formatted = authors.map(formatFn);
      const lastAuthor = formatted.pop() ?? '';
      return `${formatted.join(', ')}, & ${lastAuthor}`;
    } else {
      // 21+ authors: first 19, ..., last
      const first19 = authors.slice(0, 19).map(formatFn);
      const lastAuthorName = authors[authors.length - 1];
      const lastAuthor = lastAuthorName ? formatFn(lastAuthorName) : '';
      return `${first19.join(', ')}, ... ${lastAuthor}`;
    }
  }
}

/**
 * Escapes special characters for BibTeX format
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeBibTeX(text: string): string {
  if (!text) {return '';}

  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Generates a BibTeX key from article information
 *
 * @param article - Processed article
 * @returns BibTeX key string
 */
function generateBibTeXKey(article: ProcessedArticle): string {
  const firstAuthor = article.authors[0] ?? 'Unknown';
  const lastNamePart = firstAuthor.split(/[,\s]+/)[0] ?? 'unknown';
  const lastName = lastNamePart.toLowerCase().replace(/[^a-z]/g, '');
  const year = article.year || 'unknown';
  const titleFirstWord = article.title.split(/\s+/)[0] ?? 'article';
  const titleWord = titleFirstWord.toLowerCase().replace(/[^a-z]/g, '');

  return `${lastName}${year}${titleWord}`;
}

// ============================================================================
// Citation Formatting Functions
// ============================================================================

/**
 * Formats a citation in Vancouver style
 *
 * Vancouver format: Authors. Title. Journal. Year;Volume(Issue):Pages. DOI
 * - If >6 authors: First 6, et al.
 * - Journal names are abbreviated
 *
 * @param article - Processed article to format
 * @returns Formatted Vancouver citation string
 *
 * @example
 * ```typescript
 * const citation = formatVancouverCitation(article);
 * // Returns: "Smith JA, Jones BM, Williams CD. Machine Learning for Early Sepsis Detection. Ann Emerg Med. 2025;85(1):45-56. doi: 10.1016/j.annemergmed.2025.01.001"
 * ```
 */
export function formatVancouverCitation(article: ProcessedArticle): string {
  const parts: string[] = [];

  // Authors
  const authorString = formatAuthorList(article.authors, 'VANCOUVER');
  if (authorString) {
    parts.push(authorString);
  }

  // Title (with period)
  if (article.title) {
    // Remove trailing period if present, we'll add our own
    const title = article.title.replace(/\.$/, '');
    parts.push(title);
  }

  // Journal, Year, Volume, Issue, Pages
  const journalParts: string[] = [];

  // Abbreviated journal name
  const journal = abbreviateJournalName(article.journal);
  if (journal) {
    journalParts.push(journal);
  }

  // Year
  if (article.year) {
    journalParts.push(`${article.year}`);
  }

  // Volume(Issue):Pages
  let volumeIssuePage = '';
  if (article.volume) {
    volumeIssuePage = article.volume;
    if (article.issue) {
      volumeIssuePage += `(${article.issue})`;
    }
    if (article.pages) {
      volumeIssuePage += `:${article.pages}`;
    }
  } else if (article.pages) {
    volumeIssuePage = article.pages;
  }

  // Combine journal info
  if (journalParts.length > 0) {
    let journalInfo = journalParts[0] ?? ''; // Journal name
    const yearPart = journalParts[1];
    if (journalParts.length > 1 && yearPart) {
      journalInfo += `. ${yearPart}`; // Year
    }
    if (volumeIssuePage) {
      journalInfo += `;${volumeIssuePage}`;
    }
    parts.push(journalInfo);
  }

  // DOI
  if (article.doi) {
    parts.push(`doi: ${article.doi}`);
  }

  // Join with ". " and ensure ending period
  let citation = parts.join('. ');
  if (!citation.endsWith('.')) {
    citation += '.';
  }

  return citation;
}

/**
 * Formats a citation in APA style (7th edition)
 *
 * APA format: Authors (Year). Title. Journal, Volume(Issue), Pages. DOI
 *
 * @param article - Processed article to format
 * @returns Formatted APA citation string
 *
 * @example
 * ```typescript
 * const citation = formatAPACitation(article);
 * // Returns: "Smith, J. A., Jones, B. M., & Williams, C. D. (2025). Machine Learning for Early Sepsis Detection. Annals of Emergency Medicine, 85(1), 45-56. https://doi.org/10.1016/j.annemergmed.2025.01.001"
 * ```
 */
export function formatAPACitation(article: ProcessedArticle): string {
  const parts: string[] = [];

  // Authors
  const authorString = formatAuthorList(article.authors, 'APA');
  if (authorString) {
    parts.push(authorString);
  }

  // Year in parentheses
  if (article.year) {
    parts.push(`(${article.year})`);
  }

  // Title (sentence case, italicized for articles - indicated here by plain text)
  if (article.title) {
    // Remove trailing period if present
    const title = article.title.replace(/\.$/, '');
    parts.push(title);
  }

  // Journal (italicized - indicated here), Volume(Issue), Pages
  const journalParts: string[] = [];

  // Full journal name (APA uses full names)
  if (article.journal) {
    let journalInfo = article.journal;

    // Add volume (italicized in APA, with journal)
    if (article.volume) {
      journalInfo += `, ${article.volume}`;
      if (article.issue) {
        journalInfo += `(${article.issue})`;
      }
    }

    journalParts.push(journalInfo);

    // Pages
    if (article.pages) {
      journalParts.push(article.pages);
    }
  }

  if (journalParts.length > 0) {
    parts.push(journalParts.join(', '));
  }

  // DOI as URL
  if (article.doi) {
    const doiUrl = article.doi.startsWith('http')
      ? article.doi
      : `https://doi.org/${article.doi}`;
    parts.push(doiUrl);
  }

  // Join parts appropriately
  // Format: Author (Year). Title. Journal, Vol(Issue), Pages. DOI
  let citation = '';
  if (parts.length >= 2) {
    citation = `${parts[0]} ${parts[1]}`; // Author (Year)
    if (parts.length > 2) {
      citation += `. ${parts.slice(2).join('. ')}`;
    }
  } else {
    citation = parts.join('. ');
  }

  if (!citation.endsWith('.') && !citation.match(/https?:\/\/[^\s]+$/)) {
    citation += '.';
  }

  return citation;
}

/**
 * Formats a list of citations in the specified style
 *
 * @param articles - Array of processed articles
 * @param style - Citation style to use
 * @returns Array of formatted citation strings
 *
 * @example
 * ```typescript
 * const citations = formatCitationList(articles, 'VANCOUVER');
 * // Returns array of Vancouver-formatted citations
 * ```
 */
export function formatCitationList(
  articles: ProcessedArticle[],
  style: CitationStyle
): string[] {
  if (!articles || articles.length === 0) {
    return [];
  }

  const formatFn = style === 'APA' ? formatAPACitation : formatVancouverCitation;

  return articles.map((article) => formatFn(article));
}

/**
 * Generates BibTeX entries for a collection of articles
 *
 * @param articles - Array of processed articles
 * @returns BibTeX formatted string
 *
 * @example
 * ```typescript
 * const bibtex = generateBibTeX(articles);
 * // Returns:
 * // @article{smith2025machine,
 * //   author = {Smith, John A. and Jones, Bob M.},
 * //   title = {Machine Learning for Early Sepsis Detection},
 * //   journal = {Annals of Emergency Medicine},
 * //   year = {2025},
 * //   volume = {85},
 * //   number = {1},
 * //   pages = {45--56},
 * //   doi = {10.1016/j.annemergmed.2025.01.001}
 * // }
 * ```
 */
export function generateBibTeX(articles: ProcessedArticle[]): string {
  if (!articles || articles.length === 0) {
    return '';
  }

  const entries = articles.map((article) => {
    const key = generateBibTeXKey(article);
    const lines: string[] = [];

    lines.push(`@article{${key},`);

    // Author field: "LastName, FirstName and LastName, FirstName"
    if (article.authors && article.authors.length > 0) {
      const bibtexAuthors = article.authors
        .map((author: string) => {
          const trimmed = author.trim();
          if (trimmed.includes(',')) {
            return trimmed; // Already in LastName, FirstName format
          }
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 2) {
            const lastName = parts[parts.length - 1] ?? '';
            const firstName = parts.slice(0, -1).join(' ');
            return `${lastName}, ${firstName}`;
          }
          return trimmed;
        })
        .join(' and ');
      lines.push(`  author = {${escapeBibTeX(bibtexAuthors)}},`);
    }

    // Title
    if (article.title) {
      lines.push(`  title = {${escapeBibTeX(article.title)}},`);
    }

    // Journal
    if (article.journal) {
      lines.push(`  journal = {${escapeBibTeX(article.journal)}},`);
    }

    // Year
    if (article.year) {
      lines.push(`  year = {${article.year}},`);
    }

    // Volume
    if (article.volume) {
      lines.push(`  volume = {${article.volume}},`);
    }

    // Issue/Number
    if (article.issue) {
      lines.push(`  number = {${article.issue}},`);
    }

    // Pages (BibTeX uses -- for page ranges)
    if (article.pages) {
      const pages = article.pages.replace(/-/g, '--');
      lines.push(`  pages = {${pages}},`);
    }

    // DOI
    if (article.doi) {
      lines.push(`  doi = {${article.doi}},`);
    }

    // PMID as note
    if (article.pmid) {
      lines.push(`  note = {PMID: ${article.pmid}},`);
    }

    // Abstract
    if (article.abstract) {
      lines.push(`  abstract = {${escapeBibTeX(article.abstract)}},`);
    }

    // Remove trailing comma from last field
    const lastIndex = lines.length - 1;
    const lastLine = lines[lastIndex];
    if (lastLine && lastLine.endsWith(',')) {
      lines[lastIndex] = lastLine.slice(0, -1);
    }

    lines.push('}');

    return lines.join('\n');
  });

  return entries.join('\n\n');
}

/**
 * Generates RIS (Research Information Systems) format entries for articles
 *
 * RIS is widely supported by reference management software like EndNote,
 * Mendeley, and Zotero.
 *
 * @param articles - Array of processed articles
 * @returns RIS formatted string
 *
 * @example
 * ```typescript
 * const ris = generateRIS(articles);
 * // Returns:
 * // TY  - JOUR
 * // AU  - Smith, John A.
 * // AU  - Jones, Bob M.
 * // TI  - Machine Learning for Early Sepsis Detection
 * // JO  - Annals of Emergency Medicine
 * // PY  - 2025
 * // VL  - 85
 * // IS  - 1
 * // SP  - 45
 * // EP  - 56
 * // DO  - 10.1016/j.annemergmed.2025.01.001
 * // ER  -
 * ```
 */
export function generateRIS(articles: ProcessedArticle[]): string {
  if (!articles || articles.length === 0) {
    return '';
  }

  const entries = articles.map((article) => {
    const lines: string[] = [];

    // Type (Journal Article)
    lines.push('TY  - JOUR');

    // Authors (one per line)
    if (article.authors && article.authors.length > 0) {
      article.authors.forEach((author: string) => {
        const trimmed = author.trim();
        let formattedAuthor: string;

        if (trimmed.includes(',')) {
          formattedAuthor = trimmed;
        } else {
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 2) {
            const lastName = parts[parts.length - 1] ?? '';
            const firstName = parts.slice(0, -1).join(' ');
            formattedAuthor = `${lastName}, ${firstName}`;
          } else {
            formattedAuthor = trimmed;
          }
        }
        lines.push(`AU  - ${formattedAuthor}`);
      });
    }

    // Title
    if (article.title) {
      lines.push(`TI  - ${article.title}`);
    }

    // Journal
    if (article.journal) {
      lines.push(`JO  - ${article.journal}`);
      // Also add abbreviated journal
      const abbrev = abbreviateJournalName(article.journal);
      if (abbrev !== article.journal) {
        lines.push(`JA  - ${abbrev}`);
      }
    }

    // Year
    if (article.year) {
      lines.push(`PY  - ${article.year}`);
    }

    // Volume
    if (article.volume) {
      lines.push(`VL  - ${article.volume}`);
    }

    // Issue
    if (article.issue) {
      lines.push(`IS  - ${article.issue}`);
    }

    // Pages (split into start/end)
    if (article.pages) {
      const pageParts = article.pages.split(/[-–]/);
      const startPage = pageParts[0];
      const endPage = pageParts[1];
      if (startPage) {
        lines.push(`SP  - ${startPage.trim()}`);
      }
      if (endPage) {
        lines.push(`EP  - ${endPage.trim()}`);
      }
    }

    // DOI
    if (article.doi) {
      lines.push(`DO  - ${article.doi}`);
    }

    // PMID
    if (article.pmid) {
      lines.push(`AN  - ${article.pmid}`);
    }

    // Abstract
    if (article.abstract) {
      lines.push(`AB  - ${article.abstract}`);
    }

    // Keywords from key findings
    if (article.key_findings && article.key_findings.length > 0) {
      article.key_findings.forEach((finding: string) => {
        lines.push(`KW  - ${finding}`);
      });
    }

    // End of record
    lines.push('ER  - ');

    return lines.join('\n');
  });

  return entries.join('\n\n');
}

/**
 * Formats an in-text citation for a given article and reference number
 *
 * @param article - Processed article
 * @param index - Reference number (1-based)
 * @returns Formatted in-text citation string
 *
 * @example
 * ```typescript
 * // Vancouver style (numeric)
 * formatInTextCitation(article, 1);
 * // Returns: "[1]"
 *
 * // Can be used in text as: "Recent studies [1] have shown..."
 * ```
 */
export function formatInTextCitation(article: ProcessedArticle, index: number): string {
  // Vancouver style uses numeric citations
  return `[${index}]`;
}

/**
 * Formats an in-text citation in APA style (Author, Year)
 *
 * @param article - Processed article
 * @returns Formatted APA in-text citation string
 *
 * @example
 * ```typescript
 * formatAPAInTextCitation(article);
 * // Returns: "(Smith et al., 2025)" for 3+ authors
 * // Returns: "(Smith & Jones, 2025)" for 2 authors
 * // Returns: "(Smith, 2025)" for 1 author
 * ```
 */
export function formatAPAInTextCitation(article: ProcessedArticle): string {
  if (!article.authors || article.authors.length === 0) {
    return `(${article.year || 'n.d.'})`;
  }

  // Extract first author's last name
  const firstAuthor = article.authors[0];
  if (!firstAuthor) {
    return `(${article.year || 'n.d.'})`;
  }

  let lastName: string;

  if (firstAuthor.includes(',')) {
    lastName = firstAuthor.split(',')[0]?.trim() ?? '';
  } else {
    const parts = firstAuthor.split(/\s+/);
    lastName = parts[parts.length - 1] ?? '';
  }

  const year = article.year || 'n.d.';

  if (article.authors.length === 1) {
    return `(${lastName}, ${year})`;
  } else if (article.authors.length === 2) {
    // Get second author's last name
    const secondAuthor = article.authors[1];
    if (!secondAuthor) {
      return `(${lastName}, ${year})`;
    }

    let secondLastName: string;

    if (secondAuthor.includes(',')) {
      secondLastName = secondAuthor.split(',')[0]?.trim() ?? '';
    } else {
      const parts = secondAuthor.split(/\s+/);
      secondLastName = parts[parts.length - 1] ?? '';
    }

    return `(${lastName} & ${secondLastName}, ${year})`;
  } else {
    return `(${lastName} et al., ${year})`;
  }
}

// ============================================================================
// Citation Object Generation
// ============================================================================

/**
 * Creates a full Citation object from a ProcessedArticle
 *
 * @param article - Processed article
 * @param index - Reference number (1-based)
 * @param style - Citation style to use
 * @returns Complete Citation object
 *
 * @example
 * ```typescript
 * const citation = createCitation(article, 1, 'VANCOUVER');
 * // Returns Citation object with all formats
 * ```
 */
export function createCitation(
  article: ProcessedArticle,
  index: number,
  style: CitationStyle
): Citation {
  const formatFn = style === 'APA' ? formatAPACitation : formatVancouverCitation;
  const inTextFn = style === 'APA' ? formatAPAInTextCitation : formatInTextCitation;

  return {
    id: `cite_${index}`,
    article_id: article.pmid || article.doi || `article_${index}`,
    citation_number: index,
    formatted_citation: formatFn(article),
    citation_style: style,
    pmid: article.pmid,
    doi: article.doi,
    formattedCitation: formatFn(article),
    style: style,
    bibtex: generateBibTeX([article]),
    ris: generateRIS([article]),
    inTextCitation: inTextFn(article, index),
    referenceNumber: index,
  };
}

/**
 * Creates Citation objects for a collection of articles
 *
 * @param articles - Array of processed articles
 * @param style - Citation style to use
 * @returns Array of Citation objects
 *
 * @example
 * ```typescript
 * const citations = createCitationList(articles, 'VANCOUVER');
 * // Returns array of Citation objects
 * ```
 */
export function createCitationList(
  articles: ProcessedArticle[],
  style: CitationStyle
): Citation[] {
  return articles.map((article, index) => createCitation(article, index + 1, style));
}

/**
 * Generates a formatted reference list with numbered citations
 *
 * @param articles - Array of processed articles
 * @param style - Citation style to use
 * @returns Formatted reference list string
 *
 * @example
 * ```typescript
 * const refList = generateReferenceList(articles, 'VANCOUVER');
 * // Returns:
 * // 1. Smith JA, Jones BM. Title. Ann Emerg Med. 2025;85(1):45-56.
 * // 2. Williams CD. Another Title. Crit Care Med. 2024;50(2):100-110.
 * ```
 */
export function generateReferenceList(
  articles: ProcessedArticle[],
  style: CitationStyle
): string {
  const citations = formatCitationList(articles, style);

  return citations.map((citation, index) => `${index + 1}. ${citation}`).join('\n');
}
