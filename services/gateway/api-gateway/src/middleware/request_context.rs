//! Request Context Middleware
//!
//! Extracts and forwards request context headers to downstream services:
//! - Client IP (X-Forwarded-For, X-Real-IP)
//! - Request ID (X-Request-Id)
//! - Device/Browser info (X-Device-Type, X-User-Agent)
//! - Protocol info (X-Forwarded-Proto, X-Forwarded-Host)

use axum::{
    extract::{ConnectInfo, Request},
    http::{header, HeaderMap, HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use std::net::SocketAddr;
use uuid::Uuid;

/// Standard forwarding header names
pub mod headers {
    use axum::http::HeaderName;

    pub const X_FORWARDED_FOR: HeaderName = HeaderName::from_static("x-forwarded-for");
    pub const X_REAL_IP: HeaderName = HeaderName::from_static("x-real-ip");
    pub const X_REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");
    pub const X_FORWARDED_PROTO: HeaderName = HeaderName::from_static("x-forwarded-proto");
    pub const X_FORWARDED_HOST: HeaderName = HeaderName::from_static("x-forwarded-host");
    pub const X_DEVICE_TYPE: HeaderName = HeaderName::from_static("x-device-type");
    pub const X_USER_AGENT: HeaderName = HeaderName::from_static("x-user-agent");
    pub const X_ACCEPT_LANGUAGE: HeaderName = HeaderName::from_static("x-accept-language");
    pub const X_GATEWAY_TIMESTAMP: HeaderName = HeaderName::from_static("x-gateway-timestamp");
}

/// Request context extracted from incoming request
#[derive(Debug, Clone)]
pub struct RequestContext {
    /// Client IP address (from X-Forwarded-For or direct connection)
    pub client_ip: String,
    /// Unique request ID for distributed tracing
    pub request_id: String,
    /// Original User-Agent header
    pub user_agent: Option<String>,
    /// Detected device type (desktop, mobile, tablet, bot)
    pub device_type: DeviceType,
    /// Accept-Language header for i18n
    pub accept_language: Option<String>,
    /// Original host header
    pub host: Option<String>,
    /// Protocol (http/https)
    pub protocol: String,
    /// Gateway processing timestamp (Unix ms)
    pub timestamp: i64,
}

/// Device type detected from User-Agent
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceType {
    Desktop,
    Mobile,
    Tablet,
    Bot,
    Unknown,
}

impl DeviceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeviceType::Desktop => "desktop",
            DeviceType::Mobile => "mobile",
            DeviceType::Tablet => "tablet",
            DeviceType::Bot => "bot",
            DeviceType::Unknown => "unknown",
        }
    }
}

impl RequestContext {
    /// Extract request context from incoming request headers and connection info
    pub fn from_request(headers: &HeaderMap, connect_info: Option<SocketAddr>) -> Self {
        let client_ip = extract_client_ip(headers, connect_info);
        let request_id = extract_or_generate_request_id(headers);
        let user_agent = extract_header_string(headers, header::USER_AGENT);
        let device_type = detect_device_type(user_agent.as_deref());
        let accept_language = extract_header_string(headers, header::ACCEPT_LANGUAGE);
        let host = extract_header_string(headers, header::HOST);
        let protocol = extract_protocol(headers);
        let timestamp = chrono::Utc::now().timestamp_millis();

        Self {
            client_ip,
            request_id,
            user_agent,
            device_type,
            accept_language,
            host,
            protocol,
            timestamp,
        }
    }

    /// Convert context to headers for forwarding to upstream services
    pub fn to_forwarding_headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();

        // IP headers
        if let Ok(value) = HeaderValue::from_str(&self.client_ip) {
            headers.insert(headers::X_FORWARDED_FOR, value.clone());
            headers.insert(headers::X_REAL_IP, value);
        }

        // Request ID
        if let Ok(value) = HeaderValue::from_str(&self.request_id) {
            headers.insert(headers::X_REQUEST_ID, value);
        }

        // Device type
        if let Ok(value) = HeaderValue::from_str(self.device_type.as_str()) {
            headers.insert(headers::X_DEVICE_TYPE, value);
        }

        // User-Agent (forwarded)
        if let Some(ref ua) = self.user_agent {
            if let Ok(value) = HeaderValue::from_str(ua) {
                headers.insert(headers::X_USER_AGENT, value);
            }
        }

        // Accept-Language
        if let Some(ref lang) = self.accept_language {
            if let Ok(value) = HeaderValue::from_str(lang) {
                headers.insert(headers::X_ACCEPT_LANGUAGE, value);
            }
        }

        // Host
        if let Some(ref host) = self.host {
            if let Ok(value) = HeaderValue::from_str(host) {
                headers.insert(headers::X_FORWARDED_HOST, value);
            }
        }

        // Protocol
        if let Ok(value) = HeaderValue::from_str(&self.protocol) {
            headers.insert(headers::X_FORWARDED_PROTO, value);
        }

        // Gateway timestamp
        if let Ok(value) = HeaderValue::from_str(&self.timestamp.to_string()) {
            headers.insert(headers::X_GATEWAY_TIMESTAMP, value);
        }

        headers
    }
}

/// Extract client IP from headers or connection info
/// Priority: X-Forwarded-For > X-Real-IP > Connection IP
fn extract_client_ip(headers: &HeaderMap, connect_info: Option<SocketAddr>) -> String {
    // Check X-Forwarded-For first (may contain chain of proxies)
    if let Some(xff) = headers.get(headers::X_FORWARDED_FOR) {
        if let Ok(xff_str) = xff.to_str() {
            // Take the first IP (original client)
            if let Some(first_ip) = xff_str.split(',').next() {
                let ip = first_ip.trim();
                if !ip.is_empty() {
                    return ip.to_string();
                }
            }
        }
    }

    // Check X-Real-IP
    if let Some(real_ip) = headers.get(headers::X_REAL_IP) {
        if let Ok(ip_str) = real_ip.to_str() {
            let ip = ip_str.trim();
            if !ip.is_empty() {
                return ip.to_string();
            }
        }
    }

    // Fall back to connection IP
    connect_info
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

/// Extract or generate request ID
fn extract_or_generate_request_id(headers: &HeaderMap) -> String {
    // Check if request already has an ID
    if let Some(existing_id) = headers.get(headers::X_REQUEST_ID) {
        if let Ok(id_str) = existing_id.to_str() {
            if !id_str.is_empty() {
                return id_str.to_string();
            }
        }
    }

    // Generate new UUID v4
    Uuid::new_v4().to_string()
}

/// Extract header value as String
fn extract_header_string(headers: &HeaderMap, name: HeaderName) -> Option<String> {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract protocol from headers
fn extract_protocol(headers: &HeaderMap) -> String {
    // Check X-Forwarded-Proto first
    if let Some(proto) = headers.get(headers::X_FORWARDED_PROTO) {
        if let Ok(proto_str) = proto.to_str() {
            return proto_str.to_lowercase();
        }
    }

    // Default to https in production, http otherwise
    "https".to_string()
}

/// Detect device type from User-Agent string
fn detect_device_type(user_agent: Option<&str>) -> DeviceType {
    let ua = match user_agent {
        Some(ua) => ua.to_lowercase(),
        None => return DeviceType::Unknown,
    };

    // Check for bots first
    if ua.contains("bot")
        || ua.contains("crawler")
        || ua.contains("spider")
        || ua.contains("googlebot")
        || ua.contains("bingbot")
        || ua.contains("slurp")
        || ua.contains("duckduckbot")
        || ua.contains("baiduspider")
        || ua.contains("yandexbot")
        || ua.contains("facebookexternalhit")
        || ua.contains("twitterbot")
        || ua.contains("linkedinbot")
    {
        return DeviceType::Bot;
    }

    // Check for tablets (before mobile, as tablets may contain "mobile")
    if ua.contains("ipad")
        || ua.contains("tablet")
        || (ua.contains("android") && !ua.contains("mobile"))
    {
        return DeviceType::Tablet;
    }

    // Check for mobile devices
    if ua.contains("mobile")
        || ua.contains("iphone")
        || ua.contains("ipod")
        || ua.contains("android")
        || ua.contains("blackberry")
        || ua.contains("windows phone")
        || ua.contains("opera mini")
        || ua.contains("opera mobi")
    {
        return DeviceType::Mobile;
    }

    // Default to desktop for browsers
    if ua.contains("mozilla")
        || ua.contains("chrome")
        || ua.contains("safari")
        || ua.contains("firefox")
        || ua.contains("edge")
        || ua.contains("opera")
    {
        return DeviceType::Desktop;
    }

    DeviceType::Unknown
}

/// Middleware that extracts request context and adds it to request extensions
pub async fn request_context_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    mut request: Request,
    next: Next,
) -> Response {
    // Extract context from request
    let context = RequestContext::from_request(request.headers(), Some(addr));

    // Log request context for tracing
    tracing::info!(
        request_id = %context.request_id,
        client_ip = %context.client_ip,
        device_type = %context.device_type.as_str(),
        user_agent = ?context.user_agent,
        "Incoming request"
    );

    // Store context in request extensions for later use
    request.extensions_mut().insert(context.clone());

    // Add forwarding headers to the request
    let forwarding_headers = context.to_forwarding_headers();
    for (key, value) in forwarding_headers.iter() {
        request.headers_mut().insert(key.clone(), value.clone());
    }

    // Record metrics
    metrics::counter!(
        "gateway_requests_by_device",
        "device_type" => context.device_type.as_str().to_string()
    )
    .increment(1);

    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn test_extract_client_ip_from_xff() {
        let mut headers = HeaderMap::new();
        headers.insert(
            headers::X_FORWARDED_FOR,
            HeaderValue::from_static("203.0.113.195, 70.41.3.18, 150.172.238.178"),
        );

        let ip = extract_client_ip(&headers, None);
        assert_eq!(ip, "203.0.113.195");
    }

    #[test]
    fn test_extract_client_ip_from_real_ip() {
        let mut headers = HeaderMap::new();
        headers.insert(
            headers::X_REAL_IP,
            HeaderValue::from_static("192.168.1.100"),
        );

        let ip = extract_client_ip(&headers, None);
        assert_eq!(ip, "192.168.1.100");
    }

    #[test]
    fn test_extract_client_ip_from_connection() {
        let headers = HeaderMap::new();
        let addr: SocketAddr = "10.0.0.1:12345".parse().unwrap();

        let ip = extract_client_ip(&headers, Some(addr));
        assert_eq!(ip, "10.0.0.1");
    }

    #[test]
    fn test_extract_client_ip_xff_priority_over_real_ip() {
        let mut headers = HeaderMap::new();
        headers.insert(
            headers::X_FORWARDED_FOR,
            HeaderValue::from_static("1.2.3.4"),
        );
        headers.insert(headers::X_REAL_IP, HeaderValue::from_static("5.6.7.8"));

        let ip = extract_client_ip(&headers, None);
        assert_eq!(ip, "1.2.3.4");
    }

    #[test]
    fn test_extract_or_generate_request_id_existing() {
        let mut headers = HeaderMap::new();
        headers.insert(
            headers::X_REQUEST_ID,
            HeaderValue::from_static("existing-id-123"),
        );

        let id = extract_or_generate_request_id(&headers);
        assert_eq!(id, "existing-id-123");
    }

    #[test]
    fn test_extract_or_generate_request_id_new() {
        let headers = HeaderMap::new();
        let id = extract_or_generate_request_id(&headers);

        // Should be a valid UUID
        assert!(Uuid::parse_str(&id).is_ok());
    }

    #[test]
    fn test_detect_device_type_mobile() {
        assert_eq!(
            detect_device_type(Some(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
            )),
            DeviceType::Mobile
        );
        assert_eq!(
            detect_device_type(Some(
                "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36"
            )),
            DeviceType::Mobile
        );
    }

    #[test]
    fn test_detect_device_type_tablet() {
        assert_eq!(
            detect_device_type(Some(
                "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
            )),
            DeviceType::Tablet
        );
        assert_eq!(
            detect_device_type(Some(
                "Mozilla/5.0 (Linux; Android 10; SM-T860) AppleWebKit/537.36"
            )),
            DeviceType::Tablet
        );
    }

    #[test]
    fn test_detect_device_type_desktop() {
        assert_eq!(
            detect_device_type(Some(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0"
            )),
            DeviceType::Desktop
        );
        assert_eq!(
            detect_device_type(Some(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15"
            )),
            DeviceType::Desktop
        );
    }

    #[test]
    fn test_detect_device_type_bot() {
        assert_eq!(
            detect_device_type(Some("Googlebot/2.1 (+http://www.google.com/bot.html)")),
            DeviceType::Bot
        );
        assert_eq!(
            detect_device_type(Some("facebookexternalhit/1.1")),
            DeviceType::Bot
        );
        assert_eq!(
            detect_device_type(Some("Twitterbot/1.0")),
            DeviceType::Bot
        );
    }

    #[test]
    fn test_detect_device_type_unknown() {
        assert_eq!(detect_device_type(None), DeviceType::Unknown);
        assert_eq!(detect_device_type(Some("")), DeviceType::Unknown);
        assert_eq!(detect_device_type(Some("custom-client/1.0")), DeviceType::Unknown);
    }

    #[test]
    fn test_request_context_to_forwarding_headers() {
        let context = RequestContext {
            client_ip: "192.168.1.100".to_string(),
            request_id: "test-request-id".to_string(),
            user_agent: Some("Mozilla/5.0 Chrome/91.0".to_string()),
            device_type: DeviceType::Desktop,
            accept_language: Some("en-US,en;q=0.9".to_string()),
            host: Some("api.example.com".to_string()),
            protocol: "https".to_string(),
            timestamp: 1234567890,
        };

        let headers = context.to_forwarding_headers();

        assert_eq!(
            headers.get(headers::X_FORWARDED_FOR).unwrap(),
            "192.168.1.100"
        );
        assert_eq!(headers.get(headers::X_REAL_IP).unwrap(), "192.168.1.100");
        assert_eq!(headers.get(headers::X_REQUEST_ID).unwrap(), "test-request-id");
        assert_eq!(headers.get(headers::X_DEVICE_TYPE).unwrap(), "desktop");
        assert_eq!(
            headers.get(headers::X_USER_AGENT).unwrap(),
            "Mozilla/5.0 Chrome/91.0"
        );
        assert_eq!(
            headers.get(headers::X_ACCEPT_LANGUAGE).unwrap(),
            "en-US,en;q=0.9"
        );
        assert_eq!(
            headers.get(headers::X_FORWARDED_HOST).unwrap(),
            "api.example.com"
        );
        assert_eq!(headers.get(headers::X_FORWARDED_PROTO).unwrap(), "https");
        assert_eq!(
            headers.get(headers::X_GATEWAY_TIMESTAMP).unwrap(),
            "1234567890"
        );
    }

    #[test]
    fn test_request_context_from_request() {
        let mut headers = HeaderMap::new();
        headers.insert(
            headers::X_FORWARDED_FOR,
            HeaderValue::from_static("203.0.113.195"),
        );
        headers.insert(
            header::USER_AGENT,
            HeaderValue::from_static("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)"),
        );
        headers.insert(
            header::ACCEPT_LANGUAGE,
            HeaderValue::from_static("ko-KR,ko;q=0.9"),
        );
        headers.insert(header::HOST, HeaderValue::from_static("api.girok.dev"));

        let addr: SocketAddr = "10.0.0.1:12345".parse().unwrap();
        let context = RequestContext::from_request(&headers, Some(addr));

        assert_eq!(context.client_ip, "203.0.113.195");
        assert_eq!(context.device_type, DeviceType::Mobile);
        assert_eq!(
            context.user_agent,
            Some("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)".to_string())
        );
        assert_eq!(context.accept_language, Some("ko-KR,ko;q=0.9".to_string()));
        assert_eq!(context.host, Some("api.girok.dev".to_string()));
    }
}
