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

  export: {
    s3Bucket: process.env.EXPORT_S3_BUCKET,
    s3Region: process.env.EXPORT_S3_REGION || 'ap-northeast-2',
  },
});
