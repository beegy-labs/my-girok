-- ClickHouse Audit Logs Table
-- Partitioned by month for efficient querying and TTL management

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT generateUUIDv4(),
  timestamp DateTime64(3) DEFAULT now64(3),

  -- Actor info
  actor_type Enum8('USER' = 1, 'ADMIN' = 2, 'OPERATOR' = 3, 'SYSTEM' = 4),
  actor_id String,
  actor_email String,

  -- Context
  service_id Nullable(String),
  service_slug Nullable(String),
  tenant_id Nullable(String),
  country_code Nullable(String),

  -- Action info
  resource String,
  action String,
  target_type Nullable(String),
  target_id Nullable(String),

  -- Request details
  method String,
  path String,
  status_code UInt16,
  ip_address String,
  user_agent String,

  -- Data
  request_body Nullable(String),  -- JSON
  response_summary Nullable(String),
  metadata String DEFAULT '{}',  -- JSON

  -- Result
  success UInt8,
  error_message Nullable(String),
  duration_ms UInt32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, actor_type, actor_id)
TTL timestamp + INTERVAL 1 YEAR;

-- Index for common queries
ALTER TABLE audit_logs ADD INDEX idx_actor_id actor_id TYPE bloom_filter GRANULARITY 4;
ALTER TABLE audit_logs ADD INDEX idx_service_slug service_slug TYPE bloom_filter GRANULARITY 4;
ALTER TABLE audit_logs ADD INDEX idx_resource resource TYPE bloom_filter GRANULARITY 4;
ALTER TABLE audit_logs ADD INDEX idx_action action TYPE bloom_filter GRANULARITY 4;

-- Materialized view for actor activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_logs_by_actor
ENGINE = SummingMergeTree()
ORDER BY (actor_type, actor_id, date)
AS SELECT
  actor_type,
  actor_id,
  toDate(timestamp) as date,
  count() as action_count,
  countIf(success = 1) as success_count,
  countIf(success = 0) as failure_count
FROM audit_logs
GROUP BY actor_type, actor_id, toDate(timestamp);

-- Materialized view for service activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_logs_by_service
ENGINE = SummingMergeTree()
ORDER BY (service_slug, date)
AS SELECT
  service_slug,
  toDate(timestamp) as date,
  count() as action_count,
  countIf(success = 1) as success_count,
  countIf(success = 0) as failure_count,
  avg(duration_ms) as avg_duration_ms
FROM audit_logs
WHERE service_slug IS NOT NULL
GROUP BY service_slug, toDate(timestamp);

-- Materialized view for resource/action summary
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_logs_by_resource_action
ENGINE = SummingMergeTree()
ORDER BY (resource, action, date)
AS SELECT
  resource,
  action,
  toDate(timestamp) as date,
  count() as action_count,
  countIf(success = 1) as success_count,
  countIf(success = 0) as failure_count
FROM audit_logs
GROUP BY resource, action, toDate(timestamp);
