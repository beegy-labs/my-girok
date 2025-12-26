-- +goose Up
-- Extend consent schema for per-service/per-country consent management
-- Issue: #350

-- 1. Enum extension
ALTER TYPE consent_type ADD VALUE IF NOT EXISTS 'CROSS_BORDER_TRANSFER';
ALTER TYPE consent_type ADD VALUE IF NOT EXISTS 'CROSS_SERVICE_SHARING';

-- 2. user_consents modification
ALTER TABLE user_consents
  ADD COLUMN service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
  ADD COLUMN country_code VARCHAR(2);

-- Existing data migration
UPDATE user_consents SET country_code = 'KR' WHERE country_code IS NULL;
ALTER TABLE user_consents ALTER COLUMN country_code SET NOT NULL;

-- Unique constraint change
ALTER TABLE user_consents
  DROP CONSTRAINT IF EXISTS user_consents_user_id_consent_type_document_version_key;
ALTER TABLE user_consents
  ADD CONSTRAINT user_consents_user_service_country_type_version_key
  UNIQUE (user_id, service_id, country_code, consent_type, document_version);

CREATE INDEX idx_user_consents_service_id ON user_consents(service_id);
CREATE INDEX idx_user_consents_country_code ON user_consents(country_code);

-- 3. legal_documents modification
ALTER TABLE legal_documents
  ADD COLUMN service_id TEXT REFERENCES services(id),
  ADD COLUMN country_code VARCHAR(2);

ALTER TABLE legal_documents
  DROP CONSTRAINT IF EXISTS legal_documents_type_version_locale_key;
ALTER TABLE legal_documents
  ADD CONSTRAINT legal_documents_type_version_locale_service_country_key
  UNIQUE (type, version, locale, service_id, country_code);

CREATE INDEX idx_legal_documents_service_id ON legal_documents(service_id);
CREATE INDEX idx_legal_documents_country_code ON legal_documents(country_code);

-- 4. service_consent_requirements creation
CREATE TABLE service_consent_requirements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  consent_type consent_type NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  document_type legal_document_type NOT NULL,
  display_order INT DEFAULT 0,
  label_key VARCHAR(100) NOT NULL,
  description_key VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
  UNIQUE(service_id, country_code, consent_type)
);
CREATE INDEX idx_service_consent_requirements_service_country
  ON service_consent_requirements(service_id, country_code);

-- +goose Down
DROP TABLE IF EXISTS service_consent_requirements;

-- legal_documents rollback
DROP INDEX IF EXISTS idx_legal_documents_service_id;
DROP INDEX IF EXISTS idx_legal_documents_country_code;
ALTER TABLE legal_documents DROP CONSTRAINT IF EXISTS legal_documents_type_version_locale_service_country_key;
ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_type_version_locale_key UNIQUE (type, version, locale);
ALTER TABLE legal_documents DROP COLUMN IF EXISTS service_id, DROP COLUMN IF EXISTS country_code;

-- user_consents rollback
DROP INDEX IF EXISTS idx_user_consents_service_id;
DROP INDEX IF EXISTS idx_user_consents_country_code;
ALTER TABLE user_consents DROP CONSTRAINT IF EXISTS user_consents_user_service_country_type_version_key;
ALTER TABLE user_consents ADD CONSTRAINT user_consents_user_id_consent_type_document_version_key UNIQUE (user_id, consent_type, document_version);
ALTER TABLE user_consents DROP COLUMN IF EXISTS service_id, DROP COLUMN IF EXISTS country_code;
