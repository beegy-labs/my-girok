# Audit Service

> Compliance logging with ClickHouse (7-year retention for admin audit)

## Tech Stack

| Component | Technology                |
| --------- | ------------------------- |
| Framework | NestJS 11, TypeScript 5.9 |
| Database  | ClickHouse (audit_db)     |
| Port      | 3003                      |

## REST API

### Audit Logs

| Method | Path                    | Auth          | Description      |
| ------ | ----------------------- | ------------- | ---------------- |
| POST   | `/v1/audit/logs`        | `audit:write` | Write audit log  |
| GET    | `/v1/audit/logs`        | `audit:read`  | Query logs       |
| GET    | `/v1/audit/logs/:id`    | `audit:read`  | Get single log   |
| GET    | `/v1/audit/logs/export` | `audit:read`  | Export to CSV    |
| GET    | `/v1/audit/logs/stats`  | `audit:read`  | Aggregated stats |

### Consent History

| Method | Path                          | Auth         | Description          |
| ------ | ----------------------------- | ------------ | -------------------- |
| GET    | `/v1/consent/history`         | `audit:read` | Query consent logs   |
| GET    | `/v1/consent/history/:userId` | `audit:read` | User consent history |
| GET    | `/v1/consent/stats`           | `audit:read` | Consent statistics   |

### Admin Actions

| Method | Path                    | Auth         | Description         |
| ------ | ----------------------- | ------------ | ------------------- |
| GET    | `/v1/admin-actions`     | `audit:read` | Query admin actions |
| GET    | `/v1/admin-actions/:id` | `audit:read` | Get single action   |

### Data Exports (GDPR)

| Method | Path                       | Auth           | Description          |
| ------ | -------------------------- | -------------- | -------------------- |
| POST   | `/v1/exports`              | `export:write` | Request data export  |
| GET    | `/v1/exports/:id`          | `export:read`  | Get export status    |
| GET    | `/v1/exports/:id/download` | `export:read`  | Download export file |

### Retention

| Method | Path                     | Auth              | Description   |
| ------ | ------------------------ | ----------------- | ------------- |
| GET    | `/v1/retention/policies` | `retention:read`  | List policies |
| PUT    | `/v1/retention/policies` | `retention:write` | Update policy |

### Admin Audit Query API

| Method | Path                           | Auth         | Description            |
| ------ | ------------------------------ | ------------ | ---------------------- |
| GET    | `/v1/admin-audit/ui-events`    | `audit:read` | Query UI events        |
| GET    | `/v1/admin-audit/api-logs`     | `audit:read` | Query API logs         |
| GET    | `/v1/admin-audit/data-changes` | `audit:read` | Query data change logs |
| GET    | `/v1/admin-audit/sessions`     | `audit:read` | Query admin sessions   |
| GET    | `/v1/admin-audit/actor/:id`    | `audit:read` | Actor activity summary |
| GET    | `/v1/admin-audit/errors`       | `audit:read` | Error statistics       |

## ClickHouse Schema

```
audit_db/
├── access_logs          # API access history (5yr TTL)
├── consent_history      # Consent changes (PIPA/GDPR)
├── admin_actions        # Admin activity audit
├── data_exports         # GDPR export tracking
│
├── admin_ui_events      # UI event tracking (7yr TTL)
├── admin_api_logs       # API request tracking (7yr TTL)
├── admin_audit_logs     # Data change tracking (7yr TTL)
├── admin_sessions       # Session management (2yr TTL)
│
└── Materialized Views
    ├── admin_ui_events_hourly
    ├── admin_audit_daily
    ├── admin_errors
    ├── admin_actor_daily
    └── admin_api_performance_hourly
```

### Admin UI Events Table

Tracks all admin UI interactions (clicks, page views, forms).

```sql
-- Key columns
actor_id UUID,              -- Admin user ID
session_id String,          -- Browser session
event_type LowCardinality,  -- click, page_view, form_submit, modal_open, error
event_name String,          -- sanction_create_btn, tester_add_btn
event_category LowCardinality,  -- sanction, tester, config, navigation
page_path String,           -- /services/xxx/sanctions
service_id Nullable(UUID),  -- Service context
trace_id String,            -- OTEL correlation

-- Order by
ORDER BY (date, actor_id, session_id, timestamp, id)
```

**Event Types:**

| Type        | Description       | Example                 |
| ----------- | ----------------- | ----------------------- |
| click       | Button/link click | sanction_create_btn     |
| page_view   | Page navigation   | /services/xxx/sanctions |
| form_submit | Form submission   | sanction_form           |
| modal_open  | Modal opened      | sanction_create_modal   |
| error       | JS error          | TypeError               |

### Admin API Logs Table

Tracks all admin API requests with performance metrics.

```sql
-- Key columns
actor_id UUID,
method LowCardinality(String),
path String,
path_template String,       -- /v1/admin/services/:serviceId/sanctions/:id
status_code UInt16,
response_time_ms UInt32,
error_type LowCardinality,
ui_event_id Nullable(UUID), -- Correlation to UI event

-- Order by
ORDER BY (date, service_id, path_template, timestamp, id)
```

### Admin Audit Logs Table

Core compliance table for data change tracking with tamper detection.

```sql
-- Key columns
actor_id UUID,
service_id UUID,
resource LowCardinality,    -- service_config, service_feature, tester_user, sanction
action LowCardinality,      -- create, update, delete, revoke, extend
target_id UUID,
before_state Nullable(String),  -- JSON snapshot
after_state Nullable(String),   -- JSON snapshot
changed_fields Array(String),
change_diff String,         -- JSON diff
compliance_tags Array(String),  -- ['GDPR', 'PIPA', 'SOX']
checksum String,            -- SHA-256 for tamper detection
legal_hold Bool,            -- Prevent TTL deletion

-- Order by
ORDER BY (date, service_id, resource, timestamp, id)
```

**Resource Types:**

| Resource        | Actions                        |
| --------------- | ------------------------------ |
| service_config  | update                         |
| service_domain  | create, delete                 |
| service_feature | create, update, delete         |
| tester_user     | create, delete                 |
| tester_admin    | create, delete                 |
| sanction        | create, update, revoke, extend |
| sanction_appeal | create, approve, reject        |

### Admin Sessions Table

Session management with activity metrics (ReplacingMergeTree).

```sql
-- Key columns
id String,                  -- Session ID from browser
actor_id UUID,
started_at DateTime64(3),
last_activity_at DateTime64(3),
page_views UInt32,
clicks UInt32,
api_calls UInt32,
data_changes UInt32,
status LowCardinality,      -- active, ended, timeout, forced_logout

-- Engine
ENGINE = ReplacingMergeTree(last_activity_at)
ORDER BY (date, actor_id, id)
```

## Caching (Valkey DB 3)

| Data             | Key Pattern                  | TTL | Invalidation    |
| ---------------- | ---------------------------- | --- | --------------- |
| Export Status    | `audit:export:{exportId}`    | 24h | export complete |
| Retention Policy | `audit:retention:{policyId}` | 1h  | policy update   |
| Session Data     | `audit:session:{sessionId}`  | 30m | session end     |

## Environment

```bash
PORT=3003
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_DATABASE=audit_db
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true
VALKEY_HOST=localhost
VALKEY_DB=3
```

## Query Examples

```sql
-- UI events by actor in last 7 days
SELECT event_type, event_name, count() as cnt
FROM audit_db.admin_ui_events
WHERE actor_id = {actorId:UUID}
  AND date >= today() - 7
GROUP BY event_type, event_name
ORDER BY cnt DESC;

-- Slowest API endpoints (last 24h)
SELECT path_template, method,
    avg(response_time_ms) as avg_time,
    quantile(0.95)(response_time_ms) as p95_time
FROM audit_db.admin_api_logs
WHERE date >= today() - 1
GROUP BY path_template, method
ORDER BY p95_time DESC
LIMIT 20;

-- Data changes for a specific target
SELECT timestamp, actor_email, action, changed_fields, reason
FROM audit_db.admin_audit_logs
WHERE target_id = {targetId:UUID}
ORDER BY timestamp DESC;

-- Active sessions
SELECT * FROM audit_db.admin_sessions
WHERE status = 'active'
  AND last_activity_at >= now() - INTERVAL 30 MINUTE;
```

## OTEL Integration

Browser OTEL SDK → OTEL Collector → ClickHouse

| OTEL Attribute   | ClickHouse Column |
| ---------------- | ----------------- |
| session.id       | session_id        |
| actor.id         | actor_id          |
| event.type       | event_type        |
| event.name       | event_name        |
| http.method      | method            |
| http.route       | path_template     |
| http.status_code | status_code       |

## Retention Policy

| Table                 | Retention | Legal Hold       |
| --------------------- | --------- | ---------------- |
| admin_ui_events       | 7 years   | No               |
| admin_api_logs        | 7 years   | No               |
| admin_audit_logs      | 7 years   | Yes (TTL exempt) |
| admin_sessions        | 2 years   | No               |
| admin\_\*\_hourly MVs | 90 days   | No               |
| admin\_\*\_daily MVs  | 1-2 years | No               |
| admin_errors          | 30 days   | No               |

---

**Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
**MVs**: `infrastructure/clickhouse/schemas/03-materialized_views.sql`
