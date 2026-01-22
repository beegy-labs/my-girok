# auth-service Database Schema

> Database tables and enums for auth-service

## admins Table (83 fields)

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

## Additional Tables

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

## Database Indexes

```yaml
admins:
  - username (UNIQUE): SCIM lookup
  - employee_number (UNIQUE): Employee lookup
  - manager_admin_id: Hierarchy queries
  - organization_unit_id: Org filtering
  - identity_type: NHI filtering
```

## Migrations

```yaml
phase2: 20260116000006_extend_admins_phase2_core.sql (83 fields)
phase3:
  - 20260117000007_add_attendance.sql
  - 20260117000008_add_leave_management.sql
phase4: 20260118000009_add_phase4_tables.sql (15 tables, 15 enums)
phase5: No new tables (reuses existing)
```

## Prisma Config

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../node_modules/.prisma/auth-client"
  previewFeatures = ["relationJoins", "typedSql"]
}
```

---

_Related: `auth-service.md` | `auth-service-api.md` | `auth-service-impl.md`_
