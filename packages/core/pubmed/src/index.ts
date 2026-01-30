/**
 * @pipelines/pubmed - PubMed eSearch/eFetch API client
 *
 * Provides PubMed search and article retrieval with XML parsing,
 * rate limiting, and structured output.
 */

import { XMLParser } from 'fast-xml-parser';

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
  private xmlParser: XMLParser;

  constructor(options?: { apiKey?: string }) {
    this.apiKey = options?.apiKey ?? process.env['NCBI_API_KEY'];
    this.minInterval = this.apiKey ? 100 : 334; // 10/s or 3/s
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: false,
      trimValues: true,
    });
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
   * Parse PubMed article XML using fast-xml-parser
   * Extracts key fields from structured XML
   */
  parseArticlesXml(xml: string): PubMedArticle[] {
    const parsed = this.xmlParser.parse(xml);
    const articles: PubMedArticle[] = [];

    const pubmedArticles = parsed?.PubmedArticleSet?.PubmedArticle;
    if (!pubmedArticles) return [];

    // Normalize to array
    const articleArray = Array.isArray(pubmedArticles) ? pubmedArticles : [pubmedArticles];

    for (const item of articleArray) {
      try {
        const medlineCitation = item?.MedlineCitation;
        if (!medlineCitation) continue;

        const article = medlineCitation?.Article;
        if (!article) continue;

        const pmid = this.getText(medlineCitation?.PMID) ?? '';
        const title = this.getText(article?.ArticleTitle) ?? '';
        const abstract = this.extractAbstract(article?.Abstract);
        const authors = this.extractAuthors(article?.AuthorList);
        const journal = this.getText(article?.Journal?.Title) ?? '';
        const pubDate = this.extractPubDate(article?.Journal?.JournalIssue?.PubDate);
        const doi = this.extractDoi(item?.PubmedData?.ArticleIdList);
        const publicationTypes = this.extractPublicationTypes(article?.PublicationTypeList);
        const meshTerms = this.extractMeshTerms(medlineCitation?.MeshHeadingList);
        const keywords = this.extractKeywords(medlineCitation?.KeywordList);

        articles.push({
          pmid,
          title,
          abstract,
          authors,
          journal,
          publicationDate: pubDate,
          doi,
          publicationTypes,
          meshTerms,
          keywords,
        });
      } catch {
        // Skip malformed articles
      }
    }

    return articles;
  }

  private getText(node: any): string | undefined {
    if (typeof node === 'string') return node.trim();
    if (node && typeof node === 'object' && '#text' in node) {
      return String(node['#text']).trim();
    }
    return undefined;
  }

  private extractAbstract(abstractNode: any): string {
    if (!abstractNode) return '';

    const abstractTexts = abstractNode?.AbstractText;
    if (!abstractTexts) return '';

    const texts = Array.isArray(abstractTexts) ? abstractTexts : [abstractTexts];
    return texts
      .map(node => this.getText(node) ?? '')
      .filter(Boolean)
      .join('\n\n');
  }

  private extractAuthors(authorList: any): PubMedAuthor[] {
    if (!authorList?.Author) return [];

    const authors = Array.isArray(authorList.Author) ? authorList.Author : [authorList.Author];
    return authors.map(author => ({
      lastName: this.getText(author?.LastName) ?? '',
      firstName: this.getText(author?.ForeName) ?? '',
      initials: this.getText(author?.Initials) ?? '',
      affiliation: this.getText(author?.AffiliationInfo?.Affiliation),
    }));
  }

  private extractPubDate(pubDate: any): string {
    if (!pubDate) return '';

    const year = this.getText(pubDate?.Year) ?? '';
    const month = this.getText(pubDate?.Month) ?? '';
    const day = this.getText(pubDate?.Day) ?? '';
    return [year, month, day].filter(Boolean).join('-');
  }

  private extractDoi(articleIdList: any): string | undefined {
    if (!articleIdList?.ArticleId) return undefined;

    const ids = Array.isArray(articleIdList.ArticleId) ? articleIdList.ArticleId : [articleIdList.ArticleId];
    const doiId = ids.find(id => id['@_IdType'] === 'doi');
    return this.getText(doiId);
  }

  private extractPublicationTypes(pubTypeList: any): string[] {
    if (!pubTypeList?.PublicationType) return [];

    const types = Array.isArray(pubTypeList.PublicationType)
      ? pubTypeList.PublicationType
      : [pubTypeList.PublicationType];
    return types.map(type => this.getText(type) ?? '').filter(Boolean);
  }

  private extractMeshTerms(meshList: any): string[] {
    if (!meshList?.MeshHeading) return [];

    const headings = Array.isArray(meshList.MeshHeading)
      ? meshList.MeshHeading
      : [meshList.MeshHeading];
    return headings
      .map(heading => this.getText(heading?.DescriptorName))
      .filter((term): term is string => Boolean(term));
  }

  private extractKeywords(keywordList: any): string[] {
    if (!keywordList?.Keyword) return [];

    const keywords = Array.isArray(keywordList.Keyword)
      ? keywordList.Keyword
      : [keywordList.Keyword];
    return keywords.map(kw => this.getText(kw) ?? '').filter(Boolean);
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
