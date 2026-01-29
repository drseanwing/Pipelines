# Approval Assessment: Publication Readiness Evaluation

## Purpose
Evaluate complete draft content and review feedback to determine if content is ready for publication. This assessment synthesizes all verification activities, reviewer feedback, and quality metrics to make a final approval recommendation.

## Task
Analyze the draft content, all reviewer feedback, revision history, checklist completion status, and quality scores to determine publication readiness and provide actionable next steps.

## Input Requirements

You will receive:

1. **Draft content** - Full markdown document with all revisions applied
2. **Reviewer feedback** - All completed reviewer checklists (JSON format)
3. **Verification reports** - Results from:
   - Dose extraction and verification
   - Claim verification
   - Quality checkpoint
   - Threshold validation
   - Guideline concordance
4. **Revision history** - Log of changes made during review cycles
5. **Checklist completion** - Status of all verification items
6. **Quality scores** - Metrics from quality assessment stages

## Assessment Components

### 1. Verification Completeness

**Required Checklist Items:**

**Doses:**
- All drug doses verified by clinical expert
- References cited for all dosing recommendations
- Pediatric/adult distinctions clear
- Units explicit (mg/kg, mcg/min, etc.)
- No outstanding dose verification flags

**Thresholds:**
- All numeric cutoffs verified
- Source guidelines cited
- Population context specified
- No contradictions with current standards

**Claims:**
- All statistical claims verified against sources
- No inaccurate or misleading statements
- Outdated claims updated
- Missing citations added

**Clinical Pearls:**
- All pearl placeholders filled by expert reviewers
- Pearls specific and actionable
- No placeholder markers remaining (`[CLINICAL PEARL NEEDED: ...]`)

**Regional Variations:**
- Drug availability issues addressed
- Local practice variations documented
- Alternative approaches provided where needed
- Regional flags resolved (`[REGIONAL: ...]`)

### 2. Quality Gate Assessment

Evaluate against quality standards from IMPLEMENTATION_FRAMEWORK.md:

**Clinical Accuracy Gate:**
- All factual statements verified
- Citations properly formatted (PMID/DOI)
- Evidence quality graded appropriately
- Guideline recommendations current
- No patient safety concerns

**Evidence Quality Gate:**
- Citation density adequate (0.5-1.0 per paragraph)
- High-quality evidence prioritized (RCTs, meta-analyses)
- Conflicting evidence acknowledged
- Evidence age appropriate (<5 years for treatment recommendations)

**Completeness Gate:**
- All required sections present
- Word count within range (3,000-5,000)
- Appropriate depth for target audience
- No missing critical topics
- Logical flow maintained

**Style Compliance Gate:**
- Expert-to-colleague register maintained
- No over-explanation of basics
- Anti-patterns removed ("It is important to note...")
- Active voice predominates
- Technical vocabulary appropriate

### 3. Reviewer Sign-off Status

**Required Approvals:**

**Clinical Expert Reviewer:**
- Overall recommendation: APPROVE or APPROVE_WITH_CHANGES
- Confidence level: HIGH or MEDIUM
- All HIGH priority items verified
- No outstanding patient safety concerns

**Editor Review (if required):**
- Style compliance verified
- Structure approved
- Cross-references validated
- Publication standards met

**Pharmacist Review (if applicable):**
- All drug doses verified
- Drug interactions noted
- Contraindications comprehensive
- Safety warnings included

### 4. Outstanding Issues Assessment

**Critical Issues (Block Publication):**
- Unverified high-risk drug doses
- Inaccurate statistical claims
- Contradictions with current guidelines
- Patient safety concerns
- Missing required sections

**Major Issues (Require Resolution):**
- Multiple uncited claims
- Outdated evidence not updated
- Missing clinical pearls (>3)
- Incomplete special population coverage
- Structural problems

**Minor Issues (Can Be Addressed Post-Approval):**
- <3 style suggestions
- Optional enhancement recommendations
- Non-critical cross-reference additions
- Formatting polish

### 5. Revision Cycle Analysis

Evaluate improvement trajectory:
- Number of review cycles completed
- Issues resolved vs. outstanding
- Quality score progression
- Reviewer confidence trend

**Decision Factors:**
- First cycle: More lenient, expect revisions
- Second cycle: Expect substantial improvement
- Third+ cycle: Should be near-approval or reassess scope

## Decision Logic

### APPROVED
**Criteria:**
- ✓ All critical verification items complete
- ✓ All HIGH priority doses/thresholds verified
- ✓ No inaccurate claims remaining
- ✓ All clinical pearl placeholders filled
- ✓ All regional variation flags addressed
- ✓ Quality gates passed (clinical accuracy, evidence, completeness, style)
- ✓ Clinical expert recommendation: APPROVE
- ✓ No outstanding patient safety concerns
- ✓ Editor approval received (if required)

**Action:** Publish immediately

### APPROVED_WITH_MINOR_CHANGES
**Criteria:**
- ✓ All critical items verified
- ✓ <3 non-critical suggestions pending
- ✓ Minor style improvements suggested
- ✓ Clinical expert recommendation: APPROVE_WITH_CHANGES
- ✓ No patient safety concerns
- ✓ Changes can be made in <30 minutes

**Action:** Make minor changes, then publish (no re-review needed)

### REVISIONS_REQUIRED
**Criteria:**
- ✗ 3-10 moderate issues outstanding
- ✗ Some claims unverified but not critical
- ✗ 1-2 doses need verification
- ✗ Some clinical pearls missing
- ✗ Structural adjustments needed
- ○ Clinical expert recommendation: APPROVE_WITH_CHANGES or MAJOR_REVISION_NEEDED
- ✓ Core content sound

**Action:** Address specific issues, resubmit for targeted review

### MAJOR_REVISIONS_REQUIRED
**Criteria:**
- ✗ >10 issues across multiple categories
- ✗ Multiple critical doses unverified
- ✗ Significant inaccurate claims
- ✗ Major content gaps
- ✗ Guideline contradictions
- ✗ Clinical expert recommendation: MAJOR_REVISION_NEEDED
- ○ May need substantial rewriting

**Action:** Major revision cycle, full re-review required

### REJECTED
**Criteria:**
- ✗ Fundamental accuracy issues uncorrectable
- ✗ Patient safety concerns that cannot be mitigated
- ✗ Inappropriate content for platform
- ✗ Scope too broad/narrow to be useful
- ✗ Clinical expert recommendation: REJECT
- ✗ Multiple review cycles without adequate improvement

**Action:** Do not publish; consider complete redevelopment or topic abandonment

## Output Format

Provide assessment results as JSON:

```json
{
  "approval_metadata": {
    "assessment_date": "2026-01-25T14:30:00Z",
    "draft_id": "uuid-v4",
    "draft_title": "Management of Septic Shock in the Emergency Department",
    "draft_version": "3.2",
    "review_cycle": 2,
    "assessor": "claude-sonnet-4-5"
  },

  "approval_status": "approved|approved_with_minor_changes|revisions_required|major_revisions_required|rejected",

  "approval_confidence": 0.95,

  "verification_summary": {
    "doses_verified": 15,
    "doses_total": 15,
    "doses_pass": true,

    "thresholds_verified": 12,
    "thresholds_total": 12,
    "thresholds_pass": true,

    "claims_verified": 28,
    "claims_total": 30,
    "claims_pass": false,
    "claims_notes": "2 statistical claims need updated citations",

    "pearls_filled": 5,
    "pearls_total": 5,
    "pearls_pass": true,

    "regional_flags_resolved": 3,
    "regional_flags_total": 3,
    "regional_pass": true,

    "special_populations_addressed": ["pediatric", "elderly", "pregnancy", "renal_impairment"],
    "special_populations_complete": true
  },

  "quality_gate_results": {
    "clinical_accuracy": {
      "status": "pass",
      "score": 0.98,
      "notes": "All factual statements verified, minor citation formatting improvements suggested",
      "blocking_issues": []
    },
    "evidence_quality": {
      "status": "pass",
      "score": 0.92,
      "notes": "Strong evidence base, appropriate citation density",
      "citation_density": 0.74,
      "average_evidence_age": "3.2 years",
      "high_quality_evidence_percent": 85
    },
    "completeness": {
      "status": "pass",
      "score": 0.95,
      "word_count": 4200,
      "missing_sections": [],
      "notes": "All required sections present, appropriate depth"
    },
    "style_compliance": {
      "status": "pass",
      "score": 0.89,
      "anti_patterns_found": 2,
      "notes": "Good expert register, 2 minor phrasing suggestions",
      "blocking_issues": []
    }
  },

  "reviewer_signoffs": [
    {
      "reviewer_type": "clinical_expert",
      "reviewer_name": "Dr. Sarah Johnson",
      "specialty": "Emergency Medicine",
      "recommendation": "APPROVE_WITH_CHANGES",
      "confidence": "HIGH",
      "date": "2026-01-24T16:45:00Z",
      "critical_concerns": [],
      "suggestions": [
        "Update reference for lactate threshold to Surviving Sepsis 2021",
        "Add clinical pearl about vasopressor access in hypotensive patients"
      ]
    },
    {
      "reviewer_type": "pharmacist",
      "reviewer_name": "PharmD Michael Chen",
      "recommendation": "APPROVE",
      "confidence": "HIGH",
      "date": "2026-01-24T12:30:00Z",
      "all_doses_verified": true,
      "critical_concerns": []
    }
  ],

  "outstanding_items": [
    {
      "item_id": "claim-028",
      "type": "claim_verification",
      "description": "Lactate threshold citation needs update to SSC 2021",
      "severity": "minor",
      "estimated_fix_time": "5 minutes",
      "blocking": false
    },
    {
      "item_id": "pearl-006",
      "type": "clinical_pearl",
      "description": "Add pearl about vasopressor access challenges",
      "severity": "minor",
      "estimated_fix_time": "10 minutes",
      "blocking": false
    }
  ],

  "conditions": [
    "Update lactate threshold citation to Surviving Sepsis Campaign 2021",
    "Add clinical pearl regarding vasopressor access in Section 4.2"
  ],

  "issues_by_severity": {
    "critical": [],
    "major": [],
    "minor": 2,
    "style": 2
  },

  "revision_history_analysis": {
    "cycles_completed": 2,
    "issues_resolved": 23,
    "issues_remaining": 2,
    "quality_improvement": {
      "cycle_1_score": 0.75,
      "cycle_2_score": 0.92,
      "current_score": 0.94,
      "trend": "improving"
    },
    "reviewer_confidence_trend": ["MEDIUM", "HIGH"]
  },

  "publication_ready": true,

  "recommended_actions": [
    {
      "action": "Update citation",
      "details": "Replace reference for lactate threshold with SSC 2021 guideline",
      "assignee": "content_editor",
      "estimated_time": "5 minutes",
      "priority": "minor"
    },
    {
      "action": "Add clinical pearl",
      "details": "Incorporate Dr. Johnson's suggestion about vasopressor access",
      "assignee": "clinical_expert",
      "estimated_time": "10 minutes",
      "priority": "minor"
    },
    {
      "action": "Final style polish",
      "details": "Address 2 remaining anti-pattern phrases",
      "assignee": "content_editor",
      "estimated_time": "5 minutes",
      "priority": "style"
    },
    {
      "action": "Publish",
      "details": "After minor changes complete, content ready for publication",
      "assignee": "publication_team",
      "priority": "next"
    }
  ],

  "publication_notes": "Excellent draft with strong clinical content and comprehensive evidence base. Minor updates required (total ~20 minutes) but no re-review needed. Cleared for publication after changes.",

  "approval_rationale": "Draft meets all critical quality standards. All high-priority verification items complete. Clinical expert and pharmacist approval received. Two minor citation/pearl additions recommended but non-blocking. Quality scores exceed thresholds across all gates. Content demonstrates appropriate depth, accuracy, and educational value for target audience. Ready for publication with minor editorial changes.",

  "metrics": {
    "overall_quality_score": 0.94,
    "patient_safety_score": 1.00,
    "educational_value_score": 0.92,
    "evidence_strength_score": 0.89,
    "publication_readiness_score": 0.95
  },

  "next_steps": {
    "immediate": "Complete 2 minor updates (20 min total)",
    "short_term": "Final editorial review for publication formatting",
    "publication_target": "2026-01-26",
    "post_publication": "Monitor for feedback, plan 6-month content review"
  }
}
```

## Status Decision Matrix

| Verification Complete | Quality Gates | Reviewer Approval | Outstanding Issues | Decision |
|----------------------|---------------|-------------------|-------------------|----------|
| 100% | All Pass | APPROVE | 0 critical, 0 major, 0-2 minor | **APPROVED** |
| 100% | All Pass | APPROVE_WITH_CHANGES | 0 critical, 0 major, 1-3 minor | **APPROVED_WITH_MINOR_CHANGES** |
| 95-99% | Most Pass | APPROVE_WITH_CHANGES | 0 critical, 1-3 major, <10 minor | **REVISIONS_REQUIRED** |
| 80-94% | Some Fail | MAJOR_REVISION_NEEDED | 0-1 critical, 3+ major, multiple minor | **MAJOR_REVISIONS_REQUIRED** |
| <80% | Multiple Fail | REJECT or MAJOR_REVISION | 1+ critical, multiple major | **REJECTED** or **MAJOR_REVISIONS_REQUIRED** |

## Special Considerations

### First-Time Authors
- More lenient on style issues
- Focus on clinical accuracy over perfect phrasing
- Provide detailed feedback for learning

### Complex Topics
- May require multiple expert reviewers
- Higher tolerance for word count variance
- Additional pearl input may be needed

### Emergency/Time-Sensitive Content
- Fast-track approval if critical and accurate
- Style issues can be addressed post-publication
- Require explicit patient safety verification

### Update vs. New Content
- Updates: focus on changed sections
- New content: comprehensive review required
- Migration from external source: extra verification

## Red Flags Requiring Expert Escalation

Automatically escalate to senior editor if:
1. Clinical expert recommends REJECT
2. Patient safety concerns unresolved after 2 cycles
3. Multiple reviewer disagreements
4. Contradictory guideline interpretations
5. Ethical/legal concerns raised
6. Content outside platform scope

## Time-to-Publication Estimates

Based on approval status:

**APPROVED:**
- Immediate publication (same day)
- No additional review needed

**APPROVED_WITH_MINOR_CHANGES:**
- 1-2 hours to complete changes
- Next business day publication
- No re-review cycle

**REVISIONS_REQUIRED:**
- 1-3 days for revisions
- Targeted re-review (specific items)
- 3-5 days to publication

**MAJOR_REVISIONS_REQUIRED:**
- 1-2 weeks for major revisions
- Full re-review cycle
- 2-3 weeks to publication

**REJECTED:**
- Not published
- Consider topic redevelopment (months)
- Or permanent abandonment

## Quality Assurance Checks

Before finalizing approval assessment:
- [ ] All verification summaries reviewed
- [ ] Quality gate scores calculated
- [ ] All reviewer feedback considered
- [ ] Outstanding items categorized by severity
- [ ] Publication readiness boolean set correctly
- [ ] Recommended actions specific and actionable
- [ ] Timeline estimates realistic
- [ ] Approval rationale clearly documented
- [ ] JSON structure valid and complete

## Usage in Workflow

This assessment runs:
1. **After** all review cycles complete
2. **After** final revisions submitted
3. **Before** publication decision
4. **As final gate** in quality assurance process

The approval assessment serves as the definitive publication decision point, synthesizing all prior verification activities into a clear go/no-go recommendation.

## Example Approval Assessment

**Scenario:** Sepsis management review, 2nd review cycle

```json
{
  "approval_metadata": {
    "assessment_date": "2026-01-25T14:30:00Z",
    "draft_title": "Management of Septic Shock in the Emergency Department",
    "review_cycle": 2
  },
  "approval_status": "approved_with_minor_changes",
  "approval_confidence": 0.93,
  "verification_summary": {
    "doses_verified": 15,
    "doses_total": 15,
    "doses_pass": true,
    "claims_verified": 28,
    "claims_total": 30,
    "claims_pass": false,
    "pearls_filled": 5,
    "pearls_total": 5,
    "pearls_pass": true
  },
  "quality_gate_results": {
    "clinical_accuracy": {"status": "pass", "score": 0.98},
    "evidence_quality": {"status": "pass", "score": 0.92},
    "completeness": {"status": "pass", "score": 0.95},
    "style_compliance": {"status": "pass", "score": 0.89}
  },
  "outstanding_items": [
    {
      "item_id": "claim-028",
      "description": "Update lactate threshold citation",
      "severity": "minor",
      "blocking": false
    }
  ],
  "publication_ready": true,
  "recommended_actions": [
    {"action": "Update citation", "estimated_time": "5 minutes"},
    {"action": "Publish", "priority": "next"}
  ],
  "approval_rationale": "Excellent clinical content. All critical items verified. Two minor updates needed (~20 min). No re-review required. Ready for publication."
}
```

**Result:** Content approved for publication after minor editorial changes.
