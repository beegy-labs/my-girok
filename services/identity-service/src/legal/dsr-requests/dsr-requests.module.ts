import { Module } from '@nestjs/common';
import { DsrRequestsController } from './dsr-requests.controller';
import { DsrRequestsService } from './dsr-requests.service';

/**
 * DSR Requests Module
 *
 * Handles Data Subject Requests for GDPR/CCPA compliance:
 * - Access requests (Right to Access)
 * - Deletion requests (Right to be Forgotten)
 * - Portability requests (Right to Data Portability)
 * - Rectification requests (Right to Rectification)
 */
@Module({
  controllers: [DsrRequestsController],
  providers: [DsrRequestsService],
  exports: [DsrRequestsService],
})
export class DsrRequestsModule {}
