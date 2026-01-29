/**
 * Semantic Scholar API Integration
 *
 * Implements search and paper retrieval from Semantic Scholar API
 * with rate limiting and proper error handling.
 *
 * API Documentation: https://api.semanticscholar.org/api-docs/
 * Rate Limits: 100 requests per 5 minutes without API key
 */

/**
 * Semantic Scholar paper metadata interface
 */
export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract: string | null;
  authors: Array<{
    authorId: string | null;
    name: string;
  }>;
  year: number | null;
  citationCount: number;
  venue: string | null;
  url: string;
  doi: string | null;
  pmid: string | null;
}

/**
 * Search response from Semantic Scholar API
 */
interface SearchResponse {
  total: number;
  offset: number;
  next?: number;
  data: Array<{
    paperId: string;
    title: string;
    abstract?: string | null;
    authors?: Array<{
      authorId?: string | null;
      name: string;
    }>;
    year?: number | null;
    citationCount?: number;
    venue?: string | null;
    url?: string;
    externalIds?: {
      DOI?: string;
      PubMed?: string;
      [key: string]: string | undefined;
    };
  }>;
}

/**
 * Paper details response from Semantic Scholar API
 */
interface PaperDetailsResponse {
  paperId: string;
  title: string;
  abstract?: string | null;
  authors?: Array<{
    authorId?: string | null;
    name: string;
  }>;
  year?: number | null;
  citationCount?: number;
  venue?: string | null;
  url?: string;
  externalIds?: {
    DOI?: string;
    PubMed?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Related papers response from Semantic Scholar API
 */
interface RelatedPapersResponse {
  data: Array<{
    paperId: string;
    title: string;
    abstract?: string | null;
    authors?: Array<{
      authorId?: string | null;
      name: string;
    }>;
    year?: number | null;
    citationCount?: number;
    venue?: string | null;
    url?: string;
    externalIds?: {
      DOI?: string;
      PubMed?: string;
      [key: string]: string | undefined;
    };
  }>;
}

/**
 * Rate limiter for Semantic Scholar API
 * Limits: 100 requests per 5 minutes without API key
 */
class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 5 * 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Wait if necessary to comply with rate limits
   */
  async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove timestamps outside the current window
    this.timestamps = this.timestamps.filter(ts => ts > windowStart);

    if (this.timestamps.length >= this.maxRequests) {
      // Calculate wait time until oldest request falls outside window
      const oldestTimestamp = this.timestamps[0]!;
      const waitTime = oldestTimestamp + this.windowMs - now + 100; // Add 100ms buffer

      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.timestamps.push(now);
  }

  /**
   * Get current usage statistics
   */
  getUsage(): { used: number; limit: number; resetIn: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.timestamps = this.timestamps.filter(ts => ts > windowStart);

    const resetIn = this.timestamps.length > 0
      ? Math.max(0, (this.timestamps[0]! + this.windowMs) - now)
      : 0;

    return {
      used: this.timestamps.length,
      limit: this.maxRequests,
      resetIn
    };
  }
}

// Singleton rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * API base URL and configuration
 */
const BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

/**
 * Fields to request from Semantic Scholar API
 */
const FIELDS = 'title,abstract,authors,year,citationCount,venue,url,externalIds';

/**
 * Make authenticated HTTP request to Semantic Scholar API
 */
async function makeRequest<T>(url: string): Promise<T> {
  await rateLimiter.checkRateLimit();

  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Semantic Scholar API error: ${response.status} ${response.statusText}\n${errorBody}`
      );
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convert API response to normalized paper format
 */
function normalizePaper(paper: PaperDetailsResponse): SemanticScholarPaper {
  return {
    paperId: paper.paperId,
    title: paper.title,
    abstract: paper.abstract || null,
    authors: (paper.authors || []).map(author => ({
      authorId: author.authorId || null,
      name: author.name
    })),
    year: paper.year || null,
    citationCount: paper.citationCount || 0,
    venue: paper.venue || null,
    url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
    doi: paper.externalIds?.DOI || null,
    pmid: paper.externalIds?.PubMed || null
  };
}

/**
 * Search Semantic Scholar for papers matching a query
 *
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 100, max: 100)
 * @returns Array of papers matching the query
 *
 * @example
 * ```typescript
 * const papers = await searchSemanticScholar('machine learning healthcare', 50);
 * console.log(`Found ${papers.length} papers`);
 * ```
 */
export async function searchSemanticScholar(
  query: string,
  limit: number = 100
): Promise<SemanticScholarPaper[]> {
  if (!query.trim()) {
    throw new Error('Search query cannot be empty');
  }

  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }

  const encodedQuery = encodeURIComponent(query);
  const url = `${BASE_URL}/paper/search?query=${encodedQuery}&limit=${limit}&fields=${FIELDS}`;

  try {
    const response = await makeRequest<SearchResponse>(url);
    return response.data.map(paper => normalizePaper(paper));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Semantic Scholar search failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get detailed information for multiple papers by their IDs
 *
 * @param paperIds - Array of Semantic Scholar paper IDs
 * @returns Array of paper details
 *
 * @example
 * ```typescript
 * const paperIds = ['649def34f8be52c8b66281af98ae884c09aef38b'];
 * const papers = await getPaperDetails(paperIds);
 * console.log(papers[0].title);
 * ```
 */
export async function getPaperDetails(
  paperIds: string[]
): Promise<SemanticScholarPaper[]> {
  if (paperIds.length === 0) {
    return [];
  }

  // Batch requests in groups to avoid URL length limits
  const BATCH_SIZE = 20;
  const papers: SemanticScholarPaper[] = [];

  for (let i = 0; i < paperIds.length; i += BATCH_SIZE) {
    const batch = paperIds.slice(i, i + BATCH_SIZE);

    // Make parallel requests for each paper in the batch
    const batchPromises = batch.map(async (paperId) => {
      const url = `${BASE_URL}/paper/${paperId}?fields=${FIELDS}`;
      try {
        const paper = await makeRequest<PaperDetailsResponse>(url);
        return normalizePaper(paper);
      } catch (error) {
        console.error(`Failed to fetch paper ${paperId}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    papers.push(...batchResults.filter((p): p is SemanticScholarPaper => p !== null));
  }

  return papers;
}

/**
 * Get papers related to a given paper (for snowball search)
 *
 * @param paperId - Semantic Scholar paper ID
 * @returns Array of related papers
 *
 * @example
 * ```typescript
 * const related = await getRelatedPapers('649def34f8be52c8b66281af98ae884c09aef38b');
 * console.log(`Found ${related.length} related papers`);
 * ```
 */
export async function getRelatedPapers(
  paperId: string
): Promise<SemanticScholarPaper[]> {
  if (!paperId.trim()) {
    throw new Error('Paper ID cannot be empty');
  }

  const url = `${BASE_URL}/paper/${paperId}/references?fields=${FIELDS}&limit=100`;

  try {
    const response = await makeRequest<RelatedPapersResponse>(url);
    return response.data.map(paper => normalizePaper(paper));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get related papers: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get current rate limiter usage statistics
 *
 * @returns Current API usage statistics
 *
 * @example
 * ```typescript
 * const usage = getRateLimiterUsage();
 * console.log(`Used ${usage.used}/${usage.limit} requests`);
 * console.log(`Resets in ${Math.ceil(usage.resetIn / 1000)}s`);
 * ```
 */
export function getRateLimiterUsage(): {
  used: number;
  limit: number;
  resetIn: number;
} {
  return rateLimiter.getUsage();
}
