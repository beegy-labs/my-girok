-- +goose Up
-- =============================================================================
-- Admin Delegations: 권한 위임 관리
-- Supports temporary delegation of permissions, approvals, and roles
-- =============================================================================

-- 권한 위임 (Delegations)
CREATE TABLE admin_delegations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  delegator_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  delegate_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

  -- 위임 유형
  delegation_type delegation_type NOT NULL,
  delegation_scope delegation_scope NOT NULL,
  delegation_reason delegation_reason NOT NULL,

  -- 세부 권한
  specific_permissions TEXT[],
  specific_role_ids UUID[],
  resource_ids UUID[],

  -- 기간
  start_date TIMESTAMPTZ(6) NOT NULL,
  end_date TIMESTAMPTZ(6) NOT NULL,

  -- 상태
  status delegation_status DEFAULT 'PENDING',

  -- 승인
  requires_approval BOOLEAN DEFAULT TRUE,
  approved_by TEXT REFERENCES admins(id),
  approved_at TIMESTAMPTZ(6),
  rejection_reason TEXT,

  -- 제한
  max_actions INT,
  allowed_hours TEXT[],                   -- ['09:00-18:00']
  allowed_ips TEXT[],

  -- 알림
  notify_on_use BOOLEAN DEFAULT TRUE,
  notify_on_expiry BOOLEAN DEFAULT TRUE,
  expiry_reminder_days INT[] DEFAULT '{7,1}',

  -- 취소
  revoked_at TIMESTAMPTZ(6),
  revoked_by TEXT REFERENCES admins(id),
  revocation_reason TEXT,

  -- 메타
  notes TEXT,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT delegation_date_check CHECK (end_date > start_date),
  CONSTRAINT delegation_different_users CHECK (delegator_id != delegate_id)
);

-- 위임 사용 로그 (Delegation Logs)
CREATE TABLE admin_delegation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  delegation_id UUID NOT NULL REFERENCES admin_delegations(id) ON DELETE CASCADE,
  delegate_id TEXT NOT NULL REFERENCES admins(id),

  -- 사용 내역
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,

  -- 컨텍스트
  ip_address INET,
  user_agent TEXT,

  -- 결과
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_delegations_delegator ON admin_delegations(delegator_id);
CREATE INDEX idx_delegations_delegate ON admin_delegations(delegate_id);
CREATE INDEX idx_delegations_status ON admin_delegations(status);
CREATE INDEX idx_delegations_dates ON admin_delegations(start_date, end_date);
CREATE INDEX idx_delegations_active ON admin_delegations(status, start_date, end_date)
  WHERE status = 'ACTIVE';

CREATE INDEX idx_delegation_logs_delegation ON admin_delegation_logs(delegation_id);
CREATE INDEX idx_delegation_logs_delegate ON admin_delegation_logs(delegate_id);
CREATE INDEX idx_delegation_logs_created_at ON admin_delegation_logs(created_at);

-- +goose Down
DROP INDEX IF EXISTS idx_delegation_logs_created_at;
DROP INDEX IF EXISTS idx_delegation_logs_delegate;
DROP INDEX IF EXISTS idx_delegation_logs_delegation;
DROP INDEX IF EXISTS idx_delegations_active;
DROP INDEX IF EXISTS idx_delegations_dates;
DROP INDEX IF EXISTS idx_delegations_status;
DROP INDEX IF EXISTS idx_delegations_delegate;
DROP INDEX IF EXISTS idx_delegations_delegator;
DROP TABLE IF EXISTS admin_delegation_logs;
DROP TABLE IF EXISTS admin_delegations;
