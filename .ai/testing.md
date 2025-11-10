# Testing Standards

> TDD-first approach for my-girok project

## Core Principle

**Test-Driven Development (TDD) is MANDATORY**

All code MUST be written following the TDD cycle:

```
RED → GREEN → REFACTOR
```

## TDD Workflow

### 1. RED - Write Failing Test

```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  it('should register a new user', async () => {
    const dto = { email: 'test@example.com', password: 'Pass123!', name: 'Test' };
    const result = await service.register(dto);

    expect(result.user.email).toBe(dto.email);
    expect(result.accessToken).toBeDefined();
  });
});

// Run: pnpm test
// Expected: ❌ FAIL - service.register is not defined
```

### 2. GREEN - Make Test Pass

```typescript
// auth.service.ts
async register(dto: RegisterDto): Promise<AuthPayload> {
  const user = await this.prisma.user.create({ data: dto });
  const tokens = this.generateTokens(user);
  return { user, ...tokens };
}

// Run: pnpm test
// Expected: ✅ PASS
```

### 3. REFACTOR - Clean Up Code

```typescript
// auth.service.ts
async register(dto: RegisterDto): Promise<AuthPayload> {
  await this.validateEmailUnique(dto.email);
  const hashedPassword = await this.hashPassword(dto.password);
  const user = await this.createUser({ ...dto, password: hashedPassword });
  return this.buildAuthResponse(user);
}

// Run: pnpm test
// Expected: ✅ PASS (still works after refactor)
```

## Test Pyramid

```
        E2E Tests (10%)
      ┌─────────────┐
      │   Slow      │
      │   Expensive │
      └─────────────┘

    Integration Tests (20%)
  ┌───────────────────┐
  │   Medium Speed    │
  │   Database, APIs  │
  └───────────────────┘

    Unit Tests (70%)
┌─────────────────────────┐
│   Fast                  │
│   Isolated Functions    │
└─────────────────────────┘
```

## Test Coverage Requirements

**Minimum Coverage:**
- Overall: **80%**
- Statements: **80%**
- Branches: **75%**
- Functions: **80%**
- Lines: **80%**

**Critical Paths:**
- Authentication: **95%**
- Authorization: **95%**
- Payment/Financial: **100%**

## Test Types

### Unit Tests

**What:** Test individual functions/methods in isolation

**When:** Every function with business logic

**Example:**
```typescript
// hash-password.spec.ts
describe('hashPassword', () => {
  it('should hash password with bcrypt', async () => {
    const password = 'Plain123!';
    const hashed = await hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(await bcrypt.compare(password, hashed)).toBe(true);
  });

  it('should use 12 salt rounds', async () => {
    const hashed = await hashPassword('test');
    expect(hashed.startsWith('$2b$12$')).toBe(true);
  });
});
```

### Integration Tests

**What:** Test multiple components working together

**When:** API endpoints, database operations, external services

**Example:**
```typescript
// auth.controller.spec.ts (integration)
describe('AuthController Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('POST /api/v1/auth/register', async () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'Pass123!', name: 'Test' })
      .expect(201)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.user.email).toBe('test@example.com');
      });
  });
});
```

### E2E Tests

**What:** Test complete user flows end-to-end

**When:** Critical business workflows

**Example:**
```typescript
// auth-flow.e2e.spec.ts
describe('Complete Auth Flow (E2E)', () => {
  it('should complete full registration and login flow', async () => {
    // 1. Register
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@test.com', password: 'Pass123!', name: 'User' })
      .expect(201);

    // 2. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@test.com', password: 'Pass123!' })
      .expect(200);

    // 3. Access protected resource
    await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('user@test.com');
      });
  });
});
```

## Testing Best Practices

### DO

✅ **Write tests BEFORE code** (TDD)
✅ **Test behavior, not implementation**
✅ **Use descriptive test names** (`should return 401 when password is wrong`)
✅ **Arrange-Act-Assert pattern**
✅ **Mock external dependencies**
✅ **Clean up after tests** (database, files)
✅ **Test edge cases and error paths**
✅ **Keep tests fast** (< 100ms for unit tests)

### DON'T

❌ **Write tests after code**
❌ **Test private methods** (test through public interface)
❌ **Share state between tests**
❌ **Use real external APIs in tests**
❌ **Skip cleanup**
❌ **Write flaky tests** (random failures)
❌ **Test framework code** (test your logic only)

## Test Structure

### AAA Pattern (Arrange-Act-Assert)

```typescript
describe('AuthService.login', () => {
  it('should return tokens for valid credentials', async () => {
    // Arrange - Setup
    const email = 'user@test.com';
    const password = 'Pass123!';
    await createTestUser(email, password);

    // Act - Execute
    const result = await service.login({ email, password });

    // Assert - Verify
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe(email);
  });
});
```

## Mocking Strategy

### Database Mocking

```typescript
// Use in-memory database for fast tests
const prisma = new PrismaClient({
  datasources: { db: { url: 'file::memory:?cache=shared' } },
});
```

### Service Mocking

```typescript
const mockUserService = {
  findById: jest.fn().mockResolvedValue(mockUser),
  create: jest.fn().mockResolvedValue(mockUser),
};
```

### HTTP Mocking

```typescript
// Mock external OAuth providers
nock('https://oauth2.googleapis.com')
  .post('/token')
  .reply(200, { access_token: 'mock-token' });
```

## Test Files Organization

```
services/auth-service/
├── src/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts          # Unit tests
│   │   ├── auth.controller.ts
│   │   └── auth.controller.spec.ts       # Integration tests
│   └── ...
├── test/
│   ├── auth-flow.e2e-spec.ts            # E2E tests
│   ├── fixtures/                        # Test data
│   └── helpers/                         # Test utilities
└── jest.config.js
```

## Jest Configuration

```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // ⚡ Parallel execution for faster tests
  maxWorkers: '50%', // Use 50% of CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/../.jest-cache',
  testTimeout: 10000, // 10s per test
};
```

### Parallel Test Execution

**Default behavior:** Jest runs tests in parallel for faster feedback.

**Safe for parallel:**
- ✅ Unit tests with mocked dependencies
- ✅ Tests with `beforeEach`/`afterEach` isolation
- ✅ No shared state between tests

**NOT safe for parallel:**
- ❌ Integration tests with real database
- ❌ Tests modifying global state
- ❌ Tests with file system dependencies

**Example:**
```typescript
describe('Service', () => {
  let service: Service;
  let mockRepo: MockRepository;

  // ✅ Fresh instance per test = parallel safe
  beforeEach(() => {
    mockRepo = jest.fn();
    service = new Service(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clean up
  });
});
```

**Disable parallel for specific tests:**
```bash
# Run sequentially if needed
pnpm test --runInBand
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:cov

# Run specific test file
pnpm test auth.service.spec

# Run E2E tests
pnpm test:e2e

# Run tests in CI
pnpm test:ci  # No watch, coverage report
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test:cov

      - name: Check coverage
        run: |
          if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then
            echo "Coverage below 80%"
            exit 1
          fi
```

## Test Data Management

### Fixtures

```typescript
// test/fixtures/users.ts
export const mockUser = {
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  role: Role.USER,
};

export const mockAdmin = {
  id: '456',
  email: 'admin@example.com',
  name: 'Admin User',
  role: Role.MASTER,
};
```

### Factories

```typescript
// test/factories/user.factory.ts
export const createTestUser = async (overrides?: Partial<User>) => {
  return await prisma.user.create({
    data: {
      email: faker.internet.email(),
      password: await hashPassword('Test123!'),
      name: faker.person.fullName(),
      ...overrides,
    },
  });
};
```

## Debugging Tests

```typescript
// Add this to see detailed output
it('should do something', async () => {
  const result = await service.doSomething();
  console.log('Result:', result); // Debug output
  expect(result).toBe(expected);
});

// Run with verbose
pnpm test --verbose

// Run single test
pnpm test --testNamePattern="should register user"
```

## Common Patterns

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  await expect(service.asyncMethod()).resolves.toBe(expected);
  await expect(service.failingMethod()).rejects.toThrow(Error);
});
```

### Testing Exceptions

```typescript
it('should throw error for invalid input', async () => {
  await expect(service.method(invalid)).rejects.toThrow(
    'Invalid input'
  );
});
```

### Testing Guards

```typescript
it('should deny access without token', async () => {
  const context = createMockExecutionContext();
  const canActivate = await guard.canActivate(context);
  expect(canActivate).toBe(false);
});
```

## Performance Testing

```typescript
it('should complete within performance budget', async () => {
  const start = Date.now();
  await service.expensiveOperation();
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(100); // Max 100ms
});
```

## Security Testing

```typescript
describe('Security', () => {
  it('should not expose password in response', async () => {
    const result = await service.register(dto);
    expect(result.user.password).toBeUndefined();
  });

  it('should hash passwords', async () => {
    const user = await service.register({ password: 'plain' });
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser.password).not.toBe('plain');
  });
});
```

## Summary

**Every feature MUST follow:**

1. ✅ Write test first (RED)
2. ✅ Write minimal code to pass (GREEN)
3. ✅ Refactor and improve (REFACTOR)
4. ✅ Achieve 80%+ coverage
5. ✅ All tests pass before PR

**No exceptions. TDD is non-negotiable.**
