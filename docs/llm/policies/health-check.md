# Health Check Architecture

> Kubernetes-compatible health check implementation following 2025-2026 best practices | **Last Updated**: 2026-01-15

## Overview

Health checks are essential for Kubernetes to manage pod lifecycle. This guide covers the implementation strategy based on Kubernetes official documentation and industry best practices.

## Key Principles

### 1. Liveness Probe: Never Check Dependencies

**Critical Rule**: Liveness probes should NEVER check external dependencies.

| Wrong                      | Correct                     |
| -------------------------- | --------------------------- |
| Check database in liveness | Check database in readiness |
| Check cache in liveness    | Check cache in readiness    |
| Check Kafka in liveness    | Monitor Kafka separately    |

**Why?**

- If Redis is down, restarting your pod won't fix Redis
- Can cause cascading failures across all services
- Kubernetes will keep restarting pods indefinitely

### 2. Readiness Probe: Critical Dependencies Only

Readiness determines if the pod should receive traffic.

| Dependency   |    Critical?    | Rationale                                  |
| ------------ | :-------------: | ------------------------------------------ |
| PostgreSQL   |       Yes       | Most APIs require DB                       |
| ClickHouse   | Yes (analytics) | Core function for analytics/audit services |
| Valkey/Redis |       No        | Cache miss fallback expected               |
| Kafka        |       No        | Async processing with retry/buffer         |

### 3. Startup Probe: Slow-Starting Applications

NestJS applications need time to initialize dependency injection, connect to databases, and warm up caches. Use startup probe to prevent premature liveness checks.

## Endpoints

| Endpoint          | Purpose                 | Dependency Checks | K8s Probe      |
| ----------------- | ----------------------- | :---------------: | -------------- |
| `/health/live`    | Process alive           |        No         | livenessProbe  |
| `/health/startup` | Initialization complete |        No         | startupProbe   |
| `/health/ready`   | Ready for traffic       |   Critical only   | readinessProbe |
| `/health`         | Monitoring dashboard    |  All indicators   | -              |

## Response Formats

### Liveness Response

```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00Z",
  "uptime": 3600
}
```

### Readiness Response

```json
{
  "status": "ready",
  "timestamp": "2026-01-15T10:30:00Z",
  "uptime": 3600,
  "shutdownInProgress": false,
  "checks": {
    "postgres": { "status": "up", "latencyMs": 5 }
  }
}
```

### Comprehensive Health Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T10:30:00Z",
  "uptime": 3600,
  "checks": {
    "postgres": { "status": "up", "latencyMs": 5, "critical": true },
    "valkey": { "status": "up", "latencyMs": 2, "critical": false },
    "clickhouse": { "status": "up", "latencyMs": 10, "critical": true }
  }
}
```

**Status Meanings**: `healthy` (all up), `degraded` (non-critical down), `unhealthy` (critical down)

## Kubernetes Configuration

```yaml
spec:
  containers:
    - name: app
      startupProbe:
        httpGet:
          path: /health/startup
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 10
        failureThreshold: 30 # 30 × 10s = 300s max

      livenessProbe:
        httpGet:
          path: /health/live
          port: 3000
        periodSeconds: 30
        failureThreshold: 3

      readinessProbe:
        httpGet:
          path: /health/ready
          port: 3000
        periodSeconds: 10
        failureThreshold: 3
        successThreshold: 2
```

## Related Documentation

- **Implementation & Anti-Patterns**: `health-check-implementation.md`
- [Kubernetes Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
