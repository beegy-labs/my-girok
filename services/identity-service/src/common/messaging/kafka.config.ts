import { KafkaConfig, logLevel } from 'kafkajs';

/**
 * Kafka/Redpanda configuration
 * Redpanda is Kafka-compatible, so we use KafkaJS
 */
export interface RedpandaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

/**
 * Get Kafka configuration from environment
 */
export function getKafkaConfig(): KafkaConfig {
  const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
  const clientId = process.env.KAFKA_CLIENT_ID || 'identity-service';

  return {
    clientId,
    brokers,
    logLevel: logLevel.WARN,
    ssl: process.env.REDPANDA_SSL === 'true',
    sasl: process.env.REDPANDA_SASL_USERNAME
      ? {
          mechanism: 'plain' as const,
          username: process.env.REDPANDA_SASL_USERNAME,
          password: process.env.REDPANDA_SASL_PASSWORD || '',
        }
      : undefined,
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
  return process.env.REDPANDA_CONSUMER_GROUP || 'identity-service-group';
}

/**
 * Identity service Kafka topics
 */
export const KAFKA_TOPICS = {
  // Identity domain events
  ACCOUNT_EVENTS: 'identity.account.events',
  SESSION_EVENTS: 'identity.session.events',
  DEVICE_EVENTS: 'identity.device.events',
  PROFILE_EVENTS: 'identity.profile.events',

  // Auth domain events
  ROLE_EVENTS: 'identity.role.events',
  PERMISSION_EVENTS: 'identity.permission.events',
  OPERATOR_EVENTS: 'identity.operator.events',
  SANCTION_EVENTS: 'identity.sanction.events',

  // Legal domain events
  CONSENT_EVENTS: 'identity.consent.events',
  DSR_EVENTS: 'identity.dsr.events',
  LAW_REGISTRY_EVENTS: 'identity.law-registry.events',

  // Dead letter queue
  DLQ: 'identity.dlq',

  // Saga coordination
  SAGA_COMMANDS: 'identity.saga.commands',
  SAGA_REPLIES: 'identity.saga.replies',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
