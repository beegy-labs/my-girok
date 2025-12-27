-- +goose Up
-- Migration: Remove deprecated birthYear field
-- Issue: Resume DB optimization - Phase 2
-- Reason: birthDate (YYYY-MM-DD) provides full date, birthYear is redundant
--
-- Note: IF EXISTS makes this idempotent (already applied via Prisma)

-- 1. Migrate any birthYear-only data to birthDate (if birthDate is null)
-- This is a no-op if birth_year column doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'resumes' AND column_name = 'birth_year'
    ) THEN
        UPDATE resumes
        SET birth_date = CONCAT(birth_year::TEXT, '-01-01')
        WHERE birth_year IS NOT NULL AND birth_date IS NULL;
    END IF;
END $$;

-- 2. Drop the deprecated column (IF EXISTS for idempotency)
ALTER TABLE resumes DROP COLUMN IF EXISTS birth_year;

-- +goose Down
-- Rollback: Re-add birthYear column
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS birth_year INTEGER;

-- Restore birthYear from birthDate
UPDATE resumes
SET birth_year = EXTRACT(YEAR FROM birth_date::DATE)::INTEGER
WHERE birth_date IS NOT NULL AND birth_year IS NULL;
