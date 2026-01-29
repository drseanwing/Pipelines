# Dose and Clinical Value Extraction Prompt

## Purpose
Extract all drug doses, clinical thresholds, and quantitative values from medical content that require expert verification before publication.

## Task
Analyze the provided medical content and systematically extract all numerical clinical values, drug doses, thresholds, and time-critical information that could impact patient safety if incorrect.

## Categories to Extract

### 1. Drug Doses
For each medication mentioned, extract:
- **Drug name**: Generic and brand names
- **Dose**: Exact numerical value with units
- **Route**: Administration route (IV, PO, IM, SC, etc.)
- **Frequency**: Dosing interval or timing
- **Duration**: Treatment duration if specified
- **Indication**: Clinical context for this dose
- **Special populations**: Paediatric, geriatric, renal/hepatic adjustments

### 2. Clinical Thresholds
- **Parameter**: What is being measured (BP, HR, SpO2, etc.)
- **Threshold value**: Numerical cutoff with units
- **Direction**: > , <, ≥, ≤, range
- **Clinical context**: When this threshold applies
- **Action required**: What to do when threshold is met/exceeded

### 3. Laboratory Values
- **Test name**: Full name of the laboratory parameter
- **Normal range**: Reference range if provided
- **Critical threshold**: Values requiring immediate action
- **Clinical significance**: What abnormal values indicate
- **Timing**: When to recheck

### 4. Timeframes
- **Intervention**: What needs to be done
- **Time window**: Critical timing (e.g., "within 1 hour", "in first 6 hours")
- **Clinical context**: Why this timing matters
- **Consequences of delay**: What happens if timeframe is missed

### 5. Contraindications
- **Type**: Absolute or relative
- **Condition/medication**: What is contraindicated
- **Reason**: Why it is contraindicated
- **Source**: Citation supporting this contraindication

## Required Metadata for Each Extraction

### Original Text
Exact quote from the source document (verbatim).

### Location
- Section heading
- Subsection if applicable
- Paragraph identifier

### Source Citation
- PMID if available
- DOI if available
- Guideline name and year
- "Not cited" if no source provided

### Verification Priority
**HIGH**: Life-threatening if incorrect
- Vasoactive drug doses
- Insulin doses
- Anticoagulation doses
- Resuscitation thresholds
- Critical time windows

**MEDIUM**: Clinically important but not immediately life-threatening
- Standard antibiotic doses
- Non-critical laboratory thresholds
- Monitoring parameters
- Stepwise management thresholds

**LOW**: Contextual or educational
- Historical information
- General prevalence statistics
- Non-critical timeframes

### Confidence Level
Based on citation quality:
- **HIGH**: Multiple high-quality RCTs or meta-analyses cited
- **MEDIUM**: Single RCT, guideline, or cohort study cited
- **LOW**: Review article, case series, or no citation
- **UNCERTAIN**: Conflicting sources or unclear wording

### Risk if Incorrect
Describe specific patient safety risks if this value is wrong:
- Overdose/underdose consequences
- Missed critical intervention timing
- Inappropriate management decisions
- Diagnostic errors

## Output Format

Provide results as valid JSON:

```json
{
  "extraction_summary": {
    "total_items": 0,
    "high_priority": 0,
    "medium_priority": 0,
    "low_priority": 0,
    "uncited_items": 0,
    "extraction_date": "YYYY-MM-DD",
    "content_source": "filename or identifier"
  },
  "drug_doses": [
    {
      "drug": "Noradrenaline",
      "dose": "0.1-0.5 mcg/kg/min",
      "route": "IV infusion",
      "frequency": "Continuous",
      "duration": "Until haemodynamically stable",
      "indication": "Septic shock - first-line vasopressor",
      "special_populations": {
        "paediatric": "Same dose range per kg",
        "renal": "No adjustment",
        "hepatic": "Use with caution"
      },
      "original_text": "Start noradrenaline at 0.1-0.5 mcg/kg/min as first-line vasopressor in septic shock",
      "location": {
        "section": "Initial Management",
        "subsection": "Vasopressor Support"
      },
      "source_pmid": "32735842",
      "source_doi": "10.1056/NEJMoa1910039",
      "verification_priority": "HIGH",
      "confidence_level": "HIGH",
      "risk_if_incorrect": "Underdosing may fail to restore adequate perfusion leading to organ failure. Overdosing may cause excessive vasoconstriction, arrhythmias, or limb ischaemia."
    }
  ],
  "clinical_thresholds": [
    {
      "parameter": "Mean Arterial Pressure (MAP)",
      "threshold_value": "65",
      "units": "mmHg",
      "direction": "≥",
      "clinical_context": "Resuscitation target in septic shock",
      "action_required": "Maintain with fluids and vasopressors",
      "original_text": "Target MAP ≥ 65 mmHg during initial resuscitation",
      "location": {
        "section": "Initial Management",
        "subsection": "Haemodynamic Targets"
      },
      "source_pmid": "32735842",
      "verification_priority": "HIGH",
      "confidence_level": "HIGH",
      "risk_if_incorrect": "Lower target may permit inadequate organ perfusion; higher target may increase vasopressor-related complications without benefit."
    }
  ],
  "lab_values": [
    {
      "test_name": "Lactate",
      "normal_range": "< 2 mmol/L",
      "critical_threshold": "> 4 mmol/L",
      "direction": ">",
      "clinical_significance": "Tissue hypoperfusion, increased mortality risk",
      "timing": "Recheck within 2-4 hours if elevated",
      "original_text": "Lactate > 4 mmol/L indicates severe tissue hypoperfusion and mandates aggressive resuscitation",
      "location": {
        "section": "Initial Assessment",
        "subsection": "Laboratory Investigations"
      },
      "source_pmid": "28114553",
      "verification_priority": "HIGH",
      "confidence_level": "HIGH",
      "risk_if_incorrect": "Incorrect threshold may lead to under-resuscitation or delayed recognition of shock."
    }
  ],
  "timeframes": [
    {
      "intervention": "Antibiotic administration",
      "time_window": "Within 1 hour",
      "reference_point": "Recognition of sepsis",
      "clinical_context": "Sepsis-3 guideline recommendation",
      "consequences_of_delay": "Each hour delay associated with increased mortality",
      "original_text": "Administer broad-spectrum antibiotics within 1 hour of sepsis recognition",
      "location": {
        "section": "Initial Management",
        "subsection": "Antimicrobial Therapy"
      },
      "source_pmid": "32105632",
      "verification_priority": "HIGH",
      "confidence_level": "HIGH",
      "risk_if_incorrect": "Incorrect timeframe may delay life-saving treatment or create unrealistic expectations."
    }
  ],
  "contraindications": [
    {
      "type": "Absolute",
      "drug_or_intervention": "High-dose steroids",
      "contraindication": "Active fungal infection",
      "reason": "Immunosuppression promotes fungal proliferation",
      "alternative": "Treat infection first, then consider steroids if indicated",
      "original_text": "High-dose corticosteroids are absolutely contraindicated in active fungal infections",
      "location": {
        "section": "Steroid Therapy",
        "subsection": "Contraindications"
      },
      "source_pmid": "18184957",
      "verification_priority": "HIGH",
      "confidence_level": "MEDIUM",
      "risk_if_incorrect": "Failing to respect this contraindication may lead to disseminated fungal infection and death."
    }
  ]
}
```

## Special Attention Points

### Paediatric Dosing
- Always note if dose is weight-based (per kg)
- Extract maximum doses for weight-based calculations
- Note age-specific considerations
- Flag any special formulations

### Renal/Hepatic Adjustments
- Extract dose modification criteria (e.g., "if CrCl < 30")
- Note contraindications in severe dysfunction
- Flag drugs requiring therapeutic monitoring

### Maximum Doses and Duration Limits
- Total daily maximum
- Single dose maximum
- Duration limits (e.g., "maximum 7 days")
- Cumulative dose limits if applicable

### Drug Interactions
- Interacting medications
- Severity of interaction
- Mechanism if provided
- Management strategy

### Critical Calculation Elements
- Dilution instructions
- Infusion rate calculations
- Concentration specifications
- Compatibility information

## Quality Checks

Before finalizing extraction:
1. **Completeness**: Have all numerical values been captured?
2. **Accuracy**: Are quotes verbatim from source?
3. **Context**: Is clinical context clear for each value?
4. **Citations**: Are sources properly attributed?
5. **Priority**: Is verification priority appropriately assigned?
6. **Risks**: Are safety implications clearly stated?

## Notes for Verifiers

- Items marked HIGH priority require expert clinician review
- Uncited items should be flagged for source identification
- Conflicting values across sections should be highlighted
- Ambiguous wording should be noted for clarification
- International vs local guidelines may differ - note variants

## Example Usage

Input this prompt to an LLM along with medical draft content to receive structured JSON extraction of all clinical values requiring verification before publication.
