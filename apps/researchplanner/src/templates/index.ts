/**
 * Template Module Index
 * Phase 4.3 - Prompt Template Exports
 *
 * This module provides:
 * 1. All LLM prompt templates for the pipeline stages
 * 2. Template filling utility function
 * 3. Centralized template management
 */

// Import classification templates
export {
  CLASSIFICATION_SYSTEM_PROMPT,
  CLASSIFICATION_USER_PROMPT,
} from './classification.js';

/**
 * Fill template placeholders with actual values
 *
 * Replaces placeholders in the format {{key}} with corresponding values
 * from the provided values object.
 *
 * @param template - Template string with {{placeholder}} markers
 * @param values - Object mapping placeholder names to replacement values
 * @returns Filled template string with all placeholders replaced
 *
 * @example
 * ```typescript
 * const template = "Hello {{name}}, you are {{age}} years old.";
 * const filled = fillTemplate(template, { name: "Alice", age: "30" });
 * // Result: "Hello Alice, you are 30 years old."
 * ```
 */
export function fillTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template;

  // Replace each placeholder with its corresponding value
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    // Use global replace to handle multiple occurrences of the same placeholder
    result = result.split(placeholder).join(value);
  }

  return result;
}

/**
 * Validate that all required placeholders are provided
 *
 * @param template - Template string to validate
 * @param values - Provided values object
 * @returns Array of missing placeholder names, empty if all present
 *
 * @example
 * ```typescript
 * const template = "{{name}} is {{age}} years old.";
 * const missing = getMissingPlaceholders(template, { name: "Alice" });
 * // Result: ["age"]
 * ```
 */
export function getMissingPlaceholders(
  template: string,
  values: Record<string, string>
): string[] {
  // Extract all placeholders from template using regex
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders = new Set<string>();
  let match;

  while ((match = placeholderRegex.exec(template)) !== null) {
    if (match[1]) {
      placeholders.add(match[1]);
    }
  }

  // Find missing placeholders
  const missing: string[] = [];
  for (const placeholder of placeholders) {
    if (!(placeholder in values)) {
      missing.push(placeholder);
    }
  }

  return missing;
}
