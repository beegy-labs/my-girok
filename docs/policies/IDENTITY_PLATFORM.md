# Identity Platform Policy

> Multi-app user management platform with Domain-Driven separation (2025)

## Executive Summary

The Identity Platform enables rapid creation of multiple apps (N apps) with shared user management. Key design principles:

- **Domain-Driven Separation**: 3 services, 3 databases (identity, auth, legal)
- **Independent Deployment**: Each service scales and deploys independently
- **Redpanda-Ready**: Outbox pattern prepared for Debezium CDC (Kafka-compatible, no JVM)
- **UUIDv7**: All IDs use RFC 9562 UUIDv7 (time-sortable)

---

## Domain Boundaries (CRITICAL)

> **WARNING**: Each service has a strict domain boundary. DO NOT mix domains.

### The Three Services

```
+==================================================================================+
|                          IDENTITY PLATFORM (Phase 3)                              |
|                                                                                   |
|   +------------------------+  +------------------------+  +---------------------+ |
|   |   IDENTITY-SERVICE     |  |     AUTH-SERVICE       |  |    LEGAL-SERVICE    | |
|   |      (Port 3000)       |  |      (Port 3001)       |  |     (Port 3005)     | |
|   +------------------------+  +------------------------+  +---------------------+ |
|   |                        |  |                        |  |                     | |
|   |  * accounts            |  |  * roles               |  |  * consents         | |
|   |  * sessions            |  |  * permissions         |  |  * legal-documents  | |
|   |  * devices             |  |  * operators           |  |  * law-registry     | |
|   |  * profiles            |  |  * sanctions           |  |  * dsr-requests     | |
|   |  * credentials         |  |  * api-keys            |  |                     | |
|   |  * app-registry        |  |  * admins              |  |                     | |
|   |                        |  |                        |  |                     | |
|   +------------------------+  +------------------------+  +---------------------+ |
|              |                         |                          |               |
|              v                         v                          v               |
|        identity_db                 auth_db                   legal_db             |
|       (PostgreSQL)               (PostgreSQL)              (PostgreSQL)           |
|                                                                                   |
+==================================================================================+
```

### Domain Ownership Table

| Domain        | Service          | Database    | Port | Owner                    |
| ------------- | ---------------- | ----------- | ---- | ------------------------ |
| **Accounts**  | identity-service | identity_db | 3000 | User core identity       |
| **Sessions**  | identity-service | identity_db | 3000 | Login sessions           |
| **Devices**   | identity-service | identity_db | 3000 | Device management        |
| **Profiles**  | identity-service | identity_db | 3000 | User profile data        |
| **Roles**     | auth-service     | auth_db     | 3001 | RBAC role definitions    |
| **Perms**     | auth-service     | auth_db     | 3001 | Permission management    |
| **Operators** | auth-service     | auth_db     | 3001 | Admin/operator accounts  |
| **Sanctions** | auth-service     | auth_db     | 3001 | User/operator penalties  |
| **Consents**  | legal-service    | legal_db    | 3005 | User consent records     |
| **Documents** | legal-service    | legal_db    | 3005 | ToS, Privacy Policy, etc |
| **Laws**      | legal-service    | legal_db    | 3005 | Country-specific laws    |
| **DSR**       | legal-service    | legal_db    | 3005 | GDPR data requests       |

### Anti-Patterns (DO NOT DO)

```
+------------------------------------------------------------------+
|                        ANTI-PATTERNS                              |
+------------------------------------------------------------------+
|                                                                   |
|  [X] DO NOT add roles/permissions tables to identity-service      |
|                                                                   |
|  [X] DO NOT add consent logic to identity-service                 |
|                                                                   |
|  [X] DO NOT add account/session tables to auth-service            |
|                                                                   |
|  [X] DO NOT create cross-database JOINs                           |
|                                                                   |
|  [X] DO NOT add legal document management to auth-service         |
|                                                                   |
|  [X] DO NOT put law-registry in identity-service                  |
|                                                                   |
+------------------------------------------------------------------+
```

### Correct Patterns

```
+------------------------------------------------------------------+
|                        CORRECT PATTERNS                           |
+------------------------------------------------------------------+
|                                                                   |
|  [OK] identity-service calls auth-service via gRPC to check       |
|       sanctions before allowing login                             |
|                                                                   |
|  [OK] Registration saga coordinates identity + legal via          |
|       API composition (not cross-DB transactions)                 |
|                                                                   |
|  [OK] BFF aggregates data from all 3 services for UI              |
|                                                                   |
|  [OK] Each service publishes events to its own outbox_events      |
|       table within its database                                   |
|                                                                   |
|  [OK] Cross-service references use UUID (no foreign keys)         |
|       Example: legal_db.account_consents.account_id               |
|       references identity_db.accounts.id (no FK constraint)       |
|                                                                   |
+------------------------------------------------------------------+
```

### Inter-Service Communication

```
                          gRPC Calls
    +------------------+            +------------------+
    | identity-service | <--------> |   auth-service   |
    +------------------+            +------------------+
            |                               |
            |          gRPC Calls           |
            v                               v
    +------------------+            +------------------+
    |  legal-service   | <--------> |   auth-service   |
    +------------------+            +------------------+

    Communication Rules:
    - Synchronous: gRPC for real-time queries
    - Asynchronous: Outbox events for eventual consistency
    - NO direct database access across services
```

---

## Architecture Overview

### Current State (Phase 3 - Separated Services)

```
┌──────────────────────────────────────────────────────────────────────┐
│                  Identity Platform (3 Services, 3 DBs)                │
│                                                                       │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐        │
│  │  Identity   │       │    Auth     │       │    Legal    │        │
│  │  Service    │◄─────►│   Service   │◄─────►│   Service   │        │
│  │ (Port 3000) │ gRPC  │ (Port 3001) │ gRPC  │ (Port 3005) │        │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘        │
│         │                     │                     │                │
│         ▼                     ▼                     ▼                │
│   identity_db             auth_db              legal_db              │
│   (PostgreSQL)           (PostgreSQL)         (PostgreSQL)           │
│         │                     │                     │                │
│         ▼                     ▼                     ▼                │
│   outbox_events          outbox_events         outbox_events         │
│         │                     │                     │                │
│         └─────────────────────┼─────────────────────┘                │
│                               ▼                                      │
│                    Polling Publisher (5s cron)                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Future State (With Redpanda CDC)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Separated Services (+ Real-time Events)            │
│                                                                       │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐        │
│  │  Identity   │       │    Auth     │       │    Legal    │        │
│  │  Service    │◄─────►│   Service   │◄─────►│   Service   │        │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘        │
│         │    gRPC             │    gRPC             │                │
│         ▼                     ▼                     ▼                │
│   identity_db             auth_db              legal_db              │
│         │                     │                     │                │
│         └─────────────────────┼─────────────────────┘                │
│                               ▼                                      │
│                        outbox_events                                 │
│                               │                                      │
│                               ▼                                      │
│                    Debezium CDC Connector                            │
│                               │                                      │
│                               ▼                                      │
│                         Redpanda                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Zero Migration Guarantee

### Service Separation Achieved

Services are now fully separated with dedicated databases. Future evolution (Redpanda CDC) requires no code or data migration.

| Component             | Phase 3 (Current) | Phase 4 (Future)    | Migration     |
| --------------------- | ----------------- | ------------------- | ------------- |
| Services              | 3 separate        | 3 separate          | **None**      |
| Databases             | 3 separate        | 3 separate          | **None**      |
| Service Communication | gRPC              | gRPC                | **None**      |
| Event Broker          | Polling (5s cron) | Redpanda + Debezium | Config change |
| Code Changes          | -                 | -                   | **None**      |

### Service Architecture

```
services/
├── identity-service/    # Port 3000 → identity_db
│   ├── accounts/        # User accounts (UUIDv7)
│   ├── sessions/        # Login sessions
│   ├── devices/         # Device management
│   └── profiles/        # User profiles
│
├── auth-service/        # Port 3001 → auth_db
│   ├── roles/           # RBAC roles
│   ├── permissions/     # Fine-grained permissions
│   ├── operators/       # Service operators
│   └── sanctions/       # User/operator sanctions
│
└── legal-service/       # Port 3005 → legal_db
    ├── consents/        # User consent records
    ├── documents/       # Legal documents (ToS, Privacy)
    ├── law_registry/    # Country-specific laws
    └── dsr_requests/    # Data Subject Requests (GDPR/PIPA)
```

---

## Database Schemas

> **All IDs use UUIDv7 (RFC 9562)** - Generated by application, not database

### identity_db

```sql
-- Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY,  -- UUIDv7 from application
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    account_mode VARCHAR(20) DEFAULT 'SERVICE',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Account Profiles
CREATE TABLE account_profiles (
    id UUID PRIMARY KEY,  -- UUIDv7
    account_id UUID NOT NULL REFERENCES accounts(id),
    name VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20),
    UNIQUE(account_id)
);

-- Credentials
CREATE TABLE credentials (
    id UUID PRIMARY KEY,  -- UUIDv7
    account_id UUID NOT NULL REFERENCES accounts(id),
    type VARCHAR(20) NOT NULL,
    provider VARCHAR(50),
    credential_id TEXT,
    public_key TEXT,
    password_hash TEXT,
    oauth_provider_id TEXT,
    last_used_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY,  -- UUIDv7
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
    id UUID PRIMARY KEY,  -- UUIDv7
    account_id UUID NOT NULL REFERENCES accounts(id),
    device_fingerprint VARCHAR(64) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20),
    os VARCHAR(50),
    browser VARCHAR(50),
    trusted BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- App Registry
CREATE TABLE app_registry (
    id UUID PRIMARY KEY,  -- UUIDv7
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    identity_domain VARCHAR(255) NOT NULL,
    api_domain VARCHAR(255) NOT NULL,
    allowed_origins TEXT[],
    status VARCHAR(20) DEFAULT 'ACTIVE',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Account-App Relationship
CREATE TABLE account_apps (
    id UUID PRIMARY KEY,  -- UUIDv7
    account_id UUID NOT NULL REFERENCES accounts(id),
    app_id UUID NOT NULL REFERENCES app_registry(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    country_code CHAR(2) NOT NULL,
    joined_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, app_id)
);

-- App Security Configs
CREATE TABLE app_security_configs (
    id UUID PRIMARY KEY,  -- UUIDv7
    app_id UUID NOT NULL REFERENCES app_registry(id) UNIQUE,
    security_level VARCHAR(20) DEFAULT 'STRICT',
    domain_validation_enabled BOOLEAN DEFAULT TRUE,
    allowed_domains TEXT[] DEFAULT '{}',
    jwt_validation_enabled BOOLEAN DEFAULT TRUE,
    jwt_aud_validation BOOLEAN DEFAULT TRUE,
    header_validation_enabled BOOLEAN DEFAULT TRUE,
    require_app_id BOOLEAN DEFAULT TRUE,
    require_app_secret BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT jwt_always_enabled CHECK (jwt_validation_enabled = TRUE)
);

-- App Test Modes
CREATE TABLE app_test_modes (
    id UUID PRIMARY KEY,  -- UUIDv7
    app_id UUID NOT NULL REFERENCES app_registry(id) UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    allowed_ips CIDR[] NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ(6),
    disabled_layers TEXT[] DEFAULT '{}',
    enabled_by UUID,
    enabled_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT no_jwt_disable CHECK (NOT ('jwt' = ANY(disabled_layers))),
    CONSTRAINT max_duration CHECK (expires_at <= NOW() + INTERVAL '7 days')
);

-- App Service Status
CREATE TABLE app_service_status (
    id UUID PRIMARY KEY,  -- UUIDv7
    app_id UUID NOT NULL REFERENCES app_registry(id) UNIQUE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    maintenance_enabled BOOLEAN DEFAULT FALSE,
    maintenance_message TEXT,
    maintenance_allowed_roles TEXT[] DEFAULT '{}',
    maintenance_start_at TIMESTAMPTZ(6),
    maintenance_end_at TIMESTAMPTZ(6),
    maintenance_allow_read_only BOOLEAN DEFAULT FALSE,
    shutdown_scheduled BOOLEAN DEFAULT FALSE,
    shutdown_scheduled_at TIMESTAMPTZ(6),
    shutdown_reason TEXT,
    shutdown_notify_users BOOLEAN DEFAULT TRUE,
    shutdown_data_retention_days INT DEFAULT 90,
    suspended_at TIMESTAMPTZ(6),
    suspended_by UUID,
    suspended_reason TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'SUSPENDED', 'TERMINATED'))
);

-- App Version Policies
CREATE TABLE app_version_policies (
    id UUID PRIMARY KEY,  -- UUIDv7
    app_id UUID NOT NULL REFERENCES app_registry(id),
    platform VARCHAR(20) NOT NULL,
    min_version VARCHAR(20) NOT NULL,
    recommended_version VARCHAR(20) NOT NULL,
    current_version VARCHAR(20) NOT NULL,
    force_update_enabled BOOLEAN DEFAULT TRUE,
    force_update_message TEXT DEFAULT 'Please update to continue using the app',
    force_update_store_url TEXT,
    soft_update_enabled BOOLEAN DEFAULT TRUE,
    soft_update_message TEXT DEFAULT 'A new version is available',
    soft_update_dismissible BOOLEAN DEFAULT TRUE,
    soft_update_remind_after_days INT DEFAULT 3,
    deprecated_versions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(app_id, platform)
);

-- Outbox Events (for Kafka-ready event publishing)
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,  -- UUIDv7 from application
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ(6)
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at)
    WHERE published_at IS NULL;
```

### auth_db

```sql
-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY,  -- UUIDv7
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    description TEXT,
    level INT NOT NULL DEFAULT 0,
    scope VARCHAR(20) DEFAULT 'TENANT',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY,  -- UUIDv7
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Role-Permission Mapping
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- Admins
CREATE TABLE admins (
    id UUID PRIMARY KEY,  -- UUIDv7
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name VARCHAR(100),
    scope VARCHAR(20) DEFAULT 'TENANT',
    tenant_id UUID,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Admin-Role Mapping
CREATE TABLE admin_roles (
    admin_id UUID NOT NULL REFERENCES admins(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    PRIMARY KEY (admin_id, role_id)
);

-- Operators
CREATE TABLE operators (
    id UUID PRIMARY KEY,  -- UUIDv7
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

-- Sanctions
CREATE TABLE sanctions (
    id UUID PRIMARY KEY,  -- UUIDv7
    account_id UUID NOT NULL,  -- References identity_db.accounts (no FK)
    type VARCHAR(20) NOT NULL,
    reason TEXT,
    expires_at TIMESTAMPTZ(6),
    issued_by UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,  -- UUIDv7
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

-- Outbox Events
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,  -- UUIDv7
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ(6)
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at)
    WHERE published_at IS NULL;
```

### legal_db

```sql
-- Law Registry
CREATE TABLE laws (
    id UUID PRIMARY KEY,  -- UUIDv7
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    country_code CHAR(2) NOT NULL,
    region VARCHAR(50),
    min_age INT NOT NULL,
    data_retention_days INT,
    effective_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Law Requirements
CREATE TABLE law_requirements (
    id UUID PRIMARY KEY,  -- UUIDv7
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

-- Consent Documents
CREATE TABLE consent_documents (
    id UUID PRIMARY KEY,  -- UUIDv7
    type VARCHAR(50) NOT NULL,
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
    id UUID PRIMARY KEY,  -- UUIDv7
    account_id UUID NOT NULL,  -- References identity_db.accounts (no FK)
    app_id UUID NOT NULL,      -- References identity_db.app_registry (no FK)
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
    id UUID PRIMARY KEY,  -- UUIDv7
    account_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ(6),
    processor_id UUID,
    notes TEXT
);

-- Consent History (Audit)
CREATE TABLE consent_history (
    id UUID PRIMARY KEY,  -- UUIDv7
    account_id UUID NOT NULL,
    consent_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    ip_address INET,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Outbox Events
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,  -- UUIDv7
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ(6)
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at)
    WHERE published_at IS NULL;
```

---

## Security Features

### Multi-Factor Authentication (MFA)

The identity platform supports multiple MFA methods for enhanced account security.

#### Supported Methods

| Method | RFC/Standard | Description                                                                               |
| ------ | ------------ | ----------------------------------------------------------------------------------------- |
| TOTP   | RFC 6238     | Time-based One-Time Password using authenticator apps (Google Authenticator, Authy, etc.) |
| SMS    | -            | Verification code sent via SMS to registered phone number                                 |
| EMAIL  | -            | Verification code sent to registered email address                                        |

#### MFA Enrollment Flow

```
1. User requests MFA enrollment
   POST /accounts/:id/mfa/enable
   Body: { "method": "TOTP" }

2. Server generates secret and returns setup data
   Response: {
     "secret": "JBSWY3DPEHPK3PXP",
     "qrCode": "data:image/png;base64,...",
     "backupCodes": ["12345678", "87654321", ...]
   }

3. User configures authenticator app and verifies
   POST /accounts/:id/mfa/verify
   Body: { "code": "123456" }

4. MFA is now active for the account
```

#### Database Fields (accounts table)

| Field              | Type        | Description                      |
| ------------------ | ----------- | -------------------------------- |
| `mfa_enabled`      | BOOLEAN     | Whether MFA is active            |
| `mfa_secret`       | TEXT        | Encrypted TOTP secret (nullable) |
| `mfa_backup_codes` | TEXT[]      | Hashed backup codes              |
| `mfa_method`       | VARCHAR(20) | TOTP, SMS, or EMAIL              |

### Account Locking

Protects against brute-force attacks with automatic lockout.

#### Lockout Configuration

| Setting             | Value      | Description                                   |
| ------------------- | ---------- | --------------------------------------------- |
| Max Failed Attempts | 5          | Consecutive failed login attempts before lock |
| Lock Duration       | 15 minutes | Time account remains locked                   |
| Reset Window        | 30 minutes | Failed attempt counter reset time             |

#### Database Fields (accounts table)

| Field                   | Type        | Description               |
| ----------------------- | ----------- | ------------------------- |
| `failed_login_attempts` | INT         | Counter (0-5)             |
| `locked_until`          | TIMESTAMPTZ | Account unlock timestamp  |
| `last_password_change`  | TIMESTAMPTZ | Last password update time |

#### Lockout Logic

```typescript
async validateLogin(accountId: string, password: string): Promise<boolean> {
  const account = await this.getAccount(accountId);

  // Check if locked
  if (account.lockedUntil && account.lockedUntil > new Date()) {
    throw new AccountLockedException(account.lockedUntil);
  }

  // Validate password
  const isValid = await bcrypt.compare(password, account.passwordHash);

  if (!isValid) {
    const attempts = account.failedLoginAttempts + 1;
    const updates: Partial<Account> = { failedLoginAttempts: attempts };

    if (attempts >= 5) {
      updates.lockedUntil = addMinutes(new Date(), 15);
    }

    await this.updateAccount(accountId, updates);
    throw new InvalidCredentialsException();
  }

  // Reset on successful login
  await this.updateAccount(accountId, { failedLoginAttempts: 0, lockedUntil: null });
  return true;
}
```

### Device Trust

Manage trusted devices for secure account access.

#### Database Fields (devices table)

| Field             | Type        | Description                       |
| ----------------- | ----------- | --------------------------------- |
| `fingerprint`     | VARCHAR(64) | Device fingerprint hash           |
| `device_type`     | ENUM        | WEB, IOS, ANDROID, DESKTOP, OTHER |
| `is_trusted`      | BOOLEAN     | Whether device is trusted         |
| `trusted_at`      | TIMESTAMPTZ | When trust was granted            |
| `platform`        | VARCHAR(50) | OS platform                       |
| `os_version`      | VARCHAR(50) | OS version                        |
| `app_version`     | VARCHAR(20) | App version                       |
| `browser_name`    | VARCHAR(50) | Browser name (web)                |
| `browser_version` | VARCHAR(20) | Browser version (web)             |
| `push_token`      | TEXT        | Push notification token           |
| `push_platform`   | ENUM        | FCM, APNS, WEB_PUSH               |

---

## DSR (Data Subject Request) Processing

### Overview

GDPR Article 15-22 compliance for data subject rights. All DSR requests are tracked in `legal_db.dsr_requests`.

### Request Types

| Type                 | GDPR Article | Description                | SLA      |
| -------------------- | ------------ | -------------------------- | -------- |
| `ACCESS`             | Art. 15      | Export all personal data   | 30 days  |
| `RECTIFICATION`      | Art. 16      | Correct inaccurate data    | 30 days  |
| `ERASURE`            | Art. 17      | Right to be forgotten      | 30 days  |
| `PORTABILITY`        | Art. 20      | Machine-readable export    | 30 days  |
| `RESTRICTION`        | Art. 18      | Limit processing           | 72 hours |
| `OBJECTION`          | Art. 21      | Object to processing       | 72 hours |
| `AUTOMATED_DECISION` | Art. 22      | Review automated decisions | 30 days  |

### Processing Workflow

```
1. User submits DSR request
   POST /dsr-requests { type, reason }

2. Identity verification (mandatory)
   - Email OTP for online requests
   - Document upload for mail requests

3. Request assessment
   - Validate scope (single service vs platform)
   - Check for blocking conditions (legal hold, ongoing investigation)

4. Execution
   - ACCESS: Generate data export package
   - ERASURE: Execute deletion saga across all DBs
   - PORTABILITY: JSON/CSV export with schema

5. Completion & notification
   - Update status to COMPLETED
   - Send confirmation email with download link (7 days)
   - Log to consent_history for audit trail
```

### Status Flow

```
PENDING → VERIFIED → IN_PROGRESS → COMPLETED
    ↓          ↓           ↓
CANCELLED  REJECTED   AWAITING_INFO
```

---

## Consent Withdrawal

### Withdrawal Rules

| Consent Type            | Withdrawable? | Effect on Account              |
| ----------------------- | ------------- | ------------------------------ |
| `TERMS_OF_SERVICE`      | ❌ No         | Cannot withdraw while active   |
| `PRIVACY_POLICY`        | ❌ No         | Cannot withdraw while active   |
| `MARKETING_EMAIL`       | ✅ Yes        | Stop marketing emails          |
| `MARKETING_PUSH`        | ✅ Yes        | Stop push notifications        |
| `MARKETING_PUSH_NIGHT`  | ✅ Yes        | Stop night-time push (KR PIPA) |
| `MARKETING_SMS`         | ✅ Yes        | Stop SMS marketing             |
| `PERSONALIZED_ADS`      | ✅ Yes        | Disable personalized ads       |
| `THIRD_PARTY_SHARING`   | ✅ Yes        | Stop data sharing              |
| `CROSS_BORDER_TRANSFER` | ✅ Yes        | Restrict to domestic only      |
| `CROSS_SERVICE_SHARING` | ✅ Yes        | Stop cross-app data sharing    |

### Withdrawal API

```http
DELETE /consents/{consentId}
Content-Type: application/json

{
  "reason": "No longer interested in marketing",
  "ipAddress": "1.2.3.4",
  "userAgent": "Mozilla/5.0..."
}
```

### Audit Trail

Every withdrawal creates a `ConsentLog` entry:

- `action`: `WITHDRAWN`
- `previousState`: Original consent data
- `newState`: Withdrawal timestamp and reason
- `metadata`: IP, User-Agent, reason

### Compensation (Saga Rollback)

For saga rollback scenarios, bulk withdrawal is allowed even for required consents:

- Method: `withdrawBulkConsents(consentIds, reason)`
- Marks `metadata.isCompensation: true`
- Used only during registration failure cleanup

---

## Sanction System

### Sanction Types

| Type                  | Severity    | Effect                             |
| --------------------- | ----------- | ---------------------------------- |
| `WARNING`             | LOW         | Notification only, no restriction  |
| `TEMPORARY_BAN`       | MEDIUM-HIGH | Account access blocked temporarily |
| `PERMANENT_BAN`       | CRITICAL    | Account permanently disabled       |
| `FEATURE_RESTRICTION` | LOW-MEDIUM  | Specific features disabled         |

### Sanction Workflow

```
1. Issue sanction
   POST /sanctions {
     subjectId, subjectType, sanctionType, reason, expiresAt
   }

2. Notification
   - Email notification (immediate)
   - In-app notification (next login)
   - Push notification (if enabled)

3. Enforcement
   - Session revocation for bans
   - Feature flags updated for restrictions
   - Access guard checks on every request

4. Expiration or revocation
   - Auto-expire at expiresAt
   - Manual revoke: POST /sanctions/{id}/revoke
```

### Appeal Process

```
1. User submits appeal
   POST /sanctions/{sanctionId}/appeal {
     reason, evidence (optional)
   }

2. Appeal status: PENDING

3. Review by operator/admin
   - UNDER_REVIEW: Being investigated
   - ESCALATED: Sent to higher authority

4. Resolution
   - APPROVED: Sanction revoked, access restored
   - REJECTED: Sanction remains, reason provided

5. Notification
   - Email with decision and explanation
   - Appeal decision logged for audit
```

### Appeal Status Flow

```
PENDING → UNDER_REVIEW → APPROVED
              ↓              ↓
          ESCALATED      REJECTED
```

---

## Data Isolation Patterns

### Pattern 1: Transactional Outbox

Ensures atomic database update and event publishing (no dual-write problem).

```typescript
// Same transaction: update + outbox insert
@Transactional()
async createAccount(dto: CreateAccountDto): Promise<Account> {
  const id = ID.generate(); // UUIDv7

  // Step 1: Create account
  const account = await this.prisma.accounts.create({
    data: { id, ...dto }
  });

  // Step 2: Write to outbox (same transaction)
  await this.prisma.outboxEvents.create({
    data: {
      id: ID.generate(),
      aggregateType: 'ACCOUNT',
      aggregateId: account.id,
      eventType: 'identity.account.created',
      payload: { accountId: account.id, email: account.email },
    }
  });

  return account;
}
```

### Pattern 2: Outbox Publisher

**Phase 1 (Now): Polling**

```typescript
@Injectable()
export class OutboxPollingPublisher {
  @Cron('*/5 * * * * *') // Every 5 seconds
  async publishPendingEvents() {
    const events = await this.prisma.outboxEvents.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    for (const event of events) {
      // Publish to NATS (or in-memory for now)
      await this.eventBus.publish(event.eventType, event.payload);

      // Mark as published
      await this.prisma.outboxEvents.update({
        where: { id: event.id },
        data: { publishedAt: new Date() },
      });
    }
  }
}
```

**Phase 2 (Future): Debezium CDC with Redpanda**

```yaml
# Redpanda + Debezium Connector Configuration
# Redpanda is Kafka API-compatible, no JVM required (C++ based)
# Benefits: Lower latency, simpler ops, perfect for homelab

apiVersion: redpanda.vectorized.io/v1alpha1
kind: Cluster
metadata:
  name: identity-redpanda
spec:
  replicas: 1 # Homelab: single node, scale later
  resources:
    requests:
      cpu: 1
      memory: 2Gi

---
# Debezium works with Redpanda via Kafka Connect
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnector
metadata:
  name: identity-outbox-connector
spec:
  class: io.debezium.connector.postgresql.PostgresConnector
  config:
    database.hostname: identity-db
    database.dbname: identity_db
    table.include.list: public.outbox_events
    transforms: outbox
    transforms.outbox.type: io.debezium.transforms.outbox.EventRouter
    transforms.outbox.table.field.event.id: id
    transforms.outbox.table.field.event.key: aggregate_id
    transforms.outbox.table.field.event.type: event_type
    transforms.outbox.table.field.event.payload: payload
```

### Pattern 3: Saga Orchestrator

For operations spanning multiple databases.

```typescript
// Saga State Machine
interface SagaStep {
  id: string;
  sagaId: string;
  stepName: string;
  status: 'PENDING' | 'COMPLETED' | 'COMPENSATED';
  data: Record<string, any>;
  createdAt: Date;
}

class RegistrationSaga {
  private steps: SagaStep[] = [];

  async execute(dto: RegisterDto): Promise<Account> {
    const sagaId = ID.generate();

    try {
      // Step 1: Create account (identity_db)
      const account = await this.identityModule.createAccount(dto);
      this.steps.push({
        id: ID.generate(),
        sagaId,
        stepName: 'CREATE_ACCOUNT',
        status: 'COMPLETED',
        data: { accountId: account.id },
        createdAt: new Date(),
      });

      // Step 2: Record consents (legal_db)
      await this.legalModule.recordConsents(account.id, dto.appId, dto.consents);
      this.steps.push({
        id: ID.generate(),
        sagaId,
        stepName: 'RECORD_CONSENTS',
        status: 'COMPLETED',
        data: { accountId: account.id },
        createdAt: new Date(),
      });

      return account;
    } catch (error) {
      await this.compensate();
      throw error;
    }
  }

  private async compensate(): Promise<void> {
    // Reverse order compensation
    for (const step of this.steps.reverse()) {
      if (step.status === 'COMPLETED') {
        switch (step.stepName) {
          case 'RECORD_CONSENTS':
            await this.legalModule.deleteConsents(step.data.accountId);
            break;
          case 'CREATE_ACCOUNT':
            await this.identityModule.deleteAccount(step.data.accountId);
            break;
        }
        step.status = 'COMPENSATED';
      }
    }
  }
}
```

### Pattern 4: API Composition

For queries spanning multiple modules (no cross-DB JOINs).

```typescript
@Injectable()
export class UserProfileComposer {
  constructor(
    @Inject('IIdentityModule') private identity: IIdentityModule,
    @Inject('IAuthModule') private auth: IAuthModule,
    @Inject('ILegalModule') private legal: ILegalModule,
  ) {}

  async getFullProfile(accountId: string, appId: string): Promise<UserProfile> {
    // Parallel queries to different databases
    const [account, sanctions, consents] = await Promise.all([
      this.identity.getAccount(accountId), // identity_db
      this.auth.getActiveSanctions(accountId), // auth_db
      this.legal.getConsents(accountId, appId), // legal_db
    ]);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Application-level composition
    return {
      id: account.id,
      email: account.email,
      status: account.status,
      isSanctioned: sanctions.length > 0,
      sanctions: sanctions.map((s) => ({
        type: s.type,
        reason: s.reason,
        expiresAt: s.expiresAt,
      })),
      consents: consents.map((c) => ({
        type: c.consentType,
        granted: c.granted,
        grantedAt: c.grantedAt,
      })),
    };
  }
}
```

---

## Module Interfaces (SSOT)

> Location: `packages/types/src/identity/interfaces.ts`

```typescript
// ============================================================
// IDENTITY MODULE INTERFACE
// ============================================================
export interface IIdentityModule {
  // Account operations
  getAccount(id: string): Promise<Account | null>;
  getAccountByEmail(email: string): Promise<Account | null>;
  createAccount(dto: CreateAccountDto): Promise<Account>;
  updateAccount(id: string, dto: UpdateAccountDto): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  // Session operations
  createSession(accountId: string, device: DeviceInfo): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllSessions(accountId: string): Promise<void>;

  // App Registry
  getApp(slug: string): Promise<AppRegistry | null>;
  getAppById(id: string): Promise<AppRegistry | null>;
  getAppSecurityConfig(appId: string): Promise<AppSecurityConfig | null>;
  getAppServiceStatus(appId: string): Promise<AppServiceStatus | null>;
  getAppVersionPolicy(appId: string, platform: string): Promise<AppVersionPolicy | null>;
}

// ============================================================
// AUTH MODULE INTERFACE
// ============================================================
export interface IAuthModule {
  // Sanctions
  getActiveSanctions(accountId: string): Promise<Sanction[]>;
  createSanction(dto: CreateSanctionDto): Promise<Sanction>;
  revokeSanction(sanctionId: string): Promise<void>;

  // Roles
  getAccountRoles(accountId: string, appId: string): Promise<Role[]>;
  assignRole(accountId: string, roleId: string): Promise<void>;
  revokeRole(accountId: string, roleId: string): Promise<void>;

  // Permissions
  getAccountPermissions(accountId: string, appId: string): Promise<string[]>;
}

// ============================================================
// LEGAL MODULE INTERFACE
// ============================================================
export interface ILegalModule {
  // Consents
  getRequiredConsents(appId: string, countryCode: string): Promise<ConsentRequirement[]>;
  getAccountConsents(accountId: string, appId: string): Promise<AccountConsent[]>;
  recordConsent(dto: RecordConsentDto): Promise<AccountConsent>;
  revokeConsent(consentId: string): Promise<void>;
  deleteConsents(accountId: string): Promise<void>;

  // DSR
  createDSR(dto: CreateDSRDto): Promise<DataSubjectRequest>;
  getDSRStatus(dsrId: string): Promise<DataSubjectRequest | null>;
}
```

### Implementation Strategy

```typescript
// ============================================================
// PHASE 1: IN-PROCESS IMPLEMENTATION
// ============================================================
@Injectable()
export class IdentityModuleLocal implements IIdentityModule {
  constructor(private prisma: IdentityPrismaService) {}

  async getAccount(id: string): Promise<Account | null> {
    return this.prisma.accounts.findUnique({ where: { id } });
  }

  async createAccount(dto: CreateAccountDto): Promise<Account> {
    const id = ID.generate(); // UUIDv7
    return this.prisma.accounts.create({ data: { id, ...dto } });
  }
  // ... other methods
}

// ============================================================
// PHASE 2: GRPC IMPLEMENTATION (SEPARATED)
// ============================================================
@Injectable()
export class IdentityModuleRemote implements IIdentityModule {
  constructor(private grpcClient: IdentityServiceClient) {}

  async getAccount(id: string): Promise<Account | null> {
    const response = await this.grpcClient.getAccount({ id });
    return response.account ?? null;
  }

  async createAccount(dto: CreateAccountDto): Promise<Account> {
    const response = await this.grpcClient.createAccount(dto);
    return response.account;
  }
  // ... other methods
}

// ============================================================
// MODULE CONFIGURATION (SWITCH VIA ENV)
// ============================================================
@Module({
  providers: [
    {
      provide: 'IIdentityModule',
      useFactory: (local: IdentityModuleLocal, remote: IdentityModuleRemote) => {
        return process.env.IDENTITY_MODE === 'remote' ? remote : local;
      },
      inject: [IdentityModuleLocal, IdentityModuleRemote],
    },
  ],
})
export class IdentityIntegrationModule {}
```

---

## Event Types (SSOT)

> Location: `packages/types/src/events/`

```typescript
// packages/types/src/events/identity.events.ts
export const IDENTITY_EVENTS = {
  // Account
  ACCOUNT_CREATED: 'identity.account.created',
  ACCOUNT_UPDATED: 'identity.account.updated',
  ACCOUNT_DELETED: 'identity.account.deleted',
  ACCOUNT_EMAIL_VERIFIED: 'identity.account.email_verified',

  // Session
  SESSION_CREATED: 'identity.session.created',
  SESSION_REVOKED: 'identity.session.revoked',

  // App
  APP_REGISTERED: 'identity.app.registered',
  APP_STATUS_CHANGED: 'identity.app.status_changed',
} as const;

export interface AccountCreatedEvent {
  type: typeof IDENTITY_EVENTS.ACCOUNT_CREATED;
  payload: {
    accountId: string;
    email: string;
    appId: string;
    countryCode: string;
    timestamp: string;
  };
}

// packages/types/src/events/auth.events.ts
export const AUTH_EVENTS = {
  SANCTION_CREATED: 'auth.sanction.created',
  SANCTION_REVOKED: 'auth.sanction.revoked',
  ROLE_ASSIGNED: 'auth.role.assigned',
  ROLE_REVOKED: 'auth.role.revoked',
} as const;

// packages/types/src/events/legal.events.ts
export const LEGAL_EVENTS = {
  CONSENT_GRANTED: 'legal.consent.granted',
  CONSENT_REVOKED: 'legal.consent.revoked',
  DSR_REQUESTED: 'legal.dsr.requested',
  DSR_COMPLETED: 'legal.dsr.completed',
} as const;
```

---

## Security Configuration

### Triple-Layer Access Control

```
Request → [Version Check] → [Service Status] → [Domain] → [JWT] → [Header] → Access
              │                    │               │          │         │
              ▼                    ▼               ▼          ▼         ▼
         426 or OK            503 or OK      Configurable  ALWAYS  Configurable
```

### Security Levels

| Level    | Domain | JWT | Header | Use Case              |
| -------- | ------ | --- | ------ | --------------------- |
| STRICT   | ✅     | ✅  | ✅     | Production (default)  |
| STANDARD | ❌     | ✅  | ✅     | Staging, internal API |
| RELAXED  | ❌     | ✅  | ❌     | Development, testing  |

> **CRITICAL**: JWT validation (Layer 2) is ALWAYS required and cannot be disabled.

### Test Mode

| Constraint     | Value     | Reason                         |
| -------------- | --------- | ------------------------------ |
| Max Duration   | 7 days    | Prevent forgotten test configs |
| IP Whitelist   | Required  | No public test access          |
| JWT Validation | Always ON | Security baseline              |
| Audit Logging  | Always ON | Compliance & debugging         |

---

## App Check API

### Endpoint

```
GET /v1/apps/{appSlug}/check
```

**No authentication required** - Called before login on app launch.

### Request

```http
GET /v1/apps/my-girok/check HTTP/1.1
Host: api.girok.dev
X-App-Platform: IOS
X-App-Version: 2.3.0
X-Device-ID: abc123 (optional)
```

### Response

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

### HTTP Status Codes

| Status | Condition             | Client Action            |
| ------ | --------------------- | ------------------------ |
| 200    | Normal or soft update | Continue to app          |
| 426    | Force update required | Block, redirect to store |
| 503    | Maintenance mode      | Show maintenance screen  |
| 410    | App terminated        | Show termination notice  |

---

## Evolution Roadmap

| Phase | Status     | Services  | Communication | Events       | Infra      |
| ----- | ---------- | --------- | ------------- | ------------ | ---------- |
| 1     | ✅ Done    | Combined  | In-Process    | Polling      | Minimal    |
| 2     | ✅ Done    | Combined  | In-Process    | Polling      | + 3 DBs    |
| 3     | ✅ Current | Separated | gRPC          | Polling      | + gRPC     |
| 4     | 🔲 Future  | Separated | gRPC          | Redpanda CDC | + Redpanda |

### Phase 3 (Current) - Separated Services

```
identity-service (Port 3000) → identity_db
auth-service     (Port 3001) → auth_db
legal-service    (Port 3005) → legal_db
```

### Phase 3 → Phase 4 (Redpanda Introduction)

```bash
# No code changes required, only:
1. Deploy Redpanda cluster (single node for homelab)
2. Deploy Debezium connectors (Kafka Connect)
3. Stop polling publishers
4. Set REDPANDA_ENABLED=true
```

### Why Redpanda over Kafka?

| Aspect    | Kafka               | Redpanda         |
| --------- | ------------------- | ---------------- |
| Runtime   | JVM (Java)          | Native (C++)     |
| Memory    | 6GB+ heap           | 1-2GB            |
| Latency   | ~10ms p99           | ~1ms p99         |
| Zookeeper | Required (or KRaft) | Not required     |
| Homelab   | Complex             | **Simple**       |
| API       | Kafka               | Kafka-compatible |

---

## Future Changes Plan

### Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Evolution Roadmap                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1          Phase 2           Phase 3           Phase 4            │
│  (Done)           (Done)            (Current)         (Future)           │
│  ────────         ──────────        ───────           ────────           │
│                                                                          │
│  Combined     →   Combined      →   Separated     →   + Redpanda         │
│  Service          + 3 DBs           Services          + Debezium         │
│                                                                          │
│  In-Process   →   In-Process    →   gRPC          →   Event-Driven       │
│                                                                          │
│  N/A          →   Polling       →   Polling       →   CDC Real-time      │
│                    Outbox           Outbox            Outbox             │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Constant: 3 Separated DBs (identity_db, auth_db, legal_db)       │   │
│  │  Never requires DB migration                                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 3 (Current): Separated Services

**Status**: ✅ Complete

#### Current Architecture

| Component          | Value                  |
| ------------------ | ---------------------- |
| Services           | 3 separate pods        |
| Communication      | gRPC (proto3)          |
| Deployment         | 3 Helm charts          |
| Scaling            | Horizontal per-service |
| Resource Isolation | Dedicated per-service  |

#### Service Ports

| Service          | Port | Database    |
| ---------------- | ---- | ----------- |
| identity-service | 3000 | identity_db |
| auth-service     | 3001 | auth_db     |
| legal-service    | 3005 | legal_db    |

#### New gRPC Services

```protobuf
// proto/identity.proto
service IdentityService {
  rpc GetAccount(GetAccountRequest) returns (Account);
  rpc CreateAccount(CreateAccountRequest) returns (Account);
  rpc GetSession(GetSessionRequest) returns (Session);
}

// proto/auth.proto
service AuthService {
  rpc GetSanctions(GetSanctionsRequest) returns (SanctionList);
  rpc GetRoles(GetRolesRequest) returns (RoleList);
}

// proto/legal.proto
service LegalService {
  rpc GetConsents(GetConsentsRequest) returns (ConsentList);
  rpc RecordConsent(RecordConsentRequest) returns (Consent);
}
```

### Phase 4: Redpanda Introduction

**Trigger**: Need for real-time event streaming and better event guarantees

#### Changes

| Component        | Before            | After                           |
| ---------------- | ----------------- | ------------------------------- |
| Event Relay      | Polling (5s cron) | Debezium CDC (real-time)        |
| Message Broker   | None              | Redpanda cluster                |
| Event Guarantee  | At-least-once     | Exactly-once (with idempotency) |
| Latency          | 0-5 seconds       | < 100ms                         |
| Event Replay     | Not possible      | Full replay from offset         |
| Schema Evolution | Manual            | Schema Registry                 |

#### New Infrastructure

```yaml
# Redpanda Cluster
apiVersion: redpanda.vectorized.io/v1alpha1
kind: Cluster
metadata:
  name: identity-redpanda
spec:
  replicas: 3 # HA cluster
  resources:
    requests:
      cpu: 2
      memory: 4Gi
  storage:
    capacity: 100Gi
    storageClassName: fast-ssd

---
# Debezium Connector per DB
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnector
metadata:
  name: identity-db-connector
spec:
  class: io.debezium.connector.postgresql.PostgresConnector
  config:
    database.hostname: identity-db
    database.dbname: identity_db
    table.include.list: public.outbox_events
    slot.name: identity_outbox_slot
    publication.name: identity_outbox_pub
    transforms: outbox
    transforms.outbox.type: io.debezium.transforms.outbox.EventRouter

---
# Schema Registry (optional but recommended)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: schema-registry
spec:
  template:
    spec:
      containers:
        - name: schema-registry
          image: apicurio/apicurio-registry-mem:2.4
          env:
            - name: KAFKA_BOOTSTRAP_SERVERS
              value: identity-redpanda:9092
```

#### Event Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Service    │    │  PostgreSQL │    │  Debezium   │    │  Redpanda   │
│  (NestJS)   │    │  (outbox)   │    │  Connector  │    │  Cluster    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. INSERT        │                  │                  │
       │ (same tx)        │                  │                  │
       ├─────────────────►│                  │                  │
       │                  │                  │                  │
       │                  │ 2. CDC capture   │                  │
       │                  ├─────────────────►│                  │
       │                  │                  │                  │
       │                  │                  │ 3. Publish       │
       │                  │                  ├─────────────────►│
       │                  │                  │                  │
       │                  │                  │                  │ 4. Consume
       │                  │                  │                  ├────────►
```

### Phase 5: Global Scale

**Trigger**: Multi-region user base, latency requirements

#### Changes

| Component     | Before            | After                       |
| ------------- | ----------------- | --------------------------- |
| Database      | Single PostgreSQL | Citus or CockroachDB        |
| Read Path     | Primary only      | Read replicas per region    |
| Write Path    | Single region     | Write to nearest, replicate |
| Session Store | Single Valkey     | Valkey Cluster (geo)        |
| CDN           | Edge caching      | Edge + Regional cache       |
| DNS           | Simple A record   | GeoDNS                      |

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Global Architecture                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│        Asia (KR/JP)              US West              EU (DE/FR)         │
│        ───────────               ───────              ──────────         │
│                                                                          │
│   ┌──────────────┐         ┌──────────────┐      ┌──────────────┐       │
│   │ Edge + Cache │         │ Edge + Cache │      │ Edge + Cache │       │
│   └──────┬───────┘         └──────┬───────┘      └──────┬───────┘       │
│          │                        │                     │                │
│          ▼                        ▼                     ▼                │
│   ┌──────────────┐         ┌──────────────┐      ┌──────────────┐       │
│   │   Services   │         │   Services   │      │   Services   │       │
│   │  (Regional)  │         │  (Regional)  │      │  (Regional)  │       │
│   └──────┬───────┘         └──────┬───────┘      └──────┬───────┘       │
│          │                        │                     │                │
│          ▼                        ▼                     ▼                │
│   ┌──────────────┐         ┌──────────────┐      ┌──────────────┐       │
│   │ Read Replica │         │ Read Replica │      │ Read Replica │       │
│   └──────┬───────┘         └──────┬───────┘      └──────┬───────┘       │
│          │                        │                     │                │
│          └────────────────────────┼─────────────────────┘                │
│                                   ▼                                      │
│                          ┌──────────────┐                                │
│                          │    Primary   │                                │
│                          │  (Write DB)  │                                │
│                          └──────────────┘                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Future Features Backlog

| Feature                  | Priority | Phase | Description                      | Dependencies    |
| ------------------------ | -------- | ----- | -------------------------------- | --------------- |
| **DPoP Token Binding**   | Medium   | 2+    | RFC 9449 proof-of-possession     | JWT infra ready |
| **Passkeys (WebAuthn)**  | High     | 2     | Passwordless authentication      | Schema ready    |
| **Account Linking**      | Medium   | 2     | SERVICE → UNIFIED mode migration | UI needed       |
| **SSO Federation**       | Low      | 3+    | Cross-app single sign-on         | Redpanda events |
| **Audit Log Streaming**  | Medium   | 3     | Real-time to ClickHouse          | Redpanda        |
| **Behavioral Analytics** | Medium   | 3     | Login patterns, risk scoring     | ClickHouse      |
| **ML Fraud Detection**   | Low      | 4     | Anomaly detection, bot detection | Analytics data  |
| **Biometric Auth**       | Low      | 4     | Face ID, fingerprint integration | Mobile SDK      |

### Technology Evolution

| Area              | Phase 3 (Current) | Phase 4        | Phase 5                 |
| ----------------- | ----------------- | -------------- | ----------------------- |
| **Services**      | 3 Separated       | 3 Separated    | 3 Separated             |
| **Service Mesh**  | None              | Cilium         | Cilium + mTLS           |
| **Observability** | OTEL              | OTEL + Tempo   | Full stack              |
| **Secrets**       | Vault             | Vault          | Vault + HSM             |
| **Auth**          | JWT RS256         | + DPoP         | + Hardware keys         |
| **DB**            | PostgreSQL × 3    | PostgreSQL × 3 | Citus/CockroachDB       |
| **Cache**         | Valkey            | Valkey         | Valkey Cluster          |
| **Events**        | Polling           | Redpanda       | Redpanda (multi-region) |

---

## 2025 Best Practices Compliance

| Standard                      | Status | Implementation          |
| ----------------------------- | ------ | ----------------------- |
| RFC 9562 (UUIDv7)             | ✅     | All IDs                 |
| RFC 9700 (OAuth 2.0 Security) | ✅     | PKCE, no implicit flow  |
| RFC 9068 (JWT Access Token)   | ✅     | `aud` claim, RS256      |
| RFC 9449 (DPoP)               | Ready  | Prepared for future     |
| NIST 800-207 (Zero Trust)     | ✅     | 3-Layer verification    |
| Transactional Outbox          | ✅     | Redpanda-ready          |
| Saga Pattern                  | ✅     | In-process, extractable |
| API Composition               | ✅     | No cross-DB JOIN        |
| GitOps                        | ✅     | Git as SSOT, ArgoCD     |

---

**LLM Reference**:

- Identity Service: `.ai/services/identity-service.md`
- Auth Service: `.ai/services/auth-service.md`
- Legal Service: `.ai/services/legal-service.md`
