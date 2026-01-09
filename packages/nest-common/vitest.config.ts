import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/__tests__/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.module.ts',
        'src/**/index.ts',
        'src/**/*.dto.ts',
        'src/**/__tests__/**',
      ],
    },
  },
  plugins: [swc.vite()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@my-girok/types': path.resolve(__dirname, '../types/src'),
    },
  },
});
