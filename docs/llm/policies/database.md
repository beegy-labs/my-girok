# Database

## Stack

| Component | Tool          | Purpose            |
| --------- | ------------- | ------------------ |
| Migration | goose         | SQL schema (SSOT)  |
| ORM       | Prisma 6      | Type-safe client   |
| RDBMS     | PostgreSQL 16 | Primary store      |
| Analytics | ClickHouse    | Analytics/Audit    |
| GitOps    | ArgoCD        | PreSync migrations |

## SSOT

```
goose migrations/ -> SSOT for schema
prisma/schema.prisma -> Client only (synced from DB)
```

## Databases

### PostgreSQL

| Service          | Dev DB                            | Prod DB               |
| ---------------- | --------------------------------- | --------------------- |
| auth-service     | girok_auth_dev                    | girok_auth            |
| personal-service | girok_personal_dev                | girok_personal        |
| identity-service | identity_dev, auth_dev, legal_dev | identity, auth, legal |

### ClickHouse

| Service           | Database     | Retention |
| ----------------- | ------------ | --------- |
| audit-service     | audit_db     | 5 years   |
| analytics-service | analytics_db | 90d-1y    |

## Structure

```
services/<service>/
├── migrations/           # goose SQL (SSOT)
├── helm/templates/migration-job.yaml
└── prisma/schema.prisma  # Client only
```

## goose Commands

```bash
# PostgreSQL
goose -dir migrations create add_feature sql
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" status
goose -dir migrations postgres "$DATABASE_URL" down

# ClickHouse
goose -dir migrations clickhouse "$CLICKHOUSE_URL" up
```

## Migration Format

### PostgreSQL

```sql
-- +goose Up
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS user_preferences;
```

### ClickHouse

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS analytics_db.events ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    event_name LowCardinality(String)
) ENGINE = ReplicatedMergeTree(...)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS analytics_db.events ON CLUSTER 'my_cluster';
-- +goose StatementEnd
```

### PL/pgSQL

```sql
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd
```

## Workflow

```
1. goose create -> 2. Test locally -> 3. prisma db pull -> 4. Commit -> 5. CI builds -> 6. ArgoCD Manual Sync -> 7. Verify
```

## Prisma Commands

```bash
pnpm prisma generate    # Generate client
pnpm prisma db pull     # Sync from DB
pnpm prisma studio      # GUI
# DO NOT: prisma migrate dev, prisma db push
```

## Best Practices

| DO                        | DO NOT                     |
| ------------------------- | -------------------------- |
| goose for ALL migrations  | prisma migrate             |
| TEXT for IDs (PostgreSQL) | UUID type                  |
| TIMESTAMPTZ(6)            | TIMESTAMP                  |
| Include -- +goose Down    | Modify existing migrations |
| StatementBegin/End for $$ | Auto-sync ArgoCD for DB    |
| UUIDv7 (ClickHouse)       | UUIDv4                     |

## Troubleshooting

| Error            | Solution               |
| ---------------- | ---------------------- |
| FK type mismatch | Use TEXT not UUID      |
| PL/pgSQL parsing | Add StatementBegin/End |
| Prisma drift     | pnpm prisma db pull    |
| ClickHouse error | Check cluster config   |
