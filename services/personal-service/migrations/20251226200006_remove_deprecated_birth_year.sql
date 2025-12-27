-- +goose Up
-- Migration: Remove deprecated birthYear field
-- Issue: Resume DB optimization - Phase 2
-- Reason: birthDate (YYYY-MM-DD) provides full date, birthYear is redundant

-- 1. Migrate any birthYear-only data to birthDate (if birthDate is null)
UPDATE resumes
SET birth_date = CONCAT(birth_year::TEXT, '-01-01')
WHERE birth_year IS NOT NULL AND birth_date IS NULL;

-- 2. Drop the deprecated column
ALTER TABLE resumes DROP COLUMN IF EXISTS birth_year;

-- +goose Down
-- Rollback: Re-add birthYear column
ALTER TABLE resumes ADD COLUMN birth_year INTEGER;

-- Restore birthYear from birthDate
UPDATE resumes
SET birth_year = EXTRACT(YEAR FROM birth_date::DATE)::INTEGER
WHERE birth_date IS NOT NULL;
