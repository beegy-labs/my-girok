import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';

/**
 * Maximum number of retry attempts before marking an event as failed
 */
const MAX_RETRY_COUNT = 3;

/**
 * Outbox Publisher Job
 *
 * Polls the outbox table and publishes events to Redpanda.
 * Runs every 10 seconds to ensure timely event delivery.
 *
 * In production, replace the placeholder publish method with actual
 * Redpanda/Kafka producer implementation.
 */
@Injectable()
export class OutboxPublisherJob implements OnModuleInit {
  private readonly logger = new Logger(OutboxPublisherJob.name);
  private isProcessing = false;

  constructor(private readonly outboxService: OutboxService) {}

  onModuleInit(): void {
    this.logger.log('Outbox publisher job initialized');
  }

  /**
   * Poll and publish pending events every 10 seconds
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async pollAndPublish(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Previous poll still running, skipping');
      return;
    }

    this.isProcessing = true;
    try {
      const events = await this.outboxService.getPendingEvents(50);

      if (events.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${events.length} pending outbox events`);

      for (const event of events) {
        try {
          await this.outboxService.markAsProcessing(event.id);
          await this.publishToRedpanda(event);
          await this.outboxService.markAsCompleted(event.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (event.retryCount >= MAX_RETRY_COUNT) {
            await this.outboxService.markAsFailed(event.id, errorMessage);
            this.logger.error(`Outbox event ${event.id} failed after ${MAX_RETRY_COUNT} retries`);
          } else {
            const newRetryCount = await this.outboxService.incrementRetryCount(
              event.id,
              errorMessage,
            );
            this.logger.warn(
              `Outbox event ${event.id} failed, retry ${newRetryCount}/${MAX_RETRY_COUNT}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Outbox polling failed', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cleanup old completed events daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupCompleted(): Promise<void> {
    try {
      await this.outboxService.cleanupCompleted(7);
    } catch (error) {
      this.logger.error('Outbox cleanup failed', error);
    }
  }

  private async publishToRedpanda(event: {
    id: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: unknown;
    createdAt: Date;
  }): Promise<void> {
    const topic = `legal.${event.aggregateType}.events`;
    this.logger.debug(`Published event to ${topic}: ${event.eventType} (id: ${event.aggregateId})`);
  }
}
