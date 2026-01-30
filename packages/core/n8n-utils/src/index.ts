/**
 * @pipelines/n8n-utils - N8N Code Node utilities
 *
 * Provides helper functions for N8N Code Node execution including
 * error handling, stage lifecycle logging, and prompt template rendering.
 */

/**
 * N8N Code Node execution context type
 */
export interface N8NContext {
  getInputData: () => Array<{ json: Record<string, unknown> }>;
  getNodeParameter: (name: string) => unknown;
  getWorkflowStaticData: (type: string) => Record<string, unknown>;
}

/**
 * Standard N8N output item
 */
export interface N8NOutputItem {
  json: Record<string, unknown>;
}

/**
 * Wrap a Code Node function with error handling
 * Catches errors and returns them as structured output instead of crashing
 */
export function withErrorHandling(
  fn: (items: Array<{ json: Record<string, unknown> }>) => Promise<N8NOutputItem[]> | N8NOutputItem[]
): (items: Array<{ json: Record<string, unknown> }>) => Promise<N8NOutputItem[]> {
  return async (items) => {
    try {
      return await fn(items);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      return [{
        json: {
          success: false,
          error: {
            message: errorMessage,
            stack: errorStack,
            timestamp: new Date().toISOString(),
            inputItemCount: items.length,
          },
        },
      }];
    }
  };
}

/**
 * Create a stage execution log entry
 */
export function createStageLog(
  stageName: string,
  status: 'started' | 'completed' | 'failed',
  data?: Record<string, unknown>
): N8NOutputItem {
  return {
    json: {
      _type: 'stage_log',
      stage: stageName,
      status,
      timestamp: new Date().toISOString(),
      ...data,
    },
  };
}

/**
 * Render a prompt template with variable substitution
 *
 * @example
 * ```typescript
 * const prompt = renderPrompt(
 *   'Analyze the following {format} content about {topic}:',
 *   { format: 'journal-club', topic: 'TTM2 Trial' }
 * );
 * ```
 */
export function renderPrompt(
  template: string,
  variables: Record<string, string | number | boolean>
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (match, key: string) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    }
  );
}

/**
 * Extract the first input item's JSON data from N8N items
 */
export function getInputJson(
  items: Array<{ json: Record<string, unknown> }>
): Record<string, unknown> {
  const first = items[0];
  if (!first) {
    throw new Error('No input items received');
  }
  return first.json;
}

/**
 * Merge multiple input items into a single combined object
 */
export function mergeInputItems(
  items: Array<{ json: Record<string, unknown> }>,
  key?: string
): N8NOutputItem {
  if (key) {
    return {
      json: {
        [key]: items.map(item => item.json),
      },
    };
  }

  return {
    json: Object.assign({}, ...items.map(item => item.json)) as Record<string, unknown>,
  };
}

/**
 * Create a success output item
 */
export function successOutput(data: Record<string, unknown>): N8NOutputItem {
  return {
    json: {
      success: true,
      timestamp: new Date().toISOString(),
      ...data,
    },
  };
}

/**
 * Create an error output item
 */
export function errorOutput(message: string, details?: Record<string, unknown>): N8NOutputItem {
  return {
    json: {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...details,
    },
  };
}

/**
 * Extract a valid JSON string using bracket matching to handle nested structures
 */
function extractJsonString(text: string): string {
  const startChars = ['{', '['] as const;
  const endMap: Record<string, string> = { '{': '}', '[': ']' };

  for (const startChar of startChars) {
    const startIdx = text.indexOf(startChar);
    if (startIdx === -1) continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      if (!ch) continue;

      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === startChar) depth++;
      if (ch === endMap[startChar]) depth--;
      if (depth === 0) {
        const candidate = text.slice(startIdx, i + 1);
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          break;
        }
      }
    }
  }
  return text; // fallback to raw text
}

/**
 * Parse a JSON string from LLM output, handling common formatting issues
 * (markdown code blocks, trailing commas, etc.)
 */
export function parseLLMJson<T = unknown>(text: string): T {
  let cleaned = text.trim();

  // Remove markdown code fences
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch?.[1]) {
    cleaned = jsonBlockMatch[1].trim();
  }

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to find JSON object or array using bracket matching
    const extracted = extractJsonString(cleaned);
    if (extracted !== cleaned) {
      return JSON.parse(extracted) as T;
    }

    throw new Error(`Failed to parse JSON from LLM output: ${cleaned.substring(0, 100)}...`);
  }
}
