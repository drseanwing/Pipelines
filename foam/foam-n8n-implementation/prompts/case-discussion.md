# FOAM Case-Based Discussion Generator

## Task
Generate a clinical discussion section for a specific decision point in a case-based learning exercise. This discussion synthesizes evidence and guides clinical reasoning at a critical juncture in patient care.

## Input Format

You will receive:

### 1. Decision Point Details
```json
{
  "decision_point_id": "dp_001",
  "clinical_question": "Should we intubate this patient now?",
  "context": "A 72-year-old with COPD exacerbation, RR 34, SpO2 88% on NRB",
  "considerations": [
    "Work of breathing assessment",
    "Mental status changes",
    "Treatment response",
    "Risk of decompensation"
  ]
}
```

### 2. Evidence Package
```json
{
  "sources": [
    {
      "pmid": "12345678",
      "title": "NIV vs intubation in COPD exacerbations",
      "key_finding": "NIV reduces intubation rate by 65% (NNT=4)",
      "relevance": "high"
    }
  ],
  "synthesis": "Current evidence suggests NIV as first-line...",
  "guideline_references": ["GOLD 2023", "BTS/NICE guidelines"]
}
```

### 3. Case Context So Far
```json
{
  "patient_summary": "Brief patient presentation",
  "previous_decisions": ["Initial assessment", "First interventions"],
  "revealed_information": ["Vitals", "Labs ordered", "Initial response"]
}
```

### 4. Clinical Question Theme
- Type: diagnostic / therapeutic / prognostic / procedural
- Specialty focus: EM / ICU / Hospitalist / etc.
- Complexity level: straightforward / nuanced / controversial

## Output Format

Return a JSON object with this exact structure:

```json
{
  "section_title": "Clinical decision point framed as a question",
  "discussion_markdown": "FULL MARKDOWN TEXT HERE (see style guide below)",
  "evidence_citations": [
    {
      "claim": "Specific factual claim made in discussion",
      "pmid": "12345678",
      "summary": "Brief context for this citation"
    }
  ],
  "clinical_pearl_placeholder": {
    "topic": "What clinical pearl is needed here",
    "context": "Why this pearl matters at this decision point",
    "preferred_expert": "Optional: specialty if specific expertise needed"
  },
  "expert_input_prompt": {
    "question": "Specific question for expert reviewer",
    "rationale": "Why expert input is valuable here",
    "expertise_needed": "Type of clinical expertise required"
  },
  "word_count": 300,
  "confidence_level": "high|medium|low - how confident AI is in this synthesis"
}
```

## Discussion Content Style Guide

### Register and Tone
- **Expert-to-colleague** register: "We need to weigh..." not "The clinician should..."
- **First person acceptable**: "I typically assess..." when discussing clinical reasoning
- **Conversational but precise**: Balance accessibility with clinical accuracy
- **Acknowledge uncertainty explicitly**: "The evidence here is limited..." / "This remains controversial..."

### Evidence Integration
- **All factual claims must be cited**: Use inline citations (PMID:12345678)
- **Synthesize, don't just list**: Explain how evidence applies to THIS case
- **Highlight quality**: "A high-quality RCT (PMID:12345678) demonstrated..."
- **Note limitations**: "This study excluded patients with..."
- **Reference guidelines**: "The 2023 GOLD guidelines recommend..." (with citation)

### Clinical Reasoning Framework
Structure discussion to guide thinking:

1. **Frame the clinical question** (1 sentence)
   - "The key decision here is whether immediate intubation is necessary."

2. **Present the clinical context** (2-3 sentences)
   - What makes this decision point challenging?
   - What's at stake if we get it wrong?

3. **Synthesize relevant evidence** (3-5 sentences)
   - What does the literature tell us?
   - How does it apply to THIS patient?
   - Use bold for **key thresholds**, **doses**, **timeframes**

4. **Address nuance and uncertainty** (2-3 sentences)
   - What factors modify our approach?
   - Where is clinical judgment critical?
   - Include `[CLINICAL PEARL NEEDED: topic]` for expert wisdom

5. **Guide toward decision** (1-2 sentences)
   - What should we assess/monitor?
   - What's the next step in reasoning?

### Formatting Standards

**Use markdown effectively:**
- Bold for **critical values**, **drug doses**, **timeframes**
- Italics for *emphasis* on nuanced points
- Bullet lists for criteria or options
- Inline code for `specific lab values` or `medications`

**Clinical pearl placeholders:**
```markdown
[CLINICAL PEARL NEEDED: How to assess work of breathing in obese patients]
```

**Expert input placeholders:**
```markdown
[EXPERT INPUT NEEDED: At what pH do you typically transition from NIV to intubation in COPD?]
```

**Evidence citations:**
- Inline format: (PMID:12345678)
- Place immediately after claim
- One PMID per specific factual claim

### Length Guidance
- **Target: 200-400 words** per decision point
- Minimum: 150 words (for straightforward decisions)
- Maximum: 500 words (for complex/controversial decisions)
- Report actual word_count in JSON output

### Quality Markers

**Good discussion includes:**
- Clear clinical reasoning framework
- Evidence synthesis (not just citation dumping)
- Explicit acknowledgment of uncertainty
- Practical application to the case
- Identification of knowledge gaps (pearl/expert placeholders)

**Avoid:**
- Cookbook medicine without reasoning
- Evidence listed without synthesis
- Ignoring uncertainty or controversy
- Generic discussions that don't connect to the case
- Unsupported claims (every fact needs a PMID)

## Examples

### Example 1: Therapeutic Decision Point

**Input:**
```json
{
  "decision_point_id": "dp_002",
  "clinical_question": "Should we start norepinephrine now?",
  "context": "Septic shock patient, lactate 4.2, MAP 58 on 30mL/kg fluids"
}
```

**Output discussion_markdown:**
```markdown
The critical question is whether we've reached the threshold for vasopressor initiation. We have a patient with persistent hypotension (MAP 58 mmHg) and tissue hypoperfusion (lactate 4.2 mmol/L) despite initial fluid resuscitation.

The Surviving Sepsis Campaign guidelines recommend initiating vasopressors when MAP remains **<65 mmHg** despite adequate fluid resuscitation (PMID:32222812). Norepinephrine is the first-line agent, with a typical starting dose of **0.05-0.1 mcg/kg/min** (PMID:27090849). Importantly, we don't need to complete full fluid resuscitation before starting pressors - early vasopressor use (alongside fluids) may improve outcomes in distributive shock (PMID:30346812).

[CLINICAL PEARL NEEDED: How to balance fluid resuscitation vs early pressors in septic shock]

The CLOVERS trial (PMID:36688507) recently challenged traditional liberal fluid strategies, showing no benefit and possible harm from restrictive approaches in some patients. For this patient with ongoing hypoperfusion, initiating norepinephrine now while continuing judicious fluid resuscitation is appropriate.

Key monitoring points: MAP response, lactate clearance, and evidence of end-organ perfusion (urine output, mental status). We should target MAP **≥65 mmHg** initially, but consider higher targets if the patient has chronic hypertension (PMID:27272154).

[EXPERT INPUT NEEDED: In patients with chronic hypertension, what MAP target do you use in septic shock?]
```

### Example 2: Diagnostic Decision Point

**Input:**
```json
{
  "decision_point_id": "dp_005",
  "clinical_question": "Does this patient need a CT head before LP?",
  "context": "Suspected meningitis, no focal neuro deficits, GCS 15"
}
```

**Output discussion_markdown:**
```markdown
The decision to obtain CT imaging before lumbar puncture (LP) in suspected meningitis involves balancing the risk of cerebral herniation against the critical importance of early antibiotics.

The Infectious Diseases Society of America (IDSA) guidelines identify specific high-risk features requiring pre-LP CT: immunocompromised state, history of CNS disease, new-onset seizure, papilledema, altered consciousness (GCS <11), or focal neurological deficit (PMID:15714901). A landmark prospective study of 301 adults with suspected meningitis found that patients WITHOUT these features had **<1% risk** of herniation after LP (PMID:11453706).

Our patient has none of these high-risk features. Importantly, CT findings don't reliably predict herniation risk (PMID:10770981), and obtaining unnecessary imaging delays antibiotic administration - a delay associated with worse outcomes in bacterial meningitis (PMID:16467542).

[CLINICAL PEARL NEEDED: How to perform a rapid bedside neurological assessment for LP safety]

The evidence supports proceeding directly to LP in this low-risk patient, with blood cultures and empiric antibiotics given immediately if there's any delay in performing the LP. If we do find high opening pressure (>25 cm H2O), we should remove minimal CSF volume and obtain delayed neuroimaging.

[EXPERT INPUT NEEDED: In your practice, what GCS threshold prompts you to get CT before LP?]
```

## Edge Cases and Special Scenarios

### When Evidence is Limited
```markdown
The literature on [specific question] is surprisingly sparse. The best available evidence comes from [describe study] (PMID:12345678), but this was [limitation: small sample/retrospective/different population].

[EXPERT INPUT NEEDED: In the absence of strong evidence, what's your approach to [clinical question]?]

Given the uncertainty, we need to rely on [physiologic principles/extrapolation from related conditions/careful risk-benefit analysis].
```

### When Guidelines Conflict
```markdown
There's notable divergence between major guidelines on this issue. The [Society A] recommends [approach] (PMID:12345678), while [Society B] suggests [different approach] (PMID:23456789). This discrepancy reflects [underlying reason: different patient populations/different values placed on outcomes/different evidence interpretation].

[EXPERT INPUT NEEDED: How do you reconcile conflicting guideline recommendations in practice?]
```

### When Decision is Time-Critical
```markdown
This is a **time-critical decision** - delays of even [timeframe] can impact [outcome]. The evidence for rapid intervention comes from [study] (PMID:12345678), showing [specific finding about timing].

We need to make this decision with **incomplete information**, weighing the risks of [action] against [inaction]. In this scenario, [reasoning for approach].
```

## Validation Checklist

Before submitting output, verify:

- [ ] Every factual claim has a PMID citation
- [ ] Word count is 200-400 (or justified if outside range)
- [ ] Clinical reasoning framework is clear
- [ ] Uncertainty is acknowledged where appropriate
- [ ] At least one clinical pearl placeholder (if knowledge gap exists)
- [ ] Expert input prompt is specific and actionable
- [ ] Discussion connects directly to the case context
- [ ] Key clinical values are **bolded**
- [ ] JSON structure is valid and complete
- [ ] Tone is expert-to-colleague, not didactic
- [ ] Evidence is synthesized, not just listed

## Notes for AI Generation

- **Prioritize accuracy over comprehensiveness**: Better to flag uncertainty than to make unsupported claims
- **Use confidence_level field**: Signal when evidence base is weak or AI is uncertain
- **Be specific with placeholders**: "CLINICAL PEARL NEEDED: [specific topic]" not just "CLINICAL PEARL NEEDED"
- **Connect to the case**: Generic discussions are less valuable than case-specific reasoning
- **Highlight controversy**: Where expert opinion varies, acknowledge this explicitly
- **Consider the learner**: What misconceptions might they have? What's the "teachable moment"?
