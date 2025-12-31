# Identity Service

> Multi-app user identity platform for my-girok ecosystem

## Overview

The Identity Service is a comprehensive identity platform that manages user accounts, authentication, authorization, and legal compliance across multiple applications. It follows a multi-database architecture for separation of concerns and regulatory compliance.

## Architecture

### Multi-Database Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Identity Service                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│   identity_db   │     auth_db     │       legal_db          │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • accounts      │ • roles         │ • consents              │
│ • sessions      │ • permissions   │ • consent_logs          │
│ • devices       │ • operators     │ • legal_documents       │
│ • profiles      │ • sanctions     │ • law_registry          │
│ • outbox_events │ • outbox_events │ • dsr_requests          │
│                 │                 │ • outbox_events         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Key Features

- **UUIDv7 Primary Keys**: Time-ordered UUIDs for better B-tree index performance
- **Transactional Outbox Pattern**: Reliable event publishing with retry logic
- **Saga Orchestration**: Multi-service transaction coordination with compensation
- **GDPR/CCPA/PIPA Compliance**: Built-in consent management and DSR handling

## Modules

### Identity Module (`/identity`)

Manages core user identity data.

| Resource | Endpoints   | Description                           |
| -------- | ----------- | ------------------------------------- |
| Accounts | `/accounts` | User account CRUD, verification, MFA  |
| Sessions | `/sessions` | Session management, token validation  |
| Devices  | `/devices`  | Device registration, trust management |
| Profiles | `/profiles` | User profile data                     |

### Auth Module (`/auth`)

Manages authorization and access control.

| Resource    | Endpoints      | Description                      |
| ----------- | -------------- | -------------------------------- |
| Roles       | `/roles`       | Role hierarchy, RBAC             |
| Permissions | `/permissions` | Permission definitions, ABAC     |
| Operators   | `/operators`   | Admin/operator management        |
| Sanctions   | `/sanctions`   | User restrictions, bans, appeals |

### Legal Module (`/legal`)

Manages legal compliance.

| Resource  | Endpoints          | Description                             |
| --------- | ------------------ | --------------------------------------- |
| Consents  | `/consents`        | Consent recording, withdrawal           |
| Documents | `/legal-documents` | Terms, policies, versions               |
| DSR       | `/dsr-requests`    | Data subject requests (GDPR Art. 15-22) |
| Laws      | `/law-registry`    | Jurisdiction-specific requirements      |

### Composition Layer (`/composition`)

Service composition for complex workflows.

| Resource         | Endpoints           | Description                     |
| ---------------- | ------------------- | ------------------------------- |
| Registration     | `/registration`     | Complete user registration flow |
| Account Deletion | `/account-deletion` | GDPR-compliant account erasure  |

## Database Schemas

### UUIDv7 Implementation

All tables use time-ordered UUIDv7 for primary keys:

```sql
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  return encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;
```

### Migrations

Located in `services/identity-service/migrations/`:

- `identity/` - Account, session, device, profile schemas
- `auth/` - Role, permission, operator, sanction schemas
- `legal/` - Consent, document, DSR, law registry schemas

Run with [goose](https://github.com/pressly/goose):

```bash
goose -dir migrations/identity postgres "$IDENTITY_DATABASE_URL" up
goose -dir migrations/auth postgres "$IDENTITY_AUTH_DATABASE_URL" up
goose -dir migrations/legal postgres "$IDENTITY_LEGAL_DATABASE_URL" up
```

## Security

### MFA Implementation

MFA secrets are encrypted at rest using AES-256-GCM:

```typescript
// Encryption format: iv:authTag:encryptedData (base64)
const encryptedSecret = cryptoService.encrypt(totpSecret);
```

Set `ENCRYPTION_KEY` environment variable (32 bytes, base64 encoded).

### Authentication Guards

The service uses API Key authentication for service-to-service communication:

```typescript
// Set API_KEYS environment variable (comma-separated)
((API_KEYS = key1), key2, key3);
```

Use `@Public()` decorator for unauthenticated endpoints.

### SQL Injection Prevention

Database cleanup uses whitelist approach:

```typescript
private static readonly ALLOWED_TABLES = [
  'accounts', 'sessions', 'devices', 'profiles', 'outbox_events'
] as const;
```

## Event-Driven Architecture

### Kafka Topics (Redpanda)

| Topic                        | Description              |
| ---------------------------- | ------------------------ |
| `identity.account.created`   | New account registration |
| `identity.account.updated`   | Account data changes     |
| `identity.account.deleted`   | Account deletion         |
| `identity.session.created`   | New session              |
| `identity.session.revoked`   | Session termination      |
| `identity.consent.granted`   | Consent recorded         |
| `identity.consent.withdrawn` | Consent revoked          |
| `identity.dsr.created`       | DSR request submitted    |
| `identity.dsr.completed`     | DSR request fulfilled    |
| `auth.sanction.issued`       | Sanction applied         |
| `auth.sanction.revoked`      | Sanction lifted          |

### Outbox Pattern

Events are stored in `outbox_events` table and processed by cron job:

```typescript
@Cron('*/10 * * * * *') // Every 10 seconds
async processOutbox() {
  // Process pending events with retry logic
}
```

## Configuration

### Environment Variables

```env
# Database URLs
IDENTITY_DATABASE_URL=postgresql://user:pass@host:5432/identity
IDENTITY_AUTH_DATABASE_URL=postgresql://user:pass@host:5432/identity_auth
IDENTITY_LEGAL_DATABASE_URL=postgresql://user:pass@host:5432/identity_legal

# Security
ENCRYPTION_KEY=<32-bytes-base64>
API_KEYS=service1-key,service2-key

# Kafka/Redpanda
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=identity-service

# Service
NODE_ENV=production
PORT=3001
```

## Development

### Generate Prisma Clients

```bash
pnpm prisma:generate:identity
pnpm prisma:generate:auth
pnpm prisma:generate:legal
```

### Run Migrations

```bash
# Using goose
goose -dir migrations/identity postgres "$IDENTITY_DATABASE_URL" up
```

### Run Service

```bash
pnpm dev
```

## API Examples

### Create Account

```bash
curl -X POST http://localhost:3001/accounts \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecureP@ss123",
    "countryCode": "US"
  }'
```

### Grant Consent

```bash
curl -X POST http://localhost:3001/legal/consents \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "uuid",
    "consentType": "PRIVACY_POLICY",
    "countryCode": "US",
    "documentVersion": "1.0"
  }'
```

### Submit DSR Request

```bash
curl -X POST http://localhost:3001/legal/dsr-requests \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "uuid",
    "requestType": "ACCESS",
    "description": "Request all personal data"
  }'
```

## Security Utilities

### PII Masking

All sensitive data is masked before logging to prevent PII exposure:

```typescript
import { maskUuid, maskEmail, maskIpAddress } from './common/utils/masking.util';

// In services
this.logger.log(`Account created: ${maskUuid(accountId)}`);
// Output: Account created: 550e8400-****-****-****-********0000

this.logger.log(`Processing request for: ${maskEmail(email)}`);
// Output: Processing request for: us***@example.com
```

| Function          | Example Input                          | Example Output                         |
| ----------------- | -------------------------------------- | -------------------------------------- |
| `maskUuid()`      | `550e8400-e29b-41d4-a716-446655440000` | `550e8400-****-****-****-********0000` |
| `maskEmail()`     | `user@example.com`                     | `us***@example.com`                    |
| `maskIpAddress()` | `192.168.1.100`                        | `192.168.*.*`                          |
| `maskToken()`     | `abc123...xyz789`                      | `abc123...`                            |

### Crypto Service

Encryption service for sensitive data storage:

```typescript
import { CryptoService } from './common/crypto';

// Encrypt MFA secrets
const encrypted = cryptoService.encrypt(totpSecret);
// Format: iv:authTag:encryptedData (base64)

// Decrypt for verification
const decrypted = cryptoService.decrypt(encrypted);

// Hash backup codes (one-way)
const hash = cryptoService.hash(backupCode);
```

## Service-Specific Constants

All service-specific constants are centralized in `src/common/constants/index.ts`. This file follows the SSOT (Single Source of Truth) strategy where shared utilities come from `@my-girok/nest-common` and service-specific values are defined locally.

### Session & Token Management

These constants control how user sessions and tokens are handled:

| Constant                         | Value  | Description                                                 |
| -------------------------------- | ------ | ----------------------------------------------------------- |
| `SESSION.DEFAULT_EXPIRY_MINUTES` | 60     | Default session duration before requiring re-authentication |
| `SESSION.MAX_EXPIRY_MINUTES`     | 1440   | Maximum allowed session duration (24 hours)                 |
| `SESSION.REFRESH_TOKEN_DAYS`     | 14     | How long refresh tokens remain valid                        |
| `SESSION.HASH_ALGORITHM`         | sha256 | Algorithm used for token hashing                            |

**Why these values?** The 60-minute default balances security with user experience. The 14-day refresh token allows users to stay logged in on trusted devices while limiting exposure if a token is compromised.

### Account Security

These constants protect user accounts from brute force attacks:

| Constant                                    | Value | Description                              |
| ------------------------------------------- | ----- | ---------------------------------------- |
| `ACCOUNT_SECURITY.MAX_FAILED_ATTEMPTS`      | 5     | Failed logins before account lockout     |
| `ACCOUNT_SECURITY.LOCKOUT_DURATION_MINUTES` | 30    | How long account remains locked          |
| `ACCOUNT_SECURITY.PASSWORD_HISTORY_COUNT`   | 5     | Previous passwords that cannot be reused |

**Security rationale:** 5 attempts with 30-minute lockout follows OWASP recommendations. This prevents brute force while avoiding excessive user frustration from typos.

### MFA (Multi-Factor Authentication)

| Constant                 | Value | Description                               |
| ------------------------ | ----- | ----------------------------------------- |
| `MFA.TOTP_WINDOW`        | 1     | TOTP codes valid for ±30 seconds (1 step) |
| `MFA.BACKUP_CODES_COUNT` | 10    | Number of one-time backup codes generated |
| `MFA.BACKUP_CODE_LENGTH` | 8     | Character length of each backup code      |

### Rate Limiting

These protect authentication endpoints from abuse:

| Constant                        | Value | Description                      |
| ------------------------------- | ----- | -------------------------------- |
| `RATE_LIMIT.LOGIN_LIMIT`        | 5     | Login attempts per minute        |
| `RATE_LIMIT.REGISTRATION_LIMIT` | 10    | Registration attempts per minute |
| `RATE_LIMIT.DEFAULT_LIMIT`      | 100   | Default for other endpoints      |

### DSR (Data Subject Request) Deadlines

Legal compliance deadlines vary by jurisdiction:

| Constant                    | Value | Jurisdiction    | Legal Basis           |
| --------------------------- | ----- | --------------- | --------------------- |
| `DSR_DEADLINE_DAYS.GDPR`    | 30    | European Union  | GDPR Article 12(3)    |
| `DSR_DEADLINE_DAYS.CCPA`    | 45    | California, USA | CCPA Section 1798.130 |
| `DSR_DEADLINE_DAYS.PIPA`    | 10    | South Korea     | PIPA Article 35       |
| `DSR_DEADLINE_DAYS.APPI`    | 14    | Japan           | APPI Article 32       |
| `DSR_DEADLINE_DAYS.DEFAULT` | 30    | Other regions   | Conservative default  |

**Important:** These are maximum response times. Aim to complete requests well before the deadline to account for weekends and holidays.

## Zero Migration Architecture

The Identity Service is designed for future microservice extraction without database migration:

```
Phase 1 (Current): Combined Service
┌─────────────────────────────────────┐
│       identity-service              │
│  ┌─────────┬─────────┬─────────┐   │
│  │Identity │  Auth   │  Legal  │   │
│  └────┬────┴────┬────┴────┬────┘   │
│       ▼         ▼         ▼        │
│  identity_db  auth_db  legal_db    │
└─────────────────────────────────────┘

Phase 2 (Future): Separated Services
┌───────────┐ ┌───────────┐ ┌───────────┐
│identity-  │ │  auth-    │ │  legal-   │
│  service  │ │  service  │ │  service  │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      ▼             ▼             ▼
  identity_db   auth_db       legal_db
      (Same databases, zero migration)
```

**Key Benefits:**

- Pre-separated databases from day one
- Interface-based module communication
- Switch from in-process to gRPC with env variable change
- No data migration required

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)
- [Identity Service API Reference](../../.ai/services/identity-service.md) (LLM-optimized)
- [Legal Consent Policy](../policies/LEGAL_CONSENT.md)
- [Database Guide](../DATABASE.md)
- [Caching Strategy](../policies/CACHING.md)
