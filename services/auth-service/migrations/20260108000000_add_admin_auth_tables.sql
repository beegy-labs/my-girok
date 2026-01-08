-- +goose Up
-- +goose StatementBegin

-- =============================================================================
-- Admin MFA Configurations (Required for Admin login)
-- =============================================================================
CREATE TABLE admin_mfa_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

    -- TOTP settings
    totp_secret VARCHAR(64),
    totp_enabled BOOLEAN DEFAULT false,
    totp_verified_at TIMESTAMPTZ,

    -- Backup codes (hashed, comma-separated)
    backup_codes_hash TEXT[],
    backup_codes_generated_at TIMESTAMPTZ,
    backup_codes_remaining INT DEFAULT 0,

    -- Recovery
    recovery_email VARCHAR(255),
    recovery_phone VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT uq_admin_mfa_configs_admin_id UNIQUE (admin_id)
);

CREATE INDEX idx_admin_mfa_configs_admin_id ON admin_mfa_configs(admin_id);

COMMENT ON TABLE admin_mfa_configs IS 'Admin MFA configurations - MFA is required for all admins';

-- =============================================================================
-- Admin Sessions (Separate from user sessions for enhanced security)
-- =============================================================================
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

    -- Token hashes (for validation)
    token_hash VARCHAR(64) NOT NULL,
    refresh_token_hash VARCHAR(128),
    previous_refresh_token_hash VARCHAR(128),

    -- MFA verification status
    mfa_verified BOOLEAN DEFAULT false NOT NULL,
    mfa_verified_at TIMESTAMPTZ,
    mfa_method VARCHAR(20), -- 'TOTP', 'BACKUP_CODE'

    -- Session metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(128),

    -- Session state
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100),

    -- Activity tracking
    last_activity_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT uq_admin_sessions_token_hash UNIQUE (token_hash),
    CONSTRAINT uq_admin_sessions_refresh_token_hash UNIQUE (refresh_token_hash)
);

CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX idx_admin_sessions_refresh_token_hash ON admin_sessions(refresh_token_hash);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_admin_sessions_is_active ON admin_sessions(is_active);
CREATE INDEX idx_admin_sessions_admin_id_active_expires ON admin_sessions(admin_id, is_active, expires_at);

COMMENT ON TABLE admin_sessions IS 'Admin session management with mandatory MFA verification';

-- =============================================================================
-- Admin Password History (OWASP 2024 compliance - prevent password reuse)
-- =============================================================================
CREATE TABLE admin_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

    -- Password hash (Argon2id)
    password_hash VARCHAR(255) NOT NULL,

    -- Metadata
    changed_by UUID REFERENCES admins(id), -- NULL if self-change
    change_reason VARCHAR(50), -- 'SELF', 'FORCED', 'RESET'

    -- Timestamps
    changed_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT uq_admin_password_history_admin_hash UNIQUE (admin_id, password_hash)
);

CREATE INDEX idx_admin_password_history_admin_id ON admin_password_history(admin_id);
CREATE INDEX idx_admin_password_history_changed_at ON admin_password_history(changed_at);

COMMENT ON TABLE admin_password_history IS 'Admin password history for preventing reuse (last 12 passwords)';

-- =============================================================================
-- Admin Login Attempts (Rate limiting and security monitoring)
-- =============================================================================
CREATE TABLE admin_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Admin identification (email, not admin_id - as admin might not exist)
    email VARCHAR(255) NOT NULL,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,

    -- Attempt details
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(128),

    -- Result
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(50), -- 'INVALID_PASSWORD', 'ACCOUNT_LOCKED', 'MFA_FAILED', etc.

    -- MFA attempt (if applicable)
    mfa_attempted BOOLEAN DEFAULT false,
    mfa_method VARCHAR(20), -- 'TOTP', 'BACKUP_CODE'

    -- Timestamps
    attempted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_admin_login_attempts_email ON admin_login_attempts(email);
CREATE INDEX idx_admin_login_attempts_admin_id ON admin_login_attempts(admin_id);
CREATE INDEX idx_admin_login_attempts_ip_address ON admin_login_attempts(ip_address);
CREATE INDEX idx_admin_login_attempts_attempted_at ON admin_login_attempts(attempted_at);
CREATE INDEX idx_admin_login_attempts_email_attempted ON admin_login_attempts(email, attempted_at);
CREATE INDEX idx_admin_login_attempts_ip_attempted ON admin_login_attempts(ip_address, attempted_at);

COMMENT ON TABLE admin_login_attempts IS 'Admin login attempt tracking for rate limiting and security monitoring';

-- =============================================================================
-- Update admins table to add MFA-related fields
-- =============================================================================
ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_admins_locked_until ON admins(locked_until);
CREATE INDEX IF NOT EXISTS idx_admins_mfa_required ON admins(mfa_required);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove added columns from admins
ALTER TABLE admins
    DROP COLUMN IF EXISTS mfa_required,
    DROP COLUMN IF EXISTS password_changed_at,
    DROP COLUMN IF EXISTS force_password_change,
    DROP COLUMN IF EXISTS failed_login_attempts,
    DROP COLUMN IF EXISTS locked_until;

-- Drop indexes
DROP INDEX IF EXISTS idx_admins_locked_until;
DROP INDEX IF EXISTS idx_admins_mfa_required;

-- Drop tables in reverse order (respecting FK constraints)
DROP TABLE IF EXISTS admin_login_attempts;
DROP TABLE IF EXISTS admin_password_history;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_mfa_configs;

-- +goose StatementEnd
