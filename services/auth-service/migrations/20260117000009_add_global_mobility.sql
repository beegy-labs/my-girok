-- +goose Up
-- =============================================================================
-- Global Mobility: 해외 파견 및 비자/워크퍼밋 관리
-- Supports international assignments, work authorizations
-- =============================================================================

-- 해외 파견 (Global Assignments)
CREATE TABLE global_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

  -- 파견 유형
  assignment_type assignment_type NOT NULL,

  -- 출발지 (Home Location)
  home_country_code TEXT NOT NULL,
  home_legal_entity_id UUID REFERENCES legal_entities(id),
  home_office_id UUID REFERENCES offices(id),

  -- 목적지 (Host Location)
  host_country_code TEXT NOT NULL,
  host_legal_entity_id UUID REFERENCES legal_entities(id),
  host_office_id UUID REFERENCES offices(id),

  -- 기간
  start_date DATE NOT NULL,
  expected_end_date DATE NOT NULL,
  actual_end_date DATE,

  -- 상태
  status TEXT DEFAULT 'PLANNED',          -- PLANNED, ACTIVE, EXTENDED, COMPLETED, CANCELLED

  -- 사유
  business_reason TEXT,
  project_name TEXT,

  -- 급여 및 수당
  home_salary DECIMAL(15,2),
  home_currency TEXT,
  host_allowance DECIMAL(15,2),
  host_currency TEXT,
  cost_of_living_adjustment DECIMAL(5,2),
  hardship_allowance DECIMAL(15,2),

  -- 세금
  tax_equalization BOOLEAN DEFAULT FALSE,
  tax_provider TEXT,

  -- 지원
  relocation_support BOOLEAN DEFAULT FALSE,
  housing_provided BOOLEAN DEFAULT FALSE,
  schooling_support BOOLEAN DEFAULT FALSE,
  spouse_work_support BOOLEAN DEFAULT FALSE,

  -- 승인
  approved_by TEXT REFERENCES admins(id),
  approved_at TIMESTAMPTZ(6),

  -- 메타
  notes TEXT,
  documents JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 비자/워크퍼밋 (Work Authorizations)
CREATE TABLE work_authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  global_assignment_id UUID REFERENCES global_assignments(id),

  -- 국가
  country_code TEXT NOT NULL,

  -- 유형
  authorization_type work_permit_type NOT NULL,
  visa_type TEXT,                         -- H1B, L1, E2, etc.

  -- 상태
  status visa_status DEFAULT 'PENDING',

  -- 기간
  application_date DATE,
  approval_date DATE,
  start_date DATE,
  expiry_date DATE,

  -- 문서
  document_number TEXT,
  document_url TEXT,

  -- 스폰서
  sponsor_type TEXT,                      -- COMPANY, SELF, FAMILY
  sponsoring_entity_id UUID REFERENCES legal_entities(id),

  -- 제한
  employer_restricted BOOLEAN DEFAULT TRUE,
  location_restricted BOOLEAN DEFAULT FALSE,
  allowed_activities TEXT[],

  -- 갱신
  renewable BOOLEAN DEFAULT TRUE,
  max_renewals INT,
  renewal_lead_days INT DEFAULT 90,

  -- 알림
  expiry_reminder_sent BOOLEAN DEFAULT FALSE,

  -- 메타
  notes TEXT,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_global_assignments_admin ON global_assignments(admin_id);
CREATE INDEX idx_global_assignments_status ON global_assignments(status);
CREATE INDEX idx_global_assignments_host_country ON global_assignments(host_country_code);
CREATE INDEX idx_global_assignments_dates ON global_assignments(start_date, expected_end_date);

CREATE INDEX idx_work_authorizations_admin ON work_authorizations(admin_id);
CREATE INDEX idx_work_authorizations_assignment ON work_authorizations(global_assignment_id);
CREATE INDEX idx_work_authorizations_expiry ON work_authorizations(expiry_date) WHERE status = 'ACTIVE';
CREATE INDEX idx_work_authorizations_status ON work_authorizations(status);
CREATE INDEX idx_work_authorizations_country ON work_authorizations(country_code);

-- +goose Down
DROP INDEX IF EXISTS idx_work_authorizations_country;
DROP INDEX IF EXISTS idx_work_authorizations_status;
DROP INDEX IF EXISTS idx_work_authorizations_expiry;
DROP INDEX IF EXISTS idx_work_authorizations_assignment;
DROP INDEX IF EXISTS idx_work_authorizations_admin;
DROP INDEX IF EXISTS idx_global_assignments_dates;
DROP INDEX IF EXISTS idx_global_assignments_host_country;
DROP INDEX IF EXISTS idx_global_assignments_status;
DROP INDEX IF EXISTS idx_global_assignments_admin;
DROP TABLE IF EXISTS work_authorizations;
DROP TABLE IF EXISTS global_assignments;
