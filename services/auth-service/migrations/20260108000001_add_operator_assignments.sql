-- +goose Up
-- +goose StatementBegin

-- =============================================================================
-- UUID v7 FUNCTION (Time-ordered UUIDs - RFC 9562)
-- Uses CREATE OR REPLACE to avoid errors if already defined
-- =============================================================================
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  return encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;

-- =============================================================================
-- Operator Assignments (User-based operator role assignment)
-- Operators are regular users (identity_db.accounts) with operator privileges
-- =============================================================================
CREATE TABLE operator_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

    -- External reference to identity_db.accounts
    account_id UUID NOT NULL,

    -- Assignment context
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL,

    -- Admin who assigned this operator
    assigned_by UUID NOT NULL REFERENCES admins(id),
    assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    deactivated_at TIMESTAMPTZ,
    deactivated_by UUID REFERENCES admins(id),
    deactivation_reason VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT uq_operator_assignments_account_service_country
        UNIQUE (account_id, service_id, country_code),
    CONSTRAINT chk_operator_assignments_status
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED'))
);

CREATE INDEX idx_operator_assignments_account_id ON operator_assignments(account_id);
CREATE INDEX idx_operator_assignments_service_id ON operator_assignments(service_id);
CREATE INDEX idx_operator_assignments_country_code ON operator_assignments(country_code);
CREATE INDEX idx_operator_assignments_assigned_by ON operator_assignments(assigned_by);
CREATE INDEX idx_operator_assignments_status ON operator_assignments(status);
CREATE INDEX idx_operator_assignments_service_country ON operator_assignments(service_id, country_code);

COMMENT ON TABLE operator_assignments IS 'Assigns operator role to existing user accounts (identity_db.accounts)';
COMMENT ON COLUMN operator_assignments.account_id IS 'External reference to identity_db.accounts.id';

-- =============================================================================
-- Operator Assignment Permissions (Permissions for operator assignments)
-- =============================================================================
CREATE TABLE operator_assignment_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

    -- Assignment reference
    assignment_id UUID NOT NULL REFERENCES operator_assignments(id) ON DELETE CASCADE,

    -- Permission reference
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

    -- Grant metadata
    granted_by UUID NOT NULL REFERENCES admins(id),
    granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Expiration (optional time-limited permissions)
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT uq_operator_assignment_permissions_assignment_permission
        UNIQUE (assignment_id, permission_id)
);

CREATE INDEX idx_operator_assignment_permissions_assignment_id ON operator_assignment_permissions(assignment_id);
CREATE INDEX idx_operator_assignment_permissions_permission_id ON operator_assignment_permissions(permission_id);
CREATE INDEX idx_operator_assignment_permissions_granted_by ON operator_assignment_permissions(granted_by);
CREATE INDEX idx_operator_assignment_permissions_expires_at ON operator_assignment_permissions(expires_at);

COMMENT ON TABLE operator_assignment_permissions IS 'Permissions granted to operator assignments';

-- =============================================================================
-- Create enum type for operator assignment status
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operator_assignment_status') THEN
        CREATE TYPE operator_assignment_status AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
    END IF;
END $$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop tables in reverse order
DROP TABLE IF EXISTS operator_assignment_permissions;
DROP TABLE IF EXISTS operator_assignments;

-- Drop enum type
DROP TYPE IF EXISTS operator_assignment_status;

-- +goose StatementEnd
