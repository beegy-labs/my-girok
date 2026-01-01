import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  ValidationPipe,
  VersioningType,
  Logger,
  BadRequestException,
  INestApplication,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Graceful shutdown timeout in milliseconds
 * Allows time for in-flight requests to complete
 */
const SHUTDOWN_TIMEOUT_MS = 30_000;

/**
 * Track shutdown state to prevent double-shutdown
 */
let isShuttingDown = false;

/**
 * Handle graceful shutdown with proper cleanup
 */
async function handleShutdown(
  signal: string,
  app: INestApplication,
  logger: Logger,
): Promise<void> {
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  logger.log(`Received ${signal}, starting graceful shutdown...`);

  // Set a hard timeout for shutdown
  const shutdownTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // Close the NestJS application (triggers onApplicationShutdown hooks)
    await app.close();
    logger.log('Application closed successfully');
    clearTimeout(shutdownTimer);
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    clearTimeout(shutdownTimer);
    process.exit(1);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // Use buffered logs for async logging
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const environment = configService.get<string>('environment') || 'development';
  const isProduction = environment === 'production';

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // API Versioning (URI path)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Global validation pipe with proper exception factory
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Return detailed validation errors as proper BadRequestException
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          constraints: error.constraints,
          // Include nested errors if present
          children: error.children?.map((child) => ({
            field: child.property,
            constraints: child.constraints,
          })),
        }));
        return new BadRequestException({
          statusCode: 400,
          error: 'Validation Error',
          message: messages,
        });
      },
    }),
  );

  // CORS configuration
  const corsOrigins = configService.get<string[]>('cors.origins');
  app.enableCors({
    origin: isProduction ? corsOrigins : true, // Allow all in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-Idempotency-Key',
    ],
  });

  // Swagger/OpenAPI setup (disabled in production)
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Identity Service API')
      .setDescription(
        `
## Overview
Identity Service is the Single Source of Truth (SSOT) for user identity management
across all applications in the my-girok ecosystem.

## Features
- **Identity Management**: Accounts, Sessions, Devices, Profiles
- **Authorization**: Roles, Permissions, Operators, Sanctions
- **Legal/Compliance**: Consents, Legal Documents, Law Registry, DSR Requests

## Architecture
Uses Zero Migration Architecture with 3 pre-separated databases:
- \`identity_db\`: Core user accounts and sessions
- \`auth_db\`: Roles, permissions, and authorization
- \`legal_db\`: GDPR compliance and consent management

## Authentication
All endpoints require API Key authentication via \`X-API-Key\` header,
except for public endpoints marked with @Public decorator.
      `,
      )
      .setVersion('1.0.0')
      .setContact('my-girok Team', 'https://girok.dev', 'support@girok.dev')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API Key for service-to-service authentication',
        },
        'api-key',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for user authentication',
        },
        'jwt',
      )
      .addTag('Health', 'Health check endpoints')
      .addTag('Accounts', 'User account management')
      .addTag('Sessions', 'Session management')
      .addTag('Devices', 'Device registration and management')
      .addTag('Profiles', 'User profile management')
      .addTag('Roles', 'Role management')
      .addTag('Permissions', 'Permission management')
      .addTag('Operators', 'Operator/Admin management')
      .addTag('Sanctions', 'User sanctions management')
      .addTag('Consents', 'User consent management')
      .addTag('Legal Documents', 'Legal document versioning')
      .addTag('Law Registry', 'Jurisdiction law registry')
      .addTag('DSR Requests', 'GDPR Data Subject Requests')
      .addServer('http://localhost:3005', 'Local Development')
      .addServer('https://identity-dev.girok.dev', 'Development')
      .addServer('https://identity.girok.dev', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        `${controllerKey}_${methodKey}`,
    });

    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'Identity Service API Docs',
    });

    logger.log('Swagger documentation available at /docs');
  }

  // Enable NestJS shutdown hooks for proper cleanup
  app.enableShutdownHooks();

  const port = configService.get<number>('port') ?? 3005;
  await app.listen(port);

  // Register signal handlers for graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  signals.forEach((signal) => {
    process.on(signal, () => handleShutdown(signal, app, logger));
  });

  // Handle uncaught exceptions gracefully
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    handleShutdown('uncaughtException', app, logger);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  logger.log(`Identity Service running on port ${port}`);
  logger.log(`Environment: ${environment}`);
  logger.log(`API Version: v1`);
  logger.log(`Graceful shutdown timeout: ${SHUTDOWN_TIMEOUT_MS}ms`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start Identity Service:', error);
  process.exit(1);
});
