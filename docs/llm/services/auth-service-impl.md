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

## Related Documentation

- **Testing & Coverage**: `auth-service-impl-testing.md`
- Main: `auth-service.md`
- Database: `auth-service-database.md`
