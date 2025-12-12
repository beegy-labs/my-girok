import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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

    // Exclude e2e tests (run separately with Playwright)
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      '**/*.spec.ts',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'e2e/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
  cacheDir: '.vite-cache',
});
