import * as Joi from 'joi';

/**
 * Environment variable validation schema
 * Validates all required environment variables at startup
 */
export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3006),

  // Database URL
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }),

  // Valkey/Redis
  VALKEY_HOST: Joi.string().default('localhost'),
  VALKEY_PORT: Joi.number().port().default(6379),
  VALKEY_PASSWORD: Joi.string().allow('').default(''),
  VALKEY_DB: Joi.number().min(0).max(15).default(0),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60000), // 1 minute
  RATE_LIMIT_MAX: Joi.number().default(100),

  // Kafka/Redpanda
  REDPANDA_BROKERS: Joi.string().optional(),
  REDPANDA_SASL_USERNAME: Joi.string().optional(),
  REDPANDA_SASL_PASSWORD: Joi.string().optional(),

  // DSR Settings
  DSR_DEFAULT_DUE_DAYS: Joi.number().min(1).max(90).default(30), // GDPR: 30 days
}).options({
  allowUnknown: true,
  abortEarly: false,
});
