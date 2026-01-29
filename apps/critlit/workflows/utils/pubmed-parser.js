/**
 * PubMed XML Parser - Reference Implementation for n8n Code Nodes
 *
 * USAGE IN n8n:
 * 1. Copy the specific function(s) you need into an n8n Code node
 * 2. Import DOMParser if needed: const { DOMParser } = require('@xmldom/xmldom');
 * 3. Process input data using the functions below
 *
 * PubMed XML STRUCTURE OVERVIEW:
 *
 * The NCBI E-utilities API returns PubMed data in XML format with this hierarchy:
 *
 * <PubmedArticleSet>
 *   <PubmedArticle>
 *     <MedlineCitation>
 *       <PMID>12345678</PMID>
 *       <Article>
 *         <ArticleTitle>...</ArticleTitle>
 *         <Abstract>
 *           <AbstractText>...</AbstractText>  (may have multiple with Label attribute)
 *         </Abstract>
 *         <AuthorList>
 *           <Author>
 *             <LastName>...</LastName>
 *             <ForeName>...</ForeName>
 *             <Initials>...</Initials>
 *             <CollectiveName>...</CollectiveName>  (for organizational authors)
 *           </Author>
 *         </AuthorList>
 *         <Journal>
 *           <Title>...</Title>
 *           <JournalIssue>
 *             <PubDate>
 *               <Year>...</Year>
 *               <Month>...</Month>
 *             </PubDate>
 *           </JournalIssue>
 *         </Journal>
 *       </Article>
 *       <MeshHeadingList>
 *         <MeshHeading>
 *           <DescriptorName>...</DescriptorName>
 *         </MeshHeading>
 *       </MeshHeadingList>
 *       <KeywordList>
 *         <Keyword>...</Keyword>
 *       </KeywordList>
 *     </MedlineCitation>
 *     <PubmedData>
 *       <ArticleIdList>
 *         <ArticleId IdType="doi">...</ArticleId>
 *         <ArticleId IdType="pii">...</ArticleId>
 *         <ArticleId IdType="pmc">...</ArticleId>
 *       </ArticleIdList>
 *     </PubmedData>
 *   </PubmedArticle>
 * </PubmedArticleSet>
 *
 * KEY CONSIDERATIONS:
 * - Abstract may be missing entirely
 * - Abstract may be simple (single AbstractText) or structured (multiple with Label attributes)
 * - Authors may be individuals or CollectiveNames
 * - DOI is in PubmedData section, not MedlineCitation
 * - MeSH terms and Keywords may be absent
 * - Publication dates can be in various formats (Year only, Year-Month, etc.)
 */

/**
 * Main parser function - converts PubMed XML string to array of document objects
 *
 * @param {string} xmlString - Raw XML response from NCBI E-utilities
 * @returns {Array<Object>} Array of parsed article objects
 *
 * Example output:
 * [
 *   {
 *     pmid: "12345678",
 *     doi: "10.1234/example",
 *     title: "Article title",
 *     abstract: "Full abstract text or structured sections",
 *     authors: ["Smith J", "Doe A"],
 *     journal: "Journal Name",
 *     year: "2023",
 *     meshTerms: ["Term1", "Term2"],
 *     keywords: ["keyword1", "keyword2"]
 *   }
 * ]
 */
function parsePubMedXML(xmlString) {
  const { DOMParser } = require('@xmldom/xmldom');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Get all PubmedArticle nodes
  const articles = xmlDoc.getElementsByTagName('PubmedArticle');
  const results = [];

  // Process each article
  for (let i = 0; i < articles.length; i++) {
    try {
      const article = extractArticle(articles[i]);
      results.push(article);
    } catch (error) {
      console.error(`Error parsing article ${i}:`, error);
      // Continue processing other articles even if one fails
    }
  }

  return results;
}

/**
 * Extract fields from a single PubmedArticle node
 *
 * @param {Element} articleNode - Single <PubmedArticle> DOM element
 * @returns {Object} Parsed article data
 */
function extractArticle(articleNode) {
  // Helper to safely get text content from first matching element
  const getTextContent = (parent, tagName) => {
    const elements = parent.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent.trim() : '';
  };

  // Extract PMID (in MedlineCitation section)
  const pmid = getTextContent(articleNode, 'PMID');

  // Extract DOI (in PubmedData > ArticleIdList section)
  let doi = '';
  const articleIds = articleNode.getElementsByTagName('ArticleId');
  for (let i = 0; i < articleIds.length; i++) {
    if (articleIds[i].getAttribute('IdType') === 'doi') {
      doi = articleIds[i].textContent.trim();
      break;
    }
  }

  // Extract basic article metadata
  const title = getTextContent(articleNode, 'ArticleTitle');
  const journal = getTextContent(articleNode, 'Title'); // Journal Title, not ArticleTitle

  // Extract publication year
  const year = getTextContent(articleNode, 'Year');

  // Extract authors
  const authorLists = articleNode.getElementsByTagName('AuthorList');
  const authors = authorLists.length > 0 ? parseAuthors(authorLists[0]) : [];

  // Extract abstract (may be structured or simple)
  const abstractNodes = articleNode.getElementsByTagName('Abstract');
  const abstract = abstractNodes.length > 0 ? parseAbstract(abstractNodes[0]) : '';

  // Extract MeSH terms
  const meshTerms = [];
  const meshHeadings = articleNode.getElementsByTagName('MeshHeading');
  for (let i = 0; i < meshHeadings.length; i++) {
    const descriptor = getTextContent(meshHeadings[i], 'DescriptorName');
    if (descriptor) {
      meshTerms.push(descriptor);
    }
  }

  // Extract keywords
  const keywords = [];
  const keywordNodes = articleNode.getElementsByTagName('Keyword');
  for (let i = 0; i < keywordNodes.length; i++) {
    const keyword = keywordNodes[i].textContent.trim();
    if (keyword) {
      keywords.push(keyword);
    }
  }

  return {
    pmid,
    doi,
    title,
    abstract,
    authors,
    journal,
    year,
    meshTerms,
    keywords
  };
}

/**
 * Parse AuthorList node into array of formatted author names
 *
 * Format: "LastName Initials" (e.g., "Smith JA")
 * Handles both individual authors and collective names
 *
 * @param {Element} authorListNode - <AuthorList> DOM element
 * @returns {Array<string>} Array of formatted author names
 */
function parseAuthors(authorListNode) {
  const authors = [];
  const authorNodes = authorListNode.getElementsByTagName('Author');

  for (let i = 0; i < authorNodes.length; i++) {
    const authorNode = authorNodes[i];

    // Check for collective name (organizations, consortia)
    const collectiveNames = authorNode.getElementsByTagName('CollectiveName');
    if (collectiveNames.length > 0) {
      authors.push(collectiveNames[0].textContent.trim());
      continue;
    }

    // Extract individual author components
    const lastNameNodes = authorNode.getElementsByTagName('LastName');
    const initialsNodes = authorNode.getElementsByTagName('Initials');

    if (lastNameNodes.length > 0) {
      const lastName = lastNameNodes[0].textContent.trim();
      const initials = initialsNodes.length > 0
        ? initialsNodes[0].textContent.trim()
        : '';

      // Format as "LastName Initials"
      const fullName = initials ? `${lastName} ${initials}` : lastName;
      authors.push(fullName);
    }
  }

  return authors;
}

/**
 * Parse Abstract node - handles both simple and structured abstracts
 *
 * PubMed abstracts come in two formats:
 * 1. Simple: Single <AbstractText> with no Label attribute
 * 2. Structured: Multiple <AbstractText> elements with Label attributes
 *    (e.g., Label="BACKGROUND", Label="METHODS", Label="RESULTS")
 *
 * For structured abstracts, this combines sections with labels:
 * "BACKGROUND: text here. METHODS: text here."
 *
 * @param {Element} abstractNode - <Abstract> DOM element
 * @returns {string} Formatted abstract text
 */
function parseAbstract(abstractNode) {
  const abstractTexts = abstractNode.getElementsByTagName('AbstractText');

  if (abstractTexts.length === 0) {
    return '';
  }

  // Check if this is a structured abstract (has Label attributes)
  const hasLabels = abstractTexts.length > 1 ||
                    abstractTexts[0].getAttribute('Label');

  if (!hasLabels) {
    // Simple abstract - just return the text
    return abstractTexts[0].textContent.trim();
  }

  // Structured abstract - combine sections with labels
  const sections = [];
  for (let i = 0; i < abstractTexts.length; i++) {
    const section = abstractTexts[i];
    const label = section.getAttribute('Label');
    const text = section.textContent.trim();

    if (text) {
      if (label) {
        sections.push(`${label}: ${text}`);
      } else {
        sections.push(text);
      }
    }
  }

  return sections.join(' ');
}

/**
 * EXAMPLE n8n CODE NODE USAGE:
 *
 * // Assuming input data contains XML from previous HTTP Request node
 * const xmlString = $input.item.json.body; // Adjust based on your data structure
 *
 * // Parse the XML
 * const articles = parsePubMedXML(xmlString);
 *
 * // Return as n8n output items
 * return articles.map(article => ({ json: article }));
 */

// Export functions for use in other contexts (not needed in n8n)
module.exports = {
  parsePubMedXML,
  extractArticle,
  parseAuthors,
  parseAbstract
};
