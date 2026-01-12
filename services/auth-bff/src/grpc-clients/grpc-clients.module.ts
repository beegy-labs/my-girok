import { Module, Global } from '@nestjs/common';
import { IdentityGrpcClient } from './identity.client';
import { AuthGrpcClient } from './auth.client';
import { AuditGrpcClient } from './audit.client';
import { SessionRecordingGrpcClient } from './session-recording.client';
import { AuthorizationGrpcClient } from './authorization.client';

@Global()
@Module({
  providers: [
    IdentityGrpcClient,
    AuthGrpcClient,
    AuditGrpcClient,
    SessionRecordingGrpcClient,
    AuthorizationGrpcClient,
  ],
  exports: [
    IdentityGrpcClient,
    AuthGrpcClient,
    AuditGrpcClient,
    SessionRecordingGrpcClient,
    AuthorizationGrpcClient,
  ],
})
export class GrpcClientsModule {}
