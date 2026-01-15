# Database Migration Guide

> Zero-downtime schema evolution with goose and ArgoCD PreSync hooks

## Overview

All services in this project use **goose** for database migrations combined with ArgoCD PreSync hooks. This pattern ensures that database schemas are deployed before the application starts, that only backward-compatible migrations are applied, and that automatic rollback occurs on migration failure.

## Migration Tools by Service

The project uses goose as the migration tool across all services. Each service has its migrations in a dedicated directory:

**PostgreSQL Services:**

- **auth-service**: `services/auth-service/migrations/`
- **personal-service**: `services/personal-service/migrations/`
- **authorization-service**: `services/authorization-service/migrations/`
- **identity-service**: `services/identity-service/migrations/postgres/`

**ClickHouse Services:**

- **audit-service**: `services/audit-service/migrations/`
- **analytics-service**: `services/analytics-service/migrations/`

## ArgoCD Sync-Wave Pattern

Migrations execute in a specific order controlled by sync-wave annotations. Lower numbers execute first:

```yaml
# Execution order (numeric order):
sync-wave: "-5"  # ExternalSecret (DB credentials)
sync-wave: "-4"  # ConfigMap (ClickHouse SQL files)
sync-wave: "-3"  # ServiceAccount
sync-wave: "-2"  # Migration Job
sync-wave: "0"   # Deployment (default)
```

This ordering is critical: the Migration Job at sync-wave "-2" must complete successfully before the Deployment at sync-wave "0" starts. This ensures the application always runs against an up-to-date schema.

## Migration Job Configuration

### PostgreSQL Migration Job

The PostgreSQL migration job template is located at `services/{service}/helm/templates/migration-job.yaml`:

```yaml
{{- if .Values.migration.enabled }}
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "{service}.fullname" . }}-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-2"
spec:
  ttlSecondsAfterFinished: 300  # Auto-delete after 5 minutes
  backoffLimit: 3
  template:
    spec:
      serviceAccountName: {{ include "{service}.serviceAccountName" . }}
      restartPolicy: Never
      containers:
        - name: migrate
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command:
            - /bin/sh
            - -c
            - |
              # URL-encode password special characters
              ENCODED_PASSWORD=$(printf '%s' "${POSTGRES_PASSWORD}" | sed 's/%/%25/g; s|/|%2F|g; s/:/%3A/g; s/@/%40/g')
              DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DATABASE}"
              goose -dir /app/services/{service}/migrations postgres "$DATABASE_URL" up
          env:
            - name: POSTGRES_HOST
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-postgres-credentials
                  key: host
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-postgres-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-postgres-credentials
                  key: password
            - name: POSTGRES_DATABASE
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-postgres-credentials
                  key: database
{{- end }}
```

### ClickHouse Migration Job

The ClickHouse migration job follows a similar pattern at `services/{service}/helm/templates/migration-job.yaml`:

```yaml
{{- if .Values.migration.enabled }}
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
      serviceAccountName: {{ include "{service}.serviceAccountName" . }}
      restartPolicy: Never
      containers:
        - name: migrate
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command:
            - /bin/sh
            - -c
            - |
              # Build ClickHouse connection URL
              CLICKHOUSE_URL="clickhouse://${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}@${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/${CLICKHOUSE_DATABASE}"
              goose -dir /app/services/{service}/migrations clickhouse "$CLICKHOUSE_URL" up
          env:
            - name: CLICKHOUSE_HOST
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-clickhouse-credentials
                  key: host
            - name: CLICKHOUSE_PORT
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-clickhouse-credentials
                  key: port
            - name: CLICKHOUSE_USERNAME
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-clickhouse-credentials
                  key: username
            - name: CLICKHOUSE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-clickhouse-credentials
                  key: password
            - name: CLICKHOUSE_DATABASE
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-clickhouse-credentials
                  key: database
{{- end }}
```

## Migration File Format

### PostgreSQL Migrations

Standard PostgreSQL migrations use goose's Up and Down directives:

```sql
-- +goose Up
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- +goose Down
DROP TABLE IF EXISTS users;
```

### PL/pgSQL Functions

When creating PostgreSQL functions, wrap them in StatementBegin/End directives:

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

### ClickHouse Migrations

ClickHouse migrations also use StatementBegin/End for multi-statement operations:

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS analytics_db.events_local (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    date Date,
    session_id String,
    event_name LowCardinality(String),
    properties String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), session_id, timestamp);
-- +goose StatementEnd

-- Distributed table
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS analytics_db.events AS analytics_db.events_local
ENGINE = Distributed('default', 'analytics_db', 'events_local', rand());
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS analytics_db.events;
-- +goose StatementEnd

-- +goose StatementBegin
DROP TABLE IF EXISTS analytics_db.events_local;
-- +goose StatementEnd
```

## Environment-Specific Database Names

All services use ConfigService to dynamically read database names from environment variables, allowing different databases per environment:

```typescript
// services/{service}/src/config/config.service.ts
constructor(private readonly configService: ConfigService) {
  this.database = this.configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
}
```

**Environment Suffix Conventions:**

- **Development**: Suffix `_dev` (e.g., `analytics_db_dev`)
- **Release/Staging**: Suffix `_release` (e.g., `analytics_db_release`)
- **Production**: No suffix (e.g., `analytics_db`)

**Example Database Names by Service and Environment:**

| Service               | Dev                    | Release                    | Production         |
| --------------------- | ---------------------- | -------------------------- | ------------------ |
| analytics-service     | `analytics_db_dev`     | `analytics_db_release`     | `analytics_db`     |
| audit-service         | `audit_db_dev`         | `audit_db_release`         | `audit_db`         |
| authorization-service | `authorization_db_dev` | `authorization_db_release` | `authorization_db` |

## Creating a New Migration

Follow these steps to create and apply a new migration:

```bash
# Navigate to service directory
cd services/auth-service

# Create new migration file
goose -dir migrations create add_feature_name sql

# Edit the generated file
vim migrations/YYYYMMDDHHMMSS_add_feature_name.sql

# Test locally (requires DATABASE_URL or CLICKHOUSE_URL)
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
goose -dir migrations postgres "$DATABASE_URL" up

# Verify
goose -dir migrations postgres "$DATABASE_URL" status

# Sync Prisma schema (PostgreSQL only)
cd ../../
pnpm --filter @my-girok/auth-service prisma db pull
pnpm --filter @my-girok/auth-service prisma generate
```

## Deployment Flow

The migration deployment follows this sequence:

1. Developer commits migration file to the repository
2. CI pipeline builds Docker image containing the migration
3. ArgoCD detects the change in the repository
4. PreSync phase: ExternalSecret is created (sync-wave -5)
5. PreSync phase: Migration Job runs (sync-wave -2)
6. Sync phase: Deployment updates (sync-wave 0)
7. Job is automatically deleted after 5 minutes (ttlSecondsAfterFinished)

## Vault Credentials

Database credentials are stored in HashiCorp Vault. Access them in the dev environment with:

```bash
# PostgreSQL services
vault kv get secret/apps/my-girok/dev/auth-service/postgres
vault kv get secret/apps/my-girok/dev/personal-service/postgres
vault kv get secret/apps/my-girok/dev/authorization-service/postgres

# ClickHouse services
vault kv get secret/apps/my-girok/dev/audit-service/clickhouse
vault kv get secret/apps/my-girok/dev/analytics-service/clickhouse
```

## Troubleshooting

### Migration Job Not Created

Verify that `migration.enabled: true` is set in your values.yaml file.

### ExternalSecret Not Found

Check the Vault path configuration and ensure the sync-wave annotation is correct (should be -5 or lower).

### Invalid Port Error

This typically occurs when passwords contain special characters. URL-encode the password with:

```bash
ENCODED_PASSWORD=$(printf '%s' "${POSTGRES_PASSWORD}" | sed 's/%/%25/g; s|/|%2F|g; s/:/%3A/g; s/@/%40/g')
```

### Connection Refused

Verify the database host is correct. In Kubernetes, this should be the service DNS name or external hostname.

### Job Shows OutOfSync in ArgoCD

This is expected behavior after the TTL (300 seconds) expires. The job completes and gets deleted, which ArgoCD reports as out of sync.

### Unknown Database Error in ClickHouse

Ensure the target database exists before running migrations. The database must be created separately from the table migrations.

### PL/pgSQL Function Parse Error

Wrap all PL/pgSQL functions in `-- +goose StatementBegin` and `-- +goose StatementEnd` directives.

### Hardcoded Database Name Issues

Use ConfigService to read from environment variables (`CLICKHOUSE_DATABASE` or `POSTGRES_DATABASE`) instead of hardcoding database names.

## Verification Commands

After deployment, verify migrations were applied correctly:

```bash
# Check if migration job ran
kubectl get jobs -n dev-my-girok | grep migrate

# View migration logs
kubectl logs -n dev-my-girok -l app.kubernetes.io/component=migration

# Check migration status (exec into pod)
kubectl exec -n dev-my-girok deployment/auth-service -- \
  goose -dir /app/services/auth-service/migrations \
  postgres "$DATABASE_URL" status

# Verify table created
kubectl exec -n dev-my-girok deployment/auth-service -- \
  psql "$DATABASE_URL" -c "\dt"
```

## Common Errors and Solutions

### Special Characters in Password

When you see `ERROR: pq: invalid port number: "..."`, the password contains special characters that need URL encoding:

```bash
ENCODED_PASSWORD=$(printf '%s' "${POSTGRES_PASSWORD}" | sed 's/%/%25/g; s|/|%2F|g; s/:/%3A/g; s/@/%40/g')
```

### Hardcoded Database Name

When you see `Table 'analytics_db.events' doesn't exist` in a dev environment using `analytics_db_dev`, update the code to use ConfigService:

```typescript
// Before (hardcoded)
private readonly database = 'analytics_db';

// After (dynamic)
constructor(private readonly configService: ConfigService) {
  this.database = this.configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
}
```

### Migration Job Missing

If ArgoCD shows deployment but migration never ran, check values.yaml:

```yaml
migration:
  enabled: true # Must be true
```

## Best Practices

**Recommended Practices:**

- Use `uuid_generate_v7()` for new tables to get time-ordered UUIDs
- Always include `-- +goose Down` migrations for rollback capability
- Test migrations locally before committing
- Use `TEXT` type for UUID columns in PostgreSQL
- Use `TIMESTAMPTZ(6)` for timestamps to include timezone information
- Wrap PL/pgSQL functions in StatementBegin/End directives
- Use ConfigService for dynamic database names
- Set `migration.enabled: true` in Helm values

**Practices to Avoid:**

- Using UUIDv4 (random, no ordering benefits)
- Skipping rollback migrations
- Committing untested migrations
- Using `UUID` type directly (prefer `TEXT`)
- Using `TIMESTAMP` without timezone
- Relying only on $ delimiter for PL/pgSQL
- Hardcoding database names
- Relying on manual migration runs

---

**LLM Reference**: `docs/llm/guides/db-migration.md`
