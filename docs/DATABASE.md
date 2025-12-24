# Database Management

> goose (MIT) + Prisma + ArgoCD

## Stack

| Component | Tool          | Purpose                      |
| --------- | ------------- | ---------------------------- |
| Migration | goose         | SQL schema versioning (SSOT) |
| ORM       | Prisma 6      | Type-safe client generation  |
| Database  | PostgreSQL 16 | Primary data store           |
| GitOps    | ArgoCD        | PreSync migration hooks      |

## Architecture

```
goose migrations/       → SSOT for schema changes
prisma/schema.prisma    → Client generation only (synced from DB)
```

## Databases

| Service          | Dev                | Prod           | Namespace    |
| ---------------- | ------------------ | -------------- | ------------ |
| auth-service     | girok_auth_dev     | girok_auth     | dev-my-girok |
| personal-service | girok_personal_dev | girok_personal | dev-my-girok |

## File Structure

```
services/<service>/
├── migrations/           # goose SQL (SSOT)
│   ├── 20251220000000_baseline.sql
│   └── ...
├── helm/templates/
│   └── migration-job.yaml  # ArgoCD PreSync
└── prisma/schema.prisma    # Client only
```

## goose Commands

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

## Migration Format

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
3. Sync Prisma: `pnpm prisma db pull && pnpm prisma generate`
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
| Use TEXT for IDs              | Use UUID type              |
| Use TIMESTAMPTZ(6)            | Use TIMESTAMP              |
| Include `-- +goose Down`      | Modify existing migrations |
| Test locally first            | Skip version numbers       |
| Use StatementBegin/End for $$ | Auto-sync ArgoCD for DB    |

## Troubleshooting

| Error            | Solution                           |
| ---------------- | ---------------------------------- |
| FK type mismatch | Use TEXT not UUID for foreign keys |
| PL/pgSQL parsing | Add StatementBegin/End             |
| Prisma drift     | `pnpm prisma db pull`              |

```bash
# Check status
goose -dir migrations postgres "$DATABASE_URL" status

# K8s migration logs
kubectl logs job/<service>-migrate -n dev-my-girok
```

---

**Quick reference**: `.ai/database.md`
