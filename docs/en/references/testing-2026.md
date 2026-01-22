# Testing Best Practices - 2026

This guide covers testing strategies and best practices as of 2026, including the test pyramid, unit testing, integration testing, and end-to-end testing approaches.

## The Test Pyramid (2026)

The test pyramid remains the foundation of effective testing strategy:

```
        /\
       /  \       E2E Tests (5-10%)
      /----\      Critical user flows only
     /      \
    /--------\    Integration Tests (15-20%)
   /          \   API contracts, database
  /------------\
 /              \ Unit Tests (70-80%)
/----------------\ Fast, isolated, business logic
```

## Unit Testing

### Key Characteristics

| Attribute     | Requirement              |
| ------------- | ------------------------ |
| Speed         | Milliseconds             |
| Isolation     | No external dependencies |
| Deterministic | Same result every run    |
| Focused       | Single unit of code      |

### Best Practices

**Good unit test (isolated, fast, deterministic):**

```typescript
describe('calculateTotal', () => {
  it('applies discount correctly', () => {
    const result = calculateTotal(100, 0.1);
    expect(result).toBe(90);
  });
});
```

**Bad unit test (external dependency):**

```typescript
describe('UserService', () => {
  it('fetches user', async () => {
    // This hits a real database - not a unit test
    const user = await userService.findById(1);
  });
});
```

### Effective Mocking

```typescript
// Jest/Vitest mocking pattern
const mockRepository = {
  findById: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
  save: vi.fn().mockResolvedValue({ id: 1 }),
};

const service = new UserService(mockRepository);
```

## Integration Testing

### Scope Definition

| Test Type         | Scope                              |
| ----------------- | ---------------------------------- |
| API contract      | Request/Response shape validation  |
| Database          | CRUD operations with real database |
| Cache             | Redis/Valkey interactions          |
| External services | Mock at boundaries                 |

### Strategy Selection

| Approach  | Pros                  | Cons                         |
| --------- | --------------------- | ---------------------------- |
| Big Bang  | Simple setup          | Hard to isolate failures     |
| Bottom-up | Early issue detection | Needs stubs for upper layers |
| Top-down  | User flow validation  | Needs stubs for lower layers |
| Hybrid    | Balanced approach     | More complex setup           |

### Database Testing Pattern

```typescript
beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterEach(async () => {
  await testDb.cleanup(); // Reset state between tests
});

afterAll(async () => {
  await testDb.close();
});
```

## End-to-End Testing

### When to Use E2E Tests

- Critical user journeys (checkout, authentication)
- Smoke tests after deployment
- Regression prevention for UI changes

### Tool Selection (2026)

| Tool       | Best For                               |
| ---------- | -------------------------------------- |
| Playwright | Cross-browser testing, modern features |
| Cypress    | Developer experience, debugging        |
| Puppeteer  | Chrome-specific automation             |

## Coverage Guidelines

### Coverage Targets

| Type        | Target         | Rationale              |
| ----------- | -------------- | ---------------------- |
| Unit        | 80%+           | Catch logic bugs early |
| Integration | 60%+           | Verify API contracts   |
| E2E         | Critical paths | Balance cost vs value  |

### What to Cover vs Skip

**Do Cover:**

- Business logic
- Edge cases
- Error handling
- Public APIs

**Don't Cover:**

- Third-party code
- Trivial getters/setters
- Framework internals

## Testing Tools by Stack (2026)

| Stack                 | Unit         | Integration    | E2E        |
| --------------------- | ------------ | -------------- | ---------- |
| JavaScript/TypeScript | Jest, Vitest | Supertest      | Playwright |
| Python                | Pytest       | Pytest         | Playwright |
| Java                  | JUnit        | TestContainers | Selenium   |
| Go                    | testing      | testify        | Playwright |

### Vitest Configuration Example

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80 },
    },
  },
});
```

## CI Integration

```yaml
# GitHub Actions example
- name: Run Tests
  run: |
    pnpm test:unit --coverage
    pnpm test:integration

- name: Coverage Gate
  run: |
    if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then
      exit 1
    fi
```

## Anti-Patterns to Avoid

| Don't                              | Do                 | Why                   |
| ---------------------------------- | ------------------ | --------------------- |
| Test implementation details        | Test behavior      | Allows refactoring    |
| Time-dependent tests               | Mock dates/timers  | Deterministic results |
| Shared mutable state               | Isolated test data | Prevents flaky tests  |
| Test business logic in integration | Use unit tests     | Faster feedback       |
| Skip error cases                   | Test failure paths | Complete coverage     |

## Sources

- [Integration Testing Best Practices 2026](https://research.aimultiple.com/integration-testing-best-practices/)
- [Unit Testing Best Practices - IBM](https://www.ibm.com/think/insights/unit-testing-best-practices)
- [Software Testing Best Practices 2026](https://bugbug.io/blog/test-automation/software-testing-best-practices/)
- [Microsoft Testing Playbook](https://microsoft.github.io/code-with-engineering-playbook/automated-testing/integration-testing/)

---

_Last Updated: 2026-01-22_
