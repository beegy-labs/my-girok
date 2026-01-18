# HR Service Migrations

> **Status**: Structure Backup Only

## Migration Tool

This service uses **goose** for database migrations (as per project policy).

## Future Migration Files

When implementing, create migrations for:

1. `YYYYMMDDHHMMSS_create_attendance_tables.sql`
2. `YYYYMMDDHHMMSS_create_leave_tables.sql`
3. `YYYYMMDDHHMMSS_create_delegation_tables.sql`

## Important Notes

- All tables reference `identity_db.accounts` via `user_id` (NOT direct FK)
- Use gRPC calls for cross-database queries (no cross-DB JOINs)
- Use UUIDv7 for all primary keys
- Follow naming conventions from `docs/llm/policies/database.md`

## Example Migration

```sql
-- +goose Up
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL, -- References identity_db.accounts
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  -- ... other columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_clock_in_at ON attendance_records(clock_in_at);

-- +goose Down
DROP TABLE attendance_records;
```
