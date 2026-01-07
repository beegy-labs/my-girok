# Testing Policy

> Test-Driven Development with 80% coverage requirement

## Coverage Requirements

| Metric     | Minimum | Enforcement     |
| ---------- | ------- | --------------- |
| Statements | 80%     | CI blocks merge |
| Branches   | 70%     | Warning only    |
| Functions  | 80%     | CI blocks merge |
| Lines      | 80%     | CI blocks merge |

## Test Requirements by Change Type

| Change Type        | Required Tests               |
| ------------------ | ---------------------------- |
| New service method | Unit test                    |
| New endpoint       | Controller test + E2E test   |
| Bug fix            | Regression test proving fix  |
| Refactor           | All existing tests must pass |

## Test-Driven Development (TDD)

Follow the Red-Green-Refactor cycle:

```
RED -> Write a failing test
GREEN -> Write minimal code to pass
REFACTOR -> Clean up while tests pass
```

## Test Structure Template

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [UserService, { provide: UserRepository, useValue: mockRepository }],
    }).compile();

    service = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user and return with id', async () => {
      // Arrange
      const dto = { email: 'test@example.com', name: 'Test' };
      mockRepository.create.mockResolvedValue({ id: '1', ...dto });

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toHaveProperty('id', '1');
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
    });
  });
});
```

## CI Pipeline Checklist

```yaml
test:
  steps:
    - pnpm test # Run all tests
    - pnpm lint # Lint check
    - pnpm build # Build check
    - coverage >= 80% # Coverage gate
```

## Database Testing

Use isolated test database:

```typescript
// test/setup.ts
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db';
```

## gRPC Testing

### Consumer Side (Mock Client)

```typescript
describe('MyService', () => {
  let service: MyService;
  let mockIdentityClient: jest.Mocked<IdentityGrpcClient>;

  beforeEach(async () => {
    mockIdentityClient = {
      getAccount: jest.fn(),
      getProfile: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [MyService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
    }).compile();

    service = module.get(MyService);
  });
});
```

### Provider Side (Controller Tests)

| Test Case             | Required |
| --------------------- | -------- |
| Happy path (success)  | Yes      |
| NOT_FOUND error       | Yes      |
| RpcException wrapping | Yes      |
| Proto type conversion | Yes      |
| Validation errors     | Yes      |

## File Naming Conventions

| Test Type             | File Pattern                |
| --------------------- | --------------------------- |
| Unit tests            | `*.spec.ts`                 |
| E2E tests             | `*.e2e-spec.ts`             |
| gRPC controller tests | `*.grpc.controller.spec.ts` |

## Parallel Test Execution

```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',
  cache: true,
  testTimeout: 10000,
};
```

### Parallelization Safety

| Safe for Parallel       | Unsafe for Parallel     |
| ----------------------- | ----------------------- |
| Unit tests with mocks   | Tests sharing database  |
| Isolated state per test | Tests with global state |
| In-memory operations    | File system operations  |

---

**LLM Reference**: `docs/llm/policies/TESTING.md`
