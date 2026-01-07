# Identity Platform

## Architecture

```
identity-service (3000) -> identity_db
auth-service     (3001) -> auth_db
legal-service    (3005) -> legal_db
```

## Domain Ownership

| Domain                                   | Service          | Database    |
| ---------------------------------------- | ---------------- | ----------- |
| Accounts, Sessions, Devices, Profiles    | identity-service | identity_db |
| Roles, Permissions, Operators, Sanctions | auth-service     | auth_db     |
| Consents, Documents, Laws, DSR           | legal-service    | legal_db    |

## Anti-Patterns

```yaml
NEVER:
  - Add roles/permissions to identity-service
  - Add consent logic to identity-service
  - Add account/session to auth-service
  - Cross-database JOINs
  - Direct DB access across services
```

## Correct Patterns

```yaml
OK:
  - gRPC calls between services
  - API composition in BFF
  - Outbox events per service
  - Cross-service UUID references (no FK)
```

## Inter-Service

```
identity <--gRPC--> auth <--gRPC--> legal
```

## UUIDv7

All IDs: RFC 9562 UUIDv7 (time-sortable, app-generated)

## Key Tables

### identity_db

```sql
accounts, account_profiles, credentials, sessions, devices, app_registry, account_apps, app_security_configs, app_test_modes, app_service_status, app_version_policies, outbox_events
```

### auth_db

```sql
roles, permissions, role_permissions, admins, admin_roles, operators, sanctions, api_keys, outbox_events
```

### legal_db

```sql
laws, law_requirements, countries, consent_documents, account_consents, data_subject_requests, consent_history, outbox_events
```

## MFA

| Method | Standard |
| ------ | -------- |
| TOTP   | RFC 6238 |
| SMS    | -        |
| EMAIL  | -        |

## Account Locking

| Setting       | Value |
| ------------- | ----- |
| Max Failed    | 5     |
| Lock Duration | 15min |
| Reset Window  | 30min |

## DSR Types

| Type          | Article | SLA |
| ------------- | ------- | --- |
| ACCESS        | Art.15  | 30d |
| RECTIFICATION | Art.16  | 30d |
| ERASURE       | Art.17  | 30d |
| PORTABILITY   | Art.20  | 30d |
| RESTRICTION   | Art.18  | 72h |
| OBJECTION     | Art.21  | 72h |

## Sanctions

| Type                | Effect            |
| ------------------- | ----------------- |
| WARNING             | Notification only |
| TEMPORARY_BAN       | Block temporarily |
| PERMANENT_BAN       | Account disabled  |
| FEATURE_RESTRICTION | Features disabled |

## Transactional Outbox

```typescript
@Transactional()
async createAccount(dto) {
  const account = await this.prisma.accounts.create({ data: { id: ID.generate(), ...dto } });
  await this.prisma.outboxEvents.create({
    data: { id: ID.generate(), aggregateType: 'ACCOUNT', aggregateId: account.id, eventType: 'identity.account.created', payload: {...} }
  });
  return account;
}
```

## Event Publishing

| Phase   | Method                   |
| ------- | ------------------------ |
| Current | Polling (5s cron)        |
| Future  | Debezium CDC -> Redpanda |

## Security Levels

| Level    | Domain | JWT | Header |
| -------- | ------ | --- | ------ |
| STRICT   | Yes    | Yes | Yes    |
| STANDARD | No     | Yes | Yes    |
| RELAXED  | No     | Yes | No     |

JWT always required.

## Test Mode

| Constraint   | Value     |
| ------------ | --------- |
| Max Duration | 7 days    |
| IP Whitelist | Required  |
| JWT          | Always ON |

## App Check API

```
GET /v1/apps/{appSlug}/check
```

| Status | Condition    | Action         |
| ------ | ------------ | -------------- |
| 200    | Normal       | Continue       |
| 426    | Force update | Redirect store |
| 503    | Maintenance  | Show message   |
| 410    | Terminated   | Show notice    |

## Evolution

| Phase | Status  | Communication | Events       |
| ----- | ------- | ------------- | ------------ |
| 3     | Current | gRPC          | Polling      |
| 4     | Future  | gRPC          | Redpanda CDC |

## Redpanda vs Kafka

| Aspect    | Kafka | Redpanda |
| --------- | ----- | -------- |
| Runtime   | JVM   | C++      |
| Memory    | 6GB+  | 1-2GB    |
| Latency   | ~10ms | ~1ms     |
| Zookeeper | Yes   | No       |

## Standards

| Standard                  | Status |
| ------------------------- | ------ |
| RFC 9562 (UUIDv7)         | Done   |
| RFC 9700 (OAuth 2.0)      | Done   |
| RFC 9068 (JWT)            | Done   |
| RFC 9449 (DPoP)           | Ready  |
| NIST 800-207 (Zero Trust) | Done   |
