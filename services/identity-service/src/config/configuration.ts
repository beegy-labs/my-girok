/**
 * Identity Service Configuration
 *
 * 2026 Best Practices:
 * - All settings configurable via environment variables
 * - Sensible defaults for development
 * - Structured configuration for easy access
 */
export default () => ({
  // Service info
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  version: process.env.SERVICE_VERSION || '1.0.0',

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    publicKey: process.env.JWT_PUBLIC_KEY,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '14d',
    issuer: process.env.JWT_ISSUER || 'identity-service',
    audience: process.env.JWT_AUDIENCE || 'my-girok',
  },

  // Valkey/Redis configuration
  valkey: {
    host: process.env.VALKEY_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.VALKEY_PORT || process.env.REDIS_PORT || '6379', 10),
    password: process.env.VALKEY_PASSWORD || process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.VALKEY_DB || process.env.REDIS_DB || '0', 10),
  },

  // CORS configuration
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },

  // Security settings
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    accountLockThreshold: parseInt(process.env.ACCOUNT_LOCK_THRESHOLD || '5', 10),
    accountLockDurationMinutes: parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '15', 10),
    mfaBackupCodesCount: parseInt(process.env.MFA_BACKUP_CODES_COUNT || '10', 10),
    encryptionKey: process.env.ENCRYPTION_KEY,
  },

  // Session settings
  session: {
    defaultDurationMs: parseInt(process.env.SESSION_DURATION_MS || '86400000', 10), // 24 hours
    maxSessionsPerAccount: parseInt(process.env.MAX_SESSIONS_PER_ACCOUNT || '10', 10),
  },

  // Account settings
  account: {
    externalIdPrefix: process.env.ACCOUNT_EXTERNAL_ID_PREFIX || 'ACC_',
    externalIdLength: parseInt(process.env.ACCOUNT_EXTERNAL_ID_LENGTH || '10', 10),
    usernameMaxLength: parseInt(process.env.USERNAME_MAX_LENGTH || '20', 10),
  },

  // Rate limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10), // 1 minute
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // OpenTelemetry configuration
  telemetry: {
    enabled: process.env.OTEL_ENABLED === 'true',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME || 'identity-service',
  },

  // Audit logging
  audit: {
    enabled: process.env.AUDIT_ENABLED !== 'false', // Enabled by default
  },

  // API Keys for service-to-service communication
  apiKeys: {
    keys: (process.env.API_KEYS || '').split(',').filter(Boolean),
  },
});
