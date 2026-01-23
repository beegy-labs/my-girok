import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  HTTP_PORT: Joi.number().default(3000),
  GRPC_PORT: Joi.number().default(50055),

  // Database
  DATABASE_URL: Joi.string().required(),

  // gRPC - External Services
  GRPC_MAIL_HOST: Joi.string().default('localhost'),
  GRPC_MAIL_PORT: Joi.number().default(50054),
  GRPC_AUDIT_HOST: Joi.string().default('localhost'),
  GRPC_AUDIT_PORT: Joi.number().default(50053),

  // Kafka
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: Joi.string().default('notification-service'),
  KAFKA_CONSUMER_GROUP: Joi.string().default('notification-service-consumer'),
  KAFKA_TOPIC_PREFIX: Joi.string().allow('').default(''),
  KAFKA_TOPIC_PUSH: Joi.string().default('notification.push'),
  KAFKA_TOPIC_SMS: Joi.string().default('notification.sms'),
  KAFKA_TOPIC_DLQ: Joi.string().default('notification.dlq'),
  KAFKA_SASL_ENABLED: Joi.boolean().default(false),
  KAFKA_SASL_MECHANISM: Joi.string().default('scram-sha-512'),
  KAFKA_SASL_USERNAME: Joi.string().when('KAFKA_SASL_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  KAFKA_SASL_PASSWORD: Joi.string().when('KAFKA_SASL_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Firebase Cloud Messaging
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().optional(),
  FIREBASE_PROJECT_ID: Joi.string().optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().optional(),

  // SMS Provider
  SMS_PROVIDER: Joi.string().valid('twilio', 'aws-sns').default('twilio'),
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_FROM_NUMBER: Joi.string().optional(),

  // AWS (for SNS SMS)
  AWS_REGION: Joi.string().default('ap-northeast-2'),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  SNS_SMS_SENDER_ID: Joi.string().optional(),

  // Retry
  RETRY_MAX_ATTEMPTS: Joi.number().default(3),
  RETRY_BACKOFF_MS: Joi.number().default(1000),
  RETRY_BACKOFF_MULTIPLIER: Joi.number().default(2),

  // Rate Limiting
  RATE_LIMIT_PUSH_PER_USER_HOUR: Joi.number().default(100),
  RATE_LIMIT_SMS_PER_USER_DAY: Joi.number().default(10),

  // Audit Service
  AUDIT_SERVICE_ENABLED: Joi.boolean().default(false),
  AUDIT_SERVICE_GRPC_URL: Joi.string().default('localhost:50053'),

  // OTEL
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().optional(),
  OTEL_SERVICE_NAME: Joi.string().default('notification-service'),
});
