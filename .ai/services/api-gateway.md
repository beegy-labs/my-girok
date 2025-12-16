# API Gateway (Rust)

> High-performance centralized routing and middleware layer

## Purpose

Provides single entry point for all clients, handles cross-cutting concerns:
- **JWT Authentication**: Centralized token validation
- **Rate Limiting**: Per-IP/user request limits
- **Observability**: OpenTelemetry tracing + Prometheus metrics
- **Reverse Proxy**: Routes requests to backend services

## Tech Stack

- **Language**: Rust 1.83+
- **Framework**: Axum 0.8
- **Async Runtime**: Tokio
- **JWT**: jsonwebtoken
- **Rate Limiting**: governor
- **Tracing**: OpenTelemetry + tracing-opentelemetry
- **Metrics**: metrics-exporter-prometheus

## Architecture

```
Client → API Gateway (4000) → Web BFF (4010) → Backend Services
                ↓ (direct for auth)
           auth-service (4001)
           personal-service (4002)
```

## Directory Structure

```
services/gateway/api-gateway/
├── Cargo.toml                # Dependencies
├── .env.example              # Environment template
├── Dockerfile                # Multi-stage Rust build
├── helm/                     # Kubernetes Helm chart
└── src/
    ├── main.rs               # Axum server entry
    ├── config.rs             # Configuration
    ├── error.rs              # Error types
    ├── routes/
    │   ├── health.rs         # /health, /health/live, /health/ready
    │   └── metrics.rs        # /metrics (Prometheus)
    ├── middleware/
    │   ├── auth.rs           # JWT validation (Issue #260)
    │   ├── rate_limit.rs     # Rate limiting (Issue #263)
    │   └── tracing.rs        # Request tracing
    ├── proxy/
    │   ├── handler.rs        # Reverse proxy (Issue #262)
    │   └── routes.rs         # Route configuration
    ├── auth/
    │   ├── jwt.rs            # JWT validation
    │   └── claims.rs         # JWT claims struct
    └── observability/
        ├── tracing.rs        # OpenTelemetry setup
        └── metrics.rs        # Prometheus setup
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | General health status |
| `/health/live` | GET | K8s liveness probe |
| `/health/ready` | GET | K8s readiness probe (503 during shutdown) |
| `/metrics` | GET | Prometheus metrics |

## JWT Middleware Pattern

```rust
pub async fn jwt_middleware<B>(
    State(state): State<AppState>,
    mut request: Request<B>,
    next: Next<B>,
) -> Result<Response, AuthError> {
    // Skip validation for public routes
    if is_public_route(request.uri().path()) {
        return Ok(next.run(request).await);
    }

    // Extract and validate JWT
    let token = extract_bearer_token(&request)?;
    let claims = validate_jwt(&token, &state.jwt_secret)?;

    // Inject user headers for downstream services
    let headers = request.headers_mut();
    headers.insert("X-User-Id", claims.sub.parse()?);
    headers.insert("X-User-Email", claims.email.parse()?);
    headers.insert("X-User-Role", claims.role.parse()?);

    Ok(next.run(request).await)
}
```

## Routing Configuration

```rust
pub enum Route {
    Auth,       // /api/auth/* → auth-service:4001
    Personal,   // /api/personal/* → personal-service:4002
    WebBff,     // /api/web/* → web-bff:4010
}

pub fn route_to_upstream(path: &str) -> Route {
    if path.starts_with("/api/auth") {
        Route::Auth
    } else if path.starts_with("/api/personal") {
        Route::Personal
    } else {
        Route::WebBff
    }
}
```

## Environment Variables

```bash
# Server
RUST_LOG=info,api_gateway=debug,tower_http=debug
RUST_ENV=production
HOST=0.0.0.0
PORT=4000

# JWT (must match auth-service)
JWT_SECRET=your-jwt-secret

# Upstream Services
AUTH_SERVICE_URL=http://auth-service:4001
PERSONAL_SERVICE_URL=http://personal-service:4002
WEB_BFF_URL=http://web-bff:4010

# OpenTelemetry
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_SERVICE_NAME=api-gateway

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=1000
RATE_LIMIT_BURST=100

# Performance
REQUEST_TIMEOUT_SECS=30
SHUTDOWN_TIMEOUT_SECS=10
CONNECTION_POOL_SIZE=100

# CORS
CORS_ORIGINS=https://girok.dev,https://www.girok.dev
```

## Port Assignment

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 4000 | Single entry point |
| auth-service | 4001 | Authentication |
| personal-service | 4002 | Personal data |
| Web BFF | 4010 | Web client optimization |
| Mobile BFF | 4020 | (Future) Mobile client |

## Kubernetes Deployment

```bash
# Install Helm chart
cd services/gateway/api-gateway/helm
cp values.yaml.example values.yaml
# Edit values.yaml
helm install api-gateway . -f values.yaml -n my-girok
```

## Metrics

Prometheus metrics at `/metrics`:

- `gateway_requests_total` - Total requests by method/path/status
- `gateway_request_duration_seconds` - Request latency histogram
- `gateway_upstream_requests_total` - Requests to upstream services
- `gateway_upstream_duration_seconds` - Upstream latency
- `gateway_errors_total` - Errors by type
- `gateway_active_connections` - Active connection gauge

## Performance Characteristics

| Metric | Target |
|--------|--------|
| Latency (p50) | < 1ms overhead |
| Latency (p99) | < 5ms overhead |
| Throughput | 150k+ req/sec |
| Memory | < 50MB |
| CPU | Minimal (async I/O) |

## Security

- JWT validation at gateway (centralized)
- Rate limiting per IP/user
- Request size limits
- Request timeout (30s default)
- CORS configuration
- No secrets in logs

## Implementation Status

| Feature | Status | Issue |
|---------|--------|-------|
| Basic scaffold | ✅ Done | #259 |
| JWT middleware | 🔄 Pending | #260 |
| OpenTelemetry | 🔄 Pending | #261 |
| Reverse proxy | 🔄 Pending | #262 |
| Rate limiting | 🔄 Pending | #263 |

## Related Documentation

- **Web BFF**: `.ai/services/web-bff.md`
- **Auth Service**: `.ai/services/auth-service.md`
- **Architecture**: `.ai/architecture.md`
