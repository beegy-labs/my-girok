# Auth Service Implementation Guide

> Service architecture, method references, and performance optimization for auth-service.

## Overview

This document covers the implementation details of the auth-service, including service classes, their methods, and performance optimization techniques used throughout the codebase.

---

## AdminProfileService

Handles admin profile management with support for 83 profile fields.

**Location:** `src/admin/services/admin-profile.service.ts`

### Methods

| Method                     | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `getAdminDetail`           | Fetch profile with all relations                            |
| `mapAdminToDetailResponse` | Public mapper for response transformation (reusable)        |
| `updateScimCore`           | Update SCIM attributes (includes username uniqueness check) |
| `updateEmployeeInfo`       | Update employee information                                 |
| `updateJobOrganization`    | Update job and organization details                         |
| `updatePartnerInfo`        | Update partner information                                  |
| `updateJoinerInfo`         | Update joiner (onboarding) attributes                       |
| `updateMoverInfo`          | Update mover (transfer) attributes                          |
| `updateLeaverInfo`         | Update leaver (offboarding) attributes                      |
| `updateContactInfo`        | Update contact information                                  |
| `updateProfile`            | Bulk update multiple sections (single transaction)          |

### Optimization Techniques

- Single query with relations (no post-UPDATE SELECT)
- Direct mapping via `mapAdminToDetailResponse`
- Bulk updates use `Object.assign` (1 query)

---

## AdminEnterpriseService

Enterprise-level admin management including Non-Human Identities (NHI).

**Location:** `src/admin/services/admin-enterprise.service.ts`

### Methods

| Method                       | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `createNhi`                  | Create NHI (validates owner, prevents HUMAN type) |
| `updateNhiAttributes`        | Update NHI-specific attributes                    |
| `rotateNhiCredentials`       | Update lastCredentialRotation timestamp           |
| `updatePhysicalLocation`     | Update physical location details                  |
| `updateTaxLegalLocation`     | Update tax/legal location information             |
| `updateAccessControl`        | Update security clearance and access controls     |
| `updateIdentityVerification` | Update verification status                        |
| `verifyIdentity`             | Perform identity verification with audit trail    |
| `updateExtensions`           | Update JSONB extension fields                     |
| `updateEnterprise`           | Bulk update enterprise attributes                 |
| `listAdmins`                 | Paginated search with filters                     |

### Optimization Techniques

- `listAdmins` uses `$transaction` (2 queries: findMany + count)
- All updates include relations in single query

---

## Organization Services (7 Services)

**Location:** `src/organization/services/`

| Service                 | Key Features                                  |
| ----------------------- | --------------------------------------------- |
| `JobGradeService`       | Code uniqueness, jobFamily/track filter       |
| `OrgUnitService`        | Tree structure (buildTree), parent validation |
| `LegalEntityService`    | Code uniqueness, countryCode filter           |
| `OfficeService`         | LegalEntity validation, findBuildings         |
| `BuildingService`       | Office validation, findFloors                 |
| `FloorService`          | Building validation, floorNumber sort         |
| `PartnerCompanyService` | Code uniqueness, findAgreements               |

### Common Patterns

- Snake_case in database, camelCase in DTOs
- Private `mapToResponse` method for transformation
- Code uniqueness check throws `ConflictException`
- `findOne` throws `NotFoundException` when not found

---

## Attendance & Leave Services

### AttendanceService

**Methods:** clockIn, clockOut, approveOvertime, getByDate, list, getStats

**Features:**

- Conflict detection for overlapping records
- Auto work minutes calculation
- Overtime tracking
- IP/location logging

### WorkScheduleService

**Methods:** create, findByAdmin, findActiveByAdmin, update, remove

**Features:**

- Auto-deactivate previous schedule
- Support for Standard, Shift, and Flexible types

### LeaveService

**Methods:** create, submit, approve, cancel, list, getPendingApprovals

**Features:**

- Overlap detection
- Multi-level approval workflow
- Balance deduction on approval

### LeaveBalanceService

**Methods:** create, getBalance, adjust, recalculate, initializeForNewYear

**Features:**

- Carryover support (max 5 days)
- Tenure bonus calculation (3/5/10 years)

---

## Phase 4-5 Services

### Phase 4 Services

| Service                      | Description                             |
| ---------------------------- | --------------------------------------- |
| `DelegationService`          | CRUD + approval + logging + constraints |
| `AttestationService`         | Lifecycle + recurrence + signatures     |
| `CertificationService`       | Verification + renewal workflow         |
| `TrainingService`            | Assignment + completion + scoring       |
| `GlobalAssignmentService`    | Lifecycle + compensation + dependents   |
| `WorkAuthorizationService`   | Visa + expiry alerts (90 days advance)  |
| `CountryConfigService`       | Read-heavy service (12 countries)       |
| `OrganizationHistoryService` | Org changes + approval workflow         |

### Phase 5 Services (Employee Self-Service)

| Service                     | Description                               |
| --------------------------- | ----------------------------------------- |
| `EmployeeProfileService`    | Wraps AdminProfileService, limited fields |
| `EmployeeAttendanceService` | Wraps AttendanceService, own data only    |
| `EmployeeLeaveService`      | Wraps Leave services, own data only       |
| `EmployeeDelegationService` | Read-only, delegations received           |
| `EmployeeAuthGuard`         | JWT sub claim enforcement                 |

---

## Performance Optimization

### Query Reduction Summary

| Operation            | Before                         | After                         | Reduction |
| -------------------- | ------------------------------ | ----------------------------- | --------- |
| listAdmins(20)       | 21 queries (1 + 20x getDetail) | 2 queries (findMany + count)  | 91%       |
| updateScimCore       | 2 queries (UPDATE + SELECT)    | 1 query (UPDATE with include) | 50%       |
| updateProfile(3 sec) | 4 queries (3 UPDATEs + SELECT) | 1 query (merged UPDATE)       | 75%       |

### Key Techniques

1. **N+1 Elimination**: Batch loading with relations instead of individual queries
2. **Single UPDATE with Include**: Prisma's ability to return updated record with relations
3. **Bulk Updates**: Using `Object.assign` to merge multiple updates into single query

---

## Related Documentation

- **Testing & Coverage**: `auth-service-impl-testing.md`
- **Main Documentation**: `auth-service.md`
- **Database Schema**: `auth-service-database.md`

---

_This document is auto-generated from `docs/llm/services/auth-service-impl.md`_
