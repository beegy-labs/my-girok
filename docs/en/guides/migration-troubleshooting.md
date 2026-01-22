# Migration Troubleshooting Guide

This guide addresses common database migration issues, with a focus on the critical goose_db_version desynchronization problem.

## Overview

Database migrations can fail for various reasons, but one of the most common and disruptive issues is when the goose_db_version table becomes out of sync with the actual database schema. This guide explains how to identify, prevent, and resolve this problem.

## Critical Issue: goose_db_version Desynchronization

### Symptoms

You may encounter errors like these when running migrations:

```
ERROR: type "tenant_type" already exists (SQLSTATE 42710)
ERROR: relation "legal_entities" already exists (SQLSTATE 42P07)
```

These errors indicate that goose is trying to create database objects that already exist, meaning the goose_db_version tracking table does not accurately reflect the current schema state.

### Root Cause

The goose_db_version table tracks which migrations have been applied. When this table is out of sync with the actual database schema, goose will attempt to re-run migrations for objects that already exist.

This desynchronization can happen when:

1. **Prisma Migrate was used instead of goose**: Prisma Migrate creates schema changes but does not update goose_db_version
2. **Manual SQL execution**: Running SQL scripts directly bypasses goose tracking
3. **Schema import from another environment**: Importing a database dump includes the schema but not the migration history
4. **goose_db_version corruption**: Table was accidentally modified or truncated

### Impact

When this occurs, the consequences are significant:

- Migration jobs fail, blocking ArgoCD sync operations
- New application versions cannot be deployed
- New migrations cannot be applied until the issue is resolved

### Prevention

To avoid this issue, follow these guidelines:

**Always do:**

- Use goose for ALL schema changes
- Never run SQL directly on production databases
- Use `prisma db pull` ONLY to sync the Prisma client schema with the existing database
- Run `goose status` after each migration to verify tracking is correct

**Never do:**

- Use `prisma migrate dev` or `prisma db push` for schema changes
- Execute schema SQL manually in any environment
- Import schemas from other environments without corresponding goose migrations

## Solution: Synchronizing goose_db_version

When desynchronization occurs, you can create a synchronization migration to bring the tracking table back in sync with reality.

### Creating a Sync Migration

Create a migration file with a timestamp BEFORE the first pending migration:

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
      -- Add all missing version IDs
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

**Key requirements for the sync migration:**

- The timestamp MUST be before any pending migrations so it runs first
- Use PL/pgSQL with `IF NOT EXISTS` checks to make the migration idempotent
- Wrap the code in `-- +goose StatementBegin/End` for proper parsing

## Recovery Steps

### Step 1: Identify Missing Migrations

First, determine which migrations are missing from goose_db_version:

```bash
# Check goose status
goose -dir migrations postgres "$DATABASE_URL" status

# List all migration files
ls -1 migrations/*.sql | sed 's/.*\/\([0-9]*\)_.*/\1/'
```

Compare the output to identify which migration versions exist as files but are not recorded in goose_db_version.

### Step 2: Create the Sync Migration

Create a new migration file and rename it to have a timestamp before the pending migrations:

```bash
# If pending migrations start at 20251224, use 20251223
goose -dir migrations create sync_goose_db_version sql

# Rename to ensure it runs before pending migrations
mv migrations/YYYYMMDD_sync_goose_db_version.sql \
   migrations/20251223000000_sync_goose_db_version.sql
```

### Step 3: Test and Deploy

Test the sync migration in a development environment first:

```bash
goose -dir migrations postgres "$DEV_DATABASE_URL" up
```

Then commit and deploy:

```bash
git add migrations/20251223000000_sync_goose_db_version.sql
git commit -m "fix(db): sync goose_db_version"
```

## Common Mistakes

| Mistake                 | Problem                              | Solution                                   |
| ----------------------- | ------------------------------------ | ------------------------------------------ |
| Wrong timestamp         | Sync runs after pending migrations   | Use a timestamp BEFORE pending migrations  |
| Missing StatementBegin  | PL/pgSQL parsing error               | Always wrap PL/pgSQL in StatementBegin/End |
| Using ON CONFLICT       | No unique constraint on version_id   | Use IF NOT EXISTS pattern instead          |
| Incomplete version list | Dependencies between migrations fail | Cross-reference all migration files        |

---

_This document is auto-generated from `docs/llm/guides/migration-troubleshooting.md`_
