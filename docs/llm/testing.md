# Testing

TDD: RED -> GREEN -> REFACTOR

## Coverage

| Type         | Minimum |
| ------------ | ------- |
| Overall      | 80%     |
| Branches     | 75%     |
| Auth/Payment | 95%     |

## Test Pyramid

```
    E2E (10%)
  Integration (20%)
Unit (70%)
```

## Commands

```bash
pnpm test           # Run all
pnpm test:watch     # Watch mode
pnpm test:cov       # Coverage
pnpm test:e2e       # E2E tests
```

## File Naming

```
*.spec.ts       # Unit tests
*.e2e-spec.ts   # E2E tests
```

## Rules

| Do                      | Don't               |
| ----------------------- | ------------------- |
| Write tests BEFORE code | Test after          |
| Test behavior           | Test implementation |
| Mock external deps      | Use real APIs       |
| Clean up after tests    | Share state         |
