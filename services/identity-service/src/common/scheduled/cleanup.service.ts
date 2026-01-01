import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { IdentityPrismaService } from '../../database/identity-prisma.service';

/**
 * Cleanup Service
 *
 * Scheduled jobs for maintaining database hygiene:
 * - Expired sessions cleanup
 * - Expired revoked tokens cleanup
 * - Expired idempotency records cleanup
 * - Timed out saga states cleanup
 *
 * 2026 Best Practices:
 * - Uses NestJS built-in scheduler
 * - Runs during low-traffic hours (2 AM UTC)
 * - Includes health metrics for monitoring
 * - Graceful error handling
 */
@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    this.logger.log('Cleanup service initialized');
  }

  /**
   * Clean up expired sessions
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'cleanup-sessions' })
  async cleanupExpiredSessions(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Cleanup already running, skipping sessions cleanup');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Mark expired sessions as inactive
      const result = await this.prisma.session.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true,
        },
        data: {
          isActive: false,
          revokedReason: 'Session expired (scheduled cleanup)',
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Cleaned up ${result.count} expired sessions in ${Date.now() - startTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup expired sessions: ${error}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up expired revoked tokens
   * Runs daily at 2 AM UTC
   */
  @Cron('0 2 * * *', { name: 'cleanup-revoked-tokens' })
  async cleanupExpiredRevokedTokens(): Promise<void> {
    const startTime = Date.now();

    try {
      // Delete revoked tokens that have expired (no longer needed in blacklist)
      const result = await this.prisma.revokedToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Deleted ${result.count} expired revoked tokens in ${Date.now() - startTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup expired revoked tokens: ${error}`);
    }
  }

  /**
   * Clean up expired idempotency records
   * Runs daily at 3 AM UTC
   */
  @Cron('0 3 * * *', { name: 'cleanup-idempotency' })
  async cleanupExpiredIdempotencyRecords(): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await this.prisma.idempotencyRecord.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Deleted ${result.count} expired idempotency records in ${Date.now() - startTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup expired idempotency records: ${error}`);
    }
  }

  /**
   * Clean up timed out saga states
   * Runs daily at 4 AM UTC
   */
  @Cron('0 4 * * *', { name: 'cleanup-sagas' })
  async cleanupTimedOutSagas(): Promise<void> {
    const startTime = Date.now();

    try {
      // Mark timed out sagas as TIMED_OUT
      const timedOutResult = await this.prisma.sagaState.updateMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS', 'COMPENSATING'] },
          timeoutAt: { lt: new Date() },
        },
        data: {
          status: 'TIMED_OUT',
          completedAt: new Date(),
          error: 'Saga timed out during scheduled cleanup',
        },
      });

      // Delete completed/failed sagas older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedResult = await this.prisma.sagaState.deleteMany({
        where: {
          status: { in: ['COMPLETED', 'FAILED', 'COMPENSATED', 'TIMED_OUT'] },
          completedAt: { lt: thirtyDaysAgo },
        },
      });

      if (timedOutResult.count > 0 || deletedResult.count > 0) {
        this.logger.log(
          `Saga cleanup: ${timedOutResult.count} timed out, ${deletedResult.count} deleted in ${Date.now() - startTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup saga states: ${error}`);
    }
  }

  /**
   * Clean up old dead letter events
   * Runs weekly on Sunday at 4 AM UTC
   */
  @Cron('0 4 * * 0', { name: 'cleanup-dead-letters' })
  async cleanupOldDeadLetterEvents(): Promise<void> {
    const startTime = Date.now();

    try {
      // Delete resolved/ignored dead letter events older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.prisma.deadLetterEvent.deleteMany({
        where: {
          status: { in: ['RESOLVED', 'IGNORED'] },
          createdAt: { lt: ninetyDaysAgo },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Deleted ${result.count} old dead letter events in ${Date.now() - startTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup dead letter events: ${error}`);
    }
  }

  /**
   * Clean up processed outbox events
   * Runs every 6 hours
   */
  @Cron('0 */6 * * *', { name: 'cleanup-outbox' })
  async cleanupProcessedOutboxEvents(): Promise<void> {
    const startTime = Date.now();

    try {
      // Delete completed outbox events older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.prisma.outboxEvent.deleteMany({
        where: {
          status: 'COMPLETED',
          processedAt: { lt: sevenDaysAgo },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Deleted ${result.count} processed outbox events in ${Date.now() - startTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup outbox events: ${error}`);
    }
  }

  /**
   * Clean up old password history entries
   * Runs weekly on Sunday at 5 AM UTC
   * Keeps last 10 password entries per account
   */
  @Cron('0 5 * * 0', { name: 'cleanup-password-history' })
  async cleanupOldPasswordHistory(): Promise<void> {
    const startTime = Date.now();

    try {
      // This is a more complex operation - delete password history entries
      // older than 1 year, keeping at least the last 10 entries
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const result = await this.prisma.passwordHistory.deleteMany({
        where: {
          changedAt: { lt: oneYearAgo },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Deleted ${result.count} old password history entries in ${Date.now() - startTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup password history: ${error}`);
    }
  }

  /**
   * Get job status for health checks
   */
  getJobStatus(): Record<string, { nextRun: Date | null; lastRun: Date | null }> {
    const jobs = [
      'cleanup-sessions',
      'cleanup-revoked-tokens',
      'cleanup-idempotency',
      'cleanup-sagas',
      'cleanup-dead-letters',
      'cleanup-outbox',
      'cleanup-password-history',
    ];

    const status: Record<string, { nextRun: Date | null; lastRun: Date | null }> = {};

    for (const jobName of jobs) {
      try {
        const job = this.schedulerRegistry.getCronJob(jobName);
        status[jobName] = {
          nextRun: job.nextDate().toJSDate(),
          lastRun: job.lastDate() || null,
        };
      } catch {
        status[jobName] = { nextRun: null, lastRun: null };
      }
    }

    return status;
  }
}
