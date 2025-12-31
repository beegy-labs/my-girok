# Identity Service

> Multi-app user management platform with pre-separated databases

## Purpose

Central identity platform for creating N apps with shared user management:

- **my-girok** (api.girok.dev)
- **vero** (api.vero.dev)
- Future apps...

## Architecture Strategy

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

**Key Principle**: Services combined for operational simplicity, DBs pre-separated for future extraction.

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

## Global Law Registry

| Code | Country | Name                                | Key Requirements            |
| ---- | ------- | ----------------------------------- | --------------------------- |
| PIPA | KR      | Personal Information Protection Act | Age 14+, night push consent |
| GDPR | EU      | General Data Protection Regulation  | Age 16+, data portability   |
| CCPA | US      | California Consumer Privacy Act     | Age 13+, opt-out rights     |
| APPI | JP      | Act on Protection of Personal Info  | Cross-border transfer       |

## Authentication Flow

```
Browser
   │
   ▼
Cilium Gateway (TLS, Rate Limit)
   │
   ▼
Identity Service
   │
   ├──▶ identity_db (account lookup)
   │
   ├──▶ Valkey (session create/validate)
   │
   └──▶ JWT Issue
        ├── Access Token (RS256, 15min, memory)
        └── Refresh Token (HttpOnly Cookie, 14d)
```

### Token Strategy

| Token         | TTL | Storage         | Verification   |
| ------------- | --- | --------------- | -------------- |
| Access Token  | 15m | Client memory   | Local (JWKS)   |
| Refresh Token | 14d | HttpOnly Cookie | Valkey session |

**Hybrid Verification**: Local JWT validation + Valkey session check = Fast + Instant revocation

## API Endpoints

### Identity Module

```
POST   /v1/identity/register          # New account
POST   /v1/identity/login             # Login
POST   /v1/identity/logout            # Logout
POST   /v1/identity/refresh           # Refresh token
GET    /v1/identity/me                # Current account
PATCH  /v1/identity/me                # Update profile
DELETE /v1/identity/me                # Delete account

# Passkeys (WebAuthn)
POST   /v1/identity/passkeys/register/options
POST   /v1/identity/passkeys/register/verify
POST   /v1/identity/passkeys/login/options
POST   /v1/identity/passkeys/login/verify

# OAuth
GET    /v1/identity/oauth/:provider   # OAuth redirect
GET    /v1/identity/oauth/:provider/callback
```

### Auth Module

```
# Roles & Permissions
GET    /v1/auth/roles
POST   /v1/auth/roles
GET    /v1/auth/permissions

# Operators
GET    /v1/auth/operators
POST   /v1/auth/operators
PATCH  /v1/auth/operators/:id
DELETE /v1/auth/operators/:id

# Admin
POST   /v1/admin/login
GET    /v1/admin/me
```

### Legal Module

```
# Consent
GET    /v1/legal/consents/required    # Required consents for country
POST   /v1/legal/consents             # Submit consents
GET    /v1/legal/consents/me          # My consents

# Documents
GET    /v1/legal/documents            # Legal documents
GET    /v1/legal/documents/:type      # Specific document

# DSR (Data Subject Requests)
POST   /v1/legal/dsr/export           # Data export request
POST   /v1/legal/dsr/delete           # Deletion request
GET    /v1/legal/dsr/status/:id       # Request status
```

## Multi-App Support

**Core Concept**: Single account, multiple apps (any TLD), per-app access control.

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

### App Registry

```typescript
interface AppRegistry {
  id: string; // UUIDv7
  slug: string; // 'my-girok', 'vero'
  name: string;
  domain: string; // 'girok.dev', 'vero.dev'
  identityDomain: string; // 'accounts.girok.dev'
  apiDomain: string; // 'api.girok.dev'
  allowedOrigins: string[];
  status: 'ACTIVE' | 'INACTIVE';

  // Security configuration (per-app)
  securityConfig: AppSecurityConfig;
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
    domainValidation:
      enabled: true
    headerValidation:
      enabled: true
      requireAppId: true
      requireAppSecret: true
```

**App Management Flow**:

| Operation         | Method                    | Notes                 |
| ----------------- | ------------------------- | --------------------- |
| Create/Update App | GitOps (PR → ArgoCD sync) | Auditable, reviewable |
| Emergency Block   | Admin UI                  | Immediate effect      |
| Secret Rotation   | Vault + Admin UI          | Automated or manual   |
| Test Mode Toggle  | Admin UI                  | Quick enable/disable  |

**GitOps Benefits**:

- **Audit Trail**: All changes via PR with review
- **Rollback**: Git revert for quick rollback
- **Consistency**: Single source of truth
- **Security**: No direct DB access needed

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

**Security Enforcement**:

| Layer            | Can Disable? | Notes                           |
| ---------------- | ------------ | ------------------------------- |
| Domain (Layer 1) | Yes          | For dev/staging environments    |
| JWT (Layer 2)    | **NO**       | Always required, non-negotiable |
| Header (Layer 3) | Yes          | For internal tools, testing     |

### JWT Access Control (RFC 9068)

```typescript
// JWT Payload - Per-app access control
interface JWTPayload {
  sub: string; // Account ID
  aud: string; // App ID (audience) - Layer 2
  iss: string; // 'accounts.girok.dev'
  iat: number;
  exp: number;

  // App-specific claims
  apps: {
    [appId: string]: {
      status: 'ACTIVE' | 'SUSPENDED';
      countryCode: string;
      permissions: string[];
    };
  };
}
```

### Header-based App Authentication (Layer 3)

```typescript
// Required headers for API requests
interface AppAuthHeaders {
  'X-App-ID': string; // App identifier (e.g., 'my-girok')
  'X-App-Secret': string; // App secret key (hashed, rotatable)
  Authorization: string; // Bearer <JWT>
}

// Validation flow:
// 1. Validate X-App-ID exists in app_registry
// 2. Validate X-App-Secret matches app's secret_hash
// 3. Validate JWT signature and expiry
// 4. Validate JWT aud === X-App-ID
// 5. Validate request domain matches app's apiDomain
```

### Access Control Flow

```
Request to api.girok.dev
         │
         ▼
┌─────────────────────────────────────┐
│ Layer 1: Domain Check (Configurable)│
│ Skip if: testMode OR disabled       │
└─────────────────┬───────────────────┘
                  │ ✅ or SKIP
                  ▼
┌─────────────────────────────────────┐
│ Layer 2: JWT Check (ALWAYS)         │
│ JWT valid? aud === X-App-ID?        │
│ ⚠️ CANNOT BE DISABLED               │
└─────────────────┬───────────────────┘
                  │ ✅
                  ▼
┌─────────────────────────────────────┐
│ Layer 3: Header Check (Configurable)│
│ Skip if: testMode OR disabled       │
└─────────────────┬───────────────────┘
                  │ ✅ or SKIP
                  ▼
            Access Granted
```

### Per-Service Security Configuration

Each app can configure security levels via Admin UI or GitOps:

```typescript
interface AppSecurityConfig {
  appId: string;
  securityLevel: 'STRICT' | 'STANDARD' | 'RELAXED';

  // Layer 1: Domain validation
  domainValidation: {
    enabled: boolean;
    allowedDomains: string[]; // e.g., ['api.girok.dev', 'localhost:3000']
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

  // Test mode
  testMode: TestModeConfig;
}
```

**Security Level Presets**:

| Level    | Domain | JWT | Header | Use Case              |
| -------- | ------ | --- | ------ | --------------------- |
| STRICT   | ✅     | ✅  | ✅     | Production (default)  |
| STANDARD | ❌     | ✅  | ✅     | Staging, internal API |
| RELAXED  | ❌     | ✅  | ❌     | Development, testing  |

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

**Test Mode API**:

```
# Enable test mode
POST /v1/admin/apps/:appId/test-mode
{
  "enabled": true,
  "allowedIPs": ["10.0.0.0/8", "192.168.0.0/16"],
  "expiresAt": "2025-01-15T00:00:00Z",
  "disabledLayers": ["domain", "header"]
}

# Disable test mode
DELETE /v1/admin/apps/:appId/test-mode
```

**Constraints**:

| Setting        | Constraint     | Reason                  |
| -------------- | -------------- | ----------------------- |
| Max Duration   | 7 days         | Prevent forgotten tests |
| IP Whitelist   | Required       | No public test access   |
| JWT Validation | Cannot disable | Security baseline       |
| Audit Logging  | Always enabled | Compliance requirement  |

### Service Lifecycle Management

Per-app maintenance and shutdown management:

```typescript
interface AppServiceStatus {
  appId: string;

  // Service status
  status: 'ACTIVE' | 'MAINTENANCE' | 'SUSPENDED' | 'TERMINATED';

  // Maintenance mode
  maintenance: {
    enabled: boolean;
    message: string; // User-facing message
    allowedRoles: string[]; // Roles that can bypass (admin, tester)
    startAt: Date | null; // Scheduled start
    endAt: Date | null; // Estimated end
    allowReadOnly: boolean; // Allow read operations during maintenance
  };

  // Graceful shutdown
  shutdown: {
    scheduled: boolean;
    scheduledAt: Date | null;
    reason: string;
    notifyUsers: boolean; // Send notification to users
    dataRetentionDays: number; // Days to retain data after shutdown
  };
}
```

**Service Status Transitions**:

```
ACTIVE ──┬──▶ MAINTENANCE ──▶ ACTIVE
         │
         ├──▶ SUSPENDED ──┬──▶ ACTIVE
         │                │
         │                └──▶ TERMINATED
         │
         └──▶ TERMINATED (scheduled shutdown)
```

**Admin API for Service Management**:

```
# Set maintenance mode
POST /v1/admin/apps/:appId/maintenance
{
  "enabled": true,
  "message": "Scheduled maintenance. Service will be back at 10:00 KST.",
  "allowedRoles": ["admin", "tester"],
  "endAt": "2025-01-15T10:00:00+09:00",
  "allowReadOnly": true
}

# Schedule shutdown
POST /v1/admin/apps/:appId/shutdown
{
  "scheduledAt": "2025-03-01T00:00:00Z",
  "reason": "Service end of life",
  "notifyUsers": true,
  "dataRetentionDays": 90
}

# Suspend app (immediate)
POST /v1/admin/apps/:appId/suspend
{
  "reason": "Security incident detected"
}

# Reactivate app
POST /v1/admin/apps/:appId/activate
```

### Account-App Relationship

```typescript
interface AccountApp {
  accountId: string;
  appId: string; // Matches JWT 'aud' claim
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: Date;
  countryCode: string; // Per-app country consent
}
```

## Tech Stack

| Category | Technology                |
| -------- | ------------------------- |
| Runtime  | Node.js 24, NestJS 11     |
| Database | PostgreSQL 16, Prisma 6   |
| Cache    | Valkey (Redis-compatible) |
| Auth     | JWT RS256, Passkeys       |

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
JWT_SECRET=your-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=14d

# Valkey
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=
```

## Future Extraction Path

When scale requires service separation:

```
Phase 1 (Current)
└── Identity Service (combined)
    ├── Identity Module → identity_db
    ├── Auth Module → auth_db
    └── Legal Module → legal_db

Phase 2 (Future - if needed)
├── Identity Service → identity_db
├── Auth Service → auth_db
└── Legal Service → legal_db
```

**No database migration required** - DBs already separated.

## Relationship with auth-service

| Current (auth-service) | Future (identity-service) |
| ---------------------- | ------------------------- |
| auth/                  | Identity Module           |
| users/                 | Identity Module           |
| oauth-config/          | Identity Module           |
| admin/                 | Auth Module               |
| operator/              | Auth Module               |
| services/              | Auth Module               |
| legal/                 | Legal Module              |

## Domain Management Strategy

### URL Routing by Domain

| Domain             | Service          | Purpose              |
| ------------------ | ---------------- | -------------------- |
| accounts.girok.dev | Identity Service | Login, register, SSO |
| api.girok.dev      | Personal Service | Business API         |
| my.girok.dev       | Web App          | Frontend             |
| admin.girok.dev    | Web Admin        | Admin console        |

### Multi-App Domain Pattern

```
App: my-girok
├── accounts.girok.dev → Identity Service (auth)
├── api.girok.dev      → Personal Service (business)
└── my.girok.dev       → Web App (frontend)

App: vero (future)
├── accounts.vero.dev  → Identity Service (shared)
├── api.vero.dev       → Vero Service (business)
└── vero.dev           → Web App (frontend)
```

### Cilium Gateway Routing

```yaml
# HTTPRoute for Identity Service
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: identity-route
spec:
  hostnames:
    - 'accounts.girok.dev'
    - 'accounts.vero.dev' # Multi-app support
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /v1/identity
      backendRefs:
        - name: identity-service
          port: 3005
```

### CORS Configuration by Domain

```typescript
// Per-app CORS origins
const corsConfig = {
  'my-girok': ['https://my.girok.dev', 'https://admin.girok.dev'],
  vero: ['https://vero.dev', 'https://admin.vero.dev'],
};
```

### Cookie Domain Strategy

```typescript
// Session cookie configuration
const cookieConfig = {
  domain: '.girok.dev', // Shared across subdomains
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
};

// For cross-domain (girok.dev ↔ vero.dev)
// Use token-based auth, not cookies
```

### Database Isolation by Domain

| Domain    | identity_db | auth_db | legal_db |
| --------- | ----------- | ------- | -------- |
| App Data  | Shared      | Shared  | Shared   |
| User Data | Per-app     | Per-app | Per-app  |
| Consent   | Per-app     | -       | Per-app  |

```sql
-- App-scoped queries
SELECT * FROM accounts
WHERE id IN (
  SELECT account_id FROM account_apps
  WHERE app_id = 'my-girok-uuid'
);
```

---

**Detailed policy**: `docs/policies/IDENTITY_PLATFORM.md`
