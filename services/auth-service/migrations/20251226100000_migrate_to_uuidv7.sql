-- +goose Up
-- ============================================================
-- UUIDv7 Migration (RFC 9562) - NO-OP
-- ============================================================
-- This migration is a NO-OP because:
-- 1. Database was created with Prisma schema which already uses UUID type
-- 2. All ID columns are already UUID (@db.Uuid in Prisma schema)
-- 3. Prisma uses gen_random_uuid() as default
--
-- This file is kept for goose version tracking only.

SELECT 1;

-- +goose Down
SELECT 1;
