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

```yaml
# BAD - Can cause cascading failures
livenessProbe:
  httpGet:
    path: /health  # Checks database

# GOOD - Only checks process
livenessProbe:
  httpGet:
    path: /health/live  # No dependency checks
```

### 2. Readiness Probe: Critical Dependencies Only

Readiness determines if the pod should receive traffic.

| Dependency   |    Critical?    | Rationale                                  |
| ------------ | :-------------: | ------------------------------------------ |
| PostgreSQL   |       Yes       | Most APIs require DB                       |
| ClickHouse   | Yes (analytics) | Core function for analytics/audit services |
| Valkey/Redis |       No        | Cache miss fallback expected               |
| Kafka        |       No        | Async processing with retry/buffer         |

### 3. Startup Probe: Slow-Starting Applications

NestJS applications need time to:

- Initialize dependency injection
- Connect to databases
- Warm up caches

Use startup probe to prevent premature liveness checks.

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

**Status Meanings:**

- `healthy`: All indicators up
- `degraded`: Non-critical indicators down (service operational)
- `unhealthy`: Critical indicators down

## Kubernetes Configuration

```yaml
spec:
  containers:
    - name: app
      # Startup probe - Wait for initialization (max 300s)
      startupProbe:
        httpGet:
          path: /health/startup
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 10
        failureThreshold: 30 # 30 × 10s = 300s max

      # Liveness probe - Process check only (NO dependencies!)
      livenessProbe:
        httpGet:
          path: /health/live
          port: 3000
        periodSeconds: 30
        failureThreshold: 3

      # Readiness probe - Critical dependencies
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 3000
        periodSeconds: 10
        failureThreshold: 3
        successThreshold: 2 # Stability: 2 consecutive successes
```

## Service Configuration Matrix

| Service               | PostgreSQL | Valkey  | ClickHouse |  Kafka  |
| --------------------- | :--------: | :-----: | :--------: | :-----: |
| auth-service          |  Critical  | Monitor |     -      | Monitor |
| personal-service      |  Critical  | Monitor |     -      |    -    |
| analytics-service     |     -      | Monitor |  Critical  |    -    |
| audit-service         |     -      | Monitor |  Critical  |    -    |
| identity-service      |  Critical  | Monitor |     -      | Monitor |
| auth-bff              |     -      | Monitor |     -      |    -    |
| authorization-service |  Critical  |    -    |     -      |    -    |
| legal-service         |  Critical  |    -    |     -      |    -    |

**Critical**: Fails readiness probe
**Monitor**: Shows in `/health`, doesn't fail readiness

## Implementation

### Using HealthModule (nest-common)

```typescript
import {
  HealthModule,
  PostgresHealthIndicator,
  ValkeyHealthIndicator,
  HEALTH_INDICATORS,
} from '@my-girok/nest-common';

@Module({
  imports: [HealthModule],
  providers: [
    // Register indicators
    {
      provide: HEALTH_INDICATORS,
      useFactory: (prisma: PrismaService, cache: CacheService) => [
        new PostgresHealthIndicator(prisma),
        new ValkeyHealthIndicator(cache, { critical: false }),
      ],
      inject: [PrismaService, CacheService],
    },
  ],
})
export class AppModule {}
```

### Custom Health Indicator

```typescript
import { HealthIndicator, HealthCheckResult } from '@my-girok/nest-common';

export class CustomIndicator implements HealthIndicator {
  readonly name = 'custom-service';
  readonly critical = false; // Set based on service criticality

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Your health check logic
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error.message,
      };
    }
  }
}
```

## Graceful Shutdown

The health module handles SIGTERM gracefully:

1. K8s sends SIGTERM
2. Readiness probe starts returning 503
3. K8s stops routing new traffic
4. In-flight requests complete
5. Pod terminates

```typescript
// Automatic via GracefulShutdownService
// Manual control if needed:
@Injectable()
export class MyService {
  constructor(private shutdown: GracefulShutdownService) {}

  async maintenanceMode() {
    this.shutdown.markNotReady();
    // ... do maintenance ...
    this.shutdown.markReady();
  }
}
```

## Anti-Patterns

### DON'T

```typescript
// DON'T check dependencies in liveness
@Get('live')
async live() {
  await this.db.query('SELECT 1'); // WRONG!
  return { status: 'ok' };
}

// DON'T fail readiness for non-critical services
async isReady() {
  const redis = await this.redis.ping();
  if (!redis) throw new Error(); // WRONG for cache!
}
```

### DO

```typescript
// DO keep liveness simple
@Get('live')
live() {
  return { status: 'ok' };  // Just respond
}

// DO use graceful degradation
async isReady() {
  const db = await this.db.ping();
  if (!db) throw new Error();  // DB is critical
  // Redis failure? Log warning, continue
}
```

## References

- [Kubernetes Liveness, Readiness, Startup Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [NestJS Terminus Documentation](https://docs.nestjs.com/recipes/terminus)
- [Microservices Health Check Pattern](https://microservices.io/patterns/observability/health-check-api.html)
