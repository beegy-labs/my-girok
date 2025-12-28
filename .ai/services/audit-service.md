# Audit Service

> Compliance logging with ClickHouse (5-year retention)

## Tech Stack

| Component | Technology                |
| --------- | ------------------------- |
| Framework | NestJS 11, TypeScript 5.9 |
| Database  | ClickHouse (audit_db)     |
| Port      | 3003                      |

## REST API

### Audit Logs

| Method | Path                    | Auth  | Description      |
| ------ | ----------------------- | ----- | ---------------- |
| POST   | `/v1/audit/logs`        | Admin | Write audit log  |
| GET    | `/v1/audit/logs`        | Admin | Query logs       |
| GET    | `/v1/audit/logs/export` | Admin | Export to CSV    |
| GET    | `/v1/audit/logs/stats`  | Admin | Aggregated stats |

### Retention

| Method | Path                     | Auth  | Description   |
| ------ | ------------------------ | ----- | ------------- |
| GET    | `/v1/retention/policies` | Admin | List policies |
| PUT    | `/v1/retention/policies` | Admin | Update policy |

## ClickHouse Schema

```
audit_db/
├── access_logs      # API access history
├── consent_history  # Consent changes (PIPA/GDPR)
└── admin_actions    # Admin activity audit
```

### Tables

```sql
-- Access Logs (5yr TTL)
CREATE TABLE audit_db.access_logs (
  id UUID DEFAULT generateUUIDv7(),
  timestamp DateTime64(3),
  user_id Nullable(UUID),
  action LowCardinality(String),
  resource String,
  ip_address String,
  user_agent String,
  response_status UInt16,
  duration_ms UInt32
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), user_id)
TTL timestamp + INTERVAL 5 YEAR;
```

## Caching (Valkey DB 3)

| Data             | Key Pattern                  | TTL | Invalidation    |
| ---------------- | ---------------------------- | --- | --------------- |
| Export Status    | `audit:export:{exportId}`    | 24h | export complete |
| Retention Policy | `audit:retention:{policyId}` | 1h  | policy update   |

## Environment

```bash
PORT=3003
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_DATABASE=audit_db
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true
VALKEY_HOST=localhost
VALKEY_DB=3
```

## Query Builder

Use `ClickHouseQueryBuilder` to prevent SQL injection:

```typescript
import { createQueryBuilder } from '@my-girok/nest-common';

const builder = createQueryBuilder()
  .whereBetween('timestamp', startDate, endDate, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID');

const { whereClause, params } = builder.build();
```

---

**Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
