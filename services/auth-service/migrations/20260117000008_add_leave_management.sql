-- +goose Up

-- 휴가 신청
CREATE TABLE admin_leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL,

  -- 휴가 유형
  leave_type leave_type NOT NULL,

  -- 기간
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_half TEXT,                        -- AM, PM (반차인 경우)
  end_half TEXT,
  days_count DECIMAL(4,2) NOT NULL,       -- 0.5 = 반차

  -- 상태
  status leave_status DEFAULT 'PENDING',

  -- 승인 워크플로우
  requested_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ(6),

  -- 1차 승인 (팀장)
  first_approver_id TEXT,
  first_approved_at TIMESTAMPTZ(6),
  first_approval_status TEXT,

  -- 2차 승인 (필요시)
  second_approver_id TEXT,
  second_approved_at TIMESTAMPTZ(6),
  second_approval_status TEXT,

  -- 최종 승인
  final_approved_by TEXT,
  final_approved_at TIMESTAMPTZ(6),

  -- 반려
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ(6),
  rejection_reason TEXT,

  -- 취소
  cancelled_at TIMESTAMPTZ(6),
  cancellation_reason TEXT,

  -- 상세
  reason TEXT,
  emergency_contact TEXT,
  handover_to TEXT,
  handover_notes TEXT,
  attachment_urls TEXT[],

  -- 메타
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 연차 잔여 현황
CREATE TABLE admin_leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL,
  year INT NOT NULL,

  -- 연차 (Annual Leave)
  annual_entitled DECIMAL(5,2) DEFAULT 15,    -- 부여 연차
  annual_used DECIMAL(5,2) DEFAULT 0,         -- 사용
  annual_pending DECIMAL(5,2) DEFAULT 0,      -- 승인 대기
  annual_remaining DECIMAL(5,2) DEFAULT 15,   -- 잔여

  -- 병가 (Sick Leave)
  sick_entitled DECIMAL(5,2) DEFAULT 10,
  sick_used DECIMAL(5,2) DEFAULT 0,
  sick_remaining DECIMAL(5,2) DEFAULT 10,

  -- 보상휴가 (Compensatory)
  compensatory_entitled DECIMAL(5,2) DEFAULT 0,
  compensatory_used DECIMAL(5,2) DEFAULT 0,
  compensatory_remaining DECIMAL(5,2) DEFAULT 0,
  compensatory_expiry_date DATE,

  -- 특별휴가 (Special)
  special_entitled DECIMAL(5,2) DEFAULT 0,
  special_used DECIMAL(5,2) DEFAULT 0,
  special_remaining DECIMAL(5,2) DEFAULT 0,

  -- 이월
  carryover_from_previous DECIMAL(5,2) DEFAULT 0,
  carryover_expiry_date DATE,

  -- 조정
  adjustment DECIMAL(5,2) DEFAULT 0,
  adjustment_reason TEXT,
  adjusted_by TEXT,

  -- 메타
  last_calculated_at TIMESTAMPTZ(6),

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  UNIQUE(admin_id, year)
);

-- 휴가 정책 (국가별)
CREATE TABLE leave_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

  -- 적용 범위
  country_code TEXT,                      -- NULL = 글로벌 기본값
  legal_entity_id TEXT,

  -- 연차 정책
  annual_base_days DECIMAL(5,2) DEFAULT 15,
  annual_max_days DECIMAL(5,2) DEFAULT 25,
  annual_accrual_type TEXT DEFAULT 'YEARLY', -- YEARLY, MONTHLY, HOURLY
  annual_carryover_allowed BOOLEAN DEFAULT TRUE,
  annual_carryover_max DECIMAL(5,2) DEFAULT 5,
  annual_carryover_expiry_months INT DEFAULT 3,

  -- 병가 정책
  sick_days DECIMAL(5,2) DEFAULT 10,
  sick_requires_certificate_after INT DEFAULT 3, -- 3일 이상 진단서 필요

  -- 근속 가산
  tenure_bonus_enabled BOOLEAN DEFAULT TRUE,
  tenure_bonus_years INT[] DEFAULT '{3,5,10}',   -- 가산 시점
  tenure_bonus_days DECIMAL(5,2)[] DEFAULT '{1,2,3}', -- 가산 일수

  -- 수습 기간
  probation_leave_allowed BOOLEAN DEFAULT FALSE,
  probation_accrual_rate DECIMAL(3,2) DEFAULT 0.5,

  -- 메타
  effective_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 공휴일 (국가별)
CREATE TABLE public_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  country_code TEXT NOT NULL,
  subdivision_code TEXT,                  -- 지역별 공휴일

  date DATE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,

  is_national BOOLEAN DEFAULT TRUE,
  is_floating BOOLEAN DEFAULT FALSE,      -- 대체공휴일 여부
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
