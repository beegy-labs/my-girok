# @my-girok/vitest-config

> Shared Vitest configuration for NestJS services | **Last Updated**: 2026-01-11

## Exports

| Export     | Purpose                              |
| ---------- | ------------------------------------ |
| `.`        | Base vitest config                   |
| `./nestjs` | NestJS-optimized config (SWC, mocks) |

## Usage

```typescript
// vitest.config.ts
import { defineConfig } from '@my-girok/vitest-config/nestjs';
export default defineConfig({
  // service-specific overrides
});
```

**SSOT**: `docs/llm/packages/vitest-config.md`
