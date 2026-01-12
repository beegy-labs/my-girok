import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        minThreads: 1,
        maxThreads: 8, // Increase from 4 to 8 for faster parallel execution
      },
    },
    deps: {
      inline: [/@my-girok\/types/, /@protobuf-ts/],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.e2e-spec.ts',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/index.ts',
        'src/config/*.ts',
        'src/**/*.dto.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  plugins: [swc.vite()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@my-girok/types': path.resolve(__dirname, '../../packages/types/src'),
      '@my-girok/nest-common': path.resolve(__dirname, '../../packages/nest-common/src'),
      '.prisma/identity-client': path.resolve(__dirname, 'node_modules/.prisma/identity-client'),
    },
  },
});
