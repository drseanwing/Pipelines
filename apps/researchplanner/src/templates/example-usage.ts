/**
 * Example Usage of Classification Templates
 * Demonstrates how to use the prompt templates in the Intake Agent
 */

import {
  CLASSIFICATION_SYSTEM_PROMPT,
  CLASSIFICATION_USER_PROMPT,
  fillTemplate,
  getMissingPlaceholders,
} from './index.js';

/**
 * Example: QI Project Classification
 */
function exampleQIProject() {
  console.log('=== Example: QI Project ===\n');

  const projectData = {
    concept_description:
      'Implement point-of-care ultrasound (POCUS) for assessment of undifferentiated shock in the Emergency Department. Train ED physicians in basic cardiac and IVC assessment protocols and integrate findings into resuscitation decisions.',
    clinical_problem:
      'Delayed diagnosis and inappropriate fluid resuscitation in shock patients leads to worse outcomes. Current practice relies on clinical assessment alone without bedside imaging.',
    intended_outcomes:
      'Reduce time to diagnosis of shock etiology by 30%, improve appropriate fluid administration decisions, and decrease ICU admissions for fluid overload complications.',
  };

  // Check for missing placeholders
  const missing = getMissingPlaceholders(
    CLASSIFICATION_USER_PROMPT,
    projectData
  );
  console.log('Missing placeholders:', missing.length === 0 ? 'None' : missing);

  // Fill the template
  const filledPrompt = fillTemplate(CLASSIFICATION_USER_PROMPT, projectData);

  console.log('\n--- System Prompt ---');
  console.log(CLASSIFICATION_SYSTEM_PROMPT.substring(0, 200) + '...\n');

  console.log('--- User Prompt (filled) ---');
  console.log(filledPrompt.substring(0, 500) + '...\n');

  console.log('Expected classification: QI');
  console.log('Expected guideline: SQUIRE 2.0\n');
}

/**
 * Example: Research Project Classification
 */
function exampleResearchProject() {
  console.log('=== Example: Research Project ===\n');

  const projectData = {
    concept_description:
      'Randomised controlled trial comparing ketamine versus fentanyl for prehospital analgesia in trauma patients. Double-blind design with paramedic administration and hospital outcome assessment.',
    clinical_problem:
      'Inadequate analgesia during prehospital transport is common in trauma patients. Current protocols use opioids which may have limitations in certain injury patterns.',
    intended_outcomes:
      'Determine if ketamine provides superior pain relief compared to fentanyl, with secondary outcomes of adverse events, hemodynamic stability, and patient satisfaction. Results intended for publication and influence of clinical guidelines.',
  };

  const filledPrompt = fillTemplate(CLASSIFICATION_USER_PROMPT, projectData);

  console.log('Expected classification: RESEARCH');
  console.log('Expected guideline: CONSORT');
  console.log('Confidence: High (>0.9) due to clear RCT design\n');
}

/**
 * Example: Hybrid Project Classification
 */
function exampleHybridProject() {
  console.log('=== Example: Hybrid Project ===\n');

  const projectData = {
    concept_description:
      'Implement a new triage protocol for sepsis screening in ED, with prospective data collection and comparison to matched historical controls. Results will inform local practice and be submitted for publication to contribute to sepsis triage literature.',
    clinical_problem:
      'Current triage processes miss early sepsis cases, delaying antibiotic administration. Literature on optimal sepsis triage tools is limited.',
    intended_outcomes:
      'Improve early sepsis identification at triage (local QI goal) while generating publishable evidence on triage tool performance (research goal).',
  };

  const filledPrompt = fillTemplate(CLASSIFICATION_USER_PROMPT, projectData);

  console.log('Expected classification: HYBRID');
  console.log(
    'Expected guideline: SQUIRE 2.0 + STROBE (both frameworks needed)'
  );
  console.log('Note: Dual intent requires both QI and research frameworks\n');
}

/**
 * Example: Validation of template placeholders
 */
function exampleValidation() {
  console.log('=== Example: Validation ===\n');

  // Incomplete data (missing intended_outcomes)
  const incompleteData = {
    concept_description: 'Some concept',
    clinical_problem: 'Some problem',
    // intended_outcomes is missing
  };

  const missing = getMissingPlaceholders(
    CLASSIFICATION_USER_PROMPT,
    incompleteData as Record<string, string>
  );

  console.log('Incomplete data provided');
  console.log('Missing placeholders:', missing);
  console.log(
    'Validation result:',
    missing.length === 0 ? 'PASS' : 'FAIL - missing fields'
  );
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleQIProject();
  console.log('---\n');
  exampleResearchProject();
  console.log('---\n');
  exampleHybridProject();
  console.log('---\n');
  exampleValidation();
}

export {
  exampleQIProject,
  exampleResearchProject,
  exampleHybridProject,
  exampleValidation,
};
