-- +goose Up
-- =============================================================================
-- Organization History: 조직 변경 이력 추적
-- Tracks promotions, transfers, role changes, and organizational movements
-- =============================================================================

CREATE TABLE admin_organization_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

  -- 변경 유형
  change_type TEXT NOT NULL,              -- HIRE, PROMOTION, TRANSFER, TITLE_CHANGE, TERMINATION, DEMOTION, LATERAL_MOVE

  -- 변경 전 (Previous State)
  previous_job_grade_id UUID REFERENCES job_grades(id),
  previous_job_title TEXT,
  previous_org_unit_id UUID REFERENCES organization_units(id),
  previous_manager_id UUID REFERENCES admins(id),
  previous_legal_entity_id UUID REFERENCES legal_entities(id),
  previous_office_id UUID REFERENCES offices(id),
  previous_cost_center TEXT,

  -- 변경 후 (New State)
  new_job_grade_id UUID REFERENCES job_grades(id),
  new_job_title TEXT,
  new_org_unit_id UUID REFERENCES organization_units(id),
  new_manager_id UUID REFERENCES admins(id),
  new_legal_entity_id UUID REFERENCES legal_entities(id),
  new_office_id UUID REFERENCES offices(id),
  new_cost_center TEXT,

  -- 컨텍스트
  effective_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,

  -- 승인
  requested_by UUID REFERENCES admins(id),
  approved_by UUID REFERENCES admins(id),
  approved_at TIMESTAMPTZ(6),

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_org_history_admin ON admin_organization_history(admin_id);
CREATE INDEX idx_org_history_effective ON admin_organization_history(effective_date);
CREATE INDEX idx_org_history_type ON admin_organization_history(change_type);
CREATE INDEX idx_org_history_admin_effective ON admin_organization_history(admin_id, effective_date);
CREATE INDEX idx_org_history_manager ON admin_organization_history(new_manager_id) WHERE new_manager_id IS NOT NULL;
CREATE INDEX idx_org_history_org_unit ON admin_organization_history(new_org_unit_id) WHERE new_org_unit_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_org_history_org_unit;
DROP INDEX IF EXISTS idx_org_history_manager;
DROP INDEX IF EXISTS idx_org_history_admin_effective;
DROP INDEX IF EXISTS idx_org_history_type;
DROP INDEX IF EXISTS idx_org_history_effective;
DROP INDEX IF EXISTS idx_org_history_admin;
DROP TABLE IF EXISTS admin_organization_history;
