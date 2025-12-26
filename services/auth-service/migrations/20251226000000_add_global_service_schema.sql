-- +goose Up
-- Global Service Schema for multi-service account management
-- Issue: #349

-- Create enums
CREATE TYPE account_mode AS ENUM ('SERVICE', 'UNIFIED');
CREATE TYPE user_service_status AS ENUM ('ACTIVE', 'SUSPENDED', 'WITHDRAWN');

-- Create services table
CREATE TABLE services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB,
  required_consents JSONB,
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_services_slug ON services(slug);
CREATE INDEX idx_services_is_active ON services(is_active);

-- Create law_registry table
CREATE TABLE law_registry (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code VARCHAR(20) UNIQUE NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  name VARCHAR(100) NOT NULL,
  requirements JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_law_registry_country_code ON law_registry(country_code);
CREATE INDEX idx_law_registry_code ON law_registry(code);

-- Modify users table
ALTER TABLE users
  ADD COLUMN account_mode account_mode DEFAULT 'SERVICE',
  ADD COLUMN country_code VARCHAR(2);
CREATE INDEX idx_users_account_mode ON users(account_mode);
CREATE INDEX idx_users_country_code ON users(country_code);

-- Create user_services table
CREATE TABLE user_services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status user_service_status DEFAULT 'ACTIVE',
  tier_id TEXT,
  country_code VARCHAR(2) NOT NULL,
  joined_at TIMESTAMPTZ(6) DEFAULT NOW(),
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
  UNIQUE(user_id, service_id, country_code)
);
CREATE INDEX idx_user_services_user_id ON user_services(user_id);
CREATE INDEX idx_user_services_service_id ON user_services(service_id);
CREATE INDEX idx_user_services_status ON user_services(status);
CREATE INDEX idx_user_services_country_code ON user_services(country_code);

-- Migrate existing data
UPDATE users SET account_mode = 'SERVICE' WHERE account_mode IS NULL;
UPDATE users SET country_code = 'KR' WHERE country_code IS NULL;

-- +goose Down
DROP TABLE IF EXISTS user_services;
DROP INDEX IF EXISTS idx_users_account_mode;
DROP INDEX IF EXISTS idx_users_country_code;
ALTER TABLE users DROP COLUMN IF EXISTS account_mode, DROP COLUMN IF EXISTS country_code;
DROP TABLE IF EXISTS law_registry;
DROP TABLE IF EXISTS services;
DROP TYPE IF EXISTS user_service_status;
DROP TYPE IF EXISTS account_mode;
