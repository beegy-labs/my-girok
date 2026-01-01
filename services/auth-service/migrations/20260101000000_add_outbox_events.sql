-- +goose Up
-- Transactional Outbox Pattern for reliable event publishing (#461)
-- See: https://microservices.io/patterns/data/transactional-outbox.html

-- Create outbox_event_status enum
CREATE TYPE outbox_event_status AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- Create outbox_events table
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status outbox_event_status NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ(6),
    error_message TEXT,

    -- Constraints
    CONSTRAINT chk_retry_count_non_negative CHECK (retry_count >= 0)
);

-- Index for polling pending events (status + created_at for ordering)
CREATE INDEX idx_outbox_events_status_created ON outbox_events(status, created_at)
    WHERE status = 'PENDING';

-- Index for aggregate-based queries (e.g., find all events for a specific entity)
CREATE INDEX idx_outbox_events_aggregate_id ON outbox_events(aggregate_id);

-- Index for cleanup of old published events
CREATE INDEX idx_outbox_events_published_at ON outbox_events(published_at)
    WHERE status = 'PUBLISHED';

-- Comment on table
COMMENT ON TABLE outbox_events IS 'Transactional outbox for reliable event publishing to Redpanda';
COMMENT ON COLUMN outbox_events.event_type IS 'Event type (e.g., ROLE_CREATED, OPERATOR_INVITED)';
COMMENT ON COLUMN outbox_events.aggregate_id IS 'ID of the aggregate root that produced the event';
COMMENT ON COLUMN outbox_events.payload IS 'Event payload as JSON';
COMMENT ON COLUMN outbox_events.status IS 'Event status: PENDING (awaiting publish), PUBLISHED (sent to Redpanda), FAILED (max retries exceeded)';
COMMENT ON COLUMN outbox_events.retry_count IS 'Number of publish attempts';
COMMENT ON COLUMN outbox_events.error_message IS 'Last error message if publish failed';

-- +goose Down
DROP TABLE IF EXISTS outbox_events;
DROP TYPE IF EXISTS outbox_event_status;
