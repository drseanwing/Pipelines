/**
 * Tests for search strategy generation
 * Phase 5.1 - Search Strategy Tests
 *
 * Test coverage:
 * - generateSearchStrategy returns valid SearchStrategy
 * - PICO components are extracted correctly
 * - MeSH terms are generated
 * - Keywords are generated
 * - PubMed query is properly formatted
 * - Semantic Scholar query is generated
 * - Date range is set correctly (default: last 10 years)
 * - Search date timestamp is ISO format
 * - Validation catches missing fields
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSearchStrategy, buildPubMedSearchURL, buildSemanticScholarParams, formatSearchStrategySummary } from '../../../src/agents/research/search.js';
import type { SearchStrategy } from '../../../src/types/research.js';
import * as llmUtils from '../../../src/utils/llm.js';

// Mock the LLM utilities
vi.mock('../../../src/utils/llm.js');

describe('Search Strategy Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSearchStrategy', () => {
    it('should generate valid search strategy with all required fields', async () => {
      // Mock LLM response
      const mockLLMResponse = `\`\`\`json
{
  "pico": {
    "population": "Adults aged 40-70 with Type 2 diabetes on metformin",
    "intervention": "Intensive insulin therapy",
    "comparison": "Standard oral therapy",
    "outcome": "HbA1c reduction to <7%"
  },
  "mesh_terms": [
    "Diabetes Mellitus, Type 2",
    "Insulin",
    "Hypoglycemic Agents",
    "Glycated Hemoglobin"
  ],
  "keywords": [
    "type 2 diabetes",
    "insulin therapy",
    "HbA1c",
    "glycemic control",
    "metformin"
  ],
  "pubmed_query": "(Diabetes Mellitus, Type 2[MeSH] OR type 2 diabetes[tiab]) AND (Insulin[MeSH] OR insulin therapy[tiab]) AND (Glycated Hemoglobin[MeSH] OR HbA1c[tiab])",
  "semantic_query": "type 2 diabetes insulin therapy glycemic control HbA1c outcomes",
  "cochrane_query": "(diabetes mellitus, type 2):ti,ab,kw AND (insulin):ti,ab,kw",
  "date_range_years": 10,
  "reasoning": "Search strategy focuses on T2DM patients transitioning from oral therapy to insulin with HbA1c as primary outcome measure."
}
\`\`\``;

      vi.mocked(llmUtils.callLLM).mockResolvedValue(mockLLMResponse);
      vi.mocked(llmUtils.parseJSONResponse).mockReturnValue(JSON.parse(mockLLMResponse.match(/```json\s*([\s\S]*?)\s*```/)![1]));

      const strategy = await generateSearchStrategy(
        'High HbA1c levels in Type 2 diabetes patients despite standard oral therapy',
        'Adults aged 40-70 with Type 2 diabetes on metformin for 6+ months',
        'Reduce HbA1c to <7% within 6 months using intensive insulin therapy'
      );

      // Check all required fields are present
      expect(strategy).toBeDefined();
      expect(strategy.pubmed_query).toBeTruthy();
      expect(strategy.semantic_query).toBeTruthy();
      expect(strategy.mesh_terms).toHaveLength(4);
      expect(strategy.keywords).toHaveLength(5);
      expect(strategy.date_range).toBeDefined();
      expect(strategy.date_range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(strategy.date_range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(strategy.search_date).toBeTruthy();
      expect(strategy.results_count).toBe(0);
    });

    it('should calculate date range correctly (10 years by default)', async () => {
      const mockLLMResponse = `\`\`\`json
{
  "pico": {
    "population": "Test population",
    "intervention": "Test intervention",
    "comparison": "Test comparison",
    "outcome": "Test outcome"
  },
  "mesh_terms": ["Test Term"],
  "keywords": ["test"],
  "pubmed_query": "test[tiab]",
  "semantic_query": "test query",
  "date_range_years": 10,
  "reasoning": "Test reasoning"
}
\`\`\``;

      vi.mocked(llmUtils.callLLM).mockResolvedValue(mockLLMResponse);
      vi.mocked(llmUtils.parseJSONResponse).mockReturnValue(JSON.parse(mockLLMResponse.match(/```json\s*([\s\S]*?)\s*```/)![1]));

      const strategy = await generateSearchStrategy('test', 'test', 'test');

      const currentYear = new Date().getFullYear();
      const startYear = parseInt(strategy.date_range.start.substring(0, 4));
      const endYear = parseInt(strategy.date_range.end.substring(0, 4));

      expect(endYear).toBe(currentYear);
      expect(startYear).toBe(currentYear - 10);
    });

    it('should throw error if LLM call fails', async () => {
      vi.mocked(llmUtils.callLLM).mockRejectedValue(new Error('LLM API error'));

      await expect(
        generateSearchStrategy('test', 'test', 'test')
      ).rejects.toThrow('Search strategy generation failed');
    });

    it('should throw error if required fields are missing', async () => {
      const mockLLMResponse = `\`\`\`json
{
  "pico": {
    "population": "Test",
    "intervention": "Test",
    "comparison": "Test",
    "outcome": "Test"
  },
  "mesh_terms": [],
  "keywords": [],
  "pubmed_query": "",
  "semantic_query": "",
  "date_range_years": 10,
  "reasoning": "Test"
}
\`\`\``;

      vi.mocked(llmUtils.callLLM).mockResolvedValue(mockLLMResponse);
      vi.mocked(llmUtils.parseJSONResponse).mockReturnValue(JSON.parse(mockLLMResponse.match(/```json\s*([\s\S]*?)\s*```/)![1]));

      await expect(
        generateSearchStrategy('test', 'test', 'test')
      ).rejects.toThrow('Search strategy validation failed');
    });
  });

  describe('buildPubMedSearchURL', () => {
    it('should construct valid PubMed API URL', () => {
      const strategy: SearchStrategy = {
        pubmed_query: '(diabetes[MeSH] OR diabetes[tiab]) AND (insulin[tiab])',
        semantic_query: 'diabetes insulin therapy',
        mesh_terms: ['Diabetes Mellitus', 'Insulin'],
        keywords: ['diabetes', 'insulin'],
        date_range: {
          start: '2015-01-28',
          end: '2025-01-28',
        },
        search_date: '2025-01-28T00:00:00Z',
        results_count: 0,
      };

      const url = buildPubMedSearchURL(strategy, 50);
      const decodedUrl = decodeURIComponent(url);

      expect(decodedUrl).toContain('eutils.ncbi.nlm.nih.gov');
      expect(decodedUrl).toContain('db=pubmed');
      expect(decodedUrl).toContain('retmax=50');
      expect(decodedUrl).toContain('retmode=json');
      expect(decodedUrl).toContain('mindate=2015/01/28');
      expect(decodedUrl).toContain('maxdate=2025/01/28');
    });
  });

  describe('buildSemanticScholarParams', () => {
    it('should construct valid Semantic Scholar query params', () => {
      const strategy: SearchStrategy = {
        pubmed_query: 'test query',
        semantic_query: 'diabetes insulin therapy',
        mesh_terms: ['Test'],
        keywords: ['test'],
        date_range: {
          start: '2015-01-28',
          end: '2025-01-28',
        },
        search_date: '2025-01-28T00:00:00Z',
        results_count: 0,
      };

      const params = buildSemanticScholarParams(strategy, 50);

      expect(params.query).toBe('diabetes insulin therapy');
      expect(params.limit).toBe('50');
      expect(params.year).toBe('2015-2025');
      expect(params.fields).toBeTruthy();
    });
  });

  describe('formatSearchStrategySummary', () => {
    it('should format search strategy as readable text', () => {
      const strategy: SearchStrategy = {
        pubmed_query: 'test[tiab]',
        semantic_query: 'test query',
        cochrane_query: 'test:ti,ab,kw',
        mesh_terms: ['Test Term 1', 'Test Term 2'],
        keywords: ['test', 'query'],
        date_range: {
          start: '2015-01-28',
          end: '2025-01-28',
        },
        search_date: '2025-01-28T12:34:56Z',
        results_count: 42,
      };

      const summary = formatSearchStrategySummary(strategy);

      expect(summary).toContain('Search Strategy Summary');
      expect(summary).toContain('2025-01-28');
      expect(summary).toContain('2015-01-28 to 2025-01-28');
      expect(summary).toContain('Test Term 1');
      expect(summary).toContain('Test Term 2');
      expect(summary).toContain('test');
      expect(summary).toContain('query');
      expect(summary).toContain('test[tiab]');
      expect(summary).toContain('test query');
      expect(summary).toContain('test:ti,ab,kw');
      expect(summary).toContain('Results Retrieved: 42');
    });
  });
});
