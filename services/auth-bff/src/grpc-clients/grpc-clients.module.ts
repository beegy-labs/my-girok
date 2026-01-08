import { Module, Global } from '@nestjs/common';
import { IdentityGrpcClient } from './identity.client';
import { AuthGrpcClient } from './auth.client';

@Global()
@Module({
  providers: [IdentityGrpcClient, AuthGrpcClient],
  exports: [IdentityGrpcClient, AuthGrpcClient],
})
export class GrpcClientsModule {}
