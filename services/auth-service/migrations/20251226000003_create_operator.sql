-- +goose Up
-- Operator Schema
-- Issue: #352

-- Create enums
CREATE TYPE invitation_type AS ENUM ('EMAIL', 'DIRECT');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- Create operator_invitations table
CREATE TABLE operator_invitations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  admin_id TEXT NOT NULL REFERENCES admins(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  country_code VARCHAR(2) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type invitation_type NOT NULL,
  status invitation_status DEFAULT 'PENDING',
  token TEXT UNIQUE,
  temp_password TEXT,
  permissions JSONB NOT NULL,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  accepted_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_operator_invitations_admin_id ON operator_invitations(admin_id);
CREATE INDEX idx_operator_invitations_service_id ON operator_invitations(service_id);
CREATE INDEX idx_operator_invitations_email ON operator_invitations(email);
CREATE INDEX idx_operator_invitations_token ON operator_invitations(token);
CREATE INDEX idx_operator_invitations_status ON operator_invitations(status);

-- Create operators table
CREATE TABLE operators (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  invitation_id TEXT REFERENCES operator_invitations(id),
  last_login_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
  UNIQUE(email, service_id)
);
CREATE INDEX idx_operators_admin_id ON operators(admin_id);
CREATE INDEX idx_operators_service_id ON operators(service_id);
CREATE INDEX idx_operators_country_code ON operators(country_code);
CREATE INDEX idx_operators_is_active ON operators(is_active);

-- Create operator_permissions table
CREATE TABLE operator_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL REFERENCES admins(id),
  granted_at TIMESTAMPTZ(6) DEFAULT NOW(),
  UNIQUE(operator_id, permission_id)
);
CREATE INDEX idx_operator_permissions_operator_id ON operator_permissions(operator_id);
CREATE INDEX idx_operator_permissions_permission_id ON operator_permissions(permission_id);

-- Create operator_sessions table
CREATE TABLE operator_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_operator_sessions_operator_id ON operator_sessions(operator_id);
CREATE INDEX idx_operator_sessions_refresh_token ON operator_sessions(refresh_token);

-- +goose Down
DROP TABLE IF EXISTS operator_sessions;
DROP TABLE IF EXISTS operator_permissions;
DROP TABLE IF EXISTS operators;
DROP TABLE IF EXISTS operator_invitations;
DROP TYPE IF EXISTS invitation_status;
DROP TYPE IF EXISTS invitation_type;
