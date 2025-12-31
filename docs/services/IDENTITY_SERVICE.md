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

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)
- [Legal Consent Policy](../policies/LEGAL_CONSENT.md)
- [Database Guide](../DATABASE.md)
