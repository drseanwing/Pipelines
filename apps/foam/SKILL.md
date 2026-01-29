---
name: foam-medical-writing
description: >
  Create FOAM (Free Open Access Medical Education) blog posts for advanced clinical audiences
  including paramedics, ED nurses, and registrar-to-consultant level doctors. Supports three
  formats - case-based discussions with progressive revelation, journal club posts with trial
  critical appraisal, and clinical topic reviews with evidence synthesis. Use when asked to
  write medical education content, clinical blog posts, or FOAM-style articles. Hybrid workflow
  where AI handles evidence synthesis and structure while human experts provide clinical pearls
  and peer review.
---

# FOAM Medical Education Writing Skill

Create medical education content in the style of LITFL, EM Cases, The Bottom Line, and other trusted FOAM resources.

## Core Principle

AI provides **evidence synthesis and structural scaffolding**; humans provide **clinical wisdom and validation**. Never claim clinical authority. Mark all experiential knowledge as requiring expert input.

## Workflow Overview

### Stage 1: Topic Scoping

Before writing, clarify:
1. **Format**: Case-based | Journal club | Clinical review
2. **Topic**: Specific clinical question or trial
3. **Angle**: What gap does this fill? Why now?
4. **Audience**: Confirm advanced clinician target (no basics)

### Stage 2: Research

Conduct evidence synthesis:
- Identify 3-5 landmark trials (use acronyms)
- Locate current guidelines (specify societies)
- Find recent meta-analyses (<5 years)
- Identify active controversies

For each key study, document:
- Citation with PMID
- Design, population, setting
- Key findings with numbers (NNT, ARR, CI)
- Limitations
- Whether conclusions match data

### Stage 3: Drafting

Select template from `references/`:
- Case-based: `references/case-based-template.md`
- Journal club: `references/journal-club-template.md`
- Clinical review: `references/clinical-review-template.md`

Consult `references/style-guide.md` for formatting standards.

**Draft requirements:**
- All factual claims cited with PMID/source
- Uncertainty explicitly stated
- Clinical pearl placeholders marked: `[CLINICAL PEARL NEEDED: topic]`
- Regional variation flagged: `[REGIONAL VARIATION: specify]`
- Expert input prompts: `[EXPERT INPUT NEEDED: question]`

### Stage 4: Validation Prep

Generate for human reviewer:
1. List of all doses/thresholds with sources
2. Statements requiring clinical verification
3. Any claims contradicting major guidelines
4. Specific questions for expert reviewer

### Stage 5: Final Edit

After expert review:
- Incorporate clinical pearls
- Add peer reviewer attribution
- Verify all placeholders resolved
- Generate citation guidance and social summary

## Format-Specific Guidance

### Case-Based Discussions

Structure: Progressive case revelation with 3-5 decision points.

```
Case vignette → Clinical question → Evidence/Discussion → Pearl
     ↓
Case evolves (new data) → Next question → Evidence → Pearl
     ↓
Resolution and takeaways
```

**Required elements:**
- Opening vignette (50-100 words)
- Questions as section headers
- Expert quotes in blockquotes
- Named peer reviewer
- FOAMed cross-references

### Journal Club Posts

Structure: Standardized critical appraisal template.

**Required sections:** Clinical Question, Background, Design, Population, Intervention, Control, Outcomes, Strengths, Weaknesses, Bottom Line.

**Critical appraisal checklist:**
- Allocation concealment?
- Groups similar at baseline?
- Complete follow-up?
- Blinding?
- ITT analysis?
- Adequate sample size?
- Clinically significant results?
- Generalizable?

### Clinical Topic Reviews

Structure: Comprehensive but modular.

**Required elements:**
- Key points summary at top
- Evidence graded by quality
- Tables for dosing/differentials
- Controversies section
- Regional variation acknowledgment
- Update schedule

## Constraints

1. **No clinical authority claims**: Frame as evidence synthesis, not recommendation
2. **All claims require citation**: No unsourced medical facts
3. **Explicit uncertainty**: State when evidence is weak/conflicting
4. **Human required for clinical pearls**: Mark as placeholders
5. **Named peer review required**: Not optional for publication

## Audience Assumptions

- Advanced practitioners: Don't explain basics
- Time-constrained: Prioritize scannability
- Evidence-literate: Include methodology details
- Geographically diverse: Acknowledge practice variation
- FOAM-engaged: Cross-reference existing resources

## Output Checklist

Before delivering draft:
□ Format matches requested type
□ All claims cited
□ Uncertainty explicitly stated
□ Clinical pearl placeholders marked
□ Expert input prompts included
□ Peer reviewer attribution space
□ Bottom line summary present
□ References with PMIDs
□ FOAMed cross-references included
