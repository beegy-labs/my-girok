// CRITICAL: OTEL must be initialized FIRST before any other imports
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'audit-service' });

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { configureApp } from '@my-girok/nest-common';

const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50054', 10);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const protoBasePath = join(__dirname, '../../../packages/proto');
  const grpcLoaderOptions = {
    keepCase: false,
    longs: Number,
    enums: Number,
    defaults: true,
    oneofs: true,
    includeDirs: [protoBasePath],
  };

  // Configure gRPC microservice for audit events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'audit.v1',
      protoPath: join(protoBasePath, 'audit/v1/audit.proto'),
      url: `0.0.0.0:${GRPC_PORT}`,
      loader: grpcLoaderOptions,
    },
  });

  // Configure gRPC microservice for session recordings
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'session_recording.v1',
      protoPath: join(protoBasePath, 'session-recording/v1/session-recording.proto'),
      url: `0.0.0.0:${GRPC_PORT}`,
      loader: grpcLoaderOptions,
    },
  });

  // Start all microservices (gRPC)
  await app.startAllMicroservices();

  await configureApp(app, {
    serviceName: 'Audit Service',
    description: 'Audit and compliance service for legal requirements',
    defaultPort: 4002,
  });

  console.log(`gRPC server running on port ${GRPC_PORT}`);
}
bootstrap();
