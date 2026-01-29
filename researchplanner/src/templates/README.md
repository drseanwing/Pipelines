# Prompt Templates

This directory contains LLM prompt templates for the QI/Research Pipeline.

## Files

### classification.ts
Contains prompt templates for the Intake Agent's project classification functionality (Phase 4.3, Spec 6.2.1).

**Exports:**
- `CLASSIFICATION_SYSTEM_PROMPT`: System message defining the expert role for classification
- `CLASSIFICATION_USER_PROMPT`: User prompt template with placeholders for project details

**Placeholders in CLASSIFICATION_USER_PROMPT:**
- `{{concept_description}}`: Project concept description (500-2000 chars)
- `{{clinical_problem}}`: Clinical problem being addressed
- `{{intended_outcomes}}`: What the project hopes to achieve

### index.ts
Central export point for all template modules.

**Exports:**
- All prompt templates from individual modules
- `fillTemplate(template, values)`: Fill placeholders in templates with actual values
- `getMissingPlaceholders(template, values)`: Validate all placeholders are provided

## Usage Example

```typescript
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  CLASSIFICATION_USER_PROMPT,
  fillTemplate
} from './templates/index.js';

// Prepare the classification prompt
const userPrompt = fillTemplate(CLASSIFICATION_USER_PROMPT, {
  concept_description: 'Implement POCUS for undifferentiated shock in ED...',
  clinical_problem: 'Delayed diagnosis and inappropriate fluid resuscitation...',
  intended_outcomes: 'Reduce time to diagnosis, improve hemodynamic management...'
});

// Call LLM with the prompts
const response = await callLLM({
  system: CLASSIFICATION_SYSTEM_PROMPT,
  user: userPrompt
});

// Parse JSON response
const classification = JSON.parse(response);
console.log(classification.classification); // "QI" | "RESEARCH" | "HYBRID"
console.log(classification.confidence); // 0.0 - 1.0
console.log(classification.reasoning); // Explanation
console.log(classification.suggested_designs); // Array of designs
console.log(classification.reporting_guideline); // e.g., "SQUIRE 2.0"
```

## Expected Response Format

The classification prompt expects a JSON response with the following structure:

```json
{
  "classification": "QI|RESEARCH|HYBRID",
  "confidence": 0.85,
  "reasoning": "This project aims to improve local ED processes...",
  "suggested_designs": [
    "PDSA cycle with interrupted time series analysis",
    "Pre-post implementation study with control comparison"
  ],
  "reporting_guideline": "SQUIRE 2.0"
}
```

## Confidence Threshold

Per spec section 6.2.1, the minimum acceptable confidence score is **0.8**. Classifications with confidence below this threshold should trigger manual review.

## Compliance

All prompts align with:
- NHMRC National Statement on Ethical Conduct in Human Research
- SQUIRE 2.0 guidelines for QI reporting
- CONSORT, STROBE, PRISMA and other research reporting guidelines
- Metro North Health research governance requirements
