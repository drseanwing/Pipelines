# Reviewer Checklist Generator

## Purpose
Generate a comprehensive, structured checklist for expert clinical reviewers to validate draft FOAM content. This checklist ensures systematic verification of clinical accuracy, completeness, and educational quality.

## Input Requirements
- Draft content (markdown/HTML)
- Validation findings (from dose-extraction, threshold-validation, etc.)
- Content metadata (topic, format, target audience)
- Regional/institutional context (optional)

## Task
Generate a structured reviewer checklist in JSON format that guides expert clinicians through a complete validation process, prioritizing patient safety and educational accuracy.

## Checklist Components

### A. Clinical Accuracy Section
**Objective**: Verify all clinical statements, especially those with patient safety implications.

**Subcategories**:

1. **Drug Doses to Verify**
   - Extract all drug dosing information from draft
   - Cross-reference with validation findings
   - Flag doses with HIGH priority (emergency drugs, narrow therapeutic index)
   - Include context (indication, patient population, route)
   - Provide space for reviewer verification and notes

2. **Clinical Thresholds to Confirm**
   - Vital sign thresholds (e.g., "SBP < 90 mmHg")
   - Laboratory value cutoffs (e.g., "K+ > 6.5 mEq/L")
   - Diagnostic criteria thresholds
   - Treatment escalation triggers
   - Include source reference requirement

3. **Statistical Claims to Verify**
   - Sensitivity/specificity values
   - Mortality/morbidity statistics
   - Incidence/prevalence figures
   - Risk ratios, odds ratios, NNT/NNH
   - Require primary source citation

4. **Guideline Alignment**
   - Current guideline recommendations cited
   - Guideline version/year verification
   - Deviations from guidelines (if any) - require justification
   - Conflicting guideline identification

### B. Clinical Pearls Needed
**Objective**: Identify knowledge gaps requiring expert input.

**For each pearl**:
- **Pearl ID**: Unique identifier
- **Topic**: Specific clinical question
- **Context**: Why this pearl is needed (section, teaching point)
- **Expert Prompt**: Specific question to ask expert reviewer
- **Priority**: HIGH/MEDIUM/LOW based on:
  - Patient safety impact
  - Common knowledge gap
  - Pedagogical importance
- **Pearl Type**:
  - Clinical reasoning
  - Practical technique
  - Common pitfall
  - Mnemonics/memory aids
  - Real-world variation
- **Space for pearl**: Reviewer fills in

### C. Regional Considerations
**Objective**: Adapt content for local practice context.

**Items to address**:

1. **Drug Availability**
   - Drugs not available in region
   - Alternative formulations needed
   - Different drug names (generic vs. trade)

2. **Local Practice Variations**
   - Standard of care differences
   - Resource availability (ICU beds, imaging, specialists)
   - Regulatory/legal constraints
   - Institutional protocols

3. **Epidemiological Differences**
   - Disease prevalence variations
   - Resistance patterns
   - Endemic conditions

### D. Special Populations
**Objective**: Ensure comprehensive coverage of high-risk groups.

**Categories**:

1. **Paediatric Considerations**
   - Weight-based dosing verification
   - Age-specific contraindications
   - Developmental considerations
   - Paediatric-specific presentations

2. **Pregnancy/Lactation**
   - Medication safety categories
   - Physiological changes affecting management
   - Fetal/neonatal risks
   - Breastfeeding compatibility

3. **Elderly/Frail**
   - Geriatric syndrome considerations
   - Dose adjustments for age
   - Polypharmacy interactions
   - Atypical presentations

4. **Renal/Hepatic Impairment**
   - Dose adjustments by CrCl/eGFR
   - Contraindications by liver function
   - Drug accumulation risks
   - Monitoring requirements

### E. Content Completeness
**Objective**: Assess overall content quality and coverage.

**Assessment areas**:

1. **Missing Sections**
   - Expected sections not present
   - Critical topics omitted
   - Logical flow gaps

2. **Sections Needing Expansion**
   - Insufficient depth for topic
   - Missing key details
   - Inadequate explanation

3. **Balance Assessment**
   - Appropriate depth across sections
   - Target audience alignment
   - Theory vs. practice balance
   - Evidence vs. experience balance

## Output Format

```json
{
  "checklist_metadata": {
    "checklist_id": "uuid-v4",
    "draft_id": "uuid-v4",
    "draft_title": "Title of draft content",
    "draft_topic": "Clinical topic",
    "format": "clinical-review",
    "target_audience": "EM physicians/ICU nurses/etc",
    "generated_at": "ISO 8601 timestamp",
    "estimated_review_time": "45 minutes",
    "time_breakdown": {
      "clinical_accuracy": "20 min",
      "pearls": "15 min",
      "completeness": "10 min"
    },
    "priority_level": "HIGH/MEDIUM/LOW",
    "reviewer_specialty_needed": "Emergency Medicine/Critical Care/etc"
  },

  "clinical_accuracy": {
    "doses_to_verify": [
      {
        "item_id": "dose-001",
        "drug": "Amiodarone",
        "stated_dose": "300mg IV push",
        "indication": "Cardiac arrest - VF/pVT",
        "route": "IV",
        "patient_population": "Adult",
        "context_from_draft": "After third shock in cardiac arrest...",
        "priority": "HIGH",
        "safety_concern": "Incorrect dose can cause hypotension/bradycardia",
        "verified": false,
        "correct_dose": "",
        "reference_source": "",
        "reviewer_notes": "",
        "date_verified": ""
      }
    ],

    "thresholds_to_confirm": [
      {
        "item_id": "threshold-001",
        "parameter": "Systolic Blood Pressure",
        "stated_threshold": "< 90 mmHg",
        "context": "Definition of shock",
        "clinical_significance": "Treatment trigger",
        "priority": "HIGH",
        "verified": false,
        "correct_threshold": "",
        "source_guideline": "",
        "reviewer_notes": ""
      }
    ],

    "claims_to_verify": [
      {
        "item_id": "claim-001",
        "claim_type": "Statistical",
        "claim_text": "Troponin has 95% sensitivity for MI at 6 hours",
        "requires_citation": true,
        "primary_source_needed": true,
        "verified": false,
        "correct_statement": "",
        "reference": "",
        "reviewer_notes": ""
      }
    ],

    "guideline_alignment": [
      {
        "item_id": "guideline-001",
        "guideline_name": "AHA ACLS Guidelines",
        "guideline_year": "2020",
        "recommendation_cited": "Epinephrine 1mg every 3-5 min",
        "alignment_status": "TO_VERIFY",
        "current_version": "",
        "deviation_noted": false,
        "deviation_justification": "",
        "reviewer_notes": ""
      }
    ]
  },

  "clinical_pearls_needed": [
    {
      "pearl_id": "pearl-001",
      "topic": "Amiodarone administration technique",
      "section": "Cardiac Arrest Management",
      "context": "Draft states dose but lacks practical administration details",
      "pearl_type": "Practical technique",
      "expert_prompt": "What are the key practical tips for administering amiodarone during cardiac arrest? (e.g., dilution, push rate, common errors)",
      "priority": "MEDIUM",
      "teaching_value": "HIGH",
      "common_knowledge_gap": true,
      "pearl_provided": "",
      "reviewer_name": "",
      "date_provided": ""
    },
    {
      "pearl_id": "pearl-002",
      "topic": "Recognizing early sepsis in elderly",
      "section": "Sepsis Recognition",
      "context": "Draft covers standard criteria but lacks atypical presentations",
      "pearl_type": "Common pitfall",
      "expert_prompt": "What are the atypical presentations of sepsis in elderly patients that trainees commonly miss?",
      "priority": "HIGH",
      "teaching_value": "HIGH",
      "common_knowledge_gap": true,
      "patient_safety_impact": true,
      "pearl_provided": "",
      "reviewer_name": "",
      "date_provided": ""
    }
  ],

  "regional_considerations": [
    {
      "item_id": "regional-001",
      "category": "Drug availability",
      "item": "Norepinephrine",
      "issue": "May not be available in some rural centers",
      "alternative_needed": true,
      "suggested_alternative": "",
      "local_protocol_reference": "",
      "reviewer_notes": ""
    },
    {
      "item_id": "regional-002",
      "category": "Practice variation",
      "item": "CT availability for PE diagnosis",
      "issue": "After-hours CT access varies by institution",
      "impact_on_content": "May need alternative diagnostic pathway",
      "local_adaptation_needed": "",
      "reviewer_notes": ""
    }
  ],

  "special_populations": [
    {
      "category": "Paediatric",
      "items": [
        {
          "item_id": "peds-001",
          "topic": "Paediatric dosing",
          "current_coverage": "Not addressed",
          "needs_addition": true,
          "specific_requirement": "Weight-based epinephrine dosing for ages 1-12",
          "reviewer_input": "",
          "priority": "HIGH"
        }
      ]
    },
    {
      "category": "Pregnancy/Lactation",
      "items": [
        {
          "item_id": "preg-001",
          "topic": "Medication safety in pregnancy",
          "current_coverage": "Partial - only contraindications listed",
          "needs_addition": true,
          "specific_requirement": "Safe alternatives for pregnant patients",
          "reviewer_input": "",
          "priority": "MEDIUM"
        }
      ]
    },
    {
      "category": "Elderly/Frail",
      "items": [
        {
          "item_id": "geri-001",
          "topic": "Dose adjustment for elderly",
          "current_coverage": "Not addressed",
          "needs_addition": true,
          "specific_requirement": "Age-related dosing considerations for renally cleared drugs",
          "reviewer_input": "",
          "priority": "HIGH"
        }
      ]
    },
    {
      "category": "Renal/Hepatic Impairment",
      "items": [
        {
          "item_id": "renal-001",
          "topic": "Renal dose adjustment",
          "current_coverage": "Generic statement only",
          "needs_addition": true,
          "specific_requirement": "Specific CrCl-based dosing table",
          "reviewer_input": "",
          "priority": "HIGH"
        }
      ]
    }
  ],

  "content_completeness": {
    "missing_sections": [
      {
        "section_id": "miss-001",
        "expected_section": "Differential Diagnosis",
        "justification": "Critical for clinical reasoning",
        "priority": "HIGH",
        "reviewer_assessment": "",
        "needs_addition": true
      }
    ],

    "sections_needing_expansion": [
      {
        "section_id": "expand-001",
        "section_name": "Physical Examination",
        "current_depth": "Superficial - only lists exam components",
        "needed_depth": "Should include technique and interpretation",
        "priority": "MEDIUM",
        "reviewer_suggestions": ""
      }
    ],

    "balance_assessment": {
      "overall_depth": "TO_ASSESS",
      "target_audience_alignment": "TO_ASSESS",
      "theory_practice_balance": "TO_ASSESS",
      "evidence_experience_balance": "TO_ASSESS",
      "reviewer_comments": ""
    },

    "overall_assessment": "TO_DETERMINE: Complete/Needs expansion/Major gaps",
    "overall_reviewer_comments": ""
  },

  "reviewer_instructions": {
    "steps": [
      {
        "step": 1,
        "action": "Review Clinical Accuracy section",
        "time_estimate": "20 min",
        "instructions": "Verify all doses, thresholds, and statistical claims. Mark verified=true when confirmed. Add correct values and references where needed."
      },
      {
        "step": 2,
        "action": "Provide Clinical Pearls",
        "time_estimate": "15 min",
        "instructions": "Answer expert prompts for each pearl. Focus on practical, teachable insights from your clinical experience."
      },
      {
        "step": 3,
        "action": "Address Regional Considerations",
        "time_estimate": "5 min",
        "instructions": "Note any local practice variations, drug availability issues, or institutional adaptations needed."
      },
      {
        "step": 4,
        "action": "Review Special Populations",
        "time_estimate": "5 min",
        "instructions": "Ensure adequate coverage of high-risk groups. Add specific requirements where missing."
      },
      {
        "step": 5,
        "action": "Assess Content Completeness",
        "time_estimate": "5 min",
        "instructions": "Evaluate overall structure, balance, and depth. Note any missing sections or areas needing expansion."
      },
      {
        "step": 6,
        "action": "Final Review and Sign-off",
        "time_estimate": "5 min",
        "instructions": "Complete overall assessment and reviewer sign-off section."
      }
    ],

    "navigation_tips": [
      "Use item IDs to track progress",
      "Focus on HIGH priority items first",
      "Mark verified=true only after confirmation",
      "Add detailed notes for any concerns",
      "Reference authoritative sources where possible"
    ]
  },

  "submission_format": {
    "format": "JSON",
    "required_fields": [
      "All verified flags set to true/false",
      "All reviewer_notes filled for flagged items",
      "All clinical_pearls_needed answered",
      "Overall assessment completed",
      "Reviewer sign-off completed"
    ],
    "submission_method": "Return completed JSON via [specify method]",
    "contact_for_questions": "[Content creator contact]"
  },

  "reviewer_signoff": {
    "reviewer_name": "",
    "credentials": "",
    "specialty": "",
    "institution": "",
    "review_completed_date": "",
    "total_time_spent": "",
    "overall_recommendation": "APPROVE/APPROVE_WITH_CHANGES/MAJOR_REVISION_NEEDED/REJECT",
    "confidence_level": "HIGH/MEDIUM/LOW",
    "additional_comments": "",
    "follow_up_needed": false,
    "follow_up_topics": []
  }
}
```

## Time Estimation Logic

Calculate `estimated_review_time` based on:

```
Base time: 10 minutes

Add time for:
- Each HIGH priority dose: +2 minutes
- Each MEDIUM/LOW priority dose: +1 minute
- Each threshold: +1 minute
- Each statistical claim: +1.5 minutes
- Each guideline check: +1 minute
- Each HIGH priority pearl: +3 minutes
- Each MEDIUM priority pearl: +2 minutes
- Each LOW priority pearl: +1 minute
- Each regional consideration: +1 minute
- Each special population item: +1 minute
- Each missing section: +2 minutes
- Each section needing expansion: +1.5 minutes

Round to nearest 5 minutes
Maximum: 120 minutes (flag for splitting if exceeded)
```

## Priority Assignment Logic

**HIGH Priority**:
- Emergency medications (cardiac arrest drugs, reversal agents)
- Narrow therapeutic index drugs
- Paediatric dosing
- Life-threatening thresholds
- Patient safety-critical pearls

**MEDIUM Priority**:
- Common medications
- Important but non-emergent thresholds
- Teaching pearls with high educational value
- Standard special population considerations

**LOW Priority**:
- Rarely used medications
- Non-critical thresholds
- Optional enhancements
- Advanced practice variations

## Quality Checks

Before generating checklist, verify:
- [ ] All drug doses extracted from draft
- [ ] Cross-referenced with validation findings
- [ ] Priority levels assigned based on patient safety
- [ ] Pearl prompts are specific and answerable
- [ ] Time estimates realistic for scope
- [ ] JSON structure valid
- [ ] All required fields present

## Usage Notes

1. **Input**: Provide draft content + validation findings
2. **Output**: Structured JSON checklist
3. **Workflow**: Expert reviewer fills in JSON fields
4. **Integration**: Completed checklist feeds into final content assembly

## Example Usage

**Input**:
- Draft: "Sepsis Management in Emergency Department"
- Validation findings: 12 doses identified, 8 thresholds, 3 statistical claims
- Format: Clinical guideline
- Audience: Emergency medicine residents

**Output**: Generates checklist with ~35 verification items, 8 pearl requests, estimated review time 55 minutes, HIGH priority level.
