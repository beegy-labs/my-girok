# Test Coverage Status

> Last updated: 2025-01-02

## Coverage Requirements

| Metric     | Minimum | Enforcement       |
| ---------- | ------- | ----------------- |
| Statements | 80%     | CI blocks on fail |
| Branches   | 70%     | Warning only      |
| Functions  | 80%     | CI blocks on fail |
| Lines      | 80%     | CI blocks on fail |

## Current Coverage

| Service          | Statements | Branches | Functions | Lines  | Tests | Status |
| ---------------- | ---------- | -------- | --------- | ------ | ----- | ------ |
| auth-service     | 89.76%     | 81.68%   | 90.81%    | 89.63% | 967   | Pass   |
| legal-service    | 98.58%     | 97.36%   | 98.30%    | 98.78% | 186   | Pass   |
| identity-service | 81.00%     | 75.00%   | 83.00%    | 81.00% | 655   | Pass   |

## Pending Tests

### auth-service

| File                                     | Priority |
| ---------------------------------------- | -------- |
| grpc/auth.grpc.controller.ts             | High     |
| admin/services/law-registry.service.ts   | Medium   |
| admin/services/service-config.service.ts | Medium   |

### identity-service

| File                                           | Priority |
| ---------------------------------------------- | -------- |
| common/interceptors/idempotency.interceptor.ts | High     |

## Excluded by Design

| Pattern           | Reason                   |
| ----------------- | ------------------------ |
| `**/index.ts`     | Re-export files only     |
| `**/*.dto.ts`     | Data transfer objects    |
| `**/*.config.ts`  | Static configuration     |
| `**/decorators/*` | Metadata-only decorators |
| `**/main.ts`      | Bootstrap code           |
| `**/*.module.ts`  | Module definitions       |

## Running Tests

```bash
# Run tests with coverage for a specific service
pnpm --filter @my-girok/auth-service test:cov

# Run all tests with coverage
pnpm test:cov

# Watch mode for development
pnpm --filter @my-girok/auth-service test:watch
```

## CI Configuration

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80
  }
}
```

## Best Practices

1. Write tests alongside feature development
2. Cover edge cases and error paths
3. Use meaningful test descriptions
4. Mock external dependencies
5. Keep tests isolated and independent

---

**LLM Reference**: `docs/llm/TEST_COVERAGE.md`
