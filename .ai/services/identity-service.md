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

| Table              | Purpose                          |
| ------------------ | -------------------------------- |
| `accounts`         | Core account (email, status)     |
| `account_profiles` | Profile data (name, avatar)      |
| `credentials`      | Password, passkeys, OAuth tokens |
| `sessions`         | Active sessions (Valkey backed)  |
| `devices`          | Registered devices               |
| `app_registry`     | Registered apps (my-girok, vero) |
| `account_apps`     | Account-app relationships        |

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
}
```

### JWT Access Control (RFC 9068)

```typescript
// JWT Payload - Per-app access control
interface JWTPayload {
  sub: string; // Account ID
  aud: string; // App ID (audience) - KEY for access control
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

// Access control: domain + JWT audience
// api.girok.dev only accepts JWT with aud: 'my-girok'
// api.vero.dev only accepts JWT with aud: 'vero'
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
