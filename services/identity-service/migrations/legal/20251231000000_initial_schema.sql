-- +goose Up
-- Legal DB: Initial schema for consents, consent_logs, laws, dsr_requests

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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_legal_documents_type_locale_active ON legal_documents(type, locale, is_active);
CREATE INDEX idx_legal_documents_service_id ON legal_documents(service_id);
CREATE INDEX idx_legal_documents_country_code ON legal_documents(country_code);
CREATE INDEX idx_legal_documents_effective_date ON legal_documents(effective_date);

-- ============================================================
-- CONSENTS TABLE
-- ============================================================

CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  consent_type consent_type NOT NULL,
  scope consent_scope NOT NULL DEFAULT 'SERVICE',
  service_id UUID,
  country_code VARCHAR(2) NOT NULL,
  document_id UUID REFERENCES legal_documents(id),
  document_version VARCHAR(50),
  agreed BOOLEAN NOT NULL DEFAULT true,
  agreed_at TIMESTAMPTZ NOT NULL,
  withdrawn_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consents_account_id ON consents(account_id);
CREATE INDEX idx_consents_service_id ON consents(service_id);
CREATE INDEX idx_consents_country_code ON consents(country_code);
CREATE INDEX idx_consents_consent_type ON consents(consent_type);
CREATE INDEX idx_consents_scope ON consents(scope);
CREATE INDEX idx_consents_agreed_at ON consents(agreed_at);

-- ============================================================
-- CONSENT LOGS TABLE (Audit Trail)
-- ============================================================

CREATE TABLE consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  action consent_log_action NOT NULL,
  previous_state JSONB,
  new_state JSONB,
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  country_code VARCHAR(2) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requirements JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_law_registry_country_code ON law_registry(country_code);
CREATE INDEX idx_law_registry_code ON law_registry(code);
CREATE INDEX idx_law_registry_is_active ON law_registry(is_active);

-- ============================================================
-- DSR REQUESTS TABLE (Data Subject Requests)
-- ============================================================

CREATE TABLE dsr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

  -- Deadlines
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
CREATE INDEX idx_dsr_requests_deadline ON dsr_requests(deadline);
CREATE INDEX idx_dsr_requests_created_at ON dsr_requests(created_at);

-- ============================================================
-- DSR REQUEST LOGS TABLE (Audit Trail)
-- ============================================================

CREATE TABLE dsr_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by UUID NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dsr_request_logs_dsr_request_id ON dsr_request_logs(dsr_request_id);
CREATE INDEX idx_dsr_request_logs_performed_by ON dsr_request_logs(performed_by);
CREATE INDEX idx_dsr_request_logs_created_at ON dsr_request_logs(created_at);

-- ============================================================
-- OUTBOX EVENTS TABLE (Transactional Outbox Pattern)
-- ============================================================

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,

  -- Processing status
  status outbox_status NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_events_status ON outbox_events(status, created_at);
CREATE INDEX idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);

-- ============================================================
-- GOOSE DB VERSION (for migration tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS goose_db_version (
  id SERIAL PRIMARY KEY,
  version_id BIGINT NOT NULL,
  is_applied BOOLEAN NOT NULL,
  tstamp TIMESTAMP NOT NULL DEFAULT now()
);

-- +goose Down
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
