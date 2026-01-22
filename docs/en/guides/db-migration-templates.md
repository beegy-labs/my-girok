# Database Migration Templates Guide

This guide provides job templates, migration file formats, and troubleshooting procedures for database migrations using goose.

## Overview

Database migrations are managed using goose and executed as Kubernetes Jobs during ArgoCD sync operations. This guide covers both PostgreSQL and ClickHouse migrations.

## Migration Job Templates

### PostgreSQL Migration Job

The following Helm template creates a Kubernetes Job that runs PostgreSQL migrations before the main application deploys:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "{service}.fullname" . }}-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-2"
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command:
            - /bin/sh
            - -c
            - |
              ENCODED_PASSWORD=$(printf '%s' "${POSTGRES_PASSWORD}" | sed 's/%/%25/g; s|/|%2F|g; s/:/%3A/g; s/@/%40/g')
              DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DATABASE}"
              goose -dir /app/services/{service}/migrations postgres "$DATABASE_URL" up
```

Key aspects of this template:

- **PreSync hook**: Ensures migrations run before the application starts
- **sync-wave: "-2"**: Runs after ExternalSecrets (-3) but before the main deployment
- **TTL cleanup**: Job is automatically deleted 300 seconds after completion
- **Password encoding**: Special characters in passwords are URL-encoded to prevent connection string parsing issues

### ClickHouse Migration Job

For ClickHouse migrations, modify the command section:

```yaml
command:
  - /bin/sh
  - -c
  - |
    CLICKHOUSE_URL="clickhouse://${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}@${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/${CLICKHOUSE_DATABASE}"
    goose -dir /app/services/{service}/migrations clickhouse "$CLICKHOUSE_URL" up
```

## Migration File Formats

### Basic PostgreSQL Migration

A simple table creation migration:

```sql
-- +goose Up
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS users;
```

The `-- +goose Up` directive marks the forward migration, while `-- +goose Down` marks the rollback.

### PostgreSQL PL/pgSQL Functions

When creating functions or other multi-statement migrations, wrap them in StatementBegin/End directives:

```sql
-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP FUNCTION IF EXISTS uuid_generate_v7();
-- +goose StatementEnd
```

Without StatementBegin/End, goose will attempt to parse the function as multiple statements and fail.

### ClickHouse Migration

ClickHouse migrations also require StatementBegin/End for complex statements:

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS analytics_db.events_local (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    session_id String,
    event_name LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), session_id, timestamp);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS analytics_db.events_local;
-- +goose StatementEnd
```

## Environment-Specific Database Names

Different environments use database name suffixes to isolate data:

| Environment | Suffix     | Example Database       |
| ----------- | ---------- | ---------------------- |
| dev         | `_dev`     | `analytics_db_dev`     |
| release     | `_release` | `analytics_db_release` |
| production  | (none)     | `analytics_db`         |

In your service code, read the database name from configuration:

```typescript
this.database = configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
```

## Vault Credentials

Database credentials are stored in HashiCorp Vault. To retrieve them:

```bash
# PostgreSQL credentials
vault kv get secret/apps/my-girok/dev/auth-service/postgres

# ClickHouse credentials
vault kv get secret/apps/my-girok/dev/audit-service/clickhouse
```

## Troubleshooting

### Common Issues and Solutions

| Issue                           | Solution                                                       |
| ------------------------------- | -------------------------------------------------------------- |
| Migration Job not created       | Verify `migration.enabled: true` is set in values.yaml         |
| ExternalSecret not found        | Check Vault path and ensure sync-wave annotation is set to -3  |
| `invalid port` error            | URL-encode special characters in password (%, /, :, @)         |
| `connection refused`            | Verify database host (check K8s service name or external host) |
| Job OutOfSync in ArgoCD         | Expected after TTL expires (300s) - Job auto-deletes           |
| `unknown database` (ClickHouse) | Create the database before running migrations                  |
| PL/pgSQL parse error            | Wrap function body in `-- +goose StatementBegin/End`           |
| Hardcoded database name         | Use ConfigService to read database name from environment       |

### Verification Commands

Check migration job status:

```bash
kubectl get jobs -n dev-my-girok | grep migrate
```

View migration logs:

```bash
kubectl logs -n dev-my-girok -l app.kubernetes.io/component=migration
```

Check migration status inside the cluster:

```bash
kubectl exec -n dev-my-girok deployment/auth-service -- \
  goose -dir /app/services/auth-service/migrations postgres "$DATABASE_URL" status
```

---

_This document is auto-generated from `docs/llm/guides/db-migration-templates.md`_
