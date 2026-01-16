-- +goose Up

CREATE TABLE job_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

  -- Code & Name
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,

  -- Level & Classification
  level INT NOT NULL,
  job_family job_family,
  track TEXT DEFAULT 'IC',

  -- Pay Band (Global)
  pay_band TEXT,
  min_salary_usd DECIMAL(15,2),
  max_salary_usd DECIMAL(15,2),

  -- Experience
  min_years_experience INT DEFAULT 0,
  typical_years_experience INT,

  -- Management
  is_management BOOLEAN DEFAULT FALSE,
  is_executive BOOLEAN DEFAULT FALSE,
  is_people_manager BOOLEAN DEFAULT FALSE,
  max_direct_reports INT,

  -- Permissions
  approval_limit_usd DECIMAL(15,2),
  can_approve_leave BOOLEAN DEFAULT FALSE,
  can_approve_expense BOOLEAN DEFAULT FALSE,
  can_approve_hiring BOOLEAN DEFAULT FALSE,

  -- Meta
  description TEXT,
  requirements TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Country adjustments (PPP based)
CREATE TABLE job_grade_country_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  job_grade_id UUID NOT NULL REFERENCES job_grades(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,

  -- Country-specific salary range
  currency_code TEXT NOT NULL,
  min_salary DECIMAL(15,2),
  max_salary DECIMAL(15,2),

  -- PPP adjustment factor
  ppp_adjustment_factor DECIMAL(5,3) DEFAULT 1.0,

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  UNIQUE(job_grade_id, country_code)
);

-- Default job grades
INSERT INTO job_grades (code, name, name_en, level, track, is_management, is_executive, is_people_manager) VALUES
  ('IC1', '인턴', 'Intern', 1, 'IC', FALSE, FALSE, FALSE),
  ('IC2', '사원', 'Associate', 2, 'IC', FALSE, FALSE, FALSE),
  ('IC3', '주임', 'Senior Associate', 3, 'IC', FALSE, FALSE, FALSE),
  ('IC4', '대리', 'Specialist', 4, 'IC', FALSE, FALSE, FALSE),
  ('IC5', '과장', 'Senior Specialist', 5, 'IC', FALSE, FALSE, FALSE),
  ('IC6', '차장', 'Principal', 6, 'IC', FALSE, FALSE, FALSE),
  ('IC7', '부장', 'Staff', 7, 'IC', FALSE, FALSE, FALSE),
  ('IC8', '수석', 'Senior Staff', 8, 'IC', FALSE, FALSE, FALSE),
  ('M4', '팀장', 'Team Lead', 4, 'M', TRUE, FALSE, TRUE),
  ('M5', '파트장', 'Manager', 5, 'M', TRUE, FALSE, TRUE),
  ('M6', '실장', 'Senior Manager', 6, 'M', TRUE, FALSE, TRUE),
  ('M7', '본부장', 'Director', 7, 'M', TRUE, FALSE, TRUE),
  ('M8', '상무', 'VP', 8, 'M', TRUE, TRUE, TRUE),
  ('M9', '전무', 'SVP', 9, 'M', TRUE, TRUE, TRUE),
  ('M10', '부사장', 'EVP', 10, 'M', TRUE, TRUE, TRUE),
  ('M11', '사장', 'President', 11, 'M', TRUE, TRUE, TRUE),
  ('M12', 'CEO', 'CEO', 12, 'M', TRUE, TRUE, TRUE);

CREATE INDEX idx_job_grades_level ON job_grades(level);
CREATE INDEX idx_job_grades_family ON job_grades(job_family);
CREATE INDEX idx_job_grades_active ON job_grades(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_job_grade_country_adj ON job_grade_country_adjustments(job_grade_id);

-- +goose Down
DROP TABLE IF EXISTS job_grade_country_adjustments;
DROP TABLE IF EXISTS job_grades;
