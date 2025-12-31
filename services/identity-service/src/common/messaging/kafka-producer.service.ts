import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { getKafkaConfig, KafkaTopic } from './kafka.config';

/**
 * Event message structure
 */
export interface EventMessage {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Kafka Producer Service
 * Handles publishing events to Redpanda/Kafka
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka(getKafkaConfig());
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
      idempotent: true,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Kafka on startup', error);
      // Don't throw - allow service to start without Kafka
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Connect to Kafka broker
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka broker
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka producer disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka producer', error);
    }
  }

  /**
   * Publish a single event to a topic
   */
  async publish(topic: KafkaTopic, event: EventMessage): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: `${event.aggregateType}:${event.aggregateId}`,
          value: JSON.stringify(event),
          headers: {
            'event-type': event.eventType,
            'aggregate-type': event.aggregateType,
            'aggregate-id': event.aggregateId,
            'event-id': event.id,
            timestamp: event.timestamp,
          },
        },
      ],
    };

    try {
      const metadata = await this.producer.send(record);
      this.logger.debug(
        `Event published: ${event.eventType} to ${topic} [partition: ${metadata[0]?.partition}]`,
      );
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.eventType}`, error);
      throw error;
    }
  }

  /**
   * Publish multiple events to a topic in a batch
   */
  async publishBatch(topic: KafkaTopic, events: EventMessage[]): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    const record: ProducerRecord = {
      topic,
      messages: events.map((event) => ({
        key: `${event.aggregateType}:${event.aggregateId}`,
        value: JSON.stringify(event),
        headers: {
          'event-type': event.eventType,
          'aggregate-type': event.aggregateType,
          'aggregate-id': event.aggregateId,
          'event-id': event.id,
          timestamp: event.timestamp,
        },
      })),
    };

    try {
      const metadata = await this.producer.send(record);
      this.logger.debug(`Batch published: ${events.length} events to ${topic}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to publish batch to ${topic}`, error);
      throw error;
    }
  }

  /**
   * Send to dead letter queue
   */
  async sendToDLQ(originalTopic: string, event: EventMessage, error: Error): Promise<void> {
    const dlqEvent: EventMessage = {
      ...event,
      metadata: {
        ...event.metadata,
        originalTopic,
        error: error.message,
        errorStack: error.stack,
        dlqTimestamp: new Date().toISOString(),
      },
    };

    await this.publish('identity.dlq' as KafkaTopic, dlqEvent);
    this.logger.warn(`Event sent to DLQ: ${event.id} from ${originalTopic}`);
  }

  /**
   * Check if producer is connected
   */
  isProducerConnected(): boolean {
    return this.isConnected;
  }
}
