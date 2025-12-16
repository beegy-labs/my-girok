//! OpenTelemetry tracing setup
//!
//! Configures distributed tracing with OTLP exporter.

use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{
    runtime,
    trace::{Config, Sampler},
    Resource,
};
use opentelemetry_semantic_conventions::resource::{SERVICE_NAME, SERVICE_VERSION};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer};

use crate::config::AppConfig;

/// Initialize tracing with OpenTelemetry support
pub fn init_tracing(config: &AppConfig) -> anyhow::Result<()> {
    // Create env filter
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new("info,api_gateway=debug,tower_http=debug")
    });

    // JSON format for production, pretty for development
    let format_layer = if config.is_production() {
        tracing_subscriber::fmt::layer()
            .json()
            .with_target(true)
            .with_thread_ids(true)
            .boxed()
    } else {
        tracing_subscriber::fmt::layer()
            .pretty()
            .with_target(true)
            .boxed()
    };

    // Build subscriber
    let subscriber = tracing_subscriber::registry()
        .with(filter)
        .with(format_layer);

    // Add OpenTelemetry layer if enabled
    if config.otel_enabled {
        let resource = Resource::builder()
            .with_attribute(SERVICE_NAME.string(config.otel_service_name.clone()))
            .with_attribute(SERVICE_VERSION.string(env!("CARGO_PKG_VERSION")))
            .build();

        let tracer_provider = opentelemetry_otlp::new_pipeline()
            .tracing()
            .with_exporter(
                opentelemetry_otlp::new_exporter()
                    .tonic()
                    .with_endpoint(&config.otel_endpoint),
            )
            .with_trace_config(
                Config::default()
                    .with_sampler(Sampler::AlwaysOn)
                    .with_resource(resource),
            )
            .install_batch(runtime::Tokio)?;

        let tracer = tracer_provider.tracer("api-gateway");
        let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);

        subscriber.with(otel_layer).init();
        info!(endpoint = %config.otel_endpoint, "OpenTelemetry tracing enabled");
    } else {
        subscriber.init();
        info!("OpenTelemetry tracing disabled");
    }

    Ok(())
}

/// Shutdown the tracer provider
pub fn shutdown_tracer() {
    opentelemetry::global::shutdown_tracer_provider();
}
