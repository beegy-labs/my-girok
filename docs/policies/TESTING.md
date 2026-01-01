# Testing Standards

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

---

**File naming**: `*.spec.ts` (unit), `*.e2e-spec.ts` (E2E)
