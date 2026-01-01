-- +goose Up
-- Add missing security tables and columns for identity-service
-- RFC 9068 (JWT), RFC 6819 (Token Reuse Detection), OWASP 2024 Best Practices

-- ============================================================
-- DLQ STATUS ENUM
-- ============================================================

CREATE TYPE dlq_status AS ENUM (
  'PENDING',
  'RETRIED',
  'RESOLVED',
  'IGNORED'
);

-- ============================================================
-- ADD MISSING COLUMNS TO SESSIONS TABLE
-- ============================================================

-- Add previous_refresh_token_hash for token reuse detection (RFC 6819)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS previous_refresh_token_hash VARCHAR(64);

-- Create index for previous token lookup
CREATE INDEX IF NOT EXISTS idx_sessions_prev_refresh_token
ON sessions(previous_refresh_token_hash)
WHERE previous_refresh_token_hash IS NOT NULL;

-- ============================================================
-- ADD MISSING COLUMNS TO OUTBOX_EVENTS TABLE
-- ============================================================

-- Add idempotency_key for deduplication
ALTER TABLE outbox_events
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Add next_retry_at (rename from retry_after for consistency with Prisma schema)
ALTER TABLE outbox_events
RENAME COLUMN retry_after TO next_retry_at;

-- Create index for idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_idempotency_key
ON outbox_events(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- REVOKED TOKENS TABLE (JWT Blacklist - RFC 9068)
-- ============================================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  jti VARCHAR(64) NOT NULL UNIQUE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for revoked tokens
CREATE INDEX idx_revoked_tokens_jti ON revoked_tokens(jti);
CREATE INDEX idx_revoked_tokens_account ON revoked_tokens(account_id);
CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens(expires_at);
-- Cleanup index: only check non-expired tokens
CREATE INDEX idx_revoked_tokens_active ON revoked_tokens(jti, expires_at) WHERE expires_at > now();

-- ============================================================
-- MFA BACKUP CODES TABLE (Separate from account for security)
-- ============================================================

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code_hash VARCHAR(128) NOT NULL,
  used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (account_id, code_hash)
);

-- Indexes for MFA backup codes
CREATE INDEX idx_mfa_backup_codes_account ON mfa_backup_codes(account_id);
CREATE INDEX idx_mfa_backup_codes_unused ON mfa_backup_codes(account_id, used_at) WHERE used_at IS NULL;

-- ============================================================
-- PASSWORD HISTORY TABLE (Prevent password reuse - OWASP)
-- ============================================================

CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (account_id, password_hash)
);

-- Indexes for password history
CREATE INDEX idx_password_history_account ON password_history(account_id);
CREATE INDEX idx_password_history_recent ON password_history(account_id, changed_at DESC);

-- ============================================================
-- DEAD LETTER EVENTS TABLE (Failed event handling)
-- ============================================================

CREATE TABLE IF NOT EXISTS dead_letter_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  original_event_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  failure_reason TEXT NOT NULL,
  retry_count INT NOT NULL DEFAULT 0,
  original_topic VARCHAR(255) NOT NULL,

  -- Processing status
  status dlq_status NOT NULL DEFAULT 'PENDING',
  processed_at TIMESTAMPTZ,
  processed_by VARCHAR(255),
  resolution TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for dead letter events
CREATE INDEX idx_dlq_status ON dead_letter_events(status);
CREATE INDEX idx_dlq_pending ON dead_letter_events(status, created_at) WHERE status = 'PENDING';
CREATE INDEX idx_dlq_aggregate ON dead_letter_events(aggregate_type, aggregate_id);
CREATE INDEX idx_dlq_cleanup ON dead_letter_events(status, processed_at)
  WHERE status IN ('RESOLVED', 'IGNORED');

-- ============================================================
-- ACCOUNT AUDIT COLUMNS (Add missing tracking columns)
-- ============================================================

-- Add last_failed_login_at for security tracking
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ;

-- Add last_success_login_at for activity tracking
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS last_success_login_at TIMESTAMPTZ;

-- ============================================================
-- DEVICE SECURITY COLUMNS
-- ============================================================

-- Add push_token_hash for push token verification
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS push_token_hash VARCHAR(64);

-- Add deleted_at for soft delete support
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- SESSION SECURITY COLUMNS
-- ============================================================

-- Increase refresh_token_hash size from 64 to 128 chars (SHA-512 support)
ALTER TABLE sessions
ALTER COLUMN refresh_token SET DATA TYPE VARCHAR(128);

-- +goose Down
-- Drop in reverse order

ALTER TABLE sessions ALTER COLUMN refresh_token SET DATA TYPE VARCHAR(64);

ALTER TABLE devices DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE devices DROP COLUMN IF EXISTS push_token_hash;

ALTER TABLE accounts DROP COLUMN IF EXISTS last_success_login_at;
ALTER TABLE accounts DROP COLUMN IF EXISTS last_failed_login_at;

DROP TABLE IF EXISTS dead_letter_events;
DROP TABLE IF EXISTS password_history;
DROP TABLE IF EXISTS mfa_backup_codes;
DROP TABLE IF EXISTS revoked_tokens;

DROP INDEX IF EXISTS idx_outbox_idempotency_key;
ALTER TABLE outbox_events RENAME COLUMN next_retry_at TO retry_after;
ALTER TABLE outbox_events DROP COLUMN IF EXISTS idempotency_key;

DROP INDEX IF EXISTS idx_sessions_prev_refresh_token;
ALTER TABLE sessions DROP COLUMN IF EXISTS previous_refresh_token_hash;

DROP TYPE IF EXISTS dlq_status;
