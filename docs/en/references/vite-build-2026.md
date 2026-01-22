# Vite Build Best Practices - 2026

This guide covers Vite build optimization as of 2026, focusing on React integration, performance tuning, and production configurations.

## Overview

| Feature    | Description                              |
| ---------- | ---------------------------------------- |
| Dev Server | Native ES modules, instant HMR           |
| Build Tool | Rollup-based production builds           |
| Transpiler | esbuild (dev), SWC (optional)            |
| Status     | Standard for React apps (CRA deprecated) |

## Project Configuration

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig({
  plugins: [
    react(), // SWC for faster builds
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },

  build: {
    target: 'ES2022',
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

## Performance Optimizations

### 1. Use SWC Instead of Babel

```typescript
// Use @vitejs/plugin-react-swc (10-20x faster)
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
});
```

### 2. Code Splitting

```typescript
// Route-based splitting with React Router
const router = createBrowserRouter([
  {
    path: '/dashboard',
    lazy: () => import('./pages/Dashboard'),
  },
  {
    path: '/settings',
    lazy: () => import('./pages/Settings'),
  },
]);
```

### 3. Manual Chunks

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        if (id.includes('node_modules')) {
          if (id.includes('react')) return 'react-vendor';
          if (id.includes('@tanstack/react-query')) return 'query-vendor';
          if (id.includes('recharts')) return 'charts-vendor';
          return 'vendor';
        }
      },
    },
  },
}
```

### 4. Pre-bundle Dependencies

```typescript
optimizeDeps: {
  include: ['react', 'react-dom', 'react-router-dom', 'zustand'],
  exclude: ['@fsync/local-pkg'],
},
```

### 5. Target Modern Browsers

```typescript
build: {
  target: 'ES2022', // Modern features, smaller output
}
```

## Environment Variables

### .env Files

```bash
# .env
VITE_API_URL=http://localhost:4000

# .env.production
VITE_API_URL=https://api.production.com

# .env.local (gitignored)
VITE_SECRET_KEY=dev-secret
```

### Type Safety

```typescript
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## CSS Optimization

### PostCSS + Tailwind

```typescript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {}),
  },
};
```

## Library Mode

### Building a Package

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      fileName: 'my-lib',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});
```

## Testing Integration

### Vitest Configuration

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80 },
    },
  },
});
```

## Anti-Patterns to Avoid

| Don't                | Do                     | Reason       |
| -------------------- | ---------------------- | ------------ |
| Babel plugin (react) | SWC plugin (react-swc) | 10x faster   |
| SVG as components    | SVG as URLs            | Bundle size  |
| CommonJS imports     | ES modules (lodash-es) | Tree-shaking |
| Skip code splitting  | Lazy load routes       | Initial load |
| No chunk strategy    | Configure manualChunks | Caching      |
| Inline large assets  | Set assetsInlineLimit  | Bundle size  |

## Sources

- [Vite Performance Guide](https://vite.dev/guide/performance)
- [Vite with React 2026](https://medium.com/@robinviktorsson/complete-guide-to-setting-up-react-with-typescript-and-vite-2025-468f6556aaf2)
- [Optimize Vite Build Time](https://dev.to/perisicnikola37/optimize-vite-build-time-a-comprehensive-guide-4c99)
- [React Vite Bundle Optimization](https://shaxadd.medium.com/optimizing-your-react-vite-application-a-guide-to-reducing-bundle-size-6b7e93891c96)

---

_Last Updated: 2026-01-22_
