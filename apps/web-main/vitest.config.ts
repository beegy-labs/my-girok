import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'os';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],

    // Performance optimization: parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        // Use 50% of CPU cores for parallel execution (per TESTING.md policy)
        maxThreads: Math.max(1, Math.floor(os.cpus().length * 0.5)),
        minThreads: 1,
      },
    },

    // Individual test timeout: 10 seconds (per TESTING.md policy)
    testTimeout: 10000,

    // Enable caching for faster subsequent runs
    cache: {
      dir: '../../.vitest-cache',
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types.ts',
        'e2e/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
