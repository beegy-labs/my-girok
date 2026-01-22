# Testing Utilities

> Mock factories and shared test utilities

## Mock Factory Functions

Use factory functions for consistent mock objects:

```typescript
// test/utils/mock-factories.ts
import { vi } from 'vitest';
import { BffSession } from '../../src/common/types';

export function createMockSession(options = {}): BffSession {
  return {
    id: options.id ?? 'session-123',
    accountId: options.accountId ?? 'user-123',
    ...options,
  };
}

export function createMockRequest(options = {}): Request {
  return {
    cookies: options.cookies ?? {},
    headers: { 'user-agent': 'Mozilla/5.0', ...options.headers },
    socket: { remoteAddress: options.socket?.remoteAddress ?? '127.0.0.1' },
  } as unknown as Request;
}

export function createNetworkError(message = 'Network error') {
  const error = new Error(message);
  error.code = GrpcErrorCode.UNAVAILABLE;
  return error;
}
```

**Usage:**

```typescript
import { createMockSession, createMockRequest } from '../utils';

describe('MyService', () => {
  it('should handle session', () => {
    const session = createMockSession({ mfaRequired: true });
    const req = createMockRequest({ cookies: { sid: 'test' } });
  });
});
```

## gRPC Testing

### Consumer (mock client)

```typescript
import { vi } from 'vitest';

mockIdentityClient = { getAccount: vi.fn(), getProfile: vi.fn() };
const module = await Test.createTestingModule({
  providers: [MyService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
}).compile();
```

### Provider (controller tests)

| Test              | Required |
| ----------------- | -------- |
| Happy path        | Yes      |
| NOT_FOUND         | Yes      |
| RpcException wrap | Yes      |
| Proto conversion  | Yes      |
| Validation errors | Yes      |

## Custom Prisma Client

For services with custom Prisma output paths:

```typescript
// services/identity-service/vitest.config.ts
import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';
import path from 'node:path';

export default createNestJsConfig(__dirname, {
  aliases: {
    '.prisma/identity-client': path.resolve(__dirname, 'node_modules/.prisma/identity-client'),
  },
});
```

**When to use:**

- Custom Prisma schema location
- Prisma defines custom `output` path
- Imports from `.prisma/[custom-name]`

## Parallel Execution

```typescript
// Use forks pool for ioredis compatibility
export default createNestJsConfig(__dirname, {
  useForks: true, // Default: false (threads pool)
});
```

| Safe            | Unsafe       |
| --------------- | ------------ |
| Unit with mocks | Shared DB    |
| Isolated state  | Global state |

## Database Testing

```typescript
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db';
```

## Configuration Sizes (After Shared Config)

| Service          | Lines | Note                |
| ---------------- | ----- | ------------------- |
| legal-service    | 8     | Minimal             |
| personal-service | 14    | Standard            |
| identity-service | 15    | Custom Prisma alias |
| auth-service     | 22    | Many exclusions     |

**Reduction**: 76% (identity-service: 63 → 15 lines)

---

_Related: `testing.md` | `testing-e2e.md`_
