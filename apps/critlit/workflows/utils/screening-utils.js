/**
 * Systematic Review Screening Utility Functions
 *
 * This module provides utility functions for AI-assisted title/abstract screening
 * in systematic literature reviews. Designed for use in n8n workflows.
 *
 * USAGE IN n8n:
 * 1. Copy the specific function(s) you need into an n8n Code node
 * 2. Process input data using the functions below
 * 3. Use outputs for routing decisions and database updates
 *
 * SCREENING WORKFLOW:
 * 1. Build prompt from template with buildScreeningPrompt()
 * 2. Send to AI (Claude, GPT, etc.)
 * 3. Parse response with parseScreeningResponse()
 * 4. Calculate confidence with calculateConfidence()
 * 5. Route decision with routeDecision()
 * 6. Validate before database save with validateDecision()
 */

/**
 * Build a screening prompt by substituting placeholders in a template
 *
 * Replaces placeholders in format {{key}} with values from context object.
 * Supports nested object access (e.g., {{review.title}}, {{pico.population}})
 *
 * @param {string} template - Prompt template with {{placeholder}} markers
 * @param {Object} context - Data to substitute into template
 * @param {Object} context.review - Review metadata (title, description, etc.)
 * @param {Object} context.pico - PICO criteria (population, intervention, comparator, outcome)
 * @param {Object} context.document - Document to screen (title, abstract, authors, etc.)
 * @returns {string} Formatted prompt with substitutions
 *
 * @example
 * const template = `
 * Review: {{review.title}}
 *
 * PICO Criteria:
 * Population: {{pico.population}}
 * Intervention: {{pico.intervention}}
 *
 * Document to screen:
 * Title: {{document.title}}
 * Abstract: {{document.abstract}}
 *
 * Does this document meet inclusion criteria?
 * `;
 *
 * const context = {
 *   review: { title: "Effects of Exercise on Depression" },
 *   pico: {
 *     population: "Adults with major depressive disorder",
 *     intervention: "Aerobic exercise interventions"
 *   },
 *   document: {
 *     title: "Running therapy for depression: A systematic review",
 *     abstract: "Background: Exercise has shown promise..."
 *   }
 * };
 *
 * const prompt = buildScreeningPrompt(template, context);
 * // Returns template with all {{...}} replaced with actual values
 */
function buildScreeningPrompt(template, context = {}) {
  if (!template || typeof template !== 'string') {
    throw new Error('Template must be a non-empty string');
  }

  // Regular expression to match {{key}} or {{nested.key}} patterns
  const placeholderRegex = /\{\{([^}]+)\}\}/g;

  return template.replace(placeholderRegex, (match, path) => {
    // Split path by dots for nested access (e.g., "review.title" -> ["review", "title"])
    const keys = path.trim().split('.');

    // Navigate through nested objects
    let value = context;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Key not found - return empty string or keep placeholder
        return ''; // Could also return match to keep {{placeholder}}
      }
    }

    // Convert value to string
    return value != null ? String(value) : '';
  });
}

/**
 * Parse AI screening response from text format
 *
 * Handles multiple response formats:
 * - Plain JSON object
 * - JSON wrapped in markdown code blocks (```json ... ```)
 * - Text with embedded JSON
 *
 * Expected JSON structure:
 * {
 *   "decision": "include|exclude|uncertain",
 *   "rationale": "Explanation of decision",
 *   "criteria_matched": {
 *     "population": true,
 *     "intervention": true,
 *     "comparator": false,
 *     "outcome": true
 *   },
 *   "confidence": "high|medium|low",
 *   "key_findings": ["finding 1", "finding 2"],
 *   "concerns": ["concern 1"]
 * }
 *
 * @param {string} responseText - Raw text response from AI
 * @returns {Object} Parsed screening decision object
 * @throws {Error} If JSON cannot be extracted or parsed
 *
 * @example
 * const aiResponse = `
 * Here's my screening decision:
 * \`\`\`json
 * {
 *   "decision": "include",
 *   "rationale": "Study matches all PICO criteria",
 *   "criteria_matched": {
 *     "population": true,
 *     "intervention": true,
 *     "comparator": true,
 *     "outcome": true
 *   },
 *   "confidence": "high"
 * }
 * \`\`\`
 * `;
 *
 * const decision = parseScreeningResponse(aiResponse);
 * // Returns: { decision: "include", rationale: "...", ... }
 */
function parseScreeningResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('Response text must be a non-empty string');
  }

  // Try to extract JSON from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
  const codeBlockMatch = responseText.match(codeBlockRegex);

  let jsonText;
  if (codeBlockMatch) {
    // Found markdown code block
    jsonText = codeBlockMatch[1].trim();
  } else {
    // Try to find JSON object directly in text
    const jsonObjectRegex = /\{[\s\S]*\}/;
    const jsonMatch = responseText.match(jsonObjectRegex);

    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      // No JSON found
      throw new Error('No JSON object found in response text');
    }
  }

  // Parse JSON
  try {
    const parsed = JSON.parse(jsonText);

    // Validate required fields
    if (!parsed.decision) {
      throw new Error('Missing required field: decision');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

/**
 * Calculate confidence score from screening response
 *
 * Computes a numerical confidence score (0-1) based on:
 * - Stated confidence level (high/medium/low)
 * - Completeness of criteria_matched data
 * - Decision uncertainty
 * - Presence of concerns
 *
 * Scoring logic:
 * - Base score from confidence: high=0.9, medium=0.6, low=0.3
 * - Boost for complete criteria data: +0.1
 * - Penalty for "uncertain" decision: -0.3
 * - Penalty for concerns: -0.05 per concern
 *
 * @param {Object} response - Parsed screening response
 * @param {string} response.decision - "include", "exclude", or "uncertain"
 * @param {string} response.confidence - "high", "medium", or "low"
 * @param {Object} response.criteria_matched - Object with boolean values
 * @param {Array} response.concerns - Array of concern strings (optional)
 * @returns {number} Confidence score between 0 and 1
 *
 * @example
 * const response = {
 *   decision: "include",
 *   confidence: "high",
 *   criteria_matched: {
 *     population: true,
 *     intervention: true,
 *     comparator: true,
 *     outcome: true
 *   },
 *   concerns: []
 * };
 *
 * const score = calculateConfidence(response);
 * // Returns: 1.0 (high confidence, complete criteria, no concerns)
 *
 * const uncertainResponse = {
 *   decision: "uncertain",
 *   confidence: "medium",
 *   criteria_matched: { population: true },
 *   concerns: ["Abstract unclear on intervention details"]
 * };
 *
 * const uncertainScore = calculateConfidence(uncertainResponse);
 * // Returns: ~0.25 (medium base, uncertain penalty, incomplete criteria, has concern)
 */
function calculateConfidence(response) {
  if (!response || typeof response !== 'object') {
    throw new Error('Response must be an object');
  }

  // Base confidence score from stated confidence level
  let score = 0.5; // Default

  if (response.confidence) {
    const confidenceLower = response.confidence.toLowerCase();
    if (confidenceLower === 'high') {
      score = 0.9;
    } else if (confidenceLower === 'medium') {
      score = 0.6;
    } else if (confidenceLower === 'low') {
      score = 0.3;
    }
  }

  // Adjust for criteria completeness
  if (response.criteria_matched && typeof response.criteria_matched === 'object') {
    const criteriaKeys = Object.keys(response.criteria_matched);
    const expectedCriteria = ['population', 'intervention', 'comparator', 'outcome'];

    // Check if all expected criteria are present with boolean values
    const hasAllCriteria = expectedCriteria.every(key =>
      key in response.criteria_matched &&
      typeof response.criteria_matched[key] === 'boolean'
    );

    if (hasAllCriteria) {
      score += 0.1; // Boost for complete criteria data
    }
  }

  // Penalty for uncertain decision
  if (response.decision && response.decision.toLowerCase() === 'uncertain') {
    score -= 0.3;
  }

  // Penalty for concerns
  if (Array.isArray(response.concerns) && response.concerns.length > 0) {
    score -= 0.05 * response.concerns.length;
  }

  // Clamp score between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Route screening decision based on confidence threshold
 *
 * Determines how to handle a screening decision:
 * - auto_include: High confidence include, bypass human review
 * - auto_exclude: High confidence exclude, bypass human review
 * - human_review: Low confidence or uncertain, requires human review
 * - uncertain: Explicit uncertain decision, always needs review
 *
 * @param {string} decision - Screening decision: "include", "exclude", or "uncertain"
 * @param {number} confidence - Confidence score (0-1)
 * @param {number} threshold - Minimum confidence for auto-routing (default: 0.85)
 * @returns {string} Routing decision: "auto_include", "auto_exclude", "human_review", "uncertain"
 *
 * @example
 * // High confidence include
 * routeDecision("include", 0.95, 0.85);
 * // Returns: "auto_include"
 *
 * // Low confidence include - needs human review
 * routeDecision("include", 0.70, 0.85);
 * // Returns: "human_review"
 *
 * // High confidence exclude
 * routeDecision("exclude", 0.90, 0.85);
 * // Returns: "auto_exclude"
 *
 * // Uncertain decision - always needs review
 * routeDecision("uncertain", 0.80, 0.85);
 * // Returns: "uncertain"
 *
 * // n8n usage:
 * const route = routeDecision(
 *   $json.decision,
 *   $json.confidence_score,
 *   0.85
 * );
 * // Use route for n8n Switch node routing
 */
function routeDecision(decision, confidence, threshold = 0.85) {
  if (!decision || typeof decision !== 'string') {
    throw new Error('Decision must be a non-empty string');
  }

  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be a number between 0 and 1');
  }

  const decisionLower = decision.toLowerCase();

  // Uncertain decisions always need human review
  if (decisionLower === 'uncertain') {
    return 'uncertain';
  }

  // Check confidence threshold
  if (confidence >= threshold) {
    // High confidence - can auto-route
    if (decisionLower === 'include') {
      return 'auto_include';
    } else if (decisionLower === 'exclude') {
      return 'auto_exclude';
    }
  }

  // Low confidence or unrecognized decision - needs human review
  return 'human_review';
}

/**
 * Validate screening decision object before database save
 *
 * Checks that decision object has all required fields with correct types and values.
 * Returns validation result with detailed error messages.
 *
 * Required fields:
 * - decision: string, one of ["include", "exclude", "uncertain"]
 * - rationale: non-empty string
 * - criteria_matched: object with boolean values
 *
 * Optional fields:
 * - confidence: string, one of ["high", "medium", "low"]
 * - key_findings: array of strings
 * - concerns: array of strings
 *
 * @param {Object} decision - Decision object to validate
 * @returns {Object} Validation result
 * @returns {boolean} return.valid - True if valid
 * @returns {Array<string>} return.errors - Array of error messages (empty if valid)
 *
 * @example
 * const decision = {
 *   decision: "include",
 *   rationale: "Meets all PICO criteria",
 *   criteria_matched: {
 *     population: true,
 *     intervention: true,
 *     comparator: true,
 *     outcome: true
 *   },
 *   confidence: "high"
 * };
 *
 * const validation = validateDecision(decision);
 * // Returns: { valid: true, errors: [] }
 *
 * const invalidDecision = {
 *   decision: "maybe", // Invalid value
 *   rationale: "", // Empty
 *   criteria_matched: "yes" // Wrong type
 * };
 *
 * const validation2 = validateDecision(invalidDecision);
 * // Returns: {
 * //   valid: false,
 * //   errors: [
 * //     "decision must be one of: include, exclude, uncertain",
 * //     "rationale must be a non-empty string",
 * //     "criteria_matched must be an object"
 * //   ]
 * // }
 *
 * // n8n usage - only save to database if valid
 * const validation = validateDecision($json);
 * if (!validation.valid) {
 *   throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
 * }
 */
function validateDecision(decision) {
  const errors = [];

  // Check if decision is an object
  if (!decision || typeof decision !== 'object') {
    return {
      valid: false,
      errors: ['Decision must be an object']
    };
  }

  // Validate required field: decision
  const validDecisions = ['include', 'exclude', 'uncertain'];
  if (!decision.decision || typeof decision.decision !== 'string') {
    errors.push('decision field is required and must be a string');
  } else if (!validDecisions.includes(decision.decision.toLowerCase())) {
    errors.push(`decision must be one of: ${validDecisions.join(', ')}`);
  }

  // Validate required field: rationale
  if (!decision.rationale || typeof decision.rationale !== 'string') {
    errors.push('rationale field is required and must be a string');
  } else if (decision.rationale.trim().length === 0) {
    errors.push('rationale must be a non-empty string');
  }

  // Validate required field: criteria_matched
  if (!decision.criteria_matched) {
    errors.push('criteria_matched field is required');
  } else if (typeof decision.criteria_matched !== 'object' || Array.isArray(decision.criteria_matched)) {
    errors.push('criteria_matched must be an object');
  } else {
    // Validate criteria_matched values are booleans
    const criteriaValues = Object.values(decision.criteria_matched);
    const allBooleans = criteriaValues.every(val => typeof val === 'boolean');
    if (!allBooleans) {
      errors.push('All criteria_matched values must be boolean');
    }
  }

  // Validate optional field: confidence
  if (decision.confidence !== undefined) {
    const validConfidence = ['high', 'medium', 'low'];
    if (typeof decision.confidence !== 'string') {
      errors.push('confidence must be a string');
    } else if (!validConfidence.includes(decision.confidence.toLowerCase())) {
      errors.push(`confidence must be one of: ${validConfidence.join(', ')}`);
    }
  }

  // Validate optional field: key_findings
  if (decision.key_findings !== undefined) {
    if (!Array.isArray(decision.key_findings)) {
      errors.push('key_findings must be an array');
    } else {
      const allStrings = decision.key_findings.every(f => typeof f === 'string');
      if (!allStrings) {
        errors.push('All key_findings elements must be strings');
      }
    }
  }

  // Validate optional field: concerns
  if (decision.concerns !== undefined) {
    if (!Array.isArray(decision.concerns)) {
      errors.push('concerns must be an array');
    } else {
      const allStrings = decision.concerns.every(c => typeof c === 'string');
      if (!allStrings) {
        errors.push('All concerns elements must be strings');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * EXAMPLE n8n WORKFLOW USAGE:
 *
 * Node 1: Load Template and Context
 * ---------------------------------------
 * const template = $node["Load Prompt Template"].json.template;
 * const context = {
 *   review: $node["Get Review"].json,
 *   pico: $node["Get PICO"].json,
 *   document: $input.item.json
 * };
 *
 * const prompt = buildScreeningPrompt(template, context);
 * return { json: { prompt } };
 *
 *
 * Node 2: Parse AI Response
 * ---------------------------------------
 * const aiResponse = $input.item.json.response;
 * const decision = parseScreeningResponse(aiResponse);
 * return { json: decision };
 *
 *
 * Node 3: Calculate Confidence and Route
 * ---------------------------------------
 * const decision = $input.item.json;
 * const confidenceScore = calculateConfidence(decision);
 * const route = routeDecision(decision.decision, confidenceScore, 0.85);
 *
 * return {
 *   json: {
 *     ...decision,
 *     confidence_score: confidenceScore,
 *     route: route
 *   }
 * };
 *
 *
 * Node 4: Validate Before Save
 * ---------------------------------------
 * const decision = $input.item.json;
 * const validation = validateDecision(decision);
 *
 * if (!validation.valid) {
 *   throw new Error(`Invalid decision: ${validation.errors.join(', ')}`);
 * }
 *
 * // Proceed to save to database
 * return { json: decision };
 *
 *
 * Node 5: Switch/Router Node
 * ---------------------------------------
 * // Use $json.route to route to different paths:
 * // - auto_include → Auto-add to included set
 * // - auto_exclude → Auto-add to excluded set
 * // - human_review → Send to human review queue
 * // - uncertain → Send to uncertain queue (high priority review)
 */

// Export functions for use in other contexts (not needed in n8n)
module.exports = {
  buildScreeningPrompt,
  parseScreeningResponse,
  calculateConfidence,
  routeDecision,
  validateDecision
};
