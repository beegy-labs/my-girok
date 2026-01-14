# Database Migration

> goose + ArgoCD PreSync pattern for zero-downtime schema evolution

## Overview

All services use **goose** for database migrations with ArgoCD PreSync hooks to ensure:

- Schema deployed before application starts
- Backward-compatible migrations only
- Automatic rollback on failure

## Migration Tools

| Service               | DB Type    | Tool  | Location                                       |
| --------------------- | ---------- | ----- | ---------------------------------------------- |
| auth-service          | PostgreSQL | goose | services/auth-service/migrations/              |
| personal-service      | PostgreSQL | goose | services/personal-service/migrations/          |
| authorization-service | PostgreSQL | goose | services/authorization-service/migrations/     |
| audit-service         | ClickHouse | goose | services/audit-service/migrations/             |
| analytics-service     | ClickHouse | goose | services/analytics-service/migrations/         |
| identity-service      | PostgreSQL | goose | services/identity-service/migrations/postgres/ |

## ArgoCD Sync-Wave Pattern

```yaml
# Execution order (numeric order):
sync-wave: "-5"  # ExternalSecret (DB credentials)
sync-wave: "-4"  # ConfigMap (ClickHouse SQL files)
sync-wave: "-3"  # ServiceAccount
sync-wave: "-2"  # Migration Job
sync-wave: "0"   # Deployment (default)
```

**Critical**: Migration Jobs MUST complete successfully before Deployment starts.

## Migration Job Configuration

### PostgreSQL Migration Job

**File**: `services/{service}/helm/templates/migration-job.yaml`

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

**File**: `services/{service}/helm/templates/migration-job.yaml`

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

### PostgreSQL

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

### ClickHouse

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

All services use **ConfigService** to read database names from environment variables:

```typescript
// services/{service}/src/config/config.service.ts
constructor(private readonly configService: ConfigService) {
  this.database = this.configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
}
```

**Environment Variables**:

| Environment | PostgreSQL Suffix | ClickHouse Suffix |
| ----------- | ----------------- | ----------------- |
| Dev         | `_dev`            | `_dev`            |
| Release     | `_release`        | `_release`        |
| Production  | (none)            | (none)            |

**Examples**:

| Service               | Dev DB                 | Release DB                 | Prod DB            |
| --------------------- | ---------------------- | -------------------------- | ------------------ |
| analytics-service     | `analytics_db_dev`     | `analytics_db_release`     | `analytics_db`     |
| audit-service         | `audit_db_dev`         | `audit_db_release`         | `audit_db`         |
| authorization-service | `authorization_db_dev` | `authorization_db_release` | `authorization_db` |

## Creating New Migration

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

```
1. Developer commits migration file
   ↓
2. CI builds Docker image with migration
   ↓
3. ArgoCD detects change
   ↓
4. PreSync: ExternalSecret created (-5)
   ↓
5. PreSync: Migration Job runs (-2)
   ↓
6. Sync: Deployment updates (0)
   ↓
7. Job auto-deleted after 5 minutes
```

## Vault Credentials

### Dev Environment

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

| Issue                         | Solution                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Migration Job not created     | Check `migration.enabled: true` in values.yaml                                      |
| ExternalSecret not found      | Verify Vault path and sync-wave annotation                                          |
| `invalid port` error          | URL-encode password special chars (%, /, :, @)                                      |
| `connection refused`          | Verify database host is correct (k8s service or external)                           |
| Job shows OutOfSync in ArgoCD | Expected after TTL (300s) - Job completes and gets deleted                          |
| ClickHouse `unknown database` | Ensure database exists before running migrations                                    |
| PL/pgSQL function parse error | Wrap function in `-- +goose StatementBegin/End`                                     |
| Hardcoded database name       | Use ConfigService to read from env var `CLICKHOUSE_DATABASE` or `POSTGRES_DATABASE` |

## Verification

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

## Common Errors

### 1. Special Characters in Password

**Error**:

```
ERROR: pq: invalid port number: "..."
```

**Fix**: URL-encode password

```bash
ENCODED_PASSWORD=$(printf '%s' "${POSTGRES_PASSWORD}" | sed 's/%/%25/g; s|/|%2F|g; s/:/%3A/g; s/@/%40/g')
```

### 2. Hardcoded Database Name

**Error**:

```
Table 'analytics_db.events' doesn't exist (in dev environment with analytics_db_dev)
```

**Fix**: Use ConfigService

```typescript
// Before (hardcoded)
private readonly database = 'analytics_db';

// After (dynamic)
constructor(private readonly configService: ConfigService) {
  this.database = this.configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
}
```

### 3. Migration Job Missing

**Error**: ArgoCD shows deployment but migration never ran

**Fix**: Check values.yaml

```yaml
migration:
  enabled: true # Must be true
```

## Best Practices

| DO                                       | DO NOT                           |
| ---------------------------------------- | -------------------------------- |
| Use `uuid_generate_v7()` for new tables  | Use UUIDv4 (random, no ordering) |
| Include `-- +goose Down` for rollback    | Skip rollback migrations         |
| Test migrations locally first            | Commit untested migrations       |
| Use `TEXT` for UUID columns (PostgreSQL) | Use `UUID` type                  |
| Use `TIMESTAMPTZ(6)` for timestamps      | Use `TIMESTAMP` without TZ       |
| Wrap PL/pgSQL in StatementBegin/End      | Rely on $ delimiter only         |
| Use ConfigService for dynamic DB names   | Hardcode database names          |
| Set `migration.enabled: true`            | Rely on manual migration runs    |
