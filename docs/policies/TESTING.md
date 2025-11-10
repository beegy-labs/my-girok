# Testing Standards

> Guidelines for writing and maintaining tests

## Test-Driven Development (TDD) is MANDATORY

**ALL code MUST follow TDD principles:**

```
RED → GREEN → REFACTOR
```

### TDD Cycle

1. **RED** - Write failing test first
2. **GREEN** - Write minimal code to pass
3. **REFACTOR** - Improve code quality

### Why TDD?

- ✅ Better design decisions
- ✅ Immediate feedback
- ✅ Living documentation
- ✅ Refactoring confidence
- ✅ Fewer bugs in production

### Example TDD Flow

```typescript
// Step 1: RED - Write failing test
describe('AuthService', () => {
  it('should hash password on registration', async () => {
    const result = await service.register({
      email: 'test@example.com',
      password: 'Plain123!',
      name: 'Test',
    });

    expect(result.user.password).not.toBe('Plain123!');
  });
});

// Run: pnpm test → ❌ FAIL

// Step 2: GREEN - Make it pass
async register(dto: RegisterDto) {
  const hashedPassword = await bcrypt.hash(dto.password, 12);
  const user = await this.prisma.user.create({
    data: { ...dto, password: hashedPassword },
  });
  return { user, accessToken: this.generateToken(user) };
}

// Run: pnpm test → ✅ PASS

// Step 3: REFACTOR - Clean up
async register(dto: RegisterDto) {
  await this.validateEmailUnique(dto.email);
  const hashedPassword = await this.hashPassword(dto.password);
  const user = await this.createUser({ ...dto, password: hashedPassword });
  return this.buildAuthResponse(user);
}

// Run: pnpm test → ✅ PASS (still works)
```

**See [.ai/testing.md](.ai/testing.md) for detailed TDD guide**

## Coverage Requirements

**Minimum Standards:**
- **Unit tests**: 80% code coverage
- **Integration tests**: All critical flows (auth, payments, data mutations)
- **E2E tests**: Main user journeys (signup → login → create post → logout)

## Testing Standards

### File Naming

```
src/posts/posts.service.ts       → src/posts/posts.service.spec.ts
src/users/users.controller.ts    → src/users/users.controller.spec.ts
e2e/auth.e2e-spec.ts
```

### Test Structure

```typescript
describe('PostsService', () => {
  let service: PostsService;
  let repository: MockRepository;

  beforeEach(async () => {
    // Setup
    const module = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PostsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    repository = module.get(PostsRepository);
  });

  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a post successfully', async () => {
      // Arrange
      const dto = { title: 'Test', content: 'Content' };
      repository.create.mockResolvedValue({ id: '1', ...dto });

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toHaveProperty('id');
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException on duplicate title', async () => {
      // Arrange
      const dto = { title: 'Duplicate', content: 'Content' };
      repository.create.mockRejectedValue({ code: 'P2002' });

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });
});
```

### Test Database

**NEVER use production database for tests**

```typescript
// jest.config.js
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db';
```

**Best Practices:**
- Use separate test database or in-memory SQLite
- Reset database before each test suite
- Cleanup test data after tests
- Use transactions and rollback in integration tests

```typescript
// Integration test example
describe('PostsController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.post.deleteMany();
  });

  it('/posts (POST)', async () => {
    return request(app.getHttpServer())
      .post('/posts')
      .send({ title: 'Test', content: 'Content' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('Test');
      });
  });
});
```

## CI/CD Requirements

### Pre-merge Checks

- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] Code coverage meets minimum (80%)

### Branch Protection

- No direct commits to `main` branch
- Requires 1 approval for PRs
- All CI checks must pass
- Up-to-date with base branch

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linter
        run: pnpm lint

      - name: Run type check
        run: pnpm type-check

      - name: Run tests
        run: pnpm test --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5433/test_db

      - name: Check coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi

      - name: Build
        run: pnpm build
```

## Testing Best Practices

### Unit Tests

```typescript
// ✅ DO: Test business logic, not implementation details
it('should mark user as active when email is verified', () => {
  const user = new User({ email: 'test@example.com', emailVerified: false });
  user.verifyEmail();
  expect(user.isActive).toBe(true);
});

// ❌ DON'T: Test internal methods
it('should call internal method', () => {
  const spy = jest.spyOn(service, '_internalMethod');
  service.publicMethod();
  expect(spy).toHaveBeenCalled();
});
```

### Integration Tests

```typescript
// ✅ DO: Test real database interactions
it('should create post and associate with author', async () => {
  const user = await prisma.user.create({ data: { email: 'test@example.com' } });
  const post = await service.create({ title: 'Test', authorId: user.id });

  const result = await prisma.post.findUnique({
    where: { id: post.id },
    include: { author: true },
  });

  expect(result.author.id).toBe(user.id);
});
```

### E2E Tests

```typescript
// ✅ DO: Test complete user flows
describe('User Registration Flow (e2e)', () => {
  it('should register, verify email, and login', async () => {
    // 1. Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'Password123!' })
      .expect(201);

    // 2. Verify email (simulate)
    const token = registerRes.body.verificationToken;
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(200);

    // 3. Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'new@example.com', password: 'Password123!' })
      .expect(200);

    expect(loginRes.body).toHaveProperty('accessToken');
  });
});
```

### Mock Best Practices

```typescript
// ✅ DO: Create reusable mock factories
const mockUser = (overrides?: Partial<User>): User => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  ...overrides,
});

// Usage
const user = mockUser({ email: 'custom@example.com' });
```

### Snapshot Testing

```typescript
// Use sparingly - snapshots can become brittle
it('should match snapshot', () => {
  const dto = new CreatePostDto();
  dto.title = 'Test';
  dto.content = 'Content';

  expect(dto).toMatchSnapshot();
});
```

## Test Checklist

### Before Committing
- [ ] All new code has tests
- [ ] All tests pass locally
- [ ] Coverage meets minimum (80%)
- [ ] No test.only() or describe.only()
- [ ] No console.log() in tests
- [ ] Test names are descriptive

### Writing Tests
- [ ] Follow Arrange-Act-Assert pattern
- [ ] Test edge cases and error conditions
- [ ] Mock external dependencies
- [ ] Use descriptive test names
- [ ] Keep tests focused and independent
- [ ] Clean up resources in afterEach/afterAll

## Common Testing Patterns

### Testing Guards

```typescript
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should return true for valid token', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer valid-token' } }),
      }),
    };

    expect(guard.canActivate(context as any)).toBe(true);
  });
});
```

### Testing Interceptors

```typescript
describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap data in response object', async () => {
    const handler = {
      handle: () => of({ id: 1, name: 'Test' }),
    };

    const result = await interceptor.intercept({} as any, handler).toPromise();

    expect(result).toEqual({
      data: { id: 1, name: 'Test' },
      statusCode: 200,
    });
  });
});
```

### Testing with Transactions

```typescript
describe('PostsService @Transactional', () => {
  it('should rollback on error', async () => {
    const dto = { title: 'Test' };

    jest.spyOn(tagsRepo, 'connect').mockRejectedValue(new Error('Tag error'));

    await expect(service.create(dto)).rejects.toThrow();

    // Verify post was not created (transaction rolled back)
    const posts = await prisma.post.findMany();
    expect(posts).toHaveLength(0);
  });
});
```

## Test Execution Performance

### Parallel Test Execution

**All unit tests SHOULD run in parallel for faster feedback.**

#### Configuration

```javascript
// jest.config.js
module.exports = {
  // Enable parallel execution
  maxWorkers: '50%', // Use 50% of CPU cores (safe default)
  // maxWorkers: 4,   // Or specify exact number

  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/../.jest-cache',
  bail: false, // Continue even if some tests fail

  // Timeout configuration
  testTimeout: 10000, // 10 seconds per test
};
```

#### When Parallel Tests Are Safe

✅ **Safe for parallel execution:**
- Unit tests with mocked dependencies
- Tests with isolated state (`beforeEach` setup)
- Tests without shared resources
- Tests without file system dependencies
- Tests without real database connections

❌ **NOT safe for parallel execution:**
- Integration tests with shared database
- Tests that modify global state
- Tests with file system race conditions
- Tests with shared network resources

#### Best Practices

1. **Isolate Test State**
```typescript
describe('Service', () => {
  let service: Service;
  let mockRepo: MockRepository;

  // ✅ GOOD: Fresh instance per test
  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new Service(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

2. **Avoid Shared State**
```typescript
// ❌ BAD: Shared state across tests
let sharedCounter = 0;

it('test 1', () => {
  sharedCounter++;
  expect(sharedCounter).toBe(1); // Flaky in parallel
});

// ✅ GOOD: Isolated state
it('test 1', () => {
  const counter = 0;
  const result = increment(counter);
  expect(result).toBe(1);
});
```

3. **Mock External Dependencies**
```typescript
// ✅ All external calls mocked
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockHttpService = {
  get: jest.fn(() => of({ data: {} })),
};
```

#### Performance Metrics

**Target times (with parallel execution):**
- Unit tests: < 15 seconds for entire suite
- Individual test: < 1 second
- Integration tests: < 30 seconds per file

**Example parallel speedup:**
```bash
# Sequential execution
pnpm test --runInBand
# Time: 25-30 seconds

# Parallel execution (50% workers)
pnpm test
# Time: 15-18 seconds
# Speedup: ~40-50%
```

### Load Testing

```typescript
// Use autocannon or k6 for load testing
import autocannon from 'autocannon';

describe('Load Test', () => {
  it('should handle 100 req/s', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000/api/posts',
      connections: 10,
      duration: 10,
    });

    expect(result.requests.average).toBeGreaterThan(100);
    expect(result.errors).toBe(0);
  });
});
```

## Documentation

Each test file should have a brief description:

```typescript
/**
 * PostsService Unit Tests
 *
 * Tests cover:
 * - CRUD operations
 * - Tag associations
 * - Error handling
 * - Transaction rollback
 */
describe('PostsService', () => {
  // tests...
});
```
