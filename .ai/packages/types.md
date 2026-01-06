# @my-girok/types

> Shared TypeScript types - SSOT for all services | **Last Updated**: 2026-01-06

## Structure

```
packages/types/src/
├── auth/        # Role, AuthProvider, DTOs
├── user/        # User, Session, AccountLink
├── admin/       # Operator, Permission
├── service/     # Service, Consent (Global Account)
├── resume/      # Resume, Experience, Skill
├── legal/       # ConsentType, Documents
├── identity/    # Identity Platform types (NEW)
├── events/      # Domain events
├── common/      # ApiResponse, Pagination
└── index.ts
```

---

## Identity Platform Types

> SSOT: `packages/types/src/identity/`

### Enums (Synced with Prisma)

```typescript
// Account status
type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'DELETED';

// Account mode (Global Account)
type AccountMode = 'SERVICE' | 'UNIFIED';

// Auth provider
type AuthProvider = 'LOCAL' | 'GOOGLE' | 'KAKAO' | 'NAVER' | 'APPLE' | 'MICROSOFT' | 'GITHUB';

// Device type (simplified from Prisma)
type DeviceType = 'WEB' | 'IOS' | 'ANDROID' | 'DESKTOP' | 'OTHER';

// Push notification platform
type PushPlatform = 'FCM' | 'APNS' | 'WEB_PUSH';

// Gender
type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

// Outbox event status
type OutboxStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
```

### Core Entities

| Entity    | Key Fields                                        | Note                       |
| --------- | ------------------------------------------------- | -------------------------- |
| `Account` | id, email, username, status, mode, mfaEnabled     | locale/timezone on Account |
| `Session` | id, accountId, tokenHash, expiresAt, isActive     | boolean (not enum)         |
| `Device`  | id, accountId, fingerprint, deviceType, isTrusted | boolean (not TrustLevel)   |
| `Profile` | id, accountId, displayName, gender, birthDate     |                            |

### Module Interfaces

| Interface           | DB          | Key Methods                           |
| ------------------- | ----------- | ------------------------------------- |
| `IIdentityModule`   | identity_db | accounts, sessions, devices, profiles |
| `IAuthModule`       | auth_db     | getActiveSanctions, hasPermission     |
| `ILegalModule`      | legal_db    | getAccountConsents, recordConsent     |
| `IIdentityPlatform` | -           | Aggregates all 3 modules              |

**Full definitions**: `packages/types/src/identity/interfaces.ts`

---

## Auth Module Interfaces

> SSOT: `packages/types/src/auth/interfaces.ts`

### IRoleService

```typescript
interface IRoleService {
  findAll(query: RoleQueryDto): Promise<PaginatedResponse<Role>>;
  findById(id: string): Promise<Role>;
  create(dto: CreateRoleDto): Promise<Role>;
  update(id: string, dto: UpdateRoleDto): Promise<Role>;
  delete(id: string): Promise<void>;
  assignPermissions(roleId: string, permissionIds: string[]): Promise<void>;
  revokePermissions(roleId: string, permissionIds: string[]): Promise<void>;
}
```

### IPermissionService

```typescript
interface IPermissionService {
  findAll(query: PermissionQueryDto): Promise<PaginatedResponse<Permission>>;
  findById(id: string): Promise<Permission>;
  create(dto: CreatePermissionDto): Promise<Permission>;
  update(id: string, dto: UpdatePermissionDto): Promise<Permission>;
  delete(id: string): Promise<void>;
  findByCategory(category: string): Promise<Permission[]>;
}
```

### ISanctionService

```typescript
interface ISanctionService {
  create(dto: CreateSanctionDto): Promise<Sanction>;
  findById(id: string): Promise<Sanction>;
  findAll(query: SanctionQueryDto): Promise<PaginatedResponse<Sanction>>;
  update(id: string, dto: UpdateSanctionDto): Promise<Sanction>;
  revoke(id: string, reason?: string): Promise<void>;
  getActiveBySubject(subjectId: string): Promise<Sanction[]>;
  createAppeal(sanctionId: string, dto: CreateAppealDto): Promise<Appeal>;
}
```

### IOperatorService

```typescript
interface IOperatorService {
  createInvitation(dto: CreateInvitationDto): Promise<Invitation>;
  acceptInvitation(token: string, accountId: string): Promise<Operator>;
  createDirect(dto: CreateOperatorDto): Promise<Operator>;
  findById(id: string): Promise<Operator>;
  update(id: string, dto: UpdateOperatorDto): Promise<Operator>;
  deactivate(id: string): Promise<void>;
  findAll(query: OperatorQueryDto): Promise<PaginatedResponse<Operator>>;
}
```

---

## Legal Module Interfaces

> SSOT: `packages/types/src/legal/interfaces.ts`

### IConsentService

```typescript
interface IConsentService {
  grant(dto: GrantConsentDto): Promise<Consent>;
  grantBulk(dto: GrantBulkConsentsDto): Promise<Consent[]>;
  withdraw(id: string, reason?: string): Promise<void>;
  findById(id: string): Promise<Consent>;
  findByAccount(accountId: string): Promise<Consent[]>;
  findAll(query: ConsentQueryDto): Promise<PaginatedResponse<Consent>>;
  hasRequiredConsents(accountId: string, countryCode: string): Promise<boolean>;
}
```

### IDSRService

```typescript
interface IDSRService {
  create(dto: CreateDsrRequestDto): Promise<DsrRequest>;
  findById(id: string): Promise<DsrRequest>;
  update(id: string, dto: UpdateDsrRequestDto): Promise<DsrRequest>;
  complete(id: string, dto: CompleteDsrRequestDto): Promise<DsrRequest>;
  findAll(query: DsrQueryDto): Promise<PaginatedResponse<DsrRequest>>;
  getDeadline(requestId: string): Promise<Date>;
}
```

### ILegalDocumentService

```typescript
interface ILegalDocumentService {
  create(dto: CreateLegalDocumentDto): Promise<LegalDocument>;
  findById(id: string): Promise<LegalDocument>;
  findCurrent(type: string, countryCode?: string): Promise<LegalDocument>;
  findAll(query: LegalDocumentQueryDto): Promise<PaginatedResponse<LegalDocument>>;
}
```

### ILawService

```typescript
interface ILawService {
  create(dto: CreateLawDto): Promise<Law>;
  findById(id: string): Promise<Law>;
  findByCode(code: string): Promise<Law>;
  findByCountry(countryCode: string): Promise<Law[]>;
  update(code: string, dto: UpdateLawDto): Promise<Law>;
  findAll(query: LawQueryDto): Promise<PaginatedResponse<Law>>;
}
```

---

## Auth Types

```typescript
// Enums
type Role = 'GUEST' | 'USER' | 'MANAGER' | 'MASTER';
type TokenType = 'ACCESS' | 'REFRESH' | 'DOMAIN_ACCESS';

// JWT Payloads (key fields only)
// UserJwtPayload: sub, email, type, accountMode, countryCode, services
// AdminJwtPayload: sub, email, type, scope, roleId, level, permissions
// OperatorJwtPayload: sub, email, type, serviceId, countryCode, permissions

// Type Guards: isUserPayload(), isAdminPayload(), isOperatorPayload()

// Sanction Enums
type SanctionSubjectType = 'ACCOUNT' | 'OPERATOR';
type SanctionScope = 'PLATFORM' | 'SERVICE';
type SanctionType = 'WARNING' | 'TEMPORARY_BAN' | 'PERMANENT_BAN' | 'FEATURE_RESTRICTION';
type SanctionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
type SanctionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type IssuerType = 'ADMIN' | 'OPERATOR' | 'SYSTEM';
type AppealStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
```

---

## Resume Types

```typescript
// Enums
type SectionType =
  | 'SKILLS'
  | 'EXPERIENCE'
  | 'EDUCATION'
  | 'CERTIFICATE'
  | 'KEY_ACHIEVEMENTS'
  | 'APPLICATION_REASON'
  | 'ATTACHMENTS'
  | 'COVER_LETTER';
type DegreeType =
  | 'HIGH_SCHOOL'
  | 'ASSOCIATE_2'
  | 'ASSOCIATE_3'
  | 'BACHELOR'
  | 'MASTER'
  | 'DOCTORATE';

// Entities: Resume, Experience, Skill, Education (see packages/types/src/resume/)
```

---

## Legal Types

```typescript
// Consent Types
type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY' // Required
  | 'MARKETING_EMAIL'
  | 'MARKETING_PUSH' // Optional
  | 'MARKETING_PUSH_NIGHT'
  | 'MARKETING_SMS' // Korea PIPA
  | 'PERSONALIZED_ADS'
  | 'THIRD_PARTY_SHARING' // Optional
  | 'CROSS_BORDER_TRANSFER'
  | 'CROSS_SERVICE_SHARING'; // APPI, UNIFIED

type ConsentScope = 'SERVICE' | 'PLATFORM';
type ConsentLogAction = 'GRANTED' | 'WITHDRAWN' | 'UPDATED' | 'EXPIRED' | 'MIGRATED';

// DSR (Data Subject Request) Types
type DsrRequestType =
  | 'ACCESS'
  | 'RECTIFICATION'
  | 'ERASURE'
  | 'PORTABILITY'
  | 'RESTRICTION'
  | 'OBJECTION'
  | 'AUTOMATED_DECISION';
type DsrStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'IN_PROGRESS'
  | 'AWAITING_INFO'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';
type DsrPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type DsrResponseType = 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'DENIED' | 'EXTENDED';
```

---

## Common Types

```typescript
// API Response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Outbox Pattern
type OutboxStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface OutboxEventPayload {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

interface OutboxEvent extends OutboxEventPayload {
  id: string;
  status: OutboxStatus;
  retryCount: number;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
}
```

---

## Domain Events

> SSOT: `packages/types/src/events/`

```typescript
// Identity Events (SCREAMING_SNAKE_CASE)
type IdentityEventType =
  | 'USER_REGISTERED' // Registration saga completed
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_UPDATED'
  | 'ACCOUNT_DELETED'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'DEVICE_REGISTERED'
  | 'DEVICE_TRUSTED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED';

// Auth Events
type AuthEventType =
  | 'ROLE_ASSIGNED'
  | 'ROLE_REVOKED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'SANCTION_APPLIED'
  | 'SANCTION_REVOKED'
  | 'SANCTION_APPEALED';

// Legal Events
type LegalEventType =
  | 'CONSENT_GRANTED'
  | 'CONSENT_WITHDRAWN'
  | 'DSR_REQUEST_SUBMITTED'
  | 'DSR_REQUEST_COMPLETED';
```

### Event Payloads

| Event                   | Payload Fields                                                      |
| ----------------------- | ------------------------------------------------------------------- |
| `USER_REGISTERED`       | `accountId`, `email`, `displayName`, `countryCode`, `consents[]`    |
| `ACCOUNT_CREATED`       | `accountId`, `email`, `username`, `status`, `provider`              |
| `ACCOUNT_UPDATED`       | `accountId`, `changes: { field, old, new }[]`                       |
| `ACCOUNT_DELETED`       | `accountId`, `deletedAt`, `reason`                                  |
| `SESSION_STARTED`       | `sessionId`, `accountId`, `deviceId`, `ipAddress`                   |
| `SESSION_ENDED`         | `sessionId`, `accountId`, `reason`                                  |
| `DEVICE_REGISTERED`     | `deviceId`, `accountId`, `fingerprint`, `deviceType`                |
| `DEVICE_TRUSTED`        | `deviceId`, `accountId`, `trustedAt`                                |
| `MFA_ENABLED`           | `accountId`, `method` (TOTP/SMS/EMAIL)                              |
| `MFA_DISABLED`          | `accountId`, `disabledAt`                                           |
| `ROLE_ASSIGNED`         | `operatorId`, `roleId`, `assignedBy`                                |
| `ROLE_REVOKED`          | `operatorId`, `roleId`, `revokedBy`                                 |
| `SANCTION_APPLIED`      | `sanctionId`, `subjectId`, `type`, `severity`, `expiresAt`          |
| `SANCTION_REVOKED`      | `sanctionId`, `subjectId`, `revokedBy`, `reason`                    |
| `CONSENT_GRANTED`       | `consentId`, `accountId`, `consentType`, `scope`, `documentVersion` |
| `CONSENT_WITHDRAWN`     | `consentId`, `accountId`, `consentType`, `reason`                   |
| `DSR_REQUEST_SUBMITTED` | `requestId`, `accountId`, `requestType`, `deadline`                 |
| `DSR_REQUEST_COMPLETED` | `requestId`, `accountId`, `responseType`, `completedAt`             |

### Event Base Structure

```typescript
interface DomainEvent<T = unknown> {
  id: string; // UUIDv7
  eventType: string; // SCREAMING_SNAKE_CASE
  aggregateType: string; // Account, Session, etc.
  aggregateId: string; // UUIDv7
  payload: T;
  metadata: {
    correlationId?: string; // For tracing across services
    causationId?: string; // Parent event ID
    timestamp: Date;
    version: number;
  };
}
```

---

## Proto-Generated Types

> SSOT: `packages/types/src/generated/proto/`

Auto-generated from proto files via `pnpm generate` in `packages/proto/`.

### Structure

```
packages/types/src/generated/proto/
├── identity/v1/
│   ├── identity_pb.d.ts      # TypeScript definitions
│   ├── identity_pb.js        # Runtime code
│   ├── identity_pb.client.d.ts  # Client stubs
│   └── identity_pb.client.js
├── auth/v1/
│   ├── auth_pb.d.ts
│   ├── auth_pb.js
│   ├── auth_pb.client.d.ts
│   └── auth_pb.client.js
├── legal/v1/
│   └── ... (same structure)
└── google/protobuf/
    └── timestamp_pb.{d.ts,js}
```

### Generated Types per Package

| Package       | Message Types                                      |
| ------------- | -------------------------------------------------- |
| `identity.v1` | Account, Session, Device, Profile, Timestamp       |
| `auth.v1`     | Role, Permission, Operator, Sanction               |
| `legal.v1`    | Consent, LegalDocument, DsrRequest, LawRequirement |

### Regenerating Types

```bash
cd packages/proto
pnpm generate
```

### Usage Note

These types are primarily used by `@my-girok/nest-common` gRPC clients.
For application code, prefer the hand-written types in `packages/types/src/`.

---

## Usage

```typescript
import {
  // Identity Platform
  Account,
  Session,
  Device,
  Profile,
  AccountStatus,
  DeviceType,
  IIdentityModule,
  IAuthModule,
  ILegalModule,
  // Auth
  Role,
  UserJwtPayload,
  // Legal
  ConsentType,
  AccountConsent,
  // Common
  ApiResponse,
  PaginatedResponse,
} from '@my-girok/types';
```

---

## Commands

```bash
pnpm --filter @my-girok/types build
```

---

**Full guide**: `docs/en/packages/TYPES.md`
