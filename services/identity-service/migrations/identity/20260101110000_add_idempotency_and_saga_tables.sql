-- +goose Up
-- +goose StatementBegin

-- ============================================================
-- IDEMPOTENCY RECORDS TABLE
-- Implements IETF draft-ietf-httpapi-idempotency-key-header
-- ============================================================

CREATE TABLE IF NOT EXISTS idempotency_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    idempotency_key VARCHAR(64) NOT NULL,
    request_fingerprint VARCHAR(128) NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    response_headers JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_idempotency_key_fingerprint UNIQUE (idempotency_key, request_fingerprint)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_records (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records (expires_at);

-- Partial index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_idempotency_expired
    ON idempotency_records (expires_at)
    WHERE expires_at < NOW();

-- ============================================================
-- SAGA STATE TABLE
-- Distributed transaction orchestration with persistence
-- ============================================================

-- Create saga status enum
DO $$ BEGIN
    CREATE TYPE saga_status AS ENUM (
        'PENDING',
        'IN_PROGRESS',
        'COMPLETED',
        'FAILED',
        'COMPENSATING',
        'COMPENSATED',
        'TIMED_OUT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS saga_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    saga_name VARCHAR(100) NOT NULL,
    correlation_id VARCHAR(64) NOT NULL UNIQUE,
    status saga_status NOT NULL DEFAULT 'PENDING',
    current_step INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    completed_steps TEXT[] NOT NULL DEFAULT '{}',
    error TEXT,
    started_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ(6),
    timeout_at TIMESTAMPTZ(6) NOT NULL,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_saga_name ON saga_states (saga_name);
CREATE INDEX IF NOT EXISTS idx_saga_status ON saga_states (status);
CREATE INDEX IF NOT EXISTS idx_saga_correlation ON saga_states (correlation_id);
CREATE INDEX IF NOT EXISTS idx_saga_timeout ON saga_states (timeout_at);

-- Partial index for active sagas
CREATE INDEX IF NOT EXISTS idx_saga_active
    ON saga_states (status, timeout_at)
    WHERE status IN ('PENDING', 'IN_PROGRESS', 'COMPENSATING');

-- ============================================================
-- CLEANUP FUNCTION FOR EXPIRED RECORDS
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_records()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM idempotency_records
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP FUNCTION IF EXISTS cleanup_expired_idempotency_records();
DROP INDEX IF EXISTS idx_saga_active;
DROP INDEX IF EXISTS idx_saga_timeout;
DROP INDEX IF EXISTS idx_saga_correlation;
DROP INDEX IF EXISTS idx_saga_status;
DROP INDEX IF EXISTS idx_saga_name;
DROP TABLE IF EXISTS saga_states;
DROP TYPE IF EXISTS saga_status;
DROP INDEX IF EXISTS idx_idempotency_expired;
DROP INDEX IF EXISTS idx_idempotency_expires;
DROP INDEX IF EXISTS idx_idempotency_key;
DROP TABLE IF EXISTS idempotency_records;

-- +goose StatementEnd
