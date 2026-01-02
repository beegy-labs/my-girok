// CRITICAL: OTEL must be initialized FIRST before any other imports
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-service' });

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { configureApp } from '@my-girok/nest-common';
import { AppModule } from './app.module';

const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50052', 10);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth.v1',
      protoPath: join(__dirname, '../../../packages/proto/auth/v1/auth.proto'),
      url: `0.0.0.0:${GRPC_PORT}`,
      loader: {
        keepCase: false,
        longs: Number,
        enums: Number,
        defaults: true,
        oneofs: true,
      },
    },
  });

  // Start all microservices (gRPC)
  await app.startAllMicroservices();

  // Configure HTTP REST/GraphQL server
  await configureApp(app, {
    serviceName: 'My-Girok Auth Service',
    description: 'Authentication and Authorization microservice',
    defaultPort: 4001,
    swaggerTags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'oauth-config', description: 'OAuth provider configuration (MASTER only)' },
      { name: 'users', description: 'User management' },
      { name: 'health', description: 'Health check endpoints' },
    ],
  });

  console.log(`gRPC server running on port ${GRPC_PORT}`);
}

bootstrap();
