/**
 * Health Indicator Interface
 *
 * Base interface for all health indicators.
 * Following 2025-2026 Kubernetes best practices:
 * - Liveness: Don't check dependencies
 * - Readiness: Check critical dependencies only
 * - Startup: Check initialization complete
 */

/**
 * Result of a health check
 */
export interface HealthCheckResult {
  /** Status of the component */
  status: 'up' | 'down';
  /** Latency in milliseconds */
  latencyMs?: number;
  /** Error message if status is down */
  message?: string;
  /** Additional metadata */
  details?: Record<string, unknown>;
}

/**
 * Health Indicator interface
 * Implement this interface to create custom health indicators
 */
export interface HealthIndicator {
  /**
   * Unique name for this indicator (e.g., 'postgres', 'valkey', 'clickhouse')
   */
  readonly name: string;

  /**
   * Whether this indicator is critical for readiness
   * If true, failure will cause readiness probe to fail
   * If false, failure will only affect detailed health check
   */
  readonly critical: boolean;

  /**
   * Check the health of the component
   * @returns Health check result with status and latency
   */
  check(): Promise<HealthCheckResult>;
}

/**
 * Health Indicator token for dependency injection
 */
export const HEALTH_INDICATORS = Symbol('HEALTH_INDICATORS');
