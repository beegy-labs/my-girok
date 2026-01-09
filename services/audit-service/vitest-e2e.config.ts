import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    testTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: true,
      },
    },
    deps: {
      inline: [/@my-girok\/types/, /@protobuf-ts/],
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
