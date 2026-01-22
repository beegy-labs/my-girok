/**
 * Vitest Configuration for Storybook Component Testing
 *
 * Features:
 * - Browser-based testing with Playwright for accurate DOM rendering
 * - Storybook story integration - stories become tests automatically
 * - Accessibility testing via @storybook/addon-a11y
 * - Coverage reporting with V8 provider
 * - Parallel test execution
 *
 * @see https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
 * @version 0.1.0
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // Global test configuration
    testTimeout: 15000,
    hookTimeout: 10000,

    // Reporter configuration
    reporters: ['default'],

    // Project-based configuration for Storybook tests
    projects: [
      {
        extends: true,
        plugins: [
          // Transform Storybook stories into Vitest tests
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
            // Tags to filter stories for testing
            tags: {
              // Include stories with these tags
              include: ['test', 'a11y'],
              // Exclude stories with these tags
              exclude: ['skip-test'],
            },
          }),
        ],
        test: {
          name: 'storybook',

          // Browser-based testing for accurate component rendering
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              // Launch options
              launch: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
              },
            }),
            instances: [
              { browser: 'chromium' },
              // Uncomment for cross-browser testing:
              // { browser: 'firefox' },
              // { browser: 'webkit' },
            ],
          },

          // Setup files
          setupFiles: ['.storybook/vitest.setup.ts'],

          // Test file patterns
          include: ['src/**/*.stories.@(js|jsx|ts|tsx)'],
          exclude: ['node_modules', 'dist', 'storybook-static'],

          // Coverage configuration
          coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: './coverage',
            include: ['src/components/**/*.{ts,tsx}'],
            exclude: [
              'src/**/*.stories.{ts,tsx}',
              'src/**/*.mdx',
              'src/**/*.d.ts',
              'src/docs/**',
              'src/**/index.ts',
            ],
            // Coverage thresholds (80% minimum)
            thresholds: {
              statements: 80,
              branches: 80,
              functions: 80,
              lines: 80,
            },
          },

          // Pool configuration for parallel testing
          pool: 'threads',
          // Vitest 4.0: poolOptions moved to top-level
          threads: {
            singleThread: false,
            isolate: true,
            minThreads: 1,
            maxThreads: 4,
          },
        },
      },
    ],
  },

  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
      '@components': path.resolve(dirname, 'src/components'),
      '@hooks': path.resolve(dirname, 'src/hooks'),
      '@docs': path.resolve(dirname, 'src/docs'),
    },
  },
});
