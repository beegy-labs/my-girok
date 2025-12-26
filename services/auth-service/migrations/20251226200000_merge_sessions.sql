-- +goose Up
-- Migration: Merge 3 session tables (sessions, admin_sessions, operator_sessions) into 1 unified sessions table
-- Issue: #375 Phase 1 - Session 테이블 통합
-- 2025 Best Practices: tokenHash (security), revokedAt (session invalidation), ipAddress/userAgent (audit)

-- 1. Create enum type for subject type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_subject_type') THEN
        CREATE TYPE session_subject_type AS ENUM ('USER', 'ADMIN', 'OPERATOR');
    END IF;
END$$;

-- 2. Create new unified sessions table
CREATE TABLE sessions_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    subject_type session_subject_type NOT NULL,
    -- 2025 Best Practice: Store token hash instead of plain token for security
    token_hash VARCHAR(64) NOT NULL,
    -- Keep refresh_token temporarily for migration, will be removed in future
    refresh_token TEXT,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    -- 2025 Best Practice: Track session revocation
    revoked_at TIMESTAMPTZ(6),
    -- 2025 Best Practice: Audit fields
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT sessions_unified_token_hash_unique UNIQUE (token_hash)
);

-- 3. Create indexes for new table
CREATE INDEX idx_sessions_unified_subject ON sessions_unified(subject_id, subject_type);
CREATE INDEX idx_sessions_unified_token_hash ON sessions_unified(token_hash);
CREATE INDEX idx_sessions_unified_expires_at ON sessions_unified(expires_at);
CREATE INDEX idx_sessions_unified_revoked_at ON sessions_unified(revoked_at) WHERE revoked_at IS NULL;

-- 4. Migrate data from old tables
-- Note: Using SHA256 hash of refresh_token as token_hash
-- User sessions
INSERT INTO sessions_unified (id, subject_id, subject_type, token_hash, refresh_token, expires_at, created_at)
SELECT
    id,
    user_id,
    'USER'::session_subject_type,
    encode(sha256(refresh_token::bytea), 'hex'),
    refresh_token,
    expires_at,
    created_at
FROM sessions
WHERE expires_at > NOW();

-- Admin sessions
INSERT INTO sessions_unified (id, subject_id, subject_type, token_hash, refresh_token, expires_at, created_at)
SELECT
    id,
    admin_id,
    'ADMIN'::session_subject_type,
    encode(sha256(refresh_token::bytea), 'hex'),
    refresh_token,
    expires_at,
    created_at
FROM admin_sessions
WHERE expires_at > NOW();

-- Operator sessions
INSERT INTO sessions_unified (id, subject_id, subject_type, token_hash, refresh_token, expires_at, created_at)
SELECT
    id,
    operator_id,
    'OPERATOR'::session_subject_type,
    encode(sha256(refresh_token::bytea), 'hex'),
    refresh_token,
    expires_at,
    created_at
FROM operator_sessions
WHERE expires_at > NOW();

-- 5. Drop old tables
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS operator_sessions CASCADE;

-- 6. Rename new table to sessions
ALTER TABLE sessions_unified RENAME TO sessions;
ALTER TABLE sessions RENAME CONSTRAINT sessions_unified_token_hash_unique TO sessions_token_hash_unique;
ALTER INDEX idx_sessions_unified_subject RENAME TO idx_sessions_subject;
ALTER INDEX idx_sessions_unified_token_hash RENAME TO idx_sessions_token_hash;
ALTER INDEX idx_sessions_unified_expires_at RENAME TO idx_sessions_expires_at;
ALTER INDEX idx_sessions_unified_revoked_at RENAME TO idx_sessions_revoked_at;

-- 7. Add foreign key constraints (deferred for flexibility)
-- Note: We don't add FK constraints here because subject_id can reference users, admins, or operators
-- The subject_type enum ensures type safety at the application level

-- +goose Down
-- Rollback: Restore original 3 session tables

-- 1. Recreate old tables
CREATE TABLE sessions_old (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE operator_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 2. Migrate data back (only if refresh_token was preserved)
INSERT INTO sessions_old (id, user_id, refresh_token, expires_at, created_at)
SELECT id, subject_id, refresh_token, expires_at, created_at
FROM sessions
WHERE subject_type = 'USER' AND refresh_token IS NOT NULL;

INSERT INTO admin_sessions (id, admin_id, refresh_token, expires_at, created_at)
SELECT id, subject_id, refresh_token, expires_at, created_at
FROM sessions
WHERE subject_type = 'ADMIN' AND refresh_token IS NOT NULL;

INSERT INTO operator_sessions (id, operator_id, refresh_token, expires_at, created_at)
SELECT id, subject_id, refresh_token, expires_at, created_at
FROM sessions
WHERE subject_type = 'OPERATOR' AND refresh_token IS NOT NULL;

-- 3. Drop unified table and enum
DROP TABLE IF EXISTS sessions CASCADE;
ALTER TABLE sessions_old RENAME TO sessions;

-- 4. Create indexes for old tables
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_refresh_token ON admin_sessions(refresh_token);
CREATE INDEX idx_operator_sessions_operator_id ON operator_sessions(operator_id);
CREATE INDEX idx_operator_sessions_refresh_token ON operator_sessions(refresh_token);

-- 5. Add foreign key constraints
ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE admin_sessions ADD CONSTRAINT admin_sessions_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;
ALTER TABLE operator_sessions ADD CONSTRAINT operator_sessions_operator_id_fkey
    FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE;

-- 6. Drop enum type
DROP TYPE IF EXISTS session_subject_type;
