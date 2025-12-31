# Identity Platform Policy

> Multi-app user management platform with pre-separated databases (2025)

## Executive Summary

The Identity Platform is designed to enable rapid creation of multiple apps (N apps) with shared user management infrastructure. The core strategy is:

- **Services Combined**: Single deployable unit for operational simplicity
- **DBs Pre-Separated**: 3 separate databases for future service extraction without migration

## Architecture Overview

### Service Structure

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
    │   ~15 tbl  │    │   ~20 tbl  │    │   ~12 tbl  │
    └────────────┘    └────────────┘    └────────────┘
```

### Database Separation Benefits

| Aspect          | Single DB      | Pre-Separated DBs    |
| --------------- | -------------- | -------------------- |
| Deployment      | Simple         | Same (combined)      |
| Service Extract | Schema migrate | Connection swap only |
| Scale           | Vertical only  | Per-domain scaling   |
| Backup/Restore  | All or nothing | Domain-specific      |
| GDPR Compliance | Complex        | Legal DB isolated    |

## Database Schemas

### identity_db (~15 tables)

Core account and authentication data.

```sql
-- Accounts (core)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    account_mode VARCHAR(20) DEFAULT 'SERVICE',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Account Profiles
CREATE TABLE account_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    name VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20),
    UNIQUE(account_id)
);

-- Credentials (password, passkeys)
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    type VARCHAR(20) NOT NULL, -- PASSWORD, PASSKEY, OAUTH
    provider VARCHAR(50),       -- google, kakao, naver
    credential_id TEXT,         -- for passkeys
    public_key TEXT,            -- for passkeys
    password_hash TEXT,         -- for password
    oauth_provider_id TEXT,     -- for OAuth
    last_used_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Sessions (Valkey-backed, DB for audit)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    device_id UUID REFERENCES devices(id),
    token_hash VARCHAR(64) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    revoked_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Devices
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    device_fingerprint VARCHAR(64) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- MOBILE, DESKTOP, TABLET
    os VARCHAR(50),
    browser VARCHAR(50),
    trusted BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- App Registry (my-girok, vero, etc.)
CREATE TABLE app_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    allowed_origins TEXT[],
    status VARCHAR(20) DEFAULT 'ACTIVE',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Account-App relationship
CREATE TABLE account_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    app_id UUID NOT NULL REFERENCES app_registry(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    country_code CHAR(2) NOT NULL,
    joined_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, app_id)
);

-- Account Links (SERVICE → UNIFIED mode)
CREATE TABLE account_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_account_id UUID NOT NULL REFERENCES accounts(id),
    linked_account_id UUID NOT NULL REFERENCES accounts(id),
    status VARCHAR(20) DEFAULT 'PENDING',
    accepted_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
```

### auth_db (~20 tables)

Authorization, roles, and access control.

```sql
-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    description TEXT,
    level INT NOT NULL DEFAULT 0,
    scope VARCHAR(20) DEFAULT 'TENANT', -- SYSTEM, TENANT
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- Admins (separate from users)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name VARCHAR(100),
    scope VARCHAR(20) DEFAULT 'TENANT', -- SYSTEM, TENANT
    tenant_id UUID,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Admin-Role mapping
CREATE TABLE admin_roles (
    admin_id UUID NOT NULL REFERENCES admins(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    PRIMARY KEY (admin_id, role_id)
);

-- Operators (service-level access)
CREATE TABLE operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id),
    app_id UUID NOT NULL,
    country_code CHAR(2) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    permissions TEXT[],
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Sanctions (bans, suspensions)
CREATE TABLE sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL, -- BAN, SUSPEND, WARNING
    reason TEXT,
    expires_at TIMESTAMPTZ(6),
    issued_by UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL,
    name VARCHAR(100),
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    permissions TEXT[],
    rate_limit INT DEFAULT 1000,
    expires_at TIMESTAMPTZ(6),
    last_used_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
```

### legal_db (~12 tables)

Global compliance and consent management.

```sql
-- Law Registry
CREATE TABLE laws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE, -- PIPA, GDPR, CCPA, APPI
    name VARCHAR(200) NOT NULL,
    country_code CHAR(2) NOT NULL,
    region VARCHAR(50), -- EU, California
    min_age INT NOT NULL,
    data_retention_days INT,
    effective_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Law Requirements
CREATE TABLE law_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_id UUID NOT NULL REFERENCES laws(id),
    consent_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    description TEXT,
    legal_basis TEXT
);

-- Countries
CREATE TABLE countries (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    law_id UUID REFERENCES laws(id),
    default_locale VARCHAR(10) DEFAULT 'en'
);

-- Consent Documents (versioned)
CREATE TABLE consent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- TERMS_OF_SERVICE, PRIVACY_POLICY
    version VARCHAR(20) NOT NULL,
    country_code CHAR(2) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    effective_from TIMESTAMPTZ(6) NOT NULL,
    effective_until TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(type, version, country_code, locale)
);

-- Account Consents
CREATE TABLE account_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    app_id UUID NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    document_id UUID REFERENCES consent_documents(id),
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ(6),
    revoked_at TIMESTAMPTZ(6),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Data Subject Requests (GDPR DSR)
CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL, -- EXPORT, DELETE, RECTIFY, RESTRICT
    status VARCHAR(20) DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ(6),
    processor_id UUID,
    notes TEXT
);

-- Consent History (audit)
CREATE TABLE consent_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    consent_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- GRANTED, REVOKED
    ip_address INET,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
```

## Global Law Registry

### Supported Regulations

| Code | Country | Full Name                           | Min Age | Retention | Key Features          |
| ---- | ------- | ----------------------------------- | ------- | --------- | --------------------- |
| PIPA | KR      | Personal Information Protection Act | 14      | 3 years   | Night push (21-08)    |
| GDPR | EU      | General Data Protection Regulation  | 16      | As needed | Data portability, DSR |
| CCPA | US      | California Consumer Privacy Act     | 13      | 12 months | Opt-out, Do Not Sell  |
| APPI | JP      | Act on Protection of Personal Info  | None    | As needed | Cross-border transfer |

### Consent Types

| Type                  | Required | Description                 | PIPA | GDPR | CCPA | APPI |
| --------------------- | -------- | --------------------------- | ---- | ---- | ---- | ---- |
| TERMS_OF_SERVICE      | Yes      | Service terms acceptance    | O    | O    | O    | O    |
| PRIVACY_POLICY        | Yes      | Privacy policy acceptance   | O    | O    | O    | O    |
| MARKETING_EMAIL       | No       | Email marketing consent     | O    | O    | O    | O    |
| MARKETING_PUSH        | No       | Push notification consent   | O    | O    | O    | O    |
| MARKETING_PUSH_NIGHT  | No       | Night push (21:00-08:00)    | O    | -    | -    | -    |
| MARKETING_SMS         | No       | SMS marketing consent       | O    | O    | O    | O    |
| PERSONALIZED_ADS      | No       | Personalized advertising    | O    | O    | O    | O    |
| THIRD_PARTY_SHARING   | No       | Third-party data sharing    | O    | O    | O    | O    |
| CROSS_BORDER_TRANSFER | No       | International data transfer | O    | O    | -    | O    |
| ANALYTICS_COLLECTION  | No       | Analytics data collection   | O    | O    | O    | O    |

## Authentication Architecture

### Token Strategy

```
┌────────────────────────────────────────────────────────────┐
│                    Token Architecture                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Access Token (JWT RS256)                                   │
│  ├── TTL: 15 minutes                                        │
│  ├── Storage: Client memory (NOT localStorage)              │
│  ├── Verification: Local (JWKS endpoint)                    │
│  └── Contains: userId, apps, permissions                    │
│                                                             │
│  Refresh Token                                              │
│  ├── TTL: 14 days                                           │
│  ├── Storage: HttpOnly Secure Cookie                        │
│  ├── Verification: Valkey session lookup                    │
│  └── Rotation: New token on each refresh                    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
1. Login Request
   Browser → POST /v1/identity/login
   │
   ▼
2. Identity Service
   ├── Validate credentials (identity_db)
   ├── Check sanctions (auth_db)
   ├── Create session (Valkey + identity_db)
   └── Issue tokens
       ├── Access Token → Response body
       └── Refresh Token → HttpOnly Cookie
   │
   ▼
3. API Request
   Browser → API with Access Token (Authorization header)
   │
   ▼
4. Token Verification (Hybrid)
   ├── Local JWT validation (signature, expiry)
   └── Valkey session check (revocation)
   │
   ▼
5. Token Refresh (when expired)
   Browser → POST /v1/identity/refresh (with Cookie)
   │
   ▼
6. Logout
   Browser → POST /v1/identity/logout
   ├── Revoke session (Valkey)
   └── Clear Cookie
```

### Network Flow (K8s + Cilium)

```
┌──────────────────────────────────────────────────────────────┐
│                          Internet                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Cilium Gateway API                         │
│  ├── TLS Termination (Let's Encrypt)                         │
│  ├── Rate Limiting (100 req/min login)                       │
│  ├── WAF Rules (SQL injection, XSS)                          │
│  └── L7 Routing                                              │
└──────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
  accounts.girok.dev   api.girok.dev      my.girok.dev
            │                 │                 │
            ▼                 ▼                 ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│Identity Service│  │Personal Service│  │   Web App      │
│  (Pod: 2-10)   │  │  (Pod: 2-10)   │  │  (Pod: 2-10)   │
└───────┬────────┘  └───────┬────────┘  └────────────────┘
        │                   │
        ▼                   ▼
┌────────────────┐  ┌────────────────┐
│   PostgreSQL   │  │   PostgreSQL   │
│ identity_db x3 │  │  personal_db   │
└────────────────┘  └────────────────┘
        │
        ▼
┌────────────────┐
│     Valkey     │
│   (Sessions)   │
└────────────────┘
```

## Multi-App Support

**Core Concept**: Single account, multiple apps (any TLD), per-app access control via JWT `aud` claim.

### Architecture

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

### JWT Access Control (RFC 9068)

```typescript
// JWT Payload with per-app access control
interface JWTPayload {
  sub: string; // Account ID (same across all apps)
  aud: string; // App ID (audience) - KEY for access control
  iss: string; // Issuer (accounts.*.*)
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

// Access control flow:
// 1. User logs in at accounts.girok.dev → JWT with aud: 'my-girok'
// 2. User logs in at accounts.vero.net → JWT with aud: 'vero'
// 3. api.girok.dev only accepts JWT with aud: 'my-girok'
// 4. api.vero.net only accepts JWT with aud: 'vero'
```

### App Registration

```typescript
// Register new app with any domain
const app = await identityService.registerApp({
  slug: 'vero',
  name: 'Vero Service',
  domain: 'vero.net', // Any TLD
  identityDomain: 'accounts.vero.net',
  apiDomain: 'api.vero.net',
  allowedOrigins: ['https://vero.net', 'https://www.vero.net'],
  settings: {
    requireEmailVerification: true,
    allowedAuthMethods: ['password', 'google', 'kakao'],
    defaultCountry: 'KR',
  },
});
```

### Account-App Relationship

```typescript
// User joins app (same account, different app)
await identityService.joinApp({
  accountId: 'uuid', // Same account ID across all apps
  appId: 'vero-uuid', // App-specific
  countryCode: 'KR', // Per-app country
  consents: [
    { type: 'TERMS_OF_SERVICE', granted: true },
    { type: 'PRIVACY_POLICY', granted: true },
    { type: 'MARKETING_EMAIL', granted: false },
  ],
});
```

## Future-Proofing

### Passkeys (WebAuthn) Ready

```typescript
// Registration flow (prepared)
POST / v1 / identity / passkeys / register / options;
POST / v1 / identity / passkeys / register / verify;

// Login flow (prepared)
POST / v1 / identity / passkeys / login / options;
POST / v1 / identity / passkeys / login / verify;
```

### DPoP Token Binding (RFC 9449) Ready

Can be added without breaking changes:

```typescript
// Future addition
interface DPoPHeaders {
  DPoP: string; // Proof JWT
  Authorization: string; // DPoP access_token
}
```

### Service Extraction Path

When scale requires:

```
Phase 2 → Phase 3 Extraction:

1. Deploy auth-service pointing to auth_db (same DB)
2. Deploy legal-service pointing to legal_db (same DB)
3. Update routing: /v1/auth/* → auth-service
4. Update routing: /v1/legal/* → legal-service
5. Remove modules from identity-service

Zero downtime, no data migration.
```

## Domain Management Strategy

### URL Structure by App

Each app follows a consistent domain pattern:

```
App: my-girok (Primary)
├── accounts.girok.dev  → Identity Service (auth endpoints)
├── api.girok.dev       → Personal Service (business API)
├── my.girok.dev        → Web App (user frontend)
└── admin.girok.dev     → Web Admin (admin console)

App: vero (Future)
├── accounts.vero.dev   → Identity Service (shared instance)
├── api.vero.dev        → Vero Service (business API)
├── vero.dev            → Web App (user frontend)
└── admin.vero.dev      → Web Admin (admin console)
```

### Domain Ownership

| Domain Pattern  | Owner            | Purpose                     |
| --------------- | ---------------- | --------------------------- |
| accounts.\*.dev | Identity Service | Authentication, SSO         |
| api.\*.dev      | Business Service | App-specific business logic |
| \*.dev (root)   | Web App          | User-facing frontend        |
| admin.\*.dev    | Web Admin        | Administrative console      |

### Cilium Gateway Configuration

```yaml
# Multi-app Identity routing
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: identity-multi-app
  namespace: identity
spec:
  parentRefs:
    - name: main-gateway
      namespace: gateway
  hostnames:
    - 'accounts.girok.dev'
    - 'accounts.vero.dev'
    - 'accounts.*.dev' # Wildcard for future apps
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /v1/identity
      backendRefs:
        - name: identity-service
          port: 3005
    - matches:
        - path:
            type: PathPrefix
            value: /v1/auth
      backendRefs:
        - name: identity-service
          port: 3005
    - matches:
        - path:
            type: PathPrefix
            value: /v1/legal
      backendRefs:
        - name: identity-service
          port: 3005
```

### CORS Strategy

```typescript
// Dynamic CORS based on app_registry
async getCorsOrigins(appSlug: string): Promise<string[]> {
  const app = await this.prisma.appRegistry.findUnique({
    where: { slug: appSlug },
    select: { allowedOrigins: true },
  });
  return app?.allowedOrigins ?? [];
}

// NestJS CORS configuration
app.enableCors({
  origin: async (origin, callback) => {
    const allowed = await this.getAllAllowedOrigins();
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

### Cookie Strategy

#### Same-Domain Apps (girok.dev subdomains)

```typescript
// Shared cookie across subdomains
const cookieOptions = {
  domain: '.girok.dev', // accounts.girok.dev, my.girok.dev, api.girok.dev
  secure: true,
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
};
```

#### Cross-Domain Apps (girok.dev ↔ vero.dev)

```typescript
// Token-based auth for cross-domain
// Cookies cannot be shared across different root domains

// Option 1: Redirect-based SSO
// accounts.girok.dev → redirect → accounts.vero.dev with auth code

// Option 2: Token exchange
// Frontend stores access token in memory
// Refresh token via HttpOnly cookie on accounts.*.dev
```

### Database Scoping by App

All user data is scoped by `app_id` for proper isolation:

```sql
-- App-scoped user query
SELECT a.*, aa.status, aa.country_code
FROM accounts a
JOIN account_apps aa ON a.id = aa.account_id
WHERE aa.app_id = $1  -- app_id filter
  AND aa.status = 'ACTIVE';

-- App-scoped consent query
SELECT ac.*
FROM account_consents ac
WHERE ac.account_id = $1
  AND ac.app_id = $2;  -- app-specific consent
```

### Service Discovery

```typescript
// App registry lookup
interface AppRegistry {
  id: string;
  slug: string; // 'my-girok', 'vero'
  name: string;
  domain: string; // 'girok.dev', 'vero.dev'
  identityDomain: string; // 'accounts.girok.dev', 'accounts.vero.dev'
  apiDomain: string; // 'api.girok.dev', 'api.vero.dev'
  allowedOrigins: string[];
  settings: {
    requireEmailVerification: boolean;
    allowedAuthMethods: string[];
    defaultCountry: string;
    supportedCountries: string[];
  };
}
```

### Environment Variables by Domain

```env
# Identity Service (shared across apps)
IDENTITY_SERVICE_URL=https://accounts.girok.dev

# App-specific API URLs
MY_GIROK_API_URL=https://api.girok.dev
VERO_API_URL=https://api.vero.dev

# Dynamic configuration from app_registry
# No hardcoding - fetch from database
```

## Migration from auth-service

### Module Mapping

| auth-service Module | identity-service Module | Database    |
| ------------------- | ----------------------- | ----------- |
| auth/               | Identity Module         | identity_db |
| users/              | Identity Module         | identity_db |
| oauth-config/       | Identity Module         | identity_db |
| admin/              | Auth Module             | auth_db     |
| operator/           | Auth Module             | auth_db     |
| services/           | Auth Module             | auth_db     |
| legal/              | Legal Module            | legal_db    |

### Data Migration Strategy

1. **Create new databases** (identity_db, auth_db, legal_db)
2. **Export data** from girok_auth_db by domain
3. **Transform schema** to new structure
4. **Import data** to respective databases
5. **Verify data integrity**
6. **Switch traffic** to identity-service
7. **Deprecate auth-service**

---

**LLM Reference**: `.ai/services/identity-service.md`
**Related Docs**:

- [Architecture](.ai/architecture.md)
- [Global Account Policy](./GLOBAL_ACCOUNT.md)
- [Legal Consent Policy](./LEGAL_CONSENT.md)
