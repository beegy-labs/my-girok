# Migration Troubleshooting

> Common migration issues and solutions

## Critical: goose_db_version Desynchronization

### Symptom

```
ERROR: type "tenant_type" already exists (SQLSTATE 42710)
ERROR: relation "legal_entities" already exists (SQLSTATE 42P07)
```

### Root Cause

`goose_db_version` table out of sync with actual database state.

**How it happens:**

1. Prisma Migrate was used instead of goose
2. Manual SQL execution bypassed goose
3. Schema import from another environment
4. goose_db_version table was corrupted

### Impact

- Migration job fails, blocking ArgoCD sync
- Cannot deploy new application versions
- Cannot apply new migrations

### Prevention

**DO:**

- ✅ Use goose for ALL schema changes
- ✅ Never run SQL directly on production
- ✅ Use `prisma db pull` ONLY to sync client schema
- ✅ Verify `goose status` after each migration

**DO NOT:**

- ❌ Use `prisma migrate dev` or `prisma db push`
- ❌ Execute schema SQL manually
- ❌ Import schemas without goose migrations

## Solution: Synchronize goose_db_version

Create a sync migration with timestamp BEFORE pending migrations:

```sql
-- +goose Up
-- +goose StatementBegin
DO $$
DECLARE
  v_version_id BIGINT;
BEGIN
  FOR v_version_id IN
    SELECT unnest(ARRAY[
      20251224000000,
      20251226000000
      -- Add all missing versions
    ])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM goose_db_version WHERE version_id = v_version_id) THEN
      INSERT INTO goose_db_version (version_id, is_applied, tstamp)
      VALUES (v_version_id, TRUE, NOW());
    END IF;
  END LOOP;
END $$;
-- +goose StatementEnd

-- +goose Down
DELETE FROM goose_db_version WHERE version_id IN (20251224000000, 20251226000000);
```

**Key Requirements:**

- Timestamp BEFORE pending migrations
- Use PL/pgSQL with `IF NOT EXISTS`
- Include StatementBegin/End for PL/pgSQL blocks

## Recovery Steps

**1. Identify Missing Migrations**

```bash
goose -dir migrations postgres "$DATABASE_URL" status
ls -1 migrations/*.sql | sed 's/.*\/\([0-9]*\)_.*/\1/'
```

**2. Create Sync Migration**

```bash
# If pending start at 20251224, use 20251223
goose -dir migrations create sync_goose_db_version sql
mv migrations/YYYYMMDD_sync_goose_db_version.sql \
   migrations/20251223000000_sync_goose_db_version.sql
```

**3. Test and Deploy**

```bash
goose -dir migrations postgres "$DEV_DATABASE_URL" up
git add migrations/20251223000000_sync_goose_db_version.sql
git commit -m "fix(db): sync goose_db_version"
```

## Common Mistakes

| Mistake                | Problem                       | Solution                     |
| ---------------------- | ----------------------------- | ---------------------------- |
| Wrong timestamp        | Runs after pending migrations | Use timestamp BEFORE pending |
| Missing StatementBegin | PL/pgSQL parse error          | Wrap in StatementBegin/End   |
| Using ON CONFLICT      | No unique constraint          | Use IF NOT EXISTS            |
| Incomplete list        | Dependencies fail             | Cross-reference all files    |

---

_Related: `db-migration.md` | `database.md`_
