-- +goose Up
-- Migration: Remove deprecated tables (admin_user_links, audit_logs)
-- Issue: #375 Phase 4 - 불필요 테이블 제거
-- admin_user_links: Operator 테이블과 기능 중복으로 미사용
-- audit_logs (PostgreSQL): ClickHouse audit_db로 이동 완료

-- 1. Drop admin_user_links table (미사용)
DROP TABLE IF EXISTS admin_user_links CASCADE;

-- 2. Drop audit_logs table (ClickHouse로 이동 완료)
-- Note: Audit logs are now stored in ClickHouse audit_db.audit_logs
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 3. Drop related enum types if unused
DROP TYPE IF EXISTS admin_link_type CASCADE;

-- +goose Down
-- Rollback: Restore deprecated tables

-- 1. Create enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_link_type') THEN
        CREATE TYPE admin_link_type AS ENUM ('OPERATOR', 'MODERATOR', 'SUPPORT', 'IMPERSONATE');
    END IF;
END$$;

-- 2. Recreate admin_user_links table
CREATE TABLE admin_user_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    link_type admin_link_type NOT NULL DEFAULT 'OPERATOR',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE (admin_id, user_id)
);

CREATE INDEX idx_admin_user_links_admin_id ON admin_user_links(admin_id);
CREATE INDEX idx_admin_user_links_user_id ON admin_user_links(user_id);

-- 3. Recreate audit_logs table (for PostgreSQL backup)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id),
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_id_created_at ON audit_logs(admin_id, created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_resource_id ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
