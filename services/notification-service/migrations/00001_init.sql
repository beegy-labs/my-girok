-- +goose Up
-- Notification DB: Initial schema for notifications, preferences, device tokens, quiet hours

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

CREATE TYPE notification_channel AS ENUM (
  'IN_APP',
  'PUSH',
  'SMS',
  'EMAIL'
);

CREATE TYPE notification_status AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'READ'
);

CREATE TYPE priority AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TYPE platform AS ENUM (
  'IOS',
  'ANDROID',
  'WEB'
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel notification_channel NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  source_service VARCHAR(100) NOT NULL,
  priority priority NOT NULL DEFAULT 'NORMAL',
  status notification_status NOT NULL DEFAULT 'PENDING',
  external_id VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_tenant_account ON notifications(tenant_id, account_id);
CREATE INDEX idx_notifications_tenant_account_read ON notifications(tenant_id, account_id, read_at);
CREATE INDEX idx_notifications_tenant_account_channel ON notifications(tenant_id, account_id, channel);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================
-- CHANNEL PREFERENCES TABLE
-- ============================================================

CREATE TABLE channel_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL,
  channel notification_channel NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_channel_preferences_tenant_account_channel UNIQUE (tenant_id, account_id, channel)
);

-- ============================================================
-- TYPE PREFERENCES TABLE
-- ============================================================

CREATE TABLE type_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  enabled_channels notification_channel[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_type_preferences_tenant_account_type UNIQUE (tenant_id, account_id, notification_type)
);

-- ============================================================
-- DEVICE TOKENS TABLE
-- ============================================================

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  platform platform NOT NULL,
  device_id VARCHAR(255),
  device_info JSONB,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for device_tokens
CREATE INDEX idx_device_tokens_tenant_account ON device_tokens(tenant_id, account_id);

-- ============================================================
-- QUIET HOURS TABLE
-- ============================================================

CREATE TABLE quiet_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_quiet_hours_tenant_account UNIQUE (tenant_id, account_id)
);

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

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_preferences_updated_at
  BEFORE UPDATE ON channel_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_type_preferences_updated_at
  BEFORE UPDATE ON type_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiet_hours_updated_at
  BEFORE UPDATE ON quiet_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
DROP TRIGGER IF EXISTS update_quiet_hours_updated_at ON quiet_hours;
DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON device_tokens;
DROP TRIGGER IF EXISTS update_type_preferences_updated_at ON type_preferences;
DROP TRIGGER IF EXISTS update_channel_preferences_updated_at ON channel_preferences;
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS quiet_hours;
DROP TABLE IF EXISTS device_tokens;
DROP TABLE IF EXISTS type_preferences;
DROP TABLE IF EXISTS channel_preferences;
DROP TABLE IF EXISTS notifications;

DROP TYPE IF EXISTS platform;
DROP TYPE IF EXISTS priority;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS notification_channel;

DROP FUNCTION IF EXISTS uuid_generate_v7();
