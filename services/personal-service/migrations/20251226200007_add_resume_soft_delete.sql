-- +goose Up
-- Migration: Add soft delete to Resume and related models
-- Issue: Resume DB optimization - Phase 3
-- 2025 Best Practice: Soft delete for GDPR compliance and data recovery
--
-- Note: IF NOT EXISTS makes this idempotent (already applied via Prisma)

-- 1. Add deletedAt column to resumes table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'resumes' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE resumes ADD COLUMN deleted_at TIMESTAMPTZ(6);
    END IF;
END $$;

-- 2. Create partial index for efficient filtering of active resumes
CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at ON resumes(deleted_at) WHERE deleted_at IS NULL;

-- 3. Add composite index for user's active resumes
CREATE INDEX IF NOT EXISTS idx_resumes_user_active ON resumes(user_id, deleted_at) WHERE deleted_at IS NULL;

-- +goose Down
-- Rollback: Remove soft delete columns

-- 1. Remove indexes
DROP INDEX IF EXISTS idx_resumes_user_active;
DROP INDEX IF EXISTS idx_resumes_deleted_at;

-- 2. Remove column
ALTER TABLE resumes DROP COLUMN IF EXISTS deleted_at;
