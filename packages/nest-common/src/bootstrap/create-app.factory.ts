import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { GracefulShutdownService } from '../health/graceful-shutdown.service';

export interface AppConfig {
  /**
   * Service name for logging and Swagger title
   */
  serviceName: string;

  /**
   * Service description for Swagger
   */
  description: string;

  /**
   * API version (default: '1.0.0')
   */
  version?: string;

  /**
   * Swagger tags configuration
   */
  swaggerTags?: Array<{ name: string; description: string }>;

  /**
   * Default port if not in environment
   */
  defaultPort?: number;

  /**
   * Paths to exclude from global prefix (default: ['health'])
   */
  excludeFromPrefix?: string[];

  /**
   * Enable Swagger documentation (default: true)
   */
  enableSwagger?: boolean;

  /**
   * Enable CORS (default: true)
   */
  enableCors?: boolean;

  /**
   * Custom CORS origins (override defaults)
   * Can be provided via config or CORS_ORIGINS environment variable (comma-separated)
   */
  corsOrigins?: {
    production?: string[];
    development?: string[];
  };

  /**
   * Enable graceful shutdown handling (default: true)
   * Handles SIGTERM signal for Kubernetes
   */
  enableGracefulShutdown?: boolean;

  /**
   * Shutdown timeout in milliseconds (default: 30000)
   * Time to wait for in-flight requests to complete
   */
  shutdownTimeout?: number;
}

/**
 * Configure NestJS application with standard settings
 * Includes: Validation, Security Headers, CORS, Swagger
 *
 * @example
 * ```typescript
 * import { NestFactory } from '@nestjs/core';
 * import { configureApp } from '@my-girok/nest-common';
 * import { AppModule } from './app.module';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *   await configureApp(app, {
 *     serviceName: 'My Service',
 *     description: 'My service description',
 *     defaultPort: 4000,
 *   });
 * }
 * ```
 */
export async function configureApp(app: INestApplication, config: AppConfig): Promise<void> {
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get('NODE_ENV', 'development');

  // Global prefix (exclude health endpoint)
  app.setGlobalPrefix('v1', {
    exclude: config.excludeFromPrefix || ['health'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://rybbit.girok.dev'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // CORS configuration
  // Priority: CORS_ORIGINS env > config.corsOrigins > defaults
  if (config.enableCors !== false) {
    const corsOriginsEnv = configService.get<string>('CORS_ORIGINS');

    let origins: string[];

    if (corsOriginsEnv) {
      // Use CORS_ORIGINS from environment (comma-separated)
      origins = corsOriginsEnv.split(',').map((origin) => origin.trim());
    } else if (nodeEnv === 'production') {
      origins = config.corsOrigins?.production || [
        'https://mygirok.dev',
        'https://admin.mygirok.dev',
      ];
    } else {
      origins = config.corsOrigins?.development || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://my-dev.girok.dev',
        'https://admin-dev.girok.dev',
      ];
    }

    app.enableCors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Content-Length', 'Content-Type'],
      maxAge: 3600, // Cache preflight for 1 hour (iOS Safari compatibility)
      optionsSuccessStatus: 204,
    });
  }

  // Swagger documentation
  if (config.enableSwagger !== false) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(`${config.serviceName} API`)
      .setDescription(config.description)
      .setVersion(config.version || '1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      );

    // Add tags if provided
    if (config.swaggerTags) {
      config.swaggerTags.forEach((tag) => {
        swaggerConfig.addTag(tag.name, tag.description);
      });
    }

    const document = SwaggerModule.createDocument(app, swaggerConfig.build());
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: `${config.serviceName} API`,
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
  }

  // Graceful shutdown handling for Kubernetes
  if (config.enableGracefulShutdown !== false) {
    setupGracefulShutdown(app, config);
  }

  // Get port and listen
  const port = configService.get('PORT', config.defaultPort || 3000);
  await app.listen(port);

  // Log startup information
  const logger = new Logger(config.serviceName);
  logger.log(`${config.serviceName} is running on: http://localhost:${port}`);
  logger.log(`API version: v1`);
  if (config.enableSwagger !== false) {
    logger.log(`Swagger docs: http://localhost:${port}/docs`);
  }
  logger.log(
    `Graceful shutdown: ${config.enableGracefulShutdown !== false ? 'enabled' : 'disabled'}`,
  );
}

/**
 * Setup graceful shutdown handlers for SIGTERM
 * Ensures Kubernetes can gracefully terminate the pod
 */
function setupGracefulShutdown(app: INestApplication, config: AppConfig): void {
  const logger = new Logger('GracefulShutdown');
  const shutdownTimeout = config.shutdownTimeout || 30000;

  // Try to get GracefulShutdownService if HealthModule is imported
  let shutdownService: GracefulShutdownService | null = null;
  try {
    shutdownService = app.get(GracefulShutdownService, { strict: false });
  } catch {
    // HealthModule not imported, continue without it
  }

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);

    // Mark service as not ready (K8s will stop routing traffic)
    if (shutdownService) {
      shutdownService.startShutdown();
      logger.log('Service marked as not ready, waiting for in-flight requests...');
    }

    // Give K8s time to update endpoints and stop sending traffic
    // This delay allows readiness probe to fail and traffic to be redirected
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Set a hard timeout for shutdown
    const forceShutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit...');
      process.exit(1);
    }, shutdownTimeout);

    try {
      // Close the application (completes in-flight requests)
      await app.close();
      logger.log('Application closed successfully');
      clearTimeout(forceShutdownTimer);
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  };

  // Handle SIGTERM (Kubernetes graceful shutdown)
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle SIGINT (Ctrl+C in development)
  process.on('SIGINT', () => shutdown('SIGINT'));
}
