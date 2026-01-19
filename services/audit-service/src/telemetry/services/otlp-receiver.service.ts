import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios, { AxiosInstance } from 'axios';
import {
  TelemetryContext,
  OtlpTraceFormat,
  OtlpMetricFormat,
  OtlpLogFormat,
  SignalType,
  PiiPattern,
} from '../types/telemetry.types';

/**
 * OTLP Receiver Service
 * Processes telemetry data (traces, metrics, logs) and forwards to internal OTEL Collector
 *
 * Features:
 * - Tenant metadata enrichment
 * - PII redaction (email, SSN, phone, IPv4, credit card)
 * - gRPC forwarding to OTEL Collector
 * - Cost tracking per tenant
 * - Audit log categorization
 */
@Injectable()
export class OtlpReceiverService implements OnModuleInit {
  private readonly logger = new Logger(OtlpReceiverService.name);
  private httpClient!: AxiosInstance;
  private collectorEndpoint!: string;
  private enabled!: boolean;
  private timeout!: number;

  // PII patterns for redaction
  private readonly piiPatterns: PiiPattern[] = [
    {
      name: 'EMAIL',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: '[REDACTED_EMAIL]',
    },
    {
      name: 'SSN',
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      replacement: '[REDACTED_SSN]',
    },
    {
      name: 'PHONE',
      pattern: /(\+\d{1,3}[-.]?)?(\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4})/g,
      replacement: '[REDACTED_PHONE]',
    },
    {
      name: 'IPV4',
      pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      replacement: '[REDACTED_IP]',
    },
    {
      name: 'CREDIT_CARD',
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      replacement: '[REDACTED_CARD]',
    },
  ];

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  onModuleInit() {
    // Get gRPC endpoint (port 4317) and convert to HTTP endpoint (port 4318)
    const grpcEndpoint = this.configService.get<string>(
      'otel.collectorEndpoint',
      'http://localhost:4317',
    );
    this.collectorEndpoint = grpcEndpoint.replace(':4317', ':4318');
    this.enabled = this.configService.get<boolean>('otel.enabled', true);
    this.timeout = this.configService.get<number>('otel.timeout', 30000);

    if (!this.enabled) {
      this.logger.warn('OTEL Gateway is disabled');
      return;
    }

    this.logger.log(`Initializing HTTP client for OTLP forwarding to ${this.collectorEndpoint}`);

    // Initialize HTTP client for OTLP/HTTP protocol
    this.httpClient = axios.create({
      baseURL: this.collectorEndpoint,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('HTTP client for OTLP forwarding initialized successfully');
  }

  /**
   * Redact PII from a string value
   */
  private redactPii(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }

    let redacted = value;
    for (const pattern of this.piiPatterns) {
      redacted = redacted.replace(pattern.pattern, pattern.replacement);
    }
    return redacted;
  }

  /**
   * Redact PII from attributes array
   */
  private redactAttributes(
    attributes?: Array<{ key: string; value: any }>,
  ): Array<{ key: string; value: any }> {
    if (!attributes || !Array.isArray(attributes)) {
      return attributes || [];
    }

    return attributes.map((attr) => {
      if (attr.value && typeof attr.value === 'object') {
        // Handle string values
        if (attr.value.stringValue) {
          return {
            ...attr,
            value: {
              ...attr.value,
              stringValue: this.redactPii(attr.value.stringValue),
            },
          };
        }
      }
      return attr;
    });
  }

  /**
   * Enrich traces with tenant metadata
   */
  enrichTraces(data: OtlpTraceFormat, context: TelemetryContext): OtlpTraceFormat {
    const enriched = { ...data };

    if (!enriched.resourceSpans) {
      enriched.resourceSpans = [];
    }

    enriched.resourceSpans = enriched.resourceSpans.map((rs) => {
      const resource = rs.resource || { attributes: [] };
      const attributes = resource.attributes || [];

      // Add tenant metadata
      attributes.push(
        { key: 'tenant.id', value: { stringValue: context.tenantId } },
        { key: 'telemetry.source', value: { stringValue: context.source } },
      );

      if (context.userId) {
        attributes.push({ key: 'user.id', value: { stringValue: context.userId } });
      }

      // Redact PII from span attributes
      const scopeSpans = rs.scopeSpans?.map((ss) => ({
        ...ss,
        spans: ss.spans?.map((span) => ({
          ...span,
          attributes: this.redactAttributes(span.attributes),
        })),
      }));

      return {
        ...rs,
        resource: {
          ...resource,
          attributes: this.redactAttributes(attributes),
        },
        scopeSpans,
      };
    });

    return enriched;
  }

  /**
   * Enrich metrics with tenant metadata
   */
  enrichMetrics(data: OtlpMetricFormat, context: TelemetryContext): OtlpMetricFormat {
    const enriched = { ...data };

    if (!enriched.resourceMetrics) {
      enriched.resourceMetrics = [];
    }

    enriched.resourceMetrics = enriched.resourceMetrics.map((rm) => {
      const resource = rm.resource || { attributes: [] };
      const attributes = resource.attributes || [];

      // Add tenant metadata
      attributes.push(
        { key: 'tenant.id', value: { stringValue: context.tenantId } },
        { key: 'telemetry.source', value: { stringValue: context.source } },
      );

      if (context.userId) {
        attributes.push({ key: 'user.id', value: { stringValue: context.userId } });
      }

      // Redact PII from metric descriptions
      const scopeMetrics = rm.scopeMetrics?.map((sm) => ({
        ...sm,
        metrics: sm.metrics?.map((metric) => ({
          ...metric,
          description: metric.description ? this.redactPii(metric.description) : metric.description,
        })),
      }));

      return {
        ...rm,
        resource: {
          ...resource,
          attributes: this.redactAttributes(attributes),
        },
        scopeMetrics,
      };
    });

    return enriched;
  }

  /**
   * Check if a log record is an audit log
   */
  private isAuditLog(logRecord: any): boolean {
    const attributes = logRecord.attributes || [];
    const auditAttr = attributes.find((attr: any) => attr.key === 'log.category');
    return auditAttr?.value?.stringValue === 'audit';
  }

  /**
   * Enrich logs with tenant metadata
   */
  enrichLogs(data: OtlpLogFormat, context: TelemetryContext): OtlpLogFormat {
    const enriched = { ...data };

    if (!enriched.resourceLogs) {
      enriched.resourceLogs = [];
    }

    enriched.resourceLogs = enriched.resourceLogs.map((rl) => {
      const resource = rl.resource || { attributes: [] };
      const attributes = resource.attributes || [];

      // Add tenant metadata
      attributes.push(
        { key: 'tenant.id', value: { stringValue: context.tenantId } },
        { key: 'telemetry.source', value: { stringValue: context.source } },
      );

      if (context.userId) {
        attributes.push({ key: 'user.id', value: { stringValue: context.userId } });
      }

      // Redact PII from log bodies and categorize
      const scopeLogs = rl.scopeLogs?.map((sl) => ({
        ...sl,
        logRecords: sl.logRecords?.map((logRecord) => {
          const isAudit = this.isAuditLog(logRecord);
          const enrichedAttrs = [...(logRecord.attributes || [])];

          // Add category attribute if audit log
          if (isAudit) {
            enrichedAttrs.push({
              key: 'audit.processed',
              value: { boolValue: true },
            });
          }

          return {
            ...logRecord,
            body: logRecord.body?.stringValue
              ? {
                  stringValue: this.redactPii(logRecord.body.stringValue),
                }
              : logRecord.body,
            attributes: this.redactAttributes(enrichedAttrs),
          };
        }),
      }));

      return {
        ...rl,
        resource: {
          ...resource,
          attributes: this.redactAttributes(attributes),
        },
        scopeLogs,
      };
    });

    return enriched;
  }

  /**
   * Track telemetry costs for a tenant using Redis
   */
  private async trackCost(
    context: TelemetryContext,
    signalType: SignalType,
    dataSize: number,
  ): Promise<void> {
    const key = `telemetry:cost:${context.tenantId}:${signalType}`;
    const ttl = 86400000; // 24 hours

    try {
      // Get current cost data
      const currentCost = await this.cacheManager.get<{ count: number; bytes: number }>(key);

      // Update cost data
      const updatedCost = {
        count: (currentCost?.count || 0) + 1,
        bytes: (currentCost?.bytes || 0) + dataSize,
      };

      // Store updated cost data
      await this.cacheManager.set(key, updatedCost, ttl);

      this.logger.debug(
        `Tracked cost for tenant ${context.tenantId}: ${signalType} (${dataSize} bytes)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to track cost: ${message}`);
    }
  }

  /**
   * Forward traces to OTEL Collector
   */
  async forwardTraces(data: OtlpTraceFormat, context: TelemetryContext): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('OTEL Gateway disabled, skipping trace forwarding');
      return;
    }

    try {
      const enriched = this.enrichTraces(data, context);
      const dataSize = JSON.stringify(enriched).length;

      // Track cost (non-blocking)
      this.trackCost(context, SignalType.TRACES, dataSize).catch((err) =>
        this.logger.warn(`Cost tracking failed: ${err.message}`),
      );

      // Forward to OTEL Collector via HTTP/JSON
      await this.httpClient.post('/v1/traces', enriched);

      this.logger.debug(
        `Forwarded ${enriched.resourceSpans?.length || 0} trace spans for tenant ${context.tenantId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to forward traces for tenant ${context.tenantId}: ${message}`);
      throw error;
    }
  }

  /**
   * Forward metrics to OTEL Collector
   */
  async forwardMetrics(data: OtlpMetricFormat, context: TelemetryContext): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('OTEL Gateway disabled, skipping metric forwarding');
      return;
    }

    try {
      const enriched = this.enrichMetrics(data, context);
      const dataSize = JSON.stringify(enriched).length;

      // Track cost (non-blocking)
      this.trackCost(context, SignalType.METRICS, dataSize).catch((err) =>
        this.logger.warn(`Cost tracking failed: ${err.message}`),
      );

      // Forward to OTEL Collector via HTTP/JSON
      await this.httpClient.post('/v1/metrics', enriched);

      this.logger.debug(
        `Forwarded ${enriched.resourceMetrics?.length || 0} metrics for tenant ${context.tenantId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to forward metrics for tenant ${context.tenantId}: ${message}`);
      throw error;
    }
  }

  /**
   * Forward logs to OTEL Collector
   */
  async forwardLogs(data: OtlpLogFormat, context: TelemetryContext): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('OTEL Gateway disabled, skipping log forwarding');
      return;
    }

    try {
      const enriched = this.enrichLogs(data, context);
      const dataSize = JSON.stringify(enriched).length;

      // Track cost (non-blocking)
      this.trackCost(context, SignalType.LOGS, dataSize).catch((err) =>
        this.logger.warn(`Cost tracking failed: ${err.message}`),
      );

      // Forward to OTEL Collector via HTTP/JSON
      await this.httpClient.post('/v1/logs', enriched);

      this.logger.debug(
        `Forwarded ${enriched.resourceLogs?.length || 0} log records for tenant ${context.tenantId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to forward logs for tenant ${context.tenantId}: ${message}`);
      throw error;
    }
  }

  /**
   * Get cost tracking summary for a tenant from Redis
   */
  async getCostSummary(
    tenantId: string,
  ): Promise<Record<string, { count: number; bytes: number }>> {
    const summary: Record<string, { count: number; bytes: number }> = {};

    try {
      // Query Redis for all signal types
      const signalTypes = [SignalType.TRACES, SignalType.METRICS, SignalType.LOGS];

      for (const signalType of signalTypes) {
        const key = `telemetry:cost:${tenantId}:${signalType}`;
        const costData = await this.cacheManager.get<{ count: number; bytes: number }>(key);

        if (costData) {
          summary[signalType] = costData;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get cost summary: ${message}`);
    }

    return summary;
  }
}
