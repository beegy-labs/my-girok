import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService, OutboxDatabase, OutboxEvent } from '../outbox/outbox.service';
import { KafkaProducerService, EventMessage } from './kafka-producer.service';
import { KAFKA_TOPICS, KafkaTopic } from './kafka.config';

/**
 * Aggregate type to topic mapping
 */
const AGGREGATE_TOPIC_MAP: Record<string, KafkaTopic> = {
  // Identity aggregates
  Account: KAFKA_TOPICS.ACCOUNT_EVENTS,
  Session: KAFKA_TOPICS.SESSION_EVENTS,
  Device: KAFKA_TOPICS.DEVICE_EVENTS,
  Profile: KAFKA_TOPICS.PROFILE_EVENTS,

  // Auth aggregates
  Role: KAFKA_TOPICS.ROLE_EVENTS,
  Permission: KAFKA_TOPICS.PERMISSION_EVENTS,
  Operator: KAFKA_TOPICS.OPERATOR_EVENTS,
  Sanction: KAFKA_TOPICS.SANCTION_EVENTS,

  // Legal aggregates
  Consent: KAFKA_TOPICS.CONSENT_EVENTS,
  DsrRequest: KAFKA_TOPICS.DSR_EVENTS,
  LawRegistry: KAFKA_TOPICS.LAW_REGISTRY_EVENTS,
};

/**
 * Outbox Processor Service
 * Polls outbox tables and publishes events to Kafka/Redpanda
 * Implements the Transactional Outbox Pattern
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private isProcessing = false;
  private processingEnabled = true;
  private readonly batchSize = 100;

  constructor(
    private readonly outbox: OutboxService,
    private readonly producer: KafkaProducerService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Outbox processor initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.processingEnabled = false;
    this.logger.log('Outbox processor stopped');
  }

  /**
   * Process outbox events every 5 seconds
   */
  @Cron(CronExpression.EVERY_5_SECONDS, { name: 'outbox-processor' })
  async processOutbox(): Promise<void> {
    if (!this.processingEnabled || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process each database's outbox
      await Promise.all([
        this.processDatabase('identity'),
        this.processDatabase('auth'),
        this.processDatabase('legal'),
      ]);
    } catch (error) {
      this.logger.error('Error processing outbox', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process outbox for a specific database
   */
  private async processDatabase(database: OutboxDatabase): Promise<void> {
    const events = await this.outbox.getPendingEvents(database, this.batchSize);

    if (events.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${events.length} events from ${database} outbox`);

    for (const event of events) {
      await this.processEvent(database, event);
    }
  }

  /**
   * Process a single outbox event
   */
  private async processEvent(database: OutboxDatabase, event: OutboxEvent): Promise<void> {
    try {
      // Mark as processing
      await this.outbox.markAsProcessing(database, event.id);

      // Get the target topic
      const topic = this.getTopicForAggregate(event.aggregateType);

      // Build the event message
      const message: EventMessage = {
        id: event.id,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
        timestamp: event.createdAt.toISOString(),
        metadata: {
          database,
          source: 'identity-service',
        },
      };

      // Publish to Kafka
      await this.producer.publish(topic, message);

      // Mark as completed
      await this.outbox.markAsCompleted(database, event.id);

      this.logger.debug(`Event processed: ${event.eventType} -> ${topic} [${event.id}]`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.outbox.markAsFailed(database, event.id, errorMessage);
      this.logger.error(`Failed to process event ${event.id}`, error);
    }
  }

  /**
   * Get Kafka topic for an aggregate type
   */
  private getTopicForAggregate(aggregateType: string): KafkaTopic {
    const topic = AGGREGATE_TOPIC_MAP[aggregateType];
    if (!topic) {
      this.logger.warn(`Unknown aggregate type: ${aggregateType}, using default topic`);
      return KAFKA_TOPICS.ACCOUNT_EVENTS; // Default fallback
    }
    return topic;
  }

  /**
   * Manually trigger outbox processing
   */
  async triggerProcessing(): Promise<void> {
    await this.processOutbox();
  }

  /**
   * Enable/disable processing
   */
  setProcessingEnabled(enabled: boolean): void {
    this.processingEnabled = enabled;
    this.logger.log(`Outbox processing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<{
    identity: { pending: number; processing: number; completed: number; failed: number };
    auth: { pending: number; processing: number; completed: number; failed: number };
    legal: { pending: number; processing: number; completed: number; failed: number };
    isProcessing: boolean;
    processingEnabled: boolean;
  }> {
    const [identity, auth, legal] = await Promise.all([
      this.outbox.getStats('identity'),
      this.outbox.getStats('auth'),
      this.outbox.getStats('legal'),
    ]);

    return {
      identity,
      auth,
      legal,
      isProcessing: this.isProcessing,
      processingEnabled: this.processingEnabled,
    };
  }

  /**
   * Cleanup old completed events (run daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'outbox-cleanup' })
  async cleanupOldEvents(): Promise<void> {
    const retentionDays = 7;

    const [identity, auth, legal] = await Promise.all([
      this.outbox.cleanupCompletedEvents('identity', retentionDays),
      this.outbox.cleanupCompletedEvents('auth', retentionDays),
      this.outbox.cleanupCompletedEvents('legal', retentionDays),
    ]);

    const total = identity + auth + legal;
    if (total > 0) {
      this.logger.log(
        `Cleaned up ${total} old events (identity: ${identity}, auth: ${auth}, legal: ${legal})`,
      );
    }
  }

  /**
   * Retry failed events (run every hour)
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'outbox-retry' })
  async retryFailedEvents(): Promise<void> {
    // This is handled by the normal processing since failed events
    // are set back to PENDING with incremented retry count
    this.logger.debug('Checking for retryable events');
  }
}
