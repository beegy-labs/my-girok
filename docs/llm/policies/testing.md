# Testing

## Coverage

| Metric     | Min | Enforcement |
| ---------- | --- | ----------- |
| Statements | 80% | CI blocks   |
| Branches   | 70% | Warning     |
| Functions  | 80% | CI blocks   |
| Lines      | 80% | CI blocks   |

## Requirements

| Change             | Test Required    |
| ------------------ | ---------------- |
| New service method | Unit test        |
| New endpoint       | Controller + E2E |
| Bug fix            | Regression test  |
| Refactor           | Existing pass    |

## TDD

```
RED -> GREEN -> REFACTOR
```

## Structure

The project uses Vitest for testing. Mocks are automatically cleared after each test, as configured by `clearMocks: true` in the shared `vitest.config.ts`.

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Service', () => {
  let service: Service;

  beforeEach(async () => {
    // vi.clearAllMocks() is not needed due to global config.
    const module = await Test.createTestingModule({
      providers: [Service, { provide: Repo, useValue: mockRepo }],
    }).compile();
    service = module.get(Service);
  });

  it('should work', async () => {
    // Arrange
    mockRepo.create.mockResolvedValue({ id: '1' });
    // Act
    const result = await service.create(dto);
    // Assert
    expect(result).toHaveProperty('id');
  });
});
```

## CI Checklist

```yaml
- pnpm test
- pnpm lint
- pnpm build
- coverage >= 80%
```

## Database

```typescript
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db';
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

## File Naming

| Type | Pattern                     |
| ---- | --------------------------- |
| Unit | `*.spec.ts`                 |
| E2E  | `*.e2e-spec.ts`             |
| gRPC | `*.grpc.controller.spec.ts` |

## Controller Testing Policy

### Thin Wrapper Controllers

Controllers that purely delegate to services without business logic may be excluded from unit test coverage:

```typescript
// vitest.config.ts
export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: ['src/admin/admin.controller.ts', 'src/user/user.controller.ts'],
  },
});
```

**Criteria for exclusion:**

- Controller only calls service methods (no transformation logic)
- No branching or error handling beyond decorator-based validation
- Service layer has 90%+ coverage

**Important:** Excluded controllers MUST still have E2E test coverage.

## Shared Test Utilities

Use factory functions for consistent mock objects across tests:

```typescript
// test/utils/mock-factories.ts
import { vi } from 'vitest';
import { BffSession } from '../../src/common/types';

export function createMockSession(options = {}): BffSession {
  return {
    id: options.id ?? 'session-123',
    accountId: options.accountId ?? 'user-123',
    // ... other defaults
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

// gRPC error mocks
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
    // ...
  });
});
```

## Shared Vitest Configuration

All backend services use a shared Vitest configuration from `@my-girok/vitest-config/nestjs` to ensure consistency and reduce duplication.

### Basic Usage

```typescript
// services/auth-bff/vitest.config.ts
import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: [
      'src/**/*.controller.ts', // Controllers tested via E2E
      'src/grpc-clients/**', // gRPC client infrastructure
    ],
  },
});
```

### Custom Prisma Client (identity-service)

For services using custom Prisma client output paths, add the alias configuration:

```typescript
// services/identity-service/vitest.config.ts
import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';
import path from 'node:path';

export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: [
      'src/grpc/**', // gRPC infrastructure
      'src/database/identity-prisma.service.ts', // Database client wrapper
      'src/common/outbox/**', // Outbox pattern infrastructure
    ],
  },
  aliases: {
    '.prisma/identity-client': path.resolve(__dirname, 'node_modules/.prisma/identity-client'),
  },
});
```

**When to use custom alias:**

- Service uses custom Prisma schema location (e.g., `prisma/identity/schema.prisma`)
- Prisma schema defines custom `output` path
- Source code imports from `.prisma/[custom-name]` instead of `@prisma/client`

### Shared Configuration Features

The shared config (`@my-girok/vitest-config/nestjs`) provides:

- **Parallel execution**: 8 threads (threads pool) or 8 forks (forks pool)
- **Auto cleanup**: `clearMocks: true`, `restoreMocks: true`
- **Standard excludes**: `*.spec.ts`, `*.module.ts`, `*.dto.ts`, `main.ts`, `config/*`
- **Coverage thresholds**: 80% statements, 75% branches, 80% functions, 80% lines
- **Path aliases**: `@`, `@my-girok/types`, `@my-girok/nest-common`
- **Test timeout**: Configurable (default: 10000ms)

### Configuration Sizes

| Service               | Lines | Note                |
| --------------------- | ----- | ------------------- |
| legal-service         | 8     | Minimal config      |
| personal-service      | 14    | Standard config     |
| analytics-service     | 15    | Standard config     |
| auth-bff              | 15    | Standard config     |
| identity-service      | 15    | Custom Prisma alias |
| authorization-service | 17    | Custom thresholds   |
| auth-service          | 22    | Many exclusions     |
| audit-service         | 23    | Many exclusions     |

**Before shared config (identity-service)**: 63 lines
**After shared config (identity-service)**: 15 lines (76% reduction)

## Parallel Execution

Configuration is managed in `vitest.config.ts` files, which inherit from the shared workspace config (`@my-girok/vitest-config/nestjs`).

Tests run in parallel by default using:

- **threads pool**: Default mode, isolates tests in worker threads (8 max threads)
- **forks pool**: Alternative mode for ioredis compatibility (8 max forks)

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
