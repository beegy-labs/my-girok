-- +goose Up

-- Attendance tracking records
CREATE TABLE admin_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id UUID NOT NULL,

  -- Date
  date DATE NOT NULL,

  -- Clock times
  scheduled_start TIME,                   -- Scheduled start time
  scheduled_end TIME,                     -- Scheduled end time
  clock_in TIMESTAMPTZ(6),                -- Actual clock-in time
  clock_out TIMESTAMPTZ(6),               -- Actual clock-out time

  -- Work duration (stored in minutes)
  scheduled_minutes INT,                  -- Scheduled work minutes
  actual_minutes INT,                     -- Actual work minutes
  overtime_minutes INT DEFAULT 0,         -- Overtime minutes
  break_minutes INT DEFAULT 60,           -- Break time in minutes

  -- Status
  status attendance_status DEFAULT 'PRESENT',
  late_minutes INT DEFAULT 0,             -- Tardiness in minutes
  early_leave_minutes INT DEFAULT 0,      -- Early leave in minutes

  -- Work type
  work_type work_type DEFAULT 'OFFICE',
  office_id TEXT,
  remote_location TEXT,

  -- Overtime approval
  overtime_requested BOOLEAN DEFAULT FALSE,
  overtime_approved BOOLEAN DEFAULT FALSE,
  overtime_approved_by TEXT,
  overtime_approved_at TIMESTAMPTZ(6),
  overtime_reason TEXT,

  -- Clock-in/out method
  clock_in_method TEXT,                   -- APP, WEB, BADGE, BIOMETRIC, MANUAL
  clock_out_method TEXT,
  clock_in_ip INET,
  clock_out_ip INET,
  clock_in_location JSONB,                -- {lat, lng, address}
  clock_out_location JSONB,

  -- Metadata
  notes TEXT,
  manager_notes TEXT,
  is_holiday BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  UNIQUE(admin_id, date)
);

-- Work schedule (Shift)
CREATE TABLE admin_work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id UUID NOT NULL,

  -- Base schedule
  schedule_type TEXT DEFAULT 'STANDARD',  -- STANDARD, SHIFT, FLEXIBLE
  effective_date DATE NOT NULL,
  end_date DATE,

  -- Daily work hours by weekday
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

  -- Weekly work hours
  weekly_hours DECIMAL(4,2) DEFAULT 40,

  -- Flexible work hours
  core_hours_start TIME,                  -- Core hours start
  core_hours_end TIME,                    -- Core hours end

  -- Metadata
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
