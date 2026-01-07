# Identity Platform Policy

> Multi-service architecture for authentication, authorization, and legal compliance

## Architecture Overview

```
identity-service (3005) -> identity_db
auth-service     (3001) -> auth_db
legal-service    (3006) -> legal_db
```

## Domain Ownership

| Domain                                   | Service          | Database    |
| ---------------------------------------- | ---------------- | ----------- |
| Accounts, Sessions, Devices, Profiles    | identity-service | identity_db |
| Roles, Permissions, Operators, Sanctions | auth-service     | auth_db     |
| Consents, Documents, Laws, DSR           | legal-service    | legal_db    |

## Anti-Patterns (NEVER Do)

```yaml
NEVER:
  - Add roles/permissions to identity-service
  - Add consent logic to identity-service
  - Add account/session to auth-service
  - Cross-database JOINs
  - Direct database access across services
```

## Correct Patterns (DO)

```yaml
DO:
  - Use gRPC calls between services
  - API composition in BFF layer
  - Outbox events per service
  - Cross-service UUID references (no foreign keys)
```

## Inter-Service Communication

```
identity-service <--gRPC--> auth-service <--gRPC--> legal-service
```

## ID Generation (UUIDv7)

All IDs use RFC 9562 UUIDv7 format:

- Time-sortable for efficient indexing
- Application-generated (no DB sequence)
- Example: `01935c6d-c2d0-7abc-8def-1234567890ab`

## Database Tables

### identity_db

```sql
accounts, account_profiles, credentials, sessions, devices,
app_registry, account_apps, app_security_configs, app_test_modes,
app_service_status, app_version_policies, outbox_events
```

### auth_db

```sql
roles, permissions, role_permissions, admins, admin_roles,
operators, sanctions, api_keys, outbox_events
```

### legal_db

```sql
laws, law_requirements, countries, consent_documents,
account_consents, data_subject_requests, consent_history, outbox_events
```

## Multi-Factor Authentication (MFA)

| Method | Standard              |
| ------ | --------------------- |
| TOTP   | RFC 6238              |
| SMS    | Provider-specific     |
| Email  | Custom implementation |

## Account Locking Policy

| Setting                     | Value      |
| --------------------------- | ---------- |
| Max Failed Attempts         | 5          |
| Lock Duration               | 15 minutes |
| Failed Attempt Reset Window | 30 minutes |

## Data Subject Request (DSR) Types

| Type          | GDPR Article | SLA      |
| ------------- | ------------ | -------- |
| ACCESS        | Article 15   | 30 days  |
| RECTIFICATION | Article 16   | 30 days  |
| ERASURE       | Article 17   | 30 days  |
| PORTABILITY   | Article 20   | 30 days  |
| RESTRICTION   | Article 18   | 72 hours |
| OBJECTION     | Article 21   | 72 hours |

## Sanction Types

| Type                | Effect                       |
| ------------------- | ---------------------------- |
| WARNING             | Notification only            |
| TEMPORARY_BAN       | Access blocked temporarily   |
| PERMANENT_BAN       | Account disabled permanently |
| FEATURE_RESTRICTION | Specific features disabled   |

## Transactional Outbox Pattern

```typescript
@Transactional()
async createAccount(dto: CreateAccountDto) {
  const account = await this.prisma.accounts.create({
    data: { id: ID.generate(), ...dto }
  });

  await this.prisma.outboxEvents.create({
    data: {
      id: ID.generate(),
      aggregateType: 'ACCOUNT',
      aggregateId: account.id,
      eventType: 'identity.account.created',
      payload: { accountId: account.id, email: dto.email }
    }
  });

  return account;
}
```

## Event Publishing Evolution

| Phase   | Method                   | Status  |
| ------- | ------------------------ | ------- |
| Current | Polling (5s cron job)    | Active  |
| Future  | Debezium CDC -> Redpanda | Planned |

## Security Levels

| Level    | Domain Validation | JWT Required | Header Check |
| -------- | ----------------- | ------------ | ------------ |
| STRICT   | Yes               | Yes          | Yes          |
| STANDARD | No                | Yes          | Yes          |
| RELAXED  | No                | Yes          | No           |

**Note**: JWT authentication is always required regardless of security level.

## Test Mode Configuration

| Constraint         | Value     |
| ------------------ | --------- |
| Maximum Duration   | 7 days    |
| IP Whitelist       | Required  |
| JWT Authentication | Always ON |

## App Check API

```
GET /v1/apps/{appSlug}/check
```

| Status Code | Condition             | Client Action            |
| ----------- | --------------------- | ------------------------ |
| 200         | Normal operation      | Continue                 |
| 426         | Force update required | Redirect to app store    |
| 503         | Maintenance mode      | Show maintenance message |
| 410         | App terminated        | Show termination notice  |

## Platform Evolution

| Phase   | Status  | Communication | Events       |
| ------- | ------- | ------------- | ------------ |
| Phase 3 | Current | gRPC          | Polling      |
| Phase 4 | Future  | gRPC          | Redpanda CDC |

## Redpanda vs Kafka

| Aspect    | Kafka    | Redpanda   |
| --------- | -------- | ---------- |
| Runtime   | JVM      | C++        |
| Memory    | 6GB+     | 1-2GB      |
| Latency   | ~10ms    | ~1ms       |
| Zookeeper | Required | Not needed |

## Compliance Standards

| Standard                  | Status               |
| ------------------------- | -------------------- |
| RFC 9562 (UUIDv7)         | Implemented          |
| RFC 9700 (OAuth 2.0)      | Implemented          |
| RFC 9068 (JWT)            | Implemented          |
| RFC 9449 (DPoP)           | Ready for deployment |
| NIST 800-207 (Zero Trust) | Implemented          |

---

**LLM Reference**: `docs/llm/policies/IDENTITY_PLATFORM.md`
