-- +goose Up
-- =============================================================================
-- Country Configurations: 국가별 설정
-- Stores country-specific configurations for compliance, labor laws, etc.
-- =============================================================================

CREATE TABLE country_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  country_code TEXT UNIQUE NOT NULL,      -- ISO 3166-1 alpha-2
  country_name TEXT NOT NULL,
  country_name_native TEXT,

  -- 지역
  region TEXT,                            -- APAC, EMEA, AMERICAS
  subregion TEXT,

  -- 통화
  currency_code TEXT NOT NULL,
  currency_symbol TEXT,

  -- 시간대
  default_timezone TEXT NOT NULL,
  timezones TEXT[],

  -- 근무
  standard_work_hours_per_week DECIMAL(4,2) DEFAULT 40,
  standard_work_days TEXT[] DEFAULT '{"MON","TUE","WED","THU","FRI"}',
  overtime_allowed BOOLEAN DEFAULT TRUE,
  max_overtime_hours_per_week DECIMAL(4,2),

  -- 휴가
  min_annual_leave_days INT DEFAULT 10,
  statutory_sick_days INT,
  maternity_leave_weeks INT,
  paternity_leave_weeks INT,

  -- 세금
  tax_year_start_month INT DEFAULT 1,
  tax_id_format TEXT,                     -- Regex for validation

  -- 규정
  data_privacy_law TEXT,                  -- GDPR, CCPA, PIPL, etc.
  employment_law_notes TEXT,

  -- 메타
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 기본 국가 데이터
INSERT INTO country_configs (country_code, country_name, currency_code, default_timezone, region, min_annual_leave_days, data_privacy_law) VALUES
  ('KR', 'South Korea', 'KRW', 'Asia/Seoul', 'APAC', 15, 'PIPA'),
  ('US', 'United States', 'USD', 'America/New_York', 'AMERICAS', 10, 'CCPA'),
  ('GB', 'United Kingdom', 'GBP', 'Europe/London', 'EMEA', 28, 'UK GDPR'),
  ('DE', 'Germany', 'EUR', 'Europe/Berlin', 'EMEA', 20, 'GDPR'),
  ('JP', 'Japan', 'JPY', 'Asia/Tokyo', 'APAC', 10, 'APPI'),
  ('SG', 'Singapore', 'SGD', 'Asia/Singapore', 'APAC', 7, 'PDPA'),
  ('AU', 'Australia', 'AUD', 'Australia/Sydney', 'APAC', 20, 'Privacy Act'),
  ('CA', 'Canada', 'CAD', 'America/Toronto', 'AMERICAS', 10, 'PIPEDA'),
  ('FR', 'France', 'EUR', 'Europe/Paris', 'EMEA', 25, 'GDPR'),
  ('IN', 'India', 'INR', 'Asia/Kolkata', 'APAC', 15, 'DPDP'),
  ('CN', 'China', 'CNY', 'Asia/Shanghai', 'APAC', 5, 'PIPL'),
  ('BR', 'Brazil', 'BRL', 'America/Sao_Paulo', 'AMERICAS', 30, 'LGPD');

-- Indexes
CREATE INDEX idx_country_configs_code ON country_configs(country_code);
CREATE INDEX idx_country_configs_region ON country_configs(region);
CREATE INDEX idx_country_configs_active ON country_configs(is_active) WHERE is_active = TRUE;

-- +goose Down
DROP INDEX IF EXISTS idx_country_configs_active;
DROP INDEX IF EXISTS idx_country_configs_region;
DROP INDEX IF EXISTS idx_country_configs_code;
DROP TABLE IF EXISTS country_configs;
