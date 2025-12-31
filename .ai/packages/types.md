# @my-girok/types

> Shared TypeScript types - SSOT for all services

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

```typescript
interface Account {
  id: string;
  externalId: string;
  email: string;
  username: string;
  status: AccountStatus;
  mode: AccountMode;
  provider: AuthProvider;
  emailVerified: boolean;
  mfaEnabled: boolean;
  locale: string | null; // On Account, not Profile
  timezone: string | null; // On Account, not Profile
  countryCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface Session {
  id: string;
  accountId: string;
  tokenHash: string;
  refreshToken: string | null;
  deviceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean; // boolean, not enum
  expiresAt: Date;
  lastActivityAt: Date | null;
  createdAt: Date;
}

interface Device {
  id: string;
  accountId: string;
  fingerprint: string;
  name: string | null;
  deviceType: DeviceType;
  isTrusted: boolean; // boolean, not TrustLevel enum
  trustedAt: Date | null;
  pushToken: string | null;
  pushPlatform: PushPlatform | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Profile {
  id: string;
  accountId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  bio: string | null;
  birthDate: Date | null;
  gender: Gender | null;
  countryCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Module Interfaces (Zero Migration Architecture)

```typescript
// Identity Module (identity_db)
interface IIdentityModule {
  readonly accounts: IAccountService;
  readonly sessions: ISessionService;
  readonly devices: IDeviceService;
  readonly profiles: IProfileService;
}

// Auth Module (auth_db)
interface IAuthModule {
  getActiveSanctions(subjectId: string): Promise<Sanction[]>;
  hasSanction(subjectId: string, sanctionType: string): Promise<boolean>;
  getAccountRoles(accountId: string, serviceId?: string): Promise<Role[]>;
  getRolePermissions(roleId: string): Promise<Permission[]>;
  hasPermission(accountId: string, permissionCode: string, serviceId?: string): Promise<boolean>;
}

// Legal Module (legal_db)
interface ILegalModule {
  getRequiredConsents(countryCode: string): Promise<ConsentRequirement[]>;
  getAccountConsents(accountId: string): Promise<AccountConsent[]>;
  recordConsent(dto: RecordConsentDto): Promise<AccountConsent>;
  recordConsents(dtos: RecordConsentDto[]): Promise<AccountConsent[]>;
  withdrawConsent(consentId: string, reason?: string): Promise<void>;
  hasRequiredConsents(accountId: string, countryCode: string): Promise<boolean>;
}

// Full Platform Interface
interface IIdentityPlatform {
  readonly identity: IIdentityModule;
  readonly auth: IAuthModule;
  readonly legal: ILegalModule;
}
```

---

## Auth Types

```typescript
enum Role {
  GUEST,
  USER,
  MANAGER,
  MASTER,
}
enum TokenType {
  ACCESS,
  REFRESH,
  DOMAIN_ACCESS,
}

interface AuthPayload {
  user: UserPayload;
  accessToken: string;
  refreshToken: string;
}

// JWT Types
interface UserJwtPayload {
  sub: string;
  email: string;
  type: 'USER_ACCESS' | 'USER_REFRESH';
  accountMode: 'SERVICE' | 'UNIFIED';
  countryCode: string;
  services: { [slug: string]: { status: string; countries: string[] } };
}

interface AdminJwtPayload {
  sub: string;
  email: string;
  name: string;
  type: 'ADMIN_ACCESS' | 'ADMIN_REFRESH';
  scope: 'SYSTEM' | 'TENANT';
  tenantId?: string;
  roleId: string;
  roleName: string;
  level: number;
  permissions: string[];
}

interface OperatorJwtPayload {
  sub: string;
  email: string;
  name: string;
  type: 'OPERATOR_ACCESS' | 'OPERATOR_REFRESH';
  adminId: string;
  serviceId: string;
  serviceSlug: string;
  countryCode: string;
  permissions: string[];
}

// Type Guards
function isUserPayload(payload: JwtPayloadUnion): payload is UserJwtPayload;
function isAdminPayload(payload: JwtPayloadUnion): payload is AdminJwtPayload;
function isOperatorPayload(payload: JwtPayloadUnion): payload is OperatorJwtPayload;
```

---

## Resume Types

```typescript
enum SectionType {
  SKILLS,
  EXPERIENCE,
  EDUCATION,
  CERTIFICATE,
  KEY_ACHIEVEMENTS,
  APPLICATION_REASON,
  ATTACHMENTS,
  COVER_LETTER,
}
enum DegreeType {
  HIGH_SCHOOL,
  ASSOCIATE_2,
  ASSOCIATE_3,
  BACHELOR,
  MASTER,
  DOCTORATE,
}

interface Resume {
  id: string;
  userId: string;
  title: string;
  name: string;
  email: string;
  sections: ResumeSection[];
  skills: Skill[];
  experiences: Experience[];
  educations: Education[];
}

interface Experience {
  company: string;
  startDate: string;
  finalPosition: string;
  jobTitle: string;
  projects: ExperienceProject[];
}

interface Skill {
  category: string;
  items: SkillItem[];
}
```

---

## Legal Types

```typescript
enum ConsentType {
  TERMS_OF_SERVICE, // Required
  PRIVACY_POLICY, // Required
  MARKETING_EMAIL, // Optional
  MARKETING_PUSH, // Optional
  MARKETING_PUSH_NIGHT, // Korea PIPA
  MARKETING_SMS, // Optional
  PERSONALIZED_ADS, // Optional
  THIRD_PARTY_SHARING, // Optional
  CROSS_BORDER_TRANSFER, // Japan APPI
  CROSS_SERVICE_SHARING, // UNIFIED mode
}

interface AccountConsent {
  id: string;
  accountId: string;
  consentType: ConsentType;
  scope: 'PLATFORM' | 'SERVICE';
  serviceId: string | null;
  countryCode: string;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt: Date | null;
}

type DsrRequestType =
  | 'ACCESS'
  | 'RECTIFICATION'
  | 'ERASURE'
  | 'PORTABILITY'
  | 'RESTRICTION'
  | 'OBJECTION';

interface DsrRequest {
  id: string;
  accountId: string;
  requestType: DsrRequestType;
  status: 'PENDING' | 'VERIFIED' | 'IN_PROGRESS' | 'AWAITING_INFO' | 'COMPLETED' | 'REJECTED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  deadline: Date;
}
```

---

## Common Types

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

---

## Domain Events

> SSOT: `packages/types/src/events/`

```typescript
// Identity Events (SCREAMING_SNAKE_CASE)
type IdentityEventType =
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

**Human docs**: [docs/packages/TYPES.md](../../docs/packages/TYPES.md)
