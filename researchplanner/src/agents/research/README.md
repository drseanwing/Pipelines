# Research Agent Modules

This directory contains the research literature search integration modules for Phase 5 of the QI Research Pipeline.

## Modules

### cochrane.ts

Cochrane Library systematic review search integration.

**Key Functions:**

- `searchCochrane(query: string, limit?: number): Promise<CochraneReview[]>`
  - Searches Cochrane Library for systematic reviews
  - Implements graceful fallback if API is unavailable
  - Returns empty array on failure to allow pipeline continuation

- `parseCochraneResponse(response: any): CochraneReview[]`
  - Parses Cochrane API response format
  - Handles various response structures
  - Robust error handling for malformed data

- `cochraneToProcessedArticle(review: CochraneReview, relevanceScore?: number): ProcessedArticle`
  - Converts Cochrane review to standard ProcessedArticle format
  - Compatible with main research pipeline

- `convertCochraneReviews(reviews: CochraneReview[], baseRelevanceScore?: number): ProcessedArticle[]`
  - Batch conversion of Cochrane reviews

**Usage Example:**

```typescript
import { searchCochrane, convertCochraneReviews } from './cochrane.js';

// Search for systematic reviews
const reviews = await searchCochrane('diabetes management interventions', 50);

// Convert to ProcessedArticle format for pipeline
const articles = convertCochraneReviews(reviews, 0.85);

// Results can be merged with PubMed/Semantic Scholar results
```

**Error Handling:**

The module implements graceful degradation:
- API unavailable → logs warning, returns empty array
- Network timeout → logs warning, returns empty array
- Parse errors → logs warning, skips malformed items

This ensures the research pipeline can continue even if Cochrane access is restricted or unavailable.

**API Access Notes:**

Cochrane Library API may require:
- Institutional access/subscription
- API authentication credentials
- Rate limiting compliance

If access is unavailable, the module will log appropriate warnings but NOT fail the pipeline.

## Integration

These modules are used by the Research Agent workflow (Phase 5) to:

1. Generate search strategy (Phase 5.1)
2. Execute parallel searches across multiple sources (Phase 5.5)
3. Deduplicate and rank results (Phase 5.6, 5.7)
4. Process and synthesize evidence (Phase 5.8, 5.9)

See `TASKS.md` Phase 5 for complete workflow details.

### gaps.ts

Research gap identification and analysis module (Phase 5.10).

**Key Functions:**

- `analyzeGaps(articles: ProcessedArticle[], projectContext: ProjectContext): Promise<GapAnalysis>`
  - Main orchestration function for complete gap analysis
  - Identifies knowledge, methodology, and population gaps
  - Cross-references gaps with project concept
  - Generates opportunities and recommendations
  - Returns structured GapAnalysis object

- `identifyKnowledgeGaps(articles: ProcessedArticle[]): Promise<GapItem[]>`
  - Analyzes what is currently unknown in the research area
  - Identifies unanswered questions and unexplored phenomena
  - Detects unclear mechanisms and contested theories
  - Uses Claude Sonnet for gap detection

- `identifyMethodologyGaps(articles: ProcessedArticle[]): Promise<GapItem[]>`
  - Identifies study design limitations (lack of RCTs, etc.)
  - Detects measurement instrument gaps
  - Flags sample size and follow-up duration issues
  - Identifies missing control groups and standardized protocols

- `identifyPopulationGaps(articles: ProcessedArticle[], targetPopulation: string): Promise<GapItem[]>`
  - Detects underrepresented age groups (pediatric, geriatric)
  - Identifies sex/gender disparities in research
  - Flags underrepresented racial and ethnic minorities
  - Analyzes geographic and socioeconomic representation

- `crossReferenceWithProject(gaps: GapItem[], projectConcept: string): Promise<GapItem[]>`
  - Assesses gap relevance to specific project
  - Determines if gaps create research opportunities
  - Identifies potential challenges and limitations
  - Adds project-specific relevance context to each gap

- `generateOpportunities(gaps: GapItem[], projectContext: ProjectContext): Promise<string[]>`
  - Identifies specific research opportunities based on gaps
  - Determines novel contributions the project can make
  - Highlights competitive advantages
  - Returns actionable opportunity statements

- `generateRecommendations(gaps: GapItem[]): Promise<string[]>`
  - Generates methodological recommendations
  - Suggests population recruitment strategies
  - Provides intervention design considerations
  - Offers outcome measurement approaches

**Gap Categories:**

1. **Knowledge Gaps** - What is unknown or poorly understood
2. **Methodology Gaps** - Study design and measurement limitations
3. **Population Gaps** - Underrepresented or excluded populations
4. **Intervention Gaps** - Untested or underexplored interventions
5. **Outcome Gaps** - Missing or inadequate outcome measures

**Severity Levels:**

- **Minor** - Small gaps with limited impact
- **Moderate** - Important gaps affecting specific aspects
- **Major** - Critical gaps requiring significant attention

**Usage Example:**

```typescript
import { analyzeGaps } from './gaps.js';

const gapAnalysis = await analyzeGaps(processedArticles, {
  clinical_problem: 'High HbA1c despite standard therapy',
  target_population: 'Adults 40-70 with Type 2 diabetes',
  intended_outcomes: 'Reduce HbA1c to <7%',
  concept_description: 'Pilot study testing intensive insulin therapy...'
});

console.log(`Found ${gapAnalysis.identified_gaps.length} gaps`);
console.log(`Opportunities: ${gapAnalysis.opportunities.length}`);
console.log(`Recommendations: ${gapAnalysis.recommendations.length}`);

// Filter major gaps
const majorGaps = gapAnalysis.identified_gaps.filter(g => g.severity === 'major');

// Get knowledge gaps specifically
const knowledgeGaps = gapAnalysis.identified_gaps.filter(g => g.gap_type === 'knowledge');
```

**Output Structure:**

```typescript
interface GapAnalysis {
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
```

**LLM Model:**

Uses Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`) for:
- Creative gap identification (temperature: 0.7)
- Analytical relevance assessment (temperature: 0.5)
- Opportunity generation (temperature: 0.8)
- Recommendation synthesis (temperature: 0.7)

## Future Modules

Planned modules for this directory:
- Additional gap analysis refinements
- Evidence quality assessment
- Citation network analysis
