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

## Parallel Execution

Configuration is managed in `vitest.config.ts` files, which inherit from a shared workspace config.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest runs tests in parallel by default
    testTimeout: 10000,
    clearMocks: true,
  },
});
```

| Safe            | Unsafe       |
| --------------- | ------------ |
| Unit with mocks | Shared DB    |
| Isolated state  | Global state |
