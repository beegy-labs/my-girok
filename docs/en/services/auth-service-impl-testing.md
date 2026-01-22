# Auth Service Implementation - Testing Guide

> Test coverage, implementation structure, and response schemas for auth-service.

## Overview

This document covers the testing strategy, coverage metrics, and implementation file structure for the auth-service.

---

## Testing Coverage Summary

```yaml
total_tests: 1359+
total_suites: 50+
coverage_target: 80%
status: 100% passing
```

### Module Coverage

| Module                | Tests | Coverage |
| --------------------- | ----- | -------- |
| Admin Profile         | 11    | 80%+     |
| Admin Enterprise      | 15    | 80%+     |
| Organization          | 73    | 84.22%   |
| Attendance            | 63    | 80%+     |
| Leave                 | 66    | 80%+     |
| Delegation            | 18    | 80%+     |
| Compliance            | 22    | 80%+     |
| Global Mobility       | 17    | 80%+     |
| Country Config        | 9     | 80%+     |
| Org History           | 11    | 80%+     |
| Employee Self-Service | 30    | 100%     |

---

## Test Categories

Each module includes tests for the following categories:

1. **Service initialization** - Verify service can be instantiated correctly
2. **CRUD operations** - Create, read, update, delete functionality
3. **Code uniqueness** - Tests that throw `ConflictException` for duplicates
4. **FK validation** - Tests that throw `NotFoundException` for invalid references
5. **Hierarchical operations** - Tree structure tests (for org units)
6. **Relationship queries** - Tests for fetching related entities
7. **Filter/query validation** - Tests for search and filter functionality
8. **Error handling** - Edge cases and error scenarios

---

## Mock Strategy

The test suite uses the following mocking approach:

```yaml
mocks:
  - PrismaService (all DB operations)
  - AdminProfileService (cross-service dependencies)
  - All organization entity tables
framework: Vitest
```

### Example Mock Setup

```typescript
const mockPrismaService = {
  admin: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
};
```

---

## Implementation Files

### Admin Module

```yaml
controllers:
  - admin-profile.controller.ts (10 endpoints)
  - admin-enterprise.controller.ts (11 endpoints)

services:
  - admin-profile.service.ts
  - admin-enterprise.service.ts

tests:
  - admin-profile.service.spec.ts (11 tests)
  - admin-enterprise.service.spec.ts (15 tests)
```

### Organization Module

```yaml
module: organization.module.ts

controllers: 41 endpoints total

services:
  - job-grade.service.ts
  - org-unit.service.ts
  - legal-entity.service.ts
  - office.service.ts
  - building.service.ts
  - floor.service.ts
  - partner-company.service.ts

tests: 73 tests total
```

### Phase 4-5 Modules

```yaml
phase4_modules:
  - delegation
  - compliance
  - global-mobility
  - country-config
  - org-history

phase4_tests: 77 tests

phase5_module: employee.module.ts
  - profile
  - attendance
  - leave
  - delegation

phase5_tests: 30 tests
phase5_endpoints: 17
```

---

## Shared Types

**Location:** `packages/types/src/admin/`

### Files

| File             | Content                     |
| ---------------- | --------------------------- |
| `admin.enums.ts` | 11 enum types               |
| `admin.types.ts` | Admin interface (83 fields) |

---

## AdminDetailResponse Structure

The response schema for admin detail endpoints:

### Core Fields

```yaml
- id
- email
- name
- scope
- tenantId
- roleId
- isActive
- lastLoginAt
```

### SCIM Fields

```yaml
- username
- externalId
- displayName
- givenName
- familyName
- locale
- timezone
```

### Employee Fields

```yaml
- employeeNumber
- employeeType
- employmentStatus
- lifecycleStatus
```

### Job/Organization Fields

```yaml
- jobGradeId
- jobTitle
- organizationUnitId
- managerAdminId
- costCenter
```

### Partner Fields

```yaml
- partnerCompanyId
- partnerEmployeeId
- partnerContractEndDate
```

### JML Joiner Fields

```yaml
- hireDate
- startDate
- onboardingCompletedAt
- probationStatus
```

### JML Mover Fields

```yaml
- lastRoleChangeAt
- lastPromotionDate
- lastTransferDate
```

### JML Leaver Fields

```yaml
- terminationDate
- lastWorkingDay
- terminationReason
- eligibleForRehire
```

### Contact Fields

```yaml
- phoneNumber
- mobileNumber
- workPhone
- emergencyContact
```

### Relations

```yaml
- role
- tenant
- manager
```

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:cov

# Run specific module tests
pnpm test -- --grep "AdminProfileService"

# Run in watch mode
pnpm test:watch
```

---

## Related Documentation

- **Main Implementation**: `auth-service-impl.md`
- **Service Documentation**: `auth-service.md`
- **Database Schema**: `auth-service-database.md`

---

_This document is auto-generated from `docs/llm/services/auth-service-impl-testing.md`_
