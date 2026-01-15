# Testing

> TDD methodology with test pyramid and coverage requirements

## Test-Driven Development

Follow the RED -> GREEN -> REFACTOR cycle:

1. **RED**: Write a failing test that defines the expected behavior
2. **GREEN**: Write the minimum code to make the test pass
3. **REFACTOR**: Clean up the code while keeping tests green

## Coverage Requirements

| Type         | Minimum |
| ------------ | ------- |
| Overall      | 80%     |
| Branches     | 75%     |
| Auth/Payment | 95%     |

Critical paths like authentication and payment processing require 95% coverage due to their security and business importance.

## Test Pyramid

```
    E2E (10%)
  Integration (20%)
Unit (70%)
```

The test pyramid guides the distribution of test types:

- **Unit (70%)**: Fast, isolated tests for individual functions and components
- **Integration (20%)**: Tests that verify multiple components work together
- **E2E (10%)**: Full system tests that simulate user workflows

## Commands

```bash
pnpm test           # Run all
pnpm test:watch     # Watch mode
pnpm test:cov       # Coverage
pnpm test:e2e       # E2E tests
```

## File Naming Conventions

```
*.spec.ts       # Unit tests
*.e2e-spec.ts   # E2E tests
```

Place test files adjacent to the code they test. This makes it easy to find and maintain tests.

## Testing Rules

| Do                      | Don't               |
| ----------------------- | ------------------- |
| Write tests BEFORE code | Test after          |
| Test behavior           | Test implementation |
| Mock external deps      | Use real APIs       |
| Clean up after tests    | Share state         |

### Best Practices

- **Write tests BEFORE code**: Following TDD ensures testable design and complete coverage
- **Test behavior**: Tests should verify what the code does, not how it does it
- **Mock external dependencies**: Use mocks for databases, APIs, and services to ensure fast, reliable tests
- **Clean up after tests**: Each test should start with a clean state and not affect other tests

---

**LLM Reference**: `docs/llm/testing.md`
