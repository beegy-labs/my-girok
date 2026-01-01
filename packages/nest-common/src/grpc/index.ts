/**
 * gRPC Clients for Inter-Service Communication
 *
 * This module provides typed gRPC clients for calling other services:
 * - IdentityGrpcClient - Account, Session, Device, Profile operations
 * - AuthGrpcClient - Permission, Role, Operator, Sanction operations
 * - LegalGrpcClient - Consent, Document, Law Registry, DSR operations
 *
 * @example
 * ```typescript
 * // Import the module
 * import { GrpcClientsModule, IdentityGrpcClient } from '@my-girok/nest-common';
 *
 * @Module({
 *   imports: [GrpcClientsModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * class UserService {
 *   constructor(private readonly identityClient: IdentityGrpcClient) {}
 *
 *   async getUser(id: string) {
 *     const response = await this.identityClient.getAccount({ id });
 *     return response.account;
 *   }
 * }
 * ```
 */

// Module
export {
  GrpcClientsModule,
  GrpcClientsOptions,
  GrpcClientsAsyncOptions,
  IdentityGrpcClientModule,
  AuthGrpcClientModule,
  LegalGrpcClientModule,
} from './grpc-clients.module';

// Clients
export { IdentityGrpcClient, GrpcError, isGrpcError } from './identity-grpc.client';
export { AuthGrpcClient } from './auth-grpc.client';
export { LegalGrpcClient } from './legal-grpc.client';

// Options & Configuration
export {
  GRPC_PORTS,
  GRPC_SERVICES,
  GRPC_PACKAGES,
  GrpcClientConfig,
  GrpcEnvironmentConfig,
  createIdentityGrpcOptions,
  createAuthGrpcOptions,
  createLegalGrpcOptions,
  loadGrpcConfigFromEnv,
} from './grpc.options';

// Types (re-export all types for consumer convenience)
export * from './grpc.types';
