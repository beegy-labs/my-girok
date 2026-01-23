export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  http: {
    port: parseInt(process.env.HTTP_PORT || '3000', 10),
  },
  grpc: {
    port: parseInt(process.env.GRPC_PORT || '50054', 10),
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'mail-service',
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'mail-service-consumer',
    topicPrefix: process.env.KAFKA_TOPIC_PREFIX || '',
    topics: {
      send: process.env.KAFKA_TOPIC_SEND || 'mail.send',
      dlq: process.env.KAFKA_TOPIC_DLQ || 'mail.send.dlq',
      // NOTE: No audit topic - use audit-service gRPC instead
    },
    sasl: {
      enabled: process.env.KAFKA_SASL_ENABLED === 'true',
      mechanism: process.env.KAFKA_SASL_MECHANISM || 'scram-sha-512',
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD,
    },
  },
  // Audit Service (gRPC) - for auth-related compliance tracking
  // Flow: mail-service → audit-service gRPC → OTEL Collector → Kafka → ClickHouse
  audit: {
    enabled: process.env.AUDIT_SERVICE_ENABLED === 'true',
    grpcUrl: process.env.AUDIT_SERVICE_GRPC_URL || 'localhost:50054',
  },
  ses: {
    region: process.env.AWS_REGION || 'ap-northeast-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    fromAddresses: {
      default: process.env.SES_FROM_EMAIL_DEFAULT || 'noreply@example.com',
      support: process.env.SES_FROM_EMAIL_SUPPORT || 'support@example.com',
    },
    configurationSet: process.env.SES_CONFIGURATION_SET || 'mail-tracking',
  },
  i18n: {
    defaultLocale: process.env.I18N_DEFAULT_LOCALE || 'en',
    supportedLocales: (process.env.I18N_SUPPORTED_LOCALES || 'en,ko,ja,zh').split(','),
    fallbackLocale: process.env.I18N_FALLBACK_LOCALE || 'en',
  },
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
    backoffMs: parseInt(process.env.RETRY_BACKOFF_MS || '1000', 10),
    backoffMultiplier: parseInt(process.env.RETRY_BACKOFF_MULTIPLIER || '2', 10),
  },
  otel: {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME || 'mail-service',
  },
});
