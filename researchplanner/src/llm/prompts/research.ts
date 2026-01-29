/**
 * Research Stage Prompts
 *
 * Prompt templates for literature research, evidence synthesis, and gap analysis.
 * Based on the QI/Research Project Development Pipeline specification.
 */

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export interface SearchStrategyInput {
  clinicalProblem: string;
  targetPopulation: string;
  intendedOutcomes: string;
  setting?: string;
  existingReferences?: string[];
}

export interface SearchStrategyOutput {
  pubmedQuery: string;
  semanticScholarQuery: string;
  cochraneQuery?: string;
  meshTerms: string[];
  keywords: string[];
  picoFramework: {
    population: string;
    intervention: string;
    comparison: string;
    outcome: string;
  };
  suggestedFilters: {
    dateRange: { start: string; end: string };
    studyTypes: string[];
    languages: string[];
  };
}

export interface ArticleRankingInput {
  articles: Array<{
    pmid?: string;
    doi?: string;
    title: string;
    authors: string[];
    journal: string;
    year: number;
    abstract: string;
  }>;
  researchQuestion: string;
  clinicalProblem: string;
  targetPopulation: string;
}

export interface RankedArticle {
  pmid?: string;
  doi?: string;
  title: string;
  relevanceScore: number;
  relevanceReasoning: string;
  keyFindings: string[];
  methodologyType: string;
  limitations: string[];
  applicability: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface EvidenceSynthesisInput {
  articles: RankedArticle[];
  researchQuestion: string;
  clinicalProblem: string;
  gapAnalysis?: string;
}

export interface GapAnalysisInput {
  articles: RankedArticle[];
  projectConcept: string;
  intendedOutcomes: string;
}

// -----------------------------------------------------------------------------
// System Prompts
// -----------------------------------------------------------------------------

export const RESEARCH_SYSTEM_PROMPT = `You are an expert research librarian and systematic reviewer specializing in emergency medicine and clinical research. You have extensive experience with:

- PubMed/MEDLINE search strategies and MeSH terminology
- Semantic Scholar and citation analysis
- Cochrane Library systematic reviews
- PRISMA guidelines for systematic literature reviews
- Critical appraisal of clinical research
- Evidence synthesis and gap analysis

Your role is to help clinicians identify, evaluate, and synthesize relevant literature for their QI and research projects. You provide rigorous, methodologically sound guidance while remaining practical for time-constrained healthcare professionals.

Always structure your responses as specified and provide clear, actionable outputs. When uncertain about relevance or quality, err on the side of inclusion and flag concerns for human review.`;

// -----------------------------------------------------------------------------
// Search Strategy Generation
// -----------------------------------------------------------------------------

/**
 * Generates a comprehensive literature search strategy
 */
export function generateSearchStrategyPrompt(input: SearchStrategyInput): string {
  return `Generate a comprehensive literature search strategy for the following research topic.

## Clinical Problem
${input.clinicalProblem}

## Target Population
${input.targetPopulation}

## Intended Outcomes
${input.intendedOutcomes}

${input.setting ? `## Clinical Setting\n${input.setting}\n` : ''}

${input.existingReferences?.length ? `## Known References\nThe researcher has identified these relevant papers:\n${input.existingReferences.join('\n')}\n` : ''}

## Task
Create a structured search strategy that includes:

1. **PICO Framework**: Break down the research question into Population, Intervention, Comparison, Outcome components

2. **PubMed Query**: A properly formatted PubMed search string using:
   - MeSH terms with appropriate subheadings
   - Free-text synonyms
   - Boolean operators (AND, OR, NOT)
   - Field tags ([tiab], [mesh], etc.)
   - Appropriate truncation (*)

3. **Semantic Scholar Query**: Natural language query optimized for Semantic Scholar's semantic search

4. **Cochrane Query**: If applicable, a search string for Cochrane Library

5. **MeSH Terms**: List of relevant MeSH terms to use

6. **Keywords**: Free-text keywords and synonyms

7. **Suggested Filters**: Recommended date range, study types, and language filters

Respond ONLY with valid JSON in this exact format:
\`\`\`json
{
  "pubmedQuery": "((term1[mesh] OR term2[tiab]) AND (term3[mesh] OR term4[tiab]))",
  "semanticScholarQuery": "natural language search query",
  "cochraneQuery": "cochrane search terms",
  "meshTerms": ["MeSH Term 1", "MeSH Term 2"],
  "keywords": ["keyword1", "keyword2", "synonym1"],
  "picoFramework": {
    "population": "Description of population",
    "intervention": "Description of intervention/exposure",
    "comparison": "Description of comparison if applicable",
    "outcome": "Description of outcome measures"
  },
  "suggestedFilters": {
    "dateRange": {
      "start": "YYYY",
      "end": "YYYY"
    },
    "studyTypes": ["Randomized Controlled Trial", "Systematic Review"],
    "languages": ["English"]
  }
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Article Ranking and Filtering
// -----------------------------------------------------------------------------

/**
 * Ranks and filters articles by relevance to the research question
 */
export function rankArticlesPrompt(input: ArticleRankingInput): string {
  const articlesJson = JSON.stringify(input.articles, null, 2);

  return `Evaluate and rank the following articles for relevance to the research question.

## Research Question / Clinical Problem
${input.clinicalProblem}

## Target Population
${input.targetPopulation}

## Articles to Evaluate
${articlesJson}

## Evaluation Criteria
For each article, assess:

1. **Relevance Score (0.0-1.0)**:
   - 0.9-1.0: Directly addresses the research question, same population
   - 0.7-0.89: Highly relevant, similar population or intervention
   - 0.5-0.69: Moderately relevant, related topic or population
   - 0.3-0.49: Tangentially relevant, may inform background
   - 0.0-0.29: Not relevant, exclude

2. **Key Findings**: Extract 2-3 main findings relevant to the research question

3. **Methodology Type**: Classify the study design (RCT, cohort, case-control, qualitative, etc.)

4. **Limitations**: Note any methodological limitations affecting applicability

5. **Applicability**: Rate applicability to the target setting (HIGH/MODERATE/LOW)

Respond ONLY with valid JSON array containing ranked articles:
\`\`\`json
[
  {
    "pmid": "12345678",
    "doi": "10.xxxx/xxxxx",
    "title": "Article Title",
    "relevanceScore": 0.85,
    "relevanceReasoning": "Explanation of relevance score...",
    "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
    "methodologyType": "Randomized Controlled Trial",
    "limitations": ["Limitation 1", "Limitation 2"],
    "applicability": "HIGH"
  }
]
\`\`\`

Sort articles by relevanceScore descending. Include all articles with relevanceScore >= 0.3.`;
}

// -----------------------------------------------------------------------------
// Evidence Synthesis
// -----------------------------------------------------------------------------

/**
 * Synthesizes evidence from ranked articles into a coherent narrative
 */
export function synthesizeEvidencePrompt(input: EvidenceSynthesisInput): string {
  const articlesJson = JSON.stringify(
    input.articles.map((a, i) => ({
      refNumber: i + 1,
      title: a.title,
      methodologyType: a.methodologyType,
      keyFindings: a.keyFindings,
      limitations: a.limitations,
      relevanceScore: a.relevanceScore
    })),
    null,
    2
  );

  return `Synthesize the following research evidence into a coherent literature review narrative.

## Research Question / Clinical Problem
${input.clinicalProblem}

## Ranked Articles (sorted by relevance)
${articlesJson}

${input.gapAnalysis ? `## Identified Knowledge Gaps\n${input.gapAnalysis}\n` : ''}

## Synthesis Requirements

Create an evidence synthesis that:

1. **Summarizes the current state of knowledge** on this topic
2. **Identifies consistent findings** across studies
3. **Notes areas of disagreement** or conflicting evidence
4. **Highlights methodological strengths and limitations** of the evidence base
5. **Identifies clear knowledge gaps** that the proposed project could address

## Writing Requirements

- Write in flowing prose paragraphs, NOT bullet points
- Use Vancouver citation style with numbered references [1], [2], etc.
- Maintain objective, scientific tone
- Maximum 1500 words
- Structure:
  1. Overview paragraph (current state of knowledge)
  2. Key findings (2-3 paragraphs organized thematically)
  3. Methodological considerations (1 paragraph)
  4. Knowledge gaps and implications (1-2 paragraphs)

Respond with the synthesis as markdown text:

\`\`\`markdown
## Evidence Synthesis

[Your synthesis text here with [1], [2] citations...]

### Key Themes

[Thematic summary...]

### Methodological Considerations

[Discussion of study quality and limitations...]

### Knowledge Gaps

[Identified gaps in the literature...]
\`\`\``;
}

// -----------------------------------------------------------------------------
// Gap Analysis
// -----------------------------------------------------------------------------

/**
 * Identifies knowledge gaps in the literature
 */
export function identifyGapsPrompt(input: GapAnalysisInput): string {
  const articlesJson = JSON.stringify(
    input.articles.map(a => ({
      title: a.title,
      methodologyType: a.methodologyType,
      keyFindings: a.keyFindings,
      limitations: a.limitations
    })),
    null,
    2
  );

  return `Analyze the following literature and identify knowledge gaps relevant to the proposed project.

## Project Concept
${input.projectConcept}

## Intended Outcomes
${input.intendedOutcomes}

## Available Literature
${articlesJson}

## Task
Identify and categorize knowledge gaps using this framework:

1. **Population Gaps**: Groups not adequately studied
2. **Intervention Gaps**: Approaches not tested or compared
3. **Outcome Gaps**: Important outcomes not measured
4. **Setting Gaps**: Healthcare settings not represented
5. **Methodological Gaps**: Study design limitations requiring better evidence

For each gap, assess:
- **Significance**: How important is addressing this gap?
- **Feasibility**: Can the proposed project address this gap?
- **Impact**: What would addressing this gap contribute?

Respond ONLY with valid JSON:
\`\`\`json
{
  "gaps": [
    {
      "category": "POPULATION | INTERVENTION | OUTCOME | SETTING | METHODOLOGICAL",
      "description": "Description of the knowledge gap",
      "currentEvidence": "What the literature currently shows",
      "significance": "HIGH | MODERATE | LOW",
      "feasibility": "HIGH | MODERATE | LOW",
      "potentialImpact": "Description of impact if addressed",
      "howProjectAddresses": "How the proposed project could fill this gap"
    }
  ],
  "overallAssessment": {
    "primaryGap": "The most significant gap this project should address",
    "noveltyStatement": "Statement of how this project contributes new knowledge",
    "strengthOfNeed": "HIGH | MODERATE | LOW",
    "justification": "Narrative justification for the project based on gaps"
  }
}
\`\`\``;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Parses the search strategy response
 */
export function parseSearchStrategyResponse(response: string): SearchStrategyOutput {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    const parsed = JSON.parse(jsonString.trim());
    return {
      pubmedQuery: parsed.pubmedQuery || '',
      semanticScholarQuery: parsed.semanticScholarQuery || '',
      cochraneQuery: parsed.cochraneQuery,
      meshTerms: Array.isArray(parsed.meshTerms) ? parsed.meshTerms : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      picoFramework: parsed.picoFramework || {
        population: '',
        intervention: '',
        comparison: '',
        outcome: ''
      },
      suggestedFilters: parsed.suggestedFilters || {
        dateRange: { start: '', end: '' },
        studyTypes: [],
        languages: ['English']
      }
    };
  } catch (error) {
    throw new Error(`Failed to parse search strategy response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses the ranked articles response
 */
export function parseRankedArticlesResponse(response: string): RankedArticle[] {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    const parsed = JSON.parse(jsonString.trim());
    if (!Array.isArray(parsed)) {
      throw new Error('Expected array of ranked articles');
    }
    return parsed.map(article => ({
      pmid: article.pmid,
      doi: article.doi,
      title: article.title || '',
      relevanceScore: typeof article.relevanceScore === 'number' ? article.relevanceScore : 0,
      relevanceReasoning: article.relevanceReasoning || '',
      keyFindings: Array.isArray(article.keyFindings) ? article.keyFindings : [],
      methodologyType: article.methodologyType || 'Unknown',
      limitations: Array.isArray(article.limitations) ? article.limitations : [],
      applicability: article.applicability || 'LOW'
    }));
  } catch (error) {
    throw new Error(`Failed to parse ranked articles response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extracts the evidence synthesis markdown from the response
 */
export function parseEvidenceSynthesisResponse(response: string): string {
  const markdownMatch = response.match(/```markdown\s*([\s\S]*?)\s*```/);
  if (markdownMatch?.[1]) {
    return markdownMatch[1].trim();
  }
  // If no markdown block, return the full response
  return response.trim();
}

/**
 * Parses the gap analysis response
 */
export function parseGapAnalysisResponse(response: string): {
  gaps: Array<{
    category: string;
    description: string;
    currentEvidence: string;
    significance: string;
    feasibility: string;
    potentialImpact: string;
    howProjectAddresses: string;
  }>;
  overallAssessment: {
    primaryGap: string;
    noveltyStatement: string;
    strengthOfNeed: string;
    justification: string;
  };
} {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch?.[1] ?? response;

  try {
    return JSON.parse(jsonString.trim());
  } catch (error) {
    throw new Error(`Failed to parse gap analysis response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Formats citations in Vancouver style
 */
export function formatVancouverCitation(article: {
  authors: string[];
  title: string;
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
}): string {
  // Format authors (first 6, then et al.)
  let authorString = '';
  if (article.authors && article.authors.length > 0) {
    if (article.authors.length <= 6) {
      authorString = article.authors.join(', ');
    } else {
      authorString = article.authors.slice(0, 6).join(', ') + ', et al';
    }
  }

  const title = article.title.replace(/\.$/, '');
  const year = article.year;
  const journal = article.journal;
  const volume = article.volume || '';
  const issue = article.issue ? `(${article.issue})` : '';
  const pages = article.pages || '';
  const doi = article.doi ? ` doi: ${article.doi}` : '';

  return `${authorString}. ${title}. ${journal}. ${year};${volume}${issue}:${pages}.${doi}`.trim();
}
