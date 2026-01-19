import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import type { BaseDomainEvent } from '@my-girok/types';

/**
 * Kafka Producer Service
 * Handles publishing domain events to Kafka topics
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly isEnabled: boolean;

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled = this.configService.get<string>('REDPANDA_ENABLED') === 'true';
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.warn('Kafka is disabled. Events will not be published to Kafka.');
      return;
    }

    try {
      await this.kafkaClient.connect();
      this.logger.log('Kafka client connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.isEnabled) {
      await this.kafkaClient.close();
      this.logger.log('Kafka client disconnected');
    }
  }

  /**
   * Publish domain event to Kafka topic
   * Topic naming: domain.event_type (e.g., admin.created, admin.updated)
   */
  async publishEvent(topic: string, event: BaseDomainEvent): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug(`Kafka disabled. Event not published: ${topic}`);
      return;
    }

    try {
      await this.kafkaClient.emit(topic, {
        key: event.aggregateId,
        value: JSON.stringify(event),
        headers: {
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          timestamp: event.timestamp.toISOString(),
        },
      });

      this.logger.debug(`Event published to Kafka: ${topic}`, {
        eventId: event.eventId,
        eventType: event.eventType,
      });
    } catch (error) {
      this.logger.error(`Failed to publish event to Kafka: ${topic}`, error);
      throw error;
    }
  }

  /**
   * Check if Kafka is enabled
   */
  isKafkaEnabled(): boolean {
    return this.isEnabled;
  }
}
