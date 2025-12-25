-- +goose Up
-- Personal Info Storage Schema
-- Issue: #351

-- Create enums
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE accessor_type AS ENUM ('USER', 'ADMIN', 'OPERATOR', 'SYSTEM');
CREATE TYPE access_action AS ENUM ('READ', 'UPDATE', 'DELETE');

-- Create personal_info table
CREATE TABLE personal_info (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100),
  birth_date DATE,
  gender gender,
  phone_country_code VARCHAR(5),
  phone_number VARCHAR(20),
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  address VARCHAR(500),
  postal_code VARCHAR(20),
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_personal_info_user_id ON personal_info(user_id);

-- Create personal_info_access_logs table
CREATE TABLE personal_info_access_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  personal_info_id TEXT NOT NULL REFERENCES personal_info(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id),
  accessor_type accessor_type NOT NULL,
  accessor_id TEXT NOT NULL,
  action access_action NOT NULL,
  fields TEXT[] NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_personal_info_access_logs_personal_info_id ON personal_info_access_logs(personal_info_id);
CREATE INDEX idx_personal_info_access_logs_service_id ON personal_info_access_logs(service_id);
CREATE INDEX idx_personal_info_access_logs_accessor ON personal_info_access_logs(accessor_type, accessor_id);
CREATE INDEX idx_personal_info_access_logs_accessed_at ON personal_info_access_logs(accessed_at);

-- +goose Down
DROP TABLE IF EXISTS personal_info_access_logs;
DROP TABLE IF EXISTS personal_info;
DROP TYPE IF EXISTS access_action;
DROP TYPE IF EXISTS accessor_type;
DROP TYPE IF EXISTS gender;
