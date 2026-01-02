import { Module } from '@nestjs/common';
import { IdentityGrpcController } from './identity.grpc.controller';
import { IdentityModule } from '../identity/identity.module';

/**
 * gRPC Module
 *
 * Provides gRPC endpoints for the Identity Service.
 * This module exposes account, session, device, and profile operations
 * via gRPC for inter-service communication.
 *
 * The gRPC microservice is configured in main.ts on port 50051.
 *
 * @see packages/proto/identity/v1/identity.proto
 */
@Module({
  imports: [IdentityModule],
  controllers: [IdentityGrpcController],
})
export class GrpcModule {}
