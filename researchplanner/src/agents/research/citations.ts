/**
 * Citation Formatting Module
 * Phase 5.11 - Vancouver-style citation formatting
 *
 * Implements:
 * - Vancouver citation format (primary)
 * - Author name formatting (et al. rules)
 * - Journal name abbreviation
 * - BibTeX export
 * - JSON citation export
 *
 * Vancouver Format:
 * Author1, Author2, Author3, et al. Title. Journal Abbrev. Year;Volume(Issue):Pages. doi:XXX
 *
 * Example:
 * Smith J, Jones M, Brown P, et al. Effect of exercise on blood pressure.
 * N Engl J Med. 2023;389(4):301-312. doi:10.1056/NEJMoa123456
 */

import type { ProcessedArticle, Citation } from '../../types/research.js';

/**
 * Common medical journal abbreviations (ISO 4 standard)
 * Based on Index Medicus and NLM catalog
 */
const JOURNAL_ABBREVIATIONS: Record<string, string> = {
  // Top-tier medical journals
  'New England Journal of Medicine': 'N Engl J Med',
  'JAMA': 'JAMA',
  'The Lancet': 'Lancet',
  'BMJ': 'BMJ',
  'British Medical Journal': 'BMJ',

  // Specialty journals - Cardiology
  'Journal of the American College of Cardiology': 'J Am Coll Cardiol',
  'Circulation': 'Circulation',
  'European Heart Journal': 'Eur Heart J',

  // Specialty journals - Neurology
  'Neurology': 'Neurology',
  'Brain': 'Brain',
  'Annals of Neurology': 'Ann Neurol',

  // Specialty journals - Oncology
  'Journal of Clinical Oncology': 'J Clin Oncol',
  'Cancer': 'Cancer',
  'Journal of the National Cancer Institute': 'J Natl Cancer Inst',

  // Systematic reviews
  'Cochrane Database of Systematic Reviews': 'Cochrane Database Syst Rev',

  // Public health
  'American Journal of Public Health': 'Am J Public Health',
  'International Journal of Epidemiology': 'Int J Epidemiol',

  // General medicine
  'Annals of Internal Medicine': 'Ann Intern Med',
  'Archives of Internal Medicine': 'Arch Intern Med',
  'JAMA Internal Medicine': 'JAMA Intern Med',

  // Pediatrics
  'Pediatrics': 'Pediatrics',
  'Journal of Pediatrics': 'J Pediatr',

  // Surgery
  'Annals of Surgery': 'Ann Surg',
  'Journal of the American College of Surgeons': 'J Am Coll Surg',

  // Psychiatry
  'American Journal of Psychiatry': 'Am J Psychiatry',
  'JAMA Psychiatry': 'JAMA Psychiatry',

  // Research methods
  'Clinical Trials': 'Clin Trials',
  'Trials': 'Trials',

  // PLoS journals
  'PLoS ONE': 'PLoS One',
  'PLOS Medicine': 'PLoS Med',

  // Nature/Science family
  'Nature': 'Nature',
  'Science': 'Science',
  'Nature Medicine': 'Nat Med',
  'Science Translational Medicine': 'Sci Transl Med',
};

/**
 * Format author names for Vancouver style
 *
 * Rules:
 * - First 6 authors listed
 * - 7+ authors: list first 6, then "et al."
 * - Format: LastName Initials (no periods after initials)
 * - Comma-separated list
 *
 * @param authors - Array of author names (any format)
 * @param maxAuthors - Maximum authors before et al. (default: 6)
 * @returns Formatted author string
 *
 * @example
 * ```typescript
 * formatAuthors(['John Smith', 'Mary Jones']) // "Smith J, Jones M"
 * formatAuthors(['A', 'B', 'C', 'D', 'E', 'F', 'G']) // "A, B, C, D, E, F, et al."
 * ```
 */
export function formatAuthors(authors: string[], maxAuthors: number = 6): string {
  if (authors.length === 0) {
    return 'Anonymous';
  }

  // Take first N authors
  const displayedAuthors = authors.slice(0, maxAuthors);

  // Format each author: "LastName Initials"
  // Handle various input formats (try to extract last name and initials)
  const formattedAuthors = displayedAuthors.map(author => {
    // Simple heuristic: if already formatted as "LastName I", keep it
    if (/^[A-Z][a-z]+\s+[A-Z](\s+[A-Z])*\.?$/.test(author.trim())) {
      return author.trim().replace(/\./g, ''); // Remove periods
    }

    // If "LastName, FirstName" format
    if (author.includes(',')) {
      const [last, first] = author.split(',').map(s => s.trim());
      const initials = first
        .split(/\s+/)
        .map(name => name[0])
        .join('');
      return `${last} ${initials}`;
    }

    // If "FirstName LastName" format
    const parts = author.trim().split(/\s+/);
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      const initials = parts
        .slice(0, -1)
        .map(name => name[0])
        .join('');
      return `${lastName} ${initials}`;
    }

    // Fallback: use as-is
    return author.trim();
  });

  // Add "et al." if more authors exist
  const authorString = formattedAuthors.join(', ');
  if (authors.length > maxAuthors) {
    return `${authorString}, et al.`;
  }

  return authorString;
}

/**
 * Abbreviate journal name according to ISO 4 / NLM standards
 *
 * Uses a lookup table for common medical journals.
 * Falls back to original name if not found.
 *
 * @param fullName - Full journal name
 * @returns Abbreviated journal name
 *
 * @example
 * ```typescript
 * abbreviateJournalName('New England Journal of Medicine') // "N Engl J Med"
 * abbreviateJournalName('Unknown Journal') // "Unknown Journal"
 * ```
 */
export function abbreviateJournalName(fullName: string): string {
  // Try exact match first
  const normalized = fullName.trim();
  if (JOURNAL_ABBREVIATIONS[normalized]) {
    return JOURNAL_ABBREVIATIONS[normalized];
  }

  // Try case-insensitive match
  const lowerName = normalized.toLowerCase();
  for (const [full, abbrev] of Object.entries(JOURNAL_ABBREVIATIONS)) {
    if (full.toLowerCase() === lowerName) {
      return abbrev;
    }
  }

  // Fallback: return original name
  return normalized;
}

/**
 * Format a single article as a Vancouver-style citation
 *
 * Vancouver Format:
 * Author1, Author2, Author3, et al. Title. Journal Abbrev. Year;Volume(Issue):Pages. doi:XXX
 *
 * Note: Volume/Issue/Pages may not be available for all articles.
 * DOI is preferred identifier when available.
 *
 * @param article - Processed article data
 * @param citationNumber - Sequential citation number
 * @returns Formatted Vancouver citation string
 *
 * @example
 * ```typescript
 * const citation = formatVancouverCitation(article, 1);
 * // "1. Smith J, Jones M. Effect of exercise. N Engl J Med. 2023. doi:10.1056/xyz"
 * ```
 */
export function formatVancouverCitation(
  article: ProcessedArticle,
  citationNumber: number
): string {
  const parts: string[] = [];

  // 1. Authors
  const authors = formatAuthors(article.authors);
  parts.push(authors);

  // 2. Title (no period if title ends with punctuation)
  let title = article.title.trim();
  if (!/[.!?]$/.test(title)) {
    title += '.';
  }
  parts.push(title);

  // 3. Journal abbreviation
  const journal = abbreviateJournalName(article.journal);
  parts.push(`${journal}.`);

  // 4. Year (always available)
  parts.push(`${article.year}.`);

  // 5. DOI (if available)
  if (article.doi) {
    parts.push(`doi:${article.doi}`);
  } else if (article.pmid) {
    // Fallback to PMID if no DOI
    parts.push(`PMID: ${article.pmid}`);
  }

  return parts.join(' ');
}

/**
 * Generate BibTeX entry for an article
 *
 * Creates a standardized BibTeX entry with all available fields.
 * Uses DOI as citation key when available, otherwise PMID or generated key.
 *
 * @param article - Processed article data
 * @returns BibTeX formatted string
 *
 * @example
 * ```typescript
 * const bibtex = generateBibTeX(article);
 * // "@article{Smith2023,
 * //   author = {Smith, J. and Jones, M.},
 * //   title = {Effect of exercise},
 * //   journal = {New England Journal of Medicine},
 * //   year = {2023},
 * //   doi = {10.1056/xyz}
 * // }"
 * ```
 */
export function generateBibTeX(article: ProcessedArticle): string {
  // Generate citation key
  const firstAuthor = article.authors[0] || 'Unknown';
  const lastName = firstAuthor.split(/[\s,]+/)[0];
  const citationKey = article.doi
    ? `${lastName}${article.year}`
    : article.pmid
    ? `PMID${article.pmid}`
    : `${lastName}${article.year}`;

  // Format authors for BibTeX (LastName, FirstName and ...)
  const bibtexAuthors = article.authors
    .map(author => {
      // Simple conversion - may need enhancement for complex names
      const parts = author.trim().split(/\s+/);
      if (parts.length >= 2) {
        const lastName = parts[parts.length - 1];
        const firstName = parts.slice(0, -1).join(' ');
        return `${lastName}, ${firstName}`;
      }
      return author;
    })
    .join(' and ');

  const lines: string[] = [];
  lines.push(`@article{${citationKey},`);
  lines.push(`  author = {${bibtexAuthors}},`);
  lines.push(`  title = {${article.title}},`);
  lines.push(`  journal = {${article.journal}},`);
  lines.push(`  year = {${article.year}}`);

  if (article.doi) {
    lines.push(`  ,doi = {${article.doi}}`);
  }

  if (article.pmid) {
    lines.push(`  ,pmid = {${article.pmid}}`);
  }

  if (article.abstract) {
    // Escape special BibTeX characters
    const escapedAbstract = article.abstract.replace(/[{}]/g, '\\$&');
    lines.push(`  ,abstract = {${escapedAbstract}}`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Format multiple articles as numbered citations
 *
 * Generates sequential citations with Vancouver formatting.
 * Returns Citation objects with all metadata.
 *
 * @param articles - Array of processed articles
 * @returns Array of Citation objects with formatted citations
 *
 * @example
 * ```typescript
 * const citations = formatCitations(articles);
 * console.log(citations[0].formatted_citation);
 * // "Smith J, Jones M. Effect of exercise. N Engl J Med. 2023. doi:10.1056/xyz"
 * ```
 */
export function formatCitations(articles: ProcessedArticle[]): Citation[] {
  return articles.map((article, index) => {
    const citationNumber = index + 1;
    const formatted = formatVancouverCitation(article, citationNumber);
    const bibtex = generateBibTeX(article);

    // Use DOI or PMID as article_id
    const articleId = article.doi || article.pmid || `article_${citationNumber}`;

    return {
      article_id: articleId,
      citation_number: citationNumber,
      formatted_citation: formatted,
      citation_style: 'VANCOUVER',
      bibtex,
    };
  });
}

/**
 * Export citations as JSON string
 *
 * Serializes Citation array to formatted JSON.
 * Includes all metadata: citation number, formatted text, BibTeX.
 *
 * @param citations - Array of Citation objects
 * @returns JSON string (pretty-printed with 2-space indentation)
 *
 * @example
 * ```typescript
 * const json = exportCitationsJSON(citations);
 * fs.writeFileSync('citations.json', json);
 * ```
 */
export function exportCitationsJSON(citations: Citation[]): string {
  return JSON.stringify(citations, null, 2);
}

/**
 * Export citations as BibTeX file content
 *
 * Concatenates all BibTeX entries with blank line separators.
 * Ready to write to .bib file.
 *
 * @param citations - Array of Citation objects
 * @returns BibTeX file content (multi-entry format)
 *
 * @example
 * ```typescript
 * const bibtex = exportCitationsBibTeX(citations);
 * fs.writeFileSync('references.bib', bibtex);
 * ```
 */
export function exportCitationsBibTeX(citations: Citation[]): string {
  return citations
    .map(citation => citation.bibtex)
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Generate numbered citation list (for reports/documents)
 *
 * Creates a formatted reference list with sequential numbering.
 * Suitable for inclusion in research reports or protocols.
 *
 * @param citations - Array of Citation objects
 * @returns Multi-line string with numbered citations
 *
 * @example
 * ```typescript
 * const refList = generateNumberedCitationList(citations);
 * // "1. Smith J, Jones M. Effect of exercise. N Engl J Med. 2023. doi:10.1056/xyz
 * //  2. Brown P, Davis K. Hypertension treatment. JAMA. 2022. doi:10.1001/abc"
 * ```
 */
export function generateNumberedCitationList(citations: Citation[]): string {
  return citations
    .map(citation => `${citation.citation_number}. ${citation.formatted_citation}`)
    .join('\n');
}
