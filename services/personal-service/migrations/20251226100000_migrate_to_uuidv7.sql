-- +goose Up
-- +goose StatementBegin

-- ============================================================
-- UUIDv7 Migration (RFC 9562)
-- Migrate ID columns from TEXT/VARCHAR to native UUID type
-- ============================================================

-- Note: This migration assumes fresh database or empty tables
-- For production with existing data, additional data migration scripts are needed

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Resumes
ALTER TABLE resumes
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Work experiences
ALTER TABLE work_experiences
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid;

-- Projects
ALTER TABLE projects
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid,
  ALTER COLUMN work_experience_id TYPE UUID USING work_experience_id::uuid;

-- Educations
ALTER TABLE educations
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid;

-- Skills
ALTER TABLE skills
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid;

-- Languages
ALTER TABLE languages
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid;

-- Certificates
ALTER TABLE certificates
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid;

-- Awards
ALTER TABLE awards
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid;

-- Activities
ALTER TABLE activities
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid;

-- Resume layout settings
ALTER TABLE resume_layout_settings
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid;

-- File uploads
ALTER TABLE file_uploads
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- User preferences
ALTER TABLE user_preferences
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Export history
ALTER TABLE export_history
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN resume_id TYPE UUID USING resume_id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Note: Down migration would convert UUID back to TEXT
-- This is a complex operation and should be avoided in production
-- Only provided for development purposes

SELECT 'WARNING: Down migration for UUIDv7 is not recommended in production';

-- +goose StatementEnd
