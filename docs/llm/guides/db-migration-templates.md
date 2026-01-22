# Database Migration Templates

> Job templates, migration file formats, and detailed troubleshooting

## Migration Job Template (PostgreSQL)

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

## Migration Job Template (ClickHouse)

```yaml
command:
  - /bin/sh
  - -c
  - |
    CLICKHOUSE_URL="clickhouse://${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}@${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/${CLICKHOUSE_DATABASE}"
    goose -dir /app/services/{service}/migrations clickhouse "$CLICKHOUSE_URL" up
```

## Migration File Formats

### PostgreSQL Basic

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

### PostgreSQL PL/pgSQL Function

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

## Environment-Specific DB Names

```yaml
suffixes:
  dev: _dev
  release: _release
  production: (none)

examples: analytics_db_dev, analytics_db_release, analytics_db

implementation: this.database = configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
```

## Vault Credentials

```bash
vault kv get secret/apps/my-girok/dev/auth-service/postgres
vault kv get secret/apps/my-girok/dev/audit-service/clickhouse
```

## Full Troubleshooting

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

## Verification Commands

```bash
kubectl get jobs -n dev-my-girok | grep migrate
kubectl logs -n dev-my-girok -l app.kubernetes.io/component=migration
kubectl exec -n dev-my-girok deployment/auth-service -- \
  goose -dir /app/services/auth-service/migrations postgres "$DATABASE_URL" status
```

---

_Main: `db-migration.md`_
