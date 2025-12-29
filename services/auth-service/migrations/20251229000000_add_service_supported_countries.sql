-- +goose Up
-- Service supported countries table for multi-service, multi-country management

CREATE TABLE IF NOT EXISTS service_supported_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(service_id, country_code)
);

COMMENT ON TABLE service_supported_countries IS 'Countries supported by each service';
COMMENT ON COLUMN service_supported_countries.country_code IS 'ISO 3166-1 alpha-2 country code';

-- Indexes for service_supported_countries
CREATE INDEX idx_ssc_service ON service_supported_countries(service_id);
CREATE INDEX idx_ssc_country ON service_supported_countries(country_code);
CREATE INDEX idx_ssc_active ON service_supported_countries(is_active) WHERE is_active = TRUE;

-- Optimize existing legal_documents queries by service + country
CREATE INDEX IF NOT EXISTS idx_legal_docs_service_country
ON legal_documents(service_id, country_code) WHERE service_id IS NOT NULL;

-- Optimize service_consent_requirements queries (index already exists but add comment)
COMMENT ON INDEX idx_scr_service_country IS 'Optimize consent requirement lookups by service and country';

-- +goose Down
DROP INDEX IF EXISTS idx_legal_docs_service_country;
DROP INDEX IF EXISTS idx_ssc_active;
DROP INDEX IF EXISTS idx_ssc_country;
DROP INDEX IF EXISTS idx_ssc_service;
DROP TABLE IF EXISTS service_supported_countries;
