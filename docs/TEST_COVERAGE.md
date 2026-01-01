# Test Coverage Status

> Last updated: 2026-01-02

## Coverage Summary

| Service          | Statements | Branches | Functions | Lines  | Status |
| ---------------- | ---------- | -------- | --------- | ------ | ------ |
| identity-service | 88.48%     | 85%      | 83.18%    | 88.13% | Pass   |
| auth-service     | 98.59%     | 90.26%   | 98.44%    | 98.63% | Pass   |
| legal-service    | 99.71%     | 99.1%    | 100%      | 100%   | Pass   |

## Pending Tests

Files temporarily excluded from coverage that need tests in future sprints.

### auth-service

| File                                                 | Priority | Notes                               |
| ---------------------------------------------------- | -------- | ----------------------------------- |
| `admin/services/law-registry.service.ts`             | Medium   | Law registry CRUD operations        |
| `admin/services/service-config.service.ts`           | Medium   | Service configuration management    |
| `admin/services/service-feature.service.ts`          | Medium   | Feature flag management             |
| `admin/services/service-tester.service.ts`           | Low      | Tester management for beta features |
| `admin/services/audit-log.service.ts`                | Medium   | Audit log query service             |
| `admin/services/admin-audit.service.ts`              | Medium   | Admin audit operations              |
| `admin/services/audit-query.service.ts`              | Medium   | Audit query builder                 |
| `admin/controllers/admin-audit.controller.ts`        | Medium   | Admin audit endpoints               |
| `admin/controllers/audit-query.controller.ts`        | Medium   | Audit query endpoints               |
| `users/controllers/user-personal-info.controller.ts` | Low      | Personal info management            |

### identity-service

| File                                             | Priority | Notes                                   |
| ------------------------------------------------ | -------- | --------------------------------------- |
| `common/interceptors/idempotency.interceptor.ts` | High     | Requires IdempotencyRecord Prisma model |
| `config/configuration.ts`                        | Low      | Configuration loading                   |
| `database/base-prisma.service.ts`                | Low      | Abstract base class                     |

## Excluded by Design

These files are excluded from coverage by design (no testable logic):

- `**/index.ts` - Re-export files
- `**/*.dto.ts` - DTO classes (validation tested via integration)
- `**/*.config.ts` - Static configuration
- `**/decorators/*.ts` - Metadata decorators (tested via guard/interceptor tests)
- `**/main.ts` - Application bootstrap
- `**/*.module.ts` - Module definitions

## Related Issues

- #469 - [auth-service] Test Coverage 80%
- #471 - [identity-service] Test Coverage Expansion
