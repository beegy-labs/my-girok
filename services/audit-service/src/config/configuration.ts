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

  JWT_SECRET: process.env.JWT_SECRET,

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

  otel: {
    collectorEndpoint: process.env.OTEL_COLLECTOR_ENDPOINT || 'http://localhost:4317',
    enabled: process.env.OTEL_GATEWAY_ENABLED !== 'false',
    timeout: parseInt(process.env.OTEL_FORWARD_TIMEOUT || '30000', 10),
  },

  telemetry: {
    apiKeys: process.env.TELEMETRY_API_KEYS || '',
    rateLimits: {
      traces: parseInt(process.env.RATE_LIMIT_TRACES || '1000', 10),
      metrics: parseInt(process.env.RATE_LIMIT_METRICS || '2000', 10),
      logs: parseInt(process.env.RATE_LIMIT_LOGS || '5000', 10),
    },
  },
});
