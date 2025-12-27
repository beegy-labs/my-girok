-- +goose Up
-- Migration: Add soft delete to users table
-- Issue: #375 Phase 5 - User soft delete
-- 2025 Best Practice: Soft delete for GDPR compliance and data recovery

-- 1. Add deletedAt column to users table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ(6);

-- 2. Create index for efficient filtering of active users
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- 3. Add deletedAt to admins table as well
ALTER TABLE admins ADD COLUMN deleted_at TIMESTAMPTZ(6);

-- 4. Create index for efficient filtering of active admins
CREATE INDEX idx_admins_deleted_at ON admins(deleted_at) WHERE deleted_at IS NULL;

-- 5. Add deletedAt to operators table
ALTER TABLE operators ADD COLUMN deleted_at TIMESTAMPTZ(6);

-- 6. Create index for efficient filtering of active operators
CREATE INDEX idx_operators_deleted_at ON operators(deleted_at) WHERE deleted_at IS NULL;

-- +goose Down
-- Rollback: Remove soft delete columns

-- 1. Remove indexes
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_admins_deleted_at;
DROP INDEX IF EXISTS idx_operators_deleted_at;

-- 2. Remove columns
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE admins DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE operators DROP COLUMN IF EXISTS deleted_at;
