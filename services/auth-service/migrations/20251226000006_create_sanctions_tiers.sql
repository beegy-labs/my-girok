-- +goose Up
-- Sanctions/Tiers/Badges Schema
-- Issue: #355

-- Create enums
CREATE TYPE sanction_type AS ENUM ('WARNING', 'TEMPORARY_BAN', 'PERMANENT_BAN', 'FEATURE_RESTRICTION');
CREATE TYPE sanction_status AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE operator_link_type AS ENUM ('ASSIGNED', 'SELF_CLAIMED');

-- Create tiers table
CREATE TABLE tiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  level INT DEFAULT 0,
  benefits JSONB,
  requirements JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
  UNIQUE(service_id, name)
);
CREATE INDEX idx_tiers_service_id ON tiers(service_id);
CREATE INDEX idx_tiers_level ON tiers(level);

-- Add tier_id FK to user_services
ALTER TABLE user_services
  ADD CONSTRAINT user_services_tier_id_fkey
  FOREIGN KEY (tier_id) REFERENCES tiers(id) ON DELETE SET NULL;
CREATE INDEX idx_user_services_tier_id ON user_services(tier_id);

-- Create user_sanctions table
CREATE TABLE user_sanctions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id),
  type sanction_type NOT NULL,
  status sanction_status DEFAULT 'ACTIVE',
  reason TEXT NOT NULL,
  issued_by TEXT NOT NULL,
  issued_by_type VARCHAR(20) NOT NULL,
  start_at TIMESTAMPTZ(6) NOT NULL,
  end_at TIMESTAMPTZ(6),
  revoked_at TIMESTAMPTZ(6),
  revoked_by TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_user_sanctions_user_id ON user_sanctions(user_id);
CREATE INDEX idx_user_sanctions_service_id ON user_sanctions(service_id);
CREATE INDEX idx_user_sanctions_status ON user_sanctions(status);
CREATE INDEX idx_user_sanctions_type ON user_sanctions(type);

-- Create admin_sanctions table
CREATE TABLE admin_sanctions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id),
  type sanction_type NOT NULL,
  status sanction_status DEFAULT 'ACTIVE',
  reason TEXT NOT NULL,
  issued_by TEXT NOT NULL,
  start_at TIMESTAMPTZ(6) NOT NULL,
  end_at TIMESTAMPTZ(6),
  revoked_at TIMESTAMPTZ(6),
  revoked_by TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_admin_sanctions_admin_id ON admin_sanctions(admin_id);
CREATE INDEX idx_admin_sanctions_service_id ON admin_sanctions(service_id);
CREATE INDEX idx_admin_sanctions_status ON admin_sanctions(status);

-- Create operator_sanctions table
CREATE TABLE operator_sanctions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  type sanction_type NOT NULL,
  status sanction_status DEFAULT 'ACTIVE',
  reason TEXT NOT NULL,
  issued_by TEXT NOT NULL,
  start_at TIMESTAMPTZ(6) NOT NULL,
  end_at TIMESTAMPTZ(6),
  revoked_at TIMESTAMPTZ(6),
  revoked_by TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_operator_sanctions_operator_id ON operator_sanctions(operator_id);
CREATE INDEX idx_operator_sanctions_status ON operator_sanctions(status);

-- Create operator_user_links table
CREATE TABLE operator_user_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type operator_link_type NOT NULL,
  assigned_by TEXT,
  note TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
  UNIQUE(operator_id, user_id)
);
CREATE INDEX idx_operator_user_links_operator_id ON operator_user_links(operator_id);
CREATE INDEX idx_operator_user_links_user_id ON operator_user_links(user_id);
CREATE INDEX idx_operator_user_links_is_active ON operator_user_links(is_active);

-- +goose Down
DROP TABLE IF EXISTS operator_user_links;
DROP TABLE IF EXISTS operator_sanctions;
DROP TABLE IF EXISTS admin_sanctions;
DROP TABLE IF EXISTS user_sanctions;
DROP INDEX IF EXISTS idx_user_services_tier_id;
ALTER TABLE user_services DROP CONSTRAINT IF EXISTS user_services_tier_id_fkey;
DROP TABLE IF EXISTS tiers;
DROP TYPE IF EXISTS operator_link_type;
DROP TYPE IF EXISTS sanction_status;
DROP TYPE IF EXISTS sanction_type;
