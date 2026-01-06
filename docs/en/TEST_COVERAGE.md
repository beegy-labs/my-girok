# Test Coverage Status

> Last updated: 2025-01-02

## Coverage Requirements

| Metric     | Minimum | Enforcement       |
| ---------- | ------- | ----------------- |
| Statements | **80%** | CI blocks on fail |
| Branches   | 70%     | Warning only      |
| Functions  | 80%     | CI blocks on fail |
| Lines      | **80%** | CI blocks on fail |

## Current Coverage

| Service          | Statements | Branches | Functions | Lines  | Tests | Status |
| ---------------- | ---------- | -------- | --------- | ------ | ----- | ------ |
| auth-service     | 89.76%     | 81.68%   | 90.81%    | 89.63% | 967   | Pass   |
| legal-service    | 98.58%     | 97.36%   | 98.30%    | 98.78% | 186   | Pass   |
| identity-service | 81.00%     | 75.00%   | 83.00%    | 81.00% | 655   | Pass   |

## gRPC Controller Tests

All services with gRPC endpoints must have corresponding `*.grpc.controller.spec.ts` tests.

| Service          | gRPC Test File                      | Tests | Status |
| ---------------- | ----------------------------------- | ----- | ------ |
| auth-service     | `auth.grpc.controller.spec.ts`      | -     | TODO   |
| legal-service    | `legal.grpc.controller.spec.ts`     | 39    | Done   |
| identity-service | Covered in service/controller tests | -     | Done   |

### gRPC Test Requirements

```typescript
// Mock gRPC client for consumer services
let mockIdentityClient: {
  getAccount: jest.Mock;
  getProfile: jest.Mock;
  // ... other methods
};

// Test RpcException handling
it('should wrap errors in RpcException', async () => {
  mockService.method.mockRejectedValue(new Error('DB error'));
  await expect(controller.grpcMethod(request)).rejects.toThrow(RpcException);
});

// Test proto message conversion
it('should convert Date to proto timestamp', async () => {
  const result = await controller.getEntity({ id: '123' });
  expect(result.created_at?.seconds).toBeGreaterThan(0);
});
```

## Pending Tests

Files temporarily excluded from coverage that need tests in future sprints.

### auth-service

| File                                       | Priority | Notes                   |
| ------------------------------------------ | -------- | ----------------------- |
| `grpc/auth.grpc.controller.ts`             | High     | gRPC endpoint tests     |
| `admin/services/law-registry.service.ts`   | Medium   | Law registry CRUD       |
| `admin/services/service-config.service.ts` | Medium   | Service configuration   |
| `admin/services/audit-log.service.ts`      | Medium   | Audit log query service |

### identity-service

| File                                             | Priority | Notes                                   |
| ------------------------------------------------ | -------- | --------------------------------------- |
| `common/interceptors/idempotency.interceptor.ts` | High     | Requires IdempotencyRecord Prisma model |

### legal-service

All critical files covered. No pending tests.

## Excluded by Design

These files are excluded from coverage (no testable logic):

| Pattern           | Reason                                   |
| ----------------- | ---------------------------------------- |
| `**/index.ts`     | Re-export files                          |
| `**/*.dto.ts`     | DTO classes (validation via integration) |
| `**/*.config.ts`  | Static configuration                     |
| `**/decorators/*` | Metadata decorators (tested via guards)  |
| `**/main.ts`      | Application bootstrap                    |
| `**/*.module.ts`  | Module definitions                       |

## Running Tests

```bash
# Single service
pnpm --filter @my-girok/auth-service test:cov

# All services
pnpm test:cov

# Watch mode
pnpm --filter @my-girok/auth-service test:watch
```

## CI Configuration

Each service CI workflow includes:

```yaml
- run: cd services/<service-name> && pnpm test & pnpm lint & wait
```

Coverage thresholds in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80,
  },
},
```

## Related Issues

- #469 - [auth-service] Test Coverage 80%
- #470 - [legal-service] Test Coverage Expansion
- #471 - [identity-service] Test Coverage Expansion
