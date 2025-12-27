-- +goose Up
-- ============================================================
-- UUIDv7 Migration (RFC 9562) - NO-OP
-- ============================================================
-- This migration is a NO-OP because:
-- 1. Database was created with Prisma schema which already uses UUID type
-- 2. All ID columns are already UUID (verified via information_schema)
-- 3. Original migration referenced non-existent tables (work_experiences, projects, etc.)
--
-- The actual table names are:
-- - experiences (not work_experiences)
-- - experience_projects (not projects)
-- Tables like awards, activities, languages, etc. don't exist in this schema.
--
-- This file is kept for goose version tracking only.

SELECT 1;

-- +goose Down
SELECT 1;
