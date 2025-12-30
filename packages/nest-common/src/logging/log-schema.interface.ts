/**
 * Structured logging schema interfaces for consistent log format across services.
 * Follows ECS (Elastic Common Schema) naming conventions for compatibility with
 * observability backends like Elasticsearch, Datadog, and Grafana Loki.
 */

/**
 * Base log fields present in all log entries
 */
export interface BaseLogFields {
  /** ISO8601 timestamp */
  '@timestamp': string;

  /** Log level: debug, info, warn, error, fatal */
  'log.level': string;

  /** Log message */
  message: string;

  /** Service identifier */
  'service.name': string;

  /** Service version from package.json */
  'service.version'?: string;

  /** Deployment environment: development, staging, production */
  'service.environment': string;

  /** Hostname/pod name */
  'host.name': string;
}

/**
 * HTTP request context fields
 */
export interface HttpLogFields {
  /** Unique request identifier for correlation */
  'http.request_id': string;

  /** HTTP method: GET, POST, PUT, DELETE, etc. */
  'http.method': string;

  /** Request path (actual URL) */
  'http.path': string;

  /** Route template (e.g., /users/:id) */
  'http.path_template'?: string;

  /** Path parameters as JSON string */
  'http.path_params'?: string;

  /** Query parameters as JSON string */
  'http.query_params'?: string;

  /** HTTP response status code */
  'http.status_code'?: number;

  /** Request duration in milliseconds */
  'http.response_time_ms'?: number;

  /** Response body size in bytes */
  'http.response_body_size'?: number;

  /** Sanitized request body as JSON string (POST/PUT/PATCH/DELETE only) */
  'http.request_body'?: string;
}

/**
 * Actor (user/admin) context fields
 */
export interface ActorLogFields {
  /** Actor identifier (user ID or admin ID) */
  'actor.id'?: string;

  /** Actor type: user, admin, service, system */
  'actor.type'?: string;

  /** Actor email (if available) */
  'actor.email'?: string;
}

/**
 * Service-specific context fields
 */
export interface ServiceContextLogFields {
  /** Service ID for multi-tenant operations */
  'service.id'?: string;

  /** Session ID for user session tracking */
  'session.id'?: string;

  /** UI event ID for frontend correlation */
  'ui.event_id'?: string;
}

/**
 * Error context fields
 */
export interface ErrorLogFields {
  /** Error type/name */
  'error.type'?: string;

  /** Error message */
  'error.message'?: string;

  /** Error stack trace (only in development or for fatal errors) */
  'error.stack_trace'?: string;
}

/**
 * Log types for categorization
 */
export type LogType = 'api_log' | 'app_log' | 'audit_log' | 'security_log' | 'performance_log';

/**
 * Complete structured log entry
 */
export interface StructuredLogEntry
  extends
    BaseLogFields,
    Partial<HttpLogFields>,
    Partial<ActorLogFields>,
    Partial<ServiceContextLogFields>,
    Partial<ErrorLogFields> {
  /** Log type for categorization */
  'log.type': LogType;

  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * API request log entry (used by AuditInterceptor)
 */
export interface ApiLogEntry
  extends
    BaseLogFields,
    HttpLogFields,
    Partial<ActorLogFields>,
    Partial<ServiceContextLogFields>,
    Partial<ErrorLogFields> {
  'log.type': 'api_log';
}

/**
 * Application log entry (general application logging)
 */
export interface AppLogEntry extends BaseLogFields, Partial<ActorLogFields> {
  'log.type': 'app_log';
}

/**
 * Audit log entry (for compliance and security auditing)
 */
export interface AuditLogEntry
  extends BaseLogFields, ActorLogFields, Partial<ServiceContextLogFields> {
  'log.type': 'audit_log';

  /** Action performed */
  'audit.action': string;

  /** Resource type being acted upon */
  'audit.resource_type': string;

  /** Resource identifier */
  'audit.resource_id'?: string;

  /** Previous state (for updates) */
  'audit.previous_state'?: string;

  /** New state (for creates/updates) */
  'audit.new_state'?: string;
}
