-- +goose Up
-- Auth DB: Initial schema for roles, permissions, sanctions, operators

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE role_scope AS ENUM (
  'PLATFORM',
  'SERVICE',
  'OPERATOR'
);

CREATE TYPE permission_scope AS ENUM (
  'PLATFORM',
  'SERVICE'
);

CREATE TYPE invitation_type AS ENUM (
  'EMAIL',
  'DIRECT'
);

CREATE TYPE invitation_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TYPE sanction_subject_type AS ENUM (
  'ACCOUNT',
  'OPERATOR'
);

CREATE TYPE sanction_scope AS ENUM (
  'PLATFORM',
  'SERVICE'
);

CREATE TYPE sanction_type AS ENUM (
  'WARNING',
  'TEMPORARY_BAN',
  'PERMANENT_BAN',
  'FEATURE_RESTRICTION'
);

CREATE TYPE sanction_status AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'REVOKED'
);

CREATE TYPE sanction_severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE issuer_type AS ENUM (
  'ADMIN',
  'OPERATOR',
  'SYSTEM'
);

CREATE TYPE appeal_status AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ESCALATED'
);

CREATE TYPE notification_channel AS ENUM (
  'EMAIL',
  'PUSH',
  'SMS',
  'IN_APP'
);

CREATE TYPE notification_status AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED'
);

CREATE TYPE outbox_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- ============================================================
-- ROLES TABLE
-- ============================================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  scope role_scope NOT NULL,
  level INT NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Scope-specific
  service_id UUID,
  country_code VARCHAR(2),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (name, scope, service_id, country_code)
);

CREATE INDEX idx_roles_parent_id ON roles(parent_id);
CREATE INDEX idx_roles_scope ON roles(scope);
CREATE INDEX idx_roles_service_id ON roles(service_id);
CREATE INDEX idx_roles_country_code ON roles(country_code);
CREATE INDEX idx_roles_is_active ON roles(is_active);

-- ============================================================
-- PERMISSIONS TABLE
-- ============================================================

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  scope permission_scope NOT NULL,

  -- Scope-specific
  service_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (resource, action, service_id)
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_scope_category ON permissions(scope, category);
CREATE INDEX idx_permissions_service_id ON permissions(service_id);

-- ============================================================
-- ROLE PERMISSIONS TABLE (Junction)
-- ============================================================

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  conditions JSONB,

  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================================
-- OPERATOR INVITATIONS TABLE
-- ============================================================

CREATE TABLE operator_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  service_id UUID NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  role_id UUID NOT NULL,
  permissions JSONB,
  invited_by UUID NOT NULL,
  type invitation_type NOT NULL,
  status invitation_status NOT NULL DEFAULT 'PENDING',
  token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operator_invitations_email ON operator_invitations(email);
CREATE INDEX idx_operator_invitations_service_id ON operator_invitations(service_id);
CREATE INDEX idx_operator_invitations_token ON operator_invitations(token);
CREATE INDEX idx_operator_invitations_status ON operator_invitations(status);

-- ============================================================
-- OPERATORS TABLE
-- ============================================================

CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  service_id UUID NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Invitation
  invitation_id UUID REFERENCES operator_invitations(id),
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,

  -- Activity
  last_login_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  UNIQUE (account_id, service_id),
  UNIQUE (email, service_id)
);

CREATE INDEX idx_operators_account_id ON operators(account_id);
CREATE INDEX idx_operators_service_id ON operators(service_id);
CREATE INDEX idx_operators_country_code ON operators(country_code);
CREATE INDEX idx_operators_role_id ON operators(role_id);
CREATE INDEX idx_operators_is_active ON operators(is_active);

-- ============================================================
-- OPERATOR PERMISSIONS TABLE (Direct Assignment)
-- ============================================================

CREATE TABLE operator_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (operator_id, permission_id)
);

CREATE INDEX idx_operator_permissions_operator_id ON operator_permissions(operator_id);
CREATE INDEX idx_operator_permissions_permission_id ON operator_permissions(permission_id);

-- ============================================================
-- SANCTIONS TABLE
-- ============================================================

CREATE TABLE sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,
  subject_type sanction_subject_type NOT NULL,

  -- Scope
  service_id UUID,
  scope sanction_scope NOT NULL DEFAULT 'SERVICE',

  -- Type & Status
  type sanction_type NOT NULL,
  status sanction_status NOT NULL DEFAULT 'ACTIVE',
  severity sanction_severity NOT NULL DEFAULT 'MEDIUM',

  -- Feature Restrictions
  restricted_features TEXT[] DEFAULT '{}',

  -- Details
  reason TEXT NOT NULL,
  internal_note TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  related_sanction_id UUID REFERENCES sanctions(id),

  -- Issuer
  issued_by UUID NOT NULL,
  issued_by_type issuer_type NOT NULL DEFAULT 'ADMIN',

  -- Timing
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,

  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revoke_reason TEXT,

  -- Appeal
  appeal_status appeal_status,
  appealed_at TIMESTAMPTZ,
  appeal_reason TEXT,
  appeal_reviewed_by UUID,
  appeal_reviewed_at TIMESTAMPTZ,
  appeal_response TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sanctions_subject ON sanctions(subject_id, subject_type);
CREATE INDEX idx_sanctions_service_id ON sanctions(service_id);
CREATE INDEX idx_sanctions_status ON sanctions(status);
CREATE INDEX idx_sanctions_type ON sanctions(type);
CREATE INDEX idx_sanctions_severity ON sanctions(severity);
CREATE INDEX idx_sanctions_scope ON sanctions(scope);
CREATE INDEX idx_sanctions_appeal_status ON sanctions(appeal_status);
CREATE INDEX idx_sanctions_related ON sanctions(related_sanction_id);

-- ============================================================
-- SANCTION NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE sanction_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sanction_id UUID NOT NULL REFERENCES sanctions(id) ON DELETE CASCADE,

  channel notification_channel NOT NULL,
  status notification_status NOT NULL DEFAULT 'PENDING',

  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sanction_notifications_sanction_id ON sanction_notifications(sanction_id);
CREATE INDEX idx_sanction_notifications_status ON sanction_notifications(status);

-- ============================================================
-- OUTBOX EVENTS TABLE (Transactional Outbox Pattern)
-- ============================================================

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,

  -- Processing status
  status outbox_status NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_events_status ON outbox_events(status, created_at);
CREATE INDEX idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);

-- ============================================================
-- GOOSE DB VERSION (for migration tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS goose_db_version (
  id SERIAL PRIMARY KEY,
  version_id BIGINT NOT NULL,
  is_applied BOOLEAN NOT NULL,
  tstamp TIMESTAMP NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS sanction_notifications;
DROP TABLE IF EXISTS sanctions;
DROP TABLE IF EXISTS operator_permissions;
DROP TABLE IF EXISTS operators;
DROP TABLE IF EXISTS operator_invitations;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;

DROP TYPE IF EXISTS outbox_status;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS notification_channel;
DROP TYPE IF EXISTS appeal_status;
DROP TYPE IF EXISTS issuer_type;
DROP TYPE IF EXISTS sanction_severity;
DROP TYPE IF EXISTS sanction_status;
DROP TYPE IF EXISTS sanction_type;
DROP TYPE IF EXISTS sanction_scope;
DROP TYPE IF EXISTS sanction_subject_type;
DROP TYPE IF EXISTS invitation_status;
DROP TYPE IF EXISTS invitation_type;
DROP TYPE IF EXISTS permission_scope;
DROP TYPE IF EXISTS role_scope;
