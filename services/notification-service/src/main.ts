import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Notification Service Bootstrap
 *
 * 2026 Best Practices:
 * - Graceful shutdown with SIGTERM/SIGINT handling
 * - Helmet for security headers
 * - Structured logging
 * - Connection draining on shutdown
 * - gRPC microservice for inter-service communication (port 50055)
 * - HTTP health check endpoint
 */

const GRPC_PORT = 50055;
const HTTP_PORT = 3000;

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);

  // Security headers (for HTTP health check endpoint)
  app.use(helmet());

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

  // CORS configuration (for HTTP endpoints)
  const corsOrigins = configService.get<string[]>('cors.origins') ?? ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Configure gRPC microservice
  const grpcPort = configService.get<number>('grpc.port') ?? GRPC_PORT;
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'notification.v1',
      protoPath: join(__dirname, '../../../packages/proto/notification/v1/notification.proto'),
      url: `0.0.0.0:${grpcPort}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, '../../../packages/proto')],
      },
    },
  });

  const httpPort = configService.get<number>('http.port') ?? HTTP_PORT;

  // Start all microservices (including gRPC)
  await app.startAllMicroservices();
  logger.log(`Notification Service gRPC running on port ${grpcPort}`);

  // Start HTTP server (for health checks)
  await app.listen(httpPort);
  logger.log(`Notification Service HTTP running on port ${httpPort}`);
  logger.log(`Health check available at: http://localhost:${httpPort}/health`);

  // Graceful shutdown handlers
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
