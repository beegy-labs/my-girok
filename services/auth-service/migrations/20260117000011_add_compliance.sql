-- +goose Up
-- =============================================================================
-- Compliance & Training: 컴플라이언스 인증, 자격증, 교육 이력
-- Supports attestations, certifications, and training records
-- =============================================================================

-- 컴플라이언스 인증 (Attestations)
CREATE TABLE admin_attestations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  attestation_type attestation_type NOT NULL,

  -- 문서 버전
  document_version TEXT,
  document_url TEXT,
  document_hash TEXT,

  -- 상태
  status attestation_status DEFAULT 'PENDING',
  due_date DATE,
  completed_at TIMESTAMPTZ(6),

  -- 인증 상세
  ip_address INET,
  user_agent TEXT,
  signature_data TEXT,

  -- 면제
  is_waived BOOLEAN DEFAULT FALSE,
  waived_by TEXT REFERENCES admins(id),
  waiver_reason TEXT,
  waiver_expiry DATE,

  -- 주기
  recurrence_months INT DEFAULT 12,
  next_due_date DATE,

  -- 메타
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 자격증 (Certifications)
CREATE TABLE admin_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

  -- 자격증 정보
  name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  credential_id TEXT,
  credential_url TEXT,

  -- 기간
  issue_date DATE NOT NULL,
  expiry_date DATE,

  -- 상태
  status certification_status DEFAULT 'ACTIVE',

  -- 검증
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ(6),
  verified_by TEXT REFERENCES admins(id),
  verification_url TEXT,

  -- 메타
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 교육 이력 (Training Records)
CREATE TABLE admin_training_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

  -- 교육 정보
  training_type training_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT,

  -- 진행 상태
  status training_status DEFAULT 'NOT_STARTED',
  assigned_at TIMESTAMPTZ(6),
  started_at TIMESTAMPTZ(6),
  completed_at TIMESTAMPTZ(6),
  due_date DATE,

  -- 점수
  score DECIMAL(5, 2),
  passing_score DECIMAL(5, 2),

  -- 컴플라이언스
  is_mandatory BOOLEAN DEFAULT FALSE,
  recurrence_months INT,
  next_due_date DATE,

  -- 면제
  is_waived BOOLEAN DEFAULT FALSE,
  waived_by TEXT REFERENCES admins(id),
  waiver_reason TEXT,

  -- 메타
  certificate_url TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attestations_admin ON admin_attestations(admin_id);
CREATE INDEX idx_attestations_type ON admin_attestations(attestation_type);
CREATE INDEX idx_attestations_status ON admin_attestations(status);
CREATE INDEX idx_attestations_due ON admin_attestations(due_date) WHERE status = 'PENDING';
CREATE INDEX idx_attestations_next_due ON admin_attestations(next_due_date) WHERE status = 'COMPLETED';

CREATE INDEX idx_certifications_admin ON admin_certifications(admin_id);
CREATE INDEX idx_certifications_status ON admin_certifications(status);
CREATE INDEX idx_certifications_expiry ON admin_certifications(expiry_date) WHERE status = 'ACTIVE';
CREATE INDEX idx_certifications_organization ON admin_certifications(issuing_organization);

CREATE INDEX idx_training_admin ON admin_training_records(admin_id);
CREATE INDEX idx_training_type ON admin_training_records(training_type);
CREATE INDEX idx_training_status ON admin_training_records(status);
CREATE INDEX idx_training_due ON admin_training_records(due_date) WHERE status NOT IN ('COMPLETED', 'WAIVED');
CREATE INDEX idx_training_mandatory ON admin_training_records(is_mandatory, due_date) WHERE is_mandatory = TRUE;

-- +goose Down
DROP INDEX IF EXISTS idx_training_mandatory;
DROP INDEX IF EXISTS idx_training_due;
DROP INDEX IF EXISTS idx_training_status;
DROP INDEX IF EXISTS idx_training_type;
DROP INDEX IF EXISTS idx_training_admin;
DROP INDEX IF EXISTS idx_certifications_organization;
DROP INDEX IF EXISTS idx_certifications_expiry;
DROP INDEX IF EXISTS idx_certifications_status;
DROP INDEX IF EXISTS idx_certifications_admin;
DROP INDEX IF EXISTS idx_attestations_next_due;
DROP INDEX IF EXISTS idx_attestations_due;
DROP INDEX IF EXISTS idx_attestations_status;
DROP INDEX IF EXISTS idx_attestations_type;
DROP INDEX IF EXISTS idx_attestations_admin;
DROP TABLE IF EXISTS admin_training_records;
DROP TABLE IF EXISTS admin_certifications;
DROP TABLE IF EXISTS admin_attestations;
