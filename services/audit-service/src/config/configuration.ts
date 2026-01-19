export default () => ({
  port: parseInt(process.env.PORT || '3003', 10),

  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT || '8123', 10),
    database: process.env.CLICKHOUSE_DATABASE || 'audit_db',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
  },

  valkey: {
    host: process.env.VALKEY_HOST || 'localhost',
    port: parseInt(process.env.VALKEY_PORT || '6379', 10),
    password: process.env.VALKEY_PASSWORD || '',
    db: parseInt(process.env.VALKEY_DB || '3', 10), // DB 3 for audit-service
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
  },

  export: {
    bucket: process.env.EXPORT_S3_BUCKET,
    region: process.env.EXPORT_S3_REGION || 'ap-northeast-2',
  },

  kafka: {
    enabled: process.env.REDPANDA_ENABLED === 'true',
    brokers: (process.env.REDPANDA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'audit-service',
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'audit-service-admin-events',
    sasl: {
      username: process.env.REDPANDA_SASL_USERNAME,
      password: process.env.REDPANDA_SASL_PASSWORD,
    },
    consumer: {
      sessionTimeout: parseInt(process.env.KAFKA_SESSION_TIMEOUT || '30000', 10),
      heartbeatInterval: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL || '3000', 10),
      rebalanceTimeout: parseInt(process.env.KAFKA_REBALANCE_TIMEOUT || '60000', 10),
      retry: {
        initialRetryTime: parseInt(process.env.KAFKA_RETRY_INITIAL_TIME || '100', 10),
        retries: parseInt(process.env.KAFKA_RETRY_COUNT || '8', 10),
        maxRetryTime: parseInt(process.env.KAFKA_RETRY_MAX_TIME || '30000', 10),
        multiplier: parseInt(process.env.KAFKA_RETRY_MULTIPLIER || '2', 10),
      },
    },
  },
});
