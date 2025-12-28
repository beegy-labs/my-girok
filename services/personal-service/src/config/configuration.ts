export default () => ({
  port: parseInt(process.env.PORT || '3002', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  valkey: {
    host: process.env.VALKEY_HOST || 'localhost',
    port: parseInt(process.env.VALKEY_PORT || '6379', 10),
    password: process.env.VALKEY_PASSWORD || '',
    db: parseInt(process.env.VALKEY_DB || '1', 10), // DB 1 for personal-service
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucketName: process.env.MINIO_BUCKET_NAME || 'my-girok-resumes',
    publicUrl: process.env.MINIO_PUBLIC_URL,
  },

  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
});
