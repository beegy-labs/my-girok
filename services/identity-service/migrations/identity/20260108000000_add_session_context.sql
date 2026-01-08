-- +goose Up
-- +goose StatementBegin

-- =============================================================================
-- Add session context columns to sessions table
-- Supports USER and OPERATOR session contexts
-- =============================================================================

-- Create enum type for session context
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_context') THEN
        CREATE TYPE session_context AS ENUM ('USER', 'OPERATOR');
    END IF;
END $$;

-- Add session context column
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS session_context session_context DEFAULT 'USER' NOT NULL;

-- Add service_id column (for operator sessions - references auth_db.services)
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS service_id UUID;

-- Add operator_assignment_id column (for operator sessions - references auth_db.operator_assignments)
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS operator_assignment_id UUID;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_sessions_session_context ON sessions(session_context);
CREATE INDEX IF NOT EXISTS idx_sessions_service_id ON sessions(service_id);
CREATE INDEX IF NOT EXISTS idx_sessions_operator_assignment_id ON sessions(operator_assignment_id);
CREATE INDEX IF NOT EXISTS idx_sessions_account_context_service ON sessions(account_id, session_context, service_id);

-- Add comment for documentation
COMMENT ON COLUMN sessions.session_context IS 'Session context: USER for regular user sessions, OPERATOR for operator sessions';
COMMENT ON COLUMN sessions.service_id IS 'Service ID for OPERATOR context sessions (external reference to auth_db.services)';
COMMENT ON COLUMN sessions.operator_assignment_id IS 'Operator assignment ID for OPERATOR context sessions (external reference to auth_db.operator_assignments)';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop indexes
DROP INDEX IF EXISTS idx_sessions_session_context;
DROP INDEX IF EXISTS idx_sessions_service_id;
DROP INDEX IF EXISTS idx_sessions_operator_assignment_id;
DROP INDEX IF EXISTS idx_sessions_account_context_service;

-- Drop columns
ALTER TABLE sessions
    DROP COLUMN IF EXISTS session_context,
    DROP COLUMN IF EXISTS service_id,
    DROP COLUMN IF EXISTS operator_assignment_id;

-- Drop enum type
DROP TYPE IF EXISTS session_context;

-- +goose StatementEnd
