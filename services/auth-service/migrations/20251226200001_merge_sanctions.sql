-- +goose Up
-- Migration: Merge 3 sanction tables (user_sanctions, admin_sanctions, operator_sanctions) into 1 unified sanctions table
-- Issue: #375 Phase 2 - Sanction 테이블 통합
-- Note: 선구현 코드이므로 서비스 코드 변경 없음

-- 1. Create enum type for subject type (reuse session_subject_type if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sanction_subject_type') THEN
        CREATE TYPE sanction_subject_type AS ENUM ('USER', 'ADMIN', 'OPERATOR');
    END IF;
END$$;

-- 2. Create new unified sanctions table
CREATE TABLE sanctions_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    subject_type sanction_subject_type NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    type sanction_type NOT NULL,
    status sanction_status NOT NULL DEFAULT 'ACTIVE',
    reason TEXT NOT NULL,
    issued_by UUID NOT NULL,
    issued_by_type VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
    start_at TIMESTAMPTZ(6) NOT NULL,
    end_at TIMESTAMPTZ(6),
    revoked_at TIMESTAMPTZ(6),
    revoked_by UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for new table
CREATE INDEX idx_sanctions_unified_subject ON sanctions_unified(subject_id, subject_type);
CREATE INDEX idx_sanctions_unified_service ON sanctions_unified(service_id);
CREATE INDEX idx_sanctions_unified_status ON sanctions_unified(status);
CREATE INDEX idx_sanctions_unified_type ON sanctions_unified(type);

-- 4. Migrate data from old tables
-- User sanctions
INSERT INTO sanctions_unified (
    id, subject_id, subject_type, service_id, type, status, reason,
    issued_by, issued_by_type, start_at, end_at, revoked_at, revoked_by, created_at
)
SELECT
    id, user_id, 'USER'::sanction_subject_type, service_id, type, status, reason,
    issued_by, issued_by_type, start_at, end_at, revoked_at, revoked_by, created_at
FROM user_sanctions;

-- Admin sanctions
INSERT INTO sanctions_unified (
    id, subject_id, subject_type, service_id, type, status, reason,
    issued_by, issued_by_type, start_at, end_at, revoked_at, revoked_by, created_at
)
SELECT
    id, admin_id, 'ADMIN'::sanction_subject_type, service_id, type, status, reason,
    issued_by, 'ADMIN', start_at, end_at, revoked_at, revoked_by, created_at
FROM admin_sanctions;

-- Operator sanctions
INSERT INTO sanctions_unified (
    id, subject_id, subject_type, service_id, type, status, reason,
    issued_by, issued_by_type, start_at, end_at, revoked_at, revoked_by, created_at
)
SELECT
    id, operator_id, 'OPERATOR'::sanction_subject_type, NULL, type, status, reason,
    issued_by, 'ADMIN', start_at, end_at, revoked_at, revoked_by, created_at
FROM operator_sanctions;

-- 5. Drop old tables
DROP TABLE IF EXISTS user_sanctions CASCADE;
DROP TABLE IF EXISTS admin_sanctions CASCADE;
DROP TABLE IF EXISTS operator_sanctions CASCADE;

-- 6. Rename new table to sanctions
ALTER TABLE sanctions_unified RENAME TO sanctions;
ALTER INDEX idx_sanctions_unified_subject RENAME TO idx_sanctions_subject;
ALTER INDEX idx_sanctions_unified_service RENAME TO idx_sanctions_service;
ALTER INDEX idx_sanctions_unified_status RENAME TO idx_sanctions_status;
ALTER INDEX idx_sanctions_unified_type RENAME TO idx_sanctions_type;

-- +goose Down
-- Rollback: Restore original 3 sanction tables

-- 1. Recreate old tables
CREATE TABLE user_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    type sanction_type NOT NULL,
    status sanction_status NOT NULL DEFAULT 'ACTIVE',
    reason TEXT NOT NULL,
    issued_by UUID NOT NULL,
    issued_by_type VARCHAR(20) NOT NULL,
    start_at TIMESTAMPTZ(6) NOT NULL,
    end_at TIMESTAMPTZ(6),
    revoked_at TIMESTAMPTZ(6),
    revoked_by UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    type sanction_type NOT NULL,
    status sanction_status NOT NULL DEFAULT 'ACTIVE',
    reason TEXT NOT NULL,
    issued_by UUID NOT NULL,
    start_at TIMESTAMPTZ(6) NOT NULL,
    end_at TIMESTAMPTZ(6),
    revoked_at TIMESTAMPTZ(6),
    revoked_by UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE operator_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    type sanction_type NOT NULL,
    status sanction_status NOT NULL DEFAULT 'ACTIVE',
    reason TEXT NOT NULL,
    issued_by UUID NOT NULL,
    start_at TIMESTAMPTZ(6) NOT NULL,
    end_at TIMESTAMPTZ(6),
    revoked_at TIMESTAMPTZ(6),
    revoked_by UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 2. Migrate data back
INSERT INTO user_sanctions (id, user_id, service_id, type, status, reason, issued_by, issued_by_type, start_at, end_at, revoked_at, revoked_by, created_at)
SELECT id, subject_id, service_id, type, status, reason, issued_by, issued_by_type, start_at, end_at, revoked_at, revoked_by, created_at
FROM sanctions WHERE subject_type = 'USER';

INSERT INTO admin_sanctions (id, admin_id, service_id, type, status, reason, issued_by, start_at, end_at, revoked_at, revoked_by, created_at)
SELECT id, subject_id, service_id, type, status, reason, issued_by, start_at, end_at, revoked_at, revoked_by, created_at
FROM sanctions WHERE subject_type = 'ADMIN';

INSERT INTO operator_sanctions (id, operator_id, type, status, reason, issued_by, start_at, end_at, revoked_at, revoked_by, created_at)
SELECT id, subject_id, type, status, reason, issued_by, start_at, end_at, revoked_at, revoked_by, created_at
FROM sanctions WHERE subject_type = 'OPERATOR';

-- 3. Drop unified table
DROP TABLE IF EXISTS sanctions CASCADE;

-- 4. Create indexes for old tables
CREATE INDEX idx_user_sanctions_user_id ON user_sanctions(user_id);
CREATE INDEX idx_user_sanctions_service_id ON user_sanctions(service_id);
CREATE INDEX idx_user_sanctions_status ON user_sanctions(status);
CREATE INDEX idx_user_sanctions_type ON user_sanctions(type);
CREATE INDEX idx_admin_sanctions_admin_id ON admin_sanctions(admin_id);
CREATE INDEX idx_admin_sanctions_service_id ON admin_sanctions(service_id);
CREATE INDEX idx_admin_sanctions_status ON admin_sanctions(status);
CREATE INDEX idx_operator_sanctions_operator_id ON operator_sanctions(operator_id);
CREATE INDEX idx_operator_sanctions_status ON operator_sanctions(status);

-- 5. Drop enum type
DROP TYPE IF EXISTS sanction_subject_type;
