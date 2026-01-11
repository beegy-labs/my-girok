-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- Service Dependency Map (Aggregated from traces)
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.service_dependencies (
    date Date,
    source_service LowCardinality(String),
    target_service LowCardinality(String),
    call_count UInt64,
    error_count UInt64,
    total_duration_ns UInt64,
    p50_duration_ns Float64,
    p95_duration_ns Float64,
    p99_duration_ns Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, source_service, target_service)
TTL date + INTERVAL 90 DAY;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.service_dependencies_mv
TO otel_db.service_dependencies
AS SELECT
    toDate(timestamp) as date,
    service_name as source_service,
    coalesce(
        JSONExtractString(span_attributes, 'peer.service'),
        JSONExtractString(span_attributes, 'http.host'),
        JSONExtractString(span_attributes, 'db.name'),
        JSONExtractString(span_attributes, 'rpc.service'),
        'unknown'
    ) as target_service,
    count() as call_count,
    countIf(status_code = 'STATUS_CODE_ERROR') as error_count,
    sum(duration_ns) as total_duration_ns,
    quantile(0.5)(duration_ns) as p50_duration_ns,
    quantile(0.95)(duration_ns) as p95_duration_ns,
    quantile(0.99)(duration_ns) as p99_duration_ns
FROM otel_db.traces
WHERE span_kind IN ('SPAN_KIND_CLIENT', 'SPAN_KIND_PRODUCER')
GROUP BY date, source_service, target_service;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Service Error Rates (Aggregated)
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.service_error_rates (
    hour DateTime,
    service_name LowCardinality(String),
    total_spans UInt64,
    error_spans UInt64,
    error_rate Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, service_name)
TTL hour + INTERVAL 30 DAY;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.service_error_rates_mv
TO otel_db.service_error_rates
AS SELECT
    toStartOfHour(timestamp) as hour,
    service_name,
    count() as total_spans,
    countIf(status_code = 'STATUS_CODE_ERROR') as error_spans,
    countIf(status_code = 'STATUS_CODE_ERROR') / count() as error_rate
FROM otel_db.traces
WHERE span_kind = 'SPAN_KIND_SERVER'
GROUP BY hour, service_name;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Log Error Summary
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.log_error_summary (
    hour DateTime,
    service_name LowCardinality(String),
    severity_text LowCardinality(String),
    log_count UInt64,
    sample_body Nullable(String)
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, service_name, severity_text)
TTL hour + INTERVAL 7 DAY;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.log_error_summary_mv
TO otel_db.log_error_summary
AS SELECT
    toStartOfHour(timestamp) as hour,
    service_name,
    severity_text,
    count() as log_count,
    any(body) as sample_body
FROM otel_db.logs
WHERE severity_number >= 17
GROUP BY hour, service_name, severity_text;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Hourly Trace Stats
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.hourly_trace_stats (
    hour DateTime,
    service_name LowCardinality(String),
    span_kind LowCardinality(String),
    total_spans UInt64,
    error_spans UInt64,
    total_duration_ns UInt64,
    avg_duration_ns Float64,
    p95_duration_ns Float64,
    p99_duration_ns Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, service_name, span_kind)
TTL hour + INTERVAL 30 DAY;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.hourly_trace_stats_mv
TO otel_db.hourly_trace_stats
AS SELECT
    toStartOfHour(timestamp) as hour,
    service_name,
    span_kind,
    count() as total_spans,
    countIf(status_code = 'STATUS_CODE_ERROR') as error_spans,
    sum(duration_ns) as total_duration_ns,
    avg(duration_ns) as avg_duration_ns,
    quantile(0.95)(duration_ns) as p95_duration_ns,
    quantile(0.99)(duration_ns) as p99_duration_ns
FROM otel_db.traces
GROUP BY hour, service_name, span_kind;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- HTTP Endpoint Stats
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.http_endpoint_stats (
    hour DateTime,
    service_name LowCardinality(String),
    http_method LowCardinality(String),
    http_route String,
    request_count UInt64,
    error_count UInt64,
    status_2xx UInt64,
    status_3xx UInt64,
    status_4xx UInt64,
    status_5xx UInt64,
    total_duration_ns UInt64,
    avg_duration_ns Float64,
    p95_duration_ns Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, service_name, http_method, http_route)
TTL hour + INTERVAL 30 DAY;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.http_endpoint_stats_mv
TO otel_db.http_endpoint_stats
AS SELECT
    toStartOfHour(timestamp) as hour,
    service_name,
    http_method,
    coalesce(http_route, http_url, 'unknown') as http_route,
    count() as request_count,
    countIf(status_code = 'STATUS_CODE_ERROR') as error_count,
    countIf(http_status_code >= 200 AND http_status_code < 300) as status_2xx,
    countIf(http_status_code >= 300 AND http_status_code < 400) as status_3xx,
    countIf(http_status_code >= 400 AND http_status_code < 500) as status_4xx,
    countIf(http_status_code >= 500) as status_5xx,
    sum(duration_ns) as total_duration_ns,
    avg(duration_ns) as avg_duration_ns,
    quantile(0.95)(duration_ns) as p95_duration_ns
FROM otel_db.traces
WHERE http_method IS NOT NULL
GROUP BY hour, service_name, http_method, http_route;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS otel_db.http_endpoint_stats_mv;
DROP TABLE IF EXISTS otel_db.http_endpoint_stats;
DROP VIEW IF EXISTS otel_db.hourly_trace_stats_mv;
DROP TABLE IF EXISTS otel_db.hourly_trace_stats;
DROP VIEW IF EXISTS otel_db.log_error_summary_mv;
DROP TABLE IF EXISTS otel_db.log_error_summary;
DROP VIEW IF EXISTS otel_db.service_error_rates_mv;
DROP TABLE IF EXISTS otel_db.service_error_rates;
DROP VIEW IF EXISTS otel_db.service_dependencies_mv;
DROP TABLE IF EXISTS otel_db.service_dependencies;
-- +goose StatementEnd
