import * as Joi from 'joi';

/**
 * Environment variable validation schema
 * Validates all required environment variables at startup
 */
export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3005),

  // Database URL (single database)
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).when('JWT_PUBLIC_KEY', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  JWT_PUBLIC_KEY: Joi.string().optional(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('14d'),
  JWT_ISSUER: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('identity-service'),
  }),
  JWT_AUDIENCE: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('my-girok'),
  }),

  // Valkey/Redis
  VALKEY_HOST: Joi.string().default('localhost'),
  VALKEY_PORT: Joi.number().port().default(6379),
  VALKEY_PASSWORD: Joi.string().allow('').default(''),
  VALKEY_DB: Joi.number().min(0).max(15).default(0),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Security
  BCRYPT_ROUNDS: Joi.number().min(10).max(14).default(12),
  ACCOUNT_LOCK_THRESHOLD: Joi.number().min(3).max(10).default(5),
  ACCOUNT_LOCK_DURATION_MINUTES: Joi.number().min(5).max(60).default(15),
  MFA_BACKUP_CODES_COUNT: Joi.number().min(5).max(20).default(10),
  ENCRYPTION_KEY: Joi.string().min(43).max(44).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // API Keys
  API_KEYS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Session
  SESSION_DURATION_MS: Joi.number().default(86400000), // 24 hours
  MAX_SESSIONS_PER_ACCOUNT: Joi.number().min(1).max(50).default(10),

  // Account
  ACCOUNT_EXTERNAL_ID_PREFIX: Joi.string().default('ACC_'),
  ACCOUNT_EXTERNAL_ID_LENGTH: Joi.number().min(8).max(20).default(10),
  USERNAME_MAX_LENGTH: Joi.number().min(10).max(50).default(20),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60000), // 1 minute
  RATE_LIMIT_MAX: Joi.number().default(100),

  // Kafka/Redpanda
  REDPANDA_BROKERS: Joi.string().optional(),
  REDPANDA_SASL_USERNAME: Joi.string().optional(),
  REDPANDA_SASL_PASSWORD: Joi.string().optional(),
}).options({
  allowUnknown: true,
  abortEarly: false,
});
