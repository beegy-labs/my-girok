# Health Check Implementation

> Service configuration, code examples, graceful shutdown, and anti-patterns

## Overview

This document provides implementation details for health checks across all services, including code examples, service-specific configurations, and common mistakes to avoid.

## Service Configuration Matrix

Each service has different critical dependencies:

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

**Legend**:

- **Critical**: Fails readiness probe when down
- **Monitor**: Shows in `/health` endpoint, doesn't fail readiness

## Implementation

### Using HealthModule (nest-common)

The `@my-girok/nest-common` package provides a reusable health module:

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

Create custom indicators for service-specific dependencies:

```typescript
import { HealthIndicator, HealthCheckResult } from '@my-girok/nest-common';

export class CustomIndicator implements HealthIndicator {
  readonly name = 'custom-service';
  readonly critical = false;

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Your health check logic here
      await this.externalService.ping();
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

The health module handles SIGTERM gracefully to ensure zero-downtime deployments:

### Shutdown Sequence

1. Kubernetes sends SIGTERM
2. Readiness probe starts returning 503
3. Kubernetes stops routing new traffic
4. In-flight requests complete
5. Pod terminates

### Manual Control

For maintenance scenarios, you can manually control readiness:

```typescript
@Injectable()
export class MyService {
  constructor(private shutdown: GracefulShutdownService) {}

  async maintenanceMode() {
    // Mark as not ready - stops receiving traffic
    this.shutdown.markNotReady();

    // Perform maintenance tasks
    await this.performMaintenance();

    // Mark as ready - resume traffic
    this.shutdown.markReady();
  }
}
```

## Anti-Patterns

### DON'T: Check Dependencies in Liveness

```typescript
// ❌ WRONG - Never check dependencies in liveness
@Get('live')
async live() {
  await this.db.query('SELECT 1');  // This causes cascading failures!
  return { status: 'ok' };
}

// ❌ WRONG - Fail readiness for non-critical services
async isReady() {
  const redis = await this.redis.ping();
  if (!redis) throw new Error();  // Cache shouldn't fail readiness!
}
```

### DO: Keep Liveness Simple

```typescript
// ✅ CORRECT - Liveness just confirms process is running
@Get('live')
live() {
  return { status: 'ok' };  // Just respond, nothing else
}

// ✅ CORRECT - Only fail for critical dependencies
async isReady() {
  const db = await this.db.ping();
  if (!db) throw new Error();  // DB is critical - fail readiness

  // Redis failure? Log warning but continue
  const redis = await this.redis.ping();
  if (!redis) {
    this.logger.warn('Redis unavailable, operating in degraded mode');
  }

  return { status: 'ready' };
}
```

## Testing Health Endpoints

### Local Testing

```bash
# Test liveness
curl http://localhost:3000/health/live

# Test readiness
curl http://localhost:3000/health/ready

# Full health status
curl http://localhost:3000/health
```

### Integration Tests

```typescript
describe('HealthController', () => {
  it('liveness returns ok without checking dependencies', async () => {
    // Stop database
    await testDb.stop();

    // Liveness should still pass
    const response = await app.inject({ url: '/health/live' });
    expect(response.statusCode).toBe(200);
  });

  it('readiness fails when critical dependency is down', async () => {
    await testDb.stop();

    const response = await app.inject({ url: '/health/ready' });
    expect(response.statusCode).toBe(503);
  });
});
```

## Monitoring and Alerts

### Prometheus Metrics

The health module exposes metrics:

```promql
# Pod readiness state
kube_pod_status_ready{pod=~"auth-service.*"} == 0

# Health check latency
health_check_latency_ms{service="auth-service", check="postgres"}
```

### Alert Rules

```yaml
- alert: ServiceNotReady
  expr: kube_pod_status_ready{namespace="production"} == 0
  for: 5m
  annotations:
    summary: 'Pod {{ $labels.pod }} is not ready'
```

## References

- [Kubernetes Liveness, Readiness, Startup Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [NestJS Terminus Documentation](https://docs.nestjs.com/recipes/terminus)
- [Microservices Health Check Pattern](https://microservices.io/patterns/observability/health-check-api.html)
- Main Architecture: `docs/en/policies/health-check.md`

---

_This document is auto-generated from `docs/llm/policies/health-check-implementation.md`_
