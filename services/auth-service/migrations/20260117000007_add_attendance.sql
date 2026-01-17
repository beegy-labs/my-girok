-- +goose Up

-- 출퇴근 기록
CREATE TABLE admin_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL,

  -- 날짜
  date DATE NOT NULL,

  -- 출퇴근 시간
  scheduled_start TIME,                   -- 예정 출근
  scheduled_end TIME,                     -- 예정 퇴근
  clock_in TIMESTAMPTZ(6),                -- 실제 출근
  clock_out TIMESTAMPTZ(6),               -- 실제 퇴근

  -- 근무 시간 (분 단위로 저장)
  scheduled_minutes INT,                  -- 예정 근무시간
  actual_minutes INT,                     -- 실제 근무시간
  overtime_minutes INT DEFAULT 0,         -- 초과 근무
  break_minutes INT DEFAULT 60,           -- 휴게시간

  -- 상태
  status attendance_status DEFAULT 'PRESENT',
  late_minutes INT DEFAULT 0,             -- 지각 (분)
  early_leave_minutes INT DEFAULT 0,      -- 조퇴 (분)

  -- 근무 유형
  work_type work_type DEFAULT 'OFFICE',
  office_id TEXT,
  remote_location TEXT,

  -- 초과근무 승인
  overtime_requested BOOLEAN DEFAULT FALSE,
  overtime_approved BOOLEAN DEFAULT FALSE,
  overtime_approved_by TEXT,
  overtime_approved_at TIMESTAMPTZ(6),
  overtime_reason TEXT,

  -- 출퇴근 방법
  clock_in_method TEXT,                   -- APP, WEB, BADGE, BIOMETRIC, MANUAL
  clock_out_method TEXT,
  clock_in_ip INET,
  clock_out_ip INET,
  clock_in_location JSONB,                -- {lat, lng, address}
  clock_out_location JSONB,

  -- 메타
  notes TEXT,
  manager_notes TEXT,
  is_holiday BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  UNIQUE(admin_id, date)
);

-- 근무 스케줄 (Shift)
CREATE TABLE admin_work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL,

  -- 기본 스케줄
  schedule_type TEXT DEFAULT 'STANDARD',  -- STANDARD, SHIFT, FLEXIBLE
  effective_date DATE NOT NULL,
  end_date DATE,

  -- 요일별 근무 시간
  monday_start TIME,
  monday_end TIME,
  tuesday_start TIME,
  tuesday_end TIME,
  wednesday_start TIME,
  wednesday_end TIME,
  thursday_start TIME,
  thursday_end TIME,
  friday_start TIME,
  friday_end TIME,
  saturday_start TIME,
  saturday_end TIME,
  sunday_start TIME,
  sunday_end TIME,

  -- 주간 근무 시간
  weekly_hours DECIMAL(4,2) DEFAULT 40,

  -- Flexible 근무
  core_hours_start TIME,                  -- 필수 근무 시작
  core_hours_end TIME,                    -- 필수 근무 종료

  -- 메타
  timezone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendances_admin ON admin_attendances(admin_id);
CREATE INDEX idx_attendances_date ON admin_attendances(date);
CREATE INDEX idx_attendances_admin_date ON admin_attendances(admin_id, date);
CREATE INDEX idx_attendances_status ON admin_attendances(status);
CREATE INDEX idx_work_schedules_admin ON admin_work_schedules(admin_id);

-- +goose Down
DROP TABLE IF EXISTS admin_work_schedules;
DROP TABLE IF EXISTS admin_attendances;
