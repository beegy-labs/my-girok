import type { LoggerOptions } from 'pino';
import { trace, context as otelContext, TraceFlags } from '@opentelemetry/api';

/**
 * Valid Pino log levels
 */
const VALID_LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

/**
 * Log level type derived from valid levels.
 * Exported for consumers who need type-safe log level handling.
 */
export type LogLevel = (typeof VALID_LOG_LEVELS)[number];

/**
 * Check if a value is a valid log level.
 */
function isValidLogLevel(level: string): level is LogLevel {
  return (VALID_LOG_LEVELS as readonly string[]).includes(level);
}

/**
 * Validate and normalize log level with whitespace handling.
 */
function validateLogLevel(level: string | undefined, fallback: LogLevel): LogLevel {
  if (!level?.trim()) return fallback;
  const normalized = level.trim().toLowerCase();
  return isValidLogLevel(normalized) ? normalized : fallback;
}

/**
 * Sanitize user-controlled strings to prevent log injection attacks.
 * Removes control characters and limits length.
 */
function sanitizeLogString(value: string | undefined, maxLength = 500): string | undefined {
  if (!value) return value;
  return value
    .replace(/[\n\r\t\x00-\x1F\x7F]/g, ' ') // Replace control characters with space
    .substring(0, maxLength);
}

/**
 * Comprehensive list of sensitive field paths for redaction.
 * Uses both single-level (*) and deep (**) wildcards for nested objects.
 * Hoisted to module level for performance.
 */
const SENSITIVE_FIELD_PATHS: readonly string[] = [
  // ============================================
  // Authentication & Authorization
  // ============================================
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'idToken',
  'id_token',
  'bearerToken',
  'bearer_token',
  'jwtToken',
  'jwt_token',
  'jwt',
  'oauthToken',
  'oauth_token',
  'sessionToken',
  'session_token',
  'sessionId',
  'session_id',
  'csrfToken',
  'csrf_token',
  'xsrfToken',
  'xsrf_token',

  // ============================================
  // Cryptographic Keys & Certificates
  // ============================================
  'privateKey',
  'private_key',
  'publicKey',
  'public_key',
  'encryptionKey',
  'encryption_key',
  'decryptionKey',
  'signingKey',
  'signing_key',
  'symmetricKey',
  'asymmetricKey',
  'certificate',
  'cert',
  'key',
  'pem',

  // ============================================
  // Database & Connection Strings
  // ============================================
  'connectionString',
  'connection_string',
  'databaseUrl',
  'database_url',
  'dbPassword',
  'db_password',
  'mongoUri',
  'redisUrl',
  'redis_url',

  // ============================================
  // Personal Identifiable Information (PII)
  // ============================================
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
  'taxId',
  'tax_id',
  'nationalId',
  'passportNumber',
  'passport_number',
  'driversLicense',
  'drivers_license',
  'dateOfBirth',
  'date_of_birth',
  'dob',
  'mothersMaidenName',
  'mothers_maiden_name',

  // ============================================
  // Financial Information
  // ============================================
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvv2',
  'cvc',
  'securityCode',
  'security_code',
  'expiryDate',
  'expiry_date',
  'bankAccount',
  'bank_account',
  'accountNumber',
  'account_number',
  'routingNumber',
  'routing_number',
  'iban',
  'swiftCode',
  'swift_code',
  'pin',

  // ============================================
  // Biometric Data
  // ============================================
  'biometric',
  'fingerprint',
  'faceId',
  'face_id',
  'voicePrint',
  'retinaScan',

  // ============================================
  // Cloud Provider Credentials
  // ============================================
  'awsSecretAccessKey',
  'aws_secret_access_key',
  'awsSessionToken',
  'aws_session_token',
  'gcpServiceAccountKey',
  'azureClientSecret',
  'azure_client_secret',
  'clientSecret',
  'client_secret',
  'apiSecret',
  'api_secret',
  'webhookSecret',
  'webhook_secret',

  // ============================================
  // Deep Wildcards (** matches any nesting level)
  // ============================================
  '**.password',
  '**.token',
  '**.secret',
  '**.apiKey',
  '**.api_key',
  '**.authorization',
  '**.refreshToken',
  '**.accessToken',
  '**.privateKey',
  '**.private_key',
  '**.encryptionKey',
  '**.sessionToken',
  '**.bearerToken',
  '**.jwtToken',
  '**.oauthToken',
  '**.creditCard',
  '**.cardNumber',
  '**.cvv',
  '**.ssn',
  '**.connectionString',
  '**.databaseUrl',

  // ============================================
  // Single-level Wildcards (for common nesting)
  // ============================================
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.authorization',
  '*.refreshToken',
  '*.accessToken',
  '*.privateKey',
  '*.encryptionKey',
  '*.sessionToken',
  '*.bearerToken',
  '*.jwtToken',
  '*.oauthToken',
  '*.creditCard',
  '*.ssn',
  '*.connectionString',
  '*.databaseUrl',

  // ============================================
  // HTTP Request Specific
  // ============================================
  'req.headers.authorization',
  'req.headers.Authorization',
  'req.headers.cookie',
  'req.headers.Cookie',
  'req.headers["x-api-key"]',
  'req.headers["X-Api-Key"]',
  'req.headers["X-API-KEY"]',
  'req.headers["x-access-token"]',
  'req.headers["X-Access-Token"]',
  'req.headers["x-auth-token"]',
  'req.headers["x-session-id"]',

  // Request body sensitive fields
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.confirmPassword',
  'req.body.oldPassword',
  'req.body.token',
  'req.body.secret',
  'req.body.apiKey',
  'req.body.creditCard',
  'req.body.cardNumber',
  'req.body.cvv',
  'req.body.ssn',
  'req.body.pin',

  // Response body sensitive fields
  'res.body.password',
  'res.body.token',
  'res.body.accessToken',
  'res.body.refreshToken',
  'res.body.secret',
  'res.body.apiKey',
] as const;

/**
 * Pino configuration options.
 */
export interface PinoConfigOptions {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  level?: string;
  /** Additional paths to redact (merged with defaults) */
  additionalRedactPaths?: string[];
}

/**
 * Default Pino logger configuration for production use.
 * Uses JSON format for structured logging and log aggregation.
 */
export function createPinoConfig(options?: PinoConfigOptions): LoggerOptions {
  const serviceName = options?.serviceName ?? process.env.SERVICE_NAME ?? 'unknown-service';
  const serviceVersion = options?.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0';
  const environment = options?.environment ?? process.env.NODE_ENV ?? 'development';
  const isDevelopment = environment === 'development';
  const defaultLevel: LogLevel = isDevelopment ? 'debug' : 'info';

  // Warn if using debug/trace in production
  const configuredLevel = validateLogLevel(options?.level ?? process.env.LOG_LEVEL, defaultLevel);
  if (!isDevelopment && (configuredLevel === 'trace' || configuredLevel === 'debug')) {
    console.warn(
      `[pino] WARNING: ${configuredLevel} logging enabled in ${environment}. ` +
        'This may impact performance and expose sensitive debug information.',
    );
  }

  // Merge additional redact paths if provided
  const redactPaths = options?.additionalRedactPaths
    ? [...SENSITIVE_FIELD_PATHS, ...options.additionalRedactPaths]
    : SENSITIVE_FIELD_PATHS;

  return {
    level: configuredLevel,

    // Base fields added to every log entry (ECS compatible)
    base: {
      'ecs.version': '8.11.0',
      'service.name': serviceName,
      'service.version': serviceVersion,
      'service.environment': environment,
      'host.name': process.env.HOSTNAME ?? process.env.POD_NAME ?? 'localhost',
    },

    // Rename default pino fields to ECS format
    messageKey: 'message',
    timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,

    // Format log level as string instead of number
    formatters: {
      level(label) {
        return { 'log.level': label };
      },
    },

    // Redact sensitive fields
    redact: {
      paths: [...redactPaths],
      censor: '[REDACTED]',
    },

    // Development: use pino-pretty for human-readable output
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore:
              'pid,hostname,ecs.version,service.name,service.version,service.environment,host.name',
          },
        }
      : undefined,
  };
}

/**
 * Pino HTTP configuration for request logging.
 * Integrates with NestJS HTTP request pipeline and OTEL tracing.
 */
export function createPinoHttpConfig(options?: PinoConfigOptions) {
  const pinoConfig = createPinoConfig(options);
  const isDevelopment = (options?.environment ?? process.env.NODE_ENV) === 'development';

  return {
    pinoHttp: {
      ...pinoConfig,

      // Customize request logging with OTEL trace context (with error handling)
      customProps: () => {
        try {
          const activeSpan = trace.getSpan(otelContext.active());
          const spanContext = activeSpan?.spanContext();

          if (spanContext?.traceId && spanContext?.spanId) {
            const isSampled = (spanContext.traceFlags & TraceFlags.SAMPLED) !== 0;
            return {
              'log.type': 'api_log',
              'trace.id': spanContext.traceId,
              'span.id': spanContext.spanId,
              'trace.flags': spanContext.traceFlags,
              'trace.sampled': isSampled,
            };
          }
        } catch {
          // OTEL not initialized or context unavailable - continue without trace context
        }
        return { 'log.type': 'api_log' };
      },

      // Generate request ID
      genReqId: (req) =>
        (req.headers as Record<string, string | string[] | undefined>)[
          'x-request-id'
        ]?.toString() ?? crypto.randomUUID(),

      // Customize log level based on status code
      customLogLevel: (_req: unknown, res: { statusCode: number }, err?: Error) => {
        if (err || res.statusCode >= 500) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },

      // Skip logging for health check endpoints
      autoLogging: {
        ignore: (req: { url?: string }) => {
          const url = req.url ?? '';
          return (
            url === '/health' ||
            url === '/health/ready' ||
            url === '/health/live' ||
            url === '/metrics' ||
            url.startsWith('/health/')
          );
        },
      },

      // Serialize request/response objects with length limits for security
      serializers: {
        req: (req: {
          id: string;
          method: string;
          url: string;
          headers: Record<string, string>;
          remoteAddress?: string;
        }) => ({
          'http.request_id': req.id,
          'http.method': req.method,
          'http.path': sanitizeLogString(req.url, 2048), // Limit URL length
          'client.ip': req.remoteAddress ?? req.headers['x-forwarded-for'],
          'user_agent.original': sanitizeLogString(req.headers['user-agent'], 500),
        }),
        res: (res: { statusCode: number }) => ({
          'http.status_code': res.statusCode,
        }),
        err: (err: { name?: string; message: string; stack?: string; cause?: Error }) => ({
          'error.type': err.name ?? 'Error',
          'error.message': sanitizeLogString(err.message, 1000), // Sanitize error message
          'error.stack_trace': isDevelopment ? err.stack : undefined,
          // Include cause chain for debugging
          ...(err.cause && {
            'error.cause': {
              type: err.cause.name,
              message: sanitizeLogString(err.cause.message, 500),
            },
          }),
        }),
      },

      // Customize success message with sanitized content
      customSuccessMessage: (_req: unknown, res: { statusCode: number }, responseTime: number) =>
        `Request completed in ${responseTime}ms with status ${res.statusCode}`,

      // Customize error message with sanitized content
      customErrorMessage: (_req: unknown, res: { statusCode: number }, err: Error) => {
        const sanitizedMessage = sanitizeLogString(err.message, 500);
        return `Request failed with status ${res.statusCode}: ${sanitizedMessage}`;
      },

      // Add response time to logs
      customAttributeKeys: {
        reqId: 'http.request_id',
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'http.response_time_ms',
      },
    },
  };
}
