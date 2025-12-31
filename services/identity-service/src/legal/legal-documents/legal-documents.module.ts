import { Module } from '@nestjs/common';
import { LegalDocumentsController } from './legal-documents.controller';
import { LegalDocumentsService } from './legal-documents.service';

/**
 * Legal Documents Module
 *
 * Handles legal document management including:
 * - Document creation and versioning
 * - Document retrieval by type, locale, and version
 * - Document updates and archival
 */
@Module({
  controllers: [LegalDocumentsController],
  providers: [LegalDocumentsService],
  exports: [LegalDocumentsService],
})
export class LegalDocumentsModule {}
