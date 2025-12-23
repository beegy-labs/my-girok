-- +goose Up
-- Add legal consent models for GDPR/PIPA compliance

-- Create enums
CREATE TYPE legal_document_type AS ENUM (
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'MARKETING_POLICY',
    'PERSONALIZED_ADS'
);

CREATE TYPE consent_type AS ENUM (
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'MARKETING_EMAIL',
    'MARKETING_PUSH',
    'MARKETING_PUSH_NIGHT',
    'MARKETING_SMS',
    'PERSONALIZED_ADS',
    'THIRD_PARTY_SHARING'
);

-- Add locale/region fields to users for consent policy
ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- Create legal_documents table
CREATE TABLE legal_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    type legal_document_type NOT NULL,
    version VARCHAR(50) NOT NULL,
    locale VARCHAR(10) NOT NULL DEFAULT 'ko',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    effective_date TIMESTAMPTZ(6) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(type, version, locale)
);

CREATE INDEX idx_legal_documents_type_locale_active ON legal_documents(type, locale, is_active);

-- Create user_consents table
CREATE TABLE user_consents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    document_id TEXT REFERENCES legal_documents(id) ON DELETE SET NULL,
    document_version VARCHAR(50),
    agreed BOOLEAN NOT NULL DEFAULT TRUE,
    agreed_at TIMESTAMPTZ(6) NOT NULL,
    withdrawn_at TIMESTAMPTZ(6),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, consent_type, document_version)
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_consent_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_agreed_at ON user_consents(agreed_at);

-- Trigger for updated_at on legal_documents
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_legal_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER update_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_documents_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS update_legal_documents_updated_at ON legal_documents;
DROP FUNCTION IF EXISTS update_legal_documents_updated_at;
DROP TABLE IF EXISTS user_consents;
DROP TABLE IF EXISTS legal_documents;
ALTER TABLE users DROP COLUMN IF EXISTS timezone;
ALTER TABLE users DROP COLUMN IF EXISTS locale;
ALTER TABLE users DROP COLUMN IF EXISTS region;
DROP TYPE IF EXISTS consent_type;
DROP TYPE IF EXISTS legal_document_type;
