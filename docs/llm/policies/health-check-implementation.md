# Health Check Implementation

> Service configuration, code examples, graceful shutdown, and anti-patterns

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

**Critical**: Fails readiness probe | **Monitor**: Shows in `/health`, doesn't fail readiness

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
  readonly critical = false;

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

---

_Main: `health-check.md`_
