import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    // Vitest configuration for unit tests
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',

    // Parallel execution configuration
    pool: 'threads', // Use worker threads for parallel execution
    poolOptions: {
      threads: {
        singleThread: false, // Enable parallel execution
        maxThreads: '50%', // Use 50% of CPU cores
      },
    },

    // Performance optimizations
    cache: {
      dir: '.vitest-cache',
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
});
