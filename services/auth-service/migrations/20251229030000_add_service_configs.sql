-- +goose Up
-- Phase 1.1: ServiceConfig table for service validation settings (#399)

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

-- Insert default config for existing services
INSERT INTO service_configs (id, service_id, created_at, updated_at)
SELECT gen_random_uuid(), id, NOW(), NOW()
FROM services
WHERE id NOT IN (SELECT service_id FROM service_configs);

-- +goose Down
DROP TABLE IF EXISTS service_configs;
DROP TYPE IF EXISTS audit_level;
ALTER TABLE services DROP COLUMN IF EXISTS domains;
