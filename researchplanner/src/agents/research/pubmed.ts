/**
 * PubMed API Integration
 * Phase 5.2 - PubMed Search and Retrieval
 *
 * Implements NCBI E-utilities API integration:
 * - eSearch: Search PubMed database for PMIDs
 * - eFetch: Retrieve article abstracts and metadata
 * - Rate limiting: 3 requests/second (10/second with API key)
 * - XML parsing: Extract article data from PubMed XML format
 *
 * NCBI E-utilities Documentation:
 * https://www.ncbi.nlm.nih.gov/books/NBK25501/
 */

import { XMLParser } from 'fast-xml-parser';

/**
 * PubMed article data structure
 * Extracted from PubMed XML response
 */
export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  journalIssue: {
    volume?: string;
    issue?: string;
    pubDate: string;
  };
  year: number;
  doi?: string;
  publicationTypes: string[];
  meshTerms: string[];
  keywords: string[];
}

/**
 * eSearch API response structure
 */
interface ESearchResponse {
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
    translationset?: unknown;
    querytranslation?: string;
    errorlist?: {
      phrasesnotfound?: string[];
      fieldsnotfound?: string[];
    };
  };
}

/**
 * PubMed XML structure interfaces
 */
interface TextElementXML {
  '#text'?: string;
  '@_Label'?: string;
  [key: string]: unknown;
}

interface PubmedArticleSetXML {
  PubmedArticle?: PubmedArticleXML | PubmedArticleXML[];
}

interface PubmedArticleXML {
  MedlineCitation: MedlineCitationXML;
  PubmedData?: PubmedDataXML;
}

interface MedlineCitationXML {
  PMID: string | TextElementXML;
  Article: ArticleXML;
  MeshHeadingList?: MeshHeadingListXML;
  KeywordList?: KeywordListXML | KeywordListXML[];
}

interface ArticleXML {
  ArticleTitle: string | TextElementXML;
  Abstract?: AbstractXML;
  AuthorList?: AuthorListXML;
  Journal: JournalXML;
  PublicationTypeList?: PublicationTypeListXML;
}

interface AbstractXML {
  AbstractText?: TextElementXML | TextElementXML[];
  [key: string]: unknown;
}

interface AuthorListXML {
  Author?: AuthorXML | AuthorXML[];
}

interface AuthorXML {
  LastName?: string | TextElementXML;
  ForeName?: string | TextElementXML;
  Initials?: string | TextElementXML;
  CollectiveName?: string | TextElementXML;
}

interface JournalXML {
  Title?: string | TextElementXML;
  ISOAbbreviation?: string | TextElementXML;
  JournalIssue?: JournalIssueXML;
}

interface JournalIssueXML {
  Volume?: string | TextElementXML;
  Issue?: string | TextElementXML;
  PubDate?: PubDateXML;
}

interface PubDateXML {
  Year?: string | TextElementXML;
  Month?: string | TextElementXML;
  Day?: string | TextElementXML;
  MedlineDate?: string | TextElementXML;
}

interface PubmedDataXML {
  ArticleIdList?: ArticleIdListXML;
}

interface ArticleIdListXML {
  ArticleId?: ArticleIdXML | ArticleIdXML[];
}

interface ArticleIdXML extends TextElementXML {
  '@_IdType'?: string;
}

interface PublicationTypeListXML {
  PublicationType?: (string | TextElementXML) | (string | TextElementXML)[];
}

interface MeshHeadingListXML {
  MeshHeading?: MeshHeadingXML | MeshHeadingXML[];
}

interface MeshHeadingXML {
  DescriptorName: string | TextElementXML;
}

interface KeywordListXML {
  Keyword?: (string | TextElementXML) | (string | TextElementXML)[];
}

/**
 * Rate limiter for NCBI E-utilities API
 * NCBI Policy: 3 requests/second without API key, 10/second with API key
 */
class RateLimiter {
  private queue: Array<() => void> = [];
  private lastRequestTime = 0;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  /**
   * Execute function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest >= this.minInterval) {
      const fn = this.queue.shift();
      if (fn) {
        this.lastRequestTime = now;
        fn();
        // Process next item if available
        if (this.queue.length > 0) {
          setTimeout(() => this.processQueue(), this.minInterval);
        }
      }
    } else {
      // Wait for remaining time
      const waitTime = this.minInterval - timeSinceLastRequest;
      setTimeout(() => this.processQueue(), waitTime);
    }
  }
}

/**
 * NCBI E-utilities configuration
 */
const NCBI_API_KEY = process.env['NCBI_API_KEY'];
const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const ESEARCH_URL = `${BASE_URL}/esearch.fcgi`;
const EFETCH_URL = `${BASE_URL}/efetch.fcgi`;

// Rate limiter: 3 req/sec without key, 10 req/sec with key
const rateLimiter = new RateLimiter(NCBI_API_KEY ? 10 : 3);

// XML parser configuration
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
  cdataPropName: '__cdata',
  parseTagValue: true,
});

/**
 * Search PubMed database using eSearch API
 *
 * @param query - PubMed search query (supports boolean operators, MeSH terms, etc.)
 * @param retmax - Maximum number of PMIDs to return (default: 100, max: 10000)
 * @returns Array of PMIDs matching the search query
 *
 * @throws Error if API request fails or returns error
 *
 * @example
 * ```typescript
 * const pmids = await searchPubMed('diabetes[MeSH] AND prevention[Title]', 50);
 * console.log(`Found ${pmids.length} articles`);
 * ```
 */
export async function searchPubMed(
  query: string,
  retmax = 100
): Promise<string[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  if (retmax < 1 || retmax > 10000) {
    throw new Error('retmax must be between 1 and 10000');
  }

  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: retmax.toString(),
    retmode: 'json',
    retstart: '0',
    sort: 'relevance',
  });

  // Add API key if available
  if (NCBI_API_KEY) {
    params.set('api_key', NCBI_API_KEY);
  }

  const url = `${ESEARCH_URL}?${params.toString()}`;

  return rateLimiter.execute(async () => {
    console.log(`[PubMed] Searching: ${query.slice(0, 100)}...`);
    const safeUrl = url.replace(/api_key=[^&]+/, 'api_key=***');
    console.log(`[PubMed] URL: ${safeUrl}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `eSearch API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as ESearchResponse;

      // Check for errors in response
      if (data.esearchresult.errorlist) {
        const errors = data.esearchresult.errorlist;
        const errorMessages: string[] = [];

        if (errors.phrasesnotfound && errors.phrasesnotfound.length > 0) {
          errorMessages.push(
            `Phrases not found: ${errors.phrasesnotfound.join(', ')}`
          );
        }
        if (errors.fieldsnotfound && errors.fieldsnotfound.length > 0) {
          errorMessages.push(
            `Fields not found: ${errors.fieldsnotfound.join(', ')}`
          );
        }

        if (errorMessages.length > 0) {
          console.warn(`[PubMed] Search warnings: ${errorMessages.join('; ')}`);
        }
      }

      const pmids = data.esearchresult.idlist || [];
      const count = parseInt(data.esearchresult.count, 10);

      console.log(
        `[PubMed] Found ${count} total results, returning ${pmids.length} PMIDs`
      );

      return pmids;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`PubMed search failed: ${error.message}`);
      }
      throw new Error('PubMed search failed: Unknown error');
    }
  });
}

/**
 * Fetch article abstracts and metadata using eFetch API
 *
 * @param pmids - Array of PubMed IDs to fetch
 * @returns Array of PubMedArticle objects with parsed metadata
 *
 * @throws Error if API request fails or XML parsing fails
 *
 * @example
 * ```typescript
 * const pmids = ['12345678', '87654321'];
 * const articles = await fetchPubMedAbstracts(pmids);
 * articles.forEach(article => {
 *   console.log(`${article.title} (${article.year})`);
 * });
 * ```
 */
export async function fetchPubMedAbstracts(
  pmids: string[]
): Promise<PubMedArticle[]> {
  if (!pmids || pmids.length === 0) {
    return [];
  }

  // eFetch can handle up to 500 IDs per request
  // Split into batches if needed
  const BATCH_SIZE = 200;
  const batches: string[][] = [];

  for (let i = 0; i < pmids.length; i += BATCH_SIZE) {
    batches.push(pmids.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `[PubMed] Fetching ${pmids.length} articles in ${batches.length} batch(es)`
  );

  const allArticles: PubMedArticle[] = [];

  for (const [index, batch] of batches.entries()) {
    console.log(
      `[PubMed] Processing batch ${index + 1}/${batches.length} (${batch.length} PMIDs)`
    );

    const articles = await fetchBatch(batch);
    allArticles.push(...articles);
  }

  console.log(`[PubMed] Successfully fetched ${allArticles.length} articles`);

  return allArticles;
}

/**
 * Fetch a single batch of articles
 * @internal
 */
async function fetchBatch(pmids: string[]): Promise<PubMedArticle[]> {
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    rettype: 'abstract',
    retmode: 'xml',
  });

  if (NCBI_API_KEY) {
    params.set('api_key', NCBI_API_KEY);
  }

  const url = `${EFETCH_URL}?${params.toString()}`;

  return rateLimiter.execute(async () => {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `eFetch API request failed: ${response.status} ${response.statusText}`
        );
      }

      const xml = await response.text();
      return parsePubMedXML(xml);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`PubMed fetch failed: ${error.message}`);
      }
      throw new Error('PubMed fetch failed: Unknown error');
    }
  });
}

/**
 * Parse PubMed XML response into structured article data
 *
 * @param xml - XML string from eFetch API
 * @returns Array of parsed PubMedArticle objects
 *
 * @throws Error if XML parsing fails or required fields are missing
 *
 * @example
 * ```typescript
 * const xml = await fetchXMLFromPubMed();
 * const articles = parsePubMedXML(xml);
 * ```
 */
export function parsePubMedXML(xml: string): PubMedArticle[] {
  if (!xml || xml.trim().length === 0) {
    throw new Error('XML content cannot be empty');
  }

  try {
    const parsed = xmlParser.parse(xml);

    if (!parsed.PubmedArticleSet) {
      throw new Error('Invalid PubMed XML: Missing PubmedArticleSet root element');
    }

    // Handle single article or array of articles
    let articles = parsed.PubmedArticleSet.PubmedArticle;
    if (!articles) {
      return [];
    }

    // Normalize to array
    if (!Array.isArray(articles)) {
      articles = [articles];
    }

    const results: PubMedArticle[] = [];

    for (const article of articles) {
      try {
        const parsed = parseArticle(article);
        results.push(parsed);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[PubMed] Failed to parse article: ${errorMsg}`);
        // Continue with next article
      }
    }

    return results;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`XML parsing failed: ${error.message}`);
    }
    throw new Error('XML parsing failed: Unknown error');
  }
}

/**
 * Parse a single PubMed article from XML structure
 * @internal
 */
function parseArticle(article: PubmedArticleXML): PubMedArticle {
  const medlineCitation = article.MedlineCitation;
  const pubmedData = article.PubmedData;

  if (!medlineCitation) {
    throw new Error('Missing MedlineCitation element');
  }

  // Extract PMID
  const pmid = extractPMID(medlineCitation);

  // Extract article metadata
  const articleData = medlineCitation.Article;
  if (!articleData) {
    throw new Error('Missing Article element');
  }

  // Extract title
  const title = extractText(articleData.ArticleTitle);
  if (!title) {
    throw new Error('Missing article title');
  }

  // Extract abstract
  const abstract = extractAbstract(articleData.Abstract);

  // Extract authors
  const authors = extractAuthors(articleData.AuthorList);

  // Extract journal info
  const journal = extractJournal(articleData.Journal);

  // Extract publication year
  const year = extractYear(articleData.Journal);

  // Extract DOI
  const doi = extractDOI(pubmedData);

  // Extract publication types
  const publicationTypes = extractPublicationTypes(articleData.PublicationTypeList);

  // Extract MeSH terms
  const meshTerms = extractMeSHTerms(medlineCitation.MeshHeadingList);

  // Extract keywords
  const keywords = extractKeywords(medlineCitation.KeywordList);

  return {
    pmid,
    title,
    abstract,
    authors,
    journal: journal.name,
    journalIssue: {
      volume: journal.volume,
      issue: journal.issue,
      pubDate: journal.pubDate,
    },
    year,
    doi,
    publicationTypes,
    meshTerms,
    keywords,
  };
}

/**
 * Extract PMID from MedlineCitation
 * @internal
 */
function extractPMID(medlineCitation: MedlineCitationXML): string {
  const pmidObj = medlineCitation.PMID;
  if (!pmidObj) {
    throw new Error('Missing PMID');
  }

  // Handle both object and string forms
  if (typeof pmidObj === 'string') {
    return pmidObj;
  }
  if (pmidObj['#text']) {
    return pmidObj['#text'];
  }

  throw new Error('Invalid PMID format');
}

/**
 * Extract text content from XML element
 * Handles nested structures and text nodes
 * @internal
 */
function extractText(element: string | TextElementXML | unknown): string {
  if (!element) return '';

  if (typeof element === 'string') {
    return element.trim();
  }

  if (element['#text']) {
    return element['#text'].trim();
  }

  if (Array.isArray(element)) {
    return element.map(extractText).join(' ').trim();
  }

  if (typeof element === 'object') {
    // Try to extract text from nested elements
    const values = Object.values(element);
    if (values.length > 0) {
      return values.map(v => extractText(v)).filter(t => t.length > 0).join(' ').trim();
    }
  }

  return '';
}

/**
 * Extract abstract text from Abstract element
 * @internal
 */
function extractAbstract(abstractElement: AbstractXML | undefined): string {
  if (!abstractElement) return '';

  // Handle structured abstract with sections
  if (abstractElement.AbstractText) {
    const abstractTexts = Array.isArray(abstractElement.AbstractText)
      ? abstractElement.AbstractText
      : [abstractElement.AbstractText];

    const parts: string[] = [];
    for (const text of abstractTexts) {
      const label = text['@_Label'] || '';
      const content = extractText(text);

      if (content) {
        if (label) {
          parts.push(`${label}: ${content}`);
        } else {
          parts.push(content);
        }
      }
    }

    return parts.join(' ').trim();
  }

  return extractText(abstractElement);
}

/**
 * Extract author list
 * @internal
 */
function extractAuthors(authorList: AuthorListXML | undefined): string[] {
  if (!authorList || !authorList.Author) {
    return [];
  }

  const authors = Array.isArray(authorList.Author)
    ? authorList.Author
    : [authorList.Author];

  return authors
    .map((author: AuthorXML) => {
      const lastName = extractText(author.LastName);
      const foreName = extractText(author.ForeName);
      const initials = extractText(author.Initials);

      if (lastName) {
        if (foreName) {
          return `${lastName} ${foreName}`;
        } else if (initials) {
          return `${lastName} ${initials}`;
        }
        return lastName;
      }

      // Handle collective names
      const collectiveName = extractText(author.CollectiveName);
      if (collectiveName) {
        return collectiveName;
      }

      return null;
    })
    .filter((author): author is string => author !== null);
}

/**
 * Extract journal information
 * @internal
 */
function extractJournal(journalElement: JournalXML): {
  name: string;
  volume?: string;
  issue?: string;
  pubDate: string;
} {
  if (!journalElement) {
    return { name: '', pubDate: '' };
  }

  const name = extractText(journalElement.Title) ||
               extractText(journalElement.ISOAbbreviation) ||
               '';

  const journalIssue = journalElement.JournalIssue || {};
  const volume = extractText(journalIssue.Volume);
  const issue = extractText(journalIssue.Issue);

  // Extract publication date
  let pubDate = '';
  if (journalIssue.PubDate) {
    const year = extractText(journalIssue.PubDate.Year);
    const month = extractText(journalIssue.PubDate.Month);
    const day = extractText(journalIssue.PubDate.Day);

    if (year) {
      pubDate = year;
      if (month) {
        pubDate += ` ${month}`;
        if (day) {
          pubDate += ` ${day}`;
        }
      }
    } else {
      pubDate = extractText(journalIssue.PubDate.MedlineDate) || '';
    }
  }

  return {
    name,
    volume: volume || undefined,
    issue: issue || undefined,
    pubDate,
  };
}

/**
 * Extract publication year
 * @internal
 */
function extractYear(journalElement: JournalXML): number {
  if (!journalElement) return new Date().getFullYear();

  const journalIssue = journalElement.JournalIssue || {};
  if (journalIssue.PubDate) {
    const year = extractText(journalIssue.PubDate.Year);
    if (year) {
      const parsed = parseInt(year, 10);
      if (!isNaN(parsed) && parsed > 1900 && parsed <= new Date().getFullYear() + 5) {
        return parsed;
      }
    }

    // Try to extract from MedlineDate (e.g., "2023 Jan-Feb")
    const medlineDate = extractText(journalIssue.PubDate.MedlineDate);
    if (medlineDate) {
      const yearMatch = medlineDate.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        return parseInt(yearMatch[0], 10);
      }
    }
  }

  // Default to current year if extraction fails
  return new Date().getFullYear();
}

/**
 * Extract DOI from PubmedData
 * @internal
 */
function extractDOI(pubmedData: PubmedDataXML | undefined): string | undefined {
  if (!pubmedData || !pubmedData.ArticleIdList) {
    return undefined;
  }

  const idList = pubmedData.ArticleIdList.ArticleId;
  if (!idList) return undefined;

  const ids = Array.isArray(idList) ? idList : [idList];

  for (const id of ids) {
    const idType = id['@_IdType'];
    if (idType === 'doi') {
      return extractText(id);
    }
  }

  return undefined;
}

/**
 * Extract publication types
 * @internal
 */
function extractPublicationTypes(typeList: PublicationTypeListXML | undefined): string[] {
  if (!typeList || !typeList.PublicationType) {
    return [];
  }

  const types = Array.isArray(typeList.PublicationType)
    ? typeList.PublicationType
    : [typeList.PublicationType];

  return types.map(extractText).filter(t => t.length > 0);
}

/**
 * Extract MeSH terms
 * @internal
 */
function extractMeSHTerms(meshList: MeshHeadingListXML | undefined): string[] {
  if (!meshList || !meshList.MeshHeading) {
    return [];
  }

  const headings = Array.isArray(meshList.MeshHeading)
    ? meshList.MeshHeading
    : [meshList.MeshHeading];

  return headings
    .map((heading: MeshHeadingXML) => {
      const descriptor = heading.DescriptorName;
      return extractText(descriptor);
    })
    .filter(term => term.length > 0);
}

/**
 * Extract keywords
 * @internal
 */
function extractKeywords(keywordList: KeywordListXML | KeywordListXML[] | undefined): string[] {
  if (!keywordList) return [];

  // Handle single or multiple KeywordList elements
  const lists = Array.isArray(keywordList) ? keywordList : [keywordList];

  const allKeywords: string[] = [];

  for (const list of lists) {
    if (list.Keyword) {
      const keywords = Array.isArray(list.Keyword)
        ? list.Keyword
        : [list.Keyword];

      const extracted = keywords
        .map(extractText)
        .filter(k => k.length > 0);

      allKeywords.push(...extracted);
    }
  }

  return allKeywords;
}
