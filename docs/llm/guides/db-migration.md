# Database Migration

> goose + ArgoCD PreSync for zero-downtime schema evolution

## Tools

| Service               | DB         | Tool  | Location                                       |
| --------------------- | ---------- | ----- | ---------------------------------------------- |
| auth-service          | PostgreSQL | goose | services/auth-service/migrations/              |
| personal-service      | PostgreSQL | goose | services/personal-service/migrations/          |
| authorization-service | PostgreSQL | goose | services/authorization-service/migrations/     |
| audit-service         | ClickHouse | goose | services/audit-service/migrations/             |
| analytics-service     | ClickHouse | goose | services/analytics-service/migrations/         |
| identity-service      | PostgreSQL | goose | services/identity-service/migrations/postgres/ |

## ArgoCD Sync-Wave

```yaml
execution_order:
  -5: ExternalSecret (DB credentials)
  -4: ConfigMap (ClickHouse SQL files)
  -3: ServiceAccount
  -2: Migration Job
   0: Deployment (default)

critical: Migration Job MUST complete before Deployment starts
```

## Migration Job Template

### PostgreSQL

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
      serviceAccountName: {{ include "{service}.serviceAccountName" . }}
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
          env:
            - name: POSTGRES_HOST
              valueFrom:
                secretKeyRef:
                  name: {{ include "{service}.fullname" . }}-postgres-credentials
                  key: host
            # ... POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE
```

### ClickHouse

```yaml
# Similar structure, replace with:
command:
  - /bin/sh
  - -c
  - |
    CLICKHOUSE_URL="clickhouse://${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}@${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/${CLICKHOUSE_DATABASE}"
    goose -dir /app/services/{service}/migrations clickhouse "$CLICKHOUSE_URL" up

env:
  # CLICKHOUSE_HOST, CLICKHOUSE_PORT, CLICKHOUSE_USERNAME, CLICKHOUSE_PASSWORD, CLICKHOUSE_DATABASE
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

### PL/pgSQL Function

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
    session_id String,
    event_name LowCardinality(String),
    properties String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), session_id, timestamp);
-- +goose StatementEnd

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

## Environment-Specific DB Names

```yaml
config:
  source: ConfigService (env vars)
  pattern: {base_name}_{env_suffix}

suffixes:
  dev: _dev
  release: _release
  production: (none)

examples:
  analytics_db:
    dev: analytics_db_dev
    release: analytics_db_release
    prod: analytics_db

implementation:
  # services/{service}/src/config/config.service.ts
  this.database = this.configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
```

## Creating Migration

```bash
# Create
cd services/auth-service
goose -dir migrations create add_feature_name sql
vim migrations/YYYYMMDDHHMMSS_add_feature_name.sql

# Test locally
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" status

# Sync Prisma (PostgreSQL only)
cd ../../
pnpm --filter @my-girok/auth-service prisma db pull
pnpm --filter @my-girok/auth-service prisma generate
```

## Deployment Flow

```yaml
1: Developer commits migration file
2: CI builds Docker image with migration
3: ArgoCD detects change
4: PreSync - ExternalSecret created (-5)
5: PreSync - Migration Job runs (-2)
6: Sync - Deployment updates (0)
7: Job auto-deleted after 5 minutes
```

## Vault Credentials

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

| Issue                           | Solution                                       |
| ------------------------------- | ---------------------------------------------- |
| Migration Job not created       | Check `migration.enabled: true` in values.yaml |
| ExternalSecret not found        | Verify Vault path and sync-wave annotation     |
| `invalid port` error            | URL-encode password special chars (%, /, :, @) |
| `connection refused`            | Verify database host (k8s service or external) |
| Job OutOfSync in ArgoCD         | Expected after TTL (300s) - Job auto-deletes   |
| `unknown database` (ClickHouse) | Ensure database exists before migration        |
| PL/pgSQL parse error            | Wrap in `-- +goose StatementBegin/End`         |
| Hardcoded database name         | Use ConfigService to read from env var         |

## Verification

```bash
# Check job
kubectl get jobs -n dev-my-girok | grep migrate

# View logs
kubectl logs -n dev-my-girok -l app.kubernetes.io/component=migration

# Check status
kubectl exec -n dev-my-girok deployment/auth-service -- \
  goose -dir /app/services/auth-service/migrations postgres "$DATABASE_URL" status

# Verify table
kubectl exec -n dev-my-girok deployment/auth-service -- \
  psql "$DATABASE_URL" -c "\dt"
```

## Best Practices

| DO                                       | DON'T                            |
| ---------------------------------------- | -------------------------------- |
| Use `uuid_generate_v7()` for new tables  | Use UUIDv4 (random, no ordering) |
| Include `-- +goose Down` for rollback    | Skip rollback migrations         |
| Test migrations locally first            | Commit untested migrations       |
| Use `TEXT` for UUID columns (PostgreSQL) | Use `UUID` type                  |
| Use `TIMESTAMPTZ(6)` for timestamps      | Use `TIMESTAMP` without TZ       |
| Wrap PL/pgSQL in StatementBegin/End      | Rely on $ delimiter only         |
| Use ConfigService for dynamic DB names   | Hardcode database names          |
| Set `migration.enabled: true`            | Rely on manual migration runs    |
