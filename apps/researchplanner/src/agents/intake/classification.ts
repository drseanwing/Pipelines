/**
 * Project Classification Module
 * Phase 4.3 - LLM-based QI vs Research classification
 *
 * Uses Claude API to classify projects based on concept, problem, and outcomes.
 * Implements confidence scoring and fallback handling for ambiguous cases.
 */

import type { ProjectType, Classification } from '../../types/index.js';
import { callLLM, parseJSONResponse } from '../../utils/index.js';

/**
 * Classification prompt template
 * Spec reference: Section 6.2.1
 */
const CLASSIFICATION_PROMPT = `You are an expert in healthcare research methodology and quality improvement. Analyse the following project concept and classify it appropriately.

## Project Concept
{concept_description}

## Clinical Problem
{clinical_problem}

## Intended Outcomes
{intended_outcomes}

## Classification Criteria

### Quality Improvement (QI)
- Primary aim is to improve local processes, outcomes, or patient experience
- No intention to generate generalisable knowledge
- Uses established QI methodologies (PDSA, Lean, etc.)
- Results intended for local use and improvement

### Research
- Primary aim is to generate new generalisable knowledge
- Systematic investigation designed to develop or contribute to knowledge
- Results intended for publication and broader application
- May involve experimental manipulation or control groups

### Hybrid
- Elements of both QI and research
- Local improvement with secondary aim of generalisation
- May start as QI with potential to become research

## Task
1. Classify this project as QI, RESEARCH, or HYBRID
2. Provide confidence score (0-1)
3. Explain your reasoning
4. Suggest appropriate study designs
5. Identify the applicable reporting guideline

Respond in JSON format:
\`\`\`json
{
  "classification": "QI|RESEARCH|HYBRID",
  "confidence": 0.0-1.0,
  "reasoning": "...",
  "suggested_designs": ["..."],
  "reporting_guideline": "..."
}
\`\`\``;

/**
 * Minimum confidence threshold for classification
 * Spec reference: Section 4.3.3
 */
const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Interface for raw LLM classification response
 */
interface ClassificationResponse {
  classification: 'QI' | 'RESEARCH' | 'HYBRID';
  confidence: number;
  reasoning: string;
  suggested_designs: string[];
  reporting_guideline: string;
}

/**
 * Classify project type using LLM analysis
 *
 * @param concept - Project concept description (500-2000 chars)
 * @param problem - Clinical problem statement
 * @param outcomes - Intended outcomes description
 * @returns Classification with confidence score and reasoning
 *
 * @example
 * ```typescript
 * const classification = await classifyProjectType(
 *   "Implement rapid triage protocol for chest pain patients",
 *   "ED wait times for chest pain exceed 4 hours",
 *   "Reduce door-to-ECG time to under 10 minutes"
 * );
 * console.log(classification.project_type); // 'QI'
 * console.log(classification.confidence); // 0.92
 * ```
 */
export async function classifyProjectType(
  concept: string,
  problem: string,
  outcomes: string
): Promise<Classification> {
  // Build the prompt with template substitution
  const prompt = CLASSIFICATION_PROMPT
    .replace('{concept_description}', concept)
    .replace('{clinical_problem}', problem)
    .replace('{intended_outcomes}', outcomes);

  try {
    // Call LLM with classification prompt
    const response = await callLLM(prompt, {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3, // Low temperature for consistent classification
      maxTokens: 1000,
    });

    // Parse JSON response from LLM
    const parsed = parseJSONResponse<ClassificationResponse>(response);

    // Convert string classification to ProjectType enum
    const projectType: ProjectType =
      parsed.classification === 'QI' ? 'QI' as ProjectType :
      parsed.classification === 'RESEARCH' ? 'RESEARCH' as ProjectType :
      'HYBRID' as ProjectType;

    // Build classification result
    const classification: Classification = {
      project_type: projectType,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      suggested_designs: parsed.suggested_designs,
    };

    // Check confidence threshold and handle low confidence
    if (classification.confidence < CONFIDENCE_THRESHOLD) {
      return handleLowConfidence(classification, concept, problem, outcomes);
    }

    return classification;

  } catch (error) {
    // If LLM call or parsing fails, throw with context
    throw new Error(`Classification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handle low-confidence classifications
 *
 * Fallback strategy for ambiguous cases:
 * 1. Default to HYBRID for confidence < 0.8
 * 2. Add warning to reasoning
 * 3. Suggest manual review
 *
 * Spec reference: Section 4.3.7
 */
function handleLowConfidence(
  classification: Classification,
  concept: string,
  problem: string,
  outcomes: string
): Classification {
  // Default to HYBRID for ambiguous cases
  const fallbackClassification: Classification = {
    project_type: 'HYBRID' as ProjectType,
    confidence: classification.confidence,
    reasoning: `[LOW CONFIDENCE: ${classification.confidence.toFixed(2)}] ${classification.reasoning}\n\nRecommendation: Manual review suggested. Project may have elements of both QI and research.`,
    suggested_designs: [
      ...classification.suggested_designs,
      'Consider hybrid approach with both QI and research components',
    ],
  };

  return fallbackClassification;
}
