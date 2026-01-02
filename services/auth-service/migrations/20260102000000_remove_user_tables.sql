-- +goose Up
-- Migration: Remove users table and related FK constraints
-- Issue: #479 - User/Session table removal (data migrated to identity-service)
-- Parent Issue: #462
--
-- Prerequisites:
--   - Data backup completed
--   - identity-service.accounts table has all user data
--   - sessions already migrated to unified sessions table (issue #375)
--
-- Note: This migration is DESTRUCTIVE. Ensure data is backed up before running.

-- =============================================================================
-- Step 1: Drop FK constraints referencing users table
-- =============================================================================

-- user_consents.user_id -> users(id)
ALTER TABLE user_consents DROP CONSTRAINT IF EXISTS user_consents_user_id_fkey;

-- personal_info.user_id -> users(id)
ALTER TABLE personal_info DROP CONSTRAINT IF EXISTS personal_info_user_id_fkey;

-- account_links.primary_user_id -> users(id)
ALTER TABLE account_links DROP CONSTRAINT IF EXISTS account_links_primary_user_id_fkey;

-- account_links.linked_user_id -> users(id)
ALTER TABLE account_links DROP CONSTRAINT IF EXISTS account_links_linked_user_id_fkey;

-- platform_consents.user_id -> users(id)
ALTER TABLE platform_consents DROP CONSTRAINT IF EXISTS platform_consents_user_id_fkey;

-- service_tester_users.user_id -> users(id)
ALTER TABLE service_tester_users DROP CONSTRAINT IF EXISTS service_tester_users_user_id_fkey;

-- domain_access_tokens.user_id -> users(id) (if exists from baseline)
ALTER TABLE domain_access_tokens DROP CONSTRAINT IF EXISTS domain_access_tokens_user_id_fkey;

-- =============================================================================
-- Step 2: Drop tables that are tightly coupled with users
-- =============================================================================

-- These tables are user-specific and should be recreated in identity-service
-- or managed differently after user migration

-- Drop user_consents (consent data should be in identity-service.legal_db)
DROP TABLE IF EXISTS user_consents CASCADE;

-- Drop personal_info (profile data should be in identity-service)
DROP TABLE IF EXISTS personal_info_access_logs CASCADE;
DROP TABLE IF EXISTS personal_info CASCADE;

-- Drop account_links (managed by identity-service)
DROP TABLE IF EXISTS account_links CASCADE;

-- Drop platform_consents (managed by identity-service.legal_db)
DROP TABLE IF EXISTS platform_consents CASCADE;

-- Drop service_tester_users (needs to reference identity-service accounts)
DROP TABLE IF EXISTS service_tester_users CASCADE;

-- Drop domain_access_tokens (if exists, needs to reference identity-service)
DROP TABLE IF EXISTS domain_access_tokens CASCADE;

-- =============================================================================
-- Step 3: Drop users table
-- =============================================================================

DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- Step 4: Drop related enum types (if unused elsewhere)
-- =============================================================================

DROP TYPE IF EXISTS gender CASCADE;
DROP TYPE IF EXISTS accessor_type CASCADE;
DROP TYPE IF EXISTS access_action CASCADE;
DROP TYPE IF EXISTS account_link_status CASCADE;


-- +goose Down
-- Rollback: Restore users table and related tables
-- WARNING: This does NOT restore data - only schema

-- =============================================================================
-- Step 1: Recreate enum types
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
        CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accessor_type') THEN
        CREATE TYPE accessor_type AS ENUM ('USER', 'ADMIN', 'OPERATOR', 'SYSTEM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_action') THEN
        CREATE TYPE access_action AS ENUM ('READ', 'UPDATE', 'DELETE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_link_status') THEN
        CREATE TYPE account_link_status AS ENUM ('PENDING', 'ACTIVE', 'UNLINKED');
    END IF;
END$$;

-- =============================================================================
-- Step 2: Recreate users table (baseline schema + extensions)
-- =============================================================================

CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    region VARCHAR(50),
    locale VARCHAR(10),
    timezone VARCHAR(50),
    deleted_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- Step 3: Recreate domain_access_tokens table
-- =============================================================================

CREATE TABLE domain_access_tokens (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX idx_domain_access_tokens_user_id ON domain_access_tokens(user_id);
CREATE INDEX idx_domain_access_tokens_token ON domain_access_tokens(token);

-- =============================================================================
-- Step 4: Recreate personal_info table
-- =============================================================================

CREATE TABLE personal_info (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    birth_date DATE,
    gender gender,
    phone_country_code VARCHAR(5),
    phone_number VARCHAR(20),
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    address VARCHAR(500),
    postal_code VARCHAR(20),
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX idx_personal_info_user_id ON personal_info(user_id);

CREATE TABLE personal_info_access_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    personal_info_id TEXT NOT NULL REFERENCES personal_info(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES services(id),
    accessor_type accessor_type NOT NULL,
    accessor_id TEXT NOT NULL,
    action access_action NOT NULL,
    fields TEXT[] NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX idx_personal_info_access_logs_personal_info_id ON personal_info_access_logs(personal_info_id);

-- =============================================================================
-- Step 5: Recreate account_links table
-- =============================================================================

CREATE TABLE account_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    primary_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linked_service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    status account_link_status DEFAULT 'PENDING',
    linked_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(primary_user_id, linked_user_id)
);

CREATE INDEX idx_account_links_primary_user_id ON account_links(primary_user_id);
CREATE INDEX idx_account_links_linked_user_id ON account_links(linked_user_id);

-- =============================================================================
-- Step 6: Recreate platform_consents table
-- =============================================================================

CREATE TABLE platform_consents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    document_id TEXT REFERENCES legal_documents(id),
    agreed BOOLEAN DEFAULT TRUE,
    agreed_at TIMESTAMPTZ(6) NOT NULL,
    withdrawn_at TIMESTAMPTZ(6),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(user_id, consent_type, country_code)
);

CREATE INDEX idx_platform_consents_user_id ON platform_consents(user_id);

-- =============================================================================
-- Step 7: Recreate user_consents table
-- =============================================================================

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

-- =============================================================================
-- Step 8: Recreate service_tester_users table
-- =============================================================================

CREATE TABLE service_tester_users (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bypass_all BOOLEAN NOT NULL DEFAULT false,
    bypass_domain BOOLEAN NOT NULL DEFAULT true,
    bypass_ip BOOLEAN NOT NULL DEFAULT true,
    bypass_rate BOOLEAN NOT NULL DEFAULT false,
    note TEXT,
    expires_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(service_id, user_id)
);

CREATE INDEX idx_stu_service ON service_tester_users(service_id);
CREATE INDEX idx_stu_user ON service_tester_users(user_id);
