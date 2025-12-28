# Audit Service

> Compliance logging with ClickHouse (5-year retention)

## Quick Reference

| Item      | Value                      |
| --------- | -------------------------- |
| Port      | 3003                       |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | ClickHouse (audit_db)      |
| Cache     | Valkey (DB 3)              |
| Retention | 5 years (legal compliance) |

## Purpose

The Audit Service provides compliance-focused logging for:

- **Access Logs**: User authentication and authorization events
- **Consent History**: GDPR/PIPA consent tracking with versioning
- **Admin Actions**: Administrative activity audit trail
- **Data Exports**: GDPR data export request tracking

## API Endpoints

### Audit Logs

| Method | Endpoint                | Permission    | Description      |
| ------ | ----------------------- | ------------- | ---------------- |
| POST   | `/v1/audit/logs`        | `audit:write` | Write audit log  |
| GET    | `/v1/audit/logs`        | `audit:read`  | Query logs       |
| GET    | `/v1/audit/logs/:id`    | `audit:read`  | Get single log   |
| GET    | `/v1/audit/logs/export` | `audit:read`  | Export to CSV    |
| GET    | `/v1/audit/logs/stats`  | `audit:read`  | Aggregated stats |

**Query Parameters:**

| Parameter   | Type     | Description               |
| ----------- | -------- | ------------------------- |
| `userId`    | UUID     | Filter by user            |
| `action`    | string   | Filter by action type     |
| `resource`  | string   | Filter by resource        |
| `startDate` | DateTime | Range start               |
| `endDate`   | DateTime | Range end                 |
| `page`      | number   | Pagination (default: 1)   |
| `limit`     | number   | Items per page (max: 100) |

### Consent History

| Method | Endpoint                      | Permission   | Description          |
| ------ | ----------------------------- | ------------ | -------------------- |
| GET    | `/v1/consent/history`         | `audit:read` | Query consent logs   |
| GET    | `/v1/consent/history/:userId` | `audit:read` | User consent history |
| GET    | `/v1/consent/stats`           | `audit:read` | Consent statistics   |

### Admin Actions

| Method | Endpoint                | Permission   | Description         |
| ------ | ----------------------- | ------------ | ------------------- |
| GET    | `/v1/admin-actions`     | `audit:read` | Query admin actions |
| GET    | `/v1/admin-actions/:id` | `audit:read` | Get single action   |

### Data Exports (GDPR)

| Method | Endpoint                   | Permission     | Description          |
| ------ | -------------------------- | -------------- | -------------------- |
| POST   | `/v1/exports`              | `export:write` | Request data export  |
| GET    | `/v1/exports/:id`          | `export:read`  | Get export status    |
| GET    | `/v1/exports/:id/download` | `export:read`  | Download export file |

### Retention Policies

| Method | Endpoint                 | Permission        | Description   |
| ------ | ------------------------ | ----------------- | ------------- |
| GET    | `/v1/retention/policies` | `retention:read`  | List policies |
| PUT    | `/v1/retention/policies` | `retention:write` | Update policy |

## ClickHouse Schema

### Database: `audit_db`

```
audit_db/
├── access_logs          # API access history (5yr TTL)
├── consent_history      # Consent changes - PIPA/GDPR (5yr TTL)
├── admin_actions        # Admin activity audit (5yr TTL)
└── data_exports         # GDPR export tracking (5yr TTL)
```

### Tables

#### access_logs

| Column          | Type           | Description                   |
| --------------- | -------------- | ----------------------------- |
| id              | UUID           | UUIDv7 (RFC 9562)             |
| timestamp       | DateTime64(3)  | Event timestamp               |
| user_id         | UUID           | User performing action        |
| action          | LowCardinality | login, logout, consent_change |
| resource        | String         | Resource accessed             |
| ip_address      | String         | Client IP                     |
| user_agent      | String         | Browser/client info           |
| metadata        | String (JSON)  | Additional context            |
| retention_until | Date           | TTL expiry date               |
| is_exported     | Bool           | GDPR export flag              |

#### consent_history

| Column           | Type           | Description               |
| ---------------- | -------------- | ------------------------- |
| id               | UUID           | UUIDv7 (RFC 9562)         |
| timestamp        | DateTime64(3)  | Consent change time       |
| user_id          | UUID           | User ID                   |
| consent_type     | LowCardinality | TERMS, PRIVACY, MARKETING |
| country_code     | LowCardinality | KR, US, JP, etc.          |
| agreed           | Bool           | Consent given/withdrawn   |
| document_id      | UUID           | Legal document version    |
| document_version | String         | Document version string   |
| ip_address       | String         | Client IP at consent time |

#### admin_actions

| Column      | Type           | Description                     |
| ----------- | -------------- | ------------------------------- |
| id          | UUID           | UUIDv7 (RFC 9562)               |
| timestamp   | DateTime64(3)  | Action timestamp                |
| admin_id    | UUID           | Admin performing action         |
| admin_email | String         | Admin email for audit           |
| action      | LowCardinality | create, update, delete, approve |
| target_type | LowCardinality | user, tenant, role, document    |
| target_id   | UUID           | Target entity ID                |
| changes     | String (JSON)  | JSON diff of changes            |
| ip_address  | String         | Admin client IP                 |

## Caching (Valkey DB 3)

| Data             | Key Pattern                  | TTL | Invalidation    |
| ---------------- | ---------------------------- | --- | --------------- |
| Export Status    | `audit:export:{exportId}`    | 24h | export complete |
| Retention Policy | `audit:retention:{policyId}` | 1h  | policy update   |

```typescript
import { CacheKey } from '@my-girok/nest-common';

// Generate cache key with environment prefix
const key = CacheKey.make('audit', 'export', exportId);
// → "dev:audit:export:550e8400-e29b-41d4-a716-446655440000"
```

## Query Examples

### ClickHouse Queries

```sql
-- Recent access logs for a user
SELECT * FROM audit_db.access_logs
WHERE user_id = {userId:UUID}
  AND timestamp >= {startDate:DateTime64}
ORDER BY timestamp DESC
LIMIT 100;

-- Consent statistics by country
SELECT
  country_code,
  countIf(agreed = 1) as agreed,
  countIf(agreed = 0) as disagreed
FROM audit_db.consent_history
WHERE timestamp >= today() - 30
GROUP BY country_code
ORDER BY agreed DESC
LIMIT 100;
```

### Using Query Builder (SQL Injection Prevention)

```typescript
import { createQueryBuilder } from '@my-girok/nest-common';

const builder = createQueryBuilder()
  .whereBetween('timestamp', startDate, endDate, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID')
  .whereOptional('action', '=', action, 'String');

const { whereClause, params } = builder.build();
const sql = `SELECT * FROM audit_db.access_logs ${whereClause} LIMIT 100`;
```

## Environment Variables

```bash
# Server
PORT=3003
NODE_ENV=development

# ClickHouse
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=audit_db
CLICKHOUSE_USERNAME=audit_user
CLICKHOUSE_PASSWORD=secret
CLICKHOUSE_ASYNC_INSERT=true
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true  # Guaranteed writes

# Valkey Cache
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=
VALKEY_DB=3
```

## Compliance Considerations

### GDPR Requirements

1. **Right to Access**: Data export endpoint provides user data
2. **Right to Erasure**: Logs contain `is_exported` flag for tracking
3. **Retention Period**: 5-year TTL with partition-based cleanup

### PIPA (Korea) Requirements

1. **Consent Versioning**: Document ID and version tracked
2. **IP Logging**: All consent changes include IP address
3. **Audit Trail**: Complete history of consent changes

### Retention Policy

| Data Type       | Default Retention | Configurable |
| --------------- | ----------------- | ------------ |
| Access Logs     | 5 years           | Yes          |
| Consent History | 5 years           | No (legal)   |
| Admin Actions   | 5 years           | Yes          |
| Data Exports    | 5 years           | No (legal)   |

## Related Documentation

- **LLM Guide**: `.ai/services/audit-service.md`
- **ClickHouse Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
- **Caching Policy**: `docs/policies/CACHING.md`
- **Legal Consent**: `docs/policies/LEGAL_CONSENT.md`
