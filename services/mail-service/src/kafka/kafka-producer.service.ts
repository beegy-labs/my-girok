import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { getKafkaConfig, getTopics } from './kafka.config';
import { MailSendMessage, MailDlqMessage, MailStatusMessage } from './kafka.types';
import { randomUUID } from 'crypto';

/**
 * Kafka Producer Service
 * Handles publishing email messages to Kafka topics
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;
  private readonly isEnabled: boolean;
  private readonly topics: ReturnType<typeof getTopics>;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<string>('kafka.brokers') !== undefined;
    this.kafka = new Kafka(getKafkaConfig());
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
      idempotent: true,
    });
    this.topics = getTopics();
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Kafka is disabled. Email messages will not be published to Kafka.');
      return;
    }

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
   * Publish email send message to Kafka
   */
  async publishMailSend(message: Omit<MailSendMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: MailSendMessage = {
      ...message,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    await this.publish(this.topics.MAIL_SEND, fullMessage);
    return fullMessage.id;
  }

  /**
   * Publish email status update
   */
  async publishMailStatus(message: Omit<MailStatusMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: MailStatusMessage = {
      ...message,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    await this.publish(this.topics.MAIL_STATUS, fullMessage);
  }

  /**
   * Send failed message to Dead Letter Queue
   */
  async sendToDlq(
    originalMessage: MailSendMessage,
    error: Error,
    originalTopic: string,
  ): Promise<void> {
    const dlqMessage: MailDlqMessage = {
      ...originalMessage,
      errorMessage: error.message,
      errorStack: error.stack,
      dlqTimestamp: new Date().toISOString(),
      originalTopic,
    };

    await this.publish(this.topics.MAIL_DLQ, dlqMessage);
    this.logger.warn(`Message sent to DLQ: ${originalMessage.id} from ${originalTopic}`);
  }

  /**
   * Publish a message to a topic
   */
  private async publish(
    topic: string,
    message: MailSendMessage | MailDlqMessage | MailStatusMessage,
  ): Promise<RecordMetadata[]> {
    if (!this.isEnabled) {
      this.logger.debug(`Kafka disabled. Message not published: ${topic}`);
      return [];
    }

    if (!this.isConnected) {
      await this.connect();
    }

    // Determine message key
    const messageKey =
      'emailLogId' in message && message.emailLogId ? message.emailLogId : message.id;

    // Determine message type
    let messageType = 'new';
    if ('eventType' in message) {
      messageType = message.eventType;
    } else if ('retryCount' in message && message.retryCount > 0) {
      messageType = 'retry';
    }

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: messageKey,
          value: JSON.stringify(message),
          headers: {
            'message-id': message.id,
            'message-type': messageType,
            timestamp: message.timestamp,
          },
        },
      ],
    };

    try {
      const metadata = await this.producer.send(record);
      this.logger.debug(`Message published to ${topic} [partition: ${metadata[0]?.partition}]`, {
        messageId: message.id,
      });
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to publish message to ${topic}`, error);
      throw error;
    }
  }

  /**
   * Check if producer is connected
   */
  isProducerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if Kafka is enabled
   */
  isKafkaEnabled(): boolean {
    return this.isEnabled;
  }
}
