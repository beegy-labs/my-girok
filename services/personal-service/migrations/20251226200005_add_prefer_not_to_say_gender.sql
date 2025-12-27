-- +goose Up
-- Migration: Add PREFER_NOT_TO_SAY to Gender enum
-- Issue: Resume DB optimization - Phase 1
-- 2025 Best Practice: Complete gender options for user privacy
--
-- Note: IF NOT EXISTS makes this idempotent (already applied via Prisma)

ALTER TYPE "Gender" ADD VALUE IF NOT EXISTS 'PREFER_NOT_TO_SAY';

-- +goose Down
-- Note: PostgreSQL doesn't support removing enum values directly
-- Rollback requires recreating the enum type (complex and risky)
-- This is intentionally a no-op for safety
