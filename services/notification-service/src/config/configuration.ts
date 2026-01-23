export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  http: {
    port: parseInt(process.env.HTTP_PORT || '3000', 10),
  },
  grpc: {
    port: parseInt(process.env.GRPC_PORT || '50055', 10),
    // External gRPC services
    mail: {
      host: process.env.GRPC_MAIL_HOST || 'localhost',
      port: parseInt(process.env.GRPC_MAIL_PORT || '50054', 10),
    },
    audit: {
      host: process.env.GRPC_AUDIT_HOST || 'localhost',
      port: parseInt(process.env.GRPC_AUDIT_PORT || '50053', 10),
    },
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'notification-service-consumer',
    topicPrefix: process.env.KAFKA_TOPIC_PREFIX || '',
    topics: {
      push: process.env.KAFKA_TOPIC_PUSH || 'notification.push',
      sms: process.env.KAFKA_TOPIC_SMS || 'notification.sms',
      dlq: process.env.KAFKA_TOPIC_DLQ || 'notification.dlq',
    },
    sasl: {
      enabled: process.env.KAFKA_SASL_ENABLED === 'true',
      mechanism: process.env.KAFKA_SASL_MECHANISM || 'scram-sha-512',
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD,
    },
  },
  // Firebase Cloud Messaging for Push notifications
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  // SMS provider (Twilio or AWS SNS)
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio', // twilio | aws-sns
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
    awsSns: {
      region: process.env.AWS_REGION || 'ap-northeast-2',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      smsSenderId: process.env.SNS_SMS_SENDER_ID,
    },
  },
  // Retry configuration
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
    backoffMs: parseInt(process.env.RETRY_BACKOFF_MS || '1000', 10),
    backoffMultiplier: parseInt(process.env.RETRY_BACKOFF_MULTIPLIER || '2', 10),
  },
  // Rate limiting per user
  rateLimit: {
    pushPerUserHour: parseInt(process.env.RATE_LIMIT_PUSH_PER_USER_HOUR || '100', 10),
    smsPerUserDay: parseInt(process.env.RATE_LIMIT_SMS_PER_USER_DAY || '10', 10),
  },
  // Audit Service for auth-related notification tracking
  audit: {
    enabled: process.env.AUDIT_SERVICE_ENABLED === 'true',
    grpcUrl: process.env.AUDIT_SERVICE_GRPC_URL || 'localhost:50053',
  },
  otel: {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME || 'notification-service',
  },
});
