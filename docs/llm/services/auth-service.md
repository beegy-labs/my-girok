# auth-service

> **Service Boundary**: Handles authentication, authorization, session management, and enterprise identity (SCIM/JML/NHI) for all platform administrators.

```yaml
port: 3002
grpc: 50052
db: girok_auth (PostgreSQL)
cache: Valkey DB 2
events: auth.* (Redpanda)
codebase: services/auth-service/
```

## 1. Core Concepts

### 1.1. Standard Authentication

- **Admin Auth**: Manages login, password hashing (bcrypt), MFA (TOTP), and session tokens (JWT) for human administrators.
- **Session Management**: Issues, validates, and revokes sessions. Supports "revoke all" functionality.
- **Legal Consent**: Tracks admin consent for legal documents like Terms of Service and Privacy Policy.

### 1.2. Phase 2: Enterprise Identity Management

This service now includes comprehensive enterprise identity features based on industry standards.

- **SCIM 2.0 (System for Cross-domain Identity Management)**: The `admins` table is extended to act as a rich user profile store, compatible with the SCIM Core User and Enterprise User schemas. This includes attributes for personal info, employment data, and organizational structure.
- **JML (Joiner-Mover-Leaver)**: The schema tracks the full employee lifecycle, from hiring (`Joiner`), through promotions and transfers (`Mover`), to termination (`Leaver`).
- **NHI (Non-Human Identity)**: The service can create and manage service accounts, API clients, and other non-human identities. These are linked to a human owner and have their own lifecycle for credential rotation and expiry.

## 2. Database Schema

The schema is defined in `prisma/schema.prisma`. The most critical table is `admins`.

### 2.1. `admins` Table (Phase 2 Extended)

The `admins` table has been extended with 83 fields to support Phase 2.

| Field Group         | Sample Fields                                                                                         | Purpose                                                         |
| :------------------ | :---------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| **Primary Info**    | `id`, `email`, `password`, `name`, `is_active`                                                        | Core authentication and identification.                         |
| **SCIM Core**       | `username`, `externalId`, `displayName`, `givenName`, `familyName`                                    | Standard identity attributes for interoperability.              |
| **Employee Info**   | `employeeNumber`, `employeeType`, `employmentStatus`, `lifecycleStatus`                               | HR-specific data aligned with SCIM Enterprise schema.           |
| **JML Lifecycle**   | `hireDate`, `terminationDate`, `lastPromotionDate`, `probationStatus`                                 | Tracks key dates in the employee lifecycle.                     |
| **Job & Org**       | `jobTitle`, `jobGradeId`, `organizationUnitId`, `managerAdminId`, `costCenter`                        | Defines the admin's position in the company hierarchy.          |
| **NHI**             | `identityType`, `ownerAdminId`, `serviceAccountType`, `credentialType`, `secretRotationDays`          | Differentiates humans from bots/services and manages them.      |
| **Location**        | `primaryOfficeId`, `buildingId`, `floorId`, `deskCode`, `remoteWorkType`                              | Physical location tracking.                                     |
| **Tax/Legal**       | `workCountryCode`, `taxResidenceCountry`, `payrollCountryCode`, `legalCountryCode`                    | Tax and legal location tracking.                                |
| **Access Control**  | `securityClearance`, `dataAccessLevel`, `allowedIpRanges`, `accessEndDate`                            | Security and data access-related attributes.                    |
| **Verification**    | `identityVerified`, `verificationMethod`, `verificationLevel`, `backgroundCheckStatus`                | KYC/AML-related identity verification status.                   |
| **JSON Extensions** | `skills`, `certifications`, `education`, `workHistory`, `customAttributes`, `preferences`, `metadata` | Flexible JSONB fields for storing structured but non-core data. |

### 2.2. Migration History

- **20260116000006_extend_admins_phase2_core.sql**: Adds 83 enterprise fields to admins table
  - **Note**: All foreign key constraints were removed due to TEXT/UUID type mismatch (policy requires TEXT for IDs)
  - Referential integrity is enforced at application level

## 3. Types & Enums

Phase 2 introduces 11 new enum types defined in `packages/types/src/admin/`:

### Identity & Employment

- **`IdentityType`**: HUMAN, SERVICE_ACCOUNT, BOT, API_CLIENT, INTEGRATION, SYSTEM, EXTERNAL
- **`EmployeeType`**: REGULAR, CONTRACT, INTERN, PART_TIME, TEMPORARY, CONSULTANT, PARTNER, VENDOR, FREELANCE
- **`EmploymentStatus`**: ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED, RETIRED, RESIGNED
- **`AccountLifecycleStatus`**: PENDING, ACTIVE, SUSPENDED, DEACTIVATED, ARCHIVED, DELETED

### Service Accounts

- **`ServiceAccountType`**: CI_CD, MONITORING, BACKUP, INTEGRATION, AUTOMATION, TESTING, DATA_PROCESSING, API_SERVICE
- **`NhiCredentialType`**: API_KEY, OAUTH_CLIENT, SERVICE_PRINCIPAL, CERTIFICATE, SSH_KEY, TOKEN

### Organization & Location

- **`JobFamily`**: ENGINEERING, PRODUCT, DESIGN, MARKETING, SALES, SUPPORT, OPERATIONS, FINANCE, HR, LEGAL, EXECUTIVE
- **`RemoteWorkType`**: OFFICE, REMOTE, HYBRID, FIELD

### Access & Security

- **`SecurityClearance`**: PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET
- **`DataAccessLevel`**: PUBLIC, TEAM, DEPARTMENT, COMPANY, RESTRICTED, CLASSIFIED

### Verification

- **`VerificationMethod`**: DOCUMENT, BIOMETRIC, VIDEO_CALL, IN_PERSON, THIRD_PARTY, BACKGROUND_CHECK
- **`VerificationLevel`**: BASIC, STANDARD, ENHANCED, MAXIMUM

## 4. REST API Endpoints

### 4.1. Standard Auth & Session

- `POST /auth/login`: Admin login with email/password.
- `POST /auth/login/mfa`: Second-step MFA verification.
- `POST /auth/refresh`: Refresh session using a refresh token.
- `POST /auth/logout`: Invalidate current session.
- `GET /auth/session`: Get current session details.

### 4.2. Admin Profile Management (Phase 2)

#### GET /admin/profile/me

Get the profile of the currently authenticated admin.

**Response**: `AdminDetailResponse` (all 83 fields + relations)

#### GET /admin/profile/:id

Get the detailed profile of any admin by ID.

**Response**: `AdminDetailResponse`

#### PATCH /admin/profile/:id/scim

Update SCIM core attributes.

**Request**: `UpdateScimCoreDto`

```typescript
{
  username?: string;
  externalId?: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  nativeGivenName?: string;
  nativeFamilyName?: string;
  nickname?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  profileUrl?: string;
  profilePhotoUrl?: string;
}
```

#### PATCH /admin/profile/:id/employee

Update employee information.

**Request**: `UpdateEmployeeInfoDto`

```typescript
{
  employeeNumber?: string;
  employeeType?: EmployeeType;
  employmentStatus?: EmploymentStatus;
  lifecycleStatus?: AccountLifecycleStatus;
}
```

#### PATCH /admin/profile/:id/job

Update job and organization details.

**Request**: `UpdateJobOrganizationDto`

```typescript
{
  jobGradeId?: string;
  jobTitle?: string;
  jobTitleEn?: string;
  jobCode?: string;
  jobFamily?: JobFamily;
  organizationUnitId?: string;
  costCenter?: string;
  managerAdminId?: string;
  dottedLineManagerId?: string;
  directReportsCount?: number;
}
```

#### PATCH /admin/profile/:id/partner

Update partner/contractor information.

**Request**: `UpdatePartnerInfoDto`

```typescript
{
  partnerCompanyId?: string;
  partnerEmployeeId?: string;
  partnerContractEndDate?: string; // ISO date
}
```

#### PATCH /admin/profile/:id/joiner

Update JML joiner attributes.

**Request**: `UpdateJoinerInfoDto`

```typescript
{
  hireDate?: string;
  originalHireDate?: string;
  startDate?: string;
  onboardingCompletedAt?: string;
  probationEndDate?: string;
  probationStatus?: ProbationStatus;
}
```

#### PATCH /admin/profile/:id/mover

Update JML mover attributes.

**Request**: `UpdateMoverInfoDto`

```typescript
{
  lastRoleChangeAt?: string;
  lastPromotionDate?: string;
  lastTransferDate?: string;
}
```

#### PATCH /admin/profile/:id/leaver

Update JML leaver attributes.

**Request**: `UpdateLeaverInfoDto`

```typescript
{
  terminationDate?: string;
  lastWorkingDay?: string;
  terminationReason?: string;
  terminationType?: string;
  eligibleForRehire?: boolean;
  exitInterviewCompleted?: boolean;
}
```

#### PATCH /admin/profile/:id/contact

Update contact information.

**Request**: `UpdateContactInfoDto`

```typescript
{
  phoneNumber?: string;
  phoneCountryCode?: string;
  mobileNumber?: string;
  mobileCountryCode?: string;
  workPhone?: string;
  emergencyContact?: Record<string, any>;
}
```

#### PATCH /admin/profile/:id

Update multiple profile sections at once.

**Request**: `UpdateAdminProfileDto`

```typescript
{
  scim?: UpdateScimCoreDto;
  employee?: UpdateEmployeeInfoDto;
  job?: UpdateJobOrganizationDto;
  partner?: UpdatePartnerInfoDto;
  joiner?: UpdateJoinerInfoDto;
  mover?: UpdateMoverInfoDto;
  leaver?: UpdateLeaverInfoDto;
  contact?: UpdateContactInfoDto;
}
```

### 4.3. Admin Enterprise Management (Phase 2)

#### GET /admin/enterprise/list

List and search for admins with advanced filters.

**Query Parameters**: `AdminListQueryDto`

```typescript
{
  page?: number;              // Default: 1
  limit?: number;             // Default: 20, Max: 100
  search?: string;            // Searches name, email, username
  employeeType?: EmployeeType;
  identityType?: IdentityType;
  organizationUnitId?: string;
  managerAdminId?: string;
  isActive?: boolean;
  sortBy?: string;            // Default: 'createdAt'
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

**Response**:

```typescript
{
  data: AdminDetailResponse[];
  total: number;
  page: number;
  limit: number;
}
```

#### POST /admin/enterprise/nhi

Create a new Non-Human Identity.

**Request**: `CreateNhiDto`

```typescript
{
  email: string;
  name: string;
  identityType: IdentityType;  // Not HUMAN
  ownerAdminId: string;
  secondaryOwnerId?: string;
  nhiPurpose: string;
  serviceAccountType?: ServiceAccountType;
  credentialType?: NhiCredentialType;
  secretRotationDays?: number; // 1-365, default: 90
  nhiExpiryDate?: string;      // ISO date
  nhiConfig?: Record<string, any>;
}
```

#### PATCH /admin/enterprise/:id/nhi

Update attributes of an NHI.

**Request**: `UpdateNhiAttributesDto`

```typescript
{
  identityType?: IdentityType;
  ownerAdminId?: string;
  secondaryOwnerId?: string;
  nhiPurpose?: string;
  serviceAccountType?: ServiceAccountType;
  credentialType?: NhiCredentialType;
  secretRotationDays?: number;
  nhiExpiryDate?: string;
  lastCredentialRotation?: string;
  nhiConfig?: Record<string, any>;
}
```

#### POST /admin/enterprise/:id/nhi/rotate

Trigger credential rotation for an NHI.

**Response**:

```typescript
{
  rotatedAt: Date;
}
```

#### PATCH /admin/enterprise/:id/location/physical

Update physical location details.

**Request**: `UpdatePhysicalLocationDto`

```typescript
{
  legalEntityId?: string;
  primaryOfficeId?: string;
  buildingId?: string;
  floorId?: string;
  deskCode?: string;
  remoteWorkType?: RemoteWorkType;
}
```

#### PATCH /admin/enterprise/:id/location/tax-legal

Update tax and legal location details.

**Request**: `UpdateTaxLegalLocationDto`

```typescript
{
  legalCountryCode?: string;
  workCountryCode?: string;
  taxResidenceCountry?: string;
  payrollCountryCode?: string;
}
```

#### PATCH /admin/enterprise/:id/access-control

Update security clearance and access levels.

**Request**: `UpdateAccessControlDto`

```typescript
{
  securityClearance?: SecurityClearance;
  dataAccessLevel?: DataAccessLevel;
  accessEndDate?: string;
  allowedIpRanges?: string[];
}
```

#### PATCH /admin/enterprise/:id/identity-verification

Update identity verification status.

**Request**: `UpdateIdentityVerificationDto`

```typescript
{
  identityVerified?: boolean;
  identityVerifiedAt?: string;
  verificationMethod?: VerificationMethod;
  verificationLevel?: VerificationLevel;
  backgroundCheckStatus?: string;
  backgroundCheckDate?: string;
}
```

#### POST /admin/enterprise/:id/verify

Perform an identity verification action.

**Request**: `VerifyAdminIdentityDto`

```typescript
{
  method: VerificationMethod;
  level: VerificationLevel;
  documentId?: string;
  notes?: Record<string, any>;
}
```

**Behavior**: Sets `identityVerified` to true, records timestamp, and stores verification details in metadata.

#### PATCH /admin/enterprise/:id/extensions

Update JSONB extension attributes.

**Request**: `UpdateExtensionAttributesDto`

```typescript
{
  skills?: Array<{
    name: string;
    level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    yearsOfExperience?: number;
    certifiedAt?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    issuedAt?: string;
    expiresAt?: string;
    credentialId?: string;
    url?: string;
  }>;
  education?: Array<{
    institution: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    gpa?: number;
  }>;
  workHistory?: Array<{
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    location?: string;
  }>;
  customAttributes?: Record<string, any>;
  preferences?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

#### PATCH /admin/enterprise/:id

Update multiple enterprise sections at once.

**Request**: `UpdateAdminEnterpriseDto`

```typescript
{
  nhi?: UpdateNhiAttributesDto;
  physicalLocation?: UpdatePhysicalLocationDto;
  taxLegalLocation?: UpdateTaxLegalLocationDto;
  accessControl?: UpdateAccessControlDto;
  identityVerification?: UpdateIdentityVerificationDto;
  extensions?: UpdateExtensionAttributesDto;
}
```

### 4.4. AdminDetailResponse Structure

All profile and enterprise endpoints return `AdminDetailResponse`:

```typescript
{
  // Core fields (10)
  id: string;
  email: string;
  name: string;
  scope: string;
  tenantId: string | null;
  roleId: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  accountMode: string;
  countryCode: string | null;

  // SCIM Core (12)
  username?: string;
  externalId?: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  nativeGivenName?: string;
  nativeFamilyName?: string;
  nickname?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  profileUrl?: string;
  profilePhotoUrl?: string;

  // Employee Info (4)
  employeeNumber?: string;
  employeeType?: EmployeeType;
  employmentStatus?: EmploymentStatus;
  lifecycleStatus?: AccountLifecycleStatus;

  // Job & Organization (10)
  jobGradeId?: string;
  jobTitle?: string;
  jobTitleEn?: string;
  jobCode?: string;
  jobFamily?: JobFamily;
  organizationUnitId?: string;
  costCenter?: string;
  managerAdminId?: string;
  dottedLineManagerId?: string;
  directReportsCount?: number;

  // Partner (3)
  partnerCompanyId?: string;
  partnerEmployeeId?: string;
  partnerContractEndDate?: Date;

  // JML - Joiner (6)
  hireDate?: Date;
  originalHireDate?: Date;
  startDate?: Date;
  onboardingCompletedAt?: Date;
  probationEndDate?: Date;
  probationStatus?: ProbationStatus;

  // JML - Mover (3)
  lastRoleChangeAt?: Date;
  lastPromotionDate?: Date;
  lastTransferDate?: Date;

  // JML - Leaver (6)
  terminationDate?: Date;
  lastWorkingDay?: Date;
  terminationReason?: string;
  terminationType?: string;
  eligibleForRehire?: boolean;
  exitInterviewCompleted?: boolean;

  // Contact (6)
  phoneNumber?: string;
  phoneCountryCode?: string;
  mobileNumber?: string;
  mobileCountryCode?: string;
  workPhone?: string;
  emergencyContact?: Record<string, any>;

  // Relations (3)
  role?: {
    id: string;
    name: string;
    displayName: string;
    level: number;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
  };
}
```

## 5. Services Architecture

### 5.1. AdminProfileService

Located at: `src/admin/services/admin-profile.service.ts`

**Methods** (9):

- `getAdminDetail(adminId)`: Fetch complete admin profile with relations
- `mapAdminToDetailResponse(admin)`: Public mapper method for converting Prisma result to DTO
- `updateScimCore(adminId, dto)`: Update SCIM attributes with username uniqueness check
- `updateEmployeeInfo(adminId, dto)`: Update employee information
- `updateJobOrganization(adminId, dto)`: Update job and org details
- `updatePartnerInfo(adminId, dto)`: Update partner information
- `updateJoinerInfo(adminId, dto)`: Update joiner lifecycle attributes
- `updateMoverInfo(adminId, dto)`: Update mover lifecycle attributes
- `updateLeaverInfo(adminId, dto)`: Update leaver lifecycle attributes
- `updateContactInfo(adminId, dto)`: Update contact information
- `updateProfile(adminId, dto)`: Bulk update multiple sections in single transaction

**Key Features**:

- All update methods use single query with `include` for relations
- Direct mapping eliminates unnecessary SELECT after UPDATE
- `mapAdminToDetailResponse` is public for reuse by other services

### 5.2. AdminEnterpriseService

Located at: `src/admin/services/admin-enterprise.service.ts`

**Methods** (12):

- `createNhi(dto, createdBy)`: Create new NHI with validation (prevents HUMAN type)
- `updateNhiAttributes(adminId, dto)`: Update NHI attributes
- `rotateNhiCredentials(adminId)`: Rotate credentials and update timestamp
- `updatePhysicalLocation(adminId, dto)`: Update physical location
- `updateTaxLegalLocation(adminId, dto)`: Update tax/legal location
- `updateAccessControl(adminId, dto)`: Update access control settings
- `updateIdentityVerification(adminId, dto)`: Update verification status
- `verifyIdentity(adminId, dto, verifiedBy)`: Perform verification action with audit trail
- `updateExtensions(adminId, dto)`: Update JSONB extension attributes
- `updateEnterprise(adminId, dto)`: Bulk update multiple enterprise sections
- `listAdmins(query)`: List/search admins with pagination and filters
- `getDefaultNhiRoleId()`: Private helper to get NHI default role
- `getAdminMetadata(adminId)`: Private helper to retrieve metadata for merging

**Key Features**:

- NHI creation validates owner exists and auto-generates random password
- Credential rotation enforces identity type check (NHI only)
- `listAdmins` uses `$transaction` for atomic read of data and count
- All updates include relations in single query (optimized)
- `verifyIdentity` merges verification details into metadata JSONB

## 6. Performance Optimizations

### 6.1. Query Optimization (Applied: 2026-01-16)

**N+1 Query Elimination in `listAdmins`**:

- **Before**: 21+ queries for 20 items (1 initial + 20 × getAdminDetail)
- **After**: 2 queries (1 findMany with relations + 1 count)
- **Method**: Use `$transaction` and direct mapping via `mapAdminToDetailResponse`

**Unnecessary SELECT Removal**:

- **Before**: All `update*` methods called `getAdminDetail` after UPDATE (2 queries each)
- **After**: Single UPDATE with `include` for relations, direct mapping (1 query each)
- **Methods affected**: All 9 AdminProfileService + 7 AdminEnterpriseService update methods

**Bulk Update Consolidation**:

- **Before**: `updateProfile` with 3 sections = 4 queries (3 updates + 1 final select)
- **After**: Single UPDATE merging all sections with `Object.assign` = 1 query
- **Methods**: `updateProfile`, `updateEnterprise`

**Performance Gains**:

- `listAdmins(20 items)`: 91% reduction (21→2 queries)
- `updateScimCore`: 50% reduction (2→1 query)
- `updateProfile(3 sections)`: 75% reduction (4→1 query)

### 6.2. Prisma Configuration

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../node_modules/.prisma/auth-client"
  previewFeatures = ["relationJoins", "typedSql"]
}
```

- **relationJoins**: Enables optimized SQL JOINs instead of N+1 queries
- **typedSql**: Future-proofing for raw SQL with type safety

### 6.3. Database Indexes

Critical indexes on `admins` table:

- `username` (UNIQUE): Fast username lookup for SCIM
- `employee_number` (UNIQUE): Fast employee number lookup
- `manager_admin_id`: Optimizes hierarchy queries
- `organization_unit_id`: Optimizes org unit filtering
- `identity_type`: Optimizes NHI filtering

## 7. gRPC Interface

This service exposes gRPC methods for high-performance internal communication.

Proto: `packages/proto/auth/v1/auth.proto`

| Method                 | Description                       |
| :--------------------- | :-------------------------------- |
| `AdminLogin`           | Admin login (Step 1).             |
| `AdminLoginMfa`        | MFA verification (Step 2).        |
| `AdminValidateSession` | Validate a session token.         |
| `AdminRefreshSession`  | Refresh an expired session.       |
| `AdminLogout`          | Log out and invalidate a session. |

## 8. Events (Outbound)

The service uses the outbox pattern to publish events to Redpanda.

| Event                     | Trigger                                 | Payload                            |
| :------------------------ | :-------------------------------------- | :--------------------------------- |
| `admin.created`           | A new admin account is created.         | Admin ID, email, name, scope       |
| `admin.updated`           | An admin's profile is updated.          | Admin ID, updated fields           |
| `admin.terminated`        | An admin's employment is terminated.    | Admin ID, termination date, reason |
| `nhi.created`             | A new non-human identity is created.    | NHI ID, owner ID, purpose, type    |
| `nhi.credentials.rotated` | An NHI's credentials have been rotated. | NHI ID, rotation timestamp         |

## 9. Testing

### 9.1. Test Coverage

**Unit Tests**: 26 tests across 2 test suites

- `admin-profile.service.spec.ts`: 11 tests
- `admin-enterprise.service.spec.ts`: 15 tests

**Coverage Status**: ✅ All tests passing

**Test Categories**:

- Service initialization
- CRUD operations for all profile sections
- NHI creation with validation (rejects HUMAN type)
- NHI credential rotation
- Bulk profile updates
- List/search with filters
- Error handling (NotFoundException, BadRequestException)

### 9.2. Test Files

Located at: `src/admin/services/`

- `admin-profile.service.spec.ts`
- `admin-enterprise.service.spec.ts`

### 9.3. Mock Strategy

Tests use Vitest mocks for:

- PrismaService (all database operations)
- AdminProfileService (for cross-service dependencies)

## 10. Security Considerations

### 10.1. NHI Security

- NHI cannot be created with `HUMAN` identity type (validation enforced)
- NHI credentials must be rotated within configured interval (default: 90 days)
- NHI must have human owner (enforced via `ownerAdminId`)

### 10.2. Access Control

- All endpoints require AdminAuthGuard
- Security clearance levels enforced at application level
- IP range restrictions stored in `allowedIpRanges` array
- Access end dates enforced via `accessEndDate`

### 10.3. Identity Verification

- KYC/AML verification status tracked with method and level
- Background check status and dates recorded
- Verification audit trail stored in metadata JSONB

## 11. Implementation Files

### Controllers

- `src/admin/controllers/admin-profile.controller.ts`: 10 profile endpoints
- `src/admin/controllers/admin-enterprise.controller.ts`: 11 enterprise endpoints

### Services

- `src/admin/services/admin-profile.service.ts`: Profile management logic
- `src/admin/services/admin-enterprise.service.ts`: Enterprise/NHI management logic

### DTOs

- `src/admin/dto/admin-profile.dto.ts`: Profile request/response DTOs
- `src/admin/dto/admin-enterprise.dto.ts`: Enterprise request/response DTOs

### Types

- `packages/types/src/admin/admin.enums.ts`: 11 enum types
- `packages/types/src/admin/admin.types.ts`: Admin interface (83 fields)

### Tests

- `src/admin/services/admin-profile.service.spec.ts`: 11 tests
- `src/admin/services/admin-enterprise.service.spec.ts`: 15 tests

### Migrations

- `migrations/20260116000006_extend_admins_phase2_core.sql`: Phase 2 schema (83 fields)

---

**Version**: Phase 2 (2026-01-16)
**Last Updated**: Performance optimizations applied, N+1 queries eliminated, all tests passing
_This document is the Single Source of Truth for the auth-service. For a quick summary, see `.ai/services/auth-service.md`._
