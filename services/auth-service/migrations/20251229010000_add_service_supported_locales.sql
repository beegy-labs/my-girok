-- Migration: Add service_supported_locales table
-- Description: Store supported locales per service for SSOT language management

-- +goose Up
CREATE TABLE IF NOT EXISTS service_supported_locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,  -- e.g., 'ko', 'en', 'ja', 'ko-KR'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_service_locale UNIQUE (service_id, locale)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_supported_locales_service_id ON service_supported_locales(service_id);
CREATE INDEX IF NOT EXISTS idx_service_supported_locales_locale ON service_supported_locales(locale);
CREATE INDEX IF NOT EXISTS idx_service_supported_locales_active ON service_supported_locales(service_id) WHERE is_active = TRUE;

-- Add comment
COMMENT ON TABLE service_supported_locales IS 'Supported locales per service for SSOT language management';

-- +goose Down
DROP TABLE IF EXISTS service_supported_locales;
