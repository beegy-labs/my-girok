import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
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
    deps: {
      // Inline dependencies that need transformation
      inline: [/@my-girok\/types/, /@protobuf-ts/],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/index.ts',
        'src/config/*.ts',
        'src/**/*.config.ts',
        'src/**/*.dto.ts',
        'src/**/decorators/*.ts',
        // Admin services (tests pending - tracked in docs/TEST_COVERAGE.md)
        'src/admin/controllers/admin-audit.controller.ts',
        'src/admin/controllers/audit-query.controller.ts',
        'src/admin/services/admin-audit.service.ts',
        'src/admin/services/audit-query.service.ts',
        'src/admin/services/law-registry.service.ts',
        'src/admin/services/service-config.service.ts',
        'src/admin/services/service-feature.service.ts',
        'src/admin/services/service-tester.service.ts',
        'src/admin/services/audit-log.service.ts',
        // User personal info (separate domain)
        'src/users/controllers/user-personal-info.controller.ts',
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
    },
  },
});
