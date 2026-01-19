/**
 * Telemetry Gateway Types
 * Used for OTLP receiver endpoints and signal processing
 */

/**
 * Signal types for telemetry data
 */
export enum SignalType {
  TRACES = 'traces',
  METRICS = 'metrics',
  LOGS = 'logs',
}

/**
 * Tenant context extracted from authentication
 */
export interface TelemetryContext {
  tenantId: string;
  userId?: string;
  source: 'jwt' | 'api-key';
  metadata?: Record<string, string>;
}

/**
 * OTLP format for traces (JSON)
 */
export interface OtlpTraceFormat {
  resourceSpans?: Array<{
    resource?: {
      attributes?: Array<{ key: string; value: any }>;
    };
    scopeSpans?: Array<{
      scope?: { name: string; version?: string };
      spans?: Array<{
        traceId?: string;
        spanId?: string;
        name?: string;
        kind?: number;
        startTimeUnixNano?: string;
        endTimeUnixNano?: string;
        attributes?: Array<{ key: string; value: any }>;
        status?: { code?: number; message?: string };
      }>;
    }>;
  }>;
}

/**
 * OTLP format for metrics (JSON)
 */
export interface OtlpMetricFormat {
  resourceMetrics?: Array<{
    resource?: {
      attributes?: Array<{ key: string; value: any }>;
    };
    scopeMetrics?: Array<{
      scope?: { name: string; version?: string };
      metrics?: Array<{
        name?: string;
        description?: string;
        unit?: string;
        gauge?: any;
        sum?: any;
        histogram?: any;
      }>;
    }>;
  }>;
}

/**
 * OTLP format for logs (JSON)
 */
export interface OtlpLogFormat {
  resourceLogs?: Array<{
    resource?: {
      attributes?: Array<{ key: string; value: any }>;
    };
    scopeLogs?: Array<{
      scope?: { name: string; version?: string };
      logRecords?: Array<{
        timeUnixNano?: string;
        observedTimeUnixNano?: string;
        severityNumber?: number;
        severityText?: string;
        body?: { stringValue?: string };
        attributes?: Array<{ key: string; value: any }>;
      }>;
    }>;
  }>;
}

/**
 * Union type for all OTLP formats
 */
export type OtlpFormat = OtlpTraceFormat | OtlpMetricFormat | OtlpLogFormat;

/**
 * Rate limit configuration per signal type
 */
export interface RateLimitConfig {
  traces: number;
  metrics: number;
  logs: number;
}

/**
 * PII patterns for redaction
 */
export interface PiiPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

/**
 * Telemetry cost tracking entry
 */
export interface TelemetryCost {
  tenantId: string;
  signalType: SignalType;
  count: number;
  bytes: number;
  timestamp: Date;
}
