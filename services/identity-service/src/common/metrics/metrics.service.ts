import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

/**
 * Simple Prometheus-compatible metrics registry
 * For production, consider using prom-client library
 */
interface Metric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  buckets?: number[];
  observations?: number[];
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metrics = new Map<string, Metric>();

  // Counter values by label
  private readonly counters = new Map<string, Map<string, number>>();
  // Gauge values by label
  private readonly gauges = new Map<string, Map<string, number>>();
  // Histogram observations by label
  private readonly histograms = new Map<string, Map<string, number[]>>();

  onModuleInit() {
    // Register default metrics
    this.registerMetrics();
    this.logger.log('Metrics service initialized');
  }

  private registerMetrics() {
    // HTTP Request metrics
    this.registerCounter('http_requests_total', 'Total number of HTTP requests');
    this.registerCounter('http_request_errors_total', 'Total number of HTTP request errors');
    this.registerHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    );

    // Account metrics
    this.registerCounter('identity_accounts_created_total', 'Total number of accounts created');
    this.registerCounter('identity_accounts_deleted_total', 'Total number of accounts deleted');
    this.registerGauge('identity_active_sessions', 'Number of active sessions');

    // Authentication metrics
    this.registerCounter(
      'identity_auth_success_total',
      'Total number of successful authentications',
    );
    this.registerCounter('identity_auth_failures_total', 'Total number of failed authentications');
    this.registerCounter('identity_mfa_verifications_total', 'Total number of MFA verifications');

    // Cache metrics
    this.registerCounter('identity_cache_hits_total', 'Total number of cache hits');
    this.registerCounter('identity_cache_misses_total', 'Total number of cache misses');

    // Database metrics
    this.registerHistogram(
      'identity_db_query_duration_seconds',
      'Database query duration in seconds',
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    );
    this.registerCounter('identity_db_errors_total', 'Total number of database errors');
  }

  // Register a counter metric
  registerCounter(name: string, help: string) {
    this.metrics.set(name, { name, help, type: 'counter', value: 0 });
    this.counters.set(name, new Map());
  }

  // Register a gauge metric
  registerGauge(name: string, help: string) {
    this.metrics.set(name, { name, help, type: 'gauge', value: 0 });
    this.gauges.set(name, new Map());
  }

  // Register a histogram metric
  registerHistogram(name: string, help: string, buckets: number[]) {
    this.metrics.set(name, { name, help, type: 'histogram', value: 0, buckets });
    this.histograms.set(name, new Map());
  }

  // Increment a counter
  incCounter(name: string, labels?: Record<string, string>, value = 1) {
    const labelKey = this.labelsToKey(labels);
    const counter = this.counters.get(name);
    if (counter) {
      const current = counter.get(labelKey) || 0;
      counter.set(labelKey, current + value);
    }
  }

  // Set a gauge value
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    const labelKey = this.labelsToKey(labels);
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.set(labelKey, value);
    }
  }

  // Increment a gauge
  incGauge(name: string, labels?: Record<string, string>, value = 1) {
    const labelKey = this.labelsToKey(labels);
    const gauge = this.gauges.get(name);
    if (gauge) {
      const current = gauge.get(labelKey) || 0;
      gauge.set(labelKey, current + value);
    }
  }

  // Decrement a gauge
  decGauge(name: string, labels?: Record<string, string>, value = 1) {
    const labelKey = this.labelsToKey(labels);
    const gauge = this.gauges.get(name);
    if (gauge) {
      const current = gauge.get(labelKey) || 0;
      gauge.set(labelKey, Math.max(0, current - value));
    }
  }

  // Observe a histogram value
  observeHistogram(name: string, value: number, labels?: Record<string, string>) {
    const labelKey = this.labelsToKey(labels);
    const histogram = this.histograms.get(name);
    if (histogram) {
      const observations = histogram.get(labelKey) || [];
      observations.push(value);
      histogram.set(labelKey, observations);
    }
  }

  // Get all metrics in Prometheus format
  getMetrics(): string {
    const lines: string[] = [];

    // Output counters
    for (const [name, counter] of this.counters) {
      const metric = this.metrics.get(name);
      if (metric) {
        lines.push(`# HELP ${name} ${metric.help}`);
        lines.push(`# TYPE ${name} counter`);
        for (const [labelKey, value] of counter) {
          const labelStr = labelKey ? `{${labelKey}}` : '';
          lines.push(`${name}${labelStr} ${value}`);
        }
      }
    }

    // Output gauges
    for (const [name, gauge] of this.gauges) {
      const metric = this.metrics.get(name);
      if (metric) {
        lines.push(`# HELP ${name} ${metric.help}`);
        lines.push(`# TYPE ${name} gauge`);
        for (const [labelKey, value] of gauge) {
          const labelStr = labelKey ? `{${labelKey}}` : '';
          lines.push(`${name}${labelStr} ${value}`);
        }
      }
    }

    // Output histograms
    for (const [name, histogram] of this.histograms) {
      const metric = this.metrics.get(name);
      if (metric && metric.buckets) {
        lines.push(`# HELP ${name} ${metric.help}`);
        lines.push(`# TYPE ${name} histogram`);
        for (const [labelKey, observations] of histogram) {
          const labelStr = labelKey ? `,${labelKey}` : '';
          let count = 0;
          let sum = 0;

          for (const bucket of metric.buckets) {
            const bucketCount = observations.filter((v) => v <= bucket).length;
            lines.push(`${name}_bucket{le="${bucket}"${labelStr}} ${bucketCount}`);
          }
          lines.push(`${name}_bucket{le="+Inf"${labelStr}} ${observations.length}`);

          for (const v of observations) {
            count++;
            sum += v;
          }
          lines.push(`${name}_sum${labelStr ? `{${labelStr}}` : ''} ${sum}`);
          lines.push(`${name}_count${labelStr ? `{${labelStr}}` : ''} ${count}`);
        }
      }
    }

    return lines.join('\n');
  }

  private labelsToKey(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  // Convenience methods for common operations

  recordHttpRequest(method: string, path: string, statusCode: number, durationSeconds: number) {
    const labels = { method, path, status: String(statusCode) };
    this.incCounter('http_requests_total', labels);
    if (statusCode >= 400) {
      this.incCounter('http_request_errors_total', labels);
    }
    this.observeHistogram('http_request_duration_seconds', durationSeconds, labels);
  }

  recordAccountCreated() {
    this.incCounter('identity_accounts_created_total');
  }

  recordAccountDeleted() {
    this.incCounter('identity_accounts_deleted_total');
  }

  recordAuthSuccess(provider: string) {
    this.incCounter('identity_auth_success_total', { provider });
  }

  recordAuthFailure(provider: string, reason: string) {
    this.incCounter('identity_auth_failures_total', { provider, reason });
  }

  recordMfaVerification(success: boolean) {
    this.incCounter('identity_mfa_verifications_total', { success: String(success) });
  }

  recordCacheHit(cache: string) {
    this.incCounter('identity_cache_hits_total', { cache });
  }

  recordCacheMiss(cache: string) {
    this.incCounter('identity_cache_misses_total', { cache });
  }

  recordDbQuery(database: string, operation: string, durationSeconds: number) {
    this.observeHistogram('identity_db_query_duration_seconds', durationSeconds, {
      database,
      operation,
    });
  }

  recordDbError(database: string, operation: string) {
    this.incCounter('identity_db_errors_total', { database, operation });
  }

  updateActiveSessions(count: number) {
    this.setGauge('identity_active_sessions', count);
  }
}
