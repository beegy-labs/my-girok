-- +goose Up
-- Sync goose_db_version with actual DB state
-- This migration was created to fix the discrepancy between goose_db_version and actual DB schema.
-- The migrations from 20251224 to 20260108000001 were already applied to the DB
-- (likely via Prisma Migrate or manual SQL), but were not recorded in goose_db_version.

-- Insert missing migration records (only if they don't exist)
-- +goose StatementBegin
DO $$
DECLARE
  v_version_id BIGINT;
BEGIN
  FOR v_version_id IN
    SELECT unnest(ARRAY[
      20251224000000, 20251226000000, 20251226000001, 20251226000002,
      20251226000003, 20251226000004, 20251226000005, 20251226000006,
      20251226100000, 20251226200000, 20251226200001, 20251226200002,
      20251226200003, 20251226200004, 20251229000000, 20251229010000,
      20251229020000, 20251229030000, 20251229030001, 20251229030002,
      20251229030003, 20260101000000, 20260102000000, 20260108000000,
      20260108000001
    ])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM goose_db_version WHERE version_id = v_version_id) THEN
      INSERT INTO goose_db_version (version_id, is_applied, tstamp)
      VALUES (v_version_id, TRUE, '2026-01-10 12:30:00');
    END IF;
  END LOOP;
END $$;
-- +goose StatementEnd

-- +goose Down
-- Remove the sync records
DELETE FROM goose_db_version WHERE version_id IN (
  20251224000000,
  20251226000000,
  20251226000001,
  20251226000002,
  20251226000003,
  20251226000004,
  20251226000005,
  20251226000006,
  20251226100000,
  20251226200000,
  20251226200001,
  20251226200002,
  20251226200003,
  20251226200004,
  20251229000000,
  20251229010000,
  20251229020000,
  20251229030000,
  20251229030001,
  20251229030002,
  20251229030003,
  20260101000000,
  20260102000000,
  20260108000000,
  20260108000001
);
