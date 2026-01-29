# Revision Application: Feedback Integration

## Purpose
Apply structured reviewer feedback to draft content, producing a revised version with transparent change tracking. This prompt ensures reviewer corrections and suggestions are systematically integrated while preserving content integrity and maintaining clinical accuracy.

## Task
Process reviewer feedback (corrections, suggestions, clinical pearls) and apply to original draft based on specified revision priority level, generating a revised draft with comprehensive change log.

## Input Requirements

You will receive:

### 1. Original Draft
- Full markdown content (clinical review, guideline, case discussion)
- Draft version number
- Word count
- Section structure

### 2. Processed Feedback
Output from reviewer-checklist workflow containing:

```json
{
  "corrections": [
    {
      "correction_id": "uuid",
      "type": "dose|threshold|claim|guideline",
      "section": "Section Name",
      "original_text": "Incorrect statement",
      "corrected_text": "Verified correct statement",
      "reference": "PMID: 12345678 or guideline citation",
      "priority": "HIGH|MEDIUM|LOW",
      "safety_critical": true,
      "reviewer": "Reviewer Name",
      "rationale": "Why this correction needed"
    }
  ],
  "suggestions": [
    {
      "suggestion_id": "uuid",
      "type": "clarity|completeness|organization|style",
      "section": "Section Name",
      "current_text": "Current version",
      "suggested_text": "Suggested improvement",
      "priority": "HIGH|MEDIUM|LOW",
      "reviewer": "Reviewer Name",
      "rationale": "Explanation of improvement"
    }
  ],
  "clinical_pearls": [
    {
      "pearl_id": "uuid",
      "topic": "Pearl topic",
      "section": "Target section for insertion",
      "pearl_type": "technique|pitfall|reasoning|mnemonic",
      "content": "Full pearl text with clinical context",
      "priority": "HIGH|MEDIUM|LOW",
      "reviewer": "Reviewer Name",
      "insertion_point": "After paragraph starting with... | At end of section | Before subsection..."
    }
  ]
}
```

### 3. Revision Priority
Determines which feedback to apply:

**all** (default):
- Apply ALL corrections (mandatory)
- Apply ALL high-priority suggestions
- Apply medium/low suggestions if they improve clarity or accuracy
- Integrate ALL clinical pearls
- Most comprehensive revision

**corrections-only**:
- Apply ONLY corrections (factual errors, doses, thresholds)
- Skip suggestions unless safety-critical
- Include clinical pearls only if HIGH priority and safety-relevant
- Minimal changes for factual accuracy

**high-priority**:
- Apply ALL corrections
- Apply high-priority suggestions
- Include high-priority clinical pearls
- Skip medium/low priority items
- Balanced revision approach

## Revision Protocol

### Phase 1: Apply CORRECTIONS (Always Mandatory)

Process in order of safety criticality:

1. **HIGH priority corrections** (safety-critical)
   - Drug doses
   - Clinical thresholds
   - Contraindications
   - Guideline recommendations
   - Statistical claims with clinical implications

2. **MEDIUM priority corrections** (accuracy-critical)
   - Non-critical thresholds
   - Standard practice statements
   - General statistical claims
   - Guideline concordance

3. **LOW priority corrections** (consistency/style)
   - Terminology standardization
   - Citation format
   - Minor factual updates

**For each correction:**
- Locate exact text match in original draft
- Replace with corrected version
- Add citation if provided
- Preserve surrounding context and formatting
- Log change with rationale

### Phase 2: Integrate CLINICAL PEARLS

Clinical pearls add practical bedside wisdom not found in literature.

**Integration guidelines:**

1. **Placement**:
   - Follow reviewer's `insertion_point` specification
   - If ambiguous, place at end of relevant subsection
   - Maintain logical flow with surrounding content

2. **Formatting**:
   ```markdown
   **Clinical Pearl** (*Reviewer Name*): Pearl content here with practical details and context.
   ```

3. **Attribution**:
   - Always credit reviewer by name
   - Preserves accountability and expertise source

4. **Priority handling**:
   - HIGH: Always include (critical teaching points, safety tips)
   - MEDIUM: Include if space permits and relevant
   - LOW: Include only if adds unique value

**Pearl types and placement:**

| Pearl Type | Preferred Placement | Example |
|------------|---------------------|---------|
| Practical technique | After procedure description | "When inserting chest tube..." |
| Common pitfall | After risk discussion | "Trainees often miss..." |
| Clinical reasoning | In diagnostic section | "Think of this when..." |
| Mnemonic | With criteria/lists | "Use MUDPILES for..." |

### Phase 3: Apply SUGGESTIONS (Priority-Dependent)

Only apply suggestions that meet revision priority threshold AND improve content.

**Evaluation criteria:**
- Does it improve clarity without changing meaning?
- Does it enhance clinical accuracy?
- Does it maintain expert-to-colleague register?
- Is it worth the word count change?

**Suggestion types:**

**CLARITY**:
- Simplify complex sentences
- Improve ambiguous phrasing
- Enhance logical flow
- Add transitional phrases

**COMPLETENESS**:
- Fill evidence gaps
- Add missing context
- Include relevant populations
- Address unstated assumptions

**ORGANIZATION**:
- Reorder for better flow
- Move misplaced content
- Improve section coherence
- Enhance visual hierarchy

**STYLE**:
- Remove unnecessary hedging
- Improve register consistency
- Fix anti-patterns ("It is important to note...")
- Enhance readability

### Phase 4: Citation Management

Ensure all citations remain valid and properly formatted:

1. **Preserve existing citations**:
   - Don't remove or alter unless corrected
   - Maintain consistent format: `(PMID: 12345678)`

2. **Add new citations**:
   - From corrections: `corrected_text (PMID: 12345678)`
   - From pearls: Attribute to reviewer, not PMID

3. **Verify cross-references**:
   - Check internal links still valid after changes
   - Update section references if sections renamed
   - Ensure table/figure references accurate

4. **Citation placement**:
   - After factual claim: `Statement here (PMID: 12345678).`
   - Multiple sources: `Statement (PMID: 11111111, 22222222).`
   - Guidelines: `Recommendation (CPG: SSC 2021).`

### Phase 5: Content Integrity Checks

Before finalizing revision:

1. **Verify no unintended deletions**:
   - All original content preserved unless explicitly corrected
   - No orphaned sections
   - All tables/figures intact

2. **Check formatting consistency**:
   - Markdown syntax valid
   - Bold/italic applied consistently
   - Tables properly formatted
   - Headers properly nested (H2 > H3 > H4)

3. **Validate cross-references**:
   - Internal links functional
   - Section references accurate
   - Related content still coherent

4. **Ensure style coherence**:
   - Register consistent throughout
   - Tone matches original
   - New content integrates smoothly

## Output Format

Return as JSON:

```json
{
  "revised_draft": "Full markdown content with all revisions applied",
  "revision_version": 2,
  "revision_priority_used": "all|corrections-only|high-priority",
  "changes_applied": [
    {
      "change_id": "uuid",
      "change_type": "correction|suggestion|pearl",
      "feedback_item_id": "uuid from input feedback",
      "section": "Section Name",
      "subsection": "Subsection if applicable",
      "original_text": "Original text (if replacement) or null (if addition)",
      "revised_text": "New or changed text",
      "change_category": "dose|threshold|clarity|safety|pearl|style|organization",
      "rationale": "Why this change was made",
      "reviewer_attribution": "Reviewer Name",
      "safety_critical": true,
      "citation_added": "PMID: 12345678 or null",
      "word_count_delta": 15
    }
  ],
  "changes_deferred": [
    {
      "feedback_item_id": "uuid",
      "feedback_type": "suggestion|pearl",
      "section": "Section Name",
      "reason_deferred": "Below priority threshold | Would change meaning | Not relevant | Word count constraint",
      "reviewer": "Reviewer Name"
    }
  ],
  "word_count_before": 3500,
  "word_count_after": 3650,
  "word_count_change": 150,
  "revision_notes": "Summary of major changes and overall revision approach",
  "citations_added": 5,
  "citations_updated": 2,
  "clinical_pearls_integrated": 3,
  "corrections_applied": 8,
  "suggestions_applied": 4,
  "suggestions_deferred": 2,
  "sections_modified": ["Section 1", "Section 3", "Section 5"],
  "integrity_checks": {
    "all_sections_intact": true,
    "cross_references_valid": true,
    "formatting_consistent": true,
    "no_unintended_deletions": true,
    "citations_valid": true
  },
  "review_flags": [
    {
      "flag_type": "conflict|ambiguity|decision-needed",
      "section": "Section Name",
      "issue": "Description of issue requiring human review",
      "options": ["Option 1", "Option 2"],
      "recommendation": "Suggested resolution"
    }
  ],
  "next_steps": "Ready for final QA review | Requires clinical re-review | Needs additional feedback"
}
```

## Special Handling Cases

### Conflicting Feedback
If multiple reviewers provide contradictory feedback for same content:

1. **Prioritize by safety**: Safety-critical correction wins
2. **Prioritize by specificity**: More specific/detailed feedback preferred
3. **Flag for human review**: Add to `review_flags` with both options
4. **Document in change log**: Note conflict in rationale

Example:
```json
{
  "review_flags": [
    {
      "flag_type": "conflict",
      "section": "Vasopressor Dosing",
      "issue": "Reviewer A suggests 0.05-0.1 mcg/kg/min, Reviewer B suggests 0.1-0.2 mcg/kg/min for norepinephrine starting dose",
      "options": [
        "Use Reviewer A (lower range, more conservative)",
        "Use Reviewer B (higher range, matches local protocol)",
        "Include both with context: 'Typical starting dose 0.05-0.2 mcg/kg/min depending on...'"
      ],
      "recommendation": "Use range encompassing both and add reference to guidelines"
    }
  ]
}
```

### Missing Context for Corrections
If correction provided but original text not found exactly:

1. **Search for similar text**: Use fuzzy matching
2. **Search by section**: Locate based on section specification
3. **Flag if ambiguous**: Add to `review_flags`
4. **Apply best judgment**: Use closest match with note in change log

### Clinical Pearls Lacking Insertion Point
If pearl lacks specific insertion point:

1. **Analyze pearl content**: Determine most relevant section
2. **Place logically**: End of relevant subsection or after related content
3. **Document decision**: Note placement rationale in change log
4. **Preserve flow**: Ensure smooth integration with surrounding text

### Suggestions That Would Change Meaning
If suggestion would alter clinical meaning or interpretation:

1. **Defer application**: Add to `changes_deferred`
2. **Flag for review**: Explain concern in `review_flags`
3. **Suggest alternative**: If possible, propose compromise
4. **Document thoroughly**: Clear rationale for deferral

## Quality Checks

Before returning output, verify:

- [ ] ALL corrections applied (regardless of priority setting)
- [ ] Clinical pearls formatted with reviewer attribution
- [ ] Citations preserved and new ones added correctly
- [ ] Word count delta calculated accurately
- [ ] All change IDs unique and traceable to input feedback
- [ ] `changes_applied` and `changes_deferred` complete
- [ ] Cross-references validated after text changes
- [ ] Markdown syntax valid (no broken formatting)
- [ ] No duplicate content from partial applications
- [ ] Revision version incremented correctly
- [ ] JSON output valid and complete
- [ ] `integrity_checks` all pass (or flagged if not)

## Example Input and Output

### Example Input

**Original Draft** (excerpt):
```markdown
## Initial Resuscitation

Give 30 mL/kg crystalloid within first hour (PMID: 24635773). Target MAP >65 mmHg.

[CLINICAL PEARL NEEDED: Practical fluid bolus administration]
```

**Feedback** (excerpt):
```json
{
  "corrections": [
    {
      "correction_id": "corr-001",
      "type": "threshold",
      "section": "Initial Resuscitation",
      "original_text": "within first hour",
      "corrected_text": "within first 3 hours",
      "reference": "CPG: SSC 2021",
      "priority": "HIGH",
      "safety_critical": true,
      "reviewer": "Dr. Smith",
      "rationale": "Updated SSC guideline changed timeframe from 1 to 3 hours"
    }
  ],
  "clinical_pearls": [
    {
      "pearl_id": "pearl-001",
      "section": "Initial Resuscitation",
      "pearl_type": "technique",
      "content": "Use pressure bags for faster infusion; gravity alone often too slow for true fluid challenge. Aim for 500 mL boluses in <15 minutes to adequately assess response.",
      "priority": "HIGH",
      "reviewer": "Dr. Jones",
      "insertion_point": "After fluid volume recommendation"
    }
  ]
}
```

### Example Output

```json
{
  "revised_draft": "## Initial Resuscitation\n\nGive 30 mL/kg crystalloid within first 3 hours (PMID: 24635773; CPG: SSC 2021). Target MAP >65 mmHg.\n\n**Clinical Pearl** (*Dr. Jones*): Use pressure bags for faster infusion; gravity alone often too slow for true fluid challenge. Aim for 500 mL boluses in <15 minutes to adequately assess response.",
  "revision_version": 2,
  "revision_priority_used": "all",
  "changes_applied": [
    {
      "change_id": "change-001",
      "change_type": "correction",
      "feedback_item_id": "corr-001",
      "section": "Initial Resuscitation",
      "subsection": null,
      "original_text": "within first hour",
      "revised_text": "within first 3 hours",
      "change_category": "threshold",
      "rationale": "Updated SSC guideline changed timeframe from 1 to 3 hours",
      "reviewer_attribution": "Dr. Smith",
      "safety_critical": true,
      "citation_added": "CPG: SSC 2021",
      "word_count_delta": 1
    },
    {
      "change_id": "change-002",
      "change_type": "pearl",
      "feedback_item_id": "pearl-001",
      "section": "Initial Resuscitation",
      "subsection": null,
      "original_text": null,
      "revised_text": "**Clinical Pearl** (*Dr. Jones*): Use pressure bags for faster infusion; gravity alone often too slow for true fluid challenge. Aim for 500 mL boluses in <15 minutes to adequately assess response.",
      "change_category": "pearl",
      "rationale": "Added practical technique pearl from expert reviewer",
      "reviewer_attribution": "Dr. Jones",
      "safety_critical": false,
      "citation_added": null,
      "word_count_delta": 32
    }
  ],
  "changes_deferred": [],
  "word_count_before": 25,
  "word_count_after": 58,
  "word_count_change": 33,
  "revision_notes": "Applied high-priority safety correction to fluid resuscitation timeframe per updated SSC guidelines. Integrated practical technique pearl on fluid administration. All corrections applied successfully.",
  "citations_added": 1,
  "citations_updated": 0,
  "clinical_pearls_integrated": 1,
  "corrections_applied": 1,
  "suggestions_applied": 0,
  "suggestions_deferred": 0,
  "sections_modified": ["Initial Resuscitation"],
  "integrity_checks": {
    "all_sections_intact": true,
    "cross_references_valid": true,
    "formatting_consistent": true,
    "no_unintended_deletions": true,
    "citations_valid": true
  },
  "review_flags": [],
  "next_steps": "Ready for final QA review"
}
```

## Notes

- **Preserve author voice**: Maintain original writing style and register
- **Don't over-apply**: Not every suggestion improves content
- **Safety first**: Corrections always take precedence over style
- **Track everything**: Transparent change log builds trust
- **Attribution matters**: Credit reviewers for their expertise
- **Validate after changes**: Ensure document integrity maintained
- **Flag uncertainties**: Don't guess; ask for clarification
- **Word count awareness**: Monitor impact on overall length
- **Citation hygiene**: Maintain consistent formatting
- **Human review**: Complex conflicts need expert decision
