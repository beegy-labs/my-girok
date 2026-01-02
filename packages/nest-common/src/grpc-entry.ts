/**
 * gRPC Entry Point
 *
 * Import separately: @my-girok/nest-common/grpc
 *
 * This is a separate entry point to prevent loading @nestjs/microservices
 * and @grpc/grpc-js in services that don't use gRPC.
 *
 * @example
 * ```typescript
 * import { GrpcClientsModule, IdentityGrpcClient } from '@my-girok/nest-common/grpc';
 * ```
 */

export * from './grpc';
