-- +goose Up
-- Create invitation_type enum
CREATE TYPE invitation_type AS ENUM ('EMAIL', 'DIRECT');

-- Create invitation_status enum
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- Create admin_invitations table
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
DROP TYPE IF EXISTS invitation_status;
DROP TYPE IF EXISTS invitation_type;
