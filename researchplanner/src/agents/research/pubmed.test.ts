/**
 * PubMed API Integration Tests
 * Phase 5.2 - PubMed Module Testing
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { searchPubMed, fetchPubMedAbstracts, parsePubMedXML } from './pubmed.js';

// Sample XML response for testing parser
const sampleXML = `<?xml version="1.0" ?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2019//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_190101.dtd">
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <PMID Version="1">12345678</PMID>
      <Article PubModel="Print">
        <Journal>
          <ISSN IssnType="Print">1234-5678</ISSN>
          <JournalIssue CitedMedium="Print">
            <Volume>10</Volume>
            <Issue>3</Issue>
            <PubDate>
              <Year>2023</Year>
              <Month>Mar</Month>
            </PubDate>
          </JournalIssue>
          <Title>Test Journal of Medicine</Title>
          <ISOAbbreviation>Test J Med</ISOAbbreviation>
        </Journal>
        <ArticleTitle>Test Article Title About Diabetes Prevention</ArticleTitle>
        <Abstract>
          <AbstractText Label="BACKGROUND">This is the background section.</AbstractText>
          <AbstractText Label="METHODS">This is the methods section.</AbstractText>
          <AbstractText Label="RESULTS">This is the results section.</AbstractText>
          <AbstractText Label="CONCLUSIONS">This is the conclusions section.</AbstractText>
        </Abstract>
        <AuthorList CompleteYN="Y">
          <Author ValidYN="Y">
            <LastName>Smith</LastName>
            <ForeName>John</ForeName>
            <Initials>J</Initials>
          </Author>
          <Author ValidYN="Y">
            <LastName>Doe</LastName>
            <ForeName>Jane</ForeName>
            <Initials>J</Initials>
          </Author>
        </AuthorList>
        <PublicationTypeList>
          <PublicationType UI="D016428">Journal Article</PublicationType>
          <PublicationType UI="D016449">Randomized Controlled Trial</PublicationType>
        </PublicationTypeList>
      </Article>
      <MeshHeadingList>
        <MeshHeading>
          <DescriptorName UI="D003920" MajorTopicYN="N">Diabetes Mellitus</DescriptorName>
        </MeshHeading>
        <MeshHeading>
          <DescriptorName UI="D011322" MajorTopicYN="N">Primary Prevention</DescriptorName>
        </MeshHeading>
      </MeshHeadingList>
      <KeywordList Owner="NOTNLM">
        <Keyword MajorTopicYN="N">diabetes</Keyword>
        <Keyword MajorTopicYN="N">prevention</Keyword>
      </KeywordList>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">12345678</ArticleId>
        <ArticleId IdType="doi">10.1234/test.2023.001</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

describe('PubMed API Integration', () => {
  describe('parsePubMedXML', () => {
    it('should parse valid PubMed XML response', () => {
      const articles = parsePubMedXML(sampleXML);

      expect(articles).toHaveLength(1);

      const article = articles[0];
      expect(article).toBeDefined();
      if (article) {
        expect(article.pmid).toBe('12345678');
        expect(article.title).toBe('Test Article Title About Diabetes Prevention');
        expect(article.abstract).toContain('BACKGROUND: This is the background section');
        expect(article.abstract).toContain('METHODS: This is the methods section');
        expect(article.abstract).toContain('RESULTS: This is the results section');
        expect(article.abstract).toContain('CONCLUSIONS: This is the conclusions section');
        expect(article.authors).toEqual(['Smith John', 'Doe Jane']);
        expect(article.journal).toBe('Test Journal of Medicine');
        expect(article.year).toBe(2023);
        expect(article.doi).toBe('10.1234/test.2023.001');
        expect(article.publicationTypes).toContain('Journal Article');
        expect(article.publicationTypes).toContain('Randomized Controlled Trial');
        expect(article.meshTerms).toContain('Diabetes Mellitus');
        expect(article.meshTerms).toContain('Primary Prevention');
        expect(article.keywords).toContain('diabetes');
        expect(article.keywords).toContain('prevention');
        expect(article.journalIssue.volume).toBe('10');
        expect(article.journalIssue.issue).toBe('3');
        expect(article.journalIssue.pubDate).toBe('2023 Mar');
      }
    });

    it('should handle empty XML', () => {
      expect(() => parsePubMedXML('')).toThrow('XML content cannot be empty');
    });

    it('should handle invalid XML', () => {
      expect(() => parsePubMedXML('<invalid>xml</invalid>')).toThrow();
    });

    it('should handle empty article set', () => {
      const emptyXML = `<?xml version="1.0" ?>
        <PubmedArticleSet>
        </PubmedArticleSet>`;

      const articles = parsePubMedXML(emptyXML);
      expect(articles).toEqual([]);
    });
  });

  describe('searchPubMed', () => {
    it('should reject empty query', async () => {
      await expect(searchPubMed('')).rejects.toThrow('Search query cannot be empty');
    });

    it('should reject invalid retmax', async () => {
      await expect(searchPubMed('diabetes', 0)).rejects.toThrow('retmax must be between 1 and 10000');
      await expect(searchPubMed('diabetes', 10001)).rejects.toThrow('retmax must be between 1 and 10000');
    });

    // Note: Live API tests require internet connection and respect rate limits
    // Uncomment to test against real API (may be slow due to rate limiting)
    /*
    it('should search PubMed and return PMIDs', async () => {
      const pmids = await searchPubMed('diabetes prevention[Title]', 5);
      expect(Array.isArray(pmids)).toBe(true);
      expect(pmids.length).toBeGreaterThan(0);
      expect(pmids.length).toBeLessThanOrEqual(5);
    }, 10000); // 10 second timeout
    */
  });

  describe('fetchPubMedAbstracts', () => {
    it('should return empty array for empty PMID list', async () => {
      const articles = await fetchPubMedAbstracts([]);
      expect(articles).toEqual([]);
    });

    // Note: Live API tests require internet connection and respect rate limits
    // Uncomment to test against real API (may be slow due to rate limiting)
    /*
    it('should fetch article abstracts', async () => {
      // Using a known PMID for a real article
      const pmids = ['35525841']; // Example PMID
      const articles = await fetchPubMedAbstracts(pmids);

      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBeGreaterThan(0);

      const article = articles[0];
      if (article) {
        expect(article.pmid).toBeDefined();
        expect(article.title).toBeDefined();
        expect(article.authors.length).toBeGreaterThan(0);
        expect(article.year).toBeGreaterThan(1900);
      }
    }, 15000); // 15 second timeout
    */
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // This test ensures rate limiter is working
      const startTime = Date.now();

      // Make 3 rapid searches (should take at least 666ms at 3 req/sec without API key)
      const promises = [
        searchPubMed('test1', 1),
        searchPubMed('test2', 1),
        searchPubMed('test3', 1),
      ];

      try {
        await Promise.all(promises);
      } catch (error) {
        // API errors are expected in test environment
        // We're just testing rate limiting timing
      }

      const elapsed = Date.now() - startTime;

      // Should take at least 600ms for 3 requests (with some margin)
      // Note: This may fail if NCBI_API_KEY is set (allows 10 req/sec)
      if (!process.env['NCBI_API_KEY']) {
        expect(elapsed).toBeGreaterThanOrEqual(500);
      }
    }, 5000);
  });
});
