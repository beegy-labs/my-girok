# auth-service

```yaml
port: 3002
grpc: 50052
db: girok_auth (PostgreSQL)
cache: Valkey DB 2
events: auth.* (Redpanda)
codebase: services/auth-service/
```

## Core Concepts

| Concept                | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| **Admin Auth**         | Login, bcrypt hashing, MFA (TOTP), JWT sessions             |
| **Session Management** | Issue/validate/revoke sessions, support "revoke all"        |
| **Legal Consent**      | Track admin consent for ToS, Privacy Policy                 |
| **SCIM 2.0**           | `admins` table compatible with SCIM Core/Enterprise schemas |
| **JML**                | Joiner-Mover-Leaver lifecycle tracking                      |
| **NHI**                | Non-Human Identity (service accounts, API clients)          |

## Database Schema

### admins Table (83 fields)

| Field Group         | Key Fields                                                                              | Purpose                      |
| ------------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| **Primary Info**    | id, email, password, name, is_active                                                    | Core authentication          |
| **SCIM Core**       | username, externalId, displayName, givenName, familyName                                | Standard identity attributes |
| **Employee Info**   | employeeNumber, employeeType, employmentStatus, lifecycleStatus                         | HR data (SCIM Enterprise)    |
| **JML Lifecycle**   | hireDate, terminationDate, lastPromotionDate, probationStatus                           | Employee lifecycle dates     |
| **Job & Org**       | jobTitle, jobGradeId, organizationUnitId, managerAdminId, costCenter                    | Company hierarchy            |
| **NHI**             | identityType, ownerAdminId, serviceAccountType, credentialType, secretRotationDays      | Bot/service identity         |
| **Location**        | primaryOfficeId, buildingId, floorId, deskCode, remoteWorkType                          | Physical location            |
| **Tax/Legal**       | workCountryCode, taxResidenceCountry, payrollCountryCode, legalCountryCode              | Tax/legal tracking           |
| **Access Control**  | securityClearance, dataAccessLevel, allowedIpRanges, accessEndDate                      | Security attributes          |
| **Verification**    | identityVerified, verificationMethod, verificationLevel, backgroundCheckStatus          | KYC/AML status               |
| **JSON Extensions** | skills, certifications, education, workHistory, customAttributes, preferences, metadata | Flexible JSONB storage       |

**Migration**: `20260116000006_extend_admins_phase2_core.sql`

- Foreign key constraints removed (TEXT/UUID mismatch)
- Referential integrity enforced at application level

### Additional Tables

| Table                        | Purpose                   | Relations                                             |
| ---------------------------- | ------------------------- | ----------------------------------------------------- |
| `admin_attendances`          | Clock in/out records      | admin_id → admins                                     |
| `admin_work_schedules`       | Work schedule configs     | admin_id → admins                                     |
| `admin_leaves`               | Leave requests            | admin_id → admins                                     |
| `admin_leave_balances`       | Annual leave tracking     | admin_id → admins                                     |
| `admin_delegations`          | Authority delegation      | delegator_id, delegate_id → admins                    |
| `admin_delegation_logs`      | Delegation audit trail    | delegation_id → admin_delegations                     |
| `admin_attestations`         | Compliance attestations   | admin_id → admins                                     |
| `admin_certifications`       | Professional certs        | admin_id → admins                                     |
| `admin_training_records`     | Training completion       | admin_id → admins                                     |
| `global_assignments`         | International assignments | admin_id → admins                                     |
| `work_authorizations`        | Visas/work permits        | admin_id → admins, assignment_id → global_assignments |
| `country_configs`            | Country HR policies       | None (12 countries pre-populated)                     |
| `admin_organization_history` | Org change tracking       | admin_id → admins                                     |
| `job_grade`                  | Job levels/tracks         | None                                                  |
| `organization_unit`          | Org hierarchy (tree)      | parent_id → self                                      |
| `legal_entity`               | Legal companies           | None                                                  |
| `office`                     | Physical offices          | legal_entity_id → legal_entity                        |
| `building`                   | Buildings in offices      | office_id → office                                    |
| `floor`                      | Floors in buildings       | building_id → building                                |
| `partner_company`            | External partners         | None                                                  |

## Enums

### Identity & Employment

```yaml
IdentityType: [HUMAN, SERVICE_ACCOUNT, BOT, API_CLIENT, INTEGRATION, SYSTEM, EXTERNAL]
EmployeeType:
  [REGULAR, CONTRACT, INTERN, PART_TIME, TEMPORARY, CONSULTANT, PARTNER, VENDOR, FREELANCE]
EmploymentStatus: [ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED, RETIRED, RESIGNED]
AccountLifecycleStatus: [PENDING, ACTIVE, SUSPENDED, DEACTIVATED, ARCHIVED, DELETED]
```

### Service Accounts

```yaml
ServiceAccountType:
  [CI_CD, MONITORING, BACKUP, INTEGRATION, AUTOMATION, TESTING, DATA_PROCESSING, API_SERVICE]
NhiCredentialType: [API_KEY, OAUTH_CLIENT, SERVICE_PRINCIPAL, CERTIFICATE, SSH_KEY, TOKEN]
```

### Organization

```yaml
JobFamily:
  [
    ENGINEERING,
    PRODUCT,
    DESIGN,
    MARKETING,
    SALES,
    SUPPORT,
    OPERATIONS,
    FINANCE,
    HR,
    LEGAL,
    EXECUTIVE,
  ]
OrgUnitType: [COMPANY, DIVISION, DEPARTMENT, TEAM, SQUAD, TRIBE, CHAPTER, GUILD]
RemoteWorkType: [OFFICE, REMOTE, HYBRID, FIELD]
OfficeType: [HEADQUARTERS, BRANCH, SATELLITE, REMOTE, COWORKING]
PartnerType: [VENDOR, CONTRACTOR, CONSULTANT, AGENCY, SUPPLIER, PARTNER]
```

### Access & Security

```yaml
SecurityClearance: [PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET]
DataAccessLevel: [PUBLIC, TEAM, DEPARTMENT, COMPANY, RESTRICTED, CLASSIFIED]
VerificationMethod: [DOCUMENT, BIOMETRIC, VIDEO_CALL, IN_PERSON, THIRD_PARTY, BACKGROUND_CHECK]
VerificationLevel: [BASIC, STANDARD, ENHANCED, MAXIMUM]
```

### Attendance & Leave

```yaml
WorkType: [OFFICE, REMOTE, HYBRID, FIELD, BUSINESS_TRIP, CLIENT_SITE, TRAINING]
LeaveType:
  [
    ANNUAL,
    SICK,
    PARENTAL,
    MATERNITY,
    PATERNITY,
    BEREAVEMENT,
    MARRIAGE,
    UNPAID,
    COMPENSATORY,
    PUBLIC_HOLIDAY,
    SABBATICAL,
    JURY_DUTY,
    MILITARY,
    STUDY,
    PERSONAL,
    EMERGENCY,
  ]
LeaveStatus: [DRAFT, PENDING, APPROVED, REJECTED, CANCELLED]
ScheduleType: [STANDARD, SHIFT, FLEXIBLE]
```

### Delegation & Compliance

```yaml
DelegationType: [FULL, PARTIAL, VIEW_ONLY, APPROVAL_ONLY, EMERGENCY]
DelegationScope: [ALL, TEAM, DEPARTMENT, SERVICE, SPECIFIC_RESOURCES]
DelegationStatus: [PENDING, ACTIVE, EXPIRED, REVOKED, COMPLETED]
DelegationReason:
  [VACATION, SICK_LEAVE, BUSINESS_TRIP, PARENTAL_LEAVE, TRAINING, TEMPORARY_ASSIGNMENT, EMERGENCY]
AttestationType:
  [
    CODE_OF_CONDUCT,
    SECURITY_POLICY,
    DATA_PRIVACY,
    ACCEPTABLE_USE,
    CONFLICT_OF_INTEREST,
    INSIDER_TRADING,
    EXPORT_CONTROL,
    ANTI_BRIBERY,
  ]
AttestationStatus: [PENDING, COMPLETED, WAIVED, EXPIRED]
CertificationStatus: [ACTIVE, EXPIRED, SUSPENDED, REVOKED]
TrainingType:
  [ONBOARDING, SECURITY, COMPLIANCE, TECHNICAL, SOFT_SKILLS, LEADERSHIP, SAFETY, PRODUCT]
TrainingStatus: [NOT_STARTED, IN_PROGRESS, COMPLETED, FAILED, WAIVED]
```

### Global Mobility

```yaml
AssignmentType:
  [INTERNATIONAL, DOMESTIC, SHORT_TERM, LONG_TERM, PERMANENT_TRANSFER, TEMPORARY, ROTATIONAL]
AssignmentStatus: [PLANNED, APPROVED, ACTIVE, COMPLETED, CANCELLED]
VisaStatus: [NOT_REQUIRED, PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED]
WorkPermitType: [VISA, WORK_PERMIT, RESIDENCE_PERMIT, PERMANENT_RESIDENCE, CITIZENSHIP, EXEMPTION]
OrgChangeType:
  [
    PROMOTION,
    DEMOTION,
    TRANSFER,
    ROLE_CHANGE,
    DEPARTMENT_CHANGE,
    LOCATION_CHANGE,
    MANAGER_CHANGE,
    COMPENSATION_CHANGE,
    JOB_TITLE_CHANGE,
  ]
OrgChangeStatus: [PENDING, APPROVED, REJECTED, CANCELLED]
```

## REST API

### Auth & Session

| Endpoint          | Method | Access        | Purpose                   |
| ----------------- | ------ | ------------- | ------------------------- |
| `/auth/login`     | POST   | Public        | Admin login (step 1)      |
| `/auth/login/mfa` | POST   | Public        | MFA verification (step 2) |
| `/auth/refresh`   | POST   | Authenticated | Refresh session token     |
| `/auth/logout`    | POST   | Authenticated | Invalidate session        |
| `/auth/session`   | GET    | Authenticated | Get session details       |

### OAuth Configuration

| Endpoint                         | Method | Access | Purpose                                             |
| -------------------------------- | ------ | ------ | --------------------------------------------------- |
| `/oauth-config`                  | GET    | MASTER | List all OAuth providers (masked secrets)           |
| `/oauth-config/enabled`          | GET    | Public | List enabled providers (for UI)                     |
| `/oauth-config/:provider`        | PATCH  | MASTER | Update provider credentials (AES-256-GCM encrypted) |
| `/oauth-config/:provider/toggle` | PATCH  | MASTER | Enable/disable provider                             |
| `/oauth-config/:provider/status` | GET    | Public | Check if provider enabled                           |

**Security**: Client secrets encrypted with AES-256-GCM, callback URL whitelist (localhost, girok.dev, auth.girok.dev, auth-bff.girok.dev)

### Admin Profile (21 endpoints)

| Endpoint                      | Method | Purpose                         |
| ----------------------------- | ------ | ------------------------------- |
| `/admin/profile/me`           | GET    | Get own profile (all 83 fields) |
| `/admin/profile/:id`          | GET    | Get admin profile by ID         |
| `/admin/profile/:id`          | PATCH  | Bulk update multiple sections   |
| `/admin/profile/:id/scim`     | PATCH  | Update SCIM attributes          |
| `/admin/profile/:id/employee` | PATCH  | Update employee info            |
| `/admin/profile/:id/job`      | PATCH  | Update job/org details          |
| `/admin/profile/:id/partner`  | PATCH  | Update partner info             |
| `/admin/profile/:id/joiner`   | PATCH  | Update joiner attributes        |
| `/admin/profile/:id/mover`    | PATCH  | Update mover attributes         |
| `/admin/profile/:id/leaver`   | PATCH  | Update leaver attributes        |
| `/admin/profile/:id/contact`  | PATCH  | Update contact info             |

### Admin Enterprise (11 endpoints)

| Endpoint                                      | Method | Purpose                                  |
| --------------------------------------------- | ------ | ---------------------------------------- |
| `/admin/enterprise/list`                      | GET    | List/search admins (paginated, filtered) |
| `/admin/enterprise/nhi`                       | POST   | Create Non-Human Identity                |
| `/admin/enterprise/:id/nhi`                   | PATCH  | Update NHI attributes                    |
| `/admin/enterprise/:id/nhi/rotate`            | POST   | Rotate NHI credentials                   |
| `/admin/enterprise/:id/location/physical`     | PATCH  | Update physical location                 |
| `/admin/enterprise/:id/location/tax-legal`    | PATCH  | Update tax/legal location                |
| `/admin/enterprise/:id/access-control`        | PATCH  | Update security clearance/access         |
| `/admin/enterprise/:id/identity-verification` | PATCH  | Update verification status               |
| `/admin/enterprise/:id/verify`                | POST   | Perform identity verification            |
| `/admin/enterprise/:id/extensions`            | PATCH  | Update JSONB extensions                  |
| `/admin/enterprise/:id`                       | PATCH  | Bulk update enterprise sections          |

### Organization (41 endpoints)

| Entity              | Endpoints                                                                                                                                                                                   | Key Features                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Job Grade**       | `POST /job-grades`, `GET /job-grades`, `GET /job-grades/:id`, `GET /job-grades/code/:code`, `PATCH /job-grades/:id`, `DELETE /job-grades/:id`                                               | Code uniqueness, JobFamily filter                               |
| **Org Unit**        | `POST /org-units`, `GET /org-units`, `GET /org-units/tree`, `GET /org-units/:id`, `GET /org-units/:id/children`, `PATCH /org-units/:id`, `DELETE /org-units/:id`                            | Hierarchical tree, parent validation, no-delete if has children |
| **Legal Entity**    | `POST /legal-entities`, `GET /legal-entities`, `GET /legal-entities/:id`, `PATCH /legal-entities/:id`, `DELETE /legal-entities/:id`                                                         | Country filter                                                  |
| **Office**          | `POST /offices`, `GET /offices`, `GET /offices/:id`, `GET /offices/:id/buildings`, `PATCH /offices/:id`, `DELETE /offices/:id`                                                              | Legal entity validation, OfficeType filter                      |
| **Building**        | `POST /buildings`, `GET /buildings`, `GET /buildings/:id`, `GET /buildings/:id/floors`, `PATCH /buildings/:id`, `DELETE /buildings/:id`                                                     | Office validation                                               |
| **Floor**           | `POST /floors`, `GET /floors`, `GET /floors/:id`, `PATCH /floors/:id`, `DELETE /floors/:id`                                                                                                 | Building validation, floor_number sort                          |
| **Partner Company** | `POST /partner-companies`, `GET /partner-companies`, `GET /partner-companies/:id`, `GET /partner-companies/:id/agreements`, `PATCH /partner-companies/:id`, `DELETE /partner-companies/:id` | PartnerType filter                                              |

### Attendance (8 endpoints)

| Endpoint                           | Method | Purpose                                                       |
| ---------------------------------- | ------ | ------------------------------------------------------------- |
| `/attendance/clock-in`             | POST   | Clock in (date, workType, location, notes)                    |
| `/attendance/clock-out`            | POST   | Clock out (date, overtimeMinutes, location)                   |
| `/attendance/me`                   | GET    | Get own attendance (page, limit, status, workType, dateRange) |
| `/attendance/me/stats`             | GET    | Get stats (totalDays, presentDays, lateDays, avgWorkMinutes)  |
| `/attendance/:id/approve-overtime` | PATCH  | Approve overtime (manager)                                    |
| `/work-schedules`                  | POST   | Create work schedule                                          |
| `/work-schedules/me`               | GET    | Get own schedules                                             |
| `/work-schedules/me/active`        | GET    | Get active schedule                                           |

### Leave (13 endpoints)

| Endpoint                                     | Method | Purpose                                                 |
| -------------------------------------------- | ------ | ------------------------------------------------------- |
| `/leaves`                                    | POST   | Create leave request (draft)                            |
| `/leaves/:id/submit`                         | POST   | Submit for approval (firstApproverId, secondApproverId) |
| `/leaves/:id/approve`                        | POST   | Approve/reject (manager)                                |
| `/leaves/:id/cancel`                         | POST   | Cancel leave (cancellationReason)                       |
| `/leaves/me`                                 | GET    | Get own leave requests                                  |
| `/leaves/pending-approvals`                  | GET    | Get pending approvals (manager)                         |
| `/leave-balances`                            | POST   | Create balance (HR)                                     |
| `/leave-balances/me`                         | GET    | Get own balance (current year)                          |
| `/leave-balances/me/:year`                   | GET    | Get balance by year                                     |
| `/leave-balances/:adminId/:year`             | GET    | Get admin balance (HR/Manager)                          |
| `/leave-balances/:adminId/:year/adjust`      | PATCH  | Adjust balance (HR)                                     |
| `/leave-balances/:adminId/:year/recalculate` | POST   | Recalculate from approved leaves                        |
| `/leave-balances/:adminId/:year/initialize`  | POST   | Initialize for new year                                 |

### Delegation (9 endpoints)

| Endpoint                    | Method | Purpose                                                               |
| --------------------------- | ------ | --------------------------------------------------------------------- |
| `/delegations`              | POST   | Create delegation (delegatorId, delegateId, type, scope, constraints) |
| `/delegations`              | GET    | List delegations (filter: status, type, dateRange)                    |
| `/delegations/me/delegated` | GET    | Get delegations I created                                             |
| `/delegations/me/received`  | GET    | Get delegations I received                                            |
| `/delegations/:id`          | GET    | Get by ID                                                             |
| `/delegations/:id`          | PATCH  | Update (endDate, permissions, constraints)                            |
| `/delegations/:id/approve`  | POST   | Approve/reject delegation                                             |
| `/delegations/:id/revoke`   | POST   | Revoke (revocationReason)                                             |
| `/delegations/:id/logs`     | GET    | Get usage logs                                                        |

**Features**: Overlap detection, auto-expiry, action count limits, time/IP constraints, audit logging

### Compliance (18 endpoints)

| Entity             | Endpoints                                                                                 | Key Features                                 |
| ------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Attestations**   | `POST`, `GET`, `GET /:id`, `PATCH /:id/complete`, `PATCH /:id/waive`                      | Recurrence, digital signature, waiver expiry |
| **Certifications** | `POST`, `GET`, `GET /:id`, `PATCH /:id/verify`, `PATCH /:id/renew`                        | Verification workflow, renewal tracking      |
| **Training**       | `POST`, `GET`, `GET /:id`, `PATCH /:id/start`, `PATCH /:id/complete`, `PATCH /:id/assign` | Scoring, certificate URLs, mandatory flag    |

### Global Mobility (17 endpoints)

| Entity          | Endpoints                                                                                                                                | Key Features                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Assignments** | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `POST /:id/approve`, `POST /:id/start`, `POST /:id/complete`, `POST /:id/cancel`, `DELETE /:id` | Lifecycle (planned→approved→active→completed), compensation tracking, dependent support |
| **Work Auth**   | `POST`, `GET`, `GET /expiring`, `GET /:id`, `PATCH /:id`, `POST /:id/renew`, `POST /:id/expire`, `DELETE /:id`                           | Expiry alerts (90 days), renewal tracking, visa status                                  |

### Country Config (3 endpoints)

| Endpoint                        | Method | Purpose                                                           |
| ------------------------------- | ------ | ----------------------------------------------------------------- |
| `/country-configs`              | GET    | List all countries (12 pre-populated)                             |
| `/country-configs/:countryCode` | GET    | Get config (work hours, leave entitlement, fiscal year, timezone) |
| `/country-configs/:countryCode` | PATCH  | Update config (admin only)                                        |

**Data**: US, UK, CA, AU, DE, FR, JP, KR, SG, IN, CN, BR

### Organization History (5 endpoints)

| Endpoint                               | Method | Purpose                                                     |
| -------------------------------------- | ------ | ----------------------------------------------------------- |
| `/organization-history`                | POST   | Record org change (promotion, transfer, compensation)       |
| `/organization-history`                | GET    | List all history (filter: adminId, type, status, dateRange) |
| `/organization-history/admin/:adminId` | GET    | Get history for admin                                       |
| `/organization-history/:id`            | GET    | Get by ID                                                   |
| `/organization-history/:id/approve`    | POST   | Approve change (approverId, approvalNotes)                  |

**Features**: Before/after state, approval workflow, effective date, compensation history

### Employee Self-Service (17 endpoints)

| Module         | Endpoints                                                                                                                                                                                                                                                                | Restrictions                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Profile**    | `GET /employee/profile/me`, `PATCH /employee/profile/me`                                                                                                                                                                                                                 | Limited fields: displayName, nickname, preferredLanguage, locale, timezone, profileUrl, photoUrl, contact info. CANNOT update: email, username, employeeNumber, jobTitle, salary |
| **Attendance** | `POST /employee/attendance/clock-in`, `POST /employee/attendance/clock-out`, `GET /employee/attendance/me`, `GET /employee/attendance/me/stats`                                                                                                                          | Own data only, GPS/IP tracking, overtime request                                                                                                                                 |
| **Leave**      | `POST /employee/leave/requests`, `POST /employee/leave/requests/:id/submit`, `POST /employee/leave/requests/:id/cancel`, `GET /employee/leave/requests/me`, `GET /employee/leave/requests/:id`, `GET /employee/leave/balance/me`, `GET /employee/leave/balance/me/:year` | Own data only, multi-level approval, balance deduction/restoration                                                                                                               |
| **Delegation** | `GET /employee/delegations/received`, `GET /employee/delegations/received/:id`                                                                                                                                                                                           | Read-only, own delegations only                                                                                                                                                  |

**Security**: EmployeeAuthGuard enforces JWT `sub` claim = employee ID, no cross-employee access

## Services

### AdminProfileService

```yaml
location: src/admin/services/admin-profile.service.ts
methods:
  - getAdminDetail(adminId): Fetch profile with relations
  - mapAdminToDetailResponse(admin): Public mapper (reusable)
  - updateScimCore(adminId, dto): Update SCIM (username uniqueness check)
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

### AdminEnterpriseService

```yaml
location: src/admin/services/admin-enterprise.service.ts
methods:
  - createNhi(dto, createdBy): Create NHI (prevents HUMAN type, validates owner)
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
  - getDefaultNhiRoleId(): Private helper
  - getAdminMetadata(adminId): Private helper
optimization:
  - listAdmins uses $transaction (2 queries: findMany + count)
  - All updates include relations in single query
  - NHI credential rotation enforces identity type check
```

### Organization Services (7 services)

```yaml
location: src/organization/services/
services:
  - JobGradeService: code uniqueness, jobFamily/track filter
  - OrgUnitService: tree structure (recursive buildTree), parent validation, no-delete if has children
  - LegalEntityService: code uniqueness, countryCode filter
  - OfficeService: legalEntity validation, findBuildings relation
  - BuildingService: office validation, findFloors relation
  - FloorService: building validation, floorNumber sort
  - PartnerCompanyService: code uniqueness, findAgreements relation
common_patterns:
  - Snake_case DB, camelCase DTOs
  - Private mapToResponse method
  - Code uniqueness check (ConflictException)
  - findOne throws NotFoundException
  - All inject PrismaService
```

### Attendance & Leave Services

```yaml
AttendanceService:
  location: src/attendance/services/attendance.service.ts
  methods: [clockIn, clockOut, approveOvertime, getAttendanceByDate, listAttendances, getStats]
  features: Conflict detection, auto work minutes, overtime tracking, IP/location logging
WorkScheduleService:
  location: src/attendance/services/work-schedule.service.ts
  methods: [create, findByAdmin, findActiveByAdmin, findOne, update, remove]
  features: Auto-deactivate previous, Standard/Shift/Flexible types
LeaveService:
  location: src/leave/services/leave.service.ts
  methods: [create, submit, approve, cancel, findOne, list, getPendingApprovals]
  features: Overlap detection, multi-level approval, balance deduction/restoration, status transitions
LeaveBalanceService:
  location: src/leave/services/leave-balance.service.ts
  methods: [create, getBalance, getCurrentBalance, adjust, recalculate, initializeForNewYear]
  features: Carryover (max 5 days), tenure bonus (3/5/10 years), auto recalculation
```

### Phase 4 Services

```yaml
DelegationService: CRUD + approval + logging + constraints (time/IP/action count)
AttestationService: Lifecycle + recurrence + digital signature
CertificationService: Verification workflow + renewal
TrainingService: Assignment + completion + scoring
GlobalAssignmentService: Lifecycle + compensation + dependent tracking
WorkAuthorizationService: Visa management + expiry alerts (90 days)
CountryConfigService: Read-heavy (12 countries), HR policy lookups
OrganizationHistoryService: Org change tracking + approval workflow
```

### Phase 5 Services

```yaml
EmployeeProfileService: Wraps AdminProfileService, limited fields (displayName, contact)
EmployeeAttendanceService: Wraps AttendanceService, own data only
EmployeeLeaveService: Wraps LeaveService + LeaveBalanceService, own data only
EmployeeDelegationService: Wraps DelegationService, read-only, delegations received
EmployeeAuthGuard: JWT validation + employee access control (enforces sub claim)
```

## Performance

### Query Optimization (2026-01-16)

| Operation                 | Before                             | After                         | Reduction |
| ------------------------- | ---------------------------------- | ----------------------------- | --------- |
| listAdmins(20)            | 21 queries (1 + 20×getAdminDetail) | 2 queries (findMany + count)  | 91%       |
| updateScimCore            | 2 queries (UPDATE + SELECT)        | 1 query (UPDATE with include) | 50%       |
| updateProfile(3 sections) | 4 queries (3 UPDATEs + SELECT)     | 1 query (merged UPDATE)       | 75%       |

**Techniques**:

- N+1 elimination: $transaction + direct mapping
- Single UPDATE with include for relations
- Bulk updates via Object.assign

### Prisma Config

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../node_modules/.prisma/auth-client"
  previewFeatures = ["relationJoins", "typedSql"]
}
```

**Features**: relationJoins (optimized JOINs), typedSql (future-proofing)

### Database Indexes

```yaml
admins:
  - username (UNIQUE): SCIM lookup
  - employee_number (UNIQUE): Employee lookup
  - manager_admin_id: Hierarchy queries
  - organization_unit_id: Org filtering
  - identity_type: NHI filtering
```

## gRPC

```yaml
proto: packages/proto/auth/v1/auth.proto
methods:
  - AdminLogin: Step 1
  - AdminLoginMfa: Step 2
  - AdminValidateSession: Validate token
  - AdminRefreshSession: Refresh expired
  - AdminLogout: Invalidate
```

## Events (Outbox Pattern)

| Event                     | Trigger               | Payload                     |
| ------------------------- | --------------------- | --------------------------- |
| `admin.created`           | New admin account     | ID, email, name, scope      |
| `admin.updated`           | Profile updated       | ID, updated fields          |
| `admin.terminated`        | Employment terminated | ID, terminationDate, reason |
| `nhi.created`             | New NHI created       | ID, ownerID, purpose, type  |
| `nhi.credentials.rotated` | Credentials rotated   | ID, rotatedAt               |

## Testing

### Coverage Summary

```yaml
total_tests: 1359+
total_suites: 50+
coverage_target: 80%
status: 100% passing

modules:
  admin:
    profile: 11 tests
    enterprise: 15 tests
  organization: 73 tests (84.22% coverage)
  attendance: 63 tests (80%+)
  leave: 66 tests (80%+)
  delegation: 18 tests (80%+)
  compliance: 22 tests (80%+)
  global_mobility: 17 tests (80%+)
  country_config: 9 tests (80%+)
  org_history: 11 tests (80%+)
  employee_self_service: 30 tests (100% passing)
```

### Test Categories

- Service initialization
- CRUD operations
- Code uniqueness (ConflictException)
- Foreign key validation (NotFoundException)
- Hierarchical operations (tree)
- Relationship queries
- Filter/query validation
- Error handling (NotFoundException, ConflictException, BadRequestException)

### Mock Strategy

```yaml
mocks:
  - PrismaService (all DB ops)
  - AdminProfileService (cross-service dependencies)
  - All organization entity tables
framework: Vitest
```

## Security

### NHI Security

- Cannot create with HUMAN identity type
- Credential rotation interval (default: 90 days)
- Must have human owner (ownerAdminId required)

### Access Control

- AdminAuthGuard on all endpoints
- EmployeeAuthGuard for self-service endpoints (JWT sub claim enforcement)
- Security clearance enforcement at app level
- IP range restrictions (allowedIpRanges array)
- Access end dates (accessEndDate)

### Identity Verification

- KYC/AML status (method, level, backgroundCheck)
- Verification audit trail (metadata JSONB)

### OAuth Configuration

- Client secrets encrypted (AES-256-GCM)
- Callback URL whitelist (localhost, girok.dev, auth.girok.dev, auth-bff.girok.dev)
- Audit logging for credential changes

## Implementation Files

### Admin Module

```yaml
controllers:
  [admin-profile.controller.ts (10 endpoints), admin-enterprise.controller.ts (11 endpoints)]
services: [admin-profile.service.ts, admin-enterprise.service.ts]
dtos: [admin-profile.dto.ts, admin-enterprise.dto.ts]
tests: [admin-profile.service.spec.ts (11), admin-enterprise.service.spec.ts (15)]
```

### Organization Module

```yaml
module: organization.module.ts (registered in app.module.ts)
controllers: [job-grade (6), org-unit (7), legal-entity (5), office (6), building (6), floor (5), partner-company (6)] = 41 endpoints
services: [job-grade, org-unit, legal-entity, office, building, floor, partner-company].service.ts
dtos: [job-grade, org-unit, legal-entity, office, building, floor, partner-company].dto.ts
tests: [job-grade (14), org-unit (16), legal-entity (11), office (9), building (7), floor (7), partner-company (9)] = 73 tests
```

### Attendance & Leave Modules

```yaml
attendance:
  controllers: [attendance.controller.ts, work-schedule.controller.ts]
  services: [attendance.service.ts, work-schedule.service.ts]
  tests: [attendance.service.spec.ts (45), work-schedule.service.spec.ts (18)]
leave:
  controllers: [leave.controller.ts, leave-balance.controller.ts]
  services: [leave.service.ts, leave-balance.service.ts]
  tests: [leave.service.spec.ts (42), leave-balance.service.spec.ts (24)]
```

### Phase 4 Modules

```yaml
modules: [delegation, compliance, global-mobility, country-config, organization-history]
tests: [delegation (18), attestation (7), certification (7), training (8), global-assignment (8), work-authorization (9), country-config (9), org-history (11)] = 77 tests
```

### Phase 5 Modules

```yaml
module: employee.module.ts
submodules: [employee-profile, employee-attendance, employee-leave, employee-delegation]
guards: [employee-auth.guard.ts]
tests: [guard (7), profile (4), attendance (6), leave (8), delegation (5)] = 30 tests
endpoints: 17 (profile: 2, attendance: 4, leave: 7, delegation: 2)
```

### Shared Types

```yaml
location: packages/types/src/admin/
files: [admin.enums.ts (11 enums), admin.types.ts (Admin interface, 83 fields)]
```

### Migrations

```yaml
phase2: 20260116000006_extend_admins_phase2_core.sql (83 fields)
phase3:
  - 20260117000007_add_attendance.sql (admin_attendances, admin_work_schedules)
  - 20260117000008_add_leave_management.sql (admin_leaves, admin_leave_balances, leave_policies, public_holidays)
phase4: 20260118000009_add_phase4_tables.sql (15 tables, 15 enums)
phase5: No new tables (reuses existing admin/attendance/leave)
```

## AdminDetailResponse Structure

```yaml
core_fields:
  [
    id,
    email,
    name,
    scope,
    tenantId,
    roleId,
    isActive,
    lastLoginAt,
    createdAt,
    updatedAt,
    accountMode,
    countryCode,
  ]
scim_core:
  [
    username,
    externalId,
    displayName,
    givenName,
    familyName,
    nativeGivenName,
    nativeFamilyName,
    nickname,
    preferredLanguage,
    locale,
    timezone,
    profileUrl,
    profilePhotoUrl,
  ]
employee_info: [employeeNumber, employeeType, employmentStatus, lifecycleStatus]
job_org:
  [
    jobGradeId,
    jobTitle,
    jobTitleEn,
    jobCode,
    jobFamily,
    organizationUnitId,
    costCenter,
    managerAdminId,
    dottedLineManagerId,
    directReportsCount,
  ]
partner: [partnerCompanyId, partnerEmployeeId, partnerContractEndDate]
jml_joiner:
  [hireDate, originalHireDate, startDate, onboardingCompletedAt, probationEndDate, probationStatus]
jml_mover: [lastRoleChangeAt, lastPromotionDate, lastTransferDate]
jml_leaver:
  [
    terminationDate,
    lastWorkingDay,
    terminationReason,
    terminationType,
    eligibleForRehire,
    exitInterviewCompleted,
  ]
contact:
  [phoneNumber, phoneCountryCode, mobileNumber, mobileCountryCode, workPhone, emergencyContact]
relations:
  role: { id, name, displayName, level }
  tenant: { id, name, slug, type, status }
  manager: { id, name, email, jobTitle }
```

## Version History

```yaml
version: Phase 5 (2026-01-18)
last_updated: Employee Self-Service APIs
phases:
  phase0: Backup HR service structure
  phase1: HR cleanup & schema design
  phase2: Enterprise identity (SCIM, JML, NHI) - 83 fields
  phase3: Attendance & leave management - 6 tables, 129 tests
  phase4: Delegation, compliance, global mobility - 15 tables, 77 tests
  phase5: Employee self-service - 17 endpoints, 30 tests, no new tables
total_endpoints: 150+
total_tests: 1359+
total_tables: 24
total_enums: 30+
test_status: 100% passing
```

---

_This is the Single Source of Truth (SSOT) for auth-service. For quick reference, see `.ai/services/auth-service.md`._
