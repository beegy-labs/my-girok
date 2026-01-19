import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { OtlpReceiverService } from '../otlp-receiver.service';
import {
  TelemetryContext,
  OtlpTraceFormat,
  OtlpMetricFormat,
  OtlpLogFormat,
  SignalType,
} from '../../types/telemetry.types';

vi.mock('axios');

describe('OtlpReceiverService', () => {
  let service: OtlpReceiverService;

  const mockContext: TelemetryContext = {
    tenantId: 'tenant-123',
    userId: 'user-456',
    source: 'jwt',
    metadata: { email: 'user@example.com' },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          'otel.collectorEndpoint': 'http://localhost:4317',
          'otel.enabled': true,
          'otel.timeout': 30000,
        };
        return config[key] ?? defaultValue;
      }),
    };

    // Mock cache manager with in-memory storage for tests
    const cache = new Map<string, any>();
    const mockCacheManager = {
      get: vi.fn((key: string) => cache.get(key)),
      set: vi.fn((key: string, value: any) => {
        cache.set(key, value);
        return Promise.resolve();
      }),
      del: vi.fn((key: string) => cache.delete(key)),
      reset: vi.fn(() => cache.clear()),
    };

    // Mock axios.create to return a mock HTTP client
    const mockHttpClient = {
      post: vi.fn().mockResolvedValue({ status: 200, data: {} }),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    vi.mocked(axios.create).mockReturnValue(mockHttpClient as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtlpReceiverService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<OtlpReceiverService>(OtlpReceiverService);

    // Initialize the service
    service.onModuleInit();
  });

  describe('Trace Enrichment', () => {
    it('should enrich traces with tenant metadata', () => {
      const traceData: OtlpTraceFormat = {
        resourceSpans: [
          {
            resource: {
              attributes: [{ key: 'service.name', value: { stringValue: 'test-service' } }],
            },
            scopeSpans: [
              {
                scope: { name: 'test-scope' },
                spans: [
                  {
                    traceId: 'trace-123',
                    spanId: 'span-456',
                    name: 'test-span',
                    attributes: [{ key: 'http.method', value: { stringValue: 'GET' } }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichTraces(traceData, mockContext);

      expect(enriched.resourceSpans).toBeDefined();
      expect(enriched.resourceSpans![0].resource?.attributes).toContainEqual({
        key: 'tenant.id',
        value: { stringValue: 'tenant-123' },
      });
      expect(enriched.resourceSpans![0].resource?.attributes).toContainEqual({
        key: 'user.id',
        value: { stringValue: 'user-456' },
      });
      expect(enriched.resourceSpans![0].resource?.attributes).toContainEqual({
        key: 'telemetry.source',
        value: { stringValue: 'jwt' },
      });
    });

    it('should handle traces without existing resource', () => {
      const traceData: OtlpTraceFormat = {
        resourceSpans: [
          {
            scopeSpans: [
              {
                spans: [
                  {
                    name: 'test-span',
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichTraces(traceData, mockContext);

      expect(enriched.resourceSpans![0].resource?.attributes).toContainEqual({
        key: 'tenant.id',
        value: { stringValue: 'tenant-123' },
      });
    });

    it('should redact SSN from span attributes', () => {
      const traceData: OtlpTraceFormat = {
        resourceSpans: [
          {
            scopeSpans: [
              {
                spans: [
                  {
                    name: 'test-span',
                    attributes: [
                      {
                        key: 'user.ssn',
                        value: { stringValue: '123-45-6789' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichTraces(traceData, mockContext);

      const spanAttrs = enriched.resourceSpans![0].scopeSpans![0].spans![0].attributes!;
      const ssnAttr = spanAttrs.find((attr) => attr.key === 'user.ssn');

      expect(ssnAttr?.value.stringValue).toBe('[REDACTED_SSN]');
    });
  });

  describe('Metric Enrichment', () => {
    it('should enrich metrics with tenant metadata', () => {
      const metricData: OtlpMetricFormat = {
        resourceMetrics: [
          {
            resource: {
              attributes: [{ key: 'service.name', value: { stringValue: 'test-service' } }],
            },
            scopeMetrics: [
              {
                scope: { name: 'test-scope' },
                metrics: [
                  {
                    name: 'http.requests',
                    description: 'HTTP request count',
                    unit: 'count',
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichMetrics(metricData, mockContext);

      expect(enriched.resourceMetrics).toBeDefined();
      expect(enriched.resourceMetrics![0].resource?.attributes).toContainEqual({
        key: 'tenant.id',
        value: { stringValue: 'tenant-123' },
      });
      expect(enriched.resourceMetrics![0].resource?.attributes).toContainEqual({
        key: 'user.id',
        value: { stringValue: 'user-456' },
      });
      expect(enriched.resourceMetrics![0].resource?.attributes).toContainEqual({
        key: 'telemetry.source',
        value: { stringValue: 'jwt' },
      });
    });

    it('should redact phone numbers from metric descriptions', () => {
      const metricData: OtlpMetricFormat = {
        resourceMetrics: [
          {
            scopeMetrics: [
              {
                metrics: [
                  {
                    name: 'user.contact',
                    description: 'Contact info: +1-555-123-4567',
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichMetrics(metricData, mockContext);

      const metricDesc = enriched.resourceMetrics![0].scopeMetrics![0].metrics![0].description;

      expect(metricDesc).toBe('Contact info: [REDACTED_PHONE]');
    });
  });

  describe('Log Enrichment', () => {
    it('should enrich logs with tenant metadata', () => {
      const logData: OtlpLogFormat = {
        resourceLogs: [
          {
            resource: {
              attributes: [{ key: 'service.name', value: { stringValue: 'test-service' } }],
            },
            scopeLogs: [
              {
                scope: { name: 'test-scope' },
                logRecords: [
                  {
                    timeUnixNano: '1234567890',
                    body: { stringValue: 'Test log message' },
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichLogs(logData, mockContext);

      expect(enriched.resourceLogs).toBeDefined();
      expect(enriched.resourceLogs![0].resource?.attributes).toContainEqual({
        key: 'tenant.id',
        value: { stringValue: 'tenant-123' },
      });
      expect(enriched.resourceLogs![0].resource?.attributes).toContainEqual({
        key: 'user.id',
        value: { stringValue: 'user-456' },
      });
      expect(enriched.resourceLogs![0].resource?.attributes).toContainEqual({
        key: 'telemetry.source',
        value: { stringValue: 'jwt' },
      });
    });

    it('should redact email from log messages', () => {
      const logData: OtlpLogFormat = {
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [
                  {
                    body: { stringValue: 'User email: user@example.com logged in' },
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichLogs(logData, mockContext);

      const logBody = enriched.resourceLogs![0].scopeLogs![0].logRecords![0].body?.stringValue;

      expect(logBody).toBe('User email: [REDACTED_EMAIL] logged in');
    });

    it('should categorize audit logs separately from regular logs', () => {
      const logData: OtlpLogFormat = {
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [
                  {
                    body: { stringValue: 'Audit event occurred' },
                    attributes: [{ key: 'log.category', value: { stringValue: 'audit' } }],
                  },
                  {
                    body: { stringValue: 'Regular log message' },
                    attributes: [{ key: 'log.category', value: { stringValue: 'info' } }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichLogs(logData, mockContext);

      const logRecords = enriched.resourceLogs![0].scopeLogs![0].logRecords!;

      // First log should have audit.processed = true
      const auditLog = logRecords[0];
      const auditProcessed = auditLog.attributes?.find((attr) => attr.key === 'audit.processed');
      expect(auditProcessed).toBeDefined();
      expect(auditProcessed?.value).toEqual({ boolValue: true });

      // Second log should NOT have audit.processed
      const regularLog = logRecords[1];
      const regularProcessed = regularLog.attributes?.find(
        (attr) => attr.key === 'audit.processed',
      );
      expect(regularProcessed).toBeUndefined();
    });
  });

  describe('PII Redaction', () => {
    it('should redact multiple PII types from the same string', () => {
      const logData: OtlpLogFormat = {
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [
                  {
                    body: {
                      stringValue:
                        'User john@example.com with SSN 123-45-6789 and phone +1-555-123-4567',
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichLogs(logData, mockContext);

      const logBody = enriched.resourceLogs![0].scopeLogs![0].logRecords![0].body?.stringValue;

      expect(logBody).toBe(
        'User [REDACTED_EMAIL] with SSN [REDACTED_SSN] and phone [REDACTED_PHONE]',
      );
    });

    it('should redact IPv4 addresses', () => {
      const logData: OtlpLogFormat = {
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [
                  {
                    body: { stringValue: 'Request from IP 192.168.1.100' },
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichLogs(logData, mockContext);

      const logBody = enriched.resourceLogs![0].scopeLogs![0].logRecords![0].body?.stringValue;

      expect(logBody).toBe('Request from IP [REDACTED_IP]');
    });

    it('should redact credit card numbers', () => {
      const logData: OtlpLogFormat = {
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [
                  {
                    body: { stringValue: 'Payment with card 4532-1234-5678-9010' },
                  },
                ],
              },
            ],
          },
        ],
      };

      const enriched = service.enrichLogs(logData, mockContext);

      const logBody = enriched.resourceLogs![0].scopeLogs![0].logRecords![0].body?.stringValue;

      expect(logBody).toBe('Payment with card [REDACTED_CARD]');
    });
  });

  describe('Cost Tracking', () => {
    it('should track telemetry costs per tenant', async () => {
      const traceData: OtlpTraceFormat = {
        resourceSpans: [
          {
            scopeSpans: [
              {
                spans: [{ name: 'test-span' }],
              },
            ],
          },
        ],
      };

      await service.forwardTraces(traceData, mockContext);

      const summary = await service.getCostSummary('tenant-123');

      expect(summary[SignalType.TRACES]).toBeDefined();
      expect(summary[SignalType.TRACES].count).toBeGreaterThan(0);
      expect(summary[SignalType.TRACES].bytes).toBeGreaterThan(0);
    });

    it('should track costs for different signal types separately', async () => {
      const traceData: OtlpTraceFormat = { resourceSpans: [{}] };
      const metricData: OtlpMetricFormat = { resourceMetrics: [{}] };
      const logData: OtlpLogFormat = { resourceLogs: [{}] };

      await service.forwardTraces(traceData, mockContext);
      await service.forwardMetrics(metricData, mockContext);
      await service.forwardLogs(logData, mockContext);

      const summary = await service.getCostSummary('tenant-123');

      expect(summary[SignalType.TRACES]).toBeDefined();
      expect(summary[SignalType.METRICS]).toBeDefined();
      expect(summary[SignalType.LOGS]).toBeDefined();
    });

    it('should return empty summary for unknown tenant', async () => {
      const summary = await service.getCostSummary('unknown-tenant');

      expect(Object.keys(summary)).toHaveLength(0);
    });
  });

  describe('Forwarding', () => {
    it('should forward traces to OTEL Collector', async () => {
      const traceData: OtlpTraceFormat = {
        resourceSpans: [
          {
            scopeSpans: [
              {
                spans: [{ name: 'test-span' }],
              },
            ],
          },
        ],
      };

      await expect(service.forwardTraces(traceData, mockContext)).resolves.toBeUndefined();
    });

    it('should forward metrics to OTEL Collector', async () => {
      const metricData: OtlpMetricFormat = {
        resourceMetrics: [
          {
            scopeMetrics: [
              {
                metrics: [{ name: 'test.metric' }],
              },
            ],
          },
        ],
      };

      await expect(service.forwardMetrics(metricData, mockContext)).resolves.toBeUndefined();
    });

    it('should forward logs to OTEL Collector', async () => {
      const logData: OtlpLogFormat = {
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [{ body: { stringValue: 'Test log' } }],
              },
            ],
          },
        ],
      };

      await expect(service.forwardLogs(logData, mockContext)).resolves.toBeUndefined();
    });

    it('should handle forwarding errors gracefully', async () => {
      // Mock enrichTraces to throw an error
      const originalEnrich = service.enrichTraces.bind(service);
      service.enrichTraces = vi.fn(() => {
        throw new Error('Enrichment failed');
      });

      const traceData: OtlpTraceFormat = { resourceSpans: [] };

      await expect(service.forwardTraces(traceData, mockContext)).rejects.toThrow(
        'Enrichment failed',
      );

      // Restore original method
      service.enrichTraces = originalEnrich;
    });

    it('should skip forwarding when gateway is disabled', async () => {
      const disabledConfigService = {
        get: vi.fn((key: string, defaultValue?: any) => {
          if (key === 'otel.enabled') {
            return false;
          }
          const config: Record<string, any> = {
            'otel.collectorEndpoint': 'http://localhost:4317',
            'otel.timeout': 30000,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const mockCacheManager = {
        get: vi.fn(),
        set: vi.fn(),
      };

      // Re-initialize with disabled config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OtlpReceiverService,
          { provide: ConfigService, useValue: disabledConfigService },
          { provide: CACHE_MANAGER, useValue: mockCacheManager },
        ],
      }).compile();

      const disabledService = module.get<OtlpReceiverService>(OtlpReceiverService);
      disabledService.onModuleInit();

      const traceData: OtlpTraceFormat = { resourceSpans: [] };

      // Should not throw, but also not forward
      await expect(disabledService.forwardTraces(traceData, mockContext)).resolves.toBeUndefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize HTTP client on module init', () => {
      // Already tested in beforeEach, verify it doesn't throw
      expect(() => service.onModuleInit()).not.toThrow();
    });
  });
});
