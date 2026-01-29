# Quality Checkpoint: Clinical Review Draft Validation

## Task
Evaluate a clinical review draft against the FOAM quality checklist before expert review. This checkpoint ensures the draft meets structural, evidential, and stylistic standards and is ready for clinical expert validation.

## Input Format

You will receive:

1. **Full draft markdown** - The complete clinical review document
2. **Section structure** - Outline of all sections present
3. **Evidence citations** - List of all references used (PMIDs, DOIs)
4. **Placeholders** - Count and location of expert input prompts

## Quality Checklist

Evaluate the draft against these criteria from IMPLEMENTATION_FRAMEWORK.md section 8.1:

### 1. Structure
- [ ] Correct template structure followed
- [ ] Word count within 3,000-5,000 range
- [ ] All required sections present:
  - Clinical Context
  - Key Controversies/Areas of Uncertainty
  - Evidence Review
  - Clinical Bottom Lines
  - References
- [ ] Appropriate visual hierarchy (H2, H3, H4 properly nested)
- [ ] Logical flow between sections
- [ ] Summary/abstract if required

### 2. Evidence Quality
- [ ] All factual claims have citations
- [ ] PMIDs or DOIs included for all peer-reviewed references
- [ ] Statistics include confidence intervals or p-values
- [ ] Evidence quality explicitly graded (e.g., "RCT showed...", "Case series suggest...")
- [ ] Guideline citations include society name and year
- [ ] No unsubstantiated claims
- [ ] Conflicting evidence acknowledged

**Critical Evidence Checks:**
- Drug doses cited to formulary or primary literature
- Clinical thresholds cite source (guidelines, trials, expert consensus)
- Diagnostic criteria reference official standards
- Time-sensitive protocols reference current guidelines

### 3. Style and Register
- [ ] Expert-to-colleague register maintained
- [ ] No over-explanation of basic clinical fundamentals
- [ ] Uncertainty explicitly acknowledged where present
- [ ] No hedging without informational content
- [ ] Clear, direct language
- [ ] Appropriate technical vocabulary
- [ ] Active voice predominates
- [ ] No unnecessary qualifiers

**Anti-patterns to detect:**
- "It is important to note that..." (state directly)
- "One should consider..." (use imperative: "Consider...")
- Over-explaining routine procedures
- Patronizing tone

### 4. Placeholders and Expert Prompts
- [ ] Clinical pearl placeholders marked clearly (`[CLINICAL PEARL NEEDED: ...]`)
- [ ] Expert input prompts present and specific
- [ ] Regional variation flags included (`[REGIONAL: ...]`)
- [ ] Verification items tagged (`[VERIFY: ...]`)

**Required placeholder types:**
- Clinical pearls from bedside experience
- Institution-specific protocol variations
- Regional practice differences
- Controversial areas needing expert opinion

### 5. Cross-References
- [ ] FOAMed resources linked (EMCrit, LITFL, etc.)
- [ ] Related existing FOAM content referenced
- [ ] Guidelines cited with society name and year
- [ ] Internal document cross-references functional
- [ ] External links valid and authoritative

### 6. Specific Validation Items

**Drug Doses:**
- Extract all dosing recommendations
- Flag for pharmacist verification
- Check units are explicit (mg/kg, mcg/min, etc.)
- Verify pediatric vs adult distinctions

**Clinical Thresholds:**
- Extract numeric cutoffs (e.g., "SBP <90 mmHg")
- Flag source requirement
- Check for context (population, setting)

**Guideline Concordance:**
- Major recommendations align with current guidelines
- Deviations from guidelines explicitly noted
- Guideline version/year included

**Contraindications/Warnings:**
- All major contraindications cited
- Black-box warnings included
- Pregnancy/lactation considerations present

## Output Format

Provide validation results as JSON:

```json
{
  "overall_pass": true,
  "word_count": 4200,
  "scores": {
    "structure": {
      "pass": true,
      "notes": "",
      "missing_sections": [],
      "hierarchy_issues": []
    },
    "evidence": {
      "pass": true,
      "notes": "",
      "uncited_claims": [
        {
          "claim": "exact quote from draft",
          "location": "section name",
          "severity": "major|minor"
        }
      ],
      "missing_citations": 0,
      "citation_format_issues": []
    },
    "style": {
      "pass": true,
      "notes": "",
      "register_violations": [],
      "anti_patterns_found": [
        {
          "pattern": "It is important to note that",
          "location": "line number or section",
          "suggestion": "Direct statement alternative"
        }
      ]
    },
    "placeholders": {
      "pass": true,
      "counts": {
        "clinical_pearls": 5,
        "expert_input": 3,
        "regional_variation": 2,
        "verification": 4
      },
      "notes": "Appropriate placeholder density for expert review"
    },
    "cross_references": {
      "pass": true,
      "notes": "",
      "broken_links": [],
      "missing_guideline_years": []
    }
  },
  "validation_items": [
    {
      "type": "dose",
      "content": "Amiodarone 300mg IV bolus",
      "location": "Cardiac Arrest Management section",
      "source": "AHA ACLS 2020",
      "requires_verification": true,
      "notes": "Verify current AHA dosing recommendations"
    },
    {
      "type": "threshold",
      "content": "MAP >65 mmHg target in septic shock",
      "location": "Hemodynamic Targets",
      "source": "Surviving Sepsis Guidelines 2021",
      "requires_verification": false,
      "notes": "Guidelines explicitly state this target"
    },
    {
      "type": "contraindication",
      "content": "Avoid NSAIDS in third trimester",
      "location": "Safety Considerations",
      "source": "needed",
      "requires_verification": true,
      "notes": "Add specific reference for this contraindication"
    }
  ],
  "issues_to_fix": [
    {
      "severity": "major|minor|style",
      "category": "structure|evidence|style|placeholders|cross_references",
      "issue": "Detailed description of the issue",
      "location": "Specific section or line reference",
      "recommendation": "Specific fix recommendation",
      "example": "Show correct approach if applicable"
    }
  ],
  "ready_for_expert_review": true,
  "recommendation": "APPROVE",
  "recommendation_rationale": "Draft meets all quality standards. Minor style improvements suggested but not blocking. All required placeholders present for expert input. Evidence appropriately cited with verification items flagged."
}
```

### Recommendation Categories

**APPROVE:**
- All major criteria met
- Minor issues only (style suggestions)
- Ready for expert clinical review
- Evidence properly cited
- Placeholders appropriate

**REVISE:**
- 1-3 moderate issues requiring fixes
- Missing some citations
- Structure needs adjustment
- Can be fixed in <1 hour
- Not ready for expert review yet

**MAJOR_REVISION:**
- Multiple major issues
- Significant uncited claims
- Structural problems
- Missing required sections
- Requires substantial rework before expert review

## Specific Checks to Perform

### Drug Dose Validation
For each medication mentioned:
1. Extract: drug name, dose, route, frequency
2. Check: units explicit, context clear (adult/peds, indication)
3. Flag: if source not cited or dose seems unusual
4. Note: requires pharmacist verification

### Threshold/Cutoff Validation
For each numeric threshold:
1. Extract: parameter, value, units, context
2. Check: source cited, population specified
3. Flag: if contradicts known guidelines
4. Note: cite specific guideline section

### Guideline Concordance
For major recommendations:
1. Identify: main clinical recommendations
2. Check: alignment with current standard guidelines
3. Flag: deviations from standard care
4. Verify: guideline citations include society and year

### Missing Evidence Detection
Scan for claims that typically require citation:
- "Studies show..." → requires specific study citation
- "Meta-analysis demonstrates..." → requires PMID
- "Guidelines recommend..." → requires society and year
- Numeric values → require source
- "Evidence suggests..." → requires evidence grade

### Placeholder Adequacy
Verify placeholders prompt for:
- Bedside experience insights
- Local protocol variations
- Controversial clinical decisions
- Practice pattern variations
- Equipment/resource considerations

## Example Validation Output

```json
{
  "overall_pass": false,
  "word_count": 3842,
  "scores": {
    "structure": {
      "pass": true,
      "notes": "All sections present, good hierarchy"
    },
    "evidence": {
      "pass": false,
      "notes": "Multiple uncited factual claims",
      "uncited_claims": [
        {
          "claim": "Mortality benefit demonstrated in several trials",
          "location": "Evidence Review - ECMO section",
          "severity": "major"
        },
        {
          "claim": "Most centers use a MAP target of 65 mmHg",
          "location": "Clinical Management",
          "severity": "minor"
        }
      ],
      "missing_citations": 5
    },
    "style": {
      "pass": true,
      "notes": "Generally good expert register",
      "anti_patterns_found": [
        {
          "pattern": "It is important to remember",
          "location": "Clinical Bottom Lines",
          "suggestion": "State directly: 'Remember to...'"
        }
      ]
    },
    "placeholders": {
      "pass": true,
      "counts": {
        "clinical_pearls": 4,
        "expert_input": 6,
        "regional_variation": 1,
        "verification": 3
      }
    },
    "cross_references": {
      "pass": true,
      "notes": "Good integration with existing FOAM resources"
    }
  },
  "validation_items": [
    {
      "type": "dose",
      "content": "Norepinephrine starting dose 0.05-0.1 mcg/kg/min",
      "location": "Vasopressor Management",
      "source": "needs citation",
      "requires_verification": true,
      "notes": "Standard dose but requires reference"
    }
  ],
  "issues_to_fix": [
    {
      "severity": "major",
      "category": "evidence",
      "issue": "Clinical claim without citation",
      "location": "Evidence Review - ECMO section",
      "recommendation": "Add specific trial citations (e.g., EOLIA trial PMID) or meta-analysis",
      "example": "'The EOLIA trial (PMID: 29791822) showed... However, mortality benefit remains controversial [2,3].'"
    },
    {
      "severity": "minor",
      "category": "style",
      "issue": "Unnecessary preamble phrase",
      "location": "Clinical Bottom Lines",
      "recommendation": "Remove 'It is important to remember' and state directly",
      "example": "Check electrolytes before... (not: It is important to remember to check...)"
    }
  ],
  "ready_for_expert_review": false,
  "recommendation": "REVISE",
  "recommendation_rationale": "Evidence issues need addressing before expert review. Multiple factual claims lack citations. Fix uncited claims (est. 30-45 min), then resubmit. Structure and style are good. Placeholders appropriately positioned."
}
```

## Usage in Workflow

This checkpoint runs:
1. **After** initial draft generation
2. **Before** expert review assignment
3. **After** revision cycles (if REVISE/MAJOR_REVISION)

The validation ensures experts receive high-quality drafts that require clinical input rather than structural/evidential fixes.
