import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { OutboxModule } from '../outbox';

/**
 * Audit Module
 *
 * Provides audit logging for all mutations in identity-service.
 *
 * 2026 Best Practices:
 * - Global module for easy access
 * - Uses transactional outbox for reliability
 * - Async processing to not impact latency
 */
@Global()
@Module({
  imports: [OutboxModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
