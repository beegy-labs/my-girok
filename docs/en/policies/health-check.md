# Health Check Architecture

> Kubernetes-compatible health check implementation guide

## Overview

Health checks are essential for Kubernetes to manage pod lifecycle effectively. This guide covers the implementation strategy based on Kubernetes official documentation and 2026 best practices.

## Key Principles

### 1. Liveness Probe: Never Check Dependencies

**Critical Rule**: Liveness probes should NEVER check external dependencies.

| Wrong                      | Correct                     |
| -------------------------- | --------------------------- |
| Check database in liveness | Check database in readiness |
| Check cache in liveness    | Check cache in readiness    |
| Check Kafka in liveness    | Monitor Kafka separately    |

**Why is this critical?**

- If Redis is down, restarting your pod won't fix Redis
- Can cause cascading failures across all services
- Kubernetes will keep restarting pods indefinitely

The liveness probe should only check if the process itself is healthy and can respond to requests.

### 2. Readiness Probe: Critical Dependencies Only

Readiness determines if the pod should receive traffic. Only check dependencies that are essential for the service to function.

| Dependency   |    Critical?    | Rationale                                  |
| ------------ | :-------------: | ------------------------------------------ |
| PostgreSQL   |       Yes       | Most APIs require DB                       |
| ClickHouse   | Yes (analytics) | Core function for analytics/audit services |
| Valkey/Redis |       No        | Cache miss fallback expected               |
| Kafka        |       No        | Async processing with retry/buffer         |

### 3. Startup Probe: Slow-Starting Applications

NestJS applications need time to:

- Initialize dependency injection container
- Connect to databases
- Warm up caches
- Load configuration

Use startup probe to prevent premature liveness checks during initialization.

## Endpoints

| Endpoint          | Purpose                 | Dependency Checks | K8s Probe      |
| ----------------- | ----------------------- | :---------------: | -------------- |
| `/health/live`    | Process alive           |        No         | livenessProbe  |
| `/health/startup` | Initialization complete |        No         | startupProbe   |
| `/health/ready`   | Ready for traffic       |   Critical only   | readinessProbe |
| `/health`         | Monitoring dashboard    |  All indicators   | -              |

## Response Formats

### Liveness Response

Simple, fast response with no external checks:

```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00Z",
  "uptime": 3600
}
```

### Readiness Response

Includes critical dependency status:

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

Full status for monitoring dashboards:

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

### Status Meanings

| Status      | Meaning                      |
| ----------- | ---------------------------- |
| `healthy`   | All checks passing           |
| `degraded`  | Non-critical dependency down |
| `unhealthy` | Critical dependency down     |

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
        failureThreshold: 30 # 30 × 10s = 300s max startup time

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

### Configuration Explained

- **startupProbe**: Allows up to 5 minutes (30 × 10s) for application to start
- **livenessProbe**: Checks every 30s, restarts after 3 failures (90s)
- **readinessProbe**: Checks every 10s, removes from service after 3 failures, requires 2 successes to re-add

## Decision Flowchart

```
Is the process running and responding?
├── No → livenessProbe fails → Kubernetes restarts pod
└── Yes → Check critical dependencies
          ├── Critical dependency down → readinessProbe fails → No traffic
          └── All critical up → readinessProbe passes → Receive traffic
```

## Related Documentation

- Implementation Details: `docs/en/policies/health-check-implementation.md`
- [Kubernetes Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)

---

_This document is auto-generated from `docs/llm/policies/health-check.md`_
