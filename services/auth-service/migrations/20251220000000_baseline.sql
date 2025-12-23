-- +goose Up
-- Baseline: existing schema already applied via Prisma
-- This migration registers the baseline version in goose_db_version
-- Tables: users, sessions, domain_access_tokens, oauth_provider_configs
-- Run: goose -dir migrations -allow-missing postgres "$DATABASE_URL" up

SELECT 1;

-- +goose Down
-- Cannot rollback baseline - existing data would be lost
SELECT 1;
