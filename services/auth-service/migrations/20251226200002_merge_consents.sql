-- +goose Up
-- Migration: Merge 2 consent tables (user_consents, platform_consents) into 1 unified consents table
-- Issue: #375 Phase 3 - Consent 테이블 통합
-- Note: scope 컬럼 추가로 SERVICE/PLATFORM 구분

-- 1. Create enum type for consent scope
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_scope') THEN
        CREATE TYPE consent_scope AS ENUM ('SERVICE', 'PLATFORM');
    END IF;
END$$;

-- 2. Create new unified consents table
CREATE TABLE consents_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    scope consent_scope NOT NULL DEFAULT 'SERVICE',
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL,
    document_id UUID REFERENCES legal_documents(id),
    document_version VARCHAR(50),
    agreed BOOLEAN NOT NULL DEFAULT true,
    agreed_at TIMESTAMPTZ(6) NOT NULL,
    withdrawn_at TIMESTAMPTZ(6),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for new table
CREATE INDEX idx_consents_unified_user_id ON consents_unified(user_id);
CREATE INDEX idx_consents_unified_service_id ON consents_unified(service_id);
CREATE INDEX idx_consents_unified_country_code ON consents_unified(country_code);
CREATE INDEX idx_consents_unified_consent_type ON consents_unified(consent_type);
CREATE INDEX idx_consents_unified_scope ON consents_unified(scope);
CREATE INDEX idx_consents_unified_agreed_at ON consents_unified(agreed_at);

-- 4. Migrate data from old tables
-- User consents (SERVICE scope)
INSERT INTO consents_unified (
    id, user_id, consent_type, scope, service_id, country_code,
    document_id, document_version, agreed, agreed_at, withdrawn_at,
    ip_address, user_agent, created_at
)
SELECT
    id, user_id, consent_type, 'SERVICE'::consent_scope, service_id, country_code,
    document_id, document_version, agreed, agreed_at, withdrawn_at,
    ip_address, user_agent, created_at
FROM user_consents;

-- Platform consents (PLATFORM scope)
INSERT INTO consents_unified (
    id, user_id, consent_type, scope, service_id, country_code,
    document_id, document_version, agreed, agreed_at, withdrawn_at,
    ip_address, user_agent, created_at
)
SELECT
    id, user_id, consent_type, 'PLATFORM'::consent_scope, NULL, country_code,
    document_id, NULL, agreed, agreed_at, withdrawn_at,
    ip_address, user_agent, created_at
FROM platform_consents;

-- 5. Drop old tables
DROP TABLE IF EXISTS user_consents CASCADE;
DROP TABLE IF EXISTS platform_consents CASCADE;

-- 6. Rename new table to consents
ALTER TABLE consents_unified RENAME TO consents;
ALTER INDEX idx_consents_unified_user_id RENAME TO idx_consents_user_id;
ALTER INDEX idx_consents_unified_service_id RENAME TO idx_consents_service_id;
ALTER INDEX idx_consents_unified_country_code RENAME TO idx_consents_country_code;
ALTER INDEX idx_consents_unified_consent_type RENAME TO idx_consents_consent_type;
ALTER INDEX idx_consents_unified_scope RENAME TO idx_consents_scope;
ALTER INDEX idx_consents_unified_agreed_at RENAME TO idx_consents_agreed_at;

-- 7. Create unique constraint
-- For SERVICE scope: unique per (user, scope, service, country, consent_type, document_version)
-- For PLATFORM scope: unique per (user, scope, country, consent_type)
CREATE UNIQUE INDEX idx_consents_unique_service ON consents(user_id, scope, service_id, country_code, consent_type, document_version)
    WHERE scope = 'SERVICE';
CREATE UNIQUE INDEX idx_consents_unique_platform ON consents(user_id, scope, country_code, consent_type)
    WHERE scope = 'PLATFORM';

-- +goose Down
-- Rollback: Restore original 2 consent tables

-- 1. Recreate old tables
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    document_id UUID REFERENCES legal_documents(id),
    document_version VARCHAR(50),
    agreed BOOLEAN NOT NULL DEFAULT true,
    agreed_at TIMESTAMPTZ(6) NOT NULL,
    withdrawn_at TIMESTAMPTZ(6),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL
);

CREATE TABLE platform_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    document_id UUID REFERENCES legal_documents(id),
    agreed BOOLEAN NOT NULL DEFAULT true,
    agreed_at TIMESTAMPTZ(6) NOT NULL,
    withdrawn_at TIMESTAMPTZ(6),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 2. Migrate data back
INSERT INTO user_consents (id, user_id, consent_type, document_id, document_version, agreed, agreed_at, withdrawn_at, ip_address, user_agent, created_at, service_id, country_code)
SELECT id, user_id, consent_type, document_id, document_version, agreed, agreed_at, withdrawn_at, ip_address, user_agent, created_at, service_id, country_code
FROM consents WHERE scope = 'SERVICE';

INSERT INTO platform_consents (id, user_id, consent_type, country_code, document_id, agreed, agreed_at, withdrawn_at, ip_address, user_agent, created_at)
SELECT id, user_id, consent_type, country_code, document_id, agreed, agreed_at, withdrawn_at, ip_address, user_agent, created_at
FROM consents WHERE scope = 'PLATFORM';

-- 3. Drop unified table
DROP TABLE IF EXISTS consents CASCADE;

-- 4. Create indexes for old tables
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_service_id ON user_consents(service_id);
CREATE INDEX idx_user_consents_country_code ON user_consents(country_code);
CREATE INDEX idx_user_consents_consent_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_agreed_at ON user_consents(agreed_at);
CREATE INDEX idx_platform_consents_user_id ON platform_consents(user_id);
CREATE INDEX idx_platform_consents_consent_type ON platform_consents(consent_type);
CREATE INDEX idx_platform_consents_country_code ON platform_consents(country_code);

-- 5. Create unique constraints
CREATE UNIQUE INDEX idx_user_consents_unique ON user_consents(user_id, service_id, country_code, consent_type, document_version);
CREATE UNIQUE INDEX idx_platform_consents_unique ON platform_consents(user_id, consent_type, country_code);

-- 6. Drop enum type
DROP TYPE IF EXISTS consent_scope;
