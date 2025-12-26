-- +goose Up
-- Migration: Add depth constraint for ProjectAchievement
-- Issue: Resume DB optimization - Phase 5
-- 2025 Best Practice: Enforce data integrity at database level

-- 1. Add check constraint for depth (1-4)
ALTER TABLE project_achievements
ADD CONSTRAINT chk_achievement_depth
CHECK (depth >= 1 AND depth <= 4);

-- 2. Add check constraint for order (non-negative)
ALTER TABLE project_achievements
ADD CONSTRAINT chk_achievement_order
CHECK ("order" >= 0);

-- 3. Add similar constraints to other ordered tables
ALTER TABLE resume_sections
ADD CONSTRAINT chk_section_order
CHECK ("order" >= 0);

ALTER TABLE skills
ADD CONSTRAINT chk_skill_order
CHECK ("order" >= 0);

ALTER TABLE experiences
ADD CONSTRAINT chk_experience_order
CHECK ("order" >= 0);

ALTER TABLE experience_projects
ADD CONSTRAINT chk_project_order
CHECK ("order" >= 0);

ALTER TABLE educations
ADD CONSTRAINT chk_education_order
CHECK ("order" >= 0);

ALTER TABLE certificates
ADD CONSTRAINT chk_certificate_order
CHECK ("order" >= 0);

ALTER TABLE resume_attachments
ADD CONSTRAINT chk_attachment_order
CHECK ("order" >= 0);

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
