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

### 4.2. OAuth Provider Configuration

Dynamic OAuth provider management with encrypted credential storage.

#### GET /oauth-config

Get all OAuth provider configurations with masked secrets.

**Access**: MASTER role only
**Response**: `OAuthProviderResponseDto[]`

```typescript
[
  {
    provider: 'GOOGLE',
    enabled: true,
    clientId: 'your-client-id.apps.googleusercontent.com',
    clientSecretMasked: '********cret', // Last 4 chars visible
    callbackUrl: 'https://auth-bff.girok.dev/v1/oauth/google/callback',
    displayName: 'Google',
    description: 'Login with Google',
    updatedAt: '2026-01-16T12:00:00Z',
    updatedBy: 'admin-uuid',
  },
  // ... other providers
];
```

#### GET /oauth-config/enabled

Get list of enabled OAuth providers (public endpoint for dynamic UI rendering).

**Access**: Public (no authentication required)
**Response**: `EnabledProvidersResponseDto`

```typescript
{
  providers: [
    {
      provider: 'GOOGLE',
      displayName: 'Google',
      description: 'Login with Google',
    },
    {
      provider: 'KAKAO',
      displayName: 'Kakao',
      description: 'Login with Kakao',
    },
  ];
}
```

#### PATCH /oauth-config/:provider

Update OAuth provider credentials (clientId, clientSecret, callbackUrl).

**Access**: MASTER role only
**Request**: `UpdateCredentialsDto`

```typescript
{
  clientId?: string;
  clientSecret?: string; // Will be encrypted with AES-256-GCM
  callbackUrl?: string;  // Validated against domain whitelist
}
```

**Response**: `OAuthProviderResponseDto` with masked secret

**Security**:

- Client secret encrypted before storage using AES-256-GCM
- Callback URL validated against whitelist: localhost, girok.dev, auth.girok.dev, auth-bff.girok.dev
- Changes logged via audit service

#### PATCH /oauth-config/:provider/toggle

Enable or disable an OAuth provider.

**Access**: MASTER role only
**Request**: `ToggleProviderDto`

```typescript
{
  enabled: boolean;
}
```

**Response**: Updated provider configuration

**Note**: LOCAL provider cannot be disabled.

#### GET /oauth-config/:provider/status

Check if a specific OAuth provider is enabled (public endpoint).

**Access**: Public
**Response**:

```typescript
{
  provider: 'GOOGLE',
  enabled: true
}
```

### 4.3. Admin Profile Management (Phase 2)

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

### 4.4. Admin Enterprise Management (Phase 2)

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

### 4.5. Organization Management (Phase 2)

This service manages organizational entities that define company structure and relationships.

#### Organization Entities

The organization module provides CRUD APIs for 7 entity types:

| Entity                | Purpose                                         | Key Relations                          |
| :-------------------- | :---------------------------------------------- | :------------------------------------- |
| **Job Grade**         | Define job levels and career tracks             | Used by admins table                   |
| **Organization Unit** | Hierarchical org structure (departments, teams) | Parent-child tree, used by admins      |
| **Legal Entity**      | Legal companies/subsidiaries                    | Has offices, used by admins            |
| **Office**            | Physical office locations                       | Belongs to legal entity, has buildings |
| **Building**          | Buildings within offices                        | Belongs to office, has floors          |
| **Floor**             | Floors within buildings                         | Belongs to building, used by admins    |
| **Partner Company**   | External partner organizations                  | Has service agreements                 |

#### Job Grade API

**Endpoints**:

- `POST /organization/job-grades`: Create job grade
- `GET /organization/job-grades`: List all (filter by jobFamily, track, isActive)
- `GET /organization/job-grades/:id`: Get by ID
- `GET /organization/job-grades/code/:code`: Get by code
- `PATCH /organization/job-grades/:id`: Update job grade
- `DELETE /organization/job-grades/:id`: Delete job grade

**JobFamily Enum**: `ENGINEERING`, `PRODUCT`, `DESIGN`, `MARKETING`, `SALES`, `SUPPORT`, `OPERATIONS`, `FINANCE`, `HR`, `LEGAL`, `EXECUTIVE`

**Example Request** (`CreateJobGradeDto`):

```typescript
{
  code: 'IC5',
  name: 'Senior Engineer',
  jobFamily: 'ENGINEERING',
  level: 5,              // 1-10
  track: 'IC',           // IC or M
  description?: string,
  isActive?: boolean
}
```

#### Organization Unit API

**Endpoints**:

- `POST /organization/org-units`: Create organization unit
- `GET /organization/org-units`: List all (filter by orgType, parentId, isActive)
- `GET /organization/org-units/tree`: Get hierarchical tree structure
- `GET /organization/org-units/:id`: Get by ID
- `GET /organization/org-units/:id/children`: Get direct children
- `PATCH /organization/org-units/:id`: Update organization unit
- `DELETE /organization/org-units/:id`: Delete (only if no children)

**OrgUnitType Enum**: `COMPANY`, `DIVISION`, `DEPARTMENT`, `TEAM`, `SQUAD`, `TRIBE`, `CHAPTER`, `GUILD`

**Example Request** (`CreateOrgUnitDto`):

```typescript
{
  code: 'ENG',
  name: 'Engineering',
  orgType: 'DEPARTMENT',
  parentId?: string,           // Parent org unit ID
  managerAdminId?: string,     // Manager admin ID
  description?: string,
  isActive?: boolean
}
```

**Tree Response** (`OrgUnitTreeNodeDto`):

```typescript
{
  id: string,
  code: string,
  name: string,
  orgType: OrgUnitType,
  parentId?: string,
  managerAdminId?: string,
  children: OrgUnitTreeNodeDto[] // Recursive
}
```

#### Legal Entity API

**Endpoints**:

- `POST /organization/legal-entities`: Create legal entity
- `GET /organization/legal-entities`: List all (filter by countryCode, isActive)
- `GET /organization/legal-entities/:id`: Get by ID
- `PATCH /organization/legal-entities/:id`: Update legal entity
- `DELETE /organization/legal-entities/:id`: Delete legal entity

**Example Request** (`CreateLegalEntityDto`):

```typescript
{
  code: 'BEEGY-KR',
  name: 'Beegy Korea Inc.',
  legalName: 'Beegy Korea Inc.',
  countryCode: 'KR',
  taxId?: string,
  registeredAddress?: string,
  description?: string,
  isActive?: boolean
}
```

#### Office API

**Endpoints**:

- `POST /organization/offices`: Create office
- `GET /organization/offices`: List all (filter by officeType, legalEntityId, countryCode, isActive)
- `GET /organization/offices/:id`: Get by ID
- `GET /organization/offices/:id/buildings`: Get buildings for this office
- `PATCH /organization/offices/:id`: Update office
- `DELETE /organization/offices/:id`: Delete office

**OfficeType Enum**: `HEADQUARTERS`, `BRANCH`, `SATELLITE`, `REMOTE`, `COWORKING`

**Example Request** (`CreateOfficeDto`):

```typescript
{
  code: 'SEL-HQ',
  name: 'Seoul Headquarters',
  officeType: 'HEADQUARTERS',
  legalEntityId: string,    // Must exist
  countryCode: 'KR',
  city?: string,
  address?: string,
  phoneNumber?: string,
  description?: string,
  isActive?: boolean
}
```

#### Building API

**Endpoints**:

- `POST /organization/buildings`: Create building
- `GET /organization/buildings`: List all (filter by officeId, isActive)
- `GET /organization/buildings/:id`: Get by ID
- `GET /organization/buildings/:id/floors`: Get floors for this building
- `PATCH /organization/buildings/:id`: Update building
- `DELETE /organization/buildings/:id`: Delete building

**Example Request** (`CreateBuildingDto`):

```typescript
{
  code: 'SEL-A',
  name: 'Building A',
  officeId: string,      // Must exist
  address?: string,
  totalFloors?: number,
  description?: string,
  isActive?: boolean
}
```

#### Floor API

**Endpoints**:

- `POST /organization/floors`: Create floor
- `GET /organization/floors`: List all (filter by buildingId, isActive)
- `GET /organization/floors/:id`: Get by ID
- `PATCH /organization/floors/:id`: Update floor
- `DELETE /organization/floors/:id`: Delete floor

**Example Request** (`CreateFloorDto`):

```typescript
{
  code: 'SEL-A-5F',
  name: '5th Floor',
  buildingId: string,     // Must exist
  floorNumber: number,
  floorArea?: number,
  description?: string,
  isActive?: boolean
}
```

#### Partner Company API

**Endpoints**:

- `POST /organization/partner-companies`: Create partner company
- `GET /organization/partner-companies`: List all (filter by partnerType, isActive)
- `GET /organization/partner-companies/:id`: Get by ID
- `GET /organization/partner-companies/:id/agreements`: Get service agreements
- `PATCH /organization/partner-companies/:id`: Update partner company
- `DELETE /organization/partner-companies/:id`: Delete partner company

**PartnerType Enum**: `VENDOR`, `CONTRACTOR`, `CONSULTANT`, `AGENCY`, `SUPPLIER`, `PARTNER`

**Example Request** (`CreatePartnerCompanyDto`):

```typescript
{
  code: 'ACME',
  name: 'ACME Corporation',
  partnerType: 'VENDOR',
  contactEmail?: string,
  contactPhone?: string,
  contactPerson?: string,
  taxId?: string,
  address?: string,
  description?: string,
  isActive?: boolean
}
```

### 4.6. AdminDetailResponse Structure

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

### 5.3. Organization Services (Phase 2)

Located at: `src/organization/services/`

The organization module provides 7 services for managing organizational entities:

#### JobGradeService

**Methods**: `create`, `findAll`, `findOne`, `findByCode`, `update`, `remove`

**Features**:

- Code uniqueness validation
- Filter by jobFamily, track, isActive
- Sort by level ascending, then track

#### OrgUnitService

**Methods**: `create`, `findAll`, `findTree`, `findOne`, `findChildren`, `update`, `remove`

**Features**:

- Hierarchical tree structure with recursive `buildTree` method
- Parent-child validation (no self-parent, no circular references)
- Cannot delete unit with children
- Filter by orgType, parentId, isActive

#### LegalEntityService

**Methods**: `create`, `findAll`, `findOne`, `update`, `remove`

**Features**:

- Code uniqueness validation
- Filter by countryCode, isActive

#### OfficeService

**Methods**: `create`, `findAll`, `findOne`, `findBuildings`, `update`, `remove`

**Features**:

- Validates legalEntity exists before creating
- `findBuildings` returns related buildings
- Filter by officeType, legalEntityId, countryCode, isActive

#### BuildingService

**Methods**: `create`, `findAll`, `findOne`, `findFloors`, `update`, `remove`

**Features**:

- Validates office exists before creating
- `findFloors` returns related floors
- Filter by officeId, isActive

#### FloorService

**Methods**: `create`, `findAll`, `findOne`, `update`, `remove`

**Features**:

- Validates building exists before creating
- Sorted by floor_number ascending
- Filter by buildingId, isActive

#### PartnerCompanyService

**Methods**: `create`, `findAll`, `findOne`, `findAgreements`, `update`, `remove`

**Features**:

- Code uniqueness validation
- `findAgreements` returns partner service agreements
- Filter by partnerType, isActive

**Common Patterns**:

- All services use snake_case for database fields, camelCase for DTOs
- All services have private `mapToResponse` method for DB-to-DTO conversion
- All create methods check for duplicate codes (ConflictException)
- All findOne methods throw NotFoundException when not found
- All services inject PrismaService for database operations

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

**Admin Module**: 26 tests across 2 test suites

- `admin-profile.service.spec.ts`: 11 tests
- `admin-enterprise.service.spec.ts`: 15 tests

**Organization Module**: 73 tests across 7 test suites

- `job-grade.service.spec.ts`: 14 tests
- `org-unit.service.spec.ts`: 16 tests
- `legal-entity.service.spec.ts`: 11 tests
- `office.service.spec.ts`: 9 tests
- `building.service.spec.ts`: 7 tests
- `floor.service.spec.ts`: 7 tests
- `partner-company.service.spec.ts`: 9 tests

**Total**: 99 tests across 9 test suites

**Coverage Status**: ✅ All tests passing

- Organization services: 84.22% overall coverage (exceeds 80% target)
- Individual service coverage: 62-97% (varies by service)

**Test Categories**:

- Service initialization
- CRUD operations for all sections
- Code uniqueness validation (ConflictException)
- Foreign key validation (NotFoundException)
- Hierarchical tree operations (OrgUnitService)
- Relationship queries (findBuildings, findFloors, findAgreements)
- Filter and query parameter validation
- Error handling (NotFoundException, ConflictException, BadRequestException)

### 9.2. Test Files

**Admin Tests**: `src/admin/services/`

- `admin-profile.service.spec.ts`
- `admin-enterprise.service.spec.ts`

**Organization Tests**: `src/organization/services/`

- `job-grade.service.spec.ts`
- `org-unit.service.spec.ts`
- `legal-entity.service.spec.ts`
- `office.service.spec.ts`
- `building.service.spec.ts`
- `floor.service.spec.ts`
- `partner-company.service.spec.ts`

### 9.3. Mock Strategy

Tests use Vitest mocks for:

- PrismaService (all database operations)
- AdminProfileService (for cross-service dependencies)
- All organization entity tables (job_grade, organization_unit, legal_entity, office, building, floor, partner_company)

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

### Admin Module

**Controllers**:

- `src/admin/controllers/admin-profile.controller.ts`: 10 profile endpoints
- `src/admin/controllers/admin-enterprise.controller.ts`: 11 enterprise endpoints

**Services**:

- `src/admin/services/admin-profile.service.ts`: Profile management logic
- `src/admin/services/admin-enterprise.service.ts`: Enterprise/NHI management logic

**DTOs**:

- `src/admin/dto/admin-profile.dto.ts`: Profile request/response DTOs
- `src/admin/dto/admin-enterprise.dto.ts`: Enterprise request/response DTOs

**Tests**:

- `src/admin/services/admin-profile.service.spec.ts`: 11 tests
- `src/admin/services/admin-enterprise.service.spec.ts`: 15 tests

### Organization Module

**Module Registration**:

- `src/organization/organization.module.ts`: Module definition with 7 services and 7 controllers
- Registered in `src/app.module.ts`

**Controllers**: `src/organization/controllers/` (41 endpoints total)

- `job-grade.controller.ts`: 6 endpoints
- `org-unit.controller.ts`: 7 endpoints (includes tree and children)
- `legal-entity.controller.ts`: 5 endpoints
- `office.controller.ts`: 6 endpoints (includes buildings relation)
- `building.controller.ts`: 6 endpoints (includes floors relation)
- `floor.controller.ts`: 5 endpoints
- `partner-company.controller.ts`: 6 endpoints (includes agreements relation)

**Services**: `src/organization/services/`

- `job-grade.service.ts`: JobGrade CRUD with code lookup
- `org-unit.service.ts`: OrgUnit CRUD with tree structure
- `legal-entity.service.ts`: LegalEntity CRUD
- `office.service.ts`: Office CRUD with buildings relation
- `building.service.ts`: Building CRUD with floors relation
- `floor.service.ts`: Floor CRUD
- `partner-company.service.ts`: PartnerCompany CRUD with agreements relation

**DTOs**: `src/organization/dto/`

- `job-grade.dto.ts`: JobGrade DTOs with JobFamily enum
- `org-unit.dto.ts`: OrgUnit DTOs with OrgUnitType enum and tree structure
- `legal-entity.dto.ts`: LegalEntity DTOs
- `office.dto.ts`: Office DTOs with OfficeType enum
- `building.dto.ts`: Building DTOs
- `floor.dto.ts`: Floor DTOs
- `partner-company.dto.ts`: PartnerCompany DTOs with PartnerType enum

**Tests**: `src/organization/services/` (73 tests total)

- `job-grade.service.spec.ts`: 14 tests
- `org-unit.service.spec.ts`: 16 tests
- `legal-entity.service.spec.ts`: 11 tests
- `office.service.spec.ts`: 9 tests
- `building.service.spec.ts`: 7 tests
- `floor.service.spec.ts`: 7 tests
- `partner-company.service.spec.ts`: 9 tests

### 4.6. Attendance Management (Phase 3)

Manage admin clock-in/out, work schedules, and overtime.

#### POST /attendance/clock-in

Clock in for the day.

**Request**: `ClockInDto`

```typescript
{
  date: Date;
  workType?: 'OFFICE' | 'REMOTE' | 'HYBRID' | 'FIELD' | 'BUSINESS_TRIP' | 'CLIENT_SITE' | 'TRAINING';
  officeId?: string;
  remoteLocation?: string;
  location?: { lat: number; lng: number; address?: string };
  notes?: string;
}
```

**Response**: `AttendanceResponseDto`

#### POST /attendance/clock-out

Clock out for the day.

**Request**: `ClockOutDto`

```typescript
{
  date: Date;
  overtimeMinutes?: number;
  overtimeReason?: string;
  location?: { lat: number; lng: number; address?: string };
  notes?: string;
}
```

#### GET /attendance/me

Get my attendance records with pagination.

**Query**: `AdminAttendanceQueryDto` (page, limit, status, workType, startDate, endDate)

#### GET /attendance/me/stats

Get my attendance statistics.

**Query**: `startDate`, `endDate`

**Response**: `AttendanceStatsDto` (totalDays, presentDays, absentDays, lateDays, remoteDays, totalOvertimeMinutes, averageWorkMinutes)

#### PATCH /attendance/:id/approve-overtime

Approve overtime request (manager).

**Request**: `ApproveOvertimeDto`

```typescript
{
  approved: boolean;
  managerNotes?: string;
}
```

#### Work Schedule APIs

- `POST /work-schedules`: Create work schedule
- `GET /work-schedules/me`: Get my work schedules
- `GET /work-schedules/me/active`: Get my active schedule
- `GET /work-schedules/:id`: Get schedule by ID
- `PATCH /work-schedules/:id`: Update schedule
- `DELETE /work-schedules/:id`: Delete schedule

### 4.7. Leave Management (Phase 3)

Manage leave requests, approvals, and balances.

#### POST /leaves

Create a new leave request (draft).

**Request**: `CreateLeaveDto`

```typescript
{
  leaveType: 'ANNUAL' | 'SICK' | 'PARENTAL' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'MARRIAGE' | 'UNPAID' | 'COMPENSATORY' | 'PUBLIC_HOLIDAY' | 'SABBATICAL' | 'JURY_DUTY' | 'MILITARY' | 'STUDY' | 'PERSONAL' | 'EMERGENCY';
  startDate: Date;
  endDate: Date;
  startHalf?: 'AM' | 'PM';
  endHalf?: 'AM' | 'PM';
  daysCount: number;  // 0.5 for half day
  reason?: string;
  emergencyContact?: string;
  handoverTo?: string;
  handoverNotes?: string;
  attachmentUrls?: string[];
}
```

#### POST /leaves/:id/submit

Submit a leave request for approval.

**Request**: `SubmitLeaveDto`

```typescript
{
  firstApproverId?: string;
  secondApproverId?: string;
}
```

#### POST /leaves/:id/approve

Approve or reject a leave request (manager).

**Request**: `ApproveLeaveDto`

```typescript
{
  approvalStatus: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}
```

#### POST /leaves/:id/cancel

Cancel a leave request.

**Request**: `CancelLeaveDto`

```typescript
{
  cancellationReason: string;
}
```

#### GET /leaves/me

Get my leave requests with pagination.

#### GET /leaves/pending-approvals

Get pending leave approvals for me (manager).

#### Leave Balance APIs

- `POST /leave-balances`: Create leave balance (HR)
- `GET /leave-balances/me`: Get my current leave balance
- `GET /leave-balances/me/:year`: Get my balance for specific year
- `GET /leave-balances/:adminId/:year`: Get admin balance (HR/Manager)
- `PATCH /leave-balances/:adminId/:year/adjust`: Adjust balance (HR)
- `POST /leave-balances/:adminId/:year/recalculate`: Recalculate based on approved leaves
- `POST /leave-balances/:adminId/:year/initialize`: Initialize for new year

## 12. Attendance Module Implementation

### Attendance Service

**Location**: `src/attendance/services/attendance.service.ts`

**Methods**: `clockIn`, `clockOut`, `approveOvertime`, `getAttendanceByDate`, `listAttendances`, `getStats`

**Features**:

- Conflict detection (already clocked in/out)
- Automatic work minutes calculation
- Overtime request tracking
- IP address and location logging
- Statistics aggregation

### Work Schedule Service

**Location**: `src/attendance/services/work-schedule.service.ts`

**Methods**: `create`, `findByAdmin`, `findActiveByAdmin`, `findOne`, `update`, `remove`

**Features**:

- Auto-deactivate previous schedules
- Support for Standard, Shift, and Flexible schedules
- Configurable weekly hours and core hours

### Tests (Attendance Module)

**Coverage**: 80%+ across all services

- `attendance.service.spec.ts`: 45 tests
- `work-schedule.service.spec.ts`: 18 tests

## 13. Leave Module Implementation

### Leave Service

**Location**: `src/leave/services/leave.service.ts`

**Methods**: `create`, `submit`, `approve`, `cancel`, `findOne`, `list`, `getPendingApprovals`

**Features**:

- Overlap detection (prevents double-booking)
- Multi-level approval workflow (first + second approver)
- Automatic leave balance deduction on approval
- Balance restoration on cancellation
- Leave status transitions (Draft → Pending → Approved/Rejected/Cancelled)

### Leave Balance Service

**Location**: `src/leave/services/leave-balance.service.ts`

**Methods**: `create`, `getBalance`, `getCurrentBalance`, `adjust`, `recalculate`, `initializeForNewYear`

**Features**:

- Annual, sick, compensatory, special leave tracking
- Carryover from previous year (max 5 days)
- Tenure bonus calculation (3/5/10 years)
- Manual adjustment with audit trail
- Automatic recalculation based on approved leaves

### Tests (Leave Module)

**Coverage**: 80%+ across all services

- `leave.service.spec.ts`: 42 tests
- `leave-balance.service.spec.ts`: 24 tests

### Shared Types

- `packages/types/src/admin/admin.enums.ts`: 11 admin enum types
- `packages/types/src/admin/admin.types.ts`: Admin interface (83 fields)

### Migrations

- `migrations/20260116000006_extend_admins_phase2_core.sql`: Phase 2 schema (83 fields)
- `migrations/20260117000007_add_attendance.sql`: Phase 3 attendance tables (admin_attendances, admin_work_schedules)
- `migrations/20260117000008_add_leave_management.sql`: Phase 3 leave tables (admin_leaves, admin_leave_balances, leave_policies, public_holidays)

---

**Version**: Phase 3 (2026-01-17)
**Last Updated**: HR Backend APIs implemented (Attendance + Leave Management)
**Status**:

- Admin Profile & Enterprise APIs: Complete (26 tests, 100% passing)
- Organization APIs: Complete (73 tests, 84.22% coverage, 100% passing)
- **Attendance APIs: Complete (63 tests, 80%+ coverage)** ✨ NEW
- **Leave Management APIs: Complete (66 tests, 80%+ coverage)** ✨ NEW
- Total: 1,252+ tests passing across entire auth-service

**Phase 3 Highlights**:

- 6 new tables: admin_attendances, admin_work_schedules, admin_leaves, admin_leave_balances, leave_policies, public_holidays
- 30+ new endpoints for attendance and leave management
- 129 new tests (attendance + leave)
- Comprehensive approval workflows with multi-level authorization
- Automatic balance calculation and carryover management

_This document is the Single Source of Truth for the auth-service. For a quick summary, see `.ai/services/auth-service.md`._
