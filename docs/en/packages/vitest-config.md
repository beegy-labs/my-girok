# @my-girok/vitest-config

> Shared Vitest configuration for NestJS services with SWC compilation

## Overview

The vitest-config package provides standardized testing configuration for all backend services. It uses SWC for fast TypeScript compilation and includes pre-configured settings optimized for NestJS microservices.

## Exports

| Export     | Purpose                                   |
| ---------- | ----------------------------------------- |
| `.`        | Base Vitest configuration for general use |
| `./nestjs` | NestJS-optimized configuration with mocks |

## Usage

### NestJS Services

For NestJS microservices, import the NestJS-specific configuration:

```typescript
// vitest.config.ts
import { defineConfig } from '@my-girok/vitest-config/nestjs';

export default defineConfig({
  // Service-specific overrides
  test: {
    setupFiles: ['./test/setup.ts'],
  },
});
```

## Base Configuration Features

The base configuration includes:

- **SWC compilation**: Fast TypeScript compilation using SWC instead of tsc
- **Source map support**: Full source maps for debugging
- **V8 coverage**: Coverage reporting using the V8 provider
- **Watch mode optimization**: Efficient file watching for development

## NestJS Configuration Features

The NestJS configuration extends the base with additional features:

- **NestJS mock utilities**: Pre-configured mocking for common NestJS patterns
- **Prisma client mocking**: Automatic mocking of Prisma database clients
- **gRPC client mocking**: Mocking support for gRPC service clients
- **Test isolation setup**: Ensures tests run in isolation without side effects

## Configuration Details

The base configuration includes these default settings:

```typescript
// Base configuration included
{
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts', '**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
}
```

### Key Settings Explained

| Setting             | Value                              | Description                                   |
| ------------------- | ---------------------------------- | --------------------------------------------- |
| `globals`           | `true`                             | Enables global test APIs (describe, it, etc.) |
| `environment`       | `node`                             | Uses Node.js environment for backend tests    |
| `include`           | `['**/*.spec.ts', '**/*.test.ts']` | Test file patterns to include                 |
| `coverage.provider` | `v8`                               | Uses V8's built-in coverage for performance   |
| `coverage.reporter` | `['text', 'lcov']`                 | Generates text output and LCOV reports        |

## Dependencies

| Dependency   | Purpose                         |
| ------------ | ------------------------------- |
| vitest       | Test framework                  |
| unplugin-swc | SWC integration for Vite/Vitest |

## Consumer Services

All NestJS services in the `services/` directory use this configuration:

- identity-service
- auth-service
- auth-bff
- legal-service
- personal-service
- audit-service
- analytics-service

---

**LLM Reference**: `docs/llm/packages/vitest-config.md`
