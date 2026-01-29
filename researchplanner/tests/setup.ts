/**
 * Test Setup for QI Research Pipeline
 *
 * This file configures the test environment, including:
 * - Environment variable mocking
 * - Database connection mocking
 * - LLM client mocking
 * - Global test utilities
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Environment Variable Mocking
// ============================================================================

/**
 * Mock environment variables for testing
 * Note: Tests connect directly to the database, not through Docker port mapping,
 * so DATABASE_PORT uses the standard PostgreSQL port 5432.
 */
const mockEnvVariables = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/qi_research_test',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'qi_research_test',
  DATABASE_USER: 'test',
  DATABASE_PASSWORD: 'test',
  ANTHROPIC_API_KEY: 'test-anthropic-api-key-12345',
  PUBMED_API_KEY: 'test-pubmed-api-key',
  SEMANTIC_SCHOLAR_API_KEY: 'test-semantic-scholar-api-key',
  LOG_LEVEL: 'error',
  APP_PORT: '3001',
  APP_HOST: 'localhost',
  JWT_SECRET: 'test-jwt-secret-key',
  STORAGE_PATH: '/tmp/qi-research-test',
};

// Apply mock environment variables
Object.entries(mockEnvVariables).forEach(([key, value]) => {
  process.env[key] = value;
});

// ============================================================================
// Database Connection Mocking
// ============================================================================

/**
 * Mock database client interface
 */
export interface MockDatabaseClient {
  query: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}

/**
 * Mock database pool interface
 */
export interface MockDatabasePool {
  query: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock database client
 */
export function createMockDatabaseClient(): MockDatabaseClient {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
}

/**
 * Create a mock database pool
 */
export function createMockDatabasePool(): MockDatabasePool {
  const mockClient = createMockDatabaseClient();
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue(mockClient),
    end: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
}

// Global mock database pool
export const mockDbPool = createMockDatabasePool();

// Mock the pg module
vi.mock('pg', () => {
  return {
    Pool: vi.fn(() => mockDbPool),
    Client: vi.fn(() => createMockDatabaseClient()),
  };
});

// ============================================================================
// LLM Client Mocking
// ============================================================================

/**
 * Mock LLM response interface
 */
export interface MockLLMResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Create a mock LLM response
 */
export function createMockLLMResponse(text: string): MockLLMResponse {
  return {
    id: 'msg_test_12345',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text,
      },
    ],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 100,
      output_tokens: 50,
    },
  };
}

/**
 * Mock Anthropic client interface
 */
export interface MockAnthropicClient {
  messages: {
    create: ReturnType<typeof vi.fn>;
  };
}

/**
 * Create a mock Anthropic client
 */
export function createMockAnthropicClient(
  defaultResponse?: string
): MockAnthropicClient {
  const responseText = defaultResponse || JSON.stringify({
    projectType: 'RESEARCH',
    confidence: 0.85,
    reasoning: 'This is a mock classification response',
    suggestedDesigns: ['RCT', 'COHORT'],
  });

  return {
    messages: {
      create: vi.fn().mockResolvedValue(createMockLLMResponse(responseText)),
    },
  };
}

// Global mock Anthropic client
export const mockAnthropicClient = createMockAnthropicClient();

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(() => mockAnthropicClient),
    Anthropic: vi.fn(() => mockAnthropicClient),
  };
});

// ============================================================================
// Global Test Utilities
// ============================================================================

/**
 * Helper to wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to generate a random UUID
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Helper to create a deep copy of an object
 */
export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Helper to assert that a promise rejects with a specific error type
 */
export async function expectToReject<T extends Error>(
  promise: Promise<unknown>,
  errorType?: new (...args: unknown[]) => T
): Promise<T> {
  try {
    await promise;
    throw new Error('Expected promise to reject');
  } catch (error) {
    if (errorType && !(error instanceof errorType)) {
      throw new Error(
        `Expected error of type ${errorType.name}, got ${(error as Error).constructor.name}`
      );
    }
    return error as T;
  }
}

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

beforeAll(() => {
  // Global setup before all tests
  console.log('Starting QI Research Pipeline test suite...');
});

afterAll(() => {
  // Global cleanup after all tests
  console.log('QI Research Pipeline test suite completed.');
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Reset mock database to default state
  mockDbPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mockDbPool.connect.mockResolvedValue(createMockDatabaseClient());

  // Reset mock LLM client to default response
  mockAnthropicClient.messages.create.mockResolvedValue(
    createMockLLMResponse(
      JSON.stringify({
        projectType: 'RESEARCH',
        confidence: 0.85,
        reasoning: 'Default mock classification',
        suggestedDesigns: ['RCT'],
      })
    )
  );
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// ============================================================================
// Type Augmentation for Global Test Utilities
// ============================================================================

declare global {
  // Make vitest globals available
  const vi: typeof import('vitest')['vi'];
  const describe: typeof import('vitest')['describe'];
  const it: typeof import('vitest')['it'];
  const expect: typeof import('vitest')['expect'];
  const beforeAll: typeof import('vitest')['beforeAll'];
  const afterAll: typeof import('vitest')['afterAll'];
  const beforeEach: typeof import('vitest')['beforeEach'];
  const afterEach: typeof import('vitest')['afterEach'];
}

export {};
