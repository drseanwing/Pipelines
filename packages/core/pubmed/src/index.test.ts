import { describe, it, expect } from 'vitest';
import { PubMedClient, createPubMedClient } from './index.js';

describe('@pipelines/pubmed', () => {
  describe('PubMedClient', () => {
    it('creates a client', () => {
      const client = new PubMedClient();
      expect(client).toBeInstanceOf(PubMedClient);
    });

    it('creates a client with API key', () => {
      const client = new PubMedClient({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(PubMedClient);
    });
  });

  describe('createPubMedClient', () => {
    it('creates with factory function', () => {
      const client = createPubMedClient();
      expect(client).toBeInstanceOf(PubMedClient);
    });
  });

  describe('XML parsing', () => {
    it('parses article XML correctly', () => {
      const client = new PubMedClient();

      const xml = `
        <PubmedArticleSet>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>12345678</PMID>
              <Article>
                <ArticleTitle>Test Article Title</ArticleTitle>
                <Abstract>
                  <AbstractText>Test abstract content.</AbstractText>
                </Abstract>
                <AuthorList>
                  <Author>
                    <LastName>Smith</LastName>
                    <ForeName>John</ForeName>
                    <Initials>J</Initials>
                  </Author>
                </AuthorList>
                <Journal>
                  <Title>Test Journal</Title>
                </Journal>
              </Article>
            </MedlineCitation>
            <PubmedData>
              <ArticleIdList>
                <ArticleId IdType="doi">10.1000/test</ArticleId>
              </ArticleIdList>
            </PubmedData>
          </PubmedArticle>
        </PubmedArticleSet>
      `;

      const articles = client.parseArticlesXml(xml);
      expect(articles.length).toBe(1);
      expect(articles[0]!.pmid).toBe('12345678');
      expect(articles[0]!.title).toBe('Test Article Title');
      expect(articles[0]!.abstract).toBe('Test abstract content.');
    });

    it('handles empty XML', () => {
      const client = new PubMedClient();

      const articles = client.parseArticlesXml('<PubmedArticleSet></PubmedArticleSet>');
      expect(articles.length).toBe(0);
    });

    it('extracts multiple authors', () => {
      const client = new PubMedClient();

      const xml = `
        <PubmedArticleSet>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>99999</PMID>
              <Article>
                <ArticleTitle>Multi-Author Paper</ArticleTitle>
                <AuthorList>
                  <Author>
                    <LastName>Smith</LastName>
                    <ForeName>John</ForeName>
                    <Initials>J</Initials>
                    <AffiliationInfo>
                      <Affiliation>MIT</Affiliation>
                    </AffiliationInfo>
                  </Author>
                  <Author>
                    <LastName>Doe</LastName>
                    <ForeName>Jane</ForeName>
                    <Initials>JD</Initials>
                  </Author>
                </AuthorList>
                <Journal>
                  <Title>Nature</Title>
                </Journal>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
        </PubmedArticleSet>
      `;

      const articles = client.parseArticlesXml(xml);
      expect(articles[0]!.authors.length).toBe(2);
      expect(articles[0]!.authors[0]!.lastName).toBe('Smith');
      expect(articles[0]!.authors[0]!.affiliation).toBe('MIT');
      expect(articles[0]!.authors[1]!.lastName).toBe('Doe');
      expect(articles[0]!.authors[1]!.affiliation).toBeUndefined();
    });

    it('extracts DOI', () => {
      const client = new PubMedClient();

      const xml = `
        <PubmedArticleSet>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>11111</PMID>
              <Article>
                <ArticleTitle>DOI Paper</ArticleTitle>
                <Journal><Title>J</Title></Journal>
              </Article>
            </MedlineCitation>
            <PubmedData>
              <ArticleIdList>
                <ArticleId IdType="doi">10.1234/test.2024</ArticleId>
              </ArticleIdList>
            </PubmedData>
          </PubmedArticle>
        </PubmedArticleSet>
      `;

      const articles = client.parseArticlesXml(xml);
      expect(articles[0]!.doi).toBe('10.1234/test.2024');
    });
  });
});
