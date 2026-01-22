# Admin Audit API Guide

This guide covers the ClickHouse tables, API endpoints, data retention policies, and security considerations for the admin audit system.

## Overview

The admin audit system tracks all administrative actions, UI events, and API calls for compliance and debugging purposes. Data is stored in ClickHouse for efficient time-series queries and long-term retention.

## ClickHouse Tables

### admin_ui_events

This table captures user interface events from the admin panel, including button clicks, page views, and form submissions.

```sql
CREATE TABLE audit_db.admin_ui_events (
  id UUID, timestamp DateTime64(3), session_id String,
  actor_id UUID, actor_email String, actor_role LowCardinality(String),
  event_type LowCardinality(String), component_name String,
  page_path String, properties String, user_agent String, ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), actor_id, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

The table is optimized for queries by date and actor, making it easy to retrieve all actions performed by a specific administrator.

### admin_api_logs

This table records all API calls made through the admin interface, including request and response bodies for debugging purposes.

```sql
CREATE TABLE audit_db.admin_api_logs (
  id UUID, timestamp DateTime64(3), trace_id String, span_id String,
  service_id UUID, endpoint String, method LowCardinality(String),
  status_code UInt16, duration_ms UInt32, actor_id UUID, actor_email String,
  request_body String, response_body String, ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), service_id, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

The trace_id and span_id fields enable correlation with distributed tracing systems for end-to-end request tracking.

### admin_audit_logs

This table stores detailed audit logs for compliance-critical operations, including before and after state for change tracking.

```sql
CREATE TABLE audit_db.admin_audit_logs (
  id UUID, timestamp DateTime64(3), actor_id UUID, actor_email String,
  action LowCardinality(String), resource LowCardinality(String),
  resource_id String, before_state String, after_state String,
  reason String, ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), resource, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

The before_state and after_state fields provide a complete audit trail for regulatory compliance.

## API Endpoints

### Service Configuration (auth-service)

These endpoints manage service-level configuration and domain settings.

| Method | Endpoint                                 | Description                    |
| ------ | ---------------------------------------- | ------------------------------ |
| GET    | `/v1/admin/services/:id/config`          | Retrieve service configuration |
| PATCH  | `/v1/admin/services/:id/config`          | Update service configuration   |
| GET    | `/v1/admin/services/:id/domains`         | List allowed domains           |
| POST   | `/v1/admin/services/:id/domains`         | Add a new domain               |
| DELETE | `/v1/admin/services/:id/domains/:domain` | Remove a domain                |

### Service Features

These endpoints manage feature flags and toggles for individual services.

| Method | Endpoint                                     | Description       |
| ------ | -------------------------------------------- | ----------------- |
| GET    | `/v1/admin/services/:id/features`            | List all features |
| POST   | `/v1/admin/services/:id/features`            | Create a feature  |
| PATCH  | `/v1/admin/services/:id/features/:featureId` | Update a feature  |
| DELETE | `/v1/admin/services/:id/features/:featureId` | Delete a feature  |

### Testers Management

These endpoints manage test users and admin testers for services.

| Method | Endpoint                                         | Description         |
| ------ | ------------------------------------------------ | ------------------- |
| GET    | `/v1/admin/services/:id/testers/users`           | List test users     |
| POST   | `/v1/admin/services/:id/testers/users`           | Add a test user     |
| DELETE | `/v1/admin/services/:id/testers/users/:userId`   | Remove a test user  |
| GET    | `/v1/admin/services/:id/testers/admins`          | List admin testers  |
| POST   | `/v1/admin/services/:id/testers/admins`          | Add an admin tester |
| DELETE | `/v1/admin/services/:id/testers/admins/:adminId` | Remove admin tester |

### Audit Queries (audit-service)

These endpoints provide read access to audit data for compliance and debugging.

| Method | Endpoint              | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/v1/audit/logs`      | Query audit logs         |
| GET    | `/v1/audit/logs/:id`  | Get specific audit entry |
| GET    | `/v1/audit/ui-events` | Query UI events          |
| GET    | `/v1/audit/api-logs`  | Query API logs           |
| GET    | `/v1/audit/sessions`  | Query admin sessions     |

## Data Retention

The following retention policies are enforced automatically via ClickHouse TTL:

| Table            | Retention | Legal Hold Support |
| ---------------- | --------- | ------------------ |
| admin_ui_events  | 7 years   | No                 |
| admin_api_logs   | 7 years   | No                 |
| admin_audit_logs | 7 years   | Yes                |
| admin_sessions   | 2 years   | No                 |

The admin_audit_logs table supports legal hold, which can prevent automatic deletion when litigation or regulatory requirements demand data preservation.

## Query Performance

The following indexes are configured for optimal query performance:

- `(toDate(timestamp), actor_id, id)` - Optimized for user-centric queries
- `(toDate(timestamp), service_id, id)` - Optimized for service-centric queries
- `(toDate(timestamp), resource, id)` - Optimized for resource-centric queries

The target performance is p95 latency under 200ms for typical queries.

## Security Considerations

The audit system implements several security measures:

- **PII Filtering**: Personally identifiable information is filtered before storage
- **IP Anonymization**: IPv6 addresses are anonymized to comply with GDPR requirements
- **Access Control**: Admin permissions are required for all audit endpoints
- **Rate Limiting**: Configurable rate limits prevent abuse
- **Change Tracking**: Before and after state is logged for all modifications

---

_This document is auto-generated from `docs/llm/guides/admin-audit-api.md`_
