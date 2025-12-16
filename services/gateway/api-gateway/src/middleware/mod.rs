//! Gateway middleware
//!
//! Middleware for request context extraction, authentication, rate limiting, and tracing.

pub mod request_context;

pub use request_context::{
    request_context_middleware, DeviceType, RequestContext,
    headers as context_headers,
};

// TODO: Implement additional middleware (future issues)
// - auth.rs: JWT authentication middleware (Issue #260)
// - rate_limit.rs: Rate limiting with governor (Issue #263)
// - tracing.rs: Request tracing middleware (Issue #261)
