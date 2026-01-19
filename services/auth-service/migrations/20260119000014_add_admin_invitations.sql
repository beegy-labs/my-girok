-- +goose Up
-- Create admin_invitations table
-- Note: invitation_type and invitation_status enums already exist from operator migration
CREATE TABLE admin_invitations (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    type invitation_type NOT NULL DEFAULT 'EMAIL',
    token TEXT NOT NULL UNIQUE,
    status invitation_status NOT NULL DEFAULT 'PENDING',
    invited_by UUID NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX idx_admin_invitations_token ON admin_invitations(token);
CREATE INDEX idx_admin_invitations_expires_at ON admin_invitations(expires_at);

-- +goose Down
DROP TABLE IF EXISTS admin_invitations;
-- Note: Keep invitation_type and invitation_status enums (used by operator_invitations)
