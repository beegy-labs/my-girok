# Testing Utilities

> Mock factories and shared test utilities

## Overview

This document describes the shared testing utilities, mock factories, and configuration patterns used across the my-girok codebase.

## Mock Factory Functions

Use factory functions for consistent mock objects across tests:

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

### Usage

```typescript
import { createMockSession, createMockRequest } from '../utils';

describe('MyService', () => {
  it('should handle session', () => {
    const session = createMockSession({ mfaRequired: true });
    const req = createMockRequest({ cookies: { sid: 'test' } });
    // Test logic here
  });
});
```

## gRPC Testing

### Consumer (Mock Client)

```typescript
import { vi } from 'vitest';

mockIdentityClient = { getAccount: vi.fn(), getProfile: vi.fn() };
const module = await Test.createTestingModule({
  providers: [MyService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
}).compile();
```

### Provider (Controller Tests)

Required test cases for gRPC controllers:

| Test              | Required |
| ----------------- | -------- |
| Happy path        | Yes      |
| NOT_FOUND         | Yes      |
| RpcException wrap | Yes      |
| Proto conversion  | Yes      |
| Validation errors | Yes      |

## Custom Prisma Client Configuration

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

### Thread Safety

| Safe            | Unsafe       |
| --------------- | ------------ |
| Unit with mocks | Shared DB    |
| Isolated state  | Global state |

## Database Testing

Set up test database URL:

```typescript
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db';
```

### Test Database Patterns

```typescript
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up test data
  await prisma.user.deleteMany();
});
```

## Configuration Sizes (After Shared Config)

Using shared configuration significantly reduces boilerplate:

| Service          | Lines | Note                |
| ---------------- | ----- | ------------------- |
| legal-service    | 8     | Minimal             |
| personal-service | 14    | Standard            |
| identity-service | 15    | Custom Prisma alias |
| auth-service     | 22    | Many exclusions     |

**Reduction**: 76% (identity-service: 63 → 15 lines)

## Common Test Utilities

### Wait for Condition

```typescript
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Condition not met within timeout');
}
```

### Create Test Module

```typescript
export async function createTestModule(providers: Provider[]) {
  return Test.createTestingModule({
    providers: [...providers, { provide: Logger, useValue: { log: vi.fn(), error: vi.fn() } }],
  }).compile();
}
```

## Related Documentation

- Main Testing Policy: `docs/en/policies/testing.md`
- E2E Testing: `docs/en/policies/testing-e2e.md`

---

_This document is auto-generated from `docs/llm/policies/testing-utilities.md`_
