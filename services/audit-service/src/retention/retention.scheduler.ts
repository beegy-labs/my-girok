import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RetentionService } from './retention.service';

@Injectable()
export class RetentionScheduler {
  private readonly logger = new Logger(RetentionScheduler.name);

  constructor(private readonly retentionService: RetentionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRetentionCleanup() {
    this.logger.log('Starting scheduled retention cleanup');

    try {
      const result = await this.retentionService.cleanupExpiredPartitions();
      this.logger.log(
        `Retention cleanup completed: ${result.tablesProcessed} tables processed, ${result.partitionsDropped} partitions dropped`,
      );
    } catch (error) {
      this.logger.error('Retention cleanup failed', error);
    }
  }
}
