/**
 * Shared Vitest configuration for NestJS services
 *
 * Usage in service vitest.config.ts:
 * ```ts
 * import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';
 *
 * export default createNestJsConfig(__dirname, {
 *   testTimeout: 30000,
 *   coverage: {
 *     exclude: ['src/custom/**'],
 *   },
 * });
 * ```
 */
import { defineConfig, mergeConfig, type UserConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'node:path';

export interface NestJsConfigOptions {
  /** Test timeout in milliseconds (default: 10000) */
  testTimeout?: number;

  /** Use forks pool instead of threads (default: false) */
  useForks?: boolean;

  /** Additional coverage excludes */
  coverage?: {
    exclude?: string[];
    thresholds?: {
      statements?: number;
      branches?: number;
      functions?: number;
      lines?: number;
    };
  };

  /** Additional path aliases */
  aliases?: Record<string, string>;
}

/**
 * Creates a Vitest configuration for NestJS services
 */
export function createNestJsConfig(dirname: string, options: NestJsConfigOptions = {}): UserConfig {
  const { testTimeout = 10000, useForks = false, coverage = {}, aliases = {} } = options;

  const baseExcludes = [
    'src/**/*.spec.ts',
    'src/**/*.e2e-spec.ts',
    'src/**/*.module.ts',
    'src/main.ts',
    'src/**/index.ts',
    'src/config/*.ts',
    'src/**/*.dto.ts',
  ];

  const poolConfig = useForks
    ? {
        pool: 'forks' as const,
        poolOptions: {
          forks: {
            singleFork: true,
            isolate: false,
          },
        },
      }
    : {
        pool: 'threads' as const,
        poolOptions: {
          threads: {
            singleThread: false,
            isolate: true,
            minThreads: 1,
            maxThreads: 4,
          },
        },
      };

  return defineConfig({
    test: {
      globals: true,
      root: './',
      include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
      exclude: ['node_modules', 'dist'],
      environment: 'node',
      setupFiles: ['./test/setup.ts'],
      testTimeout,
      ...poolConfig,
      deps: {
        inline: [/@my-girok\/types/, /@protobuf-ts/],
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.ts'],
        exclude: [...baseExcludes, ...(coverage.exclude || [])],
        thresholds: {
          statements: coverage.thresholds?.statements ?? 80,
          branches: coverage.thresholds?.branches ?? 75,
          functions: coverage.thresholds?.functions ?? 80,
          lines: coverage.thresholds?.lines ?? 80,
        },
      },
    },
    plugins: [swc.vite()],
    resolve: {
      alias: {
        '@': path.resolve(dirname, 'src'),
        '@my-girok/types': path.resolve(dirname, '../../packages/types/src'),
        '@my-girok/nest-common': path.resolve(dirname, '../../packages/nest-common/src'),
        ...aliases,
      },
    },
  });
}

export { defineConfig, mergeConfig };
