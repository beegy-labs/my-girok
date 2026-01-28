import { KafkaConfig, logLevel } from 'kafkajs';

/**
 * Kafka/Redpanda configuration for mail-service
 * Redpanda is Kafka-compatible, so we use KafkaJS
 */

/**
 * Get Kafka configuration from environment
 */
export function getKafkaConfig(): KafkaConfig {
  const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
  const clientId = process.env.KAFKA_CLIENT_ID || 'mail-service';

  // Build SASL configuration
  let sasl: KafkaConfig['sasl'];
  if (process.env.KAFKA_SASL_USERNAME) {
    const mechanism = process.env.KAFKA_SASL_MECHANISM || 'scram-sha-512';
    if (mechanism === 'plain') {
      sasl = {
        mechanism: 'plain' as const,
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD || '',
      };
    } else if (mechanism === 'scram-sha-256') {
      sasl = {
        mechanism: 'scram-sha-256' as const,
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD || '',
      };
    } else {
      sasl = {
        mechanism: 'scram-sha-512' as const,
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD || '',
      };
    }
  }

  return {
    clientId,
    brokers,
    logLevel: logLevel.WARN,
    ssl: process.env.KAFKA_SSL === 'true',
    sasl,
    retry: {
      initialRetryTime: 100,
      retries: 8,
      maxRetryTime: 30000,
      factor: 2,
    },
    connectionTimeout: 10000,
    requestTimeout: 30000,
  };
}

/**
 * Get consumer group ID
 */
export function getConsumerGroupId(): string {
  return process.env.KAFKA_CONSUMER_GROUP || 'mail-service-consumer';
}

/**
 * Get topic prefix based on environment
 * - dev. for development
 * - release. for staging
 * - "" (empty) for production
 */
export function getTopicPrefix(): string {
  return process.env.KAFKA_TOPIC_PREFIX || '';
}

/**
 * Get full topic name with prefix
 */
export function getTopicName(baseName: string): string {
  const prefix = getTopicPrefix();
  return prefix ? `${prefix}${baseName}` : baseName;
}

/**
 * Mail service Kafka topics
 */
export const KAFKA_TOPICS = {
  /** Main topic for email sending requests */
  MAIL_SEND: 'mail.send',

  /** Dead letter queue for failed messages */
  MAIL_DLQ: 'mail.send.dlq',

  /** Email status updates (delivery, bounce, etc.) */
  MAIL_STATUS: 'mail.status',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/**
 * Get full topic names with prefix
 */
export function getTopics(): Record<keyof typeof KAFKA_TOPICS, string> {
  return {
    MAIL_SEND: getTopicName(KAFKA_TOPICS.MAIL_SEND),
    MAIL_DLQ: getTopicName(KAFKA_TOPICS.MAIL_DLQ),
    MAIL_STATUS: getTopicName(KAFKA_TOPICS.MAIL_STATUS),
  };
}
