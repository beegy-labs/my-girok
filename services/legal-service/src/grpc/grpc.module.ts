import { Module } from '@nestjs/common';
import { LegalGrpcController } from './legal.grpc.controller';
import { ConsentsModule } from '../consents/consents.module';
import { LegalDocumentsModule } from '../legal-documents/legal-documents.module';
import { LawRegistryModule } from '../law-registry/law-registry.module';
import { DsrRequestsModule } from '../dsr-requests/dsr-requests.module';

@Module({
  imports: [ConsentsModule, LegalDocumentsModule, LawRegistryModule, DsrRequestsModule],
  controllers: [LegalGrpcController],
})
export class GrpcModule {}
