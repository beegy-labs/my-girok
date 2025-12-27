-- +goose Up
-- Account Linking Schema
-- Issue: #354

-- Create enum
CREATE TYPE account_link_status AS ENUM ('PENDING', 'ACTIVE', 'UNLINKED');

-- Create account_links table
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
CREATE INDEX idx_account_links_linked_service_id ON account_links(linked_service_id);
CREATE INDEX idx_account_links_status ON account_links(status);

-- Create platform_consents table
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
CREATE INDEX idx_platform_consents_consent_type ON platform_consents(consent_type);
CREATE INDEX idx_platform_consents_country_code ON platform_consents(country_code);

-- +goose Down
DROP TABLE IF EXISTS platform_consents;
DROP TABLE IF EXISTS account_links;
DROP TYPE IF EXISTS account_link_status;
