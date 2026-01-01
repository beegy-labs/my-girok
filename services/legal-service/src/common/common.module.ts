import { Module, Global } from '@nestjs/common';
import { CacheModule } from './cache';
import { OutboxModule } from './outbox';
import { JobsModule } from './jobs';

/**
 * Common Module for legal-service
 *
 * Provides shared infrastructure:
 * - Caching (Valkey/Redis)
 * - Transactional Outbox (Redpanda)
 * - Scheduled Jobs (DSR deadline, consent expiration)
 */
@Global()
@Module({
  imports: [CacheModule, OutboxModule, JobsModule],
  exports: [CacheModule, OutboxModule, JobsModule],
})
export class CommonModule {}
