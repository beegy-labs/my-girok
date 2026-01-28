-- +goose Up
-- Add body field for email content preview and messageId index for SES webhook lookups

-- Add body column to email_logs
ALTER TABLE email_logs ADD COLUMN body TEXT;

-- Add index on message_id for SES webhook lookups
CREATE INDEX idx_email_logs_message_id ON email_logs(message_id) WHERE message_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_email_logs_message_id;
ALTER TABLE email_logs DROP COLUMN IF EXISTS body;
