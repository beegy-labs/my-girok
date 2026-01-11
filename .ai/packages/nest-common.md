# @my-girok/nest-common

> Shared NestJS utilities for microservices | **Last Updated**: 2026-01-11

## Key Exports

| Category   | Exports                                                      |
| ---------- | ------------------------------------------------------------ |
| App Setup  | `configureApp`, `HealthModule`, `GracefulShutdownService`    |
| Auth       | `JwtAuthGuard`, `JwtStrategy`, `@Public()`, `@CurrentUser()` |
| Database   | `@Transactional()`, `getPrismaClient`, `uuidv7Extension`     |
| ID         | `ID.generate()`, `UUIDv7`, `ParseUUIDv7Pipe`                 |
| Cache      | `CacheKey`, `CacheTTL`                                       |
| gRPC       | `IdentityGrpcClient`, `AuthGrpcClient`, `LegalGrpcClient`    |
| ClickHouse | `ClickHouseModule`, `createQueryBuilder`                     |
| OTEL       | `initOtel`, `shutdownOtel`                                   |
| Logging    | `PinoLoggerModule`, `createPinoHttpConfig`                   |
| Rate Limit | `RateLimitModule`, `@Throttle()`, `@SkipThrottle()`          |
| Resilience | `CircuitBreaker`                                             |
| PII        | `maskEmail`, `maskPhone`, `maskObject`                       |

**SSOT**: `docs/llm/packages/nest-common.md`
