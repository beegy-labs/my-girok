/**
 * Constants for the @Transactional decorator.
 * Centralizing these values prevents typos and ensures consistency.
 */

// Logger and Tracer names
export const TRANSACTIONAL_LOGGER_CONTEXT = 'Transactional';
export const TRANSACTIONAL_TRACER_NAME = 'transactional';

// OpenTelemetry Span Attribute Keys
export const OTEL_ATTR_DB_OPERATION = 'db.operation.name';
export const OTEL_ATTR_DB_SYSTEM = 'db.system';
export const OTEL_ATTR_DB_NAME = 'db.name';
export const OTEL_ATTR_SERVER_ADDRESS = 'server.address';
export const OTEL_ATTR_SERVER_PORT = 'server.port';

// OpenTelemetry Transaction-specific Attribute Keys
export const OTEL_ATTR_TX_ID = 'db.transaction.id';
export const OTEL_ATTR_TX_ISOLATION_LEVEL = 'db.transaction.isolation_level';
export const OTEL_ATTR_TX_MAX_ATTEMPTS = 'db.transaction.max_attempts';
export const OTEL_ATTR_TX_TIMEOUT_MS = 'db.transaction.timeout_ms';
export const OTEL_ATTR_TX_PROPAGATION = 'db.transaction.propagation';
export const OTEL_ATTR_TX_DEPTH = 'db.transaction.depth';
export const OTEL_ATTR_TX_READ_ONLY = 'db.transaction.read_only';
export const OTEL_ATTR_TX_ROUTING_HINT = 'db.transaction.routing_hint';
export const OTEL_ATTR_TX_USE_SAVEPOINT = 'db.transaction.use_savepoint';
export const OTEL_ATTR_TX_USE_CIRCUIT_BREAKER = 'db.transaction.use_circuit_breaker';
export const OTEL_ATTR_TX_SUSPENDED = 'db.transaction.suspended';
export const OTEL_ATTR_TX_SUSPENDED_ID = 'db.transaction.suspended_id';

// OpenTelemetry Event Names
export const OTEL_EVENT_TX_ATTEMPT = 'transaction.attempt';
export const OTEL_EVENT_TX_COMMITTED = 'transaction.committed';
export const OTEL_EVENT_TX_ERROR = 'transaction.error';
