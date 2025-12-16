//! Application configuration management
//!
//! Configuration is loaded from environment variables with sensible defaults.

use std::env;

use serde::Deserialize;

/// Application configuration
#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    // Server settings
    pub host: String,
    pub port: u16,

    // JWT settings
    pub jwt_secret: String,

    // Upstream service URLs
    pub auth_service_url: String,
    pub web_bff_url: String,
    pub personal_service_url: String,

    // OpenTelemetry settings
    pub otel_enabled: bool,
    pub otel_endpoint: String,
    pub otel_service_name: String,

    // Rate limiting
    pub rate_limit_requests_per_minute: u32,
    pub rate_limit_burst: u32,

    // Performance settings
    pub request_timeout_secs: u64,
    pub shutdown_timeout_secs: u64,
    pub connection_pool_size: usize,

    // CORS settings
    pub cors_origins: Vec<String>,
}

impl AppConfig {
    /// Load configuration from environment variables
    pub fn load() -> anyhow::Result<Self> {
        Ok(Self {
            // Server
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "4000".to_string())
                .parse()?,

            // JWT
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-change-in-production".to_string()),

            // Upstream services
            auth_service_url: env::var("AUTH_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:4001".to_string()),
            web_bff_url: env::var("WEB_BFF_URL")
                .unwrap_or_else(|_| "http://localhost:4010".to_string()),
            personal_service_url: env::var("PERSONAL_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:4002".to_string()),

            // OpenTelemetry
            otel_enabled: env::var("OTEL_ENABLED")
                .unwrap_or_else(|_| "false".to_string())
                .parse()
                .unwrap_or(false),
            otel_endpoint: env::var("OTEL_EXPORTER_OTLP_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:4317".to_string()),
            otel_service_name: env::var("OTEL_SERVICE_NAME")
                .unwrap_or_else(|_| "api-gateway".to_string()),

            // Rate limiting
            rate_limit_requests_per_minute: env::var("RATE_LIMIT_REQUESTS_PER_MINUTE")
                .unwrap_or_else(|_| "1000".to_string())
                .parse()?,
            rate_limit_burst: env::var("RATE_LIMIT_BURST")
                .unwrap_or_else(|_| "100".to_string())
                .parse()?,

            // Performance
            request_timeout_secs: env::var("REQUEST_TIMEOUT_SECS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()?,
            shutdown_timeout_secs: env::var("SHUTDOWN_TIMEOUT_SECS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()?,
            connection_pool_size: env::var("CONNECTION_POOL_SIZE")
                .unwrap_or_else(|_| "100".to_string())
                .parse()?,

            // CORS
            cors_origins: env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:3000".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
        })
    }

    /// Check if running in production mode
    pub fn is_production(&self) -> bool {
        env::var("RUST_ENV")
            .map(|v| v == "production")
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        // Clear any existing env vars
        env::remove_var("PORT");
        env::remove_var("JWT_SECRET");

        let config = AppConfig::load().unwrap();

        assert_eq!(config.port, 4000);
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.auth_service_url, "http://localhost:4001");
    }
}
