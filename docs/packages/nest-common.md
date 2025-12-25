# @my-girok/nest-common

> Shared NestJS utilities for microservices

## Quick Start

```typescript
import { configureApp, JwtAuthGuard, HttpExceptionFilter, HealthModule } from '@my-girok/nest-common';

// main.ts
const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'Auth Service',
  description: 'Authentication microservice',
  defaultPort: 4001,
});

// app.module.ts
@Module({
  imports: [HealthModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
```

## Decorators

```typescript
@Public()           // Skip JWT auth
@CurrentUser()      // Get authenticated user
```

## Guards & Strategies

```typescript
JwtAuthGuard; // Global JWT validation
JwtStrategy; // Passport JWT strategy
```

## Error Response Format

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

## Health Endpoints

| Endpoint        | K8s Probe | Note                |
| --------------- | --------- | ------------------- |
| `/health`       | General   |                     |
| `/health/live`  | Liveness  |                     |
| `/health/ready` | Readiness | 503 during shutdown |

## Graceful Shutdown

### Flow

```
1. K8s sends SIGTERM
2. Service marks NOT ready (/health/ready → 503)
3. K8s stops routing traffic
4. Wait 5s for traffic to drain
5. Complete in-flight requests
6. Close connections
7. Exit 0
```

### Manual Control

```typescript
constructor(private shutdown: GracefulShutdownService) {}

// Check readiness
if (this.shutdown.isServiceReady()) { /* ... */ }

// Manual control
this.shutdown.markNotReady();
this.shutdown.markReady();
```

## configureApp Options

| Option                 | Default    | Description              |
| ---------------------- | ---------- | ------------------------ |
| serviceName            | required   | Service name             |
| description            | required   | Swagger description      |
| defaultPort            | 3000       | Server port              |
| swaggerTags            | []         | Swagger tag definitions  |
| enableSwagger          | true       | API docs at /docs        |
| enableCors             | true       | CORS enabled             |
| enableGracefulShutdown | true       | SIGTERM handling         |
| shutdownTimeout        | 30000      | Shutdown timeout ms      |
| excludeFromPrefix      | ['health'] | Paths without /v1 prefix |

## Included Features

- Global prefix `/v1` (except health)
- Validation pipe (class-validator)
- Security headers (Helmet)
- CORS (iOS Safari compatible)
- Swagger documentation

---

## Common Patterns

### Protected vs Public Endpoints

```typescript
@Controller('users')
export class UsersController {
  // Protected by default (JwtAuthGuard is global)
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  // Explicitly public
  @Public()
  @Get(':id/public')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublic(id);
  }
}
```

### Custom JWT Strategy

If you need custom validation (e.g., check user exists in DB), create your own strategy instead of importing from nest-common:

```typescript
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

### Full AppModule Setup

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
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
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    HealthModule,
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

## Environment Variables

| Variable     | Required | Default            | Description             |
| ------------ | -------- | ------------------ | ----------------------- |
| JWT_SECRET   | Yes      | -                  | JWT signing secret      |
| PORT         | No       | config.defaultPort | Server port             |
| NODE_ENV     | No       | development        | Environment             |
| CORS_ORIGINS | No       | -                  | Comma-separated origins |

---

**Quick reference**: `.ai/packages/nest-common.md`
