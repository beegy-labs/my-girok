# Database Best Practices

> Best practices, critical warnings, and troubleshooting for database operations

## Overview

This document provides essential best practices and critical warnings for database operations in the my-girok platform.

## Best Practices Summary

| DO                        | DO NOT                     |
| ------------------------- | -------------------------- |
| goose for ALL migrations  | prisma migrate             |
| UUID type with UUIDv7     | TEXT for IDs               |
| App-generated IDs         | DB DEFAULT for ID          |
| TIMESTAMPTZ(6)            | TIMESTAMP                  |
| Include -- +goose Down    | Modify existing migrations |
| StatementBegin/End for $$ | Auto-sync ArgoCD for DB    |
| UUIDv7 (all databases)    | UUIDv4                     |

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

## Enum Types

Define PostgreSQL enum types BEFORE using them in tables:

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

## PL/pgSQL Functions

Use StatementBegin/End for multi-statement PL/pgSQL:

```sql
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd
```

## Backend Code Example

Use the shared ID generator:

```typescript
import { ID } from '@my-girok/nest-common';

async create(dto: CreateDto) {
  const id = ID.generate();  // Generates UUIDv7
  await this.prisma.table.create({
    data: { id, ...dto }
  });
}
```

## Migration Workflow

```
1. goose create -> 2. Test locally -> 3. prisma db pull -> 4. Commit -> 5. CI builds -> 6. ArgoCD Manual Sync -> 7. Verify
```

### Step-by-Step

1. **Create migration**: `goose create add_feature sql`
2. **Test locally**: Apply to local database
3. **Sync Prisma**: `pnpm prisma db pull` to update schema.prisma
4. **Commit**: Both SQL migration and Prisma schema
5. **CI builds**: Validates changes
6. **Deploy**: ArgoCD applies migration job
7. **Verify**: Check goose status and application

## Troubleshooting

| Error                     | Solution                                       |
| ------------------------- | ---------------------------------------------- |
| FK type mismatch          | Ensure both columns use UUID type              |
| PL/pgSQL parsing          | Add StatementBegin/End                         |
| Prisma drift              | pnpm prisma db pull                            |
| ClickHouse error          | Check cluster config                           |
| goose_db_version out-sync | `docs/llm/guides/migration-troubleshooting.md` |

## ID Generation Guidelines

### UUIDv7 Benefits

- Time-ordered (better index performance)
- Sortable by creation time
- Same size as UUIDv4 (128 bits)

### When to Use UUIDv4

- External/public-facing IDs (privacy)
- Integration with external systems expecting UUIDv4

## Related Documentation

- Database Policy: `docs/en/policies/database.md`
- Migration Strategy: `docs/en/policies/database-migration-strategy.md`

---

_This document is auto-generated from `docs/llm/policies/database-best-practices.md`_
