-- +goose Up
-- Phase 1.2: ServiceFeature + ServiceFeaturePermission tables (#400)

-- Create enums
CREATE TYPE permission_target_type AS ENUM ('ALL_USERS', 'USER', 'TIER', 'COUNTRY', 'ROLE');
CREATE TYPE feature_action AS ENUM ('USE', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'ADMIN');

-- Create service_features table (hierarchical feature definitions)
CREATE TABLE service_features (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,

    -- Hierarchy
    parent_id UUID REFERENCES service_features(id) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL,
    depth INTEGER NOT NULL DEFAULT 1,

    -- Settings
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    icon VARCHAR(50),
    color VARCHAR(20),

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    UNIQUE(service_id, code)
);

CREATE INDEX idx_service_features_service_category ON service_features(service_id, category);
CREATE INDEX idx_service_features_parent ON service_features(parent_id);
CREATE INDEX idx_service_features_path ON service_features(path);
CREATE INDEX idx_service_features_active ON service_features(is_active);

-- Create service_feature_permissions table (granular access control)
CREATE TABLE service_feature_permissions (
    id UUID PRIMARY KEY,
    feature_id UUID NOT NULL REFERENCES service_features(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

    -- Target
    target_type permission_target_type NOT NULL,
    target_id UUID,

    -- Permission
    action feature_action NOT NULL,
    is_allowed BOOLEAN NOT NULL DEFAULT true,

    -- Conditions (JSON for flexible filtering)
    conditions JSONB,

    -- Validity period
    valid_from TIMESTAMPTZ(6),
    valid_until TIMESTAMPTZ(6),

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL
);

CREATE INDEX idx_sfp_feature ON service_feature_permissions(feature_id);
CREATE INDEX idx_sfp_service_target ON service_feature_permissions(service_id, target_type, target_id);
CREATE INDEX idx_sfp_valid ON service_feature_permissions(valid_from, valid_until);

-- +goose Down
DROP TABLE IF EXISTS service_feature_permissions;
DROP TABLE IF EXISTS service_features;
DROP TYPE IF EXISTS feature_action;
DROP TYPE IF EXISTS permission_target_type;
