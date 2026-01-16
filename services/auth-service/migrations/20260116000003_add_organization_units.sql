-- +goose Up

CREATE TABLE organization_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  parent_id UUID REFERENCES organization_units(id),
  legal_entity_id UUID,

  -- Code & Name
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  short_name TEXT,

  -- Classification
  unit_type org_unit_type NOT NULL,
  level INT NOT NULL,
  path TEXT NOT NULL,

  -- Leadership
  head_admin_id UUID,
  deputy_head_id UUID,

  -- Cost Management
  cost_center TEXT,
  profit_center TEXT,
  budget_code TEXT,

  -- Function
  function_code TEXT,
  is_support_function BOOLEAN DEFAULT FALSE,

  -- Validity
  effective_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_virtual BOOLEAN DEFAULT FALSE,

  -- Meta
  description TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Organization change history
CREATE TABLE organization_unit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  org_unit_id UUID NOT NULL REFERENCES organization_units(id) ON DELETE CASCADE,

  -- Change type
  change_type TEXT NOT NULL,

  -- Before/After
  previous_data JSONB,
  new_data JSONB,

  -- Reason
  reason TEXT,
  effective_date DATE NOT NULL,

  -- Approval
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ(6),

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_units_parent ON organization_units(parent_id);
CREATE INDEX idx_org_units_path ON organization_units(path);
CREATE INDEX idx_org_units_legal_entity ON organization_units(legal_entity_id);
CREATE INDEX idx_org_units_type ON organization_units(unit_type);
CREATE INDEX idx_org_units_active ON organization_units(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_org_unit_history ON organization_unit_history(org_unit_id);
CREATE INDEX idx_org_unit_history_date ON organization_unit_history(effective_date);

-- +goose Down
DROP TABLE IF EXISTS organization_unit_history;
DROP TABLE IF EXISTS organization_units;
