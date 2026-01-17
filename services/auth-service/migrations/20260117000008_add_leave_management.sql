-- +goose Up

-- Leave request records
CREATE TABLE admin_leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id UUID NOT NULL,

  -- Leave type
  leave_type leave_type NOT NULL,

  -- Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_half TEXT,                        -- AM, PM (for half-day leaves)
  end_half TEXT,
  days_count DECIMAL(4,2) NOT NULL,       -- 0.5 = half-day

  -- Status
  status leave_status DEFAULT 'PENDING',

  -- Approval workflow
  requested_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ(6),

  -- First approval (Team Lead)
  first_approver_id TEXT,
  first_approved_at TIMESTAMPTZ(6),
  first_approval_status TEXT,

  -- Second approval (if required)
  second_approver_id TEXT,
  second_approved_at TIMESTAMPTZ(6),
  second_approval_status TEXT,

  -- Final approval
  final_approved_by TEXT,
  final_approved_at TIMESTAMPTZ(6),

  -- Rejection
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ(6),
  rejection_reason TEXT,

  -- Cancellation
  cancelled_at TIMESTAMPTZ(6),
  cancellation_reason TEXT,

  -- Details
  reason TEXT,
  emergency_contact TEXT,
  handover_to TEXT,
  handover_notes TEXT,
  attachment_urls TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Leave balance tracking
CREATE TABLE admin_leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id UUID NOT NULL,
  year INT NOT NULL,

  -- Annual Leave
  annual_entitled DECIMAL(5,2) DEFAULT 15,    -- Entitled days
  annual_used DECIMAL(5,2) DEFAULT 0,         -- Used days
  annual_pending DECIMAL(5,2) DEFAULT 0,      -- Pending approval
  annual_remaining DECIMAL(5,2) DEFAULT 15,   -- Remaining days

  -- Sick Leave
  sick_entitled DECIMAL(5,2) DEFAULT 10,
  sick_used DECIMAL(5,2) DEFAULT 0,
  sick_remaining DECIMAL(5,2) DEFAULT 10,

  -- Compensatory Leave
  compensatory_entitled DECIMAL(5,2) DEFAULT 0,
  compensatory_used DECIMAL(5,2) DEFAULT 0,
  compensatory_remaining DECIMAL(5,2) DEFAULT 0,
  compensatory_expiry_date DATE,

  -- Special Leave
  special_entitled DECIMAL(5,2) DEFAULT 0,
  special_used DECIMAL(5,2) DEFAULT 0,
  special_remaining DECIMAL(5,2) DEFAULT 0,

  -- Carryover
  carryover_from_previous DECIMAL(5,2) DEFAULT 0,
  carryover_expiry_date DATE,

  -- Adjustment
  adjustment DECIMAL(5,2) DEFAULT 0,
  adjustment_reason TEXT,
  adjusted_by TEXT,

  -- Metadata
  last_calculated_at TIMESTAMPTZ(6),

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  UNIQUE(admin_id, year)
);

-- Leave policies (by country)
CREATE TABLE leave_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

  -- Scope
  country_code TEXT,                      -- NULL = global default
  legal_entity_id TEXT,

  -- Annual leave policy
  annual_base_days DECIMAL(5,2) DEFAULT 15,
  annual_max_days DECIMAL(5,2) DEFAULT 25,
  annual_accrual_type TEXT DEFAULT 'YEARLY', -- YEARLY, MONTHLY, HOURLY
  annual_carryover_allowed BOOLEAN DEFAULT TRUE,
  annual_carryover_max DECIMAL(5,2) DEFAULT 5,
  annual_carryover_expiry_months INT DEFAULT 3,

  -- Sick leave policy
  sick_days DECIMAL(5,2) DEFAULT 10,
  sick_requires_certificate_after INT DEFAULT 3, -- Medical certificate required after 3 days

  -- Tenure bonus
  tenure_bonus_enabled BOOLEAN DEFAULT TRUE,
  tenure_bonus_years INT[] DEFAULT '{3,5,10}',   -- Bonus trigger years
  tenure_bonus_days DECIMAL(5,2)[] DEFAULT '{1,2,3}', -- Bonus days

  -- Probation period
  probation_leave_allowed BOOLEAN DEFAULT FALSE,
  probation_accrual_rate DECIMAL(3,2) DEFAULT 0.5,

  -- Metadata
  effective_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Public holidays (by country)
CREATE TABLE public_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  country_code TEXT NOT NULL,
  subdivision_code TEXT,                  -- Regional holidays

  date DATE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,

  is_national BOOLEAN DEFAULT TRUE,
  is_floating BOOLEAN DEFAULT FALSE,      -- Substitute holiday flag
  year INT NOT NULL,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  UNIQUE(country_code, date)
);

CREATE INDEX idx_leaves_admin ON admin_leaves(admin_id);
CREATE INDEX idx_leaves_dates ON admin_leaves(start_date, end_date);
CREATE INDEX idx_leaves_status ON admin_leaves(status);
CREATE INDEX idx_leave_balances_admin_year ON admin_leave_balances(admin_id, year);
CREATE INDEX idx_leave_policies_country ON leave_policies(country_code);
CREATE INDEX idx_public_holidays_country_year ON public_holidays(country_code, year);

-- +goose Down
DROP TABLE IF EXISTS public_holidays;
DROP TABLE IF EXISTS leave_policies;
DROP TABLE IF EXISTS admin_leave_balances;
DROP TABLE IF EXISTS admin_leaves;
