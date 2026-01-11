# @my-girok/auth-utils

> Shared auth utilities for frontend apps | **Last Updated**: 2026-01-11

## Exports

| Module            | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `createAuthStore` | Zustand store factory (token, user, MFA state) |
| `createApiClient` | Axios instance factory (interceptors, refresh) |

## Usage

```typescript
import { createAuthStore, createApiClient } from '@my-girok/auth-utils';
const useAuthStore = createAuthStore({ baseURL: '/api' });
const api = createApiClient({ baseURL: '/api', store: useAuthStore });
```

**SSOT**: `docs/llm/packages/auth-utils.md`
