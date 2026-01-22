# Testing Policy

> Test standards and coverage requirements

## Coverage Requirements

| Metric     | Min | Enforcement |
| ---------- | --- | ----------- |
| Statements | 80% | CI blocks   |
| Branches   | 70% | Warning     |
| Functions  | 80% | CI blocks   |
| Lines      | 80% | CI blocks   |

## Test Requirements

| Change             | Test Required    |
| ------------------ | ---------------- |
| New service method | Unit test        |
| New endpoint       | Controller + E2E |
| Bug fix            | Regression test  |
| Refactor           | Existing pass    |

## TDD Workflow

```
RED -> GREEN -> REFACTOR
```

## File Naming

| Type | Pattern                     |
| ---- | --------------------------- |
| Unit | `*.spec.ts`                 |
| E2E  | `*.e2e-spec.ts`             |
| gRPC | `*.grpc.controller.spec.ts` |

## Test Structure

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Service', () => {
  let service: Service;

  beforeEach(async () => {
    // vi.clearAllMocks() not needed - global config handles it
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

## Shared Vitest Configuration

All services use `@my-girok/vitest-config/nestjs`:

```typescript
// services/auth-bff/vitest.config.ts
import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: ['src/**/*.controller.ts'],
  },
});
```

### Configuration Features

- Parallel execution: 8 threads/forks
- Auto cleanup: `clearMocks: true`, `restoreMocks: true`
- Standard excludes: `*.spec.ts`, `*.module.ts`, `*.dto.ts`
- Coverage thresholds: 80% statements, 75% branches
- Path aliases: `@`, `@my-girok/types`, `@my-girok/nest-common`

## Controller Testing Policy

Controllers that purely delegate to services may be excluded:

```typescript
export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: ['src/admin/admin.controller.ts'],
  },
});
```

**Criteria for exclusion:**

- Controller only calls service methods (no transformation)
- Service layer has 90%+ coverage
- **Must still have E2E coverage**

## Related Documents

| Topic          | Document               |
| -------------- | ---------------------- |
| Test Utilities | `testing-utilities.md` |
| E2E Testing    | `testing-e2e.md`       |
| gRPC Testing   | `testing-grpc.md`      |

---

_CI Checklist: `pnpm test && pnpm lint && pnpm build && coverage >= 80%`_
