import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { getKafkaConfig, getConsumerGroupId, KafkaTopic } from './kafka.config';
import { EventMessage, KafkaProducerService } from './kafka-producer.service';

/**
 * Event handler type
 */
export type EventHandler = (event: EventMessage) => Promise<void>;

/**
 * Subscription configuration
 */
export interface SubscriptionConfig {
  topic: KafkaTopic;
  handler: EventHandler;
  fromBeginning?: boolean;
}

/**
 * Kafka Consumer Service
 * Handles consuming events from Redpanda/Kafka
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected = false;
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly subscriptions: SubscriptionConfig[] = [];

  constructor(private readonly producer: KafkaProducerService) {
    this.kafka = new Kafka(getKafkaConfig());
    this.consumer = this.kafka.consumer({
      groupId: getConsumerGroupId(),
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    // Don't auto-connect - let the module decide when to start consuming
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Register an event handler for a topic
   */
  registerHandler(topic: KafkaTopic, handler: EventHandler): void {
    const existing = this.handlers.get(topic) || [];
    existing.push(handler);
    this.handlers.set(topic, existing);
    this.logger.log(`Handler registered for topic: ${topic}`);
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(config: SubscriptionConfig): Promise<void> {
    this.subscriptions.push(config);
    this.registerHandler(config.topic, config.handler);
  }

  /**
   * Connect and start consuming
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.consumer.connect();

      // Subscribe to all registered topics
      const topics = [...new Set(this.subscriptions.map((s) => s.topic))];
      for (const topic of topics) {
        const fromBeginning =
          this.subscriptions.find((s) => s.topic === topic)?.fromBeginning ?? false;
        await this.consumer.subscribe({ topic, fromBeginning });
        this.logger.log(`Subscribed to topic: ${topic}`);
      }

      // Start consuming
      await this.consumer.run({
        eachMessage: async (payload) => this.handleMessage(payload),
      });

      this.isConnected = true;
      this.logger.log('Kafka consumer connected and running');
    } catch (error) {
      this.logger.error('Failed to connect Kafka consumer', error);
      throw error;
    }
  }

  /**
   * Disconnect consumer
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka consumer disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka consumer', error);
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const eventId = message.headers?.['event-id']?.toString() || 'unknown';

    try {
      if (!message.value) {
        this.logger.warn(`Empty message received on ${topic}`);
        return;
      }

      const event: EventMessage = JSON.parse(message.value.toString());
      const handlers = this.handlers.get(topic) || [];

      this.logger.debug(
        `Processing event: ${event.eventType} from ${topic} [partition: ${partition}]`,
      );

      // Execute all handlers for this topic
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (handlerError) {
          this.logger.error(`Handler error for event ${eventId} on ${topic}`, handlerError);
          // Send to DLQ on handler error
          await this.producer.sendToDLQ(
            topic,
            event,
            handlerError instanceof Error ? handlerError : new Error(String(handlerError)),
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process message on ${topic}`, error);
      // Don't throw - continue processing other messages
    }
  }

  /**
   * Pause consumption for a topic
   */
  async pause(topic: KafkaTopic): Promise<void> {
    this.consumer.pause([{ topic }]);
    this.logger.log(`Consumption paused for topic: ${topic}`);
  }

  /**
   * Resume consumption for a topic
   */
  async resume(topic: KafkaTopic): Promise<void> {
    this.consumer.resume([{ topic }]);
    this.logger.log(`Consumption resumed for topic: ${topic}`);
  }

  /**
   * Check if consumer is connected
   */
  isConsumerConnected(): boolean {
    return this.isConnected;
  }
}
