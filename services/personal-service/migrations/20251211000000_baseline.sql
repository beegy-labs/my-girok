-- +goose Up
-- Baseline: existing schema already applied via Prisma
-- This migration registers the baseline version in goose_db_version
-- Tables: resumes, resume_sections, resume_attachments, skills, experiences,
--         experience_projects, project_achievements, educations, certificates,
--         share_links, transactions, budgets, user_preferences
-- Run: goose -dir migrations -allow-missing postgres "$DATABASE_URL" up

SELECT 1;

-- +goose Down
-- Cannot rollback baseline - existing data would be lost
SELECT 1;
