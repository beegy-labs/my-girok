import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AuthorizationService');

  // gRPC Server
  const grpcPort = parseInt(process.env.GRPC_PORT || '50055', 10);
  const protoPath = join(
    process.cwd(),
    '../../packages/proto/authorization/v1/authorization.proto',
  );

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'authorization.v1',
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

  await app.listen();
  logger.log(`Authorization gRPC service running on port ${grpcPort}`);

  // Optional: HTTP Server for health checks
  const httpPort = parseInt(process.env.HTTP_PORT || '3012', 10);
  const httpApp = await NestFactory.create(AppModule);

  httpApp.enableCors();
  await httpApp.listen(httpPort);
  logger.log(`Authorization HTTP service running on port ${httpPort}`);
}

bootstrap();
