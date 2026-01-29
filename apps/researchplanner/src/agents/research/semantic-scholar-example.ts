/**
 * Semantic Scholar API Integration - Example Usage
 *
 * This file demonstrates how to use the Semantic Scholar API integration
 * for literature search and paper retrieval.
 *
 * Run with: npx tsx src/agents/research/semantic-scholar-example.ts
 */

import {
  searchSemanticScholar,
  getPaperDetails,
  getRelatedPapers,
  getRateLimiterUsage,
  type SemanticScholarPaper
} from './semantic-scholar.js';

/**
 * Example 1: Search for papers on a topic
 */
async function exampleSearch(): Promise<void> {
  console.log('\n=== Example 1: Search for papers ===\n');

  try {
    const query = 'quality improvement healthcare patient safety';
    const limit = 10;

    console.log(`Searching for: "${query}"`);
    console.log(`Limit: ${limit} papers\n`);

    const papers = await searchSemanticScholar(query, limit);

    console.log(`Found ${papers.length} papers:\n`);

    papers.slice(0, 5).forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.title}`);
      console.log(`   Authors: ${paper.authors.map(a => a.name).join(', ')}`);
      console.log(`   Year: ${paper.year || 'N/A'}`);
      console.log(`   Citations: ${paper.citationCount}`);
      console.log(`   DOI: ${paper.doi || 'N/A'}`);
      console.log(`   PMID: ${paper.pmid || 'N/A'}`);
      console.log(`   URL: ${paper.url}\n`);
    });

    // Show rate limiter usage
    const usage = getRateLimiterUsage();
    console.log(`Rate Limiter: ${usage.used}/${usage.limit} requests used`);
    if (usage.resetIn > 0) {
      console.log(`Resets in: ${Math.ceil(usage.resetIn / 1000)}s`);
    }

  } catch (error) {
    console.error('Search failed:', error);
  }
}

/**
 * Example 2: Get details for specific papers
 */
async function exampleGetPaperDetails(): Promise<void> {
  console.log('\n=== Example 2: Get paper details by ID ===\n');

  try {
    // Example paper IDs (these are real Semantic Scholar IDs)
    const paperIds = [
      '649def34f8be52c8b66281af98ae884c09aef38b', // A well-known ML paper
      '204e3073870fae3d05bcbc2f6a8e263d9b72e776'  // Another paper
    ];

    console.log('Fetching details for paper IDs:', paperIds, '\n');

    const papers = await getPaperDetails(paperIds);

    console.log(`Retrieved ${papers.length} papers:\n`);

    papers.forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.title}`);
      console.log(`   Paper ID: ${paper.paperId}`);
      console.log(`   Year: ${paper.year || 'N/A'}`);
      console.log(`   Citations: ${paper.citationCount}`);
      console.log(`   Venue: ${paper.venue || 'N/A'}`);
      if (paper.abstract) {
        console.log(`   Abstract: ${paper.abstract.substring(0, 200)}...`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Get paper details failed:', error);
  }
}

/**
 * Example 3: Get related papers (snowball search)
 */
async function exampleGetRelatedPapers(): Promise<void> {
  console.log('\n=== Example 3: Get related papers (snowball search) ===\n');

  try {
    // Start with a seed paper
    const seedPaperId = '649def34f8be52c8b66281af98ae884c09aef38b';

    console.log(`Finding papers related to: ${seedPaperId}\n`);

    const relatedPapers = await getRelatedPapers(seedPaperId);

    console.log(`Found ${relatedPapers.length} related papers:\n`);

    // Show top 5 most cited related papers
    const topCited = relatedPapers
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, 5);

    topCited.forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.title}`);
      console.log(`   Citations: ${paper.citationCount}`);
      console.log(`   Year: ${paper.year || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Get related papers failed:', error);
  }
}

/**
 * Example 4: Combined workflow - Search and expand
 */
async function exampleCombinedWorkflow(): Promise<void> {
  console.log('\n=== Example 4: Combined workflow ===\n');

  try {
    // Step 1: Search for initial papers
    console.log('Step 1: Initial search...');
    const query = 'PDSA cycle quality improvement';
    const initialPapers = await searchSemanticScholar(query, 5);
    console.log(`Found ${initialPapers.length} initial papers\n`);

    // Step 2: Get the most cited paper
    const topPaper = initialPapers.reduce((prev, current) =>
      current.citationCount > prev.citationCount ? current : prev
    );

    console.log(`Top cited paper: "${topPaper.title}"`);
    console.log(`Citations: ${topPaper.citationCount}\n`);

    // Step 3: Expand with related papers (snowball search)
    console.log('Step 2: Expanding with related papers...');
    const relatedPapers = await getRelatedPapers(topPaper.paperId);
    console.log(`Found ${relatedPapers.length} related papers\n`);

    // Step 4: Filter by relevance (citation count as proxy)
    const highlyRelevant = relatedPapers
      .filter(paper => paper.citationCount > 10)
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, 10);

    console.log(`Filtered to ${highlyRelevant.length} highly relevant papers:\n`);

    highlyRelevant.forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.title.substring(0, 80)}...`);
      console.log(`   Citations: ${paper.citationCount}, Year: ${paper.year}\n`);
    });

    // Show final rate limiter usage
    const usage = getRateLimiterUsage();
    console.log(`\nTotal API calls: ${usage.used}/${usage.limit}`);

  } catch (error) {
    console.error('Combined workflow failed:', error);
  }
}

/**
 * Run all examples
 */
async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Semantic Scholar API Integration - Example Usage            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Check for API key
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    console.log('\n✓ API key detected (higher rate limits available)');
  } else {
    console.log('\n⚠ No API key detected (100 requests per 5 minutes limit)');
    console.log('  Set SEMANTIC_SCHOLAR_API_KEY environment variable for higher limits');
  }

  // Run examples sequentially
  await exampleSearch();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause

  await exampleGetPaperDetails();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await exampleGetRelatedPapers();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await exampleCombinedWorkflow();

  console.log('\n✓ All examples completed successfully');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n✗ Example execution failed:', error);
    process.exit(1);
  });
}
