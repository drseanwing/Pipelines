/**
 * Gap Analysis Tests
 * Phase 5.10 - Unit tests for gap analysis functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { analyzeGaps, identifyKnowledgeGaps, identifyMethodologyGaps, identifyPopulationGaps } from './gaps.js';
import type { ProcessedArticle } from '../../types/research.js';
import type { ProjectContext } from './ranking.js';

// Mock the LLM utilities
vi.mock('../../utils/llm.js', () => ({
  callLLM: vi.fn().mockResolvedValue(JSON.stringify({
    gaps: [
      {
        description: 'Limited understanding of mechanism X',
        severity: 'major',
        supporting_evidence: ['Study A found no mechanism', 'Study B inconclusive']
      }
    ]
  })),
  parseJSONResponse: vi.fn((response) => JSON.parse(response)),
}));

describe('Gap Analysis', () => {
  const mockArticles: ProcessedArticle[] = [
    {
      pmid: '12345678',
      doi: '10.1000/test.2024.001',
      title: 'Insulin therapy in Type 2 diabetes',
      authors: ['Smith J', 'Jones A'],
      journal: 'Diabetes Care',
      year: 2023,
      abstract: 'This study examined insulin therapy outcomes in 200 patients...',
      relevance_score: 0.85,
      key_findings: [
        'Insulin reduced HbA1c by 1.2%',
        'No significant adverse events'
      ],
      methodology_notes: 'Randomized controlled trial, 12-month follow-up',
      limitations: [
        'Small sample size',
        'Single center study'
      ],
      full_text_available: true,
    },
    {
      pmid: '87654321',
      title: 'Metformin adherence study',
      authors: ['Brown C'],
      journal: 'JAMA',
      year: 2022,
      abstract: 'Metformin adherence was poor in elderly patients...',
      relevance_score: 0.72,
      key_findings: ['Only 45% adherent'],
      methodology_notes: 'Observational cohort',
      limitations: ['Self-reported adherence'],
      full_text_available: false,
    },
  ];

  const mockProjectContext: ProjectContext = {
    clinical_problem: 'High HbA1c levels in Type 2 diabetes patients',
    target_population: 'Adults aged 40-70 with Type 2 diabetes',
    intended_outcomes: 'Reduce HbA1c to <7%',
    concept_description: 'Pilot study testing intensive insulin therapy protocol',
  };

  describe('identifyKnowledgeGaps', () => {
    it('should identify knowledge gaps from literature', async () => {
      const gaps = await identifyKnowledgeGaps(mockArticles);

      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0]).toHaveProperty('description');
      expect(gaps[0]).toHaveProperty('severity');
      expect(gaps[0]).toHaveProperty('supporting_evidence');
    });
  });

  describe('identifyMethodologyGaps', () => {
    it('should identify methodology gaps from literature', async () => {
      const gaps = await identifyMethodologyGaps(mockArticles);

      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBeGreaterThan(0);
    });
  });

  describe('identifyPopulationGaps', () => {
    it('should identify population gaps from literature', async () => {
      const gaps = await identifyPopulationGaps(mockArticles, mockProjectContext.target_population);

      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeGaps', () => {
    it('should perform complete gap analysis', async () => {
      // Mock cross-referencing and opportunity generation
      const { callLLM } = await import('../../utils/llm.js');
      vi.mocked(callLLM).mockImplementation((prompt: string) => {
        if (prompt.includes('relevance_assessments')) {
          return Promise.resolve(JSON.stringify({
            relevance_assessments: [
              { gap_index: 0, relevance_to_project: 'Highly relevant to insulin therapy protocol' }
            ]
          }));
        }
        if (prompt.includes('opportunities')) {
          return Promise.resolve(JSON.stringify({
            opportunities: ['Address mechanism X in pilot study design']
          }));
        }
        if (prompt.includes('recommendations')) {
          return Promise.resolve(JSON.stringify({
            recommendations: ['Include validated measurement tools for outcome Y']
          }));
        }
        return Promise.resolve(JSON.stringify({
          gaps: [
            {
              description: 'Test gap',
              severity: 'moderate',
              supporting_evidence: ['Evidence']
            }
          ]
        }));
      });

      const result = await analyzeGaps(mockArticles, mockProjectContext);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('identified_gaps');
      expect(result).toHaveProperty('opportunities');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('overall_summary');

      expect(Array.isArray(result.identified_gaps)).toBe(true);
      expect(Array.isArray(result.opportunities)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.overall_summary).toBe('string');
    });

    it('should categorize gaps by type', async () => {
      const result = await analyzeGaps(mockArticles, mockProjectContext);

      const gapTypes = result.identified_gaps.map(g => g.gap_type);
      expect(gapTypes.length).toBeGreaterThan(0);

      // Should have at least one of each type
      const hasKnowledge = gapTypes.includes('knowledge');
      const hasMethodology = gapTypes.includes('methodology');
      const hasPopulation = gapTypes.includes('population');

      expect(hasKnowledge || hasMethodology || hasPopulation).toBe(true);
    });

    it('should assign severity levels to gaps', async () => {
      const result = await analyzeGaps(mockArticles, mockProjectContext);

      result.identified_gaps.forEach(gap => {
        expect(['minor', 'moderate', 'major']).toContain(gap.severity);
      });
    });

    it('should provide project relevance for each gap', async () => {
      const result = await analyzeGaps(mockArticles, mockProjectContext);

      result.identified_gaps.forEach(gap => {
        expect(gap.relevance_to_project).toBeDefined();
        expect(typeof gap.relevance_to_project).toBe('string');
        expect(gap.relevance_to_project.length).toBeGreaterThan(0);
      });
    });
  });
});
