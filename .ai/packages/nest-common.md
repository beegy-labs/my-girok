# @my-girok/nest-common

> **Shared NestJS utilities for all backend microservices**

## Purpose

Provides standardized utilities for authentication, error handling, health checks, and application bootstrap. Eliminates code duplication across services.

## Installation

```typescript
// Already included in workspace - just import
import {
  configureApp,
  JwtAuthGuard,
  JwtStrategy,
  CurrentUser,
  Public,
  HttpExceptionFilter,
  HealthModule,
  GracefulShutdownService,
} from '@my-girok/nest-common';
```

## Quick Start

### Bootstrap (main.ts)

```typescript
import { NestFactory } from '@nestjs/core';
import { configureApp } from '@my-girok/nest-common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    serviceName: 'My Service',
    description: 'Service description',
    defaultPort: 4000,
    swaggerTags: [
      { name: 'users', description: 'User endpoints' },
    ],
  });
}

bootstrap();
```

### AppModule Setup

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import {
  JwtAuthGuard,
  JwtStrategy,
  HttpExceptionFilter,
  HealthModule,
} from '@my-girok/nest-common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({ /* ... */ }),
    HealthModule, // Adds /health, /health/live, /health/ready
    // ... your modules
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
```

## API Reference

### Decorators

#### `@Public()`
Mark endpoint as public (skip JWT auth).

```typescript
@Public()
@Get('status')
getStatus() { return { ok: true }; }
```

#### `@CurrentUser()`
Extract authenticated user from request.

```typescript
@Get('me')
getProfile(@CurrentUser() user: any) {
  return user; // { id, email, role }
}
```

### Guards

#### `JwtAuthGuard`
Global JWT authentication guard. Respects `@Public()` decorator.

### Filters

#### `HttpExceptionFilter`
Standardized error response format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["email must be valid"]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/v1/users",
    "statusCode": 400
  }
}
```

### Health Module

#### Endpoints
- `GET /health` - General health check
- `GET /health/live` - Liveness probe (K8s)
- `GET /health/ready` - Readiness probe (K8s, returns 503 during shutdown)

#### `GracefulShutdownService`
Manages K8s graceful shutdown:

```typescript
// Inject if you need manual control
constructor(private shutdown: GracefulShutdownService) {}

// Check readiness
if (this.shutdown.isServiceReady()) { /* ... */ }

// Manual control
this.shutdown.markNotReady();
this.shutdown.markReady();
```

### Bootstrap Factory

#### `configureApp(app, config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serviceName` | string | required | Service name for logs/Swagger |
| `description` | string | required | Swagger description |
| `defaultPort` | number | 3000 | Port if PORT env not set |
| `swaggerTags` | array | [] | Swagger tag definitions |
| `enableSwagger` | boolean | true | Enable Swagger docs |
| `enableCors` | boolean | true | Enable CORS |
| `enableGracefulShutdown` | boolean | true | Enable SIGTERM handling |
| `shutdownTimeout` | number | 30000 | Shutdown timeout (ms) |
| `excludeFromPrefix` | string[] | ['health'] | Paths without /v1 prefix |

## Graceful Shutdown Flow

```
1. K8s sends SIGTERM
2. Service marks NOT ready (/health/ready → 503)
3. K8s stops routing traffic
4. Wait 5s for traffic to drain
5. Complete in-flight requests
6. Close connections
7. Exit 0
```

## Common Patterns

### Protected vs Public Endpoints

```typescript
@Controller('users')
export class UsersController {
  // Protected by default (JwtAuthGuard is global)
  @Get('me')
  getProfile(@CurrentUser() user: any) { /* ... */ }

  // Explicitly public
  @Public()
  @Get(':id/public')
  getPublicProfile(@Param('id') id: string) { /* ... */ }
}
```

### Custom JWT Strategy (auth-service)

If you need custom validation (e.g., check user exists in DB):

```typescript
// Don't import JwtStrategy from nest-common
// Create your own:
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `PORT` | No | config.defaultPort | Server port |
| `NODE_ENV` | No | development | Environment |
| `CORS_ORIGINS` | No | - | Comma-separated origins |
