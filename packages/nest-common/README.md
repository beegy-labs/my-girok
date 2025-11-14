# @my-girok/nest-common

Shared NestJS utilities and components for my-girok microservices.

## Overview

This package provides common functionality used across all my-girok backend services to:
- Reduce code duplication (~800 lines saved)
- Standardize patterns across services
- Speed up development of new services (70% less boilerplate)
- Ensure consistency in error handling, security, and API responses

## Features

### 🎨 Decorators
- `@Public()` - Mark endpoints as public (skip JWT authentication)
- `@CurrentUser()` - Extract current user from request (supports HTTP and GraphQL)

### 🛡️ Guards
- `JwtAuthGuard` - JWT authentication guard with `@Public()` decorator support

### 🔐 Strategies
- `JwtStrategy` - JWT passport strategy for token validation

### 🚨 Filters
- `HttpExceptionFilter` - Global exception filter with standardized error responses

### 💾 Database
- `BasePrismaService` - Base class for Prisma service with lifecycle hooks
- `AbstractPrismaService` - Alternative abstract class approach

### 🏗️ Bootstrap
- `configureApp()` - Application bootstrap factory with standard configuration

### 📦 Types
- `ApiErrorResponse` - Standard error response interface
- `ApiSuccessResponse<T>` - Standard success response interface

## Installation

This package is automatically available in the monorepo workspace:

```bash
pnpm install
```

## Usage

### Basic Setup

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { configureApp } from '@my-girok/nest-common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    serviceName: 'My Service',
    description: 'My service description',
    defaultPort: 4000,
    swaggerTags: [
      { name: 'users', description: 'User management endpoints' },
      { name: 'posts', description: 'Post management endpoints' },
    ],
  });
}

bootstrap();
```

### Using Decorators

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public, CurrentUser } from '@my-girok/nest-common';

@Controller('posts')
export class PostsController {
  // Public endpoint (no authentication required)
  @Public()
  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  // Protected endpoint (requires JWT)
  @Get('my-posts')
  findMy(@CurrentUser() user: any) {
    return this.postsService.findByUserId(user.id);
  }
}
```

### Using Guards & Strategies

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard, JwtStrategy } from '@my-girok/nest-common';

@Module({
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Apply globally
    },
  ],
})
export class AppModule {}
```

### Using Exception Filter

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from '@my-girok/nest-common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}

bootstrap();
```

### Using Prisma Service

```typescript
// src/database/prisma.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AbstractPrismaService } from '@my-girok/nest-common';

@Injectable()
export class PrismaService extends PrismaClient implements AbstractPrismaService {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe"
  },
  "meta": {
    "timestamp": "2025-11-14T12:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  },
  "meta": {
    "timestamp": "2025-11-14T12:00:00.000Z",
    "path": "/api/v1/users/123",
    "statusCode": 404
  }
}
```

## Configuration

### Bootstrap Factory Options

```typescript
interface AppConfig {
  serviceName: string;          // Service name for logging
  description: string;          // Service description for Swagger
  version?: string;             // API version (default: '1.0.0')
  swaggerTags?: Array<{         // Swagger tags
    name: string;
    description: string;
  }>;
  defaultPort?: number;         // Default port (default: 3000)
  excludeFromPrefix?: string[]; // Paths to exclude from prefix (default: ['health'])
  enableSwagger?: boolean;      // Enable Swagger (default: true)
  enableCors?: boolean;         // Enable CORS (default: true)
  corsOrigins?: {               // Custom CORS origins
    production?: string[];
    development?: string[];
  };
}
```

## Benefits

### Before (per service)

```typescript
// src/main.ts (~100 lines)
// - Manual validation pipe setup
// - Manual helmet configuration
// - Manual CORS setup
// - Manual Swagger configuration
// - Repeated across all services

// src/common/decorators/public.decorator.ts (6 lines)
// src/common/decorators/current-user.decorator.ts (18 lines)
// src/common/guards/jwt-auth.guard.ts (32 lines)
// src/common/strategies/jwt.strategy.ts (27 lines)
// src/common/filters/http-exception.filter.ts (35 lines)
// src/database/prisma.service.ts (17 lines)

// Total per service: ~235 lines of boilerplate
```

### After (per service)

```typescript
// src/main.ts (~20 lines)
import { configureApp } from '@my-girok/nest-common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await configureApp(app, {
    serviceName: 'My Service',
    description: 'My service description',
    defaultPort: 4000,
  });
}

// Total per service: ~20 lines
// Savings: ~215 lines per service (91% reduction)
```

## Development

```bash
# Install dependencies
pnpm install

# Build package
pnpm build

# Watch mode
pnpm dev

# Clean build artifacts
pnpm clean
```

## Related Issues

- Epic: #56 - Codebase Consolidation and Standardization
- Phase 1: #57 - Backend Common Package & Error Standardization

## License

Private package for my-girok project
