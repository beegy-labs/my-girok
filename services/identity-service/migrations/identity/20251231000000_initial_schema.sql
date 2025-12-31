-- +goose Up
-- Identity DB: Initial schema for accounts, sessions, devices, profiles

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE account_status AS ENUM (
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
  'DELETED'
);

CREATE TYPE account_mode AS ENUM (
  'SERVICE',
  'UNIFIED'
);

CREATE TYPE auth_provider AS ENUM (
  'LOCAL',
  'GOOGLE',
  'KAKAO',
  'NAVER',
  'APPLE',
  'MICROSOFT',
  'GITHUB'
);

CREATE TYPE device_type AS ENUM (
  'WEB',
  'IOS',
  'ANDROID',
  'DESKTOP',
  'OTHER'
);

CREATE TYPE push_platform AS ENUM (
  'FCM',
  'APNS',
  'WEB_PUSH'
);

CREATE TYPE gender AS ENUM (
  'MALE',
  'FEMALE',
  'OTHER',
  'PREFER_NOT_TO_SAY'
);

CREATE TYPE outbox_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- ============================================================
-- ACCOUNTS TABLE
-- ============================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(10) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255),
  username VARCHAR(100) NOT NULL UNIQUE,
  provider auth_provider NOT NULL DEFAULT 'LOCAL',
  provider_id VARCHAR(255),
  status account_status NOT NULL DEFAULT 'ACTIVE',
  mode account_mode NOT NULL DEFAULT 'SERVICE',

  -- Verification
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified_at TIMESTAMPTZ,

  -- Security
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_secret VARCHAR(255),
  last_password_change TIMESTAMPTZ,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,

  -- Preferences
  region VARCHAR(50),
  locale VARCHAR(10),
  timezone VARCHAR(50),
  country_code VARCHAR(2),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_accounts_external_id ON accounts(external_id);
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_username ON accounts(username);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_id);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_country_code ON accounts(country_code);

-- ============================================================
-- DEVICES TABLE
-- ============================================================

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Device identification
  fingerprint VARCHAR(64) NOT NULL,
  name VARCHAR(100),
  device_type device_type NOT NULL,

  -- Device info
  platform VARCHAR(50),
  os_version VARCHAR(50),
  app_version VARCHAR(20),
  browser_name VARCHAR(50),
  browser_version VARCHAR(20),

  -- Push notification
  push_token TEXT,
  push_platform push_platform,

  -- Trust level
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  trusted_at TIMESTAMPTZ,

  -- Activity
  last_active_at TIMESTAMPTZ,
  last_ip_address VARCHAR(45),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (account_id, fingerprint)
);

CREATE INDEX idx_devices_account_id ON devices(account_id);
CREATE INDEX idx_devices_fingerprint ON devices(fingerprint);
CREATE INDEX idx_devices_type ON devices(device_type);

-- ============================================================
-- SESSIONS TABLE
-- ============================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  refresh_token VARCHAR(64),

  -- Session metadata
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Session state
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(100),

  -- Activity tracking
  last_activity_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_account_id ON sessions(account_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_device_id ON sessions(device_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

-- ============================================================
-- PROFILES TABLE
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,

  -- Basic info
  display_name VARCHAR(100),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  avatar TEXT,
  bio VARCHAR(500),

  -- Personal info
  birth_date DATE,
  gender gender,

  -- Contact
  phone_country_code VARCHAR(5),
  phone_number VARCHAR(20),

  -- Address
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  address VARCHAR(500),
  postal_code VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_account_id ON profiles(account_id);

-- ============================================================
-- OUTBOX EVENTS TABLE (Transactional Outbox Pattern)
-- ============================================================

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,

  -- Processing status
  status outbox_status NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_events_status ON outbox_events(status, created_at);
CREATE INDEX idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);

-- ============================================================
-- GOOSE DB VERSION (for migration tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS goose_db_version (
  id SERIAL PRIMARY KEY,
  version_id BIGINT NOT NULL,
  is_applied BOOLEAN NOT NULL,
  tstamp TIMESTAMP NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS accounts;

DROP TYPE IF EXISTS outbox_status;
DROP TYPE IF EXISTS gender;
DROP TYPE IF EXISTS push_platform;
DROP TYPE IF EXISTS device_type;
DROP TYPE IF EXISTS auth_provider;
DROP TYPE IF EXISTS account_mode;
DROP TYPE IF EXISTS account_status;
