-- +goose Up
-- Legal DB: Initial schema for consents, consent_logs, laws, dsr_requests

-- ============================================================
-- UUID v7 FUNCTION (Time-ordered UUIDs for better indexing)
-- ============================================================

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  return encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;
-- +goose StatementEnd

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE consent_type AS ENUM (
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'MARKETING_EMAIL',
  'MARKETING_PUSH',
  'MARKETING_PUSH_NIGHT',
  'MARKETING_SMS',
  'PERSONALIZED_ADS',
  'THIRD_PARTY_SHARING',
  'CROSS_BORDER_TRANSFER',
  'CROSS_SERVICE_SHARING'
);

CREATE TYPE consent_scope AS ENUM (
  'SERVICE',
  'PLATFORM'
);

CREATE TYPE consent_log_action AS ENUM (
  'GRANTED',
  'WITHDRAWN',
  'UPDATED',
  'EXPIRED',
  'MIGRATED'
);

CREATE TYPE legal_document_type AS ENUM (
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'MARKETING_POLICY',
  'PERSONALIZED_ADS',
  'COOKIE_POLICY',
  'DATA_PROCESSING_AGREEMENT'
);

CREATE TYPE dsr_request_type AS ENUM (
  'ACCESS',
  'RECTIFICATION',
  'ERASURE',
  'RESTRICTION',
  'PORTABILITY',
  'OBJECTION',
  'AUTOMATED_DECISION'
);

CREATE TYPE dsr_status AS ENUM (
  'PENDING',
  'VERIFIED',
  'IN_PROGRESS',
  'AWAITING_INFO',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE dsr_priority AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TYPE dsr_response_type AS ENUM (
  'FULFILLED',
  'PARTIALLY_FULFILLED',
  'DENIED',
  'EXTENDED'
);

CREATE TYPE outbox_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- ============================================================
-- LEGAL DOCUMENTS TABLE
-- ============================================================

CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  type legal_document_type NOT NULL,
  version VARCHAR(50) NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  effective_date TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Scope
  service_id UUID,
  country_code VARCHAR(2),

  -- Audit
  created_by UUID,
  updated_by UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (type, version, locale, service_id, country_code)
);

CREATE INDEX idx_legal_docs_type_locale_active ON legal_documents(type, locale, is_active) WHERE is_active = true;
CREATE INDEX idx_legal_docs_service_id ON legal_documents(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX idx_legal_docs_country_code ON legal_documents(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX idx_legal_docs_effective_date ON legal_documents(effective_date);

-- ============================================================
-- CONSENTS TABLE
-- ============================================================

CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  account_id UUID NOT NULL,
  consent_type consent_type NOT NULL,
  scope consent_scope NOT NULL DEFAULT 'SERVICE',
  service_id UUID,
  country_code VARCHAR(2) NOT NULL,
  document_id UUID REFERENCES legal_documents(id),
  document_version VARCHAR(50),
  agreed BOOLEAN NOT NULL DEFAULT true,
  agreed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consents_account_id ON consents(account_id);
CREATE INDEX idx_consents_service_id ON consents(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX idx_consents_country_code ON consents(country_code);
CREATE INDEX idx_consents_consent_type ON consents(consent_type);
CREATE INDEX idx_consents_document_id ON consents(document_id) WHERE document_id IS NOT NULL;
-- Composite index for active consent lookup
CREATE INDEX idx_consents_active ON consents(account_id, consent_type, agreed, withdrawn_at) WHERE agreed = true AND withdrawn_at IS NULL;
CREATE INDEX idx_consents_expiring ON consents(expires_at) WHERE expires_at IS NOT NULL AND withdrawn_at IS NULL;

-- ============================================================
-- CONSENT LOGS TABLE (Audit Trail)
-- ============================================================

CREATE TABLE consent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  action consent_log_action NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_logs_consent_id ON consent_logs(consent_id);
CREATE INDEX idx_consent_logs_account_id ON consent_logs(account_id);
CREATE INDEX idx_consent_logs_action ON consent_logs(action);
CREATE INDEX idx_consent_logs_created_at ON consent_logs(created_at);

-- ============================================================
-- LAW REGISTRY TABLE
-- ============================================================

CREATE TABLE law_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  code VARCHAR(20) NOT NULL UNIQUE,
  jurisdiction VARCHAR(20) NOT NULL,
  country_code VARCHAR(2),
  effective_from TIMESTAMPTZ NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requirements JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_law_registry_country_code ON law_registry(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX idx_law_registry_code ON law_registry(code);
CREATE INDEX idx_law_registry_active ON law_registry(is_active, country_code) WHERE is_active = true;

-- ============================================================
-- DSR REQUESTS TABLE (Data Subject Requests - GDPR)
-- ============================================================

CREATE TABLE dsr_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  account_id UUID NOT NULL,
  request_type dsr_request_type NOT NULL,
  status dsr_status NOT NULL DEFAULT 'PENDING',
  priority dsr_priority NOT NULL DEFAULT 'NORMAL',

  -- Request Details
  description TEXT,
  scope JSONB,
  legal_basis VARCHAR(50),

  -- Verification
  verified_at TIMESTAMPTZ,
  verification_method VARCHAR(50),

  -- Processing
  assigned_to UUID,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Response
  response_type dsr_response_type,
  response_data JSONB,
  response_note TEXT,

  -- Deadlines (GDPR: 30 days, extendable to 90)
  deadline TIMESTAMPTZ NOT NULL,
  extended_to TIMESTAMPTZ,
  extension_reason TEXT,

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dsr_requests_account_id ON dsr_requests(account_id);
CREATE INDEX idx_dsr_requests_request_type ON dsr_requests(request_type);
CREATE INDEX idx_dsr_requests_status ON dsr_requests(status);
CREATE INDEX idx_dsr_requests_priority ON dsr_requests(priority);
-- Composite indexes for queue management
CREATE INDEX idx_dsr_requests_queue ON dsr_requests(status, priority, deadline) WHERE status IN ('PENDING', 'VERIFIED', 'IN_PROGRESS');
CREATE INDEX idx_dsr_requests_assigned ON dsr_requests(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_dsr_requests_overdue ON dsr_requests(deadline) WHERE status IN ('PENDING', 'VERIFIED', 'IN_PROGRESS');

-- ============================================================
-- DSR REQUEST LOGS TABLE (Audit Trail)
-- ============================================================

CREATE TABLE dsr_request_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by UUID NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dsr_logs_dsr_request_id ON dsr_request_logs(dsr_request_id);
CREATE INDEX idx_dsr_logs_performed_by ON dsr_request_logs(performed_by);
CREATE INDEX idx_dsr_logs_created_at ON dsr_request_logs(created_at);

-- ============================================================
-- OUTBOX EVENTS TABLE (Transactional Outbox Pattern)
-- ============================================================

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,

  -- Processing status
  status outbox_status NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 5,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  retry_after TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at) WHERE status = 'PENDING';
CREATE INDEX idx_outbox_retry ON outbox_events(status, retry_after) WHERE status = 'FAILED' AND retry_after IS NOT NULL;
CREATE INDEX idx_outbox_aggregate ON outbox_events(aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_cleanup ON outbox_events(status, processed_at) WHERE status = 'COMPLETED';

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON legal_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_law_registry_updated_at
  BEFORE UPDATE ON law_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dsr_requests_updated_at
  BEFORE UPDATE ON dsr_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
DROP TRIGGER IF EXISTS update_dsr_requests_updated_at ON dsr_requests;
DROP TRIGGER IF EXISTS update_law_registry_updated_at ON law_registry;
DROP TRIGGER IF EXISTS update_legal_documents_updated_at ON legal_documents;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS dsr_request_logs;
DROP TABLE IF EXISTS dsr_requests;
DROP TABLE IF EXISTS law_registry;
DROP TABLE IF EXISTS consent_logs;
DROP TABLE IF EXISTS consents;
DROP TABLE IF EXISTS legal_documents;

DROP TYPE IF EXISTS outbox_status;
DROP TYPE IF EXISTS dsr_response_type;
DROP TYPE IF EXISTS dsr_priority;
DROP TYPE IF EXISTS dsr_status;
DROP TYPE IF EXISTS dsr_request_type;
DROP TYPE IF EXISTS legal_document_type;
DROP TYPE IF EXISTS consent_log_action;
DROP TYPE IF EXISTS consent_scope;
DROP TYPE IF EXISTS consent_type;

DROP FUNCTION IF EXISTS uuid_generate_v7();
