import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Use happy-dom for faster, lighter DOM simulation
    environment: 'happy-dom',

    // Global test setup
    globals: true,
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/*.config.ts',
        '**/*.config.js',
      ],
      // Target 60% coverage as specified
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
      include: ['src/**/*.ts'],
      all: true,
    },

    // Test file patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.husky'],

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Watch options
    watch: false,

    // Reporter options
    reporters: ['verbose'],

    // Mock options
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/frontend'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@worker': resolve(__dirname, 'src/worker'),
    },
  },
});
