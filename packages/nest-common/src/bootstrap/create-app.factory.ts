import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import helmet from 'helmet';

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
   */
  corsOrigins?: {
    production?: string[];
    development?: string[];
  };
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
export async function configureApp(
  app: INestApplication,
  config: AppConfig,
): Promise<void> {
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
          imgSrc: ["'self'", 'data:', 'https:'],
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
  if (config.enableCors !== false) {
    const productionOrigins = config.corsOrigins?.production || [
      'https://mygirok.dev',
      'https://admin.mygirok.dev',
    ];
    const developmentOrigins = config.corsOrigins?.development || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://my-dev.girok.dev',
    ];

    app.enableCors({
      origin: nodeEnv === 'production' ? productionOrigins : developmentOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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

  // Get port and listen
  const port = configService.get('PORT', config.defaultPort || 3000);
  await app.listen(port);

  // Log startup information
  console.log(`${config.serviceName} is running on: http://localhost:${port}`);
  console.log(`API version: v1`);
  if (config.enableSwagger !== false) {
    console.log(`Swagger docs: http://localhost:${port}/docs`);
  }
}
