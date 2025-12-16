//! API Gateway for my-girok platform
//!
//! High-performance gateway built with Axum that handles:
//! - JWT authentication/authorization
//! - Request routing to backend services
//! - Rate limiting
//! - OpenTelemetry tracing and Prometheus metrics

mod config;
mod error;
mod routes;
mod observability;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use tokio::net::TcpListener;
use tokio::signal;
use tower_http::compression::CompressionLayer;
use tower_http::cors::{Any, CorsLayer};
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, warn};

use crate::config::AppConfig;
use crate::observability::{init_metrics, init_tracing, shutdown_tracer};

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub http_client: reqwest::Client,
    pub is_shutting_down: Arc<std::sync::atomic::AtomicBool>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load configuration
    dotenvy::dotenv().ok();
    let config = AppConfig::load()?;
    let config = Arc::new(config);

    // Initialize observability
    init_tracing(&config)?;
    init_metrics(&config)?;

    info!(
        service = "api-gateway",
        version = env!("CARGO_PKG_VERSION"),
        "Starting API Gateway"
    );

    // Create HTTP client for proxying
    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(config.request_timeout_secs))
        .pool_max_idle_per_host(config.connection_pool_size)
        .build()?;

    // Create shared state
    let state = AppState {
        config: config.clone(),
        http_client,
        is_shutting_down: Arc::new(std::sync::atomic::AtomicBool::new(false)),
    };

    // Build router
    let app = build_router(state.clone());

    // Bind server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = TcpListener::bind(addr).await?;

    info!(addr = %addr, "API Gateway listening");

    // Run server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal(state.clone()))
        .await?;

    // Cleanup
    shutdown_tracer();
    info!("API Gateway shutdown complete");

    Ok(())
}

/// Build the application router with all middleware
fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any) // TODO: Configure from environment
        .allow_methods(Any)
        .allow_headers(Any)
        .max_age(Duration::from_secs(3600));

    Router::new()
        .merge(routes::health::router())
        .merge(routes::metrics::router())
        // TODO: Add proxy routes in future issues
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(
            state.config.request_timeout_secs,
        )))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}

/// Graceful shutdown signal handler
async fn shutdown_signal(state: AppState) {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    warn!("Shutdown signal received, starting graceful shutdown");
    state
        .is_shutting_down
        .store(true, std::sync::atomic::Ordering::SeqCst);

    // Allow time for in-flight requests
    tokio::time::sleep(Duration::from_secs(
        state.config.shutdown_timeout_secs,
    ))
    .await;
}
