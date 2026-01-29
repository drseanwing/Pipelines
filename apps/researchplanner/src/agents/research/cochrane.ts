/**
 * Cochrane Library Search Integration
 * Phase 5.4 - Cochrane API Integration
 *
 * Implements search functionality for Cochrane Library systematic reviews.
 * Includes graceful fallback for API unavailability to allow pipeline continuation.
 */

import { ProcessedArticle } from '../../types/index.js';

/**
 * Cochrane-specific review interface
 * Extends ProcessedArticle with Cochrane-specific metadata
 */
export interface CochraneReview {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number;
  abstract: string;
  doi?: string;
  url: string;
  reviewType: 'systematic_review' | 'diagnostic_test_accuracy' | 'methodology' | 'overview';
  lastAssessmentDate?: string;
  numberOfStudies?: number;
  mainResults?: string;
}

/**
 * Cochrane API response structure
 * Represents the top-level API response format
 */
export interface CochraneAPIResponse {
  results?: CochraneAPIItem[];
  reviews?: CochraneAPIItem[];
  data?: CochraneAPIItem[];
}

/**
 * Cochrane API item structure
 * Represents a single review item from the API response
 */
export interface CochraneAPIItem {
  id?: string;
  doi?: string;
  identifier?: { doi?: string } | string;
  title?: string;
  name?: string;
  headline?: string;
  abstract?: string;
  summary?: string;
  description?: string;
  authors?: string | string[] | Array<{ name?: string; fullName?: string; displayName?: string; firstName?: string; lastName?: string }>;
  author?: string | string[] | Array<{ name?: string; fullName?: string; displayName?: string; firstName?: string; lastName?: string }>;
  creators?: string | string[] | Array<{ name?: string; fullName?: string; displayName?: string; firstName?: string; lastName?: string }>;
  publicationDate?: string;
  publishedDate?: string;
  published?: string;
  date?: string;
  year?: number;
  publicationYear?: number;
  url?: string;
  link?: string;
  reviewType?: string;
  type?: string;
  lastAssessmentDate?: string;
  assessmentDate?: string;
  numberOfStudies?: number | string;
  studiesIncluded?: number | string;
  mainResults?: string;
  results?: string;
}

/**
 * Cochrane API configuration
 */
const COCHRANE_CONFIG = {
  // Cochrane Library uses a REST API, but access may be limited
  // Primary endpoint for Cochrane Library search
  searchEndpoint: 'https://www.cochranelibrary.com/api/search',

  // Alternative RSS feed endpoint (more accessible)
  rssEndpoint: 'https://www.cochranelibrary.com/cdsr/reviews/rss',

  // Request timeout (60 seconds as per spec)
  timeout: 60000,

  // User agent for API requests
  userAgent: 'QI-Research-Pipeline/0.1.0',

  // Default result limit
  defaultLimit: 50,
};

/**
 * Error class for Cochrane-specific errors
 */
export class CochraneError extends Error {
  constructor(
    message: string,
    public readonly code: 'API_UNAVAILABLE' | 'PARSE_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR',
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'CochraneError';
  }
}

/**
 * Search Cochrane Library for systematic reviews
 *
 * @param query - Search query string (should include relevant medical terms)
 * @param limit - Maximum number of results to return (default: 50)
 * @returns Promise resolving to array of Cochrane reviews
 *
 * Note: Due to potential API access limitations, this function implements
 * graceful fallback behavior, logging warnings but allowing pipeline to continue.
 */
export async function searchCochrane(
  query: string,
  limit: number = COCHRANE_CONFIG.defaultLimit
): Promise<CochraneReview[]> {
  // Validate input
  if (!query || query.trim().length === 0) {
    console.warn('[Cochrane] Empty query provided, returning empty results');
    return [];
  }

  try {
    console.log(`[Cochrane] Starting search with query: "${query.substring(0, 100)}..."`);

    // Attempt primary API search
    const reviews = await searchCochraneAPI(query, limit);

    console.log(`[Cochrane] Search completed successfully, found ${reviews.length} reviews`);
    return reviews;

  } catch (error) {
    // Log error but don't fail the pipeline
    if (error instanceof CochraneError) {
      console.warn(`[Cochrane] Search failed (${error.code}): ${error.message}`);

      if (error.code === 'API_UNAVAILABLE') {
        console.warn('[Cochrane] API access unavailable. This is expected for restricted APIs.');
        console.warn('[Cochrane] Continuing pipeline without Cochrane data.');
      }
    } else {
      console.error('[Cochrane] Unexpected error during search:', error);
    }

    // Return empty array to allow pipeline continuation
    return [];
  }
}

/**
 * Internal function to search Cochrane API
 * Implements the actual HTTP request logic
 *
 * @param query - Search query
 * @param limit - Result limit
 * @returns Promise resolving to array of reviews
 * @throws CochraneError on API errors
 */
async function searchCochraneAPI(query: string, limit: number): Promise<CochraneReview[]> {
  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COCHRANE_CONFIG.timeout);

  try {
    // Build search URL with query parameters
    const searchUrl = new URL(COCHRANE_CONFIG.searchEndpoint);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('limit', limit.toString());
    searchUrl.searchParams.set('type', 'review'); // Focus on systematic reviews

    console.log(`[Cochrane] Requesting: ${searchUrl.toString()}`);

    // Execute search request
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': COCHRANE_CONFIG.userAgent,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    // Handle non-200 responses
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new CochraneError(
          'Cochrane API access requires authentication or is restricted',
          'API_UNAVAILABLE',
          true
        );
      }

      if (response.status === 404) {
        throw new CochraneError(
          'Cochrane API endpoint not found',
          'API_UNAVAILABLE',
          true
        );
      }

      throw new CochraneError(
        `HTTP ${response.status}: ${response.statusText}`,
        'NETWORK_ERROR',
        true
      );
    }

    // Parse JSON response
    const data = await response.json();

    // Parse and return results
    return parseCochraneResponse(data);

  } catch (error) {
    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CochraneError(
        `Request timed out after ${COCHRANE_CONFIG.timeout}ms`,
        'TIMEOUT',
        true
      );
    }

    // Handle fetch errors (network issues)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CochraneError(
        'Network error: Unable to reach Cochrane API',
        'NETWORK_ERROR',
        true
      );
    }

    // Re-throw CochraneError instances
    if (error instanceof CochraneError) {
      throw error;
    }

    // Wrap unknown errors
    throw new CochraneError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      'NETWORK_ERROR',
      false
    );

  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse Cochrane API response into structured review objects
 *
 * @param response - Raw API response data
 * @returns Array of parsed Cochrane reviews
 * @throws CochraneError if response format is invalid
 *
 * Note: The actual Cochrane API response format may vary. This implementation
 * handles common response structures but may need adjustment based on actual API.
 */
export function parseCochraneResponse(response: CochraneAPIResponse | CochraneAPIItem[]): CochraneReview[] {
  try {
    // Handle empty or null response
    if (!response) {
      console.warn('[Cochrane] Empty response received');
      return [];
    }

    // Common response format: { results: [...] } or { reviews: [...] }
    const results = Array.isArray(response)
      ? response
      : (response.results || response.reviews || response.data || []);

    if (!Array.isArray(results)) {
      console.warn('[Cochrane] Response does not contain array of results:', typeof results);
      return [];
    }

    // Parse each review
    const reviews: CochraneReview[] = results
      .map((item: CochraneAPIItem, index: number) => {
        try {
          return parseSingleReview(item);
        } catch (error) {
          console.warn(`[Cochrane] Failed to parse review at index ${index}:`, error);
          return null;
        }
      })
      .filter((review): review is CochraneReview => review !== null);

    return reviews;

  } catch (error) {
    throw new CochraneError(
      `Failed to parse Cochrane response: ${error instanceof Error ? error.message : String(error)}`,
      'PARSE_ERROR',
      false
    );
  }
}

/**
 * Parse a single review object from Cochrane API response
 *
 * @param item - Single review object from API
 * @returns Parsed CochraneReview
 * @throws Error if required fields are missing
 */
function parseSingleReview(item: CochraneAPIItem): CochraneReview {
  // Cochrane API may use various field names
  // Common patterns: title/name, abstract/summary, doi/identifier

  // Handle identifier which can be string or object
  const identifierValue = typeof item.identifier === 'string' ? item.identifier : undefined;
  const id = item.id || item.doi || identifierValue || `cochrane-${Date.now()}-${Math.random()}`;
  const title = item.title || item.name || item.headline || '';

  if (!title || title.length === 0) {
    throw new Error('Missing required field: title');
  }

  // Parse authors (may be string array, comma-separated string, or objects)
  const authors = parseAuthors(item.authors || item.author || item.creators || []);

  // Extract publication year
  const publicationYear = extractYear(
    item.publicationYear ||
    item.year ||
    item.published ||
    item.date ||
    item.publicationDate ||
    new Date().getFullYear()
  );

  // Extract abstract/summary
  const abstract = item.abstract || item.summary || item.description || 'No abstract available';

  // Extract DOI (handle both direct doi field and identifier.doi object)
  const identifierDoi = typeof item.identifier === 'object' && item.identifier !== null ? item.identifier.doi : undefined;
  const doi = item.doi || identifierDoi || undefined;

  // Construct URL (prefer direct link, fallback to DOI-based URL)
  const url = item.url || item.link ||
    (doi ? `https://doi.org/${doi}` : `https://www.cochranelibrary.com/cdsr/${id}`);

  // Determine review type
  const reviewType = determineReviewType(item.type || item.reviewType || 'systematic_review');

  // Extract additional metadata
  const lastAssessmentDate = item.lastAssessmentDate || item.assessmentDate || undefined;
  const numberOfStudiesValue = item.numberOfStudies ?? item.studiesIncluded;
  const numberOfStudies = numberOfStudiesValue
    ? (typeof numberOfStudiesValue === 'number' ? numberOfStudiesValue : parseInt(String(numberOfStudiesValue), 10))
    : undefined;
  const mainResults = item.mainResults || item.results || undefined;

  return {
    id,
    title,
    authors,
    publicationYear,
    abstract,
    doi,
    url,
    reviewType,
    lastAssessmentDate,
    numberOfStudies,
    mainResults,
  };
}

/**
 * Parse author data from various formats
 *
 * @param authorsData - Author data in various formats
 * @returns Array of author name strings
 */
function parseAuthors(authorsData: string | string[] | Array<{ name?: string; fullName?: string; displayName?: string; firstName?: string; lastName?: string }> | undefined): string[] {
  // Handle empty/null
  if (!authorsData) {
    return [];
  }

  // Already an array of strings
  if (Array.isArray(authorsData) && authorsData.every(a => typeof a === 'string')) {
    return authorsData;
  }

  // Array of objects with name field
  if (Array.isArray(authorsData)) {
    return authorsData
      .map(a => {
        if (typeof a === 'string') return a;
        if (typeof a === 'object') {
          return a.name || a.fullName || a.displayName ||
                 `${a.firstName || ''} ${a.lastName || ''}`.trim() || null;
        }
        return null;
      })
      .filter((name): name is string => name !== null && name.length > 0);
  }

  // Comma-separated string
  if (typeof authorsData === 'string') {
    return authorsData
      .split(/[,;]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  return [];
}

/**
 * Extract year from various date formats
 *
 * @param dateValue - Date value in various formats
 * @returns Four-digit year
 */
function extractYear(dateValue: string | number | undefined): number {
  // Already a number
  if (typeof dateValue === 'number') {
    return dateValue;
  }

  // Parse from string
  if (typeof dateValue === 'string') {
    // Try parsing as ISO date
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.getFullYear();
    }

    // Try extracting 4-digit year
    const match = dateValue.match(/\b(19|20)\d{2}\b/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }

  // Default to current year
  return new Date().getFullYear();
}

/**
 * Determine review type from API response
 *
 * @param typeValue - Type value from API
 * @returns Normalized review type
 */
function determineReviewType(typeValue: string): CochraneReview['reviewType'] {
  const normalized = typeValue.toLowerCase().replace(/[_\s-]/g, '');

  if (normalized.includes('diagnostic') || normalized.includes('dta')) {
    return 'diagnostic_test_accuracy';
  }

  if (normalized.includes('methodology') || normalized.includes('method')) {
    return 'methodology';
  }

  if (normalized.includes('overview')) {
    return 'overview';
  }

  // Default to systematic review
  return 'systematic_review';
}

/**
 * Convert Cochrane review to ProcessedArticle format
 * Utility function for integration with main research pipeline
 *
 * @param review - Cochrane review
 * @param relevanceScore - Relevance score (0.0 - 1.0)
 * @returns ProcessedArticle compatible with research pipeline
 */
export function cochraneToProcessedArticle(
  review: CochraneReview,
  relevanceScore: number = 0.8
): ProcessedArticle {
  return {
    pmid: undefined, // Cochrane reviews don't have PMIDs
    doi: review.doi,
    title: review.title,
    authors: review.authors,
    journal: 'Cochrane Database of Systematic Reviews',
    year: review.publicationYear,
    abstract: review.abstract,
    relevance_score: relevanceScore,
    key_findings: review.mainResults ? [review.mainResults] : [],
    methodology_notes: `Cochrane ${review.reviewType.replace('_', ' ')}` +
      (review.numberOfStudies ? `, includes ${review.numberOfStudies} studies` : ''),
    limitations: [], // Would need to be extracted from full review
    full_text_available: true, // Cochrane reviews are typically open access
  };
}

/**
 * Batch convert Cochrane reviews to ProcessedArticles
 *
 * @param reviews - Array of Cochrane reviews
 * @param baseRelevanceScore - Base relevance score for Cochrane reviews (default: 0.8)
 * @returns Array of ProcessedArticles
 */
export function convertCochraneReviews(
  reviews: CochraneReview[],
  baseRelevanceScore: number = 0.8
): ProcessedArticle[] {
  return reviews.map(review =>
    cochraneToProcessedArticle(review, baseRelevanceScore)
  );
}
