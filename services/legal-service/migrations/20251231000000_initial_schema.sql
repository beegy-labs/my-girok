-- +goose Up
-- +goose StatementBegin

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE consent_status AS ENUM ('GRANTED', 'WITHDRAWN', 'EXPIRED');
CREATE TYPE dsr_request_type AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'PORTABILITY', 'OBJECTION');
CREATE TYPE dsr_request_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE legal_document_type AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'COOKIE_POLICY', 'DATA_PROCESSING_AGREEMENT', 'CONSENT_FORM');
CREATE TYPE legal_document_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE outbox_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Law Registries
CREATE TABLE law_registries (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    country_code VARCHAR(2) NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_law_registries_country_code ON law_registries(country_code);
CREATE INDEX idx_law_registries_is_active ON law_registries(is_active);

-- Legal Documents
CREATE TABLE legal_documents (
    id UUID PRIMARY KEY,
    type legal_document_type NOT NULL,
    version VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    law_registry_id UUID REFERENCES law_registries(id),
    status legal_document_status NOT NULL DEFAULT 'DRAFT',
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(type, version, country_code, locale)
);

CREATE INDEX idx_legal_documents_type_status ON legal_documents(type, status);
CREATE INDEX idx_legal_documents_country_code ON legal_documents(country_code);

-- Consents
CREATE TABLE consents (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    document_id UUID NOT NULL REFERENCES legal_documents(id),
    law_registry_id UUID REFERENCES law_registries(id),
    status consent_status NOT NULL DEFAULT 'GRANTED',
    consented_at TIMESTAMPTZ NOT NULL,
    withdrawn_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    consent_method VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consents_account_id ON consents(account_id);
CREATE INDEX idx_consents_document_id ON consents(document_id);
CREATE INDEX idx_consents_status ON consents(status);
CREATE INDEX idx_consents_account_status ON consents(account_id, status);

-- DSR Requests
CREATE TABLE dsr_requests (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    request_type dsr_request_type NOT NULL,
    status dsr_request_status NOT NULL DEFAULT 'PENDING',
    description TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ NOT NULL,
    assigned_to UUID,
    resolution TEXT,
    rejection_reason TEXT,
    ip_address VARCHAR(45),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dsr_requests_account_id ON dsr_requests(account_id);
CREATE INDEX idx_dsr_requests_status ON dsr_requests(status);
CREATE INDEX idx_dsr_requests_request_type ON dsr_requests(request_type);
CREATE INDEX idx_dsr_requests_due_date ON dsr_requests(due_date);

-- Outbox Events
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status outbox_status NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_events_status_created ON outbox_events(status, created_at);
CREATE INDEX idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_law_registries_updated_at
    BEFORE UPDATE ON law_registries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_consents_updated_at
    BEFORE UPDATE ON consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_dsr_requests_updated_at
    BEFORE UPDATE ON dsr_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TRIGGER IF EXISTS trigger_dsr_requests_updated_at ON dsr_requests;
DROP TRIGGER IF EXISTS trigger_consents_updated_at ON consents;
DROP TRIGGER IF EXISTS trigger_legal_documents_updated_at ON legal_documents;
DROP TRIGGER IF EXISTS trigger_law_registries_updated_at ON law_registries;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS dsr_requests;
DROP TABLE IF EXISTS consents;
DROP TABLE IF EXISTS legal_documents;
DROP TABLE IF EXISTS law_registries;

DROP TYPE IF EXISTS outbox_status;
DROP TYPE IF EXISTS legal_document_status;
DROP TYPE IF EXISTS legal_document_type;
DROP TYPE IF EXISTS dsr_request_status;
DROP TYPE IF EXISTS dsr_request_type;
DROP TYPE IF EXISTS consent_status;

-- +goose StatementEnd
