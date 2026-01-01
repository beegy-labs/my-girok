# Database Quick Reference

> goose (SSOT) + Prisma (client) + ArgoCD

## Stack

| Component | Tool          | Purpose                  |
| --------- | ------------- | ------------------------ |
| Migration | goose (MIT)   | Schema versioning (SSOT) |
| ORM       | Prisma 6      | Client generation only   |
| Database  | PostgreSQL 16 | Primary data store       |

## SSOT Principle

```
migrations/ (goose SQL)  →  Docker Image  →  ArgoCD PreSync  →  App Deploy
                                                  ↓
                                           prisma db pull
```

## Commands

```bash
# Create migration
goose -dir migrations create add_feature sql

# Apply
goose -dir migrations postgres "$DATABASE_URL" up

# Status
goose -dir migrations postgres "$DATABASE_URL" status

# Rollback
goose -dir migrations postgres "$DATABASE_URL" down

# Sync Prisma (after goose)
pnpm prisma db pull && pnpm prisma generate
```

## SQL Format

```sql
-- +goose Up
CREATE TABLE features (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS features;
```

### PL/pgSQL Functions

```sql
-- +goose StatementBegin
CREATE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd
```

## Best Practices

| Do                       | Don't                      |
| ------------------------ | -------------------------- |
| Use goose for migrations | Use `prisma migrate`       |
| Use TEXT for ID columns  | Use UUID type              |
| Use TIMESTAMPTZ(6)       | Use TIMESTAMP              |
| Include `-- +goose Down` | Skip down migration        |
| Test locally first       | Modify existing migrations |
| Manual Sync in ArgoCD    | Auto-sync for DB changes   |

## Databases

| Service          | Database (dev / prod)               |
| ---------------- | ----------------------------------- |
| auth-service     | girok_auth_dev / girok_auth         |
| personal-service | girok_personal_dev / girok_personal |
| identity-service | identity_dev / identity             |
|                  | auth_dev / auth                     |
|                  | legal_dev / legal                   |

> **Note**: identity-service uses 3 pre-separated databases for Zero Migration architecture.
> User: `identity_dev` has access to all 3 databases.
> See `.ai/services/identity-service.md` for details.

---

**Full guide**: `docs/DATABASE.md`
