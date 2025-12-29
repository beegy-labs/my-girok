-- +goose Up
-- Phase 1.1: ServiceConfig table for service validation settings (#399)

-- Create UUIDv7 generation function (RFC 9562)
-- Note: Uses gen_random_uuid() for random bits but overwrites timestamp portion
CREATE OR REPLACE FUNCTION generate_uuidv7() RETURNS UUID AS $$
DECLARE
  unix_ms BIGINT;
  uuid_bytes BYTEA;
BEGIN
  unix_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  uuid_bytes := decode(
    lpad(to_hex(unix_ms), 12, '0') ||
    '7' ||
    lpad(to_hex(floor(random() * 4096)::INT), 3, '0') ||
    '8' ||
    lpad(to_hex(floor(random() * 68719476736)::BIGINT), 12, '0'),
    'hex'
  );
  RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql;

-- Create audit_level enum
CREATE TYPE audit_level AS ENUM ('MINIMAL', 'STANDARD', 'VERBOSE', 'DEBUG');

-- Create service_configs table
CREATE TABLE service_configs (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,

    -- Validation Settings
    jwt_validation BOOLEAN NOT NULL DEFAULT true,
    domain_validation BOOLEAN NOT NULL DEFAULT true,
    ip_whitelist_enabled BOOLEAN NOT NULL DEFAULT false,
    ip_whitelist TEXT[] NOT NULL DEFAULT '{}',

    -- Rate Limiting
    rate_limit_enabled BOOLEAN NOT NULL DEFAULT true,
    rate_limit_requests INTEGER NOT NULL DEFAULT 1000,
    rate_limit_window INTEGER NOT NULL DEFAULT 60,

    -- Feature Flags
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT,

    -- Audit Settings
    audit_level audit_level NOT NULL DEFAULT 'STANDARD',

    -- Timestamps
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_service_configs_service_id ON service_configs(service_id);

-- Add domains field to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS domains TEXT[] NOT NULL DEFAULT '{}';

-- Insert default config for existing services (using UUIDv7)
INSERT INTO service_configs (id, service_id, created_at, updated_at)
SELECT generate_uuidv7(), id, NOW(), NOW()
FROM services
WHERE id NOT IN (SELECT service_id FROM service_configs);

-- +goose Down
DROP TABLE IF EXISTS service_configs;
DROP TYPE IF EXISTS audit_level;
ALTER TABLE services DROP COLUMN IF EXISTS domains;
DROP FUNCTION IF EXISTS generate_uuidv7();
