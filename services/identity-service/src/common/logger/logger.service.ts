import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Log levels following RFC 5424 (syslog)
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/**
 * Structured log entry (ECS - Elastic Common Schema compatible)
 */
export interface LogEntry {
  '@timestamp': string;
  level: LogLevel;
  message: string;
  service: string;
  context?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  error?: {
    type?: string;
    message?: string;
    stack?: string;
  };
  [key: string]: unknown;
}

/**
 * Structured JSON Logger Service
 * Follows ECS (Elastic Common Schema) format for log aggregation
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements NestLoggerService {
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly isProduction: boolean;
  private context?: string;
  private static correlationId?: string;

  constructor(private readonly configService: ConfigService) {
    this.serviceName = 'identity-service';
    this.environment = this.configService.get<string>('environment') || 'development';
    this.isProduction = this.environment === 'production';
  }

  setContext(context: string): void {
    this.context = context;
  }

  static setCorrelationId(id: string): void {
    StructuredLoggerService.correlationId = id;
  }

  static getCorrelationId(): string | undefined {
    return StructuredLoggerService.correlationId;
  }

  log(message: string, context?: string, ...meta: unknown[]): void {
    this.writeLog(LogLevel.INFO, message, context, meta);
  }

  error(message: string, trace?: string, context?: string, ...meta: unknown[]): void {
    this.writeLog(LogLevel.ERROR, message, context, meta, trace);
  }

  warn(message: string, context?: string, ...meta: unknown[]): void {
    this.writeLog(LogLevel.WARN, message, context, meta);
  }

  debug(message: string, context?: string, ...meta: unknown[]): void {
    if (!this.isProduction) {
      this.writeLog(LogLevel.DEBUG, message, context, meta);
    }
  }

  verbose(message: string, context?: string, ...meta: unknown[]): void {
    if (!this.isProduction) {
      this.writeLog(LogLevel.VERBOSE, message, context, meta);
    }
  }

  private writeLog(
    level: LogLevel,
    message: string,
    context?: string,
    meta?: unknown[],
    trace?: string,
  ): void {
    const entry: LogEntry = {
      '@timestamp': new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      environment: this.environment,
      context: context || this.context,
      correlationId: StructuredLoggerService.correlationId,
    };

    // Add error details if present
    if (trace) {
      entry.error = {
        stack: trace,
      };
    }

    // Add metadata
    if (meta && meta.length > 0) {
      const metadata = meta[0];
      if (typeof metadata === 'object' && metadata !== null) {
        Object.assign(entry, this.sanitizeMetadata(metadata as Record<string, unknown>));
      }
    }

    // Output as JSON in production, pretty-print in development
    if (this.isProduction) {
      console.log(JSON.stringify(entry));
    } else {
      const color = this.getColorForLevel(level);
      const timestamp = entry['@timestamp'];
      const ctx = entry.context ? `[${entry.context}]` : '';
      console.log(`${color}${timestamp} ${level.toUpperCase()} ${ctx} ${message}\x1b[0m`);
      if (trace) {
        console.log(trace);
      }
      if (meta && meta.length > 0) {
        console.log(JSON.stringify(meta[0], null, 2));
      }
    }
  }

  /**
   * Sanitize metadata to prevent sensitive data leakage
   */
  private sanitizeMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'credential',
    ];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.VERBOSE:
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m';
    }
  }
}
