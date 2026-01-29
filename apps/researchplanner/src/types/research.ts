/**
 * Research stage types
 * Phase 2.7 - Research Type Definitions
 */

/**
 * Literature search strategy
 * Spec reference: Section 4.1.2
 */
export interface SearchStrategy {
  pubmed_query: string;
  semantic_query: string;
  cochrane_query?: string;
  mesh_terms: string[];
  keywords: string[];
  date_range: {
    start: string; // ISO date
    end: string; // ISO date
  };
  search_date: string; // ISO timestamp
  results_count: number;
}

/**
 * Processed research article
 * Spec reference: Section 4.1.2
 */
export interface ProcessedArticle {
  pmid?: string;
  doi?: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  relevance_score: number; // 0.0 - 1.0
  key_findings: string[];
  methodology_notes: string;
  limitations: string[];
  full_text_available: boolean;
}

/**
 * Knowledge gap analysis
 * Spec reference: Section 3.3.3
 */
export interface GapAnalysis {
  identified_gaps: {
    gap_type: 'knowledge' | 'methodology' | 'population' | 'intervention' | 'outcome';
    description: string;
    severity: 'minor' | 'moderate' | 'major';
    relevance_to_project: string;
  }[];
  opportunities: string[];
  recommendations: string[];
  overall_summary: string;
}

/**
 * Formatted citation
 * Spec reference: Section 3.3.3
 */
export interface Citation {
  article_id: string; // Reference to ProcessedArticle
  citation_number: number;
  formatted_citation: string; // Vancouver style
  citation_style: 'VANCOUVER' | 'APA' | 'HARVARD';
  bibtex?: string;
}

/**
 * Complete research results (Stage 2 output)
 * Spec reference: Section 3.3.3
 */
export interface ResearchResults {
  search_strategy: SearchStrategy;
  primary_literature: ProcessedArticle[]; // Relevance > 0.7
  secondary_literature: ProcessedArticle[]; // Relevance 0.4 - 0.7
  gap_analysis: GapAnalysis;
  evidence_synthesis: string; // Prose narrative (max 1500 words)
  citations: Citation[];
  background_draft?: string; // Draft background section for protocol
  evidence_table?: {
    article_id: string;
    study_design: string;
    sample_size: number;
    key_finding: string;
    quality_score?: number;
  }[];
}
