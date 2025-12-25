-- +goose Up
-- Admin Schema Extension for global multi-service support
-- Issue: #353

-- 1. admins modification
ALTER TABLE admins
  ADD COLUMN account_mode account_mode DEFAULT 'SERVICE',
  ADD COLUMN country_code VARCHAR(2);
CREATE INDEX idx_admins_account_mode ON admins(account_mode);
CREATE INDEX idx_admins_country_code ON admins(country_code);

-- 2. admin_services creation
CREATE TABLE admin_services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  country_code VARCHAR(2),
  role_id TEXT NOT NULL REFERENCES roles(id),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  UNIQUE(admin_id, service_id, country_code)
);
CREATE INDEX idx_admin_services_admin_id ON admin_services(admin_id);
CREATE INDEX idx_admin_services_service_id ON admin_services(service_id);
CREATE INDEX idx_admin_services_role_id ON admin_services(role_id);

-- 3. roles modification
ALTER TABLE roles
  ADD COLUMN service_id TEXT REFERENCES services(id),
  ADD COLUMN country_code VARCHAR(2);

-- Update unique constraint
ALTER TABLE roles
  DROP CONSTRAINT IF EXISTS roles_name_scope_key;
ALTER TABLE roles
  ADD CONSTRAINT roles_name_scope_service_country_key
  UNIQUE (name, scope, service_id, country_code);

CREATE INDEX idx_roles_service_id ON roles(service_id);
CREATE INDEX idx_roles_country_code ON roles(country_code);

-- 4. permissions modification
ALTER TABLE permissions
  ADD COLUMN service_id TEXT REFERENCES services(id);

-- Update unique constraint
ALTER TABLE permissions
  DROP CONSTRAINT IF EXISTS permissions_resource_action_key;
ALTER TABLE permissions
  ADD CONSTRAINT permissions_resource_action_service_key
  UNIQUE (resource, action, service_id);

CREATE INDEX idx_permissions_service_id ON permissions(service_id);

-- +goose Down
-- permissions rollback
DROP INDEX IF EXISTS idx_permissions_service_id;
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_resource_action_service_key;
ALTER TABLE permissions ADD CONSTRAINT permissions_resource_action_key UNIQUE (resource, action);
ALTER TABLE permissions DROP COLUMN IF EXISTS service_id;

-- roles rollback
DROP INDEX IF EXISTS idx_roles_service_id;
DROP INDEX IF EXISTS idx_roles_country_code;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_scope_service_country_key;
ALTER TABLE roles ADD CONSTRAINT roles_name_scope_key UNIQUE (name, scope);
ALTER TABLE roles DROP COLUMN IF EXISTS service_id, DROP COLUMN IF EXISTS country_code;

-- admin_services rollback
DROP TABLE IF EXISTS admin_services;

-- admins rollback
DROP INDEX IF EXISTS idx_admins_account_mode;
DROP INDEX IF EXISTS idx_admins_country_code;
ALTER TABLE admins DROP COLUMN IF EXISTS account_mode, DROP COLUMN IF EXISTS country_code;
