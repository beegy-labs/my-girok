# @my-girok/vitest-config

Shared Vitest configuration for NestJS services with SWC compilation.

## Exports

| Export     | Purpose                   |
| ---------- | ------------------------- |
| `.`        | Base vitest configuration |
| `./nestjs` | NestJS-optimized config   |

## Usage

### NestJS Services

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

### Base Config Features

- SWC for fast TypeScript compilation
- Source map support
- Coverage with v8 provider
- Watch mode optimization

### NestJS Config Features

Extends base config with:

- NestJS mock utilities
- Prisma client mocking
- gRPC client mocking
- Test isolation setup

## Configuration Details

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

## Dependencies

- `vitest`: Test framework
- `unplugin-swc`: SWC integration for Vite

## Consumers

All NestJS services in `services/` directory:

- identity-service
- auth-service
- auth-bff
- legal-service
- personal-service
- audit-service
- analytics-service
