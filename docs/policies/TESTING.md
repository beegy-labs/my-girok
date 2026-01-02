# Testing Standards

## Coverage Requirements

| Metric     | Minimum | Enforcement       |
| ---------- | ------- | ----------------- |
| Statements | **80%** | CI blocks on fail |
| Branches   | 70%     | Warning only      |
| Functions  | **80%** | CI blocks on fail |
| Lines      | **80%** | CI blocks on fail |

> **Coverage below 80% will block CI and prevent merge.**

## Pre-Work Checklist

**Before starting any development work:**

1. Read `docs/TEST_COVERAGE.md` for current coverage status
2. Check pending tests list for the service you're working on
3. Plan test coverage for new code

## TDD Cycle (MANDATORY)

```
RED → GREEN → REFACTOR
```

1. Write failing test
2. Write minimal code to pass
3. Improve code quality

## Test Requirements for Code Changes

| Change Type             | Test Requirement           |
| ----------------------- | -------------------------- |
| New service method      | Unit test required         |
| New controller endpoint | Controller test + E2E test |
| Bug fix                 | Regression test required   |
| Refactoring             | Existing tests must pass   |

**Code without tests will NOT be merged.**

## Coverage Requirements

| Type        | Minimum            |
| ----------- | ------------------ |
| Unit tests  | 80%                |
| Integration | All critical flows |
| E2E         | Main user journeys |

## Test Structure

```typescript
describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PostsService, { provide: Repo, useValue: mockRepo }],
    }).compile();
    service = module.get(PostsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create post', async () => {
    // Arrange
    const dto = { title: 'Test' };
    mockRepo.create.mockResolvedValue({ id: '1', ...dto });

    // Act
    const result = await service.create(dto);

    // Assert
    expect(result).toHaveProperty('id');
  });
});
```

## CI Requirements

- [ ] All tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Coverage ≥ 80%

## Test Database

```typescript
// NEVER use production database
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db';
```

## Public Endpoints

```typescript
// Must work WITHOUT authentication
it('should work without auth', async () => {
  await request(app).get('/v1/share/public/token123').expect(200); // Not 401
});
```

## Parallel Execution

```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',
  cache: true,
  testTimeout: 10000,
};
```

**Safe for parallel:**

- Unit tests with mocks
- Isolated state tests

**NOT safe:**

- Shared database tests
- Global state tests

## gRPC Testing

### Consumer Services (using gRPC clients)

Services consuming gRPC endpoints must mock the gRPC client:

```typescript
import { IdentityGrpcClient } from '@my-girok/nest-common';

let mockIdentityClient: {
  getAccount: jest.Mock;
  getProfile: jest.Mock;
};

beforeEach(async () => {
  mockIdentityClient = {
    getAccount: jest.fn(),
    getProfile: jest.fn(),
  };

  const module = await Test.createTestingModule({
    providers: [MyService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
  }).compile();
});
```

### Provider Services (exposing gRPC endpoints)

Services exposing gRPC endpoints need `*.grpc.controller.spec.ts`:

```typescript
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

// Test error handling
it('should wrap errors in RpcException', async () => {
  mockService.method.mockRejectedValue(new Error('DB error'));
  await expect(controller.grpcMethod(request)).rejects.toThrow(RpcException);
});

// Test NOT_FOUND handling
it('should return NOT_FOUND for missing entity', async () => {
  mockService.findOne.mockRejectedValue(new NotFoundException());

  try {
    await controller.getEntity({ id: 'invalid' });
  } catch (e) {
    expect(e).toBeInstanceOf(RpcException);
    expect(e.getError().code).toBe(GrpcStatus.NOT_FOUND);
  }
});

// Test proto timestamp conversion
it('should convert Date to proto timestamp', async () => {
  const result = await controller.getEntity({ id: '123' });
  expect(result.created_at?.seconds).toBeGreaterThan(0);
});
```

### Required gRPC Tests

| Test Category         | Required |
| --------------------- | -------- |
| Happy path            | Yes      |
| NOT_FOUND handling    | Yes      |
| RpcException wrapping | Yes      |
| Proto type conversion | Yes      |
| Validation errors     | Yes      |

---

**File naming**: `*.spec.ts` (unit), `*.e2e-spec.ts` (E2E), `*.grpc.controller.spec.ts` (gRPC)
