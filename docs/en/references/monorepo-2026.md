# Monorepo Best Practices - 2026

This guide covers monorepo best practices as of 2026, focusing on pnpm workspaces, Turborepo, and dependency management.

## Overview

| Feature         | Tool           |
| --------------- | -------------- |
| Package Manager | pnpm 9.x       |
| Build System    | Turborepo 2.x  |
| Caching         | Remote + Local |
| Versioning      | pnpm catalog   |

## Repository Structure

```
my-monorepo/
├── apps/
│   ├── web-app/           # React frontend
│   ├── web-admin/         # Admin dashboard
│   └── api/               # NestJS backend
├── packages/
│   ├── ui/                # Shared UI components
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utilities
│   └── config/            # Shared configs (ESLint, TS)
├── services/
│   ├── auth-service/      # Auth microservice
│   ├── user-service/      # User microservice
│   └── order-service/     # Order microservice
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.json
```

## pnpm Configuration

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
```

### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@9.15.9",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.6.3"
  }
}
```

### Catalog for Version Centralization

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'

catalog:
  react: ^19.2.0
  react-dom: ^19.2.0
  typescript: ^5.9.3
  vite: ^7.2.0
  vitest: ^4.0.0
  '@nestjs/core': ^11.0.0
  '@nestjs/common': ^11.0.0
  prisma: ^6.0.0
  '@prisma/client': ^6.0.0
```

### Using Catalog in Packages

```json
// packages/ui/package.json
{
  "name": "@myorg/ui",
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vite": "catalog:"
  }
}
```

## Turborepo Configuration

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "cache": true
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Task Dependencies

```json
{
  "tasks": {
    "build": {
      // ^build means: run build in all dependencies first
      "dependsOn": ["^build"]
    },
    "test": {
      // Run build in same package first, then test
      "dependsOn": ["build"]
    },
    "deploy": {
      // Run build and test first
      "dependsOn": ["build", "test"]
    }
  }
}
```

## TypeScript Configuration

### Root tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true
  }
}
```

### Package tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [{ "path": "../types" }, { "path": "../utils" }]
}
```

## Internal Package Design

### Package Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### package.json with Exports

```json
{
  "name": "@myorg/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components": "./src/components/index.ts"
  },
  "peerDependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

### Consuming Internal Packages

```json
// apps/web-app/package.json
{
  "dependencies": {
    "@myorg/ui": "workspace:*",
    "@myorg/utils": "workspace:*"
  }
}
```

```typescript
// apps/web-app/src/App.tsx
import { Button } from '@myorg/ui';
import { formatDate } from '@myorg/utils';
```

## Remote Caching

### Vercel Remote Cache

```bash
# Login to Vercel
npx turbo login

# Link to your team
npx turbo link
```

### Self-Hosted Cache

```json
// turbo.json
{
  "remoteCache": {
    "signature": true
  }
}
```

```bash
# Set environment variables
TURBO_REMOTE_CACHE_SIGNATURE_KEY=xxx
TURBO_API=https://cache.example.com
TURBO_TOKEN=xxx
TURBO_TEAM=myteam
```

## CI/CD Pipeline

### GitHub Actions

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2 # For turbo diff

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test
```

### Affected Packages Only

```bash
# Only run on changed packages
turbo build --filter=...[origin/main]

# Specific package and dependencies
turbo build --filter=@myorg/web-app...

# Specific package and dependents
turbo build --filter=...@myorg/ui
```

## Dependency Management

### Adding Dependencies

```bash
# Add to specific package
pnpm add react --filter @myorg/ui

# Add to root (dev tools)
pnpm add -D turbo -w

# Add workspace dependency
pnpm add @myorg/utils --filter @myorg/web-app
```

### Checking for Issues

```bash
# Find dependency issues
pnpm why react

# Check for duplicate packages
pnpm dedupe --check

# Update all packages
pnpm update -r
```

## Best Practices

### Naming Convention

```
@myorg/ui          # UI components
@myorg/utils       # Utilities
@myorg/types       # Shared types
@myorg/config      # Shared config
@myorg/web-app     # Web application
```

### Avoid Cross-Package File Access

```typescript
// Bad: Reaching into another package's internals
import { helper } from '../../packages/utils/src/internal';

// Good: Use package exports
import { helper } from '@myorg/utils';
```

### Keep Packages Focused

```
@myorg/ui - Only UI components
@myorg/utils - Only utility functions
@myorg/types - Only TypeScript types

@myorg/shared - Too broad, will grow indefinitely
```

## Anti-Patterns to Avoid

| Don't                          | Do                       | Reason          |
| ------------------------------ | ------------------------ | --------------- |
| `../` imports across packages  | Use workspace imports    | Maintainability |
| Shared catch-all package       | Focused packages         | Clarity         |
| Root tsconfig.json in packages | Package-specific extends | Isolation       |
| Skip lockfile in CI            | `--frozen-lockfile`      | Reproducibility |
| Ignore turbo cache             | Use remote cache         | CI speed        |
| Duplicate dependencies         | Use catalog              | Version sync    |

## Sources

- [Turborepo Repository Structure](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [pnpm + Turborepo Guide](https://dev.to/hexshift/setting-up-a-scalable-monorepo-with-turborepo-and-pnpm-4doh)
- [Monorepo Guide 2026](https://medium.com/@sanjaytomar717/the-ultimate-guide-to-building-a-monorepo-in-2025-sharing-code-like-the-pros-ee4d6d56abaa)
- [Nhost pnpm + Turborepo Config](https://nhost.io/blog/how-we-configured-pnpm-and-turborepo-for-our-monorepo)

---

_Last Updated: 2026-01-22_
