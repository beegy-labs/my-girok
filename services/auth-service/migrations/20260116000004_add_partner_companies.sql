-- +goose Up

CREATE TABLE partner_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

  -- Company Info
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,

  -- Classification
  partner_type partner_type NOT NULL,
  industry TEXT,

  -- Registration
  registration_number TEXT,
  tax_id TEXT,
  vat_number TEXT,

  -- Location
  country_code TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,

  -- Contact
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  billing_email TEXT,

  -- Contract
  contract_start_date DATE,
  contract_end_date DATE,
  contract_value DECIMAL(15,2),
  contract_currency TEXT DEFAULT 'USD',
  payment_terms INT DEFAULT 30,

  -- Assessment
  risk_level TEXT DEFAULT 'LOW',
  compliance_verified BOOLEAN DEFAULT FALSE,
  last_audit_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_preferred BOOLEAN DEFAULT FALSE,

  -- Meta
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Partner service agreements
CREATE TABLE partner_service_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  partner_company_id UUID NOT NULL REFERENCES partner_companies(id) ON DELETE CASCADE,

  -- Service scope
  service_type TEXT NOT NULL,
  department_scope TEXT[],

  -- Contract details
  start_date DATE NOT NULL,
  end_date DATE,
  max_headcount INT,
  hourly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),

  -- SLA
  sla_document_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_companies_type ON partner_companies(partner_type);
CREATE INDEX idx_partner_companies_country ON partner_companies(country_code);
CREATE INDEX idx_partner_companies_active ON partner_companies(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_partner_service_agreements ON partner_service_agreements(partner_company_id);

-- +goose Down
DROP TABLE IF EXISTS partner_service_agreements;
DROP TABLE IF EXISTS partner_companies;
