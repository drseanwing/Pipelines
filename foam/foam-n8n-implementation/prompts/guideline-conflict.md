# Guideline Conflict Detection Prompt

## Objective

Identify potential conflicts between draft clinical content and established clinical practice guidelines to ensure recommendations align with current evidence-based best practice.

## Task

Analyze the provided draft clinical content and systematically compare it against major clinical practice guidelines to detect:
- Direct conflicts with guideline recommendations
- Omissions of key guideline-supported interventions
- Outdated or superseded references
- Regional practice variations
- Mismatches in recommendation strength

## Major Clinical Guidelines to Reference

### Resuscitation & Emergency Care
- **ILCOR** (International Liaison Committee on Resuscitation) - Latest consensus
- **ARC** (Australian Resuscitation Council) - Current guidelines
- **ERC** (European Resuscitation Council) - Current guidelines
- **AHA/ACLS** (American Heart Association) - Latest ACLS guidelines
- **ATLS** (Advanced Trauma Life Support) - Current edition

### Critical Care & Sepsis
- **Surviving Sepsis Campaign** - Latest international guidelines
- **Society of Critical Care Medicine (SCCM)** - Relevant guidelines
- **ESICM** (European Society of Intensive Care Medicine) - Relevant guidelines

### Cardiology
- **AHA/ACC** (American Heart Association/American College of Cardiology)
- **ESC** (European Society of Cardiology)
- **CSANZ** (Cardiac Society of Australia and New Zealand)

### Regional/National Guidelines
- **NICE** (National Institute for Health and Care Excellence, UK)
- **Therapeutic Guidelines** (Australia)
- **UpToDate** - Current clinical topics

### Specialty-Specific
- **ARDS Network** (mechanical ventilation)
- **EAST** (Eastern Association for the Surgery of Trauma)
- **ACEP** (American College of Emergency Physicians)
- **ACEM** (Australasian College for Emergency Medicine)

## Conflict Types to Identify

### 1. Direct Conflict
Draft recommendation directly contradicts guideline-supported practice.

**Example**: Draft recommends intervention X while guideline specifically recommends against it.

### 2. Omission
Draft fails to include key guideline-recommended intervention or consideration.

**Example**: Sepsis bundle missing one of the "Hour-1 Bundle" elements from SSC guidelines.

### 3. Outdated Reference
Draft cites or bases recommendations on superseded guidelines.

**Example**: Citing SSC 2016 when SSC 2021 has updated recommendations.

### 4. Regional Variation
Practice differs from international guidelines but reflects accepted regional practice.

**Example**: Use of metaraminol in Australian practice vs international norepinephrine preference.

### 5. Strength Mismatch
Draft presents weak evidence as strong recommendation or vice versa.

**Example**: Stating "always use X" when guideline says "may consider X" (Class IIb).

## Analysis Framework

For each clinical recommendation in the draft:

1. **Identify the recommendation**
   - Extract specific clinical action/intervention
   - Note the strength of recommendation language ("should", "consider", "may")

2. **Find relevant guidelines**
   - Identify applicable guidelines by topic area
   - Locate specific recommendations in latest versions
   - Note recommendation class and evidence level

3. **Compare and classify**
   - Determine if alignment exists
   - Classify any discrepancy by conflict type
   - Assess clinical significance

4. **Document context**
   - Note if regional variation explains difference
   - Consider if draft provides reasonable alternative approach
   - Identify if guideline is ambiguous or controversial

## Clinical Significance Rating

**HIGH**: Conflict involves patient safety, core intervention, or major clinical decision
- Example: Wrong drug dose, contraindicated intervention

**MEDIUM**: Conflict involves timing, preference, or adjunctive therapy
- Example: Missing consideration for subgroup, incomplete bundle

**LOW**: Conflict involves minor detail, presentation, or non-critical element
- Example: Wording difference with same clinical meaning

## Guideline Recommendation Classes

When citing guidelines that use classification systems:

### AHA/ACC Classification
- **Class I**: Strong recommendation - benefit >>> risk
- **Class IIa**: Moderate recommendation - benefit >> risk
- **Class IIb**: Weak recommendation - benefit ≥ risk
- **Class III**: No benefit - may be harmful

### Level of Evidence
- **Level A**: High-quality evidence from multiple RCTs or meta-analyses
- **Level B-R**: Moderate-quality evidence from RCTs
- **Level B-NR**: Moderate-quality evidence from non-randomized studies
- **Level C-LD**: Limited data from observational studies
- **Level C-EO**: Expert opinion

## Output Format

Provide results as structured JSON:

```json
{
  "conflict_summary": {
    "draft_title": "Title of draft content",
    "date_analyzed": "2026-01-25",
    "total_recommendations_checked": 35,
    "direct_conflicts": 1,
    "potential_conflicts": 3,
    "outdated_references": 2,
    "regional_variations": 4,
    "omissions": 2,
    "strength_mismatches": 1
  },
  "conflicts": [
    {
      "conflict_id": "conf-001",
      "conflict_type": "OMISSION",
      "clinical_significance": "MEDIUM",
      "draft_statement": "Target MAP 65-70 mmHg in all septic shock patients",
      "draft_location": "Section 3.2, Hemodynamic Targets",
      "guideline_source": "Surviving Sepsis Campaign 2021",
      "guideline_recommendation": "Target MAP ≥65 mmHg as initial goal; higher targets (e.g., 80-85 mmHg) may be considered in patients with chronic hypertension or atherosclerotic disease",
      "guideline_class": "Class IIb",
      "evidence_level": "Level C",
      "conflict_explanation": "Draft omits consideration of individualized MAP targets for patients with chronic hypertension, which SSC 2021 specifically addresses",
      "recommended_action": "Add statement: 'Consider higher MAP targets (80-85 mmHg) in patients with pre-existing hypertension or atherosclerotic disease'",
      "references": [
        "Evans L, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021. Intensive Care Med. 2021;47(11):1181-1247."
      ]
    },
    {
      "conflict_id": "conf-002",
      "conflict_type": "DIRECT_CONFLICT",
      "clinical_significance": "HIGH",
      "draft_statement": "Routine use of albumin for fluid resuscitation in septic shock",
      "draft_location": "Section 3.1, Fluid Resuscitation",
      "guideline_source": "Surviving Sepsis Campaign 2021",
      "guideline_recommendation": "Crystalloids are recommended as the fluid of choice for initial resuscitation and subsequent intravascular volume replacement (Strong recommendation, moderate quality of evidence)",
      "guideline_class": "Class I (Strong)",
      "evidence_level": "Moderate quality",
      "conflict_explanation": "Draft recommends albumin routinely, while SSC 2021 strongly recommends crystalloids as first choice",
      "recommended_action": "Revise to: 'Use crystalloids (e.g., 0.9% saline or balanced solutions) as first-line fluid. Albumin may be considered when patients require substantial amounts of crystalloids (Weak recommendation)'",
      "references": [
        "Evans L, et al. Surviving Sepsis Campaign 2021",
        "SAFE Study Investigators. N Engl J Med. 2004;350(22):2247-56"
      ]
    },
    {
      "conflict_id": "conf-003",
      "conflict_type": "OUTDATED",
      "clinical_significance": "MEDIUM",
      "draft_statement": "States 'based on SSC 2016 guidelines'",
      "draft_location": "Introduction, paragraph 2",
      "guideline_source": "Surviving Sepsis Campaign 2021",
      "guideline_recommendation": "Multiple updates in 2021 version including modified sepsis bundle timing, updated vasopressor recommendations",
      "conflict_explanation": "Draft references superseded 2016 guidelines when 2021 version available with significant updates",
      "recommended_action": "Update all references to SSC 2021 and review recommendations for changes",
      "references": [
        "Evans L, et al. Surviving Sepsis Campaign 2021"
      ]
    },
    {
      "conflict_id": "conf-004",
      "conflict_type": "STRENGTH_MISMATCH",
      "clinical_significance": "MEDIUM",
      "draft_statement": "Early procalcitonin testing should be performed in all sepsis patients",
      "draft_location": "Section 2.3, Diagnostics",
      "guideline_source": "Surviving Sepsis Campaign 2021",
      "guideline_recommendation": "No recommendation regarding use of procalcitonin to guide initiation of antibiotics (insufficient evidence)",
      "guideline_class": "No recommendation",
      "evidence_level": "Insufficient",
      "conflict_explanation": "Draft presents strong recommendation ('should') where guidelines provide no recommendation due to insufficient evidence",
      "recommended_action": "Soften language to: 'Procalcitonin testing may be considered to support diagnostic assessment but should not delay antibiotic initiation'",
      "references": [
        "Evans L, et al. Surviving Sepsis Campaign 2021"
      ]
    }
  ],
  "regional_variations": [
    {
      "variation_id": "reg-001",
      "topic": "First-line vasopressor agent",
      "draft_practice": "Metaraminol as initial vasopressor in ED setting",
      "international_guideline": "Norepinephrine as first-line vasopressor (SSC 2021, Strong recommendation)",
      "regional_context": "Metaraminol commonly used in Australian emergency departments for practical reasons (peripheral access, ease of preparation)",
      "is_conflict": false,
      "notes": "Represents accepted regional variation. Consider adding context about norepinephrine as gold standard with transition plan when central access obtained",
      "recommendation": "Acknowledge both practices: 'While norepinephrine is the evidence-based first choice (via central line), metaraminol via peripheral access is acceptable in the ED setting as bridge therapy'"
    },
    {
      "variation_id": "reg-002",
      "topic": "Fluid choice for resuscitation",
      "draft_practice": "Preference for Hartmann's/Plasma-Lyte over 0.9% saline",
      "international_guideline": "Either crystalloid option acceptable (SSC 2021)",
      "regional_context": "Balanced crystalloid preference based on SMART/SALT-ED trials and local practice",
      "is_conflict": false,
      "notes": "Draft aligns with emerging evidence favoring balanced solutions",
      "recommendation": "No change needed - practice aligned with guideline flexibility and recent evidence"
    }
  ],
  "omissions": [
    {
      "omission_id": "omit-001",
      "missing_element": "Lactate clearance target",
      "guideline_source": "Surviving Sepsis Campaign 2021",
      "guideline_recommendation": "Either lactate normalization or at least 10% reduction in lactate during initial resuscitation (Weak recommendation)",
      "clinical_significance": "MEDIUM",
      "recommended_action": "Add to monitoring section: 'Target lactate normalization or ≥10% reduction every 2-4 hours during initial resuscitation'",
      "draft_location": "Section 3.4, Monitoring"
    }
  ],
  "guideline_alignment_score": 87,
  "score_explanation": "Overall good alignment with major guidelines. Main issues: 1 direct conflict requiring revision, 2 omissions of guideline elements, 1 outdated reference. Regional variations appropriately reflect local practice.",
  "priority_actions": [
    "Address conf-002 (fluid choice) - HIGH priority direct conflict",
    "Update to SSC 2021 throughout",
    "Add individualized MAP targeting language",
    "Include lactate clearance target"
  ]
}
```

## Additional Considerations

### When Guidelines Disagree
If multiple authoritative guidelines provide conflicting recommendations:
- Note the disagreement explicitly
- Present evidence supporting each position
- Indicate which guideline is more recent or relevant to context
- Consider regional applicability

### Guideline Currency
- Always cite the most recent version with year
- Flag if draft uses guidelines >5 years old without justification
- Note when guidelines are currently under revision

### Evidence Strength
- Distinguish between strong recommendations (Class I, "should") and weak recommendations (Class IIb, "may consider")
- Note when draft language is stronger than evidence supports

### Practical Context
- Recognize that real-world practice may reasonably differ from guidelines
- Consider resource limitations in different settings
- Acknowledge legitimate clinical judgment within guidelines

## Quality Assurance

Before finalizing output:

1. ✓ Cross-referenced all major recommendations against current guidelines
2. ✓ Verified guideline versions are latest available
3. ✓ Classified conflicts appropriately by type
4. ✓ Assessed clinical significance accurately
5. ✓ Provided actionable recommendations for each conflict
6. ✓ Distinguished true conflicts from regional variations
7. ✓ Included proper citations for all guidelines referenced

## Example Use Case

**Input**: Draft sepsis management protocol for Australian ED

**Process**:
1. Extract all clinical recommendations (fluid type, vasopressor choice, antibiotic timing, etc.)
2. Compare against SSC 2021, ARC guidelines, ACEM position statements
3. Identify metaraminol use as regional variation (not conflict)
4. Flag missing lactate clearance target as omission
5. Note if antibiotic timing differs from Hour-1 Bundle

**Output**: Structured JSON with prioritized action items

## Notes for LLM Processing

- Be systematic: check every clinical recommendation in draft
- Be current: use only latest guideline versions
- Be specific: quote exact guideline text, not paraphrase
- Be contextual: distinguish conflicts from reasonable variations
- Be actionable: provide clear revision recommendations
- Be referenced: cite specific guideline sections and evidence levels
