-- +goose Up
-- Add copy status fields for async resume file operations

-- Create enum for copy status
CREATE TYPE copy_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'PARTIAL',
    'FAILED'
);

-- Add copy status fields to resumes table
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS copy_status copy_status;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS copy_job_id VARCHAR(255);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS copy_completed_at TIMESTAMPTZ(6);

-- +goose Down
ALTER TABLE resumes DROP COLUMN IF EXISTS copy_completed_at;
ALTER TABLE resumes DROP COLUMN IF EXISTS copy_job_id;
ALTER TABLE resumes DROP COLUMN IF EXISTS copy_status;
DROP TYPE IF EXISTS copy_status;
