// Pino Logger Module
export { PinoLoggerModule, PinoLoggerModuleOptions } from './pino-logger.module';

// Pino Configuration
export {
  createPinoConfig,
  createPinoHttpConfig,
  SENSITIVE_FIELD_PATHS,
  DEFAULT_HEALTH_ENDPOINTS,
} from './pino.config';
export type { LogLevel, PinoConfigOptions, PinoHttpConfigResult } from './pino.config';

// Log Schema Interfaces
export type {
  BaseLogFields,
  HttpLogFields,
  ActorLogFields,
  ServiceContextLogFields,
  ErrorLogFields,
  LogType,
  StructuredLogEntry,
  ApiLogEntry,
  AppLogEntry,
  AuditLogEntry,
} from './log-schema.interface';

// Request Context
export {
  RequestContextMiddleware,
  requestContextStorage,
  getRequestContext,
  getRequestContextField,
  runWithContext,
  updateRequestContext,
} from './request-context.middleware';
export type { RequestContext } from './request-context.middleware';
