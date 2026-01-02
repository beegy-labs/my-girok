-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- audit_db: Compliance Database
-- Retention: 5 years (legal requirement)
-- Owner: audit-service
-- ============================================================

-- Database
CREATE DATABASE IF NOT EXISTS audit_db ON CLUSTER 'my_cluster';
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Access Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.access_logs_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    user_id UUID,
    action LowCardinality(String),
    resource String,
    ip_address String,
    user_agent String,
    metadata String,
    retention_until Date,
    is_exported Bool DEFAULT false
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/access_logs',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), user_id, id)
TTL retention_until;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS audit_db.access_logs ON CLUSTER 'my_cluster' AS audit_db.access_logs_local
ENGINE = Distributed('my_cluster', 'audit_db', 'access_logs_local', xxHash64(toString(user_id)));
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Consent History
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.consent_history_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    user_id UUID,
    consent_type LowCardinality(String),
    country_code LowCardinality(String),
    agreed Bool,
    document_id Nullable(UUID),
    document_version Nullable(String),
    ip_address String,
    retention_until Date
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/consent_history',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (consent_type, user_id, timestamp)
TTL retention_until;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS audit_db.consent_history ON CLUSTER 'my_cluster' AS audit_db.consent_history_local
ENGINE = Distributed('my_cluster', 'audit_db', 'consent_history_local', xxHash64(toString(user_id)));
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Admin Actions
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_actions_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    admin_id UUID,
    admin_email String,
    action LowCardinality(String),
    target_type LowCardinality(String),
    target_id UUID,
    changes String,
    ip_address String,
    retention_until Date
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_actions',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), admin_id, id)
TTL retention_until;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS audit_db.admin_actions ON CLUSTER 'my_cluster' AS audit_db.admin_actions_local
ENGINE = Distributed('my_cluster', 'audit_db', 'admin_actions_local', xxHash64(toString(admin_id)));
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Data Export Logs (for GDPR compliance)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.data_exports_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    user_id UUID,
    export_type LowCardinality(String),
    requested_by UUID,
    status LowCardinality(String),
    file_path Nullable(String),
    completed_at Nullable(DateTime64(3)),
    retention_until Date
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/data_exports',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, timestamp)
TTL retention_until;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS audit_db.data_exports ON CLUSTER 'my_cluster' AS audit_db.data_exports_local
ENGINE = Distributed('my_cluster', 'audit_db', 'data_exports_local', xxHash64(toString(user_id)));
-- +goose StatementEnd


-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS audit_db.data_exports ON CLUSTER 'my_cluster';
DROP TABLE IF EXISTS audit_db.data_exports_local ON CLUSTER 'my_cluster';
DROP TABLE IF EXISTS audit_db.admin_actions ON CLUSTER 'my_cluster';
DROP TABLE IF EXISTS audit_db.admin_actions_local ON CLUSTER 'my_cluster';
DROP TABLE IF EXISTS audit_db.consent_history ON CLUSTER 'my_cluster';
DROP TABLE IF EXISTS audit_db.consent_history_local ON CLUSTER 'my_cluster';
DROP TABLE IF EXISTS audit_db.access_logs ON CLUSTER 'my_cluster';
DROP TABLE IF EXISTS audit_db.access_logs_local ON CLUSTER 'my_cluster';
DROP DATABASE IF EXISTS audit_db ON CLUSTER 'my_cluster';
-- +goose StatementEnd
