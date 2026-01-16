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

| Service               | Dev DB                            | Release DB                            | Prod DB               |
| --------------------- | --------------------------------- | ------------------------------------- | --------------------- |
| auth-service          | girok_auth_dev                    | girok_auth_release                    | girok_auth            |
| personal-service      | girok_personal_dev                | girok_personal_release                | girok_personal        |
| authorization-service | authorization_db_dev              | authorization_db_release              | authorization_db      |
| identity-service      | identity_dev, auth_dev, legal_dev | identity_release, auth_rel, legal_rel | identity, auth, legal |

### ClickHouse

| Service           | Dev DB           | Release DB           | Prod DB      | Retention |
| ----------------- | ---------------- | -------------------- | ------------ | --------- |
| audit-service     | audit_db_dev     | audit_db_release     | audit_db     | 5 years   |
| analytics-service | analytics_db_dev | analytics_db_release | analytics_db | 90d-1y    |

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

### UUIDv7 Policy (RFC 9562)

All new tables MUST use `uuid_generate_v7()` for ID generation. This ensures:

- Time-ordered UUIDs for better index performance
- No index fragmentation
- Chronological sorting by ID

```sql
-- Define uuid_generate_v7() if not exists (use CREATE OR REPLACE for idempotency)
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  return encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;
-- +goose StatementEnd
```

### PostgreSQL

```sql
-- +goose Up
-- Note: uuid_generate_v7() must be defined in an earlier migration or this file
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),  -- UUIDv7 required
    user_id UUID NOT NULL,  -- External ref to identity-service
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS user_preferences;
```

### Enum Types

Define PostgreSQL enum types BEFORE using in tables:

```sql
-- +goose Up
-- 1. Define enum type first
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- 2. Then use in table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    status user_status NOT NULL DEFAULT 'ACTIVE'
);

-- +goose Down
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_status;
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

## Critical Warnings

### NEVER Bypass goose

**Violation**: Using Prisma Migrate, manual SQL, or schema imports outside of goose

**Consequence**: Causes `goose_db_version` desynchronization where:

- Database contains schema objects
- goose thinks migrations haven't been applied
- Future migrations fail with "already exists" errors
- Deployments blocked, requires manual recovery

**If this happens**: See `docs/llm/guides/migration-troubleshooting.md` for recovery procedures.

**Prevention**:

- ✅ Always use goose for schema changes
- ✅ Verify `goose status` after changes
- ❌ Never use `prisma migrate dev` or `prisma db push`
- ❌ Never execute schema SQL directly

## Troubleshooting

| Error                     | Solution                                       |
| ------------------------- | ---------------------------------------------- |
| FK type mismatch          | Use TEXT not UUID                              |
| PL/pgSQL parsing          | Add StatementBegin/End                         |
| Prisma drift              | pnpm prisma db pull                            |
| ClickHouse error          | Check cluster config                           |
| goose_db_version out-sync | `docs/llm/guides/migration-troubleshooting.md` |
