//! Prometheus metrics endpoint
//!
//! Exposes metrics in Prometheus format at `/metrics`

use axum::{
    http::{header, StatusCode},
    response::IntoResponse,
    routing::get,
    Router,
};
use metrics_exporter_prometheus::PrometheusHandle;
use once_cell::sync::OnceCell;

use crate::AppState;

/// Global Prometheus handle for rendering metrics
static PROMETHEUS_HANDLE: OnceCell<PrometheusHandle> = OnceCell::new();

/// Set the Prometheus handle (called during initialization)
pub fn set_prometheus_handle(handle: PrometheusHandle) {
    PROMETHEUS_HANDLE
        .set(handle)
        .expect("Prometheus handle already set");
}

/// Get the Prometheus handle
pub fn get_prometheus_handle() -> Option<&'static PrometheusHandle> {
    PROMETHEUS_HANDLE.get()
}

/// Create metrics routes
pub fn router() -> Router<AppState> {
    Router::new().route("/metrics", get(metrics_handler))
}

/// Prometheus metrics handler
async fn metrics_handler() -> impl IntoResponse {
    match get_prometheus_handle() {
        Some(handle) => {
            let metrics = handle.render();
            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
                metrics,
            )
                .into_response()
        }
        None => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Metrics not initialized",
        )
            .into_response(),
    }
}
