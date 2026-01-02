import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from './outbox.service';

/**
 * Maximum number of retry attempts before marking an event as FAILED.
 */
const MAX_RETRY_COUNT = 5;

/**
 * OutboxPublisherJob polls the outbox table and publishes pending events to Redpanda.
 *
 * Features:
 * - Runs every 1 second via @Interval decorator
 * - Processes events in order (oldest first)
 * - Retries failed publishes up to 5 times
 * - Marks permanently failed events as FAILED
 * - Cleans up old published events daily
 * - Implements graceful shutdown via OnModuleDestroy
 *
 * TODO: Replace simulated publishing with actual Redpanda/Kafka client.
 */
@Injectable()
export class OutboxPublisherJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherJob.name);
  private readonly isEnabled: boolean;
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled = this.configService.get<string>('OUTBOX_PUBLISHER_ENABLED', 'true') === 'true';
  }

  onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('OutboxPublisherJob initialized - polling every 1 second');
    } else {
      this.logger.warn('OutboxPublisherJob is disabled via OUTBOX_PUBLISHER_ENABLED=false');
    }
  }

  /**
   * Graceful shutdown - wait for current processing to complete.
   */
  async onModuleDestroy() {
    this.logger.log('OutboxPublisherJob shutting down...');
    this.isShuttingDown = true;

    // Wait for current processing to complete (max 10 seconds)
    const maxWait = 10000;
    const checkInterval = 100;
    let waited = 0;

    while (this.isProcessing && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (this.isProcessing) {
      this.logger.warn('Shutdown timeout reached while processing events');
    } else {
      this.logger.log('OutboxPublisherJob shutdown complete');
    }
  }

  /**
   * Poll and publish pending events every 1 second.
   */
  @Interval(1000)
  async publishPendingEvents(): Promise<void> {
    if (!this.isEnabled || this.isShuttingDown) {
      return;
    }

    // Prevent concurrent processing
    if (this.isProcessing) {
      this.logger.debug('Previous publish cycle still running, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      const events = await this.outboxService.getPendingEvents(100);

      if (events.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${events.length} pending outbox events`);

      for (const event of events) {
        try {
          // Publish to Redpanda
          await this.publishToRedpanda(event);

          // Mark as published
          await this.outboxService.markAsPublished(event.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const newRetryCount = await this.outboxService.incrementRetryCount(
            event.id,
            errorMessage,
          );

          if (newRetryCount >= MAX_RETRY_COUNT) {
            this.logger.error(
              `Outbox event ${event.id} failed after ${MAX_RETRY_COUNT} attempts: ${errorMessage}`,
            );
            await this.outboxService.markAsFailed(event.id, errorMessage);
          } else {
            this.logger.warn(
              `Outbox event ${event.id} publish failed (attempt ${newRetryCount}/${MAX_RETRY_COUNT}): ${errorMessage}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to process outbox events', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clean up old published events daily at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldEvents(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.outboxService.cleanupPublishedEvents(7);
    } catch (error) {
      this.logger.error('Failed to cleanup old outbox events', error);
    }
  }

  /**
   * Publish an event to Redpanda.
   * TODO: Replace with actual Redpanda/Kafka client.
   */
  private async publishToRedpanda(event: {
    id: string;
    eventType: string;
    aggregateId: string;
    payload: unknown;
  }): Promise<void> {
    const topic = this.getTopicForEventType(event.eventType);

    // TODO: Replace with actual Redpanda client
    // await this.redpandaClient.send({
    //   topic,
    //   messages: [{
    //     key: event.aggregateId,
    //     value: JSON.stringify({
    //       eventId: event.id,
    //       eventType: event.eventType,
    //       aggregateId: event.aggregateId,
    //       payload: event.payload,
    //       timestamp: new Date().toISOString(),
    //     }),
    //   }],
    // });

    this.logger.log(
      `[PUBLISH] Topic: ${topic}, EventType: ${event.eventType}, AggregateId: ${event.aggregateId}`,
    );

    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * Map event type to Redpanda topic.
   */
  private getTopicForEventType(eventType: string): string {
    const prefix = eventType.split('_')[0]?.toLowerCase() ?? 'unknown';

    const topicMap: Record<string, string> = {
      role: 'auth.role',
      operator: 'auth.operator',
      sanction: 'auth.sanction',
      service: 'auth.service',
      permission: 'auth.permission',
    };

    return topicMap[prefix] ?? 'auth.events';
  }
}
