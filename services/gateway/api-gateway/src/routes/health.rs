//! Health check endpoints for Kubernetes probes
//!
//! Provides three endpoints:
//! - `/health` - General health status
//! - `/health/live` - Liveness probe (is the process running?)
//! - `/health/ready` - Readiness probe (is the service ready to accept traffic?)

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Serialize;
use std::sync::atomic::Ordering;

use crate::AppState;

/// Health check response
#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uptime_secs: Option<u64>,
}

/// Detailed health response with component status
#[derive(Serialize)]
pub struct DetailedHealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
    pub checks: HealthChecks,
}

#[derive(Serialize)]
pub struct HealthChecks {
    pub gateway: ComponentHealth,
    // TODO: Add upstream service checks in future
}

#[derive(Serialize)]
pub struct ComponentHealth {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Create health routes
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health_check))
        .route("/health/live", get(liveness_probe))
        .route("/health/ready", get(readiness_probe))
}

/// General health check endpoint
async fn health_check() -> impl IntoResponse {
    let response = DetailedHealthResponse {
        status: "ok".to_string(),
        service: "api-gateway".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        checks: HealthChecks {
            gateway: ComponentHealth {
                status: "healthy".to_string(),
                message: None,
            },
        },
    };

    (StatusCode::OK, Json(response))
}

/// Kubernetes liveness probe
///
/// Returns 200 if the process is alive and responsive.
/// Used by K8s to determine if the container should be restarted.
async fn liveness_probe() -> impl IntoResponse {
    let response = HealthResponse {
        status: "ok".to_string(),
        service: "api-gateway".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_secs: None,
    };

    (StatusCode::OK, Json(response))
}

/// Kubernetes readiness probe
///
/// Returns 200 if the service is ready to accept traffic.
/// Returns 503 during graceful shutdown.
async fn readiness_probe(State(state): State<AppState>) -> impl IntoResponse {
    // Check if we're in shutdown mode
    if state.is_shutting_down.load(Ordering::SeqCst) {
        let response = HealthResponse {
            status: "shutting_down".to_string(),
            service: "api-gateway".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            uptime_secs: None,
        };
        return (StatusCode::SERVICE_UNAVAILABLE, Json(response));
    }

    let response = HealthResponse {
        status: "ok".to_string(),
        service: "api-gateway".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_secs: None,
    };

    (StatusCode::OK, Json(response))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Request;
    use std::sync::Arc;
    use tower::ServiceExt;

    fn create_test_state() -> AppState {
        AppState {
            config: Arc::new(crate::config::AppConfig::load().unwrap()),
            http_client: reqwest::Client::new(),
            is_shutting_down: Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }

    #[tokio::test]
    async fn test_liveness_returns_ok() {
        let app = router().with_state(create_test_state());

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health/live")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_readiness_returns_503_during_shutdown() {
        let state = create_test_state();
        state.is_shutting_down.store(true, Ordering::SeqCst);

        let app = router().with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health/ready")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }
}
