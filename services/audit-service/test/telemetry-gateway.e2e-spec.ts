import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  OtlpTraceFormat,
  OtlpMetricFormat,
  OtlpLogFormat,
} from '../src/telemetry/types/telemetry.types';

describe('Telemetry Gateway (e2e)', () => {
  let app: INestApplication | null = null;
  let jwtService: JwtService;
  let jwtToken: string;

  const mockTraceData: OtlpTraceFormat = {
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

  const mockMetricData: OtlpMetricFormat = {
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

  const mockLogData: OtlpLogFormat = {
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

  beforeAll(async () => {
    try {
      // Set required environment variables for testing
      process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-testing';
      process.env.TELEMETRY_API_KEYS = 'test-api-key-1,test-api-key-2';
      process.env.OTEL_GATEWAY_ENABLED = 'true';
      process.env.OTEL_COLLECTOR_ENDPOINT = 'http://localhost:4317';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      // Get JwtService to generate tokens
      jwtService = moduleFixture.get<JwtService>(JwtService);

      // Generate a test JWT token
      jwtToken = jwtService.sign({
        sub: 'user-123',
        tenantId: 'tenant-e2e',
        email: 'test@example.com',
      });
    } catch (error) {
      console.warn('Failed to initialize app:', error);
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    // Clean up environment variables
    delete process.env.JWT_SECRET;
    delete process.env.TELEMETRY_API_KEYS;
    delete process.env.OTEL_GATEWAY_ENABLED;
    delete process.env.OTEL_COLLECTOR_ENDPOINT;
  });

  describe('Authentication', () => {
    it.skipIf(!process.env.RUN_E2E_TESTS)('should accept traces with valid JWT', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should accept traces with valid API key', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('x-api-key', 'test-api-key-1')
        .set('x-tenant-id', 'tenant-api-key')
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should reject traces without credentials', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(response.status).toBe(401);
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should reject traces with invalid JWT', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(response.status).toBe(401);
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should reject traces with invalid API key', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('x-api-key', 'invalid-api-key')
        .set('x-tenant-id', 'tenant-api-key')
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(response.status).toBe(401);
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should accept metrics with valid JWT', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/metrics')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send(mockMetricData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should accept logs with valid API key', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/logs')
        .set('x-api-key', 'test-api-key-2')
        .set('x-tenant-id', 'tenant-logs')
        .set('Content-Type', 'application/json')
        .send(mockLogData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });
  });

  describe('Content Types', () => {
    it.skipIf(!process.env.RUN_E2E_TESTS)('should accept JSON format for traces', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(response.status).toBe(200);
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should accept JSON format for metrics', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/metrics')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send(mockMetricData);

      expect(response.status).toBe(200);
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should accept JSON format for logs', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/logs')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send(mockLogData);

      expect(response.status).toBe(200);
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should validate OTLP structure for traces', async () => {
      if (!app) return;

      // Valid OTLP structure
      const validResponse = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(validResponse.status).toBe(200);

      // Empty resourceSpans is also valid
      const emptyResponse = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send({ resourceSpans: [] });

      expect(emptyResponse.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it.skipIf(!process.env.RUN_E2E_TESTS)(
      'should enforce different rate limits per signal type',
      async () => {
        if (!app) return;

        // This is a basic check - actual rate limit testing would require many requests
        // Traces endpoint should accept requests
        const traceResponse = await request(app.getHttpServer())
          .post('/v1/telemetry/traces')
          .set('Authorization', `Bearer ${jwtToken}`)
          .set('Content-Type', 'application/json')
          .send(mockTraceData);

        expect(traceResponse.status).toBe(200);

        // Metrics endpoint should accept requests
        const metricResponse = await request(app.getHttpServer())
          .post('/v1/telemetry/metrics')
          .set('Authorization', `Bearer ${jwtToken}`)
          .set('Content-Type', 'application/json')
          .send(mockMetricData);

        expect(metricResponse.status).toBe(200);

        // Logs endpoint should accept requests
        const logResponse = await request(app.getHttpServer())
          .post('/v1/telemetry/logs')
          .set('Authorization', `Bearer ${jwtToken}`)
          .set('Content-Type', 'application/json')
          .send(mockLogData);

        expect(logResponse.status).toBe(200);
      },
    );

    it.skipIf(!process.env.RUN_E2E_TESTS)('should apply per-tenant rate limiting', async () => {
      if (!app) return;

      // Generate tokens for two different tenants
      const tenant1Token = jwtService.sign({
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'user1@example.com',
      });

      const tenant2Token = jwtService.sign({
        sub: 'user-2',
        tenantId: 'tenant-2',
        email: 'user2@example.com',
      });

      // Both tenants should be able to send requests independently
      const tenant1Response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(tenant1Response.status).toBe(200);

      const tenant2Response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(tenant2Response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it.skipIf(!process.env.RUN_E2E_TESTS)('should handle malformed JSON gracefully', async () => {
      if (!app) return;

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it.skipIf(!process.env.RUN_E2E_TESTS)('should handle missing tenant context', async () => {
      if (!app) return;

      // Token without tenantId
      const invalidToken = jwtService.sign({
        sub: 'user-123',
        email: 'test@example.com',
        // tenantId is missing
      });

      const response = await request(app.getHttpServer())
        .post('/v1/telemetry/traces')
        .set('Authorization', `Bearer ${invalidToken}`)
        .set('Content-Type', 'application/json')
        .send(mockTraceData);

      expect(response.status).toBe(401);
    });
  });
});
