/**
 * Vitest Configuration for QI Research Pipeline
 *
 * This configuration sets up the test environment for the QI Research Pipeline,
 * including path aliases, coverage settings, and test file patterns.
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Global test settings
    globals: true,

    // Test environment
    environment: 'node',

    // Include patterns for test files
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'tests/fixtures/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Coverage thresholds (80% target)
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },

      // Include source files for coverage
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        'dist',
        'tests',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/index.ts',
      ],
    },

    // Reporters for CI and terminal
    reporters: ['verbose', 'json'],

    // Test execution settings
    testTimeout: 10000,
    hookTimeout: 10000,

    // Mock settings
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },

  // Path resolution aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@types': resolve(__dirname, './src/types'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
