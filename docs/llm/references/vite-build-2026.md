# Vite Build - 2026 Best Practices

> Build optimization, React integration, performance | **Researched**: 2026-01-22

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
      '@hooks': path.resolve(__dirname, './src/hooks'),
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
    open: true,
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
// ✅ Use @vitejs/plugin-react-swc
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
});

// ❌ Avoid @vitejs/plugin-react (Babel-based)
// import react from '@vitejs/plugin-react';
```

**Impact**: 10-20x faster transpilation

### 2. Code Splitting

```typescript
// Automatic code splitting with dynamic imports
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

// Route-based splitting
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
        // Vendor chunk
        if (id.includes('node_modules')) {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
          if (id.includes('recharts')) {
            return 'charts-vendor';
          }
          return 'vendor';
        }
      },
    },
  },
}
```

### 4. Pre-bundle Dependencies

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', '@tanstack/react-query'],
    exclude: ['@fsync/local-pkg'], // Packages to skip
  },
});
```

### 5. Target Modern Browsers

```typescript
build: {
  // ES2022 for modern features, smaller output
  target: 'ES2022',

  // Or specify browser versions
  // target: ['chrome100', 'firefox100', 'safari15'],
}
```

## Development Server

### Hot Module Replacement (HMR)

```typescript
// Automatic HMR for React components

// For non-React modules, manual HMR
if (import.meta.hot) {
  import.meta.hot.accept('./module', (newModule) => {
    // Handle module update
  });
}
```

### File Warmup

```typescript
server: {
  warmup: {
    // Pre-transform frequently used files
    clientFiles: [
      './src/components/Button.tsx',
      './src/hooks/useAuth.ts',
      './src/store/index.ts',
    ],
  },
}
```

## Asset Handling

### Static Assets

```typescript
// Import as URL
import logoUrl from './logo.svg';
// <img src={logoUrl} />

// Import as raw string
import shaderCode from './shader.glsl?raw';

// Import as worker
import Worker from './worker.js?worker';
```

### SVG Optimization

```typescript
// ❌ Don't: Transform SVG to React components
// import Logo from './logo.svg?react';

// ✅ Do: Import as URL
import logoUrl from './logo.svg';
// <img src={logoUrl} alt="Logo" />

// ✅ Or inline small SVGs
const Icon = () => (
  <svg viewBox="0 0 24 24">...</svg>
);
```

## CSS Optimization

### CSS Code Splitting

```typescript
build: {
  cssCodeSplit: true, // Default: true
  cssMinify: 'esbuild', // or 'lightningcss'
}
```

### PostCSS + Tailwind

```typescript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: { preset: 'default' } } : {}),
  },
};
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

### Usage

```typescript
// Only VITE_ prefixed vars are exposed
const apiUrl = import.meta.env.VITE_API_URL;
const mode = import.meta.env.MODE; // 'development' | 'production'
const isDev = import.meta.env.DEV; // boolean
const isProd = import.meta.env.PROD; // boolean
```

### Type Safety

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Library Mode

### Building a Package

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src'] })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      fileName: 'my-lib',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

## Bundle Analysis

### Visualizer Plugin

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### Size Limits

```typescript
// package.json
{
  "size-limit": [
    {
      "path": "dist/assets/*.js",
      "limit": "250 KB"
    }
  ]
}
```

## Testing Integration

### Vitest Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
      },
    },
  },
});
```

## Anti-Patterns

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
- [Vite Best Practices](https://medium.com/@taedmonds/best-practices-for-react-js-with-vite-and-typescript-what-i-use-and-why-f4482558ed89)
