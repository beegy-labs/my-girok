-- +goose Up
-- +goose StatementBegin

-- ============================================================
-- CHECK CONSTRAINTS
-- ============================================================

-- Account constraints
ALTER TABLE accounts ADD CONSTRAINT check_failed_login_attempts
  CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10);

ALTER TABLE accounts ADD CONSTRAINT check_status_valid
  CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'));

ALTER TABLE accounts ADD CONSTRAINT check_mode_valid
  CHECK (mode IN ('SERVICE', 'UNIFIED'));

ALTER TABLE accounts ADD CONSTRAINT check_provider_valid
  CHECK (provider IN ('LOCAL', 'GOOGLE', 'APPLE', 'KAKAO', 'NAVER'));

-- Session constraints
ALTER TABLE sessions ADD CONSTRAINT check_session_expires_after_created
  CHECK (expires_at > created_at);

-- Outbox constraints
ALTER TABLE outbox_events ADD CONSTRAINT check_retry_count
  CHECK (retry_count >= 0 AND retry_count <= 10);

ALTER TABLE outbox_events ADD CONSTRAINT check_status_valid
  CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'));

-- ============================================================
-- JSONB INDEXES (for efficient querying)
-- ============================================================

-- Outbox payload index (for filtering by event type/aggregate)
CREATE INDEX IF NOT EXISTS idx_outbox_payload_gin
  ON outbox_events USING GIN (payload jsonb_path_ops);

-- Profile metadata index (if metadata column exists)
-- This will be created by a later migration when metadata is added
-- CREATE INDEX IF NOT EXISTS idx_profiles_metadata_gin
--   ON profiles USING GIN (metadata jsonb_path_ops);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- Account lookup by status (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_accounts_status_created
  ON accounts (status, created_at)
  WHERE status != 'DELETED';

-- Session cleanup index
CREATE INDEX IF NOT EXISTS idx_sessions_expires_revoked
  ON sessions (expires_at)
  WHERE revoked_at IS NULL;

-- Account lockout index
CREATE INDEX IF NOT EXISTS idx_accounts_locked_until
  ON accounts (locked_until)
  WHERE locked_until IS NOT NULL AND locked_until > NOW();

-- Outbox processing index
CREATE INDEX IF NOT EXISTS idx_outbox_pending_retry
  ON outbox_events (created_at, retry_count)
  WHERE status = 'PENDING' OR status = 'FAILED';

-- Device last seen index (for cleanup)
CREATE INDEX IF NOT EXISTS idx_devices_last_seen
  ON devices (last_seen_at)
  WHERE last_seen_at IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop performance indexes
DROP INDEX IF EXISTS idx_devices_last_seen;
DROP INDEX IF EXISTS idx_outbox_pending_retry;
DROP INDEX IF EXISTS idx_accounts_locked_until;
DROP INDEX IF EXISTS idx_sessions_expires_revoked;
DROP INDEX IF EXISTS idx_accounts_status_created;

-- Drop JSONB indexes
DROP INDEX IF EXISTS idx_outbox_payload_gin;

-- Drop CHECK constraints
ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS check_status_valid;
ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS check_retry_count;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS check_session_expires_after_created;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_provider_valid;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_mode_valid;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_status_valid;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_failed_login_attempts;

-- +goose StatementEnd
