-- ============================================================
-- audit_db: Compliance Database
-- Retention: 5 years (legal requirement)
-- Owner: audit-service
-- ============================================================

-- Database
CREATE DATABASE IF NOT EXISTS audit_db ON CLUSTER 'my_cluster';

-- ============================================================
-- Access Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.access_logs_local ON CLUSTER 'my_cluster' (
    id String,                          -- ULID
    timestamp DateTime64(3),
    user_id String,                     -- ULID
    action LowCardinality(String),      -- 'login', 'logout', 'consent_change', 'password_change', etc.
    resource String,
    ip_address String,
    user_agent String,
    metadata String,                    -- JSON
    retention_until Date,
    is_exported Bool DEFAULT false
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/access_logs',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), user_id, id)
TTL retention_until;

-- Distributed table for queries
CREATE TABLE IF NOT EXISTS audit_db.access_logs ON CLUSTER 'my_cluster' AS audit_db.access_logs_local
ENGINE = Distributed('my_cluster', 'audit_db', 'access_logs_local', xxHash64(user_id));


-- ============================================================
-- Consent History
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.consent_history_local ON CLUSTER 'my_cluster' (
    id String,                          -- ULID
    timestamp DateTime64(3),
    user_id String,
    consent_type LowCardinality(String),
    country_code LowCardinality(String),
    agreed Bool,
    document_id Nullable(String),
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

CREATE TABLE IF NOT EXISTS audit_db.consent_history ON CLUSTER 'my_cluster' AS audit_db.consent_history_local
ENGINE = Distributed('my_cluster', 'audit_db', 'consent_history_local', xxHash64(user_id));


-- ============================================================
-- Admin Actions
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_actions_local ON CLUSTER 'my_cluster' (
    id String,
    timestamp DateTime64(3),
    admin_id String,
    admin_email String,
    action LowCardinality(String),      -- 'create', 'update', 'delete', 'approve', etc.
    target_type LowCardinality(String), -- 'user', 'tenant', 'role', 'consent_document', etc.
    target_id String,
    changes String,                     -- JSON diff
    ip_address String,
    retention_until Date
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_actions',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), admin_id, id)
TTL retention_until;

CREATE TABLE IF NOT EXISTS audit_db.admin_actions ON CLUSTER 'my_cluster' AS audit_db.admin_actions_local
ENGINE = Distributed('my_cluster', 'audit_db', 'admin_actions_local', xxHash64(admin_id));


-- ============================================================
-- Data Export Logs (for GDPR compliance)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.data_exports_local ON CLUSTER 'my_cluster' (
    id String,                          -- ULID
    timestamp DateTime64(3),
    user_id String,
    export_type LowCardinality(String), -- 'gdpr_request', 'legal_hold', 'admin_export'
    requested_by String,                -- admin_id or 'user_self'
    status LowCardinality(String),      -- 'pending', 'processing', 'completed', 'failed'
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

CREATE TABLE IF NOT EXISTS audit_db.data_exports ON CLUSTER 'my_cluster' AS audit_db.data_exports_local
ENGINE = Distributed('my_cluster', 'audit_db', 'data_exports_local', xxHash64(user_id));
