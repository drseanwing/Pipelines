# Feedback Processing Prompt

## Purpose
Process expert reviewer feedback from unstructured comments and checklist responses into structured, actionable revision instructions for draft content improvement.

## Task
Analyze reviewer feedback (free-form comments, checklist responses, annotations) and transform it into a structured JSON format that prioritizes changes, categorizes feedback types, and maps corrections to specific draft sections.

## Input Requirements

### 1. Original Draft Content
- Full draft markdown with section structure
- Inline citations and references
- Placeholders and verification items
- Draft metadata (topic, format, version)

### 2. Reviewer Feedback
**Checklist responses** (from reviewer-checklist.md workflow):
```json
{
  "clinical_accuracy": {
    "doses_to_verify": [...],
    "thresholds_to_confirm": [...],
    "claims_to_verify": [...],
    "guideline_alignment": [...]
  },
  "clinical_pearls_needed": [...],
  "regional_considerations": [...],
  "special_populations": [...],
  "content_completeness": {...},
  "reviewer_signoff": {...}
}
```

**Free-text comments**:
- Inline annotations on draft
- Section-level comments
- Overall assessment narrative
- Suggested rewording/additions

### 3. Reviewer Credentials
- Name and specialty
- Institution/affiliation
- Years of experience
- Regional context (if relevant)

## Processing Requirements

### A. Sentiment Analysis
Assess reviewer's overall tone and confidence:

**Sentiment categories**:
- `POSITIVE`: Approves draft, minor suggestions only
- `NEUTRAL`: Balanced feedback, significant but addressable issues
- `CRITICAL`: Major concerns, substantial revision needed
- `REJECTING`: Recommends against publication without major overhaul

**Indicators**:
- Positive: "Well done", "Accurate", "Clear", "Comprehensive"
- Neutral: "Consider adding", "Could be improved", "Missing"
- Critical: "Incorrect", "Misleading", "Major gap", "Needs revision"
- Rejecting: "Do not publish", "Fundamentally flawed", "Dangerous"

### B. Feedback Categorization

#### 1. CORRECTIONS (Must Fix)
**Patient safety critical**:
- Incorrect drug doses
- Wrong clinical thresholds
- Inaccurate statistical claims
- Guideline misrepresentation
- Contraindication errors

**Factual errors**:
- Incorrect trial results
- Wrong reference citations
- Outdated guideline versions
- Misattributed recommendations

**Confidence level assignment**:
- `HIGH`: Reviewer provides authoritative source correction
- `MEDIUM`: Reviewer states correction but suggests verification
- `LOW`: Reviewer questions accuracy but uncertain of correct value

#### 2. SUGGESTIONS (Consider)
**Content enhancement**:
- Additional context helpful
- Alternative phrasing clearer
- Expanded explanation needed
- Different organization suggested

**Teaching improvements**:
- Add practical tips
- Include common pitfalls
- Provide clinical examples
- Enhance visual aids (tables, algorithms)

**Evidence strengthening**:
- Cite additional supporting studies
- Update to more recent evidence
- Add guideline cross-reference
- Include meta-analysis data

#### 3. ADDITIONS (New Content)
**Clinical pearls**:
- Bedside practical tips
- Recognition pearls
- Common errors to avoid
- Expert techniques

**Missing content**:
- Expected sections not present
- Special populations underaddressed
- Important differential diagnoses omitted
- Key contraindications not mentioned

**Regional variations**:
- Local drug availability issues
- Practice pattern differences
- Resource constraints
- Institutional protocols

#### 4. CONFLICTS (Resolve)
When multiple reviewers provide contradictory feedback:
- Identify conflicting recommendations
- Note reviewer credentials for each position
- Flag for resolution discussion
- Suggest evidence-based resolution when possible

### C. Section Mapping
For each feedback item, identify:
- **Target section**: Which section of draft to modify
- **Action type**: Add, Modify, Delete, Reorder
- **Scope**: Sentence, Paragraph, Subsection, Full section
- **Location specificity**: Exact quote or general section reference

### D. Prioritization Logic

**Priority levels**:

**P0 - CRITICAL** (Must fix before publication):
- Patient safety errors (dose, contraindication, threshold)
- Factual inaccuracies contradicting evidence
- Guideline misrepresentation
- Statistical claim errors
- High-confidence reviewer corrections

**P1 - HIGH** (Should fix):
- Missing critical content
- Unclear/ambiguous clinical guidance
- Outdated evidence when newer exists
- Incomplete special population coverage
- Medium-confidence corrections

**P2 - MEDIUM** (Strongly consider):
- Clinical pearl additions
- Teaching enhancements
- Content organization improvements
- Additional context/examples
- Evidence strengthening

**P3 - LOW** (Optional enhancements):
- Style/wording preferences
- Non-critical additions
- Minor organizational tweaks
- Low-confidence suggestions

### E. Unanswered Questions Identification
Extract reviewer questions that require:
- Additional research
- Institutional protocol clarification
- Consultation with other specialists
- Follow-up literature search
- Clarification from guideline authors

## Output Format

Return a structured JSON object:

```json
{
  "processing_metadata": {
    "draft_id": "uuid-v4",
    "draft_version": "v1.0",
    "reviewer_id": "unique-reviewer-id",
    "reviewer_name": "Dr. Jane Smith",
    "reviewer_credentials": "MD, FRCPC, Emergency Medicine",
    "reviewer_specialty": "Emergency Medicine",
    "reviewer_institution": "Teaching Hospital, City, Country",
    "years_experience": 15,
    "regional_context": "North America",
    "review_date": "2026-01-25T14:30:00Z",
    "processing_date": "2026-01-25T15:00:00Z",
    "feedback_sources": ["checklist_json", "inline_comments", "summary_narrative"]
  },

  "feedback_summary": {
    "overall_assessment": "Draft is clinically accurate with minor gaps in special populations coverage. Excellent evidence integration. Needs expansion of pediatric dosing and addition of clinical pearls for practical implementation.",
    "reviewer_sentiment": "POSITIVE",
    "recommendation": "APPROVE_WITH_CHANGES",
    "confidence_in_review": "HIGH",
    "estimated_revision_time": "2-3 hours",
    "major_concerns": 0,
    "moderate_concerns": 3,
    "minor_suggestions": 12,
    "clinical_pearls_provided": 5
  },

  "corrections": [
    {
      "correction_id": "corr-001",
      "priority": "P0",
      "type": "dose_correction",
      "section": "Initial Management > Vasopressor Support",
      "draft_states": "Norepinephrine 0.05-0.1 mcg/kg/min",
      "correct_value": "Norepinephrine 0.05-0.3 mcg/kg/min",
      "rationale": "Draft states incorrect upper limit. SSC Guidelines 2021 recommend titrating up to 0.3 mcg/kg/min as needed.",
      "source": "Surviving Sepsis Campaign Guidelines 2021 (PMID: 34605781)",
      "confidence_level": "HIGH",
      "reviewer_note": "Common error - residents often think max dose is 0.1 but this is the starting range. Max is much higher.",
      "action_required": "UPDATE_VALUE",
      "patient_safety_critical": true
    },
    {
      "correction_id": "corr-002",
      "priority": "P1",
      "type": "statistical_claim",
      "section": "Evidence Review > Antibiotic Timing",
      "draft_states": "Each hour delay increases mortality by 7% (PMID: 16714767)",
      "correct_value": "Each hour delay in the first 6 hours associated with increased mortality (OR 1.07 per hour, 95% CI 1.04-1.10)",
      "rationale": "Draft oversimplifies. The 7% is an odds ratio increment, not absolute risk increase. Also, effect observed mainly in first 6 hours.",
      "source": "Kumar et al. Critical Care Medicine 2006 (PMID: 16714767)",
      "confidence_level": "HIGH",
      "reviewer_note": "Need to be precise about relative vs absolute risk and time window limitation",
      "action_required": "REWRITE_CLAIM",
      "patient_safety_critical": false
    }
  ],

  "suggestions": [
    {
      "suggestion_id": "sugg-001",
      "priority": "P2",
      "type": "content_enhancement",
      "section": "Physical Examination",
      "current_content": "Assess for signs of hypoperfusion: cool extremities, delayed capillary refill, mottling",
      "suggested_addition": "Add specific threshold: Capillary refill >3 seconds is abnormal. Mottling beyond the knees (Mottling Score ≥3) predicts higher mortality.",
      "rationale": "Specificity helps learners recognize abnormal findings. Mottling score is validated and useful.",
      "source": "PMID: 23920353 (Mottling score validation)",
      "confidence_level": "MEDIUM",
      "reviewer_note": "This is a high-yield bedside finding that residents miss. Making it concrete helps.",
      "action_required": "ADD_DETAIL",
      "estimated_value": "HIGH"
    },
    {
      "suggestion_id": "sugg-002",
      "priority": "P2",
      "type": "teaching_improvement",
      "section": "Fluid Resuscitation",
      "current_content": "Administer 30 mL/kg crystalloid within 3 hours",
      "suggested_modification": "Add context: For 70kg patient, this is ~2L. Give first liter rapidly (over 15-30 min), then reassess. Don't give all 30mL/kg automatically.",
      "rationale": "Residents often give full 30mL/kg bolus without reassessment, causing volume overload. Need to emphasize dynamic reassessment.",
      "source": "Clinical experience - common trainee error",
      "confidence_level": "HIGH",
      "reviewer_note": "I see this mistake weekly. Emphasizing reassessment is key teaching point.",
      "action_required": "ADD_CLINICAL_CONTEXT",
      "estimated_value": "HIGH"
    }
  ],

  "clinical_pearls": [
    {
      "pearl_id": "pearl-001",
      "priority": "P2",
      "section": "Initial Assessment",
      "topic": "Early sepsis recognition in elderly",
      "pearl_type": "Common pitfall",
      "pearl_content": "Elderly patients with sepsis often present WITHOUT fever (up to 30% afebrile). Instead, look for new confusion, unexplained tachypnea, or functional decline. Hypothermia (<36°C) in elderly is actually a red flag for severe infection.",
      "clinical_context": "Atypical presentations cause delayed recognition",
      "teaching_value": "HIGH",
      "source": "Clinical observation + PMID: 9187234",
      "reviewer_note": "This is the #1 cause of missed sepsis in ED. Worth highlighting prominently.",
      "integration_point": "Add to 'Recognition' or 'Special Populations > Elderly' section"
    },
    {
      "pearl_id": "pearl-002",
      "priority": "P2",
      "section": "Vasopressor Support",
      "topic": "Peripheral vasopressor administration",
      "pearl_type": "Practical technique",
      "pearl_content": "Norepinephrine can be given peripherally if central access delayed. Use large-bore peripheral IV (18G or larger) in the antecubital fossa. Safe for up to 24 hours while arranging central line. Don't delay vasopressors waiting for central access.",
      "clinical_context": "Residents often delay vasopressor for CVC insertion",
      "teaching_value": "HIGH",
      "source": "PMID: 30521766 (safety study)",
      "reviewer_note": "Common knowledge gap. Residents think they need CVC first. This is outdated.",
      "integration_point": "Add to 'Vasopressor Support' section as practical pearl box"
    }
  ],

  "additions": [
    {
      "addition_id": "add-001",
      "priority": "P1",
      "type": "missing_content",
      "section": "NEW SECTION NEEDED",
      "suggested_section_title": "Pediatric Considerations",
      "content_needed": [
        "Weight-based dosing for all key medications",
        "Age-specific vital sign thresholds (HR, BP, RR)",
        "Pediatric fluid bolus dosing (20 mL/kg vs 30 mL/kg)",
        "PEWS score or similar pediatric sepsis recognition tool"
      ],
      "rationale": "Draft completely lacks pediatric guidance. EM physicians manage pediatric sepsis regularly.",
      "priority_justification": "HIGH priority - patient safety issue. Pediatric doses differ significantly.",
      "estimated_length": "300-400 words",
      "reviewer_note": "Can provide pediatric dosing table if helpful",
      "action_required": "CREATE_NEW_SECTION"
    },
    {
      "addition_id": "add-002",
      "priority": "P2",
      "type": "regional_variation",
      "section": "Antibiotic Selection",
      "region": "Australia/New Zealand",
      "variation_content": "In Australia, gentamicin (7 mg/kg) + benzylpenicillin (2.4g) is common empiric regimen for community-acquired sepsis. Piperacillin-tazobactam less commonly used than North America.",
      "rationale": "Drug availability and practice patterns differ regionally",
      "action_required": "ADD_REGIONAL_NOTE",
      "reviewer_note": "Consider adding regional variation callout boxes"
    }
  ],

  "section_updates": [
    {
      "section_id": "sect-update-001",
      "section_name": "Hemodynamic Targets",
      "update_type": "EXPAND",
      "current_length_words": 120,
      "recommended_length_words": 250,
      "gaps_identified": [
        "No mention of individualized MAP targets for chronic hypertension",
        "Missing guidance on when to TARGET higher MAP (e.g., 75-85 mmHg)",
        "No discussion of SEPSISPAM trial findings"
      ],
      "specific_additions": [
        "Add: Patients with chronic hypertension may need MAP >75 mmHg",
        "Reference SEPSISPAM trial (PMID: 24635770) - higher MAP target didn't improve outcomes overall",
        "Mention: Consider higher target if evidence of poor perfusion despite MAP 65"
      ],
      "priority": "P1",
      "reviewer_note": "This section exists but is too superficial. Needs nuance."
    },
    {
      "section_id": "sect-update-002",
      "section_name": "Antibiotic Selection",
      "update_type": "REORGANIZE",
      "current_structure": "Listed by drug class",
      "recommended_structure": "Organized by suspected source (pneumonia, urinary, abdominal, skin/soft tissue, unknown)",
      "rationale": "Source-based organization more clinically useful at bedside",
      "priority": "P2",
      "reviewer_note": "Current organization is pharmacologically logical but clinically awkward. Clinicians think by source."
    }
  ],

  "conflicts_with_other_reviews": [],

  "unanswered_questions": [
    {
      "question_id": "q-001",
      "question": "What is the institutional protocol for activating sepsis team at your hospital?",
      "context": "Draft doesn't address local activation protocols",
      "requires": "Institutional policy clarification",
      "suggested_approach": "Add placeholder for institutional protocol link",
      "priority": "P3",
      "reviewer_note": "This varies by institution. May not need to specify in general FOAM content."
    },
    {
      "question_id": "q-002",
      "question": "Should we recommend procalcitonin-guided antibiotic duration?",
      "context": "Emerging evidence but not standard practice everywhere",
      "requires": "Additional literature review + expert consensus",
      "suggested_approach": "Brief mention as emerging practice with citation",
      "priority": "P2",
      "reviewer_note": "Procalcitonin use is controversial. Worth noting but don't mandate."
    }
  ],

  "verification_confirmations": [
    {
      "item_id": "dose-001",
      "item_type": "dose",
      "draft_value": "Amiodarone 300mg IV bolus",
      "verified": true,
      "verified_correct": true,
      "source_confirmed": "AHA ACLS Guidelines 2020",
      "reviewer_note": "Correct dose and source"
    },
    {
      "item_id": "threshold-003",
      "item_type": "threshold",
      "draft_value": "Lactate >4 mmol/L indicates severe hypoperfusion",
      "verified": true,
      "verified_correct": true,
      "source_confirmed": "SSC Guidelines 2021",
      "reviewer_note": "Accurate threshold. Could also mention >2 is abnormal and requires attention."
    }
  ],

  "processing_notes": {
    "total_feedback_items": 42,
    "items_categorized": 42,
    "uncategorizable_items": 0,
    "ambiguous_feedback": [
      {
        "feedback": "Could be clearer",
        "section": "Fluid Responsiveness",
        "note": "Non-specific comment. Flagged for clarification if needed."
      }
    ],
    "reviewer_response_completeness": "98%",
    "checklist_items_answered": "67 of 68",
    "processing_confidence": "HIGH"
  },

  "next_steps": {
    "immediate_actions": [
      "Fix P0 corrections (2 items, est. 15 min)",
      "Review and implement P1 corrections and additions (5 items, est. 90 min)"
    ],
    "consider_for_next_revision": [
      "Implement P2 suggestions and pearls (15 items, est. 60 min)",
      "Reorganize antibiotic section as suggested"
    ],
    "optional_enhancements": [
      "Add regional variation callout boxes (P3)",
      "Expand discussion of procalcitonin use (P3)"
    ],
    "requires_additional_review": [
      "Pediatric section addition - may want pediatric EM specialist review",
      "Procalcitonin guidance - consult infectious disease?"
    ]
  }
}
```

## Special Processing Rules

### 1. Dose/Threshold Corrections
For any numerical correction:
- Extract both incorrect and correct values with units
- Note source for correct value (guideline, PMID)
- Assess confidence level
- Always mark P0 if patient safety critical

### 2. Clinical Pearl Integration
For each pearl provided:
- Identify appropriate section for integration
- Categorize pearl type (practical technique, common pitfall, recognition tip, clinical reasoning)
- Assess teaching value
- Note if pearl requires citation or is experiential knowledge

### 3. Evidence Updates
When reviewer provides newer evidence:
- Compare publication dates
- Assess if newer evidence contradicts or supplements
- Note if guideline version outdated
- Flag for evidence level comparison

### 4. Ambiguity Handling
When feedback is vague or unclear:
- Flag in `ambiguous_feedback` array
- Provide best interpretation
- Note need for clarification
- Suggest follow-up question

### 5. Conflict Detection
When processing multiple reviews:
- Compare recommendations across reviewers
- Identify contradictions
- Note reviewer credentials for each position
- Flag for editorial resolution
- Suggest evidence-based tiebreaker when possible

## Confidence Level Criteria

**HIGH Confidence**:
- Reviewer cites authoritative source
- Reviewer has direct expertise in specific topic
- Correction is well-documented
- Multiple reviewers agree

**MEDIUM Confidence**:
- Reviewer suggests verification needed
- Based on clinical experience without citation
- Single reviewer opinion
- Reasonable suggestion but not definitive

**LOW Confidence**:
- Reviewer uncertain ("I think...", "Possibly...")
- Contradicts other expert input
- Lacks supporting evidence
- Preference-based rather than evidence-based

## Quality Checks

Before finalizing output:
- [ ] All P0 items are genuinely patient-safety critical
- [ ] Priority assignments follow defined logic
- [ ] Section mappings are specific and actionable
- [ ] Corrections include both wrong and right values
- [ ] Clinical pearls are teaching-valuable
- [ ] Conflicts are genuinely contradictory
- [ ] Unanswered questions are actionable
- [ ] JSON structure is valid and complete
- [ ] Reviewer sentiment accurately reflects tone
- [ ] Estimated revision times are realistic

## Usage Notes

1. **Input**: Draft content + completed reviewer checklist + free-text comments
2. **Processing**: LLM analyzes and structures feedback
3. **Output**: JSON for revision workflow
4. **Integration**: Feeds into draft revision and final assembly

## Edge Cases

### Multiple Reviewers
When processing feedback from multiple reviewers:
- Create separate JSON output for each reviewer
- Merge outputs identifying conflicts
- Aggregate clinical pearls from all reviewers
- Prioritize higher-confidence corrections

### Incomplete Reviews
When reviewer doesn't complete all checklist items:
- Process available feedback only
- Note completeness percentage
- Flag missing critical verification items
- Suggest follow-up for gaps

### Contradictory Feedback
When internal contradictions in single review:
- Flag inconsistencies
- Request clarification
- Note most clinically conservative approach
- Defer to cited evidence over opinion

### Out-of-Scope Feedback
When reviewer comments on non-clinical aspects:
- Categorize separately (editorial, formatting, etc.)
- Lower priority unless impacts clarity
- Note for editorial team review
- Don't conflate with clinical corrections

## Example Processing Scenarios

### Scenario 1: Simple Dose Correction
**Input**: Reviewer marks dose incorrect, provides correct value with source

**Processing**:
1. Extract both values with units
2. Verify source citation (PMID or guideline)
3. Assign P0 priority (dose error)
4. Mark HIGH confidence (authoritative source)
5. Map to specific section
6. Flag as patient safety critical

### Scenario 2: Clinical Pearl Provided
**Input**: Reviewer answers pearl prompt with practical tip

**Processing**:
1. Extract pearl content verbatim
2. Categorize pearl type
3. Identify integration section
4. Assess teaching value
5. Assign P2 priority (enhancement)
6. Note if citation available or experiential

### Scenario 3: Vague Comment
**Input**: "This section could be better"

**Processing**:
1. Flag as ambiguous in `ambiguous_feedback`
2. Note section reference
3. Assign P3 priority (unclear)
4. Suggest clarification follow-up
5. Don't create specific action item

### Scenario 4: Suggested Reorganization
**Input**: "Antibiotic section should be organized by source not drug class"

**Processing**:
1. Categorize as `REORGANIZE` in section_updates
2. Document current vs suggested structure
3. Extract rationale
4. Assign P2 priority (improvement not correction)
5. Estimate effort (moderate - requires rewriting)

## Anti-Patterns to Detect

**Red Flags in Reviewer Feedback**:
- Corrections without sources → Lower confidence, request citation
- Contradicts guidelines without explanation → Flag for resolution
- Personal preference vs evidence-based → Categorize as P3
- Overly prescriptive for regional practice → Note as regional variation
- Outdated recommendations → Cross-check against current guidelines

**Processing Errors to Avoid**:
- Don't auto-assign P0 without patient safety impact
- Don't ignore low-confidence feedback (still document)
- Don't merge distinct feedback items (keep granular)
- Don't over-interpret vague comments
- Don't categorize suggestions as corrections

## Final Note

This prompt transforms unstructured expert feedback into actionable revision instructions. The goal is to preserve reviewer expertise and intent while creating clear, prioritized guidance for content improvement.
