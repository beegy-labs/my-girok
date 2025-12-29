import type { LoggerOptions } from 'pino';

/**
 * Default Pino logger configuration for production use.
 * Uses JSON format for structured logging and log aggregation.
 */
export function createPinoConfig(options?: {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  level?: string;
}): LoggerOptions {
  const serviceName = options?.serviceName ?? process.env.SERVICE_NAME ?? 'unknown-service';
  const serviceVersion = options?.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0';
  const environment = options?.environment ?? process.env.NODE_ENV ?? 'development';
  const isDevelopment = environment === 'development';

  return {
    level: options?.level ?? process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),

    // Base fields added to every log entry
    base: {
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
      paths: [
        'password',
        'token',
        'secret',
        'apiKey',
        'authorization',
        'refreshToken',
        'accessToken',
        'creditCard',
        'ssn',
        '*.password',
        '*.token',
        '*.secret',
        '*.apiKey',
        '*.authorization',
        '*.refreshToken',
        '*.accessToken',
        'req.headers.authorization',
        'req.headers.cookie',
      ],
      censor: '[REDACTED]',
    },

    // Development: use pino-pretty for human-readable output
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,service.name,service.version,service.environment,host.name',
          },
        }
      : undefined,
  };
}

/**
 * Pino HTTP configuration for request logging.
 * Integrates with NestJS HTTP request pipeline.
 */
export function createPinoHttpConfig(options?: {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  level?: string;
}) {
  const pinoConfig = createPinoConfig(options);
  const isDevelopment = (options?.environment ?? process.env.NODE_ENV) === 'development';

  return {
    pinoHttp: {
      ...pinoConfig,

      // Customize request logging
      customProps: () => ({
        'log.type': 'api_log',
      }),

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

      // Only log request completion in production (avoid duplicate logs)
      autoLogging: {
        ignore: (req: { url?: string }) => {
          // Skip health check endpoints
          return req.url === '/health' || req.url === '/health/ready' || req.url === '/health/live';
        },
      },

      // Serialize request/response objects
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
          'http.path': req.url,
          'client.ip': req.remoteAddress ?? req.headers['x-forwarded-for'],
          'http.user_agent': req.headers['user-agent'],
        }),
        res: (res: { statusCode: number }) => ({
          'http.status_code': res.statusCode,
        }),
        err: (err: { type?: string; message: string; stack?: string }) => ({
          'error.type': err.type ?? 'Error',
          'error.message': err.message,
          'error.stack_trace': isDevelopment ? err.stack : undefined,
        }),
      },

      // Customize success message
      customSuccessMessage: (_req: unknown, res: { statusCode: number }, responseTime: number) =>
        `Request completed in ${responseTime}ms with status ${res.statusCode}`,

      // Customize error message
      customErrorMessage: (_req: unknown, res: { statusCode: number }, err: Error) =>
        `Request failed with status ${res.statusCode}: ${err.message}`,

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
