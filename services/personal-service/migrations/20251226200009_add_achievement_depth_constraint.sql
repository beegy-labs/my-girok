-- +goose Up
-- Migration: Add depth constraint for ProjectAchievement
-- Issue: Resume DB optimization - Phase 5
-- 2025 Best Practice: Enforce data integrity at database level
--
-- Note: Using DO blocks for idempotent constraint creation

-- 1. Add check constraint for depth (1-4)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_achievement_depth') THEN
        ALTER TABLE project_achievements ADD CONSTRAINT chk_achievement_depth CHECK (depth >= 1 AND depth <= 4);
    END IF;
END $$;

-- 2. Add check constraint for order (non-negative)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_achievement_order') THEN
        ALTER TABLE project_achievements ADD CONSTRAINT chk_achievement_order CHECK ("order" >= 0);
    END IF;
END $$;

-- 3. Add similar constraints to other ordered tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_section_order') THEN
        ALTER TABLE resume_sections ADD CONSTRAINT chk_section_order CHECK ("order" >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_skill_order') THEN
        ALTER TABLE skills ADD CONSTRAINT chk_skill_order CHECK ("order" >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_experience_order') THEN
        ALTER TABLE experiences ADD CONSTRAINT chk_experience_order CHECK ("order" >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_project_order') THEN
        ALTER TABLE experience_projects ADD CONSTRAINT chk_project_order CHECK ("order" >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_education_order') THEN
        ALTER TABLE educations ADD CONSTRAINT chk_education_order CHECK ("order" >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_certificate_order') THEN
        ALTER TABLE certificates ADD CONSTRAINT chk_certificate_order CHECK ("order" >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_attachment_order') THEN
        ALTER TABLE resume_attachments ADD CONSTRAINT chk_attachment_order CHECK ("order" >= 0);
    END IF;
END $$;

-- +goose Down
-- Rollback: Remove constraints

ALTER TABLE project_achievements DROP CONSTRAINT IF EXISTS chk_achievement_depth;
ALTER TABLE project_achievements DROP CONSTRAINT IF EXISTS chk_achievement_order;
ALTER TABLE resume_sections DROP CONSTRAINT IF EXISTS chk_section_order;
ALTER TABLE skills DROP CONSTRAINT IF EXISTS chk_skill_order;
ALTER TABLE experiences DROP CONSTRAINT IF EXISTS chk_experience_order;
ALTER TABLE experience_projects DROP CONSTRAINT IF EXISTS chk_project_order;
ALTER TABLE educations DROP CONSTRAINT IF EXISTS chk_education_order;
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS chk_certificate_order;
ALTER TABLE resume_attachments DROP CONSTRAINT IF EXISTS chk_attachment_order;
