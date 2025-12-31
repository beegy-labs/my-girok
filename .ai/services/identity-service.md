# Identity Service

> Multi-app user management platform with Zero Migration architecture

## Purpose

Central identity platform for N apps with shared user management:

- **my-girok** (api.girok.dev)
- **vero** (api.vero.dev)
- Future apps...

---

## Architecture: Zero Migration

### Core Principle

**Combined Service, Pre-Separated DBs, Interface-Based Communication**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   identity-service (Single Deployment)                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        NestJS Application                         │  │
│  │  ┌─────────────┬─────────────────┬───────────────┐               │  │
│  │  │  Identity   │      Auth       │     Legal     │               │  │
│  │  │   Module    │     Module      │    Module     │               │  │
│  │  │             │                 │               │               │  │
│  │  │ - Accounts  │ - Roles         │ - Consents    │               │  │
│  │  │ - Sessions  │ - Permissions   │ - Documents   │               │  │
│  │  │ - Devices   │ - Operators     │ - Law Registry│               │  │
│  │  │ - Profiles  │ - Sanctions     │ - DSR         │               │  │
│  │  └──────┬──────┴────────┬────────┴───────┬───────┘               │  │
│  │         │ In-Process    │ In-Process     │ In-Process            │  │
│  └─────────┼───────────────┼────────────────┼───────────────────────┘  │
│            ▼               ▼                ▼                          │
│      identity_db       auth_db          legal_db  ← Pre-Separated      │
│            │               │                │                          │
│            └───────────────┼────────────────┘                          │
│                            ▼                                           │
│                     Outbox Tables → (Future: Redpanda CDC)             │
└─────────────────────────────────────────────────────────────────────────┘

                        ⬇️ Hardware Added (Zero Code Change)

┌─────────────────────────────────────────────────────────────────────────┐
│                    Separated Services (Same Interfaces)                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │ identity-svc    │   │    auth-svc     │   │   legal-svc     │       │
│  │ IIdentityModule │   │   IAuthModule   │   │  ILegalModule   │       │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘       │
│           │ gRPC               │ gRPC               │ gRPC            │
│           ▼                    ▼                    ▼                  │
│      identity_db           auth_db             legal_db ← Same DBs     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Zero Migration Guarantee

| Phase      | Services  | Communication | Event Broker | Code Change |
| ---------- | --------- | ------------- | ------------ | ----------- |
| 1 (Now)    | Combined  | In-Process    | Polling      | -           |
| 2 (Future) | Separated | gRPC          | Redpanda CDC | **None**    |

---

## SSOT (Single Source of Truth)

| Item              | Location                                    | Purpose                   |
| ----------------- | ------------------------------------------- | ------------------------- |
| Type Definitions  | `packages/types/src/identity/`              | Shared types & interfaces |
| Module Interfaces | `packages/types/src/identity/interfaces.ts` | Contract between modules  |
| Event Types       | `packages/types/src/events/`                | Domain event schema       |
| DB Schema         | `prisma/{module}/schema.prisma`             | Per-module Prisma         |
| Constants         | `src/common/constants/index.ts`             | Service-specific config   |
| Shared Utilities  | `@my-girok/nest-common`                     | CacheTTL, ID, Pagination  |

---

## Module Interfaces

> SSOT: `packages/types/src/identity/interfaces.ts`

```typescript
// === IDENTITY MODULE (identity_db) ===
interface IIdentityModule {
  readonly accounts: IAccountService;
  readonly sessions: ISessionService;
  readonly devices: IDeviceService;
  readonly profiles: IProfileService;
}

// === AUTH MODULE (auth_db) ===
interface IAuthModule {
  getActiveSanctions(subjectId: string): Promise<Sanction[]>;
  hasSanction(subjectId: string, sanctionType: string): Promise<boolean>;
  getAccountRoles(accountId: string, serviceId?: string): Promise<Role[]>;
  getRolePermissions(roleId: string): Promise<Permission[]>;
  hasPermission(accountId: string, permissionCode: string, serviceId?: string): Promise<boolean>;
}

// === LEGAL MODULE (legal_db) ===
interface ILegalModule {
  getRequiredConsents(countryCode: string): Promise<ConsentRequirement[]>;
  getAccountConsents(accountId: string): Promise<AccountConsent[]>;
  recordConsent(dto: RecordConsentDto): Promise<AccountConsent>;
  recordConsents(dtos: RecordConsentDto[]): Promise<AccountConsent[]>;
  withdrawConsent(consentId: string, reason?: string): Promise<void>;
  hasRequiredConsents(accountId: string, countryCode: string): Promise<boolean>;
}

// === PLATFORM INTERFACE ===
interface IIdentityPlatform {
  readonly identity: IIdentityModule;
  readonly auth: IAuthModule;
  readonly legal: ILegalModule;
}
```

### Implementation Swap (Zero Code Change)

```typescript
// Combined mode (current)
@Module({
  providers: [
    { provide: 'IIdentityModule', useClass: IdentityModuleLocal },
    { provide: 'IAuthModule', useClass: AuthModuleLocal },
    { provide: 'ILegalModule', useClass: LegalModuleLocal },
  ],
})

// Separated mode (future) - just change env
@Module({
  providers: [
    {
      provide: 'IIdentityModule',
      useFactory: (config) => config.IDENTITY_MODE === 'remote'
        ? new IdentityModuleGrpc(config.IDENTITY_GRPC_URL)
        : new IdentityModuleLocal(),
    },
  ],
})
```

---

## Data Isolation Patterns

### 1. Transactional Outbox (Redpanda-Ready)

```sql
-- Each DB has outbox_events table
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status outbox_status DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);
```

| Phase  | Relay Method      | Infrastructure      |
| ------ | ----------------- | ------------------- |
| Now    | Polling (5s cron) | None                |
| Future | Debezium CDC      | Redpanda + Debezium |

### 2. Saga Pattern (Cross-DB Transactions)

```typescript
// Registration Saga - orchestrates across 3 DBs
class RegistrationSaga {
  async execute(dto: RegistrationDto): Promise<RegistrationResult> {
    const sagaId = ID.generate();

    try {
      // Step 1: Create account (identity_db)
      const account = await this.identity.accounts.createAccount(dto);
      await this.recordStep(sagaId, 'ACCOUNT_CREATED', account.id);

      // Step 2: Create profile (identity_db)
      const profile = await this.identity.profiles.createProfile({ accountId: account.id });
      await this.recordStep(sagaId, 'PROFILE_CREATED', profile.id);

      // Step 3: Record consents (legal_db)
      await this.legal.recordConsents(
        dto.consents.map((c) => ({
          accountId: account.id,
          ...c,
        })),
      );
      await this.recordStep(sagaId, 'CONSENTS_RECORDED', account.id);

      // Step 4: Create session (identity_db)
      const session = await this.identity.sessions.createSession({
        accountId: account.id,
        ipAddress: dto.ipAddress,
      });

      // Step 5: Publish event (outbox)
      await this.publishEvent('ACCOUNT_CREATED', { accountId: account.id });

      return { account, session, profile };
    } catch (error) {
      await this.compensate(sagaId);
      throw error;
    }
  }
}
```

### 3. API Composition (No Cross-DB JOIN)

```typescript
// Cross-module query via interfaces
class ProfileComposer {
  async getFullProfile(accountId: string): Promise<FullProfile> {
    const [account, profile, consents, sanctions] = await Promise.all([
      this.identity.accounts.getAccount(accountId), // identity_db
      this.identity.profiles.getProfile(accountId), // identity_db
      this.legal.getAccountConsents(accountId), // legal_db
      this.auth.getActiveSanctions(accountId), // auth_db
    ]);

    return { ...account, profile, consents, sanctions };
  }
}
```

---

## Module Responsibilities

### Identity Module (identity_db)

| Table           | Purpose             | Key Fields                             |
| --------------- | ------------------- | -------------------------------------- |
| `accounts`      | Core account + auth | id, email, username, status, mode      |
| `sessions`      | Active sessions     | id, accountId, tokenHash, isActive     |
| `devices`       | Registered devices  | id, accountId, fingerprint, deviceType |
| `profiles`      | User profiles       | id, accountId, displayName, gender     |
| `outbox_events` | Event outbox        | id, eventType, payload, status         |

### Auth Module (auth_db)

| Table                    | Purpose                | Key Fields                      |
| ------------------------ | ---------------------- | ------------------------------- |
| `admins`                 | System/tenant admins   | id, email, roleId, scope        |
| `roles`                  | Role definitions       | id, name, level, parentId       |
| `role_hierarchy`         | Role inheritance       | ancestorId, descendantId, depth |
| `permissions`            | Permission definitions | id, code, category              |
| `role_permissions`       | Role-Permission join   | roleId, permissionId            |
| `operators`              | Service operators      | id, adminId, serviceId          |
| `operator_invitations`   | Invitation management  | id, token, expiresAt            |
| `operator_permissions`   | Direct permissions     | operatorId, permissionId        |
| `sanctions`              | Account sanctions      | id, subjectId, type, status     |
| `sanction_notifications` | Sanction notices       | id, sanctionId, sentAt          |
| `outbox_events`          | Event outbox           | id, eventType, payload          |

### Legal Module (legal_db)

| Table              | Purpose           | Key Fields                 |
| ------------------ | ----------------- | -------------------------- |
| `legal_documents`  | Legal documents   | id, type, version, content |
| `consents`         | User consents     | id, accountId, consentType |
| `consent_logs`     | Consent audit log | id, consentId, action      |
| `law_registry`     | Law/regulation DB | id, code, countryCode      |
| `dsr_requests`     | GDPR DSR          | id, accountId, requestType |
| `dsr_request_logs` | DSR audit log     | id, requestId, action      |
| `outbox_events`    | Event outbox      | id, eventType, payload     |

---

## Code Structure

```
services/identity-service/
├── prisma/
│   ├── identity/schema.prisma    # identity_db only
│   ├── auth/schema.prisma        # auth_db only
│   └── legal/schema.prisma       # legal_db only
│
└── src/
    ├── database/                  # Multi-DB Prisma services
    │   ├── database.module.ts
    │   ├── base-prisma.service.ts # Base class + UUIDv7 extension
    │   ├── identity-prisma.service.ts
    │   ├── auth-prisma.service.ts
    │   └── legal-prisma.service.ts
    │
    ├── common/                    # Shared utilities
    │   ├── constants/             # Service-specific constants
    │   ├── pagination/            # PaginationDto, PaginatedResponse
    │   ├── saga/                  # Saga orchestrator
    │   ├── outbox/                # Transactional outbox
    │   ├── messaging/             # Kafka producer/consumer
    │   ├── guards/                # JWT, API key guards
    │   ├── filters/               # Exception filters
    │   └── decorators/            # @Public, etc.
    │
    ├── identity/                  # Identity module
    │   ├── identity.module.ts
    │   ├── accounts/              # Account CRUD, MFA
    │   ├── sessions/              # Session management
    │   ├── devices/               # Device registration
    │   └── profiles/              # User profiles
    │
    ├── auth/                      # Auth module
    │   ├── auth.module.ts
    │   ├── roles/                 # Role definitions, hierarchy
    │   ├── permissions/           # Permission CRUD, checks
    │   ├── operators/             # Operator management
    │   └── sanctions/             # User sanctions, appeals
    │
    ├── legal/                     # Legal module
    │   ├── legal.module.ts
    │   ├── consents/              # Consent management
    │   ├── legal-documents/       # Terms, policies
    │   ├── law-registry/          # Country-specific laws
    │   └── dsr-requests/          # GDPR DSR handling
    │
    └── composition/               # Cross-module workflows
        ├── registration/          # User registration saga
        └── account-deletion/      # GDPR deletion saga
```

---

## API Endpoints

### Public (No Auth)

```
POST   /registration              # User registration (saga)
```

### Identity Module

```
# Accounts
POST   /accounts                  # Create account
GET    /accounts/:id              # Get account by ID
PATCH  /accounts/:id              # Update account
DELETE /accounts/:id              # Soft delete account
POST   /accounts/:id/verify-email # Verify email
POST   /accounts/:id/mfa/enable   # Enable MFA
POST   /accounts/:id/mfa/disable  # Disable MFA

# Sessions
POST   /sessions                  # Create session
GET    /sessions/:id              # Get session by ID
GET    /sessions/account/:accountId # List account sessions
DELETE /sessions/:id              # Revoke session
DELETE /sessions/account/:accountId # Revoke all sessions

# Devices
POST   /devices                   # Register device
GET    /devices/:id               # Get device by ID
GET    /devices/account/:accountId # List account devices
PATCH  /devices/:id               # Update device
DELETE /devices/:id               # Remove device
POST   /devices/:id/trust         # Trust device

# Profiles
GET    /profiles/:accountId       # Get profile
PATCH  /profiles/:accountId       # Update profile
```

### Auth Module

```
# Roles
GET    /roles                     # List roles
POST   /roles                     # Create role
GET    /roles/:id                 # Get role by ID
PATCH  /roles/:id                 # Update role
DELETE /roles/:id                 # Delete role
GET    /roles/:id/permissions     # Get role permissions
POST   /roles/:id/permissions     # Assign permissions
DELETE /roles/:id/permissions     # Revoke permissions

# Permissions
GET    /permissions               # List permissions
POST   /permissions               # Create permission
GET    /permissions/:id           # Get permission by ID
PATCH  /permissions/:id           # Update permission
DELETE /permissions/:id           # Delete permission
GET    /permissions/categories    # Get by category

# Operators
POST   /operators/invitations     # Create invitation
POST   /operators/accept          # Accept invitation
POST   /operators/direct          # Create directly
GET    /operators/:id             # Get operator
PATCH  /operators/:id             # Update operator
DELETE /operators/:id             # Deactivate operator
GET    /operators                 # List operators

# Sanctions
POST   /sanctions                 # Create sanction
GET    /sanctions/:id             # Get sanction by ID
PATCH  /sanctions/:id             # Update sanction
POST   /sanctions/:id/revoke      # Revoke sanction
POST   /sanctions/:id/appeal      # Submit appeal
GET    /sanctions                 # List sanctions
```

### Legal Module

```
# Consents
POST   /consents                  # Grant consent
POST   /consents/bulk             # Grant bulk consents
DELETE /consents/:id              # Withdraw consent
GET    /consents/:id              # Get consent by ID
GET    /consents/account/:accountId # Get account consents
GET    /consents                  # List consents

# Legal Documents
POST   /legal-documents           # Create document
GET    /legal-documents/:id       # Get by ID
GET    /legal-documents/current   # Get current version
GET    /legal-documents           # List documents

# Law Registry
POST   /law-registry              # Create law entry
GET    /law-registry/:id          # Get by ID
GET    /law-registry/code/:code   # Get by code
GET    /law-registry/country/:code # Get by country
GET    /law-registry              # List laws
PATCH  /law-registry/:code        # Update law

# DSR Requests
POST   /dsr-requests              # Create DSR request
GET    /dsr-requests/:id          # Get by ID
PATCH  /dsr-requests/:id          # Update request
POST   /dsr-requests/:id/complete # Complete request
GET    /dsr-requests              # List requests
```

### Composition Layer

```
POST   /registration              # User registration saga
POST   /account-deletion/immediate # Immediate deletion
POST   /account-deletion/schedule  # Scheduled deletion
```

---

## Event Types

> SSOT: `packages/types/src/events/` (SCREAMING_SNAKE_CASE)

```typescript
// Identity Events
'ACCOUNT_CREATED';
'ACCOUNT_UPDATED';
'ACCOUNT_DELETED';
'SESSION_STARTED';
'SESSION_ENDED';
'DEVICE_REGISTERED';
'DEVICE_TRUSTED';
'MFA_ENABLED';
'MFA_DISABLED';

// Auth Events
'ROLE_ASSIGNED';
'ROLE_REVOKED';
'SANCTION_APPLIED';
'SANCTION_REVOKED';
'SANCTION_APPEALED';

// Legal Events
'CONSENT_GRANTED';
'CONSENT_WITHDRAWN';
'DSR_REQUEST_SUBMITTED';
'DSR_REQUEST_COMPLETED';
```

---

## Environment Variables

```env
PORT=3005
NODE_ENV=development

# DBs (Pre-Separated - Zero Migration Ready)
IDENTITY_DATABASE_URL=postgresql://...identity_db
AUTH_DATABASE_URL=postgresql://...auth_db
LEGAL_DATABASE_URL=postgresql://...legal_db

# Module Mode (Combined → Separated)
IDENTITY_MODE=local    # local | remote (gRPC)
AUTH_MODE=local
LEGAL_MODE=local

# gRPC URLs (when MODE=remote)
IDENTITY_GRPC_URL=identity-service:50051
AUTH_GRPC_URL=auth-service:50051
LEGAL_GRPC_URL=legal-service:50051

# Future: Redpanda (Kafka-compatible)
REDPANDA_BROKERS=      # Empty = use polling
REDPANDA_ENABLED=false

# JWT
JWT_SECRET=...
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=14d
```

---

## Security

### Triple-Layer Access Control

| Layer            | Can Disable? | Notes                      |
| ---------------- | ------------ | -------------------------- |
| Domain (Layer 1) | Yes          | Dev/staging                |
| JWT (Layer 2)    | **NO**       | Always required (RFC 9068) |
| Header (Layer 3) | Yes          | Internal tools             |

### Security Levels

| Level    | Domain | JWT | Header | Use Case    |
| -------- | ------ | --- | ------ | ----------- |
| STRICT   | ✅     | ✅  | ✅     | Production  |
| STANDARD | ❌     | ✅  | ✅     | Staging     |
| RELAXED  | ❌     | ✅  | ❌     | Development |

---

## 2025 Best Practices

| Standard             | Status | Implementation                   |
| -------------------- | ------ | -------------------------------- |
| RFC 9700 (OAuth 2.0) | ✅     | PKCE, no implicit                |
| RFC 9068 (JWT)       | ✅     | `aud` claim, RS256               |
| RFC 9562 (UUIDv7)    | ✅     | All IDs via `ID.generate()`      |
| Transactional Outbox | ✅     | Per-DB outbox, Redpanda-ready    |
| Saga Pattern         | ✅     | Registration, Account Deletion   |
| API Composition      | ✅     | No cross-DB JOIN                 |
| SSOT                 | ✅     | Types in `packages/types`        |
| CacheTTL             | ✅     | `@my-girok/nest-common` CacheTTL |

---

## Migration Roadmap

| Phase       | Trigger        | Changes                          |
| ----------- | -------------- | -------------------------------- |
| 1 (Current) | -              | Combined service, polling outbox |
| 2           | Hardware added | Extract services, enable gRPC    |
| 3           | Scale needed   | Add Redpanda + Debezium CDC      |
| 4           | Global scale   | Multi-region, read replicas      |

---

**Detailed policy**: `docs/policies/IDENTITY_PLATFORM.md`
