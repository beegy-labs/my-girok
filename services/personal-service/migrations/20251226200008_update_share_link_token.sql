-- +goose Up
-- Migration: Update ShareLink token strategy
-- Issue: Resume DB optimization - Phase 4
-- 2025 Best Practice: Use URL-safe base64 encoded UUIDv7 for tokens

-- Note: Existing tokens use cuid() which is 25 chars
-- New tokens will use encode(gen_random_uuid()::bytea, 'base64') which is URL-safe

-- 1. Add new column for UUIDv7-based token (will be populated by application)
-- No schema change needed - just update the default in Prisma
-- The application layer will generate URL-safe tokens using UUIDv7

-- 2. Add index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_share_links_expires_active
ON share_links(expires_at, is_active)
WHERE is_active = true;

-- 3. Add index for user's active share links
CREATE INDEX IF NOT EXISTS idx_share_links_user_active
ON share_links(user_id, is_active)
WHERE is_active = true;

-- +goose Down
-- Rollback: Remove new indexes

DROP INDEX IF EXISTS idx_share_links_user_active;
DROP INDEX IF EXISTS idx_share_links_expires_active;
