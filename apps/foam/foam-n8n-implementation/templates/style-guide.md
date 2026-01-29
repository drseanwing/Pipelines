# REdI FOAM Writing Style Guide

Common patterns across high-quality FOAM content for advanced clinical audiences, published by the **Resuscitation EDucation Initiative (REdI)**, Metro North Health, Queensland.

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
- â‰¥3 related items
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

## REdI Visual Identity

All published content must follow the REdI Brand Guidelines. Reference `config/redi-theme.json` for digital design tokens.

### Colour Application

| Element | Colour | Hex | Usage Notes |
|---------|--------|-----|-------------|
| Page headers, section headings | REdI Navy | `#1B3A5F` | Meets WCAG AA for all text sizes |
| Clinical pearl blockquotes (accent border) | REdI Teal | `#2B9E9E` | Border/accent only; use with dark text |
| Hyperlinks | Link Blue | `#0066CC` | Meets WCAG AA normal text (5.6:1 contrast) |
| Hyperlinks (hover/visited) | Sky Blue | `#5DADE2` | Decorative use only; not for text |
| Warning/caution callouts | Warm Yellow | `#F4D03F` | Background only; use with dark text (#333) |
| Critical alert boxes | Alert Red | `#DC3545` | With white text; meets WCAG AA (4.5:1) |
| Success/confirmation messages | Success Green | `#28A745` | White text on green: large/bold text only (3.1:1) |
| Primary action buttons/CTAs | REdI Coral (Accessible) | `#C94450` | With white text; meets WCAG AA (4.7:1) |
| Primary action buttons (hover) | REdI Coral | `#E55B64` | With white bold text only (3.5:1) |
| Body text | Dark Gray | `#333333` | Meets WCAG AA for all text sizes |
| Page backgrounds | Light Gray / White | `#F5F5F5` / `#FFFFFF` | — |

**Accessibility Note:** All color combinations in the "Usage Notes" column meet WCAG 2.1 Level AA contrast requirements. Colors marked "large/bold text only" require ≥18px regular or ≥14px bold. Colors marked "decorative use only" or "background only" must not be used for text content.

### Typography

- **Primary font:** Montserrat (Regular 400, Medium 500, SemiBold 600, Bold 700)
- **Display font:** Bebas Neue (event titles, promotional headlines only)
- **Body text:** 1rem (16px) minimum, line-height 1.6
- **H1:** 2.5rem, Bold 700
- **H2:** 2rem, SemiBold 600
- **H3:** 1.5rem, SemiBold 600

### Content Branding

Each published piece must include:
- REdI attribution line beneath the title: *REdI — Resuscitation EDucation Initiative | Metro North Health*
- REdI footer: *Published by the Resuscitation EDucation Initiative (REdI), Metro North Health, Queensland.*
- "Powered by REdI" tagline where appropriate

### Accessibility Requirements

**WCAG 2.1 Level AA Compliance:**
- Normal text (< 18px regular or < 14px bold): 4.5:1 minimum contrast ratio
- Large text (≥ 18px regular or ≥ 14px bold): 3.0:1 minimum contrast ratio
- All colors in the Colour Application table above meet these requirements when used as specified in the "Usage Notes" column
- Interactive elements must have 3px solid REdI Teal (#2B9E9E) focus indicators
- Respect `prefers-reduced-motion` for any animated elements
- Maximum line length: 75 characters for optimal readability

**Color Contrast Examples:**
- ✓ Link Blue (#0066CC) on white: 5.6:1 (meets AA normal text requirements)
- ✓ REdI Navy (#1B3A5F) on white: 11.6:1 (meets AAA for all text)
- ✓ White text on Alert Red (#DC3545): 4.5:1 (meets AA normal text)
- ✓ White text on REdI Coral Accessible (#C94450): 4.7:1 (meets AA normal text)

## Quality Markers

Content must have:
- [ ] Named author attribution
- [ ] Named peer reviewer attribution
- [ ] REdI branding (header attribution and footer)
- [ ] Date and update schedule
- [ ] All claims cited
- [ ] Explicit uncertainty statements
- [ ] "Bottom line" summary

## Common Pitfalls to Avoid

- **Hedging without adding information**: "It could be argued that..." (just make the argument)
- **False balance**: Don't present fringe views equally with consensus
- **Premature recommendations**: If evidence is weak, say "evidence is insufficient" not "consider X"
- **Assumed universalism**: Acknowledge practice varies by region/institution
- **Outdated claims**: Flag content needing update if evidence landscape has changed
