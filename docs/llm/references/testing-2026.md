# Testing - 2026 Best Practices

> Unit, integration, E2E testing strategies | **Updated**: 2026-01-22

## Test Pyramid (2026)

```
        ╱╲
       ╱  ╲       E2E Tests (5-10%)
      ╱────╲      - Slow, expensive
     ╱      ╲     - Critical user flows only
    ╱────────╲
   ╱          ╲   Integration Tests (15-20%)
  ╱────────────╲  - API contracts
 ╱              ╲ - Database interactions
╱────────────────╲
       ██████      Unit Tests (70-80%)
       ██████      - Fast, isolated
       ██████      - Business logic
```

## Unit Testing

### Characteristics

| Attribute     | Requirement              |
| ------------- | ------------------------ |
| Speed         | Milliseconds             |
| Isolation     | No external dependencies |
| Deterministic | Same result every run    |
| Focused       | Single unit of code      |

### Best Practices

```typescript
// Good: Isolated, fast, deterministic
describe('calculateTotal', () => {
  it('applies discount correctly', () => {
    const result = calculateTotal(100, 0.1);
    expect(result).toBe(90);
  });
});

// Bad: External dependency
describe('UserService', () => {
  it('fetches user', async () => {
    const user = await userService.findById(1); // ❌ Hits real DB
  });
});
```

### Mocking

```typescript
// Jest/Vitest mocking
const mockRepository = {
  findById: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
  save: vi.fn().mockResolvedValue({ id: 1 }),
};

const service = new UserService(mockRepository);
```

## Integration Testing

### Scope

| Test              | Scope                  |
| ----------------- | ---------------------- |
| API contract      | Request/Response shape |
| Database          | CRUD operations        |
| Cache             | Redis interactions     |
| External services | Mock boundaries        |

### Strategy Selection

| Approach  | Pros                  | Cons                         |
| --------- | --------------------- | ---------------------------- |
| Big Bang  | Simple setup          | Hard to isolate failures     |
| Bottom-up | Early issue detection | Needs stubs for upper layers |
| Top-down  | User flow validation  | Needs stubs for lower layers |
| Hybrid    | Balanced              | More complex                 |

### Database Testing

```typescript
// Use test containers or in-memory DB
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

## E2E Testing

### When to Use

- Critical user journeys (checkout, auth)
- Smoke tests after deployment
- Regression prevention for UI

### Tools (2026)

| Tool       | Best For              |
| ---------- | --------------------- |
| Playwright | Cross-browser, modern |
| Cypress    | Developer experience  |
| Puppeteer  | Chrome-specific       |

## Coverage Guidelines

| Type        | Target         | Rationale        |
| ----------- | -------------- | ---------------- |
| Unit        | 80%+           | Catch logic bugs |
| Integration | 60%+           | API contracts    |
| E2E         | Critical paths | Cost vs value    |

### What to Cover

```
✅ Business logic
✅ Edge cases
✅ Error handling
✅ Public APIs

❌ Third-party code
❌ Trivial getters/setters
❌ Framework internals
```

## Testing Tools (2026)

| Stack      | Unit         | Integration    | E2E        |
| ---------- | ------------ | -------------- | ---------- |
| JavaScript | Jest, Vitest | Supertest      | Playwright |
| Python     | Pytest       | Pytest         | Playwright |
| Java       | JUnit        | TestContainers | Selenium   |
| Go         | testing      | testify        | Playwright |

### Vitest Configuration

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
# GitHub Actions
- name: Test
  run: |
    pnpm test:unit --coverage
    pnpm test:integration

- name: Coverage Gate
  run: |
    if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then
      exit 1
    fi
```

## Anti-Patterns

| Don't                              | Do                 |
| ---------------------------------- | ------------------ |
| Test implementation details        | Test behavior      |
| Time-dependent tests               | Mock dates/timers  |
| Shared mutable state               | Isolated test data |
| Test business logic in integration | Use unit tests     |
| Skip error cases                   | Test failure paths |

## Sources

- [Integration Testing Best Practices 2026](https://research.aimultiple.com/integration-testing-best-practices/)
- [Unit Testing Best Practices - IBM](https://www.ibm.com/think/insights/unit-testing-best-practices)
- [Software Testing Best Practices 2026](https://bugbug.io/blog/test-automation/software-testing-best-practices/)
- [Microsoft Testing Playbook](https://microsoft.github.io/code-with-engineering-playbook/automated-testing/integration-testing/)
