import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  HTTP_PORT: Joi.number().default(3000),
  GRPC_PORT: Joi.number().default(50054),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Kafka
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: Joi.string().default('mail-service'),
  KAFKA_CONSUMER_GROUP: Joi.string().default('mail-service-consumer'),
  KAFKA_TOPIC_PREFIX: Joi.string().allow('').default(''),
  KAFKA_TOPIC_SEND: Joi.string().default('mail.send'),
  KAFKA_TOPIC_DLQ: Joi.string().default('mail.send.dlq'),
  KAFKA_TOPIC_AUDIT: Joi.string().default('audit.events'),
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

  // AWS SES
  AWS_REGION: Joi.string().default('ap-northeast-2'),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  SES_FROM_EMAIL_DEFAULT: Joi.string().default('noreply@example.com'),
  SES_FROM_EMAIL_SUPPORT: Joi.string().default('support@example.com'),
  SES_CONFIGURATION_SET: Joi.string().default('mail-tracking'),

  // i18n
  I18N_DEFAULT_LOCALE: Joi.string().default('en'),
  I18N_SUPPORTED_LOCALES: Joi.string().default('en,ko,ja,zh'),
  I18N_FALLBACK_LOCALE: Joi.string().default('en'),

  // Retry
  RETRY_MAX_ATTEMPTS: Joi.number().default(3),
  RETRY_BACKOFF_MS: Joi.number().default(1000),
  RETRY_BACKOFF_MULTIPLIER: Joi.number().default(2),

  // OTEL
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().optional(),
  OTEL_SERVICE_NAME: Joi.string().default('mail-service'),
});
