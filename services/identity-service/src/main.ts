import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

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

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Return detailed validation errors
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          constraints: error.constraints,
        }));
        return {
          statusCode: 400,
          error: 'Validation Error',
          message: messages,
        };
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

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('port') ?? 3005;
  await app.listen(port);

  logger.log(`Identity Service running on port ${port}`);
  logger.log(`Environment: ${environment}`);
  logger.log(`API Version: v1`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Identity Service:', error);
  process.exit(1);
});
