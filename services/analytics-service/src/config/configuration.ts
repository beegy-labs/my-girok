export default () => ({
  port: parseInt(process.env.PORT || '3004', 10),

  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT || '8123', 10),
    database: process.env.CLICKHOUSE_DATABASE || 'analytics_db',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
  },

  otel: {
    collectorEndpoint: process.env.OTEL_COLLECTOR_ENDPOINT || 'http://localhost:4317',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
  },

  rateLimit: {
    events: parseInt(process.env.RATE_LIMIT_EVENTS || '100', 10),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10),
  },
});
