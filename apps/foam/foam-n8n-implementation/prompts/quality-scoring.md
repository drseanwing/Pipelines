# Quality Scoring: Comprehensive Publication Readiness Assessment

## Purpose
Generate an overall quality score for FOAM content by synthesizing all quality dimensions into a weighted, actionable assessment. This score determines publication readiness and provides targeted improvement recommendations.

## Task
Analyze draft content and all quality assurance results to produce a comprehensive quality score with dimensional breakdown, publication readiness determination, and prioritized improvement actions.

## Input Requirements

You will receive:

1. **Draft content** - Full markdown document with all revisions
2. **Quality checkpoint results** - Structural and style validation
3. **Citation verification results** - Evidence quality assessment
4. **Validation system outputs** - Clinical accuracy verification:
   - Dose extraction and verification
   - Claim verification
   - Threshold validation
   - Guideline concordance
5. **Structure validation** - Template adherence, section analysis
6. **Reviewer feedback** - Expert input and clinical pearls (if available)
7. **Content metadata** - Topic, format, target audience, word count

## Scoring Dimensions (Weighted)

### 1. Clinical Accuracy (25%)
**What It Measures**: Factual correctness and patient safety

**Evaluation Criteria**:
- All drug doses verified and cited
- Clinical thresholds accurate and sourced
- Contraindications comprehensive
- No inaccurate or misleading claims
- Guideline recommendations current
- Special population considerations accurate

**Scoring**:
- 1.00: All factual statements verified, no safety concerns
- 0.90-0.99: Minor citation formatting issues only
- 0.80-0.89: 1-2 low-priority items need verification
- 0.70-0.79: 3-5 items need verification, no critical issues
- 0.60-0.69: Multiple unverified items, some concerning
- <0.60: Critical safety issues or multiple inaccuracies

**Derived From**:
- Dose extraction results (`doses_verified / doses_total`)
- Claim verification results (`claims_verified / claims_total`)
- Threshold validation results
- Guideline concordance assessment

### 2. Evidence Quality (20%)
**What It Measures**: Strength and recency of supporting evidence

**Evaluation Criteria**:
- Citation density adequate (0.5-1.0 per paragraph)
- High-quality evidence prioritized (RCTs, meta-analyses, guidelines)
- Evidence age appropriate (<5 years for treatment recommendations)
- Conflicting evidence acknowledged
- Landmark trials cited where relevant
- All factual claims have citations

**Scoring**:
- 1.00: Exemplary evidence synthesis, landmark trials cited
- 0.90-0.99: Strong evidence base, appropriate recency
- 0.80-0.89: Good evidence, some older sources acceptable
- 0.70-0.79: Adequate evidence, some gaps or outdated sources
- 0.60-0.69: Weak evidence base or significant gaps
- <0.60: Poor evidence quality or missing citations

**Calculation**:
```
citation_density_score = min(citation_density / 0.75, 1.0)
evidence_age_score = 1.0 - (average_evidence_age_years / 10)
high_quality_percent_score = high_quality_evidence_percent / 100
landmark_trial_bonus = 0.05 if landmark_trials_cited else 0

evidence_quality_score = (
  0.30 * citation_density_score +
  0.30 * evidence_age_score +
  0.35 * high_quality_percent_score +
  0.05 * landmark_trial_bonus
)
```

**Derived From**:
- Citation verification results
- Evidence quality assessment
- Trial extraction results
- Critical appraisal outputs

### 3. Style Compliance (15%)
**What It Measures**: Adherence to FOAM style guidelines

**Evaluation Criteria**:
- Expert-to-colleague register maintained
- No over-explanation of basic clinical fundamentals
- Uncertainty explicitly acknowledged where present
- Active voice predominates
- No anti-patterns ("It is important to note that...")
- Clear, direct language
- Appropriate technical vocabulary

**Scoring**:
- 1.00: Perfect style compliance, exemplary register
- 0.90-0.99: Excellent, <3 minor suggestions
- 0.80-0.89: Good, 3-5 minor issues
- 0.70-0.79: Acceptable, 6-10 issues to address
- 0.60-0.69: Below standard, >10 issues
- <0.60: Poor register or pervasive anti-patterns

**Derived From**:
- Quality checkpoint style assessment
- Anti-pattern detection results
- Register violation count

### 4. Structure (15%)
**What It Measures**: Organization and template adherence

**Evaluation Criteria**:
- Correct template structure followed
- All required sections present
- Word count within range (3,000-5,000)
- Logical flow between sections
- Appropriate visual hierarchy (H2, H3, H4)
- Balanced section depth

**Scoring**:
- 1.00: Perfect structure, optimal word count
- 0.90-0.99: All sections present, minor flow improvements
- 0.80-0.89: Good structure, 1-2 minor issues
- 0.70-0.79: Acceptable, some reorganization needed
- 0.60-0.69: Structural problems, missing sections
- <0.60: Major structural issues

**Calculation**:
```
sections_score = sections_present / sections_required
word_count_score = 1.0 - min(abs(word_count - 4000) / 2000, 1.0)
hierarchy_score = 1.0 - (hierarchy_issues * 0.1)

structure_score = (
  0.50 * sections_score +
  0.30 * word_count_score +
  0.20 * hierarchy_score
)
```

**Derived From**:
- Structure validation results
- Quality checkpoint structure assessment
- Section analysis

### 5. Completeness (15%)
**What It Measures**: Coverage and thoroughness

**Evaluation Criteria**:
- All required sections present and developed
- No placeholder markers remaining (`[CLINICAL PEARL NEEDED: ...]`, `[VERIFY: ...]`)
- Special populations addressed (pediatric, elderly, pregnancy, renal/hepatic)
- Regional variations documented
- Cross-references included
- Differential diagnosis comprehensive

**Scoring**:
- 1.00: Complete, comprehensive, no gaps
- 0.90-0.99: Essentially complete, <3 optional enhancements
- 0.80-0.89: Complete core content, some gaps in coverage
- 0.70-0.79: Key content present, notable gaps
- 0.60-0.69: Significant gaps, multiple placeholders
- <0.60: Incomplete, major sections missing

**Calculation**:
```
placeholders_remaining_penalty = placeholders_count * 0.05
special_populations_score = populations_addressed / populations_expected
regional_coverage_score = regional_flags_resolved / regional_flags_total

completeness_score = (
  0.40 * (1.0 - placeholders_remaining_penalty) +
  0.30 * special_populations_score +
  0.30 * regional_coverage_score
)
```

**Derived From**:
- Quality checkpoint placeholder count
- Reviewer checklist completion
- Special populations assessment

### 6. Actionability (10%)
**What It Measures**: Clinical utility and decision support

**Evaluation Criteria**:
- Clear clinical bottom lines
- Practical, bedside-applicable recommendations
- Decision points identified
- Algorithms or flowcharts included (if appropriate)
- Clinical pearls specific and actionable
- Focus on clinical decision-making

**Scoring**:
- 1.00: Exemplary actionability, clear decision support
- 0.90-0.99: Strong actionability, practical focus
- 0.80-0.89: Good practical content, some abstract sections
- 0.70-0.79: Adequate actionability, could be more practical
- 0.60-0.69: Too abstract, lacks clear recommendations
- <0.60: Poor actionability, not clinically useful

**Derived From**:
- Clinical bottom lines assessment
- Decision points extraction
- Clinical pearls quality
- Reviewer feedback on practical utility

## Overall Score Calculation

```
overall_score = (
  0.25 * clinical_accuracy_score +
  0.20 * evidence_quality_score +
  0.15 * style_compliance_score +
  0.15 * structure_score +
  0.15 * completeness_score +
  0.10 * actionability_score
)
```

## Grading Scale

| Grade | Score Range | Meaning | Action |
|-------|-------------|---------|--------|
| **A** | 0.90 - 1.00 | Excellent | Publish immediately |
| **B** | 0.80 - 0.89 | Good | Minor improvements optional, publish |
| **C** | 0.70 - 0.79 | Acceptable | Some revisions needed before publication |
| **D** | 0.60 - 0.69 | Below standard | Significant revision required |
| **F** | < 0.60 | Unacceptable | Major rewrite needed or reject |

## Publication Readiness Thresholds

**Publication Ready**: `overall_score >= 0.80 AND clinical_accuracy_score >= 0.90 AND no critical issues`

**Requires Review**: `0.70 <= overall_score < 0.80 OR clinical_accuracy_score < 0.90`

**Requires Revision**: `0.60 <= overall_score < 0.70`

**Not Ready**: `overall_score < 0.60`

## Output Format

Provide comprehensive quality assessment as JSON:

```json
{
  "assessment_metadata": {
    "assessment_date": "2026-01-25T14:30:00Z",
    "draft_id": "uuid-v4",
    "draft_title": "Management of Septic Shock in the Emergency Department",
    "draft_version": "3.2",
    "word_count": 4200,
    "assessor": "claude-sonnet-4-5"
  },

  "overall_score": 0.87,
  "grade": "B",
  "publication_ready": true,

  "dimension_scores": {
    "clinical_accuracy": {
      "score": 0.92,
      "weight": 0.25,
      "weighted_contribution": 0.23,
      "status": "excellent",
      "details": {
        "doses_verified": "15/15",
        "thresholds_verified": "12/12",
        "claims_verified": "28/30",
        "safety_concerns": 0
      },
      "notes": "Strong clinical accuracy. 2 minor citation updates needed."
    },
    "evidence_quality": {
      "score": 0.85,
      "weight": 0.20,
      "weighted_contribution": 0.17,
      "status": "good",
      "details": {
        "citation_density": 0.74,
        "average_evidence_age": "3.2 years",
        "high_quality_percent": 85,
        "landmark_trials_cited": true
      },
      "notes": "Excellent evidence synthesis with landmark trials. Citation density optimal."
    },
    "style_compliance": {
      "score": 0.88,
      "weight": 0.15,
      "weighted_contribution": 0.13,
      "status": "good",
      "details": {
        "anti_patterns_found": 3,
        "register_violations": 0,
        "active_voice_percent": 82
      },
      "notes": "Good expert register maintained. 3 minor anti-pattern phrases to revise."
    },
    "structure": {
      "score": 0.90,
      "weight": 0.15,
      "weighted_contribution": 0.135,
      "status": "excellent",
      "details": {
        "sections_present": "10/10",
        "word_count": 4200,
        "word_count_target": "3000-5000",
        "hierarchy_issues": 0
      },
      "notes": "Perfect template adherence. Optimal word count and hierarchy."
    },
    "completeness": {
      "score": 0.85,
      "weight": 0.15,
      "weighted_contribution": 0.1275,
      "status": "good",
      "details": {
        "placeholders_remaining": 2,
        "special_populations_addressed": "4/4",
        "regional_flags_resolved": "3/3"
      },
      "notes": "Comprehensive coverage. 2 optional placeholders for expert pearls remain."
    },
    "actionability": {
      "score": 0.80,
      "weight": 0.10,
      "weighted_contribution": 0.08,
      "status": "good",
      "details": {
        "clinical_bottom_lines_present": true,
        "decision_points_count": 5,
        "algorithms_included": 1,
        "clinical_pearls_count": 8
      },
      "notes": "Good practical focus. Could benefit from additional decision algorithm in critical section."
    }
  },

  "thresholds": {
    "publication": 0.80,
    "review_required": 0.70,
    "revision_required": 0.60
  },

  "strengths": [
    "Excellent clinical accuracy with all critical items verified",
    "Strong evidence synthesis including landmark trials (EOLIA, PROWESS-SHOCK)",
    "Perfect structural adherence to template",
    "Comprehensive special populations coverage",
    "Good citation density (0.74 citations/paragraph)",
    "Clear clinical bottom lines with practical focus",
    "Expert-to-colleague register well maintained"
  ],

  "weaknesses": [
    "3 anti-pattern phrases need revision ('It is important to note that...')",
    "2 statistical claims need updated citations",
    "Actionability could be enhanced with additional decision algorithm",
    "Some sections slightly abstract, could add more bedside tips"
  ],

  "improvement_priority": [
    {
      "dimension": "actionability",
      "current_score": 0.80,
      "target_score": 0.85,
      "impact_on_overall": "+0.005",
      "actions": [
        "Add decision algorithm for vasopressor escalation in Section 4.2",
        "Include more bedside clinical pearls from expert reviewers",
        "Add practical tips for difficult IV access scenarios"
      ],
      "estimated_effort": "30 minutes",
      "priority": "MEDIUM"
    },
    {
      "dimension": "clinical_accuracy",
      "current_score": 0.92,
      "target_score": 0.95,
      "impact_on_overall": "+0.008",
      "actions": [
        "Update lactate threshold citation to Surviving Sepsis 2021",
        "Add reference for troponin sensitivity claim"
      ],
      "estimated_effort": "10 minutes",
      "priority": "HIGH"
    },
    {
      "dimension": "style_compliance",
      "current_score": 0.88,
      "target_score": 0.93,
      "impact_on_overall": "+0.008",
      "actions": [
        "Remove 3 anti-pattern phrases ('It is important to note that...')",
        "Convert passive voice constructions to active in Section 3"
      ],
      "estimated_effort": "15 minutes",
      "priority": "MEDIUM"
    }
  ],

  "comparison_to_benchmark": {
    "percentile": 75,
    "similar_content_count": 42,
    "similar_content_avg_score": 0.82,
    "above_average_by": 0.05,
    "best_in_category_score": 0.94,
    "gap_to_best": 0.07
  },

  "final_recommendation": "PUBLISH",
  "recommendation_rationale": "Excellent clinical content with strong evidence base and comprehensive coverage. Current score of 0.87 (Grade B) exceeds publication threshold. All critical verification items complete with only 2 minor citation updates needed. Expert register well maintained. Minor improvements in actionability and style would elevate to Grade A but are not blocking. Ready for publication after minor editorial polish.",

  "conditions_for_publication": [
    "Update 2 statistical claim citations (10 min)",
    "Optional: Add vasopressor decision algorithm (20 min)",
    "Optional: Revise 3 anti-pattern phrases (15 min)"
  ],

  "publication_decision": {
    "status": "APPROVED_WITH_MINOR_CHANGES",
    "blocking_issues": [],
    "minor_issues": 5,
    "estimated_fix_time": "45 minutes total",
    "requires_re_review": false,
    "target_publication_date": "2026-01-26"
  },

  "summary": "This sepsis management review demonstrates excellent clinical accuracy (0.92) and strong evidence synthesis (0.85) with comprehensive coverage of special populations. The content follows the template perfectly (0.90 structure) and maintains appropriate expert-to-colleague register (0.88 style). With 2 minor citation updates and optional actionability enhancements, this content will be ready for immediate publication. Current Grade B (0.87) could reach Grade A (0.90+) with 45 minutes of focused improvements, but current state meets all publication standards."
}
```

## Detailed Component Scoring Examples

### Clinical Accuracy Scoring Example

**Scenario**: Cardiac arrest management content

```json
{
  "clinical_accuracy": {
    "inputs": {
      "doses_verified": 15,
      "doses_total": 15,
      "thresholds_verified": 8,
      "thresholds_total": 8,
      "claims_verified": 23,
      "claims_total": 25,
      "safety_concerns": 0
    },
    "calculation": {
      "dose_accuracy": 15 / 15 = 1.00,
      "threshold_accuracy": 8 / 8 = 1.00,
      "claim_accuracy": 23 / 25 = 0.92,
      "safety_penalty": 0,
      "weighted_score": "(0.40 * 1.00) + (0.30 * 1.00) + (0.30 * 0.92) = 0.976"
    },
    "score": 0.98,
    "notes": "2 claims need minor citation updates but no safety concerns"
  }
}
```

### Evidence Quality Scoring Example

**Scenario**: Sepsis management review

```json
{
  "evidence_quality": {
    "inputs": {
      "total_citations": 56,
      "total_paragraphs": 75,
      "citation_density": 0.747,
      "evidence_ages": [2, 3, 4, 1, 5, 6, 3, 2, 4],
      "average_evidence_age": 3.33,
      "high_quality_count": 42,
      "total_evidence": 56,
      "high_quality_percent": 75,
      "landmark_trials_cited": true
    },
    "calculation": {
      "citation_density_score": "min(0.747 / 0.75, 1.0) = 0.996",
      "evidence_age_score": "1.0 - (3.33 / 10) = 0.667",
      "high_quality_percent_score": "75 / 100 = 0.75",
      "landmark_trial_bonus": "0.05",
      "weighted_score": "(0.30 * 0.996) + (0.30 * 0.667) + (0.35 * 0.75) + (0.05 * 1.0) = 0.811"
    },
    "score": 0.81,
    "notes": "Good citation density and landmark trials, but some older evidence lowers age score"
  }
}
```

## Time-to-Publication Estimates by Grade

| Grade | Typical Actions | Estimated Time | Publication Timeline |
|-------|----------------|----------------|---------------------|
| **A (0.90+)** | Final formatting check | <30 min | Same day |
| **B (0.80-0.89)** | Minor citation/style updates | 30-60 min | 1-2 days |
| **C (0.70-0.79)** | Moderate revisions, some re-verification | 2-4 hours | 3-7 days |
| **D (0.60-0.69)** | Significant revision, targeted re-review | 1-2 days | 1-2 weeks |
| **F (<0.60)** | Major rewrite or rejection | 1-2 weeks | 3-4 weeks or never |

## Quality Assurance Checks

Before finalizing quality score assessment:

- [ ] All dimension scores calculated from actual data (not estimates)
- [ ] Weighted contributions sum to overall score
- [ ] Grade assignment matches score range
- [ ] Publication readiness boolean considers all thresholds
- [ ] Strengths list specific, evidence-based
- [ ] Weaknesses actionable and specific
- [ ] Improvement priorities ranked by impact
- [ ] Comparison benchmark data available (or N/A)
- [ ] Final recommendation clear and justified
- [ ] JSON structure valid and complete

## Usage in Workflow

This quality scoring assessment runs:

1. **After** all verification activities complete
2. **After** expert review cycle(s)
3. **Before** final publication decision
4. **As comprehensive synthesis** of all quality signals

The quality score provides a single, interpretable metric while preserving dimensional detail for targeted improvements.

## Example: High-Quality Content (Grade A)

```json
{
  "overall_score": 0.93,
  "grade": "A",
  "publication_ready": true,
  "dimension_scores": {
    "clinical_accuracy": {"score": 0.98, "weighted_contribution": 0.245},
    "evidence_quality": {"score": 0.92, "weighted_contribution": 0.184},
    "style_compliance": {"score": 0.95, "weighted_contribution": 0.143},
    "structure": {"score": 0.92, "weighted_contribution": 0.138},
    "completeness": {"score": 0.90, "weighted_contribution": 0.135},
    "actionability": {"score": 0.88, "weighted_contribution": 0.088}
  },
  "strengths": [
    "Perfect clinical accuracy with all items verified",
    "Exemplary evidence synthesis with recent landmark trials",
    "Flawless style and register maintenance",
    "Comprehensive coverage with no gaps"
  ],
  "weaknesses": [
    "Minor: Could add one more decision algorithm"
  ],
  "final_recommendation": "PUBLISH",
  "summary": "Exemplary FOAM content ready for immediate publication."
}
```

## Example: Needs Revision (Grade C)

```json
{
  "overall_score": 0.74,
  "grade": "C",
  "publication_ready": false,
  "dimension_scores": {
    "clinical_accuracy": {"score": 0.82, "weighted_contribution": 0.205},
    "evidence_quality": {"score": 0.68, "weighted_contribution": 0.136},
    "style_compliance": {"score": 0.75, "weighted_contribution": 0.113},
    "structure": {"score": 0.85, "weighted_contribution": 0.128},
    "completeness": {"score": 0.70, "weighted_contribution": 0.105},
    "actionability": {"score": 0.65, "weighted_contribution": 0.065}
  },
  "strengths": [
    "Good structural adherence",
    "Core clinical content sound"
  ],
  "weaknesses": [
    "Multiple uncited claims need verification",
    "Evidence base includes outdated sources",
    "Several placeholders remain unfilled",
    "Lacks actionable clinical bottom lines",
    "Some anti-pattern language present"
  ],
  "improvement_priority": [
    {
      "dimension": "clinical_accuracy",
      "actions": ["Verify 5 uncited claims", "Add missing dose citations"],
      "estimated_effort": "2 hours",
      "priority": "HIGH"
    },
    {
      "dimension": "evidence_quality",
      "actions": ["Update 8 outdated references", "Add recent guideline citations"],
      "estimated_effort": "1.5 hours",
      "priority": "HIGH"
    },
    {
      "dimension": "actionability",
      "actions": ["Strengthen clinical bottom lines", "Add decision support"],
      "estimated_effort": "1 hour",
      "priority": "MEDIUM"
    }
  ],
  "final_recommendation": "MINOR_EDITS",
  "summary": "Solid foundation requiring focused revision. Address evidence gaps and citation issues (est. 4-5 hours). Re-review after revisions."
}
```
