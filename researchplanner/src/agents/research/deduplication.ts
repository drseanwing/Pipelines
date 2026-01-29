/**
 * Result Deduplication Module
 * Phase 5.6 - DOI, PMID, and title similarity-based deduplication
 *
 * Merges search results from multiple sources (PubMed, Semantic Scholar, Cochrane)
 * using exact matching (DOI/PMID) and fuzzy matching (title similarity).
 */

/**
 * Search result from a single source (PubMed, Semantic Scholar, or Cochrane)
 */
export interface SearchResult {
  source: 'pubmed' | 'semantic_scholar' | 'cochrane';
  id: string;
  doi?: string;
  pmid?: string;
  title: string;
  abstract?: string;
  authors: string[];
  year?: number;
  journal?: string;
  citationCount?: number;
}

/**
 * Unified paper record merged from multiple sources
 */
export interface UnifiedPaper {
  primary_id: string;
  doi?: string;
  pmid?: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  journal: string;
  sources: ('pubmed' | 'semantic_scholar' | 'cochrane')[];
  citation_count?: number;
}

/**
 * Default threshold for title similarity matching
 * 0.85 = 85% similarity required for fuzzy deduplication
 */
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * Deduplicate search results from multiple sources
 *
 * Strategy:
 * 1. First pass: Exact matching by DOI
 * 2. Second pass: Exact matching by PMID (for remaining papers)
 * 3. Third pass: Fuzzy matching by title similarity (for remaining papers)
 * 4. Merge duplicates into unified paper records
 *
 * @param results - Array of search results from all sources
 * @returns Array of unified, deduplicated papers
 *
 * @example
 * ```typescript
 * const results = [
 *   { source: 'pubmed', id: 'PM123', pmid: '123', title: 'Heart Disease Study', ... },
 *   { source: 'semantic_scholar', id: 'SS456', doi: '10.1234/5678', title: 'Heart Disease Study', ... },
 * ];
 * const unified = deduplicateResults(results);
 * console.log(unified.length); // 1 (merged duplicate)
 * console.log(unified[0].sources); // ['pubmed', 'semantic_scholar']
 * ```
 */
export function deduplicateResults(results: SearchResult[]): UnifiedPaper[] {
  if (results.length === 0) {
    return [];
  }

  // Track which results have been processed
  const processed = new Set<number>();
  const unifiedPapers: UnifiedPaper[] = [];

  // First pass: Match by DOI
  const doiMap = matchByDOI(results);
  for (const [doi, matches] of doiMap.entries()) {
    if (matches.length > 0) {
      const unified = createUnifiedPaper(matches);
      unifiedPapers.push(unified);

      // Mark all matched results as processed
      matches.forEach(match => {
        const index = results.indexOf(match);
        if (index !== -1) {
          processed.add(index);
        }
      });
    }
  }

  // Second pass: Match remaining by PMID
  const remainingAfterDOI = results.filter((_, index) => !processed.has(index));
  const pmidMap = matchByPMID(remainingAfterDOI);
  for (const [pmid, matches] of pmidMap.entries()) {
    if (matches.length > 0) {
      const unified = createUnifiedPaper(matches);
      unifiedPapers.push(unified);

      // Mark all matched results as processed
      matches.forEach(match => {
        const index = results.indexOf(match);
        if (index !== -1) {
          processed.add(index);
        }
      });
    }
  }

  // Third pass: Fuzzy match remaining by title similarity
  const remainingAfterPMID = results.filter((_, index) => !processed.has(index));
  const titleGroups = matchByTitleSimilarity(remainingAfterPMID, DEFAULT_SIMILARITY_THRESHOLD);
  for (const group of titleGroups) {
    if (group.length > 0) {
      const unified = createUnifiedPaper(group);
      unifiedPapers.push(unified);

      // Mark all matched results as processed
      group.forEach(match => {
        const index = results.indexOf(match);
        if (index !== -1) {
          processed.add(index);
        }
      });
    }
  }

  // Fourth pass: Add any remaining unmatched papers as single-source unified papers
  const finalRemaining = results.filter((_, index) => !processed.has(index));
  for (const result of finalRemaining) {
    const unified = createUnifiedPaper([result]);
    unifiedPapers.push(unified);
  }

  return unifiedPapers;
}

/**
 * Match papers by DOI (Digital Object Identifier)
 *
 * Groups all papers with the same DOI together.
 * DOI is the most reliable identifier for scholarly articles.
 *
 * @param papers - Array of search results
 * @returns Map of DOI to matching papers
 *
 * @example
 * ```typescript
 * const papers = [
 *   { doi: '10.1234/5678', title: 'Paper A', ... },
 *   { doi: '10.1234/5678', title: 'Paper A', ... },
 *   { title: 'Paper B', ... }, // no DOI
 * ];
 * const matches = matchByDOI(papers);
 * console.log(matches.get('10.1234/5678')?.length); // 2
 * ```
 */
export function matchByDOI(papers: SearchResult[]): Map<string, SearchResult[]> {
  const doiMap = new Map<string, SearchResult[]>();

  for (const paper of papers) {
    // Skip papers without DOI
    if (!paper.doi || paper.doi.trim() === '') {
      continue;
    }

    // Normalize DOI: lowercase, trim whitespace
    const normalizedDOI = paper.doi.toLowerCase().trim();

    // Add to map
    const existing = doiMap.get(normalizedDOI) || [];
    existing.push(paper);
    doiMap.set(normalizedDOI, existing);
  }

  // Filter out single-entry groups (not duplicates)
  const duplicatesOnly = new Map<string, SearchResult[]>();
  for (const [doi, matches] of doiMap.entries()) {
    if (matches.length > 1) {
      duplicatesOnly.set(doi, matches);
    }
  }

  return duplicatesOnly;
}

/**
 * Match papers by PMID (PubMed ID)
 *
 * Groups all papers with the same PMID together.
 * PMID is specific to PubMed but widely referenced.
 *
 * @param papers - Array of search results
 * @returns Map of PMID to matching papers
 *
 * @example
 * ```typescript
 * const papers = [
 *   { pmid: '12345678', title: 'Paper A', ... },
 *   { pmid: '12345678', title: 'Paper A', ... },
 * ];
 * const matches = matchByPMID(papers);
 * console.log(matches.get('12345678')?.length); // 2
 * ```
 */
export function matchByPMID(papers: SearchResult[]): Map<string, SearchResult[]> {
  const pmidMap = new Map<string, SearchResult[]>();

  for (const paper of papers) {
    // Skip papers without PMID
    if (!paper.pmid || paper.pmid.trim() === '') {
      continue;
    }

    // Normalize PMID: trim whitespace
    const normalizedPMID = paper.pmid.trim();

    // Add to map
    const existing = pmidMap.get(normalizedPMID) || [];
    existing.push(paper);
    pmidMap.set(normalizedPMID, existing);
  }

  // Filter out single-entry groups (not duplicates)
  const duplicatesOnly = new Map<string, SearchResult[]>();
  for (const [pmid, matches] of pmidMap.entries()) {
    if (matches.length > 1) {
      duplicatesOnly.set(pmid, matches);
    }
  }

  return duplicatesOnly;
}

/**
 * Match papers by title similarity using Levenshtein distance
 *
 * Groups papers with similar titles together for fuzzy deduplication.
 * Uses normalized Levenshtein distance for similarity scoring.
 *
 * @param papers - Array of search results
 * @param threshold - Similarity threshold (0-1), default 0.85
 * @returns Array of paper groups (each group contains similar papers)
 *
 * @example
 * ```typescript
 * const papers = [
 *   { title: 'Heart Disease in Elderly Patients', ... },
 *   { title: 'Heart disease in elderly patients', ... }, // same, different case
 *   { title: 'Diabetes Management', ... },
 * ];
 * const groups = matchByTitleSimilarity(papers, 0.85);
 * console.log(groups.length); // 2 groups
 * console.log(groups[0].length); // 2 papers with similar titles
 * ```
 */
export function matchByTitleSimilarity(
  papers: SearchResult[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): SearchResult[][] {
  if (papers.length === 0) {
    return [];
  }

  // Track which papers have been grouped
  const grouped = new Set<number>();
  const groups: SearchResult[][] = [];

  // Compare each paper with all others
  for (let i = 0; i < papers.length; i++) {
    if (grouped.has(i)) {
      continue; // Already in a group
    }

    const currentGroup: SearchResult[] = [papers[i]];
    grouped.add(i);

    // Find all similar papers
    for (let j = i + 1; j < papers.length; j++) {
      if (grouped.has(j)) {
        continue; // Already in a group
      }

      const similarity = calculateTitleSimilarity(
        papers[i].title,
        papers[j].title
      );

      if (similarity >= threshold) {
        currentGroup.push(papers[j]);
        grouped.add(j);
      }
    }

    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Calculate title similarity using normalized Levenshtein distance
 *
 * Similarity score ranges from 0 (completely different) to 1 (identical).
 * Algorithm:
 * 1. Normalize titles (lowercase, trim, remove punctuation)
 * 2. Calculate Levenshtein edit distance
 * 3. Normalize by maximum possible distance (longer title length)
 * 4. Convert to similarity score (1 - normalized_distance)
 *
 * @param title1 - First title
 * @param title2 - Second title
 * @returns Similarity score (0-1)
 *
 * @example
 * ```typescript
 * const sim1 = calculateTitleSimilarity('Heart Disease', 'Heart Disease');
 * console.log(sim1); // 1.0 (identical)
 *
 * const sim2 = calculateTitleSimilarity('Heart Disease', 'heart disease');
 * console.log(sim2); // 1.0 (case-insensitive)
 *
 * const sim3 = calculateTitleSimilarity('Heart Disease', 'Heart Diseases');
 * console.log(sim3); // ~0.93 (very similar)
 *
 * const sim4 = calculateTitleSimilarity('Heart Disease', 'Diabetes');
 * console.log(sim4); // ~0.0 (completely different)
 * ```
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  // Normalize titles for comparison
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  // Handle edge cases
  if (norm1 === norm2) {
    return 1.0; // Identical titles
  }
  if (norm1.length === 0 || norm2.length === 0) {
    return 0.0; // Empty title
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(norm1, norm2);

  // Normalize by maximum possible distance (longer title)
  const maxLength = Math.max(norm1.length, norm2.length);
  const normalizedDistance = distance / maxLength;

  // Convert to similarity score
  const similarity = 1.0 - normalizedDistance;

  return similarity;
}

/**
 * Normalize title for comparison
 *
 * Steps:
 * 1. Convert to lowercase
 * 2. Trim whitespace
 * 3. Remove punctuation
 * 4. Collapse multiple spaces to single space
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, substitutions) required to change one string into another.
 *
 * Uses dynamic programming for O(m*n) time complexity.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance (number of operations)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create 2D array for dynamic programming
  // dp[i][j] = edit distance between str1[0..i-1] and str2[0..j-1]
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i; // Delete all characters from str1
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j; // Insert all characters of str2
  }

  // Fill the dp table
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        // Characters match, no operation needed
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        // Take minimum of three operations:
        // 1. Substitute: dp[i-1][j-1] + 1
        // 2. Delete: dp[i-1][j] + 1
        // 3. Insert: dp[i][j-1] + 1
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // Substitute
          dp[i - 1][j] + 1,     // Delete
          dp[i][j - 1] + 1      // Insert
        );
      }
    }
  }

  return dp[len1][len2];
}

/**
 * Create unified paper record from multiple source matches
 *
 * Merging strategy:
 * 1. Primary ID: Use DOI if available, else PMID, else first result's ID
 * 2. DOI/PMID: Take first non-empty value
 * 3. Title: Use longest title (often most complete)
 * 4. Abstract: Use longest abstract
 * 5. Authors: Merge and deduplicate
 * 6. Year/Journal: Use first non-empty value
 * 7. Citation count: Take maximum across sources
 * 8. Sources: Track all contributing sources
 *
 * @param matches - Array of matching search results from different sources
 * @returns Unified paper record
 *
 * @example
 * ```typescript
 * const matches = [
 *   { source: 'pubmed', pmid: '123', title: 'Heart Disease', abstract: 'Short', ... },
 *   { source: 'semantic_scholar', doi: '10.1234/5678', title: 'Heart Disease Study', abstract: 'Longer abstract', citationCount: 42, ... },
 * ];
 * const unified = createUnifiedPaper(matches);
 * console.log(unified.primary_id); // '10.1234/5678' (DOI preferred)
 * console.log(unified.title); // 'Heart Disease Study' (longest)
 * console.log(unified.sources); // ['pubmed', 'semantic_scholar']
 * console.log(unified.citation_count); // 42
 * ```
 */
export function createUnifiedPaper(matches: SearchResult[]): UnifiedPaper {
  if (matches.length === 0) {
    throw new Error('Cannot create unified paper from empty matches array');
  }

  // Extract DOI (first non-empty)
  const doi = matches.find(m => m.doi)?.doi;

  // Extract PMID (first non-empty)
  const pmid = matches.find(m => m.pmid)?.pmid;

  // Primary ID: DOI > PMID > first ID
  const primary_id = doi || pmid || matches[0].id;

  // Title: Use longest title (often most complete)
  const title = matches.reduce((longest, current) =>
    current.title.length > longest.length ? current.title : longest,
    matches[0].title
  );

  // Abstract: Use longest abstract (most complete)
  const abstract = matches.reduce((longest, current) => {
    const currentAbstract = current.abstract || '';
    const longestAbstract = longest || '';
    return currentAbstract.length > longestAbstract.length ? currentAbstract : longestAbstract;
  }, matches[0].abstract || '');

  // Authors: Merge and deduplicate
  const authorsSet = new Set<string>();
  for (const match of matches) {
    for (const author of match.authors) {
      authorsSet.add(author);
    }
  }
  const authors = Array.from(authorsSet);

  // Year: First non-empty
  const year = matches.find(m => m.year !== undefined)?.year;

  // Journal: First non-empty
  const journal = matches.find(m => m.journal)?.journal;

  // Citation count: Maximum across sources
  const citationCounts = matches
    .map(m => m.citationCount)
    .filter((count): count is number => count !== undefined);
  const citation_count = citationCounts.length > 0
    ? Math.max(...citationCounts)
    : undefined;

  // Sources: Track all contributing sources
  const sources = matches.map(m => m.source);

  // Build unified paper
  const unified: UnifiedPaper = {
    primary_id,
    doi,
    pmid,
    title,
    abstract,
    authors,
    year: year || 0, // Default to 0 if no year
    journal: journal || '', // Default to empty string if no journal
    sources,
    citation_count,
  };

  return unified;
}
