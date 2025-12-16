# ===========================================
# API Gateway Dockerfile
# Multi-stage build for minimal image size
# ===========================================

# Build stage
FROM rust:1.83-bookworm AS builder

WORKDIR /app

# Install dependencies for OpenSSL (if needed)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first for better layer caching
COPY Cargo.toml Cargo.lock* ./

# Create dummy src to build dependencies
RUN mkdir src && \
    echo 'fn main() { println!("Dummy"); }' > src/main.rs

# Build dependencies only
RUN cargo build --release && \
    rm -rf src target/release/deps/api_gateway*

# Copy actual source code
COPY src ./src

# Build the actual application
RUN cargo build --release

# ===========================================
# Runtime stage
# ===========================================
FROM debian:bookworm-slim AS runtime

# Install CA certificates for HTTPS
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -u 1001 -g root gateway

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/api-gateway /usr/local/bin/api-gateway

# Set ownership
RUN chown -R gateway:root /app

# Switch to non-root user
USER gateway

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/health/live || exit 1

# Run the gateway
ENTRYPOINT ["api-gateway"]
