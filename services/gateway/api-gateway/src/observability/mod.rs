//! Observability setup: tracing and metrics
//!
//! Provides OpenTelemetry tracing and Prometheus metrics.

mod metrics;
mod tracing;

pub use self::metrics::init_metrics;
pub use self::tracing::{init_tracing, shutdown_tracer};
