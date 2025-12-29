# Audit Service

> Compliance logging with ClickHouse (5-7 year retention)

## Quick Reference

| Item      | Value                        |
| --------- | ---------------------------- |
| Port      | 3003                         |
| Framework | NestJS 11 + TypeScript 5.9   |
| Database  | ClickHouse (audit_db)        |
| Cache     | Valkey (DB 3)                |
| Retention | 5-7 years (legal compliance) |

## Purpose

The Audit Service provides compliance-focused logging for:

- **Access Logs**: User authentication and authorization events
- **Consent History**: GDPR/PIPA consent tracking with versioning
- **Admin Actions**: Administrative activity audit trail
- **Data Exports**: GDPR data export request tracking
- **Admin Audit System**: Comprehensive UI, API, and data change tracking

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

### Admin Audit Query API

| Method | Endpoint                          | Permission   | Description             |
| ------ | --------------------------------- | ------------ | ----------------------- |
| GET    | `/v1/admin-audit/ui-events`       | `audit:read` | Query UI events         |
| GET    | `/v1/admin-audit/api-logs`        | `audit:read` | Query API logs          |
| GET    | `/v1/admin-audit/data-changes`    | `audit:read` | Query data change logs  |
| GET    | `/v1/admin-audit/sessions`        | `audit:read` | Query admin sessions    |
| GET    | `/v1/admin-audit/sessions/active` | `audit:read` | Get active sessions     |
| GET    | `/v1/admin-audit/actor/:id`       | `audit:read` | Actor activity summary  |
| GET    | `/v1/admin-audit/errors`          | `audit:read` | Error statistics        |
| GET    | `/v1/admin-audit/performance`     | `audit:read` | API performance metrics |

## ClickHouse Schema

### Database: `audit_db`

```
audit_db/
├── Core Tables (5yr TTL)
│   ├── access_logs          # API access history
│   ├── consent_history      # Consent changes - PIPA/GDPR
│   ├── admin_actions        # Admin activity audit
│   └── data_exports         # GDPR export tracking
│
├── Admin Audit Tables (7yr TTL)
│   ├── admin_ui_events      # UI event tracking
│   ├── admin_api_logs       # API request tracking
│   ├── admin_audit_logs     # Data change tracking
│   └── admin_sessions       # Session management (2yr TTL)
│
└── Materialized Views
    ├── admin_ui_events_hourly
    ├── admin_audit_daily
    ├── admin_errors
    ├── admin_actor_daily
    └── admin_api_performance_hourly
```

### Core Tables

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

### Admin Audit Tables

#### admin_ui_events

Tracks all admin UI interactions via OTEL Browser SDK.

| Column           | Type             | Description                           |
| ---------------- | ---------------- | ------------------------------------- |
| id               | UUID             | UUIDv7 (RFC 9562)                     |
| timestamp        | DateTime64(3)    | Event timestamp (UTC)                 |
| date             | Date             | Partition key                         |
| session_id       | String           | Browser session ID                    |
| session_sequence | UInt32           | Event order in session                |
| actor_id         | UUID             | Admin user ID                         |
| actor_email      | LowCardinality   | Admin email                           |
| actor_scope      | LowCardinality   | SYSTEM, TENANT                        |
| actor_role       | LowCardinality   | Role name                             |
| service_id       | Nullable(UUID)   | Service context                       |
| event_type       | LowCardinality   | click, page_view, form_submit         |
| event_name       | String           | sanction_create_btn                   |
| event_category   | LowCardinality   | sanction, tester, config              |
| event_action     | LowCardinality   | open, submit, cancel                  |
| page_path        | String           | URL path                              |
| component_id     | Nullable(String) | DOM component ID                      |
| component_type   | LowCardinality   | button, form, modal, table            |
| viewport_width   | UInt16           | Browser viewport width                |
| viewport_height  | UInt16           | Browser viewport height               |
| trace_id         | String           | OTEL trace correlation                |
| ip_anonymized    | String           | GDPR-compliant IP (last octet zeroed) |

**Event Types:**

| Type        | Description     | Example Events          |
| ----------- | --------------- | ----------------------- |
| click       | Button/link     | sanction_create_btn     |
| page_view   | Page navigation | /services/xxx/sanctions |
| form_submit | Form submission | sanction_form           |
| modal_open  | Modal opened    | sanction_create_modal   |
| modal_close | Modal closed    | sanction_create_modal   |
| error       | JS error        | TypeError, NetworkError |

**Event Categories:**

| Category   | Events                              |
| ---------- | ----------------------------------- |
| sanction   | sanction_list_view, sanction_create |
| tester     | tester_add, tester_remove           |
| config     | config_update, domain_add           |
| feature    | feature_create, feature_update      |
| navigation | page_view, menu_click               |
| system     | login, logout, session_start        |

#### admin_api_logs

Tracks all admin API requests with performance metrics.

| Column           | Type             | Description                   |
| ---------------- | ---------------- | ----------------------------- |
| id               | UUID             | UUIDv7 (RFC 9562)             |
| timestamp        | DateTime64(3)    | Request timestamp (UTC)       |
| actor_id         | UUID             | Admin user ID                 |
| actor_type       | LowCardinality   | ADMIN, OPERATOR, SYSTEM       |
| service_id       | Nullable(UUID)   | Service context               |
| request_id       | String           | Unique request ID             |
| method           | LowCardinality   | GET, POST, PATCH, DELETE      |
| path             | String           | Actual URL path               |
| path_template    | String           | /v1/admin/services/:serviceId |
| path_params      | String (JSON)    | {"serviceId": "xxx"}          |
| query_params     | String (JSON)    | Sanitized query params        |
| request_body     | String (JSON)    | Sanitized, truncated body     |
| status_code      | UInt16           | HTTP status code              |
| response_time_ms | UInt32           | Response time in ms           |
| db_query_count   | UInt16           | Number of DB queries          |
| db_query_time_ms | UInt32           | Total DB query time           |
| cache_hit        | Bool             | Cache hit flag                |
| error_type       | LowCardinality   | Error type if failed          |
| error_message    | Nullable(String) | Error message                 |
| auth_method      | LowCardinality   | jwt, api_key, session         |
| permissions_used | Array(String)    | Permissions checked           |
| ui_event_id      | Nullable(UUID)   | Linked UI event               |
| trace_id         | String           | OTEL trace correlation        |

**Path Template Examples:**

| Actual Path                                    | Template                                            |
| ---------------------------------------------- | --------------------------------------------------- |
| /v1/admin/services/abc-123/sanctions           | /v1/admin/services/:serviceId/sanctions             |
| /v1/admin/services/abc-123/sanctions/xyz-789   | /v1/admin/services/:serviceId/sanctions/:id         |
| /v1/admin/services/abc-123/testers/users/u-123 | /v1/admin/services/:serviceId/testers/users/:userId |

#### admin_audit_logs

Core compliance table for data change tracking with tamper detection.

| Column                 | Type             | Description                |
| ---------------------- | ---------------- | -------------------------- |
| id                     | UUID             | UUIDv7 (RFC 9562)          |
| timestamp              | DateTime64(3)    | Change timestamp (UTC)     |
| actor_id               | UUID             | Admin performing change    |
| actor_email            | LowCardinality   | Admin email                |
| actor_role             | LowCardinality   | Role at time of change     |
| actor_ip               | String           | IP address                 |
| service_id             | UUID             | Service context            |
| service_slug           | LowCardinality   | Service slug               |
| resource               | LowCardinality   | Resource type              |
| resource_version       | UInt32           | Schema version             |
| action                 | LowCardinality   | create, update, delete     |
| target_id              | UUID             | Target entity ID           |
| target_type            | LowCardinality   | Entity type                |
| target_identifier      | String           | Human-readable identifier  |
| operation_type         | LowCardinality   | INSERT, UPDATE, DELETE     |
| before_state           | Nullable(String) | Full JSON snapshot before  |
| after_state            | Nullable(String) | Full JSON snapshot after   |
| changed_fields         | Array(String)    | ['status', 'endAt']        |
| change_diff            | String (JSON)    | Diff format                |
| reason                 | String           | Change reason              |
| business_justification | Nullable(String) | Business justification     |
| ticket_id              | Nullable(String) | JIRA ticket reference      |
| compliance_tags        | Array(String)    | ['GDPR', 'PIPA', 'SOX']    |
| data_classification    | LowCardinality   | INTERNAL, CONFIDENTIAL     |
| pii_accessed           | Bool             | PII access flag            |
| pii_fields             | Array(String)    | PII field names            |
| source                 | LowCardinality   | web-admin, api, cli        |
| checksum               | String           | SHA-256 for integrity      |
| previous_log_id        | Nullable(UUID)   | Chain for tamper detection |
| legal_hold             | Bool             | Prevent TTL deletion       |
| trace_id               | String           | OTEL correlation           |

**Resource Types:**

| Resource                   | Actions                           | Description             |
| -------------------------- | --------------------------------- | ----------------------- |
| service_config             | update                            | Validation settings     |
| service_domain             | create, delete                    | Domain management       |
| service_feature            | create, update, delete            | Feature management      |
| service_feature_permission | create, delete                    | Permission changes      |
| tester_user                | create, delete                    | User tester management  |
| tester_admin               | create, delete                    | Admin tester management |
| sanction                   | create, update, revoke, extend    | Sanction lifecycle      |
| sanction_appeal            | create, approve, reject, escalate | Appeal workflow         |

**Change Diff Format:**

```json
{
  "status": {
    "from": "ACTIVE",
    "to": "REVOKED"
  },
  "endAt": {
    "from": "2025-01-31T23:59:59Z",
    "to": "2025-02-28T23:59:59Z"
  }
}
```

**Compliance Tags:**

| Tag     | Description          |
| ------- | -------------------- |
| GDPR    | EU data protection   |
| PIPA    | Korea personal info  |
| SOX     | Financial compliance |
| HIPAA   | Health data (US)     |
| PCI-DSS | Payment card data    |

**Checksum Calculation:**

```typescript
const calculateChecksum = (log: AuditLog): string => {
  const data = JSON.stringify({
    timestamp: log.timestamp,
    actor_id: log.actor_id,
    resource: log.resource,
    action: log.action,
    target_id: log.target_id,
    before_state: log.before_state,
    after_state: log.after_state,
    previous_log_id: log.previous_log_id,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
};
```

#### admin_sessions

Session management with activity metrics using ReplacingMergeTree.

| Column            | Type                 | Description             |
| ----------------- | -------------------- | ----------------------- |
| id                | String               | Session ID from browser |
| date              | Date                 | Partition key           |
| actor_id          | UUID                 | Admin user ID           |
| actor_email       | LowCardinality       | Admin email             |
| actor_type        | LowCardinality       | ADMIN, OPERATOR         |
| started_at        | DateTime64(3)        | Session start time      |
| ended_at          | Nullable(DateTime64) | Session end time        |
| last_activity_at  | DateTime64(3)        | Last activity timestamp |
| duration_seconds  | UInt32               | Session duration        |
| page_views        | UInt32               | Total page views        |
| clicks            | UInt32               | Total clicks            |
| api_calls         | UInt32               | Total API calls         |
| errors            | UInt32               | Total errors            |
| data_changes      | UInt32               | Total data changes      |
| pages_visited     | Array(String)        | Unique pages            |
| services_accessed | Array(String)        | Services accessed       |
| browser           | LowCardinality       | Browser name            |
| os                | LowCardinality       | Operating system        |
| device_type       | LowCardinality       | desktop, mobile, tablet |
| country_code      | LowCardinality       | Country code            |
| status            | LowCardinality       | active, ended, timeout  |
| end_reason        | LowCardinality       | logout, timeout, forced |

**Session Status:**

| Status        | Description         |
| ------------- | ------------------- |
| active        | Currently active    |
| ended         | Normal logout       |
| timeout       | Inactive for 30 min |
| forced_logout | Admin forced logout |

### Materialized Views

#### admin_ui_events_hourly

Hourly aggregation of UI events.

```sql
SELECT
    toStartOfHour(timestamp) as hour,
    actor_id, service_id, event_type, event_category,
    count() as event_count,
    uniq(session_id) as unique_sessions,
    avg(time_to_interaction_ms) as avg_tti_ms
FROM audit_db.admin_ui_events_local
GROUP BY hour, actor_id, service_id, event_type, event_category
```

#### admin_audit_daily

Daily aggregation of data changes.

```sql
SELECT
    toDate(timestamp) as date,
    service_id, resource, action,
    count() as action_count,
    uniq(actor_id) as unique_actors,
    uniq(target_id) as unique_targets
FROM audit_db.admin_audit_logs_local
GROUP BY date, service_id, resource, action
```

#### admin_errors

Per-minute error tracking (30-day retention).

```sql
SELECT
    toStartOfMinute(timestamp) as minute,
    service_id, path_template, error_type,
    count() as error_count,
    any(error_message) as sample_error
FROM audit_db.admin_api_logs_local
WHERE status_code >= 400
GROUP BY minute, service_id, path_template, error_type
```

#### admin_actor_daily

Daily activity summary per actor.

| Column          | Type           | Description       |
| --------------- | -------------- | ----------------- |
| date            | Date           | Date              |
| actor_id        | UUID           | Admin user ID     |
| actor_email     | LowCardinality | Admin email       |
| ui_events       | UInt64         | UI event count    |
| api_calls       | UInt64         | API call count    |
| data_changes    | UInt64         | Data change count |
| errors          | UInt64         | Error count       |
| unique_services | UInt64         | Services accessed |
| active_minutes  | UInt64         | Active time       |

#### admin_api_performance_hourly

Hourly API performance metrics.

| Column                 | Type           | Description         |
| ---------------------- | -------------- | ------------------- |
| hour                   | DateTime       | Hour                |
| path_template          | String         | API path template   |
| method                 | LowCardinality | HTTP method         |
| request_count          | UInt64         | Total requests      |
| error_count            | UInt64         | Error count         |
| total_response_time_ms | UInt64         | Total response time |
| max_response_time_ms   | UInt32         | Max response time   |
| p95_response_time_ms   | Float64        | 95th percentile     |
| p99_response_time_ms   | Float64        | 99th percentile     |

## Caching (Valkey DB 3)

| Data             | Key Pattern                   | TTL | Invalidation    |
| ---------------- | ----------------------------- | --- | --------------- |
| Export Status    | `audit:export:{exportId}`     | 24h | export complete |
| Retention Policy | `audit:retention:{policyId}`  | 1h  | policy update   |
| Session Data     | `audit:session:{sessionId}`   | 30m | session end     |
| Actor Summary    | `audit:actor:{actorId}:daily` | 5m  | new event       |

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

-- UI events by actor in last 7 days
SELECT event_type, event_name, count() as cnt
FROM audit_db.admin_ui_events
WHERE actor_id = {actorId:UUID}
  AND date >= today() - 7
GROUP BY event_type, event_name
ORDER BY cnt DESC;

-- Session activity
SELECT
    session_id,
    min(timestamp) as session_start,
    max(timestamp) as session_end,
    count() as event_count,
    uniqExact(page_path) as pages_visited
FROM audit_db.admin_ui_events
WHERE actor_id = {actorId:UUID}
GROUP BY session_id
ORDER BY session_start DESC;

-- Slowest API endpoints (last 24h)
SELECT
    path_template, method,
    count() as requests,
    avg(response_time_ms) as avg_time,
    quantile(0.95)(response_time_ms) as p95_time,
    quantile(0.99)(response_time_ms) as p99_time
FROM audit_db.admin_api_logs
WHERE date >= today() - 1
GROUP BY path_template, method
ORDER BY p95_time DESC
LIMIT 20;

-- Error rate by endpoint
SELECT
    path_template,
    countIf(status_code >= 400) as errors,
    count() as total,
    round(errors / total * 100, 2) as error_rate
FROM audit_db.admin_api_logs
WHERE date >= today() - 7
GROUP BY path_template
HAVING error_rate > 1
ORDER BY error_rate DESC;

-- All changes to a specific target
SELECT
    timestamp, actor_email, action,
    changed_fields, change_diff, reason
FROM audit_db.admin_audit_logs
WHERE target_id = {targetId:UUID}
ORDER BY timestamp DESC;

-- PII access audit
SELECT
    date, actor_email, resource, action,
    pii_fields, reason
FROM audit_db.admin_audit_logs
WHERE pii_accessed = true
  AND date >= today() - 30
ORDER BY timestamp DESC;

-- Active sessions
SELECT * FROM audit_db.admin_sessions
WHERE status = 'active'
  AND last_activity_at >= now() - INTERVAL 30 MINUTE;

-- Daily activity summary
SELECT
    date,
    sum(action_count) as total_actions,
    sum(unique_actors) as total_actors
FROM audit_db.admin_audit_daily
WHERE date >= today() - 7
GROUP BY date
ORDER BY date;
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

## OTEL Integration

Browser OTEL SDK → OTEL Collector → ClickHouse

### Attribute Mapping

| OTEL Attribute               | ClickHouse Column  |
| ---------------------------- | ------------------ |
| session.id                   | session_id         |
| actor.id                     | actor_id           |
| actor.email                  | actor_email        |
| actor.scope                  | actor_scope        |
| event.type                   | event_type         |
| event.name                   | event_name         |
| event.category               | event_category     |
| ui.page_path                 | page_path          |
| ui.component_id              | component_id       |
| service.id                   | service_id         |
| http.method                  | method             |
| http.route                   | path_template      |
| http.target                  | path               |
| http.status_code             | status_code        |
| http.response_content_length | response_body_size |

## Compliance Considerations

### GDPR Requirements

1. **Right to Access**: Data export endpoint provides user data
2. **Right to Erasure**: Logs contain `is_exported` flag for tracking
3. **IP Anonymization**: `ip_anonymized` field zeroes last octet
4. **Retention Period**: 5-7 year TTL with partition-based cleanup

### PIPA (Korea) Requirements

1. **Consent Versioning**: Document ID and version tracked
2. **IP Logging**: All consent changes include IP address
3. **Audit Trail**: Complete history of consent changes

### Retention Policy

| Table             | Default Retention | Configurable | Legal Hold |
| ----------------- | ----------------- | ------------ | ---------- |
| access_logs       | 5 years           | Yes          | No         |
| consent_history   | 5 years           | No (legal)   | No         |
| admin_actions     | 5 years           | Yes          | No         |
| data_exports      | 5 years           | No (legal)   | No         |
| admin_ui_events   | 7 years           | Yes          | No         |
| admin_api_logs    | 7 years           | Yes          | No         |
| admin_audit_logs  | 7 years           | Yes          | Yes        |
| admin_sessions    | 2 years           | Yes          | No         |
| admin\_\*\_hourly | 90 days           | Yes          | No         |
| admin\_\*\_daily  | 1-2 years         | Yes          | No         |
| admin_errors      | 30 days           | Yes          | No         |

### Legal Hold

Records with `legal_hold = true` are exempt from TTL deletion:

```sql
-- Set legal hold on specific records
ALTER TABLE audit_db.admin_audit_logs_local
UPDATE legal_hold = true
WHERE target_id = {targetId:UUID} AND resource = 'sanction';
```

## Related Documentation

- **LLM Guide**: `.ai/services/audit-service.md`
- **ClickHouse Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
- **Materialized Views**: `infrastructure/clickhouse/schemas/03-materialized_views.sql`
- **Caching Policy**: `docs/policies/CACHING.md`
- **Legal Consent**: `docs/policies/LEGAL_CONSENT.md`
