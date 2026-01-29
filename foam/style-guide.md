# FOAM Writing Style Guide

Common patterns across high-quality FOAM content for advanced clinical audiences.

## Voice and Tone

**Expert-to-colleague register:**
- Write as if explaining to a competent colleague who missed the latest paper
- Assume baseline knowledge; don't over-explain fundamentals
- First person acceptable for reasoning: "I would consider...", "My approach..."
- Avoid didactic/textbook tone

**Intellectual honesty:**
- Acknowledge uncertainty explicitly
- Distinguish evidence quality levels
- Don't fill evidence gaps with confident prose
- State when something is opinion vs evidence

## Formatting Standards

### Structure

| Element | Standard |
|---------|----------|
| Paragraphs | Max 5 sentences |
| Sentences | Average <25 words |
| Sections | 300-500 words before subheading |
| Total length | Case-based: 1,500-2,500 words; Journal club: 1,000-2,000 words; Clinical review: 3,000-5,000 words |

### Visual Hierarchy

**Bold** for:
- Critical thresholds ("QRS >100ms")
- Drug doses
- Key warnings
- Important definitions

*Italics* for:
- Case vignette text
- Emphasis (sparingly)

> Blockquotes for:
> - Key takeaways / clinical pearls
> - Expert quotes with attribution
> - Important summaries

**Headers:**
- Descriptive and actionable ("When to Intubate" not "Airway Management")
- Question format for decision points ("Should we give steroids?")
- Use H2 for main sections, H3 for subsections

### Lists

Use bullets when:
- ≥3 related items
- Items are parallel in structure
- Order doesn't matter

Use numbered lists when:
- Sequence matters
- Items will be referenced by number

Each bullet: minimum 5 words, complete thought.

## Evidence Presentation

### Citation Style

Inline with hyperlinks preferred:
```
...demonstrated in the ARISE trial (PMID: 25099709)...
```

Or numbered references:
```
...demonstrated in recent trials (1,2)...
```

Include PMIDs or DOIs for verifiability.

### Trial Naming

Use acronyms readers know:
- ARISE, ProCESS, ProMISe (sepsis)
- CRASH-2, CRASH-3 (TXA)
- EAST, HEAT (paracetamol in sepsis)
- TTM, TTM2 (temperature management)

Expand on first use only if acronym is obscure.

### Numbers and Statistics

Include when available:
- Absolute risk reduction (ARR)
- Number needed to treat (NNT)
- 95% confidence intervals
- p-values (with caution about interpretation)

Example: "...reduced mortality (ARR 2.8%, NNT 36, 95% CI 20-139)"

## Placeholders for Human Input

Mark clearly where clinical expertise is required:

```markdown
[CLINICAL PEARL NEEDED: What bedside signs predict deterioration?]

[EXPERT INPUT NEEDED: Local practice variation for this scenario]

[REGIONAL VARIATION: How does Australian/UK/Canadian practice differ?]

[VERIFY: Dose check required - 4g cited in source but seems high]
```

## Cross-referencing

Link to existing FOAM resources rather than duplicating:
- "For detailed ECG interpretation, see LITFL's [Sgarbossa criteria post](URL)"
- "Previously covered in EM Cases Episode X"

## Quality Markers

Content must have:
□ Named author attribution
□ Named peer reviewer attribution  
□ Date and update schedule
□ All claims cited
□ Explicit uncertainty statements
□ "Bottom line" summary

## Common Pitfalls to Avoid

- **Hedging without adding information**: "It could be argued that..." (just make the argument)
- **False balance**: Don't present fringe views equally with consensus
- **Premature recommendations**: If evidence is weak, say "evidence is insufficient" not "consider X"
- **Assumed universalism**: Acknowledge practice varies by region/institution
- **Outdated claims**: Flag content needing update if evidence landscape has changed
