-- +goose Up
-- H-RBAC Multi-Tenant Admin System
-- Issue: #324

-- ============================================================
-- ENUMS
-- ============================================================

-- Tenant type (partner company types)
CREATE TYPE tenant_type AS ENUM (
    'INTERNAL'      -- Internal/test tenant (v1)
    -- Future: 'COMMERCE', 'ADBID', 'POSTBACK', 'AGENCY'
);

-- Tenant status
CREATE TYPE tenant_status AS ENUM (
    'PENDING',      -- Awaiting approval
    'ACTIVE',       -- Approved and active
    'SUSPENDED',    -- Temporarily suspended
    'TERMINATED'    -- Permanently closed
);

-- Admin scope
CREATE TYPE admin_scope AS ENUM (
    'SYSTEM',       -- Platform-level admin
    'TENANT'        -- Partner-level admin
);

-- Admin-User link type
CREATE TYPE admin_link_type AS ENUM (
    'OPERATOR',     -- 운영자 표시
    'MODERATOR',    -- 중재자 권한
    'SUPPORT',      -- 고객지원 권한
    'IMPERSONATE'   -- 대리 로그인 (future)
);

-- ============================================================
-- TENANT (Partner Company)
-- ============================================================

CREATE TABLE tenants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    type tenant_type NOT NULL DEFAULT 'INTERNAL',
    slug TEXT NOT NULL UNIQUE,
    status tenant_status NOT NULL DEFAULT 'PENDING',
    settings JSONB,

    approved_at TIMESTAMPTZ(6),
    approved_by TEXT,  -- Admin ID who approved

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_type_status ON tenants(type, status);
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- ============================================================
-- ROLE (SSOT for role definitions)
-- ============================================================

CREATE TABLE roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,

    -- Scope: which admins can have this role
    scope admin_scope NOT NULL,
    tenant_type tenant_type,  -- NULL = all tenant types

    -- Hierarchy
    level INTEGER NOT NULL DEFAULT 0,  -- Higher = more privileged
    parent_id TEXT REFERENCES roles(id) ON DELETE SET NULL,

    -- Is this a system-defined role?
    is_system BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    UNIQUE(name, scope)
);

CREATE INDEX idx_roles_scope_tenant_type ON roles(scope, tenant_type);
CREATE INDEX idx_roles_parent_id ON roles(parent_id);

-- ============================================================
-- PERMISSION (SSOT for permission definitions)
-- ============================================================

CREATE TABLE permissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Resource:Action pattern
    resource TEXT NOT NULL,
    action TEXT NOT NULL,

    -- Scope constraint (NULL = both scopes)
    scope admin_scope,

    -- Metadata
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,

    -- Tenant type constraint for tenant-specific permissions
    tenant_type tenant_type,

    UNIQUE(resource, action)
);

CREATE INDEX idx_permissions_scope_category ON permissions(scope, category);
CREATE INDEX idx_permissions_resource ON permissions(resource);

-- ============================================================
-- ROLE_PERMISSION (M:N junction)
-- ============================================================

CREATE TABLE role_permissions (
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

    -- Optional: conditions for this permission
    conditions JSONB,

    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================================
-- ADMIN (Unified admin table with scope)
-- ============================================================

CREATE TABLE admins (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,

    -- Scope: System or Tenant
    scope admin_scope NOT NULL DEFAULT 'TENANT',
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,

    -- Hierarchy within tenant (NULL = top-level admin)
    parent_id TEXT REFERENCES admins(id) ON DELETE SET NULL,

    -- Role
    role_id TEXT NOT NULL REFERENCES roles(id),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ(6),

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    -- System scope admins should not have tenant_id
    CONSTRAINT chk_admin_scope CHECK (
        (scope = 'SYSTEM' AND tenant_id IS NULL) OR
        (scope = 'TENANT' AND tenant_id IS NOT NULL)
    )
);

CREATE INDEX idx_admins_scope_tenant_id ON admins(scope, tenant_id);
CREATE INDEX idx_admins_parent_id ON admins(parent_id);
CREATE INDEX idx_admins_role_id ON admins(role_id);
CREATE INDEX idx_admins_email ON admins(email);

-- ============================================================
-- ADMIN_USER_LINK (System Admin → Service User mapping)
-- ============================================================

CREATE TABLE admin_user_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    link_type admin_link_type NOT NULL DEFAULT 'OPERATOR',

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    UNIQUE(admin_id, user_id)
);

CREATE INDEX idx_admin_user_links_user_id ON admin_user_links(user_id);
CREATE INDEX idx_admin_user_links_admin_id ON admin_user_links(admin_id);

-- ============================================================
-- ADMIN_SESSION (Admin refresh token management)
-- ============================================================

CREATE TABLE admin_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_refresh_token ON admin_sessions(refresh_token);

-- ============================================================
-- AUDIT_LOG
-- ============================================================

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    admin_id TEXT NOT NULL REFERENCES admins(id),

    action TEXT NOT NULL,      -- "create", "update", "delete", "login", etc.
    resource TEXT NOT NULL,    -- "legal_document", "user", "admin", "tenant", etc.
    resource_id TEXT,          -- ID of affected resource

    before_state JSONB,        -- State before change
    after_state JSONB,         -- State after change

    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_id_created_at ON audit_logs(admin_id, created_at);
CREATE INDEX idx_audit_logs_resource_resource_id ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- UPDATE LEGAL_DOCUMENTS (add admin audit fields)
-- ============================================================

ALTER TABLE legal_documents
ADD COLUMN created_by TEXT REFERENCES admins(id),
ADD COLUMN updated_by TEXT REFERENCES admins(id);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- +goose Down

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_admins_updated_at ON admins;
DROP TRIGGER IF EXISTS trigger_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenants;

-- Remove added columns from legal_documents
ALTER TABLE legal_documents
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS updated_by;

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_user_links;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS tenants;

-- Drop enums
DROP TYPE IF EXISTS admin_link_type;
DROP TYPE IF EXISTS admin_scope;
DROP TYPE IF EXISTS tenant_status;
DROP TYPE IF EXISTS tenant_type;
