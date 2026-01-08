// CRITICAL: OTEL must be initialized FIRST before any other imports
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-bff' });

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // Cookie parser
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  const corsOrigins = configService.get<string[]>('cors.origins') || ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Auth BFF Service')
    .setDescription('BFF authentication gateway for My-Girok')
    .setVersion('1.0')
    .addTag('user', 'User authentication endpoints')
    .addTag('admin', 'Admin authentication endpoints')
    .addTag('operator', 'Operator authentication endpoints')
    .addTag('oauth', 'OAuth provider endpoints')
    .addTag('session', 'Session management endpoints')
    .addTag('health', 'Health check endpoints')
    .addCookieAuth('session')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('port') || 4005;

  await app.listen(port);
  logger.log(`Auth BFF running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api`);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);
    const shutdownTimeout = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 30000);

    try {
      await app.close();
      clearTimeout(shutdownTimeout);
      logger.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  });
}

bootstrap();
