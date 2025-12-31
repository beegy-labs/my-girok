# Identity Service

> Multi-app user management platform with pre-separated databases

## Purpose

Central identity platform for creating N apps with shared user management:

- **my-girok** (api.girok.dev)
- **vero** (api.vero.dev)
- Future apps...

## Architecture Strategy

### Core Principle

**Services Combined, DBs Pre-Separated**: Single deployable service with 3 separate databases for future extraction without migration.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Identity Service (Combined)                   │
│                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│   │  Identity   │   │    Auth     │   │    Legal    │           │
│   │   Module    │   │   Module    │   │   Module    │           │
│   │ (Accounts)  │   │  (Authz)    │   │ (Consent)   │           │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │
│          │                 │                 │                   │
└──────────┼─────────────────┼─────────────────┼───────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │identity_db │    │  auth_db   │    │  legal_db  │
    │(PostgreSQL)│    │(PostgreSQL)│    │(PostgreSQL)│
    └────────────┘    └────────────┘    └────────────┘
```

### Modular Code Structure (Easy Separation)

```
services/identity-service/
├── src/
│   ├── main.ts
│   ├── app.module.ts           # Root module (imports all)
│   │
│   ├── identity/               # === IDENTITY MODULE ===
│   │   ├── identity.module.ts  # Self-contained module
│   │   ├── identity.prisma.ts  # identity_db connection ONLY
│   │   ├── controllers/
│   │   │   ├── account.controller.ts
│   │   │   ├── session.controller.ts
│   │   │   ├── oauth.controller.ts
│   │   │   └── passkey.controller.ts
│   │   ├── services/
│   │   │   ├── account.service.ts
│   │   │   ├── session.service.ts
│   │   │   ├── credential.service.ts
│   │   │   └── app-registry.service.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── auth/                   # === AUTH MODULE ===
│   │   ├── auth.module.ts      # Self-contained module
│   │   ├── auth.prisma.ts      # auth_db connection ONLY
│   │   ├── controllers/
│   │   │   ├── role.controller.ts
│   │   │   ├── admin.controller.ts
│   │   │   └── operator.controller.ts
│   │   ├── services/
│   │   │   ├── role.service.ts
│   │   │   ├── permission.service.ts
│   │   │   └── sanction.service.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── legal/                  # === LEGAL MODULE ===
│   │   ├── legal.module.ts     # Self-contained module
│   │   ├── legal.prisma.ts     # legal_db connection ONLY
│   │   ├── controllers/
│   │   │   ├── consent.controller.ts
│   │   │   ├── document.controller.ts
│   │   │   └── dsr.controller.ts
│   │   ├── services/
│   │   │   ├── consent.service.ts
│   │   │   ├── law-registry.service.ts
│   │   │   └── dsr.service.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   └── shared/                 # Shared utilities (minimal)
│       ├── guards/
│       ├── decorators/
│       └── utils/
│
├── prisma/
│   ├── identity/               # identity_db schema
│   │   └── schema.prisma
│   ├── auth/                   # auth_db schema
│   │   └── schema.prisma
│   └── legal/                  # legal_db schema
│       └── schema.prisma
```

**Separation Rules**:

1. Each module has its **own Prisma client** (no cross-DB queries)
2. Modules communicate via **interfaces**, not direct imports
3. Shared code is **minimal** (guards, decorators only)
4. No circular dependencies between modules

### Service Extraction (Future)

```
Phase 1 (Current): Combined Service
└── identity-service
    ├── Identity Module → identity_db
    ├── Auth Module → auth_db
    └── Legal Module → legal_db

Phase 2 (Future): Extract services by copying module folders
├── identity-service → identity/ folder → identity_db
├── auth-service → auth/ folder → auth_db
└── legal-service → legal/ folder → legal_db
```

**Zero Migration**: Just copy module folder + update routing.

---

## Module Responsibilities

### Identity Module (identity_db)

Account management and authentication.

| Table                  | Purpose                          |
| ---------------------- | -------------------------------- |
| `accounts`             | Core account (email, status)     |
| `account_profiles`     | Profile data (name, avatar)      |
| `credentials`          | Password, passkeys, OAuth tokens |
| `sessions`             | Active sessions (Valkey backed)  |
| `devices`              | Registered devices               |
| `app_registry`         | Registered apps (my-girok, vero) |
| `app_security_configs` | Per-app security settings        |
| `app_test_modes`       | Test mode configurations         |
| `app_service_status`   | Maintenance, shutdown management |
| `app_version_policies` | App version requirements         |
| `account_apps`         | Account-app relationships        |

### Auth Module (auth_db)

Authorization and access control.

| Table              | Purpose                 |
| ------------------ | ----------------------- |
| `roles`            | Role definitions        |
| `permissions`      | Permission definitions  |
| `role_permissions` | Role-permission mapping |
| `admins`           | Admin accounts          |
| `admin_roles`      | Admin-role mapping      |
| `operators`        | Service operators       |
| `sanctions`        | Account sanctions (ban) |
| `api_keys`         | API key management      |

### Legal Module (legal_db)

Global compliance and consent management.

| Table                   | Purpose                      |
| ----------------------- | ---------------------------- |
| `laws`                  | Law registry (PIPA, GDPR...) |
| `law_requirements`      | Per-law consent requirements |
| `countries`             | Country definitions          |
| `consent_documents`     | Legal document versions      |
| `account_consents`      | User consent records         |
| `data_subject_requests` | GDPR DSR tracking            |

---

## App Management

### App Registry

```typescript
interface AppRegistry {
  id: string; // UUIDv7
  slug: string; // 'my-girok', 'vero'
  name: string;
  domain: string; // 'girok.dev', 'vero.net'
  identityDomain: string; // 'accounts.girok.dev'
  apiDomain: string; // 'api.girok.dev'
  allowedOrigins: string[];
  status: 'ACTIVE' | 'INACTIVE';

  // Related configurations
  securityConfig: AppSecurityConfig;
  serviceStatus: AppServiceStatus;
  versionPolicy: AppVersionPolicy;
}
```

### GitOps-based App Management

Apps are managed via GitOps (Git as SSOT) with Admin UI for emergency operations:

```yaml
# apps/vero.yaml (Git repository)
apiVersion: identity.girok.dev/v1
kind: AppRegistration
metadata:
  name: vero
spec:
  slug: vero
  name: Vero Service
  domain: vero.net
  identityDomain: accounts.vero.net
  apiDomain: api.vero.net
  allowedOrigins:
    - https://vero.net
    - https://www.vero.net
  securityConfig:
    securityLevel: STRICT
  versionPolicy:
    ios:
      minVersion: '2.0.0'
      currentVersion: '2.5.0'
    android:
      minVersion: '2.0.0'
      currentVersion: '2.5.0'
```

**Management Flow**:

| Operation           | Method                    | Notes                 |
| ------------------- | ------------------------- | --------------------- |
| Create/Update App   | GitOps (PR → ArgoCD sync) | Auditable, reviewable |
| Emergency Block     | Admin UI                  | Immediate effect      |
| Secret Rotation     | Vault + Admin UI          | Automated or manual   |
| Test Mode Toggle    | Admin UI                  | Quick enable/disable  |
| Force Update Config | Admin UI or GitOps        | Version requirements  |

---

## Security

### Triple-Layer Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│                    3-Layer Access Control                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Domain        → Configurable per-app                  │
│  Layer 2: JWT aud       → ALWAYS REQUIRED (cannot disable)      │
│  Layer 3: Header        → Configurable per-app                  │
└─────────────────────────────────────────────────────────────────┘
```

| Layer            | Can Disable? | Notes                           |
| ---------------- | ------------ | ------------------------------- |
| Domain (Layer 1) | Yes          | For dev/staging environments    |
| JWT (Layer 2)    | **NO**       | Always required, non-negotiable |
| Header (Layer 3) | Yes          | For internal tools, testing     |

### Per-App Security Configuration

```typescript
interface AppSecurityConfig {
  appId: string;
  securityLevel: 'STRICT' | 'STANDARD' | 'RELAXED';

  // Layer 1: Domain validation
  domainValidation: {
    enabled: boolean;
    allowedDomains: string[];
  };

  // Layer 2: JWT validation (ALWAYS REQUIRED)
  jwtValidation: {
    enabled: true; // readonly, cannot change
    validateAud: true;
  };

  // Layer 3: Header validation
  headerValidation: {
    enabled: boolean;
    requireAppId: boolean;
    requireAppSecret: boolean;
  };

  testMode: TestModeConfig;
}
```

**Security Level Presets**:

| Level    | Domain | JWT | Header | Use Case              |
| -------- | ------ | --- | ------ | --------------------- |
| STRICT   | ✅     | ✅  | ✅     | Production (default)  |
| STANDARD | ❌     | ✅  | ✅     | Staging, internal API |
| RELAXED  | ❌     | ✅  | ❌     | Development, testing  |

### Access Control Flow

```
Request to api.girok.dev
         │
         ▼
┌─────────────────────────────────────┐
│ 0. Version Check                    │
│ X-App-Version >= minVersion?        │
│ [Force update if below minimum]     │
└─────────────────┬───────────────────┘
                  │ ✅ or FORCE_UPDATE
                  ▼
┌─────────────────────────────────────┐
│ 1. Service Status Check             │
│ App status != MAINTENANCE/SUSPENDED?│
└─────────────────┬───────────────────┘
                  │ ✅ or SERVICE_UNAVAILABLE
                  ▼
┌─────────────────────────────────────┐
│ 2. Domain Check (Configurable)      │
│ Skip if: testMode OR disabled       │
└─────────────────┬───────────────────┘
                  │ ✅ or SKIP
                  ▼
┌─────────────────────────────────────┐
│ 3. JWT Check (ALWAYS)               │
│ JWT valid? aud === X-App-ID?        │
│ ⚠️ CANNOT BE DISABLED               │
└─────────────────┬───────────────────┘
                  │ ✅
                  ▼
┌─────────────────────────────────────┐
│ 4. Header Check (Configurable)      │
│ Skip if: testMode OR disabled       │
└─────────────────┬───────────────────┘
                  │ ✅ or SKIP
                  ▼
            Access Granted
```

### Test Mode

Temporarily relax security for development/QA (JWT still required):

```typescript
interface TestModeConfig {
  enabled: boolean;
  allowedIPs: string[]; // Required whitelist
  expiresAt: Date | null; // Max 7 days
  disabledLayers: ('domain' | 'header')[]; // Cannot include 'jwt'
}
```

**Constraints**:

| Setting        | Constraint     | Reason                  |
| -------------- | -------------- | ----------------------- |
| Max Duration   | 7 days         | Prevent forgotten tests |
| IP Whitelist   | Required       | No public test access   |
| JWT Validation | Cannot disable | Security baseline       |
| Audit Logging  | Always enabled | Compliance requirement  |

---

## Service Lifecycle Management

### Service Status

```typescript
interface AppServiceStatus {
  appId: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'SUSPENDED' | 'TERMINATED';

  maintenance: {
    enabled: boolean;
    message: string;
    allowedRoles: string[]; // Bypass roles
    startAt: Date | null;
    endAt: Date | null;
    allowReadOnly: boolean;
  };

  shutdown: {
    scheduled: boolean;
    scheduledAt: Date | null;
    reason: string;
    notifyUsers: boolean;
    dataRetentionDays: number;
  };
}
```

**Status Transitions**:

```
ACTIVE ──┬──▶ MAINTENANCE ──▶ ACTIVE
         │
         ├──▶ SUSPENDED ──┬──▶ ACTIVE
         │                │
         │                └──▶ TERMINATED
         │
         └──▶ TERMINATED (scheduled shutdown)
```

### Admin API

```
# Maintenance
POST   /v1/admin/apps/:appId/maintenance
DELETE /v1/admin/apps/:appId/maintenance

# Suspension
POST   /v1/admin/apps/:appId/suspend
POST   /v1/admin/apps/:appId/activate

# Shutdown
POST   /v1/admin/apps/:appId/shutdown
DELETE /v1/admin/apps/:appId/shutdown
```

---

## App Version Policy

### Version Requirements

```typescript
interface AppVersionPolicy {
  appId: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';

  // Version requirements
  minVersion: string; // Below → Force update
  recommendedVersion: string; // Below → Soft update
  currentVersion: string; // Latest version

  // Force update config
  forceUpdate: {
    enabled: boolean;
    message: string; // "Security update required"
    storeUrl: string; // App Store / Play Store URL
  };

  // Soft update config
  softUpdate: {
    enabled: boolean;
    message: string; // "New features available"
    dismissible: boolean;
    remindAfterDays: number;
  };

  // Deprecated versions (specific block)
  deprecatedVersions: string[]; // ['1.0.0', '1.0.1']
}
```

### Version Check Flow

```
Client Request
    │
    ├── Header: X-App-Version: 2.3.0
    ├── Header: X-App-Platform: IOS
    │
    ▼
┌────────────────────────────────────┐
│ Version Policy Check               │
├────────────────────────────────────┤
│ if (version in deprecatedVersions) │
│   → 426 UPGRADE_REQUIRED           │
│                                    │
│ if (version < minVersion)          │
│   → 426 UPGRADE_REQUIRED           │
│   → Body: { forceUpdate: true }    │
│                                    │
│ if (version < recommendedVersion)  │
│   → 200 OK                         │
│   → Header: X-Update-Available     │
│                                    │
│ else                               │
│   → 200 OK                         │
└────────────────────────────────────┘
```

### Version Response

```typescript
// 426 Upgrade Required
interface ForceUpdateResponse {
  error: 'UPGRADE_REQUIRED';
  forceUpdate: true;
  message: string;
  storeUrl: string;
  minVersion: string;
  currentVersion: string;
}

// 200 OK with soft update header
interface SoftUpdateHeaders {
  'X-Update-Available': 'true';
  'X-Current-Version': string;
  'X-Update-Message': string;
}
```

### Admin API

```
# Get version policy
GET /v1/admin/apps/:appId/versions

# Update version policy
PATCH /v1/admin/apps/:appId/versions/:platform
{
  "minVersion": "2.0.0",
  "recommendedVersion": "2.5.0",
  "currentVersion": "2.5.1",
  "forceUpdate": {
    "enabled": true,
    "message": "Critical security update"
  }
}

# Deprecate specific version
POST /v1/admin/apps/:appId/versions/:platform/deprecate
{
  "version": "1.9.0",
  "reason": "Security vulnerability CVE-2025-XXXX"
}
```

---

## Authentication

### Token Strategy

| Token         | TTL | Storage         | Verification   |
| ------------- | --- | --------------- | -------------- |
| Access Token  | 15m | Client memory   | Local (JWKS)   |
| Refresh Token | 14d | HttpOnly Cookie | Valkey session |

### JWT Payload (RFC 9068)

```typescript
interface JWTPayload {
  sub: string; // Account ID
  aud: string; // App ID (audience)
  iss: string; // 'accounts.girok.dev'
  iat: number;
  exp: number;

  apps: {
    [appId: string]: {
      status: 'ACTIVE' | 'SUSPENDED';
      countryCode: string;
      permissions: string[];
    };
  };
}
```

---

## API Endpoints

### Public API (No Auth Required)

```
# App Check (called on app launch)
GET    /v1/apps/:appSlug/check
       Headers: X-App-Platform, X-App-Version
       Response: version status, service status, announcements
```

**App Check Response**:

```typescript
interface AppCheckResponse {
  version: {
    status: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_REQUIRED' | 'DEPRECATED';
    current: string;
    latest: string;
    minimum: string;
  };
  update?: {
    required: boolean;
    message: string;
    storeUrl: string;
  };
  service: {
    status: 'ACTIVE' | 'MAINTENANCE' | 'SUSPENDED';
    message?: string;
    estimatedEndAt?: string;
  };
  announcement?: {
    id: string;
    type: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    message: string;
    dismissible: boolean;
  };
  serverTime: string;
}
```

**HTTP Status**:

| Status | Condition             | Client Action           |
| ------ | --------------------- | ----------------------- |
| 200    | Normal / Soft update  | Continue                |
| 426    | Force update required | Block, go to store      |
| 503    | Maintenance           | Show maintenance screen |

### Identity Module

```
POST   /v1/identity/register
POST   /v1/identity/login
POST   /v1/identity/logout
POST   /v1/identity/refresh
GET    /v1/identity/me
PATCH  /v1/identity/me
DELETE /v1/identity/me

# Passkeys
POST   /v1/identity/passkeys/register/options
POST   /v1/identity/passkeys/register/verify
POST   /v1/identity/passkeys/login/options
POST   /v1/identity/passkeys/login/verify

# OAuth
GET    /v1/identity/oauth/:provider
GET    /v1/identity/oauth/:provider/callback
```

### Auth Module

```
GET    /v1/auth/roles
POST   /v1/auth/roles
GET    /v1/auth/permissions

GET    /v1/auth/operators
POST   /v1/auth/operators
PATCH  /v1/auth/operators/:id
DELETE /v1/auth/operators/:id

POST   /v1/admin/login
GET    /v1/admin/me
```

### Legal Module

```
GET    /v1/legal/consents/required
POST   /v1/legal/consents
GET    /v1/legal/consents/me

GET    /v1/legal/documents
GET    /v1/legal/documents/:type

POST   /v1/legal/dsr/export
POST   /v1/legal/dsr/delete
GET    /v1/legal/dsr/status/:id
```

### Admin App Management

```
# Security
GET    /v1/admin/apps/:appId/security
PATCH  /v1/admin/apps/:appId/security

# Test Mode
POST   /v1/admin/apps/:appId/test-mode
DELETE /v1/admin/apps/:appId/test-mode

# Service Status
POST   /v1/admin/apps/:appId/maintenance
DELETE /v1/admin/apps/:appId/maintenance
POST   /v1/admin/apps/:appId/suspend
POST   /v1/admin/apps/:appId/activate
POST   /v1/admin/apps/:appId/shutdown

# Version Policy
GET    /v1/admin/apps/:appId/versions
PATCH  /v1/admin/apps/:appId/versions/:platform
POST   /v1/admin/apps/:appId/versions/:platform/deprecate
```

---

## Global Law Registry

| Code | Country | Name                                | Key Requirements            |
| ---- | ------- | ----------------------------------- | --------------------------- |
| PIPA | KR      | Personal Information Protection Act | Age 14+, night push consent |
| GDPR | EU      | General Data Protection Regulation  | Age 16+, data portability   |
| CCPA | US      | California Consumer Privacy Act     | Age 13+, opt-out rights     |
| APPI | JP      | Act on Protection of Personal Info  | Cross-border transfer       |

---

## Multi-App Support

```
┌─────────────────────────────────────────────────────────────────┐
│              Identity Service (Single Instance)                  │
├─────────────────────────────────────────────────────────────────┤
│ accounts.girok.dev │ accounts.vero.net │ accounts.example.com  │
│         │                   │                    │              │
│         ▼                   ▼                    ▼              │
│    ┌─────────┐        ┌─────────┐         ┌─────────┐          │
│    │ my-girok│        │  vero   │         │ example │          │
│    │  app_id │        │  app_id │         │ app_id  │          │
│    └─────────┘        └─────────┘         └─────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

**Supported TLDs**: .dev, .com, .net, .io, .co.kr, etc. (any domain)

### Domain Routing

| Domain             | Service          | Purpose              |
| ------------------ | ---------------- | -------------------- |
| accounts.girok.dev | Identity Service | Login, register, SSO |
| api.girok.dev      | Personal Service | Business API         |
| my.girok.dev       | Web App          | Frontend             |
| admin.girok.dev    | Web Admin        | Admin console        |

---

## Environment Variables

```env
# Service
PORT=3005
NODE_ENV=development

# Databases (3 separate connections)
IDENTITY_DATABASE_URL=postgresql://...identity_db
AUTH_DATABASE_URL=postgresql://...auth_db
LEGAL_DATABASE_URL=postgresql://...legal_db

# JWT
JWT_PRIVATE_KEY=...   # RS256 private key
JWT_PUBLIC_KEY=...    # RS256 public key
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=14d

# Valkey
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=
```

---

## 2025 Best Practices Compliance

| Standard                      | Status | Implementation                   |
| ----------------------------- | ------ | -------------------------------- |
| RFC 9700 (OAuth 2.0 Security) | ✅     | PKCE, no implicit flow           |
| RFC 9068 (JWT Access Token)   | ✅     | `aud` claim, RS256               |
| RFC 9449 (DPoP)               | Ready  | Prepared for future              |
| NIST 800-207 (Zero Trust)     | ✅     | 3-Layer verification, continuous |
| OWASP API Security Top 10     | ✅     | Rate limit, input validation     |
| GDPR/PIPA/CCPA                | ✅     | Consent management, DSR          |
| Semantic Versioning (SemVer)  | ✅     | App version policy               |
| GitOps (CNCF)                 | ✅     | Git as SSOT, ArgoCD              |
| 12-Factor App                 | ✅     | Config via env, stateless        |

---

**Detailed policy**: `docs/policies/IDENTITY_PLATFORM.md`
