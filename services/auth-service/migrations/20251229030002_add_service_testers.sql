-- +goose Up
-- Phase 1.3: ServiceTesterUser + ServiceTesterAdmin tables (#401)

-- Create service_tester_users table (user testers with bypass options)
CREATE TABLE service_tester_users (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Bypass Settings
    bypass_all BOOLEAN NOT NULL DEFAULT false,
    bypass_domain BOOLEAN NOT NULL DEFAULT true,
    bypass_ip BOOLEAN NOT NULL DEFAULT true,
    bypass_rate BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    note TEXT,
    expires_at TIMESTAMPTZ(6),

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    UNIQUE(service_id, user_id)
);

CREATE INDEX idx_stu_service ON service_tester_users(service_id);
CREATE INDEX idx_stu_user ON service_tester_users(user_id);
CREATE INDEX idx_stu_expires ON service_tester_users(expires_at) WHERE expires_at IS NOT NULL;

-- Create service_tester_admins table (admin testers with bypass options)
CREATE TABLE service_tester_admins (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

    -- Bypass Settings
    bypass_all BOOLEAN NOT NULL DEFAULT false,
    bypass_domain BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    note TEXT,
    expires_at TIMESTAMPTZ(6),

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,

    UNIQUE(service_id, admin_id)
);

CREATE INDEX idx_sta_service ON service_tester_admins(service_id);
CREATE INDEX idx_sta_admin ON service_tester_admins(admin_id);
CREATE INDEX idx_sta_expires ON service_tester_admins(expires_at) WHERE expires_at IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS service_tester_admins;
DROP TABLE IF EXISTS service_tester_users;
