# auth-service Implementation

> Services, performance, and testing for auth-service

## AdminProfileService

```yaml
location: src/admin/services/admin-profile.service.ts
methods:
  - getAdminDetail(adminId): Fetch profile with relations
  - mapAdminToDetailResponse(admin): Public mapper (reusable)
  - updateScimCore(adminId, dto): SCIM update (username uniqueness check)
  - updateEmployeeInfo(adminId, dto)
  - updateJobOrganization(adminId, dto)
  - updatePartnerInfo(adminId, dto)
  - updateJoinerInfo(adminId, dto)
  - updateMoverInfo(adminId, dto)
  - updateLeaverInfo(adminId, dto)
  - updateContactInfo(adminId, dto)
  - updateProfile(adminId, dto): Bulk update (single transaction)
optimization:
  - Single query with relations (no post-UPDATE SELECT)
  - Direct mapping via mapAdminToDetailResponse
  - Bulk updates use Object.assign (1 query)
```

## AdminEnterpriseService

```yaml
location: src/admin/services/admin-enterprise.service.ts
methods:
  - createNhi(dto, createdBy): Create NHI (validates owner, prevents HUMAN)
  - updateNhiAttributes(adminId, dto)
  - rotateNhiCredentials(adminId): Update lastCredentialRotation
  - updatePhysicalLocation(adminId, dto)
  - updateTaxLegalLocation(adminId, dto)
  - updateAccessControl(adminId, dto)
  - updateIdentityVerification(adminId, dto)
  - verifyIdentity(adminId, dto, verifiedBy): Audit trail in metadata
  - updateExtensions(adminId, dto): JSONB fields
  - updateEnterprise(adminId, dto): Bulk update
  - listAdmins(query): Paginated search with filters
optimization:
  - listAdmins uses $transaction (2 queries: findMany + count)
  - All updates include relations in single query
```

## Organization Services (7)

```yaml
location: src/organization/services/
services:
  - JobGradeService: code uniqueness, jobFamily/track filter
  - OrgUnitService: tree structure (buildTree), parent validation
  - LegalEntityService: code uniqueness, countryCode filter
  - OfficeService: legalEntity validation, findBuildings
  - BuildingService: office validation, findFloors
  - FloorService: building validation, floorNumber sort
  - PartnerCompanyService: code uniqueness, findAgreements
common_patterns:
  - Snake_case DB, camelCase DTOs
  - Private mapToResponse method
  - Code uniqueness check (ConflictException)
  - findOne throws NotFoundException
```

## Attendance & Leave Services

```yaml
AttendanceService:
  methods: [clockIn, clockOut, approveOvertime, getByDate, list, getStats]
  features: Conflict detection, auto work minutes, overtime, IP/location logging
WorkScheduleService:
  methods: [create, findByAdmin, findActiveByAdmin, update, remove]
  features: Auto-deactivate previous, Standard/Shift/Flexible types
LeaveService:
  methods: [create, submit, approve, cancel, list, getPendingApprovals]
  features: Overlap detection, multi-level approval, balance deduction
LeaveBalanceService:
  methods: [create, getBalance, adjust, recalculate, initializeForNewYear]
  features: Carryover (max 5 days), tenure bonus (3/5/10 years)
```

## Phase 4-5 Services

```yaml
Phase4:
  - DelegationService: CRUD + approval + logging + constraints
  - AttestationService: Lifecycle + recurrence + signatures
  - CertificationService: Verification + renewal
  - TrainingService: Assignment + completion + scoring
  - GlobalAssignmentService: Lifecycle + compensation + dependents
  - WorkAuthorizationService: Visa + expiry alerts (90 days)
  - CountryConfigService: Read-heavy (12 countries)
  - OrganizationHistoryService: Org changes + approval
Phase5:
  - EmployeeProfileService: Wraps AdminProfileService, limited fields
  - EmployeeAttendanceService: Wraps AttendanceService, own data only
  - EmployeeLeaveService: Wraps Leave services, own data only
  - EmployeeDelegationService: Read-only, delegations received
  - EmployeeAuthGuard: JWT sub claim enforcement
```

## Performance Optimization

| Operation            | Before                         | After                         | Reduction |
| -------------------- | ------------------------------ | ----------------------------- | --------- |
| listAdmins(20)       | 21 queries (1 + 20×getDetail)  | 2 queries (findMany + count)  | 91%       |
| updateScimCore       | 2 queries (UPDATE + SELECT)    | 1 query (UPDATE with include) | 50%       |
| updateProfile(3 sec) | 4 queries (3 UPDATEs + SELECT) | 1 query (merged UPDATE)       | 75%       |

**Techniques**: N+1 elimination, single UPDATE with include, bulk updates via Object.assign

## Testing

### Coverage Summary

```yaml
total_tests: 1359+
total_suites: 50+
coverage_target: 80%
status: 100% passing

modules:
  admin_profile: 11 tests
  admin_enterprise: 15 tests
  organization: 73 tests (84.22%)
  attendance: 63 tests (80%+)
  leave: 66 tests (80%+)
  delegation: 18 tests (80%+)
  compliance: 22 tests (80%+)
  global_mobility: 17 tests (80%+)
  country_config: 9 tests (80%+)
  org_history: 11 tests (80%+)
  employee_self_service: 30 tests (100%)
```

### Test Categories

- Service initialization
- CRUD operations
- Code uniqueness (ConflictException)
- FK validation (NotFoundException)
- Hierarchical operations (tree)
- Relationship queries
- Filter/query validation
- Error handling

### Mock Strategy

```yaml
mocks:
  - PrismaService (all DB ops)
  - AdminProfileService (cross-service)
  - All organization entity tables
framework: Vitest
```

## Implementation Files

### Admin Module

```yaml
controllers: [admin-profile (10), admin-enterprise (11)]
services: [admin-profile.service.ts, admin-enterprise.service.ts]
tests: [admin-profile.spec (11), admin-enterprise.spec (15)]
```

### Organization Module

```yaml
module: organization.module.ts
controllers: 41 endpoints total
services: [job-grade, org-unit, legal-entity, office, building, floor, partner-company]
tests: 73 tests total
```

### Phase 4-5 Modules

```yaml
phase4: [delegation, compliance, global-mobility, country-config, org-history]
phase4_tests: 77 tests
phase5: employee.module.ts (profile, attendance, leave, delegation)
phase5_tests: 30 tests
phase5_endpoints: 17
```

### Shared Types

```yaml
location: packages/types/src/admin/
files:
  - admin.enums.ts (11 enums)
  - admin.types.ts (Admin interface, 83 fields)
```

## AdminDetailResponse Structure

```yaml
core: [id, email, name, scope, tenantId, roleId, isActive, lastLoginAt]
scim: [username, externalId, displayName, givenName, familyName, locale, timezone]
employee: [employeeNumber, employeeType, employmentStatus, lifecycleStatus]
job_org: [jobGradeId, jobTitle, organizationUnitId, managerAdminId, costCenter]
partner: [partnerCompanyId, partnerEmployeeId, partnerContractEndDate]
jml_joiner: [hireDate, startDate, onboardingCompletedAt, probationStatus]
jml_mover: [lastRoleChangeAt, lastPromotionDate, lastTransferDate]
jml_leaver: [terminationDate, lastWorkingDay, terminationReason, eligibleForRehire]
contact: [phoneNumber, mobileNumber, workPhone, emergencyContact]
relations: [role, tenant, manager]
```

---

_Related: `auth-service.md` | `auth-service-database.md` | `auth-service-api.md`_
