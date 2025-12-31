# Identity Service

> Multi-app user management platform with Zero Migration architecture

## Purpose

Central identity platform for N apps with shared user management:

- **my-girok** (api.girok.dev)
- **vero** (api.vero.dev)
- Future apps...

---

## Architecture Strategy

### Core Principle

**Services Combined, DBs Pre-Separated, Redpanda-Ready**

```
┌─────────────────────────────────────────────────────────────────────┐
│              Current: Combined Service (Limited Hardware)            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Identity Service                            │  │
│  │  ┌─────────────┬─────────────┬─────────────┐                  │  │
│  │  │  Identity   │    Auth     │    Legal    │                  │  │
│  │  │   Module    │   Module    │   Module    │                  │  │
│  │  └──────┬──────┴──────┬──────┴──────┬──────┘                  │  │
│  │         │             │             │                          │  │
│  │    In-Process    In-Process    In-Process                      │  │
│  └─────────┼─────────────┼─────────────┼──────────────────────────┘  │
│            │             │             │                             │
│            ▼             ▼             ▼                             │
│      identity_db     auth_db      legal_db   ← Pre-Separated         │
│            │             │             │                             │
│            └─────────────┼─────────────┘                             │
│                          ▼                                           │
│                   Outbox Tables  → (Future: Redpanda + Debezium)     │
└──────────────────────────────────────────────────────────────────────┘

                        ⬇️ Hardware Added (128 cores, 496GB RAM)

┌──────────────────────────────────────────────────────────────────────┐
│              Future: Separated Services (Zero Migration)              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                │
│  │  Identity   │   │    Auth     │   │    Legal    │                │
│  │  Service    │   │   Service   │   │   Service   │                │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                │
│         │                 │                 │                        │
│         ▼                 ▼                 ▼                        │
│   identity_db         auth_db          legal_db  ← Same DBs          │
│         │                 │                 │                        │
│         └─────────────────┼─────────────────┘                        │
│                           ▼                                          │
│             Redpanda + Debezium CDC (Outbox Relay)                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Zero Migration Guarantee

| Phase      | Hardware   | Services  | Communication | Event Broker        |
| ---------- | ---------- | --------- | ------------- | ------------------- |
| 1 (Now)    | Limited    | Combined  | In-Process    | Polling             |
| 2 (Future) | 128c/496GB | Separated | gRPC          | Redpanda + Debezium |

**Migration Required**: None (copy module folder + update routing)

---

## SSOT (Single Source of Truth)

| Item              | SSOT Location                   | Purpose                  |
| ----------------- | ------------------------------- | ------------------------ |
| Module Interfaces | `packages/types/src/identity/`  | Contract between modules |
| Event Types       | `packages/types/src/events/`    | Shared event schema      |
| DB Schema         | `prisma/{module}/schema.prisma` | Per-module Prisma        |
| App Config        | GitOps YAML                     | ArgoCD sync              |

---

## Module Interfaces

> SSOT: `packages/types/src/identity/interfaces.ts`

```typescript
// === IDENTITY MODULE ===
interface IIdentityModule {
  getAccount(id: string): Promise<Account | null>;
  createAccount(dto: CreateAccountDto): Promise<Account>;
  getApp(slug: string): Promise<AppRegistry | null>;
  getAppSecurityConfig(appId: string): Promise<AppSecurityConfig>;
}

// === AUTH MODULE ===
interface IAuthModule {
  getActiveSanctions(accountId: string): Promise<Sanction[]>;
  getAccountRoles(accountId: string, appId: string): Promise<Role[]>;
}

// === LEGAL MODULE ===
interface ILegalModule {
  getRequiredConsents(appId: string, countryCode: string): Promise<ConsentRequirement[]>;
  recordConsent(dto: RecordConsentDto): Promise<AccountConsent>;
}
```

**Implementation Swap**:

```typescript
// Combined: In-Process
class IdentityModuleLocal implements IIdentityModule { ... }

// Separated: gRPC Client
class IdentityModuleRemote implements IIdentityModule { ... }

// Switch via env
provide: 'IIdentityModule',
useClass: env.IDENTITY_MODE === 'remote' ? Remote : Local
```

---

## Data Isolation Patterns

### 1. Outbox Pattern (Redpanda-Ready)

```sql
-- Each DB has outbox table (UUIDv7)
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,              -- UUIDv7 from app
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ(6),

    INDEX idx_unpublished (created_at) WHERE published_at IS NULL
);
```

| Phase  | Relay Method      | Infrastructure      |
| ------ | ----------------- | ------------------- |
| Now    | Polling (5s cron) | None                |
| Future | Debezium CDC      | Redpanda + Debezium |

### 2. Saga Pattern (Distributed Transactions)

```typescript
// Registration Saga (In-Process, Kafka-Ready)
class RegistrationSaga {
  async execute(dto: RegisterDto): Promise<Account> {
    const sagaId = ID.generate(); // UUIDv7

    try {
      // Step 1: Create account (identity_db)
      const account = await this.identity.createAccount(dto);
      await this.recordStep(sagaId, 'ACCOUNT_CREATED', account.id);

      // Step 2: Record consents (legal_db)
      await this.legal.recordConsents(account.id, dto.consents);
      await this.recordStep(sagaId, 'CONSENTS_RECORDED', account.id);

      // Step 3: Publish event (outbox)
      await this.publishEvent('account.created', { accountId: account.id });

      return account;
    } catch (error) {
      await this.compensate(sagaId);
      throw error;
    }
  }
}
```

### 3. API Composition (Cross-DB Queries)

```typescript
// Cross-module query via interfaces (no cross-DB JOIN)
class UserProfileComposer {
  async getFullProfile(accountId: string): Promise<UserProfile> {
    const [account, consents, sanctions] = await Promise.all([
      this.identity.getAccount(accountId), // identity_db
      this.legal.getConsents(accountId), // legal_db
      this.auth.getSanctions(accountId), // auth_db
    ]);

    return { ...account, consents, sanctions };
  }
}
```

---

## Module Responsibilities

### Identity Module (identity_db)

| Table                  | Purpose                   | ID     |
| ---------------------- | ------------------------- | ------ |
| `accounts`             | Core account              | UUIDv7 |
| `credentials`          | Password, passkeys, OAuth | UUIDv7 |
| `sessions`             | Active sessions           | UUIDv7 |
| `devices`              | Registered devices        | UUIDv7 |
| `app_registry`         | Registered apps           | UUIDv7 |
| `app_security_configs` | Per-app security          | UUIDv7 |
| `app_test_modes`       | Test mode config          | UUIDv7 |
| `app_service_status`   | Maintenance/shutdown      | UUIDv7 |
| `app_version_policies` | Version requirements      | UUIDv7 |
| `outbox_events`        | Event outbox              | UUIDv7 |

### Auth Module (auth_db)

| Table           | Purpose                | ID     |
| --------------- | ---------------------- | ------ |
| `roles`         | Role definitions       | UUIDv7 |
| `permissions`   | Permission definitions | UUIDv7 |
| `admins`        | Admin accounts         | UUIDv7 |
| `operators`     | Service operators      | UUIDv7 |
| `sanctions`     | Account sanctions      | UUIDv7 |
| `api_keys`      | API key management     | UUIDv7 |
| `outbox_events` | Event outbox           | UUIDv7 |

### Legal Module (legal_db)

| Table                   | Purpose         | ID     |
| ----------------------- | --------------- | ------ |
| `laws`                  | Law registry    | UUIDv7 |
| `consent_documents`     | Legal documents | UUIDv7 |
| `account_consents`      | User consents   | UUIDv7 |
| `data_subject_requests` | GDPR DSR        | UUIDv7 |
| `outbox_events`         | Event outbox    | UUIDv7 |

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
    ├── identity/                  # Copy this folder to extract
    │   ├── identity.module.ts
    │   ├── identity.prisma.ts     # identity_db connection
    │   ├── identity.service.ts    # implements IIdentityModule
    │   ├── controllers/
    │   ├── services/
    │   └── outbox.publisher.ts
    │
    ├── auth/                      # Copy this folder to extract
    │   ├── auth.module.ts
    │   ├── auth.prisma.ts         # auth_db connection
    │   ├── auth.service.ts        # implements IAuthModule
    │   ├── controllers/
    │   └── services/
    │
    ├── legal/                     # Copy this folder to extract
    │   ├── legal.module.ts
    │   ├── legal.prisma.ts        # legal_db connection
    │   ├── legal.service.ts       # implements ILegalModule
    │   ├── controllers/
    │   └── services/
    │
    ├── saga/                      # Saga orchestrators
    │   ├── registration.saga.ts
    │   └── account-deletion.saga.ts
    │
    └── composition/               # Cross-module queries
        └── user-profile.composer.ts
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

### Test Mode Constraints

| Constraint   | Value     | Reason                  |
| ------------ | --------- | ----------------------- |
| Max Duration | 7 days    | Prevent forgotten tests |
| IP Whitelist | Required  | No public test access   |
| JWT          | Always ON | Security baseline       |

---

## API Endpoints

### Public (No Auth)

```
GET /v1/apps/:appSlug/check    # App launch check
```

### Identity Module

```
POST   /v1/identity/register
POST   /v1/identity/login
POST   /v1/identity/logout
POST   /v1/identity/refresh
GET    /v1/identity/me
```

### Auth Module

```
GET    /v1/auth/roles
POST   /v1/auth/roles
GET    /v1/auth/operators
POST   /v1/admin/login
```

### Legal Module

```
GET    /v1/legal/consents/required
POST   /v1/legal/consents
GET    /v1/legal/documents
```

### Admin App Management

```
GET    /v1/admin/apps/:appId/security
PATCH  /v1/admin/apps/:appId/security
POST   /v1/admin/apps/:appId/test-mode
POST   /v1/admin/apps/:appId/maintenance
```

---

## Event Types

> SSOT: `packages/types/src/events/`

```typescript
// Identity Events
'identity.account.created';
'identity.account.updated';
'identity.account.deleted';
'identity.session.created';

// Auth Events
'auth.sanction.created';
'auth.role.assigned';

// Legal Events
'legal.consent.granted';
'legal.consent.revoked';
'legal.dsr.requested';
```

---

## Environment Variables

```env
PORT=3005
NODE_ENV=development

# DBs (Pre-Separated)
IDENTITY_DATABASE_URL=postgresql://...identity_db
AUTH_DATABASE_URL=postgresql://...auth_db
LEGAL_DATABASE_URL=postgresql://...legal_db

# Module Mode (Combined → Separated)
IDENTITY_MODE=local    # local | remote
AUTH_MODE=local
LEGAL_MODE=local

# Future: Redpanda (Kafka-compatible)
REDPANDA_BROKERS=      # Empty = use polling
REDPANDA_ENABLED=false

# JWT
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...
```

---

## Migration Roadmap

| Phase       | Trigger        | Changes                          |
| ----------- | -------------- | -------------------------------- |
| 1 (Current) | -              | Combined service, polling outbox |
| 2           | Hardware added | Extract services, enable gRPC    |
| 3           | Scale needed   | Add Redpanda + Debezium CDC      |

---

## 2025 Best Practices

| Standard             | Status | Implementation          |
| -------------------- | ------ | ----------------------- |
| RFC 9700 (OAuth 2.0) | ✅     | PKCE, no implicit       |
| RFC 9068 (JWT)       | ✅     | `aud` claim, RS256      |
| Transactional Outbox | ✅     | Redpanda-ready          |
| Saga Pattern         | ✅     | In-process, extractable |
| API Composition      | ✅     | No cross-DB JOIN        |
| UUIDv7 (RFC 9562)    | ✅     | All IDs                 |

---

**Detailed policy**: `docs/policies/IDENTITY_PLATFORM.md`
