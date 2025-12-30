import type { LoggerOptions, LevelWithSilent } from 'pino';
import type { Options as PinoHttpOptions } from 'pino-http';
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
 * UUID regex for validating request IDs.
 * Accepts all UUID versions (1-8), nil UUID (all zeros), and max UUID (all f's).
 * The version digit can be 0-9a-f to accommodate nil, max, and future versions.
 * The variant digit accepts 8-9a-b for RFC 4122, plus 0-7 for nil UUID compatibility.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f][0-9a-f]{3}-[0-9a-f][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * ANSI escape sequence regex for stripping terminal control codes.
 * Matches CSI sequences, OSC sequences, and basic escape codes.
 * Hoisted to module level for performance.
 */
const ANSI_ESCAPE_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07]*\x07)/g;

/**
 * Control character regex for sanitizing log strings.
 * Matches:
 * - ASCII control characters (0x00-0x1F, 0x7F)
 * - Unicode control characters (0x80-0x9F)
 * - Unicode line/paragraph separators (U+2028, U+2029)
 * - Zero-width characters (U+200B-U+200D, U+FEFF)
 * - Bidirectional text override characters (U+202A-U+202F)
 * - Bidirectional isolate characters (U+2066-U+2069)
 * Hoisted to module level for performance.
 */
const CONTROL_CHAR_REGEX =
  /[\x00-\x1F\x7F\u0080-\u009F\u2028\u2029\u200B-\u200D\uFEFF\u202A-\u202F\u2066-\u2069]/g;

/**
 * IPv4 address validation regex.
 * Matches standard dotted decimal notation (0-255.0-255.0-255.0-255).
 */
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * IPv6 address validation regex.
 * Matches full, compressed, and IPv4-mapped IPv6 addresses.
 */
const IPV6_REGEX =
  /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::(?:[fF]{4}:)?(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$/;

/**
 * Default health check endpoints for O(1) lookup.
 * Used to skip logging for health/readiness/liveness probes.
 * Can be overridden via PinoConfigOptions.healthEndpoints.
 */
export const DEFAULT_HEALTH_ENDPOINTS: readonly string[] = [
  '/health',
  '/health/ready',
  '/health/live',
  '/healthz',
  '/readyz',
  '/livez',
  '/metrics',
  '/ping',
  '/_health',
] as const;

/**
 * Validate and sanitize IP address.
 * Returns sanitized IP if valid IPv4/IPv6, undefined otherwise.
 */
function sanitizeIpAddress(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const trimmedIp = ip.trim();
  if (IPV4_REGEX.test(trimmedIp) || IPV6_REGEX.test(trimmedIp)) {
    return trimmedIp;
  }
  return undefined;
}

/**
 * LRU cache for sanitized strings to avoid repeated processing.
 * Uses WeakRef-like approach with max size limit for memory safety.
 * Cache key format: "value|maxLength" to handle different length limits.
 */
const SANITIZE_CACHE_MAX_SIZE = 1000;
const sanitizeCache = new Map<string, string>();

/**
 * Get or compute sanitized string with caching for high-volume logging.
 * Uses an LRU-like eviction strategy (clear half when full).
 */
function getCachedSanitizedString(value: string, maxLength: number): string {
  const cacheKey = `${value.substring(0, 100)}|${maxLength}|${value.length}`;
  const cached = sanitizeCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const sanitized = value
    .normalize('NFKC')
    .replace(ANSI_ESCAPE_REGEX, '')
    .replace(CONTROL_CHAR_REGEX, '')
    .substring(0, maxLength);

  // Evict oldest entries when full using O(1) Map insertion order
  if (sanitizeCache.size >= SANITIZE_CACHE_MAX_SIZE) {
    const iterator = sanitizeCache.keys();
    const halfSize = SANITIZE_CACHE_MAX_SIZE / 2;
    for (let i = 0; i < halfSize; i++) {
      const key = iterator.next().value;
      if (key !== undefined) {
        sanitizeCache.delete(key);
      }
    }
  }

  sanitizeCache.set(cacheKey, sanitized);
  return sanitized;
}

/**
 * Sanitize user-controlled strings to prevent log injection attacks.
 * Removes ASCII and Unicode control characters, line separators, and limits length.
 * Uses caching for improved performance in high-volume logging scenarios.
 *
 * Handles:
 * - Unicode normalization (NFKC) to prevent homoglyph attacks
 * - ASCII control characters (0x00-0x1F, 0x7F)
 * - Unicode control characters (0x80-0x9F)
 * - Unicode line/paragraph separators (U+2028, U+2029)
 * - Zero-width characters (U+200B-U+200D, U+FEFF)
 * - Bidirectional text override characters (U+202A-U+202E)
 * - ANSI escape sequences (terminal color codes, cursor movement)
 *
 * @param value - The string to sanitize
 * @param maxLength - Maximum length of the output (default: 500)
 * @returns Sanitized string or undefined if input is falsy
 */
function sanitizeLogString(value: string | undefined, maxLength: number = 500): string | undefined {
  if (!value) return value;
  return getCachedSanitizedString(value, maxLength);
}

/**
 * Sanitize stack trace for production logging.
 * Limits to first N lines and removes potentially sensitive file paths.
 * Preserves enough information for debugging while reducing exposure.
 */
function sanitizeStackTrace(stack: string | undefined, maxLines = 10): string | undefined {
  if (!stack) return undefined;
  const lines = stack.split('\n');
  const limitedLines = lines.slice(0, maxLines);
  // Sanitize each line to remove control characters
  const sanitizedLines = limitedLines.map((line) =>
    line.replace(CONTROL_CHAR_REGEX, '').replace(ANSI_ESCAPE_REGEX, ''),
  );
  const result = sanitizedLines.join('\n');
  // Add indicator if stack was truncated
  if (lines.length > maxLines) {
    return `${result}\n    ... (${lines.length - maxLines} more lines truncated)`;
  }
  return result;
}

/**
 * Validate and sanitize request ID from header.
 * Returns the sanitized ID if valid UUID format, otherwise generates a new one.
 */
function validateRequestId(headerValue: string | string[] | undefined): string {
  if (!headerValue) return crypto.randomUUID();
  const requestId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (requestId && UUID_REGEX.test(requestId) && requestId.length <= 36) {
    return requestId;
  }
  return crypto.randomUUID();
}

/**
 * Comprehensive list of sensitive field paths for redaction.
 * Uses both single-level (*) and deep (**) wildcards for nested objects.
 * Hoisted to module level for performance.
 * Exported to allow consumers to audit or extend the redaction list programmatically.
 */
export const SENSITIVE_FIELD_PATHS: readonly string[] = [
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
  'x-csrf-token',
  'passwd',
  'authentication',

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
  'pemFile',
  'pemContent',
  'pemData',
  'keyFile',
  'keyData',
  'sshKey',
  'ssh_key',

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

  // Contact Information
  'email',
  'emailAddress',
  'email_address',
  'phone',
  'phoneNumber',
  'phone_number',
  'mobile',
  'mobileNumber',
  'mobile_number',
  'cellPhone',
  'cell_phone',

  // Address Information
  'address',
  'streetAddress',
  'street_address',
  'homeAddress',
  'home_address',
  'city',
  'zipCode',
  'zip_code',
  'postalCode',
  'postal_code',

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
  // Crypto/Wallet
  // ============================================
  'seedPhrase',
  'seed_phrase',
  'mnemonic',
  'cryptoWallet',
  'crypto_wallet',
  'walletAddress',
  'wallet_address',

  // ============================================
  // OAuth 2.1 / PKCE
  // ============================================
  'code_verifier',
  'codeVerifier',
  'code_challenge',
  'codeChallenge',
  'nonce',

  // ============================================
  // Modern Auth (Device/Push/WebAuthn)
  // ============================================
  'deviceToken',
  'device_token',
  'pushToken',
  'push_token',
  'webauthnCredential',
  'webauthn_credential',

  // ============================================
  // Health Data (HIPAA)
  // ============================================
  'healthRecord',
  'health_record',
  'medicalId',
  'medical_id',
  'diagnosis',
  'prescription',

  // ============================================
  // AI/ML Identifiers
  // ============================================
  'embeddingVector',
  'embedding_vector',
  'faceEncoding',
  'face_encoding',
  'voiceEmbedding',
  'voice_embedding',

  // ============================================
  // Deep Wildcards (** matches any nesting level)
  // Consolidated: ** wildcards cover both root-level and nested fields,
  // making single-level (*) wildcards redundant for the same field names.
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

  // Deep wildcards for crypto/wallet
  '**.seedPhrase',
  '**.mnemonic',
  '**.cryptoWallet',
  '**.walletAddress',

  // Deep wildcards for OAuth 2.1 / PKCE
  '**.code_verifier',
  '**.codeVerifier',
  '**.code_challenge',
  '**.codeChallenge',
  '**.nonce',

  // Deep wildcards for modern auth
  '**.deviceToken',
  '**.pushToken',
  '**.webauthnCredential',

  // Deep wildcards for health data (HIPAA)
  '**.healthRecord',
  '**.medicalId',
  '**.diagnosis',
  '**.prescription',

  // Deep wildcards for AI/ML identifiers
  '**.embeddingVector',
  '**.faceEncoding',
  '**.voiceEmbedding',

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
  // X-Forwarded-For may contain internal network IPs
  'req.headers["x-forwarded-for"]',
  'req.headers["X-Forwarded-For"]',
  'req.headers.x-forwarded-for',

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

  // Response headers (Set-Cookie contains session tokens)
  'res.headers.set-cookie',
  'res.headers["Set-Cookie"]',
  'res.headers["set-cookie"]',

  // Deep wildcards for contact info
  '**.email',
  '**.emailAddress',
  '**.phone',
  '**.phoneNumber',
  '**.mobile',
  '**.address',
] as const;

/**
 * Configuration options for Pino logger setup.
 * All fields are optional and have sensible defaults.
 */
export interface PinoConfigOptions {
  /**
   * Name of the service for log identification.
   * Used in ECS 'service.name' field.
   * @default process.env.SERVICE_NAME ?? 'unknown-service'
   */
  serviceName?: string;

  /**
   * Semantic version of the service (e.g., '1.2.3').
   * Used in ECS 'service.version' field.
   * @default process.env.SERVICE_VERSION ?? '0.0.0'
   */
  serviceVersion?: string;

  /**
   * Deployment environment identifier.
   * Affects log level defaults and output format.
   * @example 'development', 'staging', 'production'
   * @default process.env.NODE_ENV ?? 'development'
   */
  environment?: string;

  /**
   * Minimum log level to output.
   * Valid values: 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'
   * @default 'debug' in development, 'info' in production
   */
  level?: string;

  /**
   * Additional field paths to redact from logs (merged with SENSITIVE_FIELD_PATHS).
   * Supports wildcards: '*' for single level, '**' for any depth.
   * @example ['custom.secret', '**.customToken', 'req.body.customField']
   * @default []
   */
  additionalRedactPaths?: string[];

  /**
   * Endpoints to exclude from request logging (health checks, metrics, etc.).
   * Uses Set internally for O(1) lookup performance.
   * Paths starting with any of these values or matching exactly are skipped.
   * @example ['/health', '/metrics', '/ping', '/ready']
   * @default DEFAULT_HEALTH_ENDPOINTS
   */
  healthEndpoints?: string[];

  /**
   * Callback invoked when logger configuration warnings occur.
   * Use this to integrate warnings with your existing logging infrastructure.
   * If not provided, warnings are silently ignored (safe default for production).
   * @param message - The warning message
   * @param context - Additional context about the warning
   */
  onConfigWarning?: (message: string, context: Record<string, unknown>) => void;

  /**
   * Whether to use synchronous logging.
   * Set to true for development or debugging, false for production high-throughput.
   * Async logging improves performance by not blocking the event loop.
   *
   * Note: This option is used when creating a pino destination stream.
   * Example: pino(config, pino.destination({ sync: options.sync ?? false }))
   * When using pino-http with NestJS, the transport option handles async behavior.
   *
   * @default true in development, false in production
   */
  sync?: boolean;
}

/**
 * Default Pino logger configuration for production use.
 * Uses JSON format for structured logging and log aggregation.
 *
 * @param options - Configuration options for the logger
 * @returns Pino LoggerOptions ready for use with pino()
 */
export function createPinoConfig(options?: PinoConfigOptions): LoggerOptions {
  const serviceName: string = options?.serviceName ?? process.env.SERVICE_NAME ?? 'unknown-service';
  const serviceVersion: string = options?.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0';
  const environment: string = options?.environment ?? process.env.NODE_ENV ?? 'development';
  const isDevelopment: boolean = environment === 'development';
  const defaultLevel: LogLevel = isDevelopment ? 'debug' : 'info';

  // Warn if using debug/trace in production via callback (avoids console.warn chicken-and-egg)
  const configuredLevel: LogLevel = validateLogLevel(
    options?.level ?? process.env.LOG_LEVEL,
    defaultLevel,
  );
  if (!isDevelopment && (configuredLevel === 'trace' || configuredLevel === 'debug')) {
    options?.onConfigWarning?.(
      `${configuredLevel} logging enabled in ${environment}. This may impact performance and expose sensitive debug information.`,
      { level: configuredLevel, environment, serviceName },
    );
  }

  // Merge additional redact paths if provided
  const redactPaths: readonly string[] = options?.additionalRedactPaths
    ? [...SENSITIVE_FIELD_PATHS, ...options.additionalRedactPaths]
    : SENSITIVE_FIELD_PATHS;

  return {
    level: configuredLevel,

    // Base fields added to every log entry (ECS 8.11.0 compatible)
    base: {
      'ecs.version': '8.11.0',
      'service.name': serviceName,
      'service.version': serviceVersion,
      'service.environment': environment,
      'host.name': process.env.HOSTNAME ?? process.env.POD_NAME ?? 'localhost',
      'event.dataset': `${serviceName}.log`,
      'event.kind': 'event',
      'event.module': 'pino',
      // K8s metadata enrichment (only included if env vars are set)
      ...(process.env.K8S_NAMESPACE && { 'k8s.namespace': process.env.K8S_NAMESPACE }),
      ...(process.env.POD_UID && { 'k8s.pod.uid': process.env.POD_UID }),
      ...(process.env.CONTAINER_NAME && { 'container.name': process.env.CONTAINER_NAME }),
    },

    // Rename default pino fields to ECS format
    messageKey: 'message',
    // Use @timestamp field name for ECS/Elasticsearch compatibility
    timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,

    // Format log level as string instead of number
    formatters: {
      level(label: string): { 'log.level': string } {
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
 * Return type for createPinoHttpConfig.
 * Used with nestjs-pino PinoLoggerModule.forRootAsync().
 */
export interface PinoHttpConfigResult {
  pinoHttp: PinoHttpOptions;
}

/**
 * Pino HTTP configuration for request logging.
 * Integrates with NestJS HTTP request pipeline and OTEL tracing.
 *
 * @param options - Configuration options for the HTTP logger
 * @returns PinoHttpConfigResult ready for use with nestjs-pino
 */
export function createPinoHttpConfig(options?: PinoConfigOptions) {
  const pinoConfig = createPinoConfig(options);
  const isDevelopment = (options?.environment ?? process.env.NODE_ENV) === 'development';

  // Create health endpoints Set for O(1) lookup (configurable or default)
  const healthEndpointsSet: Set<string> = new Set(
    options?.healthEndpoints ?? DEFAULT_HEALTH_ENDPOINTS,
  );

  return {
    pinoHttp: {
      ...pinoConfig,

      // Customize request logging with OTEL trace context (with error handling)
      customProps: (): Record<string, unknown> => {
        try {
          const activeSpan = trace.getSpan(otelContext.active());
          const spanContext = activeSpan?.spanContext();

          if (spanContext?.traceId && spanContext?.spanId) {
            // Validate traceFlags is a number before bitwise operation
            const traceFlags: number =
              typeof spanContext.traceFlags === 'number' ? spanContext.traceFlags : 0;
            const isSampled: boolean = (traceFlags & TraceFlags.SAMPLED) !== 0;
            return {
              'log.type': 'api_log',
              'trace.id': spanContext.traceId,
              'span.id': spanContext.spanId,
              'trace.flags': traceFlags,
              'trace.sampled': isSampled,
              'trace.state': spanContext.traceState?.serialize() ?? '',
            };
          }
        } catch {
          // OTEL not initialized or context unavailable - continue without trace context
        }
        return { 'log.type': 'api_log' };
      },

      // Generate request ID (validated UUID format)
      genReqId: (req): string =>
        validateRequestId(
          (req.headers as Record<string, string | string[] | undefined>)['x-request-id'],
        ),

      // Customize log level based on status code
      customLogLevel: (
        _req: unknown,
        res: { statusCode: number },
        err?: Error,
      ): LevelWithSilent => {
        if (err || res.statusCode >= 500) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },

      // Skip logging for health check endpoints (including Kubernetes variants)
      // Uses Set for O(1) lookup performance
      autoLogging: {
        ignore: (req: { url?: string }): boolean => {
          const url: string = req.url ?? '';
          return healthEndpointsSet.has(url) || url.startsWith('/health/');
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
        }): Record<string, unknown> => {
          // Extract first IP from x-forwarded-for header and validate
          const xForwardedFor: string | undefined = req.headers['x-forwarded-for'];
          const rawClientIp: string | undefined =
            req.remoteAddress ??
            (typeof xForwardedFor === 'string' ? xForwardedFor.split(',')[0]?.trim() : undefined);
          const clientIp: string | undefined = sanitizeIpAddress(rawClientIp);

          return {
            'http.request_id': sanitizeLogString(req.id, 36),
            'http.method': req.method,
            'http.path': sanitizeLogString(req.url, 2048),
            'client.address': clientIp,
            'user_agent.original': sanitizeLogString(req.headers['user-agent'], 500),
          };
        },
        res: (res: { statusCode: number }): Record<string, unknown> => {
          // Determine event outcome based on status code for ECS compliance
          const statusCode: number = res.statusCode;
          let eventOutcome: 'success' | 'failure' | 'unknown';
          if (statusCode >= 200 && statusCode < 400) {
            eventOutcome = 'success';
          } else if (statusCode >= 400) {
            eventOutcome = 'failure';
          } else {
            eventOutcome = 'unknown';
          }

          return {
            'http.status_code': statusCode,
            'event.category': 'web',
            'event.outcome': eventOutcome,
          };
        },
        err: (err: {
          name?: string;
          message: string;
          stack?: string;
          cause?: Error;
          code?: string | number;
        }): Record<string, unknown> => ({
          'error.type': err.name ?? 'Error',
          'error.code': err.code,
          'error.message': sanitizeLogString(err.message, 1000),
          // In production, sanitize and limit stack trace to first 10 lines for security
          // In development, show full stack trace for debugging
          'error.stack_trace': isDevelopment ? err.stack : sanitizeStackTrace(err.stack, 10),
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
      customSuccessMessage: (
        _req: unknown,
        res: { statusCode: number },
        responseTime: number,
      ): string => `Request completed in ${responseTime}ms with status ${res.statusCode}`,

      // Customize error message with sanitized content
      customErrorMessage: (_req: unknown, res: { statusCode: number }, err: Error): string => {
        const sanitizedMessage: string | undefined = sanitizeLogString(err.message, 500);
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
