import { Module } from '@nestjs/common';
import { ConsentsModule } from './consents/consents.module';
import { LegalDocumentsModule } from './legal-documents/legal-documents.module';
import { LawRegistryModule } from './law-registry/law-registry.module';
import { DsrRequestsModule } from './dsr-requests/dsr-requests.module';

/**
 * Legal Module
 *
 * Aggregates all legal/compliance-related submodules:
 * - Consents: User consent management (GDPR Article 7)
 * - Legal Documents: Terms of Service, Privacy Policy management
 * - Law Registry: Applicable law registry per jurisdiction
 * - DSR Requests: Data Subject Requests (GDPR Article 15-22)
 */
@Module({
  imports: [ConsentsModule, LegalDocumentsModule, LawRegistryModule, DsrRequestsModule],
  exports: [ConsentsModule, LegalDocumentsModule, LawRegistryModule, DsrRequestsModule],
})
export class LegalModule {}
