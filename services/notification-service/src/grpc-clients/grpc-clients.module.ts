import { Module, Global } from '@nestjs/common';
import { MailGrpcClient } from './mail.client';
import { AuditGrpcClient } from './audit.client';

@Global()
@Module({
  providers: [MailGrpcClient, AuditGrpcClient],
  exports: [MailGrpcClient, AuditGrpcClient],
})
export class GrpcClientsModule {}
