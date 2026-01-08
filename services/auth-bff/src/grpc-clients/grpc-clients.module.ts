import { Module, Global } from '@nestjs/common';
import { IdentityGrpcClient } from './identity.client';
import { AuthGrpcClient } from './auth.client';
import { AuditGrpcClient } from './audit.client';

@Global()
@Module({
  providers: [IdentityGrpcClient, AuthGrpcClient, AuditGrpcClient],
  exports: [IdentityGrpcClient, AuthGrpcClient, AuditGrpcClient],
})
export class GrpcClientsModule {}
