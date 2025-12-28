export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    domainAccessExpiresIn: process.env.JWT_DOMAIN_ACCESS_EXPIRES_IN || '30m',
  },

  valkey: {
    host: process.env.VALKEY_HOST || 'localhost',
    port: parseInt(process.env.VALKEY_PORT || '6379', 10),
    password: process.env.VALKEY_PASSWORD || '',
    db: parseInt(process.env.VALKEY_DB || '2', 10), // DB 2 for auth-service
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
});
