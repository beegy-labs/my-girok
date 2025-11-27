# @my-girok/nest-common

> **Shared NestJS utilities and components for my-girok microservices**

## Overview

`@my-girok/nest-common` provides standardized, reusable utilities for all NestJS backend services in the my-girok monorepo. It eliminates code duplication and ensures consistent behavior across services.

### Key Features

- **Authentication**: JWT guards, strategies, and decorators
- **Error Handling**: Standardized error response format
- **Bootstrap Factory**: Simplified application setup
- **Health Checks**: Kubernetes liveness and readiness probes
- **Graceful Shutdown**: Proper SIGTERM handling for K8s

## Installation

The package is already part of the workspace. Add it to your service's `package.json`:

```json
{
  "dependencies": {
    "@my-girok/nest-common": "workspace:*"
  }
}
```

Then run `pnpm install`.

## Quick Start

### 1. Bootstrap (main.ts)

Replace ~100 lines of boilerplate with ~20 lines:

```typescript
import { NestFactory } from '@nestjs/core';
import { configureApp } from '@my-girok/nest-common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    serviceName: 'My-Girok Auth Service',
    description: 'Authentication and Authorization microservice',
    defaultPort: 4001,
    swaggerTags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'users', description: 'User management' },
    ],
  });
}

bootstrap();
```

### 2. AppModule Setup

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
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
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    HealthModule, // Provides /health, /health/live, /health/ready
    // ... your modules
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

## API Reference

### Decorators

#### `@Public()`

Marks an endpoint as public, bypassing JWT authentication.

```typescript
import { Public } from '@my-girok/nest-common';

@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

#### `@CurrentUser()`

Extracts the authenticated user from the request. Works with both HTTP and GraphQL contexts.

```typescript
import { CurrentUser } from '@my-girok/nest-common';

@Controller('users')
export class UsersController {
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    // user contains: { id, email, role }
    return this.usersService.findById(user.id);
  }
}
```

### Guards

#### `JwtAuthGuard`

Global JWT authentication guard that respects the `@Public()` decorator.

**Behavior:**
- Validates JWT token from `Authorization: Bearer <token>` header
- Returns 401 Unauthorized for invalid/expired tokens
- Skips validation for endpoints marked with `@Public()`
- Attaches user to request for `@CurrentUser()` decorator

### Strategies

#### `JwtStrategy`

Passport JWT strategy for token validation. Use this for services that only validate tokens (not issue them).

```typescript
// For auth-service: Create your own strategy that validates user in DB
// For other services: Use the provided JwtStrategy

import { JwtStrategy } from '@my-girok/nest-common';

@Module({
  providers: [JwtStrategy],
})
export class AppModule {}
```

**Custom Strategy (auth-service pattern):**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

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
    // Validate user exists in database
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### Filters

#### `HttpExceptionFilter`

Global exception filter that standardizes error responses.

**Response Format:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      "email must be a valid email address",
      "password must be at least 8 characters"
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/v1/auth/register",
    "statusCode": 400
  }
}
```

**Status Code Mapping:**

| Status | Error Code |
|--------|------------|
| 400 | BAD_REQUEST |
| 401 | UNAUTHORIZED |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 409 | CONFLICT |
| 422 | VALIDATION_ERROR |
| 500 | INTERNAL_SERVER_ERROR |
| 503 | SERVICE_UNAVAILABLE |

### Bootstrap Factory

#### `configureApp(app, config)`

Configures a NestJS application with standard settings.

**Parameters:**

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `serviceName` | string | Yes | - | Service name for logging and Swagger |
| `description` | string | Yes | - | Swagger API description |
| `version` | string | No | '1.0.0' | API version |
| `swaggerTags` | array | No | [] | Swagger tag definitions |
| `defaultPort` | number | No | 3000 | Default port if PORT env not set |
| `excludeFromPrefix` | string[] | No | ['health'] | Paths without /v1 prefix |
| `enableSwagger` | boolean | No | true | Enable Swagger documentation |
| `enableCors` | boolean | No | true | Enable CORS |
| `corsOrigins` | object | No | - | Custom CORS origins |
| `enableGracefulShutdown` | boolean | No | true | Enable SIGTERM handling |
| `shutdownTimeout` | number | No | 30000 | Shutdown timeout in ms |

**Included Features:**

1. **Global Prefix**: All routes prefixed with `/v1` (except health)
2. **Validation Pipe**: Automatic DTO validation with class-validator
3. **Security Headers**: Helmet with CSP, HSTS
4. **CORS**: Configured for iOS Safari compatibility with preflight caching
5. **Swagger**: Auto-generated API documentation at `/docs`
6. **Graceful Shutdown**: Proper SIGTERM handling for Kubernetes

### Health Module

#### HealthModule

Provides health check endpoints for Kubernetes.

**Endpoints:**

| Endpoint | Description | K8s Probe |
|----------|-------------|-----------|
| `GET /health` | General health check | - |
| `GET /health/live` | Is process running? | Liveness |
| `GET /health/ready` | Ready for traffic? | Readiness |

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "shutdownInProgress": false
}
```

#### GracefulShutdownService

Manages application readiness state for Kubernetes graceful shutdown.

```typescript
import { GracefulShutdownService } from '@my-girok/nest-common';

@Injectable()
export class MyService {
  constructor(private shutdownService: GracefulShutdownService) {}

  async performMaintenance() {
    // Temporarily mark service as not ready
    this.shutdownService.markNotReady();

    // Perform maintenance tasks
    await this.runMaintenance();

    // Mark service as ready again
    this.shutdownService.markReady();
  }

  isServiceAvailable(): boolean {
    return this.shutdownService.isServiceReady();
  }
}
```

**Methods:**

| Method | Description |
|--------|-------------|
| `isServiceReady()` | Returns true if service can accept traffic |
| `isShutdownInProgress()` | Returns true if SIGTERM received |
| `startShutdown()` | Initiate graceful shutdown |
| `markNotReady()` | Mark service as not ready |
| `markReady()` | Mark service as ready |

## Graceful Shutdown Flow

When Kubernetes sends SIGTERM:

```
1. SIGTERM received
   ↓
2. GracefulShutdownService.startShutdown() called
   ↓
3. /health/ready returns 503
   ↓
4. K8s stops routing new traffic
   ↓
5. Wait 5 seconds for traffic to drain
   ↓
6. Complete in-flight requests
   ↓
7. Close database connections (onModuleDestroy)
   ↓
8. Exit with code 0
```

**Kubernetes Deployment Configuration:**

```yaml
spec:
  containers:
  - name: auth-service
    livenessProbe:
      httpGet:
        path: /health/live
        port: 4001
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 4001
      initialDelaySeconds: 5
      periodSeconds: 5
  terminationGracePeriodSeconds: 30
```

## Database Integration

### BasePrismaService

Factory function to create a Prisma service with lifecycle hooks.

```typescript
import { PrismaClient } from '@prisma/client';
import { BasePrismaService } from '@my-girok/nest-common';

@Injectable()
export class PrismaService extends BasePrismaService(PrismaClient) {}
```

**Features:**
- Auto-connect on module init
- Auto-disconnect on module destroy
- Proper cleanup during graceful shutdown

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `PORT` | No | config.defaultPort | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `CORS_ORIGINS` | No | - | Comma-separated allowed origins |

## Docker Integration

When using nest-common in a Dockerfile, ensure you copy the package:

```dockerfile
# Build stage
FROM node:22-alpine AS builder

# Copy package files
COPY packages/types/package.json ./packages/types/
COPY packages/nest-common/package.json ./packages/nest-common/
COPY services/my-service/package.json ./services/my-service/

# Copy source
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common
COPY services/my-service ./services/my-service

# Build packages
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/packages/nest-common
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Copy built packages
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/nest-common/dist ./packages/nest-common/dist
COPY --from=builder /app/packages/nest-common/package.json ./packages/nest-common/package.json
```

## Best Practices

### 1. Use Global Guards and Filters

```typescript
@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
```

### 2. Mark Public Endpoints Explicitly

```typescript
@Controller('auth')
export class AuthController {
  @Public()
  @Post('register')
  register() {}

  @Public()
  @Post('login')
  login() {}

  // Protected by default
  @Get('profile')
  getProfile(@CurrentUser() user: any) {}
}
```

### 3. Custom JWT Strategy for Auth Service

The auth-service should create its own JwtStrategy that validates users exist in the database:

```typescript
// auth-service/src/auth/strategies/jwt.strategy.ts
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

### 4. Import HealthModule for K8s

Always import HealthModule for Kubernetes compatibility:

```typescript
import { HealthModule } from '@my-girok/nest-common';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

## Changelog

### v0.1.0

- Initial release
- JwtAuthGuard with @Public() support
- JwtStrategy for token validation
- CurrentUser decorator (HTTP + GraphQL)
- Public decorator
- HttpExceptionFilter with standard format
- configureApp() bootstrap factory
- HealthModule with graceful shutdown
- GracefulShutdownService
- BasePrismaService factory

## Related Documentation

- [.ai/packages/nest-common.md](/.ai/packages/nest-common.md) - Quick reference
- [.ai/rules.md](/.ai/rules.md) - Core development rules
- [docs/policies/SECURITY.md](/docs/policies/SECURITY.md) - Security policies
