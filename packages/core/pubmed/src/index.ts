/**
 * @pipelines/pubmed - PubMed eSearch/eFetch API client
 *
 * Provides PubMed search and article retrieval with XML parsing,
 * rate limiting, and structured output.
 */

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export interface PubMedSearchOptions {
  /** Search query */
  query: string;
  /** Maximum results (default: 20) */
  maxResults?: number;
  /** Sort order (default: 'relevance') */
  sort?: 'relevance' | 'date' | 'pub_date';
  /** Minimum date (YYYY/MM/DD) */
  minDate?: string;
  /** Maximum date (YYYY/MM/DD) */
  maxDate?: string;
  /** Optional API key for higher rate limits */
  apiKey?: string;
}

export interface PubMedSearchResult {
  pmids: string[];
  count: number;
  queryTranslation: string;
}

export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: PubMedAuthor[];
  journal: string;
  publicationDate: string;
  doi?: string;
  publicationTypes: string[];
  meshTerms: string[];
  keywords: string[];
}

export interface PubMedAuthor {
  lastName: string;
  firstName: string;
  initials: string;
  affiliation?: string;
}

/**
 * PubMed API client
 */
export class PubMedClient {
  private apiKey?: string;
  private lastRequestTime = 0;
  // NCBI rate limit: 3 requests/second without API key, 10 with
  private readonly minInterval: number;

  constructor(options?: { apiKey?: string }) {
    this.apiKey = options?.apiKey ?? process.env['NCBI_API_KEY'];
    this.minInterval = this.apiKey ? 100 : 334; // 10/s or 3/s
  }

  /**
   * Search PubMed for articles
   */
  async search(options: PubMedSearchOptions): Promise<PubMedSearchResult> {
    await this.rateLimit();

    const params = new URLSearchParams({
      db: 'pubmed',
      term: options.query,
      retmax: String(options.maxResults ?? 20),
      sort: options.sort ?? 'relevance',
      retmode: 'json',
    });

    if (options.minDate) params.set('mindate', options.minDate);
    if (options.maxDate) params.set('maxdate', options.maxDate);
    if (options.minDate || options.maxDate) params.set('datetype', 'pdat');

    const apiKey = options.apiKey ?? this.apiKey;
    if (apiKey) params.set('api_key', apiKey);

    const response = await fetch(`${PUBMED_BASE_URL}/esearch.fcgi?${params}`);
    if (!response.ok) {
      throw new Error(`PubMed search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      esearchresult: {
        idlist: string[];
        count: string;
        querytranslation: string;
      };
    };

    return {
      pmids: data.esearchresult.idlist,
      count: parseInt(data.esearchresult.count, 10),
      queryTranslation: data.esearchresult.querytranslation,
    };
  }

  /**
   * Fetch article details by PMIDs
   */
  async fetchArticles(pmids: string[]): Promise<PubMedArticle[]> {
    if (pmids.length === 0) return [];

    await this.rateLimit();

    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml',
      rettype: 'abstract',
    });

    if (this.apiKey) params.set('api_key', this.apiKey);

    const response = await fetch(`${PUBMED_BASE_URL}/efetch.fcgi?${params}`);
    if (!response.ok) {
      throw new Error(`PubMed fetch failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    return this.parseArticlesXml(xml);
  }

  /**
   * Search and fetch in one call
   */
  async searchAndFetch(options: PubMedSearchOptions): Promise<PubMedArticle[]> {
    const searchResult = await this.search(options);
    if (searchResult.pmids.length === 0) return [];
    return this.fetchArticles(searchResult.pmids);
  }

  /**
   * Simple XML parsing for PubMed article data
   * Extracts key fields without a full DOM parser
   */
  parseArticlesXml(xml: string): PubMedArticle[] {
    const articles: PubMedArticle[] = [];

    // Split into individual article blocks
    const articleBlocks = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) ?? [];

    for (const block of articleBlocks) {
      try {
        const article: PubMedArticle = {
          pmid: this.extractTag(block, 'PMID') ?? '',
          title: this.extractTag(block, 'ArticleTitle') ?? '',
          abstract: this.extractAbstract(block),
          authors: this.extractAuthors(block),
          journal: this.extractTag(block, 'Title') ?? '',
          publicationDate: this.extractPubDate(block),
          doi: this.extractDoi(block),
          publicationTypes: this.extractTags(block, 'PublicationType'),
          meshTerms: this.extractMeshTerms(block),
          keywords: this.extractTags(block, 'Keyword'),
        };
        articles.push(article);
      } catch {
        // Skip malformed articles
      }
    }

    return articles;
  }

  private extractTag(xml: string, tag: string): string | undefined {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return match?.[1] ? this.cleanText(match[1]) : undefined;
  }

  private extractTags(xml: string, tag: string): string[] {
    const matches = xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'));
    return Array.from(matches).map(m => this.cleanText(m[1] ?? ''));
  }

  private extractAbstract(xml: string): string {
    const abstractBlock = xml.match(/<Abstract>[\s\S]*?<\/Abstract>/);
    if (!abstractBlock?.[0]) return '';

    const sections = abstractBlock[0].matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
    return Array.from(sections)
      .map(m => this.cleanText(m[1] ?? ''))
      .join('\n\n');
  }

  private extractAuthors(xml: string): PubMedAuthor[] {
    const authorBlocks = xml.matchAll(/<Author[^>]*>[\s\S]*?<\/Author>/g);
    return Array.from(authorBlocks).map(match => ({
      lastName: this.extractTag(match[0], 'LastName') ?? '',
      firstName: this.extractTag(match[0], 'ForeName') ?? '',
      initials: this.extractTag(match[0], 'Initials') ?? '',
      affiliation: this.extractTag(match[0], 'Affiliation'),
    }));
  }

  private extractPubDate(xml: string): string {
    const year = this.extractTag(xml, 'Year') ?? '';
    const month = this.extractTag(xml, 'Month') ?? '';
    const day = this.extractTag(xml, 'Day') ?? '';
    return [year, month, day].filter(Boolean).join('-');
  }

  private extractDoi(xml: string): string | undefined {
    const match = xml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
    return match?.[1]?.trim();
  }

  private extractMeshTerms(xml: string): string[] {
    const matches = xml.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g);
    return Array.from(matches).map(m => (m[1] ?? '').trim());
  }

  private cleanText(text: string): string {
    return text.replace(/<[^>]+>/g, '').trim();
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

/**
 * Create a PubMed client
 */
export function createPubMedClient(apiKey?: string): PubMedClient {
  return new PubMedClient({ apiKey });
}
