//! Prometheus metrics setup
//!
//! Configures metrics collection and Prometheus exporter.

use metrics_exporter_prometheus::PrometheusBuilder;
use tracing::info;

use crate::config::AppConfig;
use crate::routes::metrics::set_prometheus_handle;

/// Initialize Prometheus metrics
pub fn init_metrics(config: &AppConfig) -> anyhow::Result<()> {
    let builder = PrometheusBuilder::new();

    // Install the recorder and get the handle
    let handle = builder.install_recorder()?;

    // Store handle for the /metrics endpoint
    set_prometheus_handle(handle);

    // Register default metrics
    register_default_metrics();

    info!(
        service = config.otel_service_name,
        "Prometheus metrics initialized"
    );

    Ok(())
}

/// Register default application metrics
fn register_default_metrics() {
    // Counter for total requests
    metrics::describe_counter!(
        "gateway_requests_total",
        "Total number of requests processed by the gateway"
    );

    // Histogram for request duration
    metrics::describe_histogram!(
        "gateway_request_duration_seconds",
        "Request duration in seconds"
    );

    // Gauge for active connections
    metrics::describe_gauge!(
        "gateway_active_connections",
        "Number of active connections"
    );

    // Counter for errors by type
    metrics::describe_counter!(
        "gateway_errors_total",
        "Total number of errors by type"
    );

    // Counter for upstream requests
    metrics::describe_counter!(
        "gateway_upstream_requests_total",
        "Total requests to upstream services"
    );

    // Histogram for upstream latency
    metrics::describe_histogram!(
        "gateway_upstream_duration_seconds",
        "Upstream service response time in seconds"
    );

    // Counter for requests by device type
    metrics::describe_counter!(
        "gateway_requests_by_device",
        "Total requests grouped by device type (desktop, mobile, tablet, bot)"
    );
}

/// Record a request metric
pub fn record_request(method: &str, path: &str, status: u16, duration_secs: f64) {
    let labels = [
        ("method", method.to_string()),
        ("path", normalize_path(path)),
        ("status", status.to_string()),
    ];

    metrics::counter!("gateway_requests_total", &labels).increment(1);
    metrics::histogram!("gateway_request_duration_seconds", &labels).record(duration_secs);
}

/// Record an upstream request metric
pub fn record_upstream_request(service: &str, status: u16, duration_secs: f64) {
    let labels = [
        ("service", service.to_string()),
        ("status", status.to_string()),
    ];

    metrics::counter!("gateway_upstream_requests_total", &labels).increment(1);
    metrics::histogram!("gateway_upstream_duration_seconds", &labels).record(duration_secs);
}

/// Record an error
pub fn record_error(error_type: &str) {
    let labels = [("type", error_type.to_string())];
    metrics::counter!("gateway_errors_total", &labels).increment(1);
}

/// Normalize path for metrics (remove IDs, etc.)
fn normalize_path(path: &str) -> String {
    // Replace UUID-like segments with :id
    let uuid_regex = regex_lite::Regex::new(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    )
    .unwrap();

    // Replace numeric IDs with :id
    let numeric_regex = regex_lite::Regex::new(r"/\d+(/|$)").unwrap();

    let normalized = uuid_regex.replace_all(path, ":id");
    numeric_regex.replace_all(&normalized, "/:id$1").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_path_uuid() {
        let path = "/api/v1/users/550e8400-e29b-41d4-a716-446655440000";
        assert_eq!(normalize_path(path), "/api/v1/users/:id");
    }

    #[test]
    fn test_normalize_path_numeric() {
        let path = "/api/v1/posts/123/comments";
        assert_eq!(normalize_path(path), "/api/v1/posts/:id/comments");
    }
}
