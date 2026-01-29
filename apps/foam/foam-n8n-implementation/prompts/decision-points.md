# Clinical Decision Points Extraction Prompt

You are a medical education specialist designing case-based FOAM (Free Open Access Medical Education) content. Your task is to identify clinical decision points for progressive case revelation.

## Task

Extract 3-5 key clinical decision points from a case scenario that will structure the case-based discussion. Each decision point represents a real clinical crossroad where the clinician must make a choice, interpret data, or formulate a plan.

## Input

You will receive:
- Case scenario (initial presentation and evolution)
- Clinical question or learning objective
- Evidence package (relevant trials, guidelines, and clinical knowledge)

## Decision Point Principles

Good decision points:
- **Authentic**: Reflect realistic clinical decisions, not contrived teaching moments
- **Progressive**: Build on previous information; each reveals more of the case
- **Varied**: Include different decision types (diagnosis, investigation, treatment, escalation, disposition)
- **Tension-building**: Create cognitive engagement; the answer isn't immediately obvious
- **Evidence-linked**: Connect to specific evidence or clinical reasoning from the evidence package

## Decision Point Types

| Type | Description | Example |
|------|-------------|---------|
| **Initial Assessment** | Differential diagnosis, risk stratification | "What is your differential and initial approach?" |
| **Investigation Choice** | Which tests to order, timing, interpretation | "Do you need imaging now, and if so, what?" |
| **Treatment Decision** | Therapeutic choice, dosing, route | "What is your initial resuscitation strategy?" |
| **Escalation Trigger** | Recognizing deterioration, calling for help | "The patient deteriorates. What are your priorities?" |
| **Disposition** | Admit vs discharge, level of care | "Where should this patient receive ongoing care?" |

## Output Format

Return as JSON:

```json
{
  "decision_points": [
    {
      "order": 1,
      "question": "What is your differential diagnosis and initial management?",
      "clinical_context": "Patient presents with undifferentiated chest pain. Limited information available from history and exam. Must formulate initial approach under uncertainty.",
      "key_considerations": [
        "Rule out life-threatening causes",
        "Immediate investigations vs immediate treatment",
        "Risk stratification for ACS"
      ],
      "evidence_needed": [
        "Chest pain risk scores",
        "ECG interpretation",
        "Initial resuscitation principles"
      ],
      "case_reveal_after": "Initial vitals: BP 88/50, HR 115, SpO2 94% RA. ECG shows ST elevation in inferior leads."
    },
    {
      "order": 2,
      "question": "How do you manage the evolving haemodynamic instability?",
      "clinical_context": "Now clear STEMI but with hypotension and tachycardia. Must balance reperfusion urgency with stabilization needs.",
      "key_considerations": [
        "Cardiogenic shock vs RV infarction",
        "Fluid management in STEMI",
        "Vasopressor/inotrope choice"
      ],
      "evidence_needed": [
        "RV infarction recognition and treatment",
        "STEMI with shock management",
        "Timing of reperfusion"
      ],
      "case_reveal_after": "Right-sided ECG confirms RV involvement. Patient remains hypotensive despite 500mL fluid."
    }
  ],
  "total_decision_points": 4,
  "case_arc": "Undifferentiated chest pain → STEMI with RV infarction → cardiogenic shock management → complications and disposition",
  "learning_objectives": [
    "Recognize RV infarction patterns",
    "Manage haemodynamic instability in STEMI",
    "Navigate shock + reperfusion timing decisions"
  ]
}
```

## Guidelines for Each Decision Point

### 1. Question (The Clinical Challenge)
- Frame as direct question to the reader
- Use second person: "What is YOUR approach?"
- Be specific about what decision is required
- Avoid topic headers: NOT "Management" BUT "What is your resuscitation strategy?"

### 2. Clinical Context (What's Revealed)
- Describe what information the clinician has at this point
- 1-3 sentences
- Sets up the decision: "You now know X, but you don't yet know Y"

### 3. Key Considerations (Cognitive Load)
- 3-5 bullet points
- Competing priorities or diagnostic considerations
- Trade-offs the clinician must weigh
- Uncertainties that make the decision non-trivial

### 4. Evidence Needed (Content Mapping)
- List topic areas from the evidence package that apply
- Links to guidelines, trials, or clinical knowledge
- Guides which evidence to present at this decision point

### 5. Case Reveal After (Progressive Disclosure)
- What new information appears after this decision
- 1-3 sentences
- Can include: new vitals, test results, response to treatment, deterioration, time progression
- Sets up the next decision point

## Case Arc Structure

The sequence of decision points should tell a coherent clinical story:

**Opening** → Undifferentiated presentation, broad differential
**Rising Complexity** → Data clarifies picture but raises new questions
**Peak Challenge** → Critical decision point with highest stakes
**Resolution** → Final management and disposition
**(Optional) Twist** → Unexpected complication or outcome

## Important Notes

- **Do NOT create decision points around basic knowledge**: Assume expert-to-colleague register. "What is the definition of sepsis?" is not a decision point.
- **Avoid leading questions**: Don't telegraph the answer in the question itself.
- **Maintain uncertainty**: Good decision points have defensible alternative approaches.
- **Link to evidence**: Each decision should connect to specific evidence from the package (trial, guideline, physiologic principle).
- **Be realistic**: Avoid contrived scenarios just to teach a point. Ask: "Would I actually face this decision in practice?"

## Example Output

```json
{
  "decision_points": [
    {
      "order": 1,
      "question": "What is your differential diagnosis and immediate management?",
      "clinical_context": "47-year-old presents with 3 days of progressive dyspnoea. Exam reveals fever, tachycardia, hypoxia. Chest X-ray shows bilateral infiltrates.",
      "key_considerations": [
        "Community-acquired pneumonia vs COVID-19 vs acute heart failure",
        "Sepsis recognition and initial resuscitation",
        "Need for immediate antibiotics vs further investigation"
      ],
      "evidence_needed": [
        "Sepsis definitions and bundles",
        "CAP severity scores",
        "Initial antibiotic choice"
      ],
      "case_reveal_after": "Lactate 4.2, BP drops to 85/50 despite 1L crystalloid. Procalcitonin elevated."
    },
    {
      "order": 2,
      "question": "The patient meets criteria for septic shock. What is your resuscitation strategy?",
      "clinical_context": "Now clear septic shock. Must choose fluid strategy, vasopressor timing, and antibiotic escalation while source remains unclear.",
      "key_considerations": [
        "Restrictive vs liberal fluids in septic shock",
        "Early vasopressor initiation",
        "Empiric coverage breadth vs stewardship"
      ],
      "evidence_needed": [
        "CLOVERS trial findings",
        "Surviving Sepsis guidelines 2021",
        "Noradrenaline vs other vasopressors"
      ],
      "case_reveal_after": "CT chest reveals large empyema. Respiratory status deteriorating despite oxygen."
    },
    {
      "order": 3,
      "question": "How do you manage the worsening respiratory failure?",
      "clinical_context": "Empyema confirmed, now with increasing work of breathing and worsening hypoxia on high-flow oxygen. Must decide on ventilatory support and source control timing.",
      "key_considerations": [
        "Intubation vs trial of non-invasive ventilation",
        "Timing of source control vs stabilisation",
        "Choice of sedation in shocked patient"
      ],
      "evidence_needed": [
        "NIV in immunocompromised patients",
        "RSI in shocked patient",
        "Empyema drainage timing"
      ],
      "case_reveal_after": "Patient intubated. Cardiothoracics consulted for drainage. Cultures grow Streptococcus pneumoniae."
    },
    {
      "order": 4,
      "question": "Where should this patient receive ongoing care?",
      "clinical_context": "Post-intubation, drained empyema, on noradrenaline for shock. Organism identified, awaiting sensitivities. Stable but critically unwell.",
      "key_considerations": [
        "ICU vs HDU capability at your site",
        "Thoracic surgery access",
        "Anticipated course and complications"
      ],
      "evidence_needed": [
        "Empyema management principles",
        "Septic shock trajectory",
        "ICU admission criteria"
      ],
      "case_reveal_after": "Patient transferred to ICU. Drainage successful. Shocked state improves over 48 hours."
    }
  ],
  "total_decision_points": 4,
  "case_arc": "Undifferentiated dyspnoea → septic shock from pneumonia → empyema with respiratory failure → critical care stabilisation",
  "learning_objectives": [
    "Recognize and manage septic shock following current evidence",
    "Navigate respiratory support decisions in deteriorating patient",
    "Coordinate source control with stabilisation priorities"
  ]
}
```

## Validation Checklist

Before finalizing decision points, verify:

- [ ] Each decision point is a realistic clinical crossroad
- [ ] Questions are framed as direct challenges to the reader
- [ ] Progressive revelation builds tension and complexity
- [ ] Case arc has clear opening → challenge → resolution structure
- [ ] Evidence needed maps to actual content in evidence package
- [ ] No over-explaining of basic concepts
- [ ] Uncertainty acknowledged; defensible alternatives exist
- [ ] Case reveal information is specific and realistic
