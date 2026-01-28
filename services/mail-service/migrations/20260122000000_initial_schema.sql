-- +goose Up
-- Mail DB: Initial schema for email logs and inbox

-- ============================================================
-- UUID v7 FUNCTION (Time-ordered UUIDs for better indexing)
-- ============================================================

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  return encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;
-- +goose StatementEnd

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE email_status AS ENUM (
  'PENDING',
  'SENT',
  'FAILED',
  'BOUNCED',
  'OPENED',
  'CLICKED'
);

-- ============================================================
-- EMAIL LOGS TABLE
-- ============================================================

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL,
  account_id UUID,
  source_service VARCHAR(100) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  template VARCHAR(100) NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  subject VARCHAR(500) NOT NULL,
  status email_status NOT NULL DEFAULT 'PENDING',
  message_id VARCHAR(255),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_type VARCHAR(50),
  bounce_reason TEXT,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_logs_tenant_id ON email_logs(tenant_id);
CREATE INDEX idx_email_logs_account_id ON email_logs(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_template ON email_logs(template);
CREATE INDEX idx_email_logs_source_service ON email_logs(source_service);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX idx_email_logs_tenant_status_created ON email_logs(tenant_id, status, created_at);

-- ============================================================
-- INBOX TABLE
-- ============================================================

CREATE TABLE inboxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL,
  email_log_id UUID NOT NULL UNIQUE REFERENCES email_logs(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_inboxes_tenant_account ON inboxes(tenant_id, account_id);
CREATE INDEX idx_inboxes_tenant_account_read ON inboxes(tenant_id, account_id, read_at);
CREATE INDEX idx_inboxes_account_deleted ON inboxes(account_id, deleted_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
DROP TRIGGER IF EXISTS update_email_logs_updated_at ON email_logs;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS inboxes;
DROP TABLE IF EXISTS email_logs;

DROP TYPE IF EXISTS email_status;

DROP FUNCTION IF EXISTS uuid_generate_v7();
