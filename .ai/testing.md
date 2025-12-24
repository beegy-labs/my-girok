# Testing Standards

> TDD is MANDATORY: RED → GREEN → REFACTOR

## Coverage Requirements

| Type         | Minimum |
| ------------ | ------- |
| Overall      | 80%     |
| Branches     | 75%     |
| Auth/Payment | 95-100% |

## Test Pyramid

```
    E2E (10%) - Slow, expensive
  Integration (20%) - Database, APIs
Unit (70%) - Fast, isolated
```

## Test Structure (AAA)

```typescript
describe('AuthService.login', () => {
  it('should return tokens for valid credentials', async () => {
    // Arrange
    const dto = { email: 'test@example.com', password: 'Pass123!' };
    await createTestUser(dto.email, dto.password);

    // Act
    const result = await service.login(dto);

    // Assert
    expect(result.accessToken).toBeDefined();
  });
});
```

## File Naming

```
*.spec.ts       # Unit tests
*.e2e-spec.ts   # E2E tests
```

## Jest Config

```javascript
module.exports = {
  maxWorkers: '50%',
  cache: true,
  testTimeout: 10000,
  coverageThreshold: {
    global: { branches: 75, functions: 80, lines: 80, statements: 80 },
  },
};
```

## Mocking

```typescript
// Database
const prisma = new PrismaClient({ datasources: { db: { url: 'file::memory:' } } });

// Service
const mockService = { findById: jest.fn().mockResolvedValue(mockData) };

// HTTP
nock('https://oauth2.googleapis.com').post('/token').reply(200, { access_token: 'mock' });
```

## Commands

```bash
pnpm test           # Run all
pnpm test:watch     # Watch mode
pnpm test:cov       # Coverage
pnpm test:e2e       # E2E tests
```

## Best Practices

| Do                                | Don't                     |
| --------------------------------- | ------------------------- |
| Write tests BEFORE code           | Test after implementation |
| Test behavior, not implementation | Test private methods      |
| Use descriptive names             | Share state between tests |
| Mock external dependencies        | Use real APIs in tests    |
| Clean up after tests              | Write flaky tests         |

---

**Full guide**: `docs/policies/TESTING.md`
