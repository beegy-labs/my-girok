// CRITICAL: OTEL must be initialized FIRST before any other imports
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'analytics-service' });

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { configureApp } from '@my-girok/nest-common';

async function bootstrap() {
  const logger = new Logger('AnalyticsService');

  // gRPC Server
  const grpcPort = parseInt(process.env.GRPC_PORT || '50056', 10);
  const protoPath = join(process.cwd(), '../../packages/proto/analytics/v1/analytics.proto');

  const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'analytics.v1',
      protoPath,
      url: `0.0.0.0:${grpcPort}`,
      loader: {
        keepCase: false,
        longs: Number,
        enums: Number,
        defaults: true,
        oneofs: true,
        includeDirs: [join(process.cwd(), '../../packages/proto')],
      },
    },
  });

  await grpcApp.listen();
  logger.log(`Analytics gRPC service running on port ${grpcPort}`);

  // HTTP Server
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    serviceName: 'Analytics Service',
    description: 'Business analytics and event tracking service',
    defaultPort: 4003,
  });
}
bootstrap();
