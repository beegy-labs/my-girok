export default () => ({
  port: parseInt(process.env.PORT || '3005', 10),
  environment: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    publicKey: process.env.JWT_PUBLIC_KEY,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '14d',
    issuer: process.env.JWT_ISSUER || 'identity-service',
    audience: process.env.JWT_AUDIENCE || 'my-girok',
  },

  valkey: {
    host: process.env.VALKEY_HOST || 'localhost',
    port: parseInt(process.env.VALKEY_PORT || '6379', 10),
    password: process.env.VALKEY_PASSWORD || '',
    db: parseInt(process.env.VALKEY_DB || '0', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },

  // Security settings
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    accountLockThreshold: parseInt(process.env.ACCOUNT_LOCK_THRESHOLD || '5', 10),
    accountLockDurationMinutes: parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '15', 10),
    mfaBackupCodesCount: parseInt(process.env.MFA_BACKUP_CODES_COUNT || '10', 10),
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
});
