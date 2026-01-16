import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

const isAnalyze = process.env.ANALYZE === 'true';

// Generate build version with timestamp
function generateBuildVersion(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `0.0.1(${timestamp})`;
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Bundle analyzer - run with ANALYZE=true pnpm build
    isAnalyze &&
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // 'sunburst', 'network', 'treemap'
      }),
  ].filter(Boolean),
  define: {
    __BUILD_VERSION__: JSON.stringify(generateBuildVersion()),
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  cacheDir: '.vite-cache',
});
