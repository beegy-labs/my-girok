# Database Management Policy

> goose (SSOT) + Prisma + ArgoCD

## Stack

| Component  | Tool          | Purpose                      |
| ---------- | ------------- | ---------------------------- |
| Migration  | goose         | SQL schema versioning (SSOT) |
| ORM        | Prisma 6      | Type-safe client generation  |
| PostgreSQL | PostgreSQL 16 | Primary data store           |
| ClickHouse | ClickHouse    | Analytics & Audit            |
| GitOps     | ArgoCD        | PreSync migration hooks      |

## SSOT Principle

**goose is the Single Source of Truth for all database schemas.**

```
goose migrations/       → SSOT for schema changes
prisma/schema.prisma    → Client generation only (synced from DB)
```

### Migration Flow

```
migrations/ (goose SQL)  →  Docker Image  →  ArgoCD PreSync  →  App Deploy
                                                  ↓
                                           prisma db pull
```

## Databases

### PostgreSQL

| Service          | Dev                | Prod           | Namespace    |
| ---------------- | ------------------ | -------------- | ------------ |
| auth-service     | girok_auth_dev     | girok_auth     | dev-my-girok |
| personal-service | girok_personal_dev | girok_personal | dev-my-girok |
| identity-service | identity_dev       | identity       | dev-my-girok |
|                  | auth_dev           | auth           |              |
|                  | legal_dev          | legal          |              |
| legal-service    | legal_dev          | legal          | dev-my-girok |

### ClickHouse

| Service           | Database     | Purpose            | Retention |
| ----------------- | ------------ | ------------------ | --------- |
| audit-service     | audit_db     | Compliance logging | 5 years   |
| analytics-service | analytics_db | Business analytics | 90d ~ 1y  |

## File Structure

```
services/<service>/
├── migrations/           # goose SQL (SSOT)
│   └── 20251231000000_*.sql
├── helm/templates/
│   └── migration-job.yaml  # ArgoCD PreSync
└── prisma/schema.prisma    # Client only (PostgreSQL services)
```

## goose Commands

### PostgreSQL

```bash
# Create migration
goose -dir migrations create add_feature sql

# Apply
goose -dir migrations postgres "$DATABASE_URL" up

# Status
goose -dir migrations postgres "$DATABASE_URL" status

# Rollback
goose -dir migrations postgres "$DATABASE_URL" down
```

### ClickHouse

```bash
# Create migration
goose -dir migrations create add_feature sql

# Apply
goose -dir migrations clickhouse "$CLICKHOUSE_URL" up

# Status
goose -dir migrations clickhouse "$CLICKHOUSE_URL" status

# Rollback
goose -dir migrations clickhouse "$CLICKHOUSE_URL" down
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

### PL/pgSQL Functions

```sql
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd
```

## Deployment Workflow

1. Create migration: `goose -dir migrations create add_feature sql`
2. Test locally: `goose up`
3. Sync Prisma (PostgreSQL only): `pnpm prisma db pull && pnpm prisma generate`
4. Commit: `git add migrations/ prisma/schema.prisma`
5. Push → CI builds image with migrations
6. ArgoCD Manual Sync → PreSync Job runs goose
7. Verify: `kubectl logs job/<service>-migrate -n dev-my-girok`

## Prisma Commands

```bash
pnpm prisma generate    # Generate client
pnpm prisma db pull     # Sync from DB
pnpm prisma studio      # GUI
```

**DO NOT use**: `prisma migrate dev`, `prisma db push`

## Best Practices

| Do                            | Don't                      |
| ----------------------------- | -------------------------- |
| Use goose for ALL migrations  | Use `prisma migrate`       |
| Use TEXT for IDs (PostgreSQL) | Use UUID type              |
| Use TIMESTAMPTZ(6)            | Use TIMESTAMP              |
| Include `-- +goose Down`      | Modify existing migrations |
| Use StatementBegin/End for $$ | Auto-sync ArgoCD for DB    |
| Use UUIDv7 for ClickHouse     | Use UUIDv4                 |

## Troubleshooting

| Error            | Solution                           |
| ---------------- | ---------------------------------- |
| FK type mismatch | Use TEXT not UUID for foreign keys |
| PL/pgSQL parsing | Add StatementBegin/End             |
| Prisma drift     | `pnpm prisma db pull`              |
| ClickHouse error | Check cluster/replica config       |

```bash
# Check status (PostgreSQL)
goose -dir migrations postgres "$DATABASE_URL" status

# Check status (ClickHouse)
goose -dir migrations clickhouse "$CLICKHOUSE_URL" status

# K8s migration logs
kubectl logs job/<service>-migrate -n dev-my-girok
```

---

**Quick reference**: `.ai/database.md`
