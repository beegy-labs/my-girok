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
    id UUID DEFAULT generateUUIDv7(),   -- UUIDv7 (RFC 9562)
    timestamp DateTime64(3),
    user_id UUID,                        -- UUIDv7
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
ENGINE = Distributed('my_cluster', 'audit_db', 'access_logs_local', xxHash64(toString(user_id)));


-- ============================================================
-- Consent History
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.consent_history_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),   -- UUIDv7 (RFC 9562)
    timestamp DateTime64(3),
    user_id UUID,                        -- UUIDv7
    consent_type LowCardinality(String),
    country_code LowCardinality(String),
    agreed Bool,
    document_id Nullable(UUID),          -- UUIDv7
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
ENGINE = Distributed('my_cluster', 'audit_db', 'consent_history_local', xxHash64(toString(user_id)));


-- ============================================================
-- Admin Actions
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_actions_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),   -- UUIDv7 (RFC 9562)
    timestamp DateTime64(3),
    admin_id UUID,                       -- UUIDv7
    admin_email String,
    action LowCardinality(String),      -- 'create', 'update', 'delete', 'approve', etc.
    target_type LowCardinality(String), -- 'user', 'tenant', 'role', 'consent_document', etc.
    target_id UUID,                      -- UUIDv7
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
ENGINE = Distributed('my_cluster', 'audit_db', 'admin_actions_local', xxHash64(toString(admin_id)));


-- ============================================================
-- Data Export Logs (for GDPR compliance)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.data_exports_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),   -- UUIDv7 (RFC 9562)
    timestamp DateTime64(3),
    user_id UUID,                        -- UUIDv7
    export_type LowCardinality(String), -- 'gdpr_request', 'legal_hold', 'admin_export'
    requested_by UUID,                   -- admin_id (UUIDv7)
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
ENGINE = Distributed('my_cluster', 'audit_db', 'data_exports_local', xxHash64(toString(user_id)));


-- ============================================================
-- Admin Audit System Tables
-- Retention: 7 years (legal compliance)
-- OTEL Integration: Browser SDK + NestJS Interceptor
-- ============================================================

-- ============================================================
-- Admin UI Events (#403)
-- Tracks all admin UI interactions (clicks, page views, forms)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_ui_events_local ON CLUSTER 'my_cluster' (
    -- Identity
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3, 'UTC'),
    date Date DEFAULT toDate(timestamp),

    -- Session
    session_id String,
    session_start DateTime64(3, 'UTC'),
    session_sequence UInt32,  -- Event order in session

    -- Actor
    actor_id UUID,
    actor_email LowCardinality(String),
    actor_name String,
    actor_scope LowCardinality(String),  -- SYSTEM, TENANT
    actor_role LowCardinality(String),
    actor_permissions Array(String),

    -- Service Context
    service_id Nullable(UUID),
    service_slug LowCardinality(Nullable(String)),

    -- Event
    event_type LowCardinality(String),        -- click, page_view, form_submit, modal_open, modal_close, error
    event_name String,                         -- sanction_create_btn, tester_add_btn
    event_category LowCardinality(String),    -- sanction, tester, config, navigation
    event_action LowCardinality(String),      -- open, submit, cancel, success, error
    event_label Nullable(String),
    event_value Nullable(Float64),

    -- UI Context
    page_path String,
    page_title String,
    page_referrer Nullable(String),
    component_id Nullable(String),
    component_type LowCardinality(Nullable(String)),  -- button, form, modal, table
    button_text Nullable(String),
    form_id Nullable(String),
    form_fields Array(String),

    -- Interaction Details
    element_xpath Nullable(String),
    element_selector Nullable(String),
    click_x Nullable(UInt16),
    click_y Nullable(UInt16),
    viewport_width UInt16,
    viewport_height UInt16,
    scroll_depth Nullable(UInt8),  -- 0-100%

    -- Performance
    time_to_interaction_ms Nullable(UInt32),
    page_load_time_ms Nullable(UInt32),

    -- Custom Data
    event_data String DEFAULT '{}',  -- JSON

    -- Device
    user_agent String,
    browser LowCardinality(String),
    browser_version String,
    os LowCardinality(String),
    os_version String,
    device_type LowCardinality(String),
    device_vendor Nullable(String),
    screen_resolution String,
    color_depth UInt8,
    timezone String,
    language LowCardinality(String),

    -- Network
    ip_address String,
    ip_anonymized String,  -- GDPR compliant (last octet zeroed)
    country_code LowCardinality(String),
    region Nullable(String),
    city Nullable(String),
    isp Nullable(String),
    connection_type LowCardinality(Nullable(String)),

    -- OTEL
    trace_id String,
    span_id String,
    parent_span_id Nullable(String),
    trace_flags UInt8 DEFAULT 0,

    -- Retention
    retention_until Date DEFAULT toDate(timestamp) + INTERVAL 7 YEAR
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_ui_events',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, actor_id, session_id, timestamp, id)
TTL retention_until
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS audit_db.admin_ui_events ON CLUSTER 'my_cluster'
AS audit_db.admin_ui_events_local
ENGINE = Distributed('my_cluster', 'audit_db', 'admin_ui_events_local', xxHash64(toString(actor_id)));

-- Skip indexes for query optimization
ALTER TABLE audit_db.admin_ui_events_local ON CLUSTER 'my_cluster'
    ADD INDEX IF NOT EXISTS idx_event_type event_type TYPE set(100) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_event_category event_category TYPE set(50) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_service_id service_id TYPE bloom_filter GRANULARITY 4;


-- ============================================================
-- Admin API Logs (#404)
-- Tracks all admin API requests with performance metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_api_logs_local ON CLUSTER 'my_cluster' (
    -- Identity
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3, 'UTC'),
    date Date DEFAULT toDate(timestamp),

    -- Actor
    actor_id UUID,
    actor_type LowCardinality(String),  -- ADMIN, OPERATOR, SYSTEM
    actor_email LowCardinality(String),
    actor_scope LowCardinality(String),

    -- Service Context
    service_id Nullable(UUID),
    service_slug LowCardinality(Nullable(String)),

    -- Request
    request_id String,
    method LowCardinality(String),
    path String,
    path_template String,  -- /v1/admin/services/:serviceId/sanctions/:id
    path_params String DEFAULT '{}',    -- JSON: {"serviceId": "xxx", "id": "yyy"}
    query_params String DEFAULT '{}',   -- JSON (sanitized)
    request_body String DEFAULT '{}',   -- JSON (sanitized, truncated)
    request_body_size UInt32,
    content_type LowCardinality(Nullable(String)),

    -- Response
    status_code UInt16,
    response_body_preview Nullable(String),  -- First 1000 chars
    response_body_size UInt32,

    -- Performance
    response_time_ms UInt32,
    db_query_count UInt16,
    db_query_time_ms UInt32,
    cache_hit Bool DEFAULT false,
    cache_key Nullable(String),

    -- Error
    error_type LowCardinality(Nullable(String)),
    error_message Nullable(String),
    error_stack Nullable(String),

    -- Network
    ip_address String,
    ip_anonymized String,
    user_agent String,
    country_code LowCardinality(String),

    -- Security
    auth_method LowCardinality(String),  -- jwt, api_key, session
    token_id Nullable(String),
    permissions_used Array(String),
    permission_denied Bool DEFAULT false,

    -- Rate Limiting
    rate_limit_remaining Nullable(UInt32),
    rate_limit_reset Nullable(DateTime64(3, 'UTC')),

    -- OTEL
    trace_id String,
    span_id String,
    parent_span_id Nullable(String),

    -- Correlation
    ui_event_id Nullable(UUID),  -- Linked UI event that triggered this API call
    session_id Nullable(String),

    -- Retention
    retention_until Date DEFAULT toDate(timestamp) + INTERVAL 7 YEAR
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_api_logs',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, service_id, path_template, timestamp, id)
TTL retention_until
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS audit_db.admin_api_logs ON CLUSTER 'my_cluster'
AS audit_db.admin_api_logs_local
ENGINE = Distributed('my_cluster', 'audit_db', 'admin_api_logs_local', xxHash64(toString(service_id)));

-- Skip indexes
ALTER TABLE audit_db.admin_api_logs_local ON CLUSTER 'my_cluster'
    ADD INDEX IF NOT EXISTS idx_method method TYPE set(10) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_status status_code TYPE set(100) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_actor actor_id TYPE bloom_filter GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_error error_type TYPE set(50) GRANULARITY 4;


-- ============================================================
-- Admin Audit Logs (#405)
-- Core compliance table for data change tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_audit_logs_local ON CLUSTER 'my_cluster' (
    -- Identity
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3, 'UTC'),
    date Date DEFAULT toDate(timestamp),

    -- Actor
    actor_id UUID,
    actor_type LowCardinality(String),  -- ADMIN, OPERATOR, SYSTEM
    actor_email LowCardinality(String),
    actor_name String,
    actor_scope LowCardinality(String),
    actor_role LowCardinality(String),
    actor_ip String,

    -- Service Context
    service_id UUID,
    service_slug LowCardinality(String),
    service_name String,

    -- Resource & Action
    resource LowCardinality(String),   -- service_config, service_feature, tester_user, sanction
    resource_version UInt32 DEFAULT 1, -- Schema version for evolution
    action LowCardinality(String),     -- create, read, update, delete, revoke, extend, approve

    -- Target
    target_id UUID,
    target_type LowCardinality(String),
    target_identifier String,          -- Human-readable: "user@example.com", "POST_CREATE"

    -- Changes (Detailed)
    operation_type LowCardinality(String),  -- INSERT, UPDATE, DELETE
    before_state Nullable(String),     -- Full JSON snapshot
    after_state Nullable(String),      -- Full JSON snapshot
    changed_fields Array(String),      -- ['status', 'endAt']
    change_diff String DEFAULT '{}',   -- JSON diff format

    -- Business Context
    reason String,
    business_justification Nullable(String),
    ticket_id Nullable(String),        -- JIRA ticket
    approval_id Nullable(String),      -- Approval workflow ID

    -- Compliance
    compliance_tags Array(String),     -- ['GDPR', 'PIPA', 'SOX']
    data_classification LowCardinality(String) DEFAULT 'INTERNAL',
    pii_accessed Bool DEFAULT false,
    pii_fields Array(String),

    -- Source
    source LowCardinality(String),     -- web-admin, api, cli, system, migration
    source_version String,

    -- OTEL
    trace_id String,
    span_id String,
    ui_event_id Nullable(UUID),
    api_log_id Nullable(UUID),

    -- Integrity
    checksum String,                   -- SHA-256 of critical fields
    previous_log_id Nullable(UUID),    -- Chain for tamper detection

    -- Retention
    retention_until Date DEFAULT toDate(timestamp) + INTERVAL 7 YEAR,
    legal_hold Bool DEFAULT false      -- Prevent deletion
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_audit_logs',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, service_id, resource, timestamp, id)
TTL retention_until DELETE WHERE NOT legal_hold
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS audit_db.admin_audit_logs ON CLUSTER 'my_cluster'
AS audit_db.admin_audit_logs_local
ENGINE = Distributed('my_cluster', 'audit_db', 'admin_audit_logs_local', xxHash64(toString(service_id)));

-- Skip indexes
ALTER TABLE audit_db.admin_audit_logs_local ON CLUSTER 'my_cluster'
    ADD INDEX IF NOT EXISTS idx_resource resource TYPE set(50) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_action action TYPE set(20) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_actor actor_id TYPE bloom_filter GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_target target_id TYPE bloom_filter GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_compliance compliance_tags TYPE set(20) GRANULARITY 4;


-- ============================================================
-- Admin Sessions (#406)
-- Session management with activity metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_sessions_local ON CLUSTER 'my_cluster' (
    -- Identity
    id String,  -- Session ID (from browser)
    date Date DEFAULT today(),

    -- Actor
    actor_id UUID,
    actor_email LowCardinality(String),
    actor_type LowCardinality(String),

    -- Timing
    started_at DateTime64(3, 'UTC'),
    ended_at Nullable(DateTime64(3, 'UTC')),
    last_activity_at DateTime64(3, 'UTC'),
    duration_seconds UInt32 DEFAULT 0,

    -- Activity Metrics
    page_views UInt32 DEFAULT 0,
    clicks UInt32 DEFAULT 0,
    api_calls UInt32 DEFAULT 0,
    errors UInt32 DEFAULT 0,
    data_changes UInt32 DEFAULT 0,

    -- Pages Visited
    pages_visited Array(String),
    services_accessed Array(String),

    -- Device (from first event)
    device_fingerprint String,
    browser LowCardinality(String),
    os LowCardinality(String),
    device_type LowCardinality(String),
    ip_address String,
    country_code LowCardinality(String),

    -- Status
    status LowCardinality(String) DEFAULT 'active',  -- active, ended, timeout, forced_logout
    end_reason LowCardinality(Nullable(String)),     -- logout, timeout, forced, error

    -- Retention
    retention_until Date DEFAULT today() + INTERVAL 2 YEAR
) ENGINE = ReplicatedReplacingMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_sessions',
    '{replica}',
    last_activity_at
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, actor_id, id)
TTL retention_until
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS audit_db.admin_sessions ON CLUSTER 'my_cluster'
AS audit_db.admin_sessions_local
ENGINE = Distributed('my_cluster', 'audit_db', 'admin_sessions_local', xxHash64(toString(actor_id)));
