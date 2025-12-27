-- +goose Up
-- Migration: Extend SectionType enum with frontend sections
-- Issue: Resume DB optimization - Sync DB with frontend FormSectionType
-- 2025 Best Practice: DB should support all frontend sections for consistent ordering

-- Add new enum values to SectionType (frontend-only sections now in DB)
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'KEY_ACHIEVEMENTS';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'APPLICATION_REASON';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'ATTACHMENTS';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'COVER_LETTER';

-- Note: PROJECT is kept for backward compatibility but deprecated

-- +goose Down
-- Note: PostgreSQL doesn't support removing enum values directly
-- Rollback requires recreating the enum type (complex and risky)
-- This is intentionally a no-op for safety
