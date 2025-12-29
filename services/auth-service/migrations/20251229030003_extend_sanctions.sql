-- +goose Up
-- Phase 1.4: Sanction system extensions - appeal, notifications, features (#402)

-- Create new enums
CREATE TYPE sanction_scope AS ENUM ('PLATFORM', 'SERVICE');
CREATE TYPE sanction_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE issuer_type AS ENUM ('ADMIN', 'OPERATOR', 'SYSTEM');
CREATE TYPE appeal_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED');
CREATE TYPE notification_channel AS ENUM ('EMAIL', 'PUSH', 'SMS', 'IN_APP');
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- Alter existing sanctions table with new columns
ALTER TABLE sanctions
    ADD COLUMN scope sanction_scope NOT NULL DEFAULT 'SERVICE',
    ADD COLUMN severity sanction_severity NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN restricted_features TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN internal_note TEXT,
    ADD COLUMN evidence_urls TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN related_sanction_id UUID REFERENCES sanctions(id),
    ADD COLUMN revoke_reason TEXT,
    ADD COLUMN appeal_status appeal_status,
    ADD COLUMN appealed_at TIMESTAMPTZ(6),
    ADD COLUMN appeal_reason TEXT,
    ADD COLUMN appeal_reviewed_by UUID,
    ADD COLUMN appeal_reviewed_at TIMESTAMPTZ(6),
    ADD COLUMN appeal_response TEXT,
    ADD COLUMN updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

-- Add new indexes
CREATE INDEX idx_sanctions_severity ON sanctions(severity);
CREATE INDEX idx_sanctions_scope ON sanctions(scope);
CREATE INDEX idx_sanctions_appeal ON sanctions(appeal_status) WHERE appeal_status IS NOT NULL;
CREATE INDEX idx_sanctions_related ON sanctions(related_sanction_id) WHERE related_sanction_id IS NOT NULL;

-- Create sanction_notifications table
CREATE TABLE sanction_notifications (
    id UUID PRIMARY KEY,
    sanction_id UUID NOT NULL REFERENCES sanctions(id) ON DELETE CASCADE,

    channel notification_channel NOT NULL,
    status notification_status NOT NULL DEFAULT 'PENDING',

    sent_at TIMESTAMPTZ(6),
    read_at TIMESTAMPTZ(6),

    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sn_sanction ON sanction_notifications(sanction_id);
CREATE INDEX idx_sn_status ON sanction_notifications(status);

-- +goose Down
DROP TABLE IF EXISTS sanction_notifications;

DROP INDEX IF EXISTS idx_sanctions_severity;
DROP INDEX IF EXISTS idx_sanctions_scope;
DROP INDEX IF EXISTS idx_sanctions_appeal;
DROP INDEX IF EXISTS idx_sanctions_related;

ALTER TABLE sanctions
    DROP COLUMN IF EXISTS scope,
    DROP COLUMN IF EXISTS severity,
    DROP COLUMN IF EXISTS restricted_features,
    DROP COLUMN IF EXISTS internal_note,
    DROP COLUMN IF EXISTS evidence_urls,
    DROP COLUMN IF EXISTS related_sanction_id,
    DROP COLUMN IF EXISTS revoke_reason,
    DROP COLUMN IF EXISTS appeal_status,
    DROP COLUMN IF EXISTS appealed_at,
    DROP COLUMN IF EXISTS appeal_reason,
    DROP COLUMN IF EXISTS appeal_reviewed_by,
    DROP COLUMN IF EXISTS appeal_reviewed_at,
    DROP COLUMN IF EXISTS appeal_response,
    DROP COLUMN IF EXISTS updated_at;

DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS notification_channel;
DROP TYPE IF EXISTS appeal_status;
DROP TYPE IF EXISTS issuer_type;
DROP TYPE IF EXISTS sanction_severity;
DROP TYPE IF EXISTS sanction_scope;
