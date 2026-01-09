import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { ID } from '@my-girok/nest-common';

// Mock the @my-girok/nest-common ID module
vi.mock('@my-girok/nest-common', () => ({
  ID: {
    generate: vi.fn().mockReturnValue('mock-request-id-12345'),
  },
}));

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerLogSpy: ReturnType<typeof vi.spyOn>;
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a fresh interceptor instance
    interceptor = new AuditInterceptor();

    // Spy on Logger methods
    loggerLogSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation();

    // Reset mocks
    vi.clearAllMocks();
    (ID.generate as Mock).mockReturnValue('mock-request-id-12345');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock ExecutionContext
  const createMockContext = (
    request: Record<string, unknown>,
    response: Record<string, unknown>,
    handlerName = 'testHandler',
    controllerName = 'TestController',
    controllerPath = 'test',
    handlerPath = 'action',
  ): ExecutionContext => {
    const handler = vi.fn();
    Object.defineProperty(handler, 'name', { value: handlerName });

    const controller = vi.fn();
    Object.defineProperty(controller, 'name', { value: controllerName });

    // Mock Reflect.getMetadata
    vi.spyOn(Reflect, 'getMetadata').mockImplementation((metadataKey, target) => {
      if (metadataKey === 'path') {
        if (target === controller) return controllerPath;
        if (target === handler) return handlerPath;
      }
      return undefined;
    });

    return {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
        getResponse: vi.fn().mockReturnValue(response),
      }),
      getClass: vi.fn().mockReturnValue(controller),
      getHandler: vi.fn().mockReturnValue(handler),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn(),
    } as unknown as ExecutionContext;
  };

  // Helper to create mock CallHandler
  const createMockCallHandler = (response: unknown): CallHandler => {
    return {
      handle: vi.fn().mockReturnValue(of(response)),
    };
  };

  // Helper to create error CallHandler
  const createErrorCallHandler = (error: Error & { status?: number }): CallHandler => {
    return {
      handle: vi.fn().mockReturnValue(throwError(() => error)),
    };
  };

  // Helper to create mock response
  const createMockResponse = (statusCode = 200): Record<string, unknown> => {
    return {
      statusCode,
      setHeader: vi.fn(),
    };
  };

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should generate and set request ID', async () => {
      const request: Record<string, unknown> = {
        method: 'GET',
        path: '/api/admin/users',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ users: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(ID.generate).toHaveBeenCalled();
      expect(request.requestId).toBe('mock-request-id-12345');
      expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'mock-request-id-12345');
    });

    it('should log successful request with audit information', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/services',
        body: {},
        params: {},
        query: {},
        headers: {},
        user: { sub: 'user-123', type: 'USER', email: 'user@example.com' },
      };
      const response = createMockResponse(200);
      mockContext = createMockContext(
        request,
        response,
        'getServices',
        'ServicesController',
        'admin',
        'services',
      );
      mockCallHandler = createMockCallHandler({ services: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'API: GET /api/admin/services',
          'log.type': 'api_log',
          'http.request_id': 'mock-request-id-12345',
          'http.method': 'GET',
          'http.path': '/api/admin/services',
          'http.status_code': 200,
          'actor.id': 'user-123',
          'actor.type': 'USER',
          'actor.email': 'user@example.com',
        }),
      );
    });

    it('should log admin actor when present', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/settings',
        body: { key: 'value' },
        params: {},
        query: {},
        headers: {},
        admin: { sub: 'admin-456', email: 'admin@example.com' },
      };
      const response = createMockResponse(201);
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ success: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'actor.id': 'admin-456',
          'actor.type': 'admin',
          'actor.email': 'admin@example.com',
        }),
      );
    });

    it('should include service ID from params', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/services/svc-123/config',
        body: {},
        params: { serviceId: 'svc-123' },
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ config: {} });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'service.id': 'svc-123',
        }),
      );
    });

    it('should include session ID from headers', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/data',
        body: {},
        params: {},
        query: {},
        headers: { 'x-session-id': 'session-abc-123' },
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ data: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'session.id': 'session-abc-123',
        }),
      );
    });

    it('should include UI event ID from headers', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/action',
        body: { action: 'click' },
        params: {},
        query: {},
        headers: { 'x-ui-event-id': 'ui-event-xyz-789' },
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ success: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'ui.event_id': 'ui-event-xyz-789',
        }),
      );
    });

    it('should calculate response time in milliseconds', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/slow-operation',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ result: 'done' });

      // Mock Date.now to control timing
      const startTime = 1000;
      const endTime = 1150; // 150ms duration
      let callCount = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? startTime : endTime;
      });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.response_time_ms': 150,
        }),
      );
    });

    it('should calculate response body size', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/data',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      const responseData = { items: [1, 2, 3], total: 3 };
      mockCallHandler = createMockCallHandler(responseData);

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const expectedSize = JSON.stringify(responseData).length;
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.response_body_size': expectedSize,
        }),
      );
    });

    it('should log path template from controller metadata', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/users/123',
        body: {},
        params: { id: '123' },
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(
        request,
        response,
        'getUser',
        'UsersController',
        'admin/users',
        ':id',
      );
      mockCallHandler = createMockCallHandler({ user: {} });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.path_template': '/admin/users/:id',
        }),
      );
    });
  });

  describe('request body logging for mutations', () => {
    const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    mutationMethods.forEach((method) => {
      it(`should log sanitized body for ${method} requests`, async () => {
        const request = {
          method,
          path: '/api/admin/resource',
          body: { name: 'test', email: 'test@example.com' },
          params: {},
          query: {},
          headers: {},
        };
        const response = createMockResponse();
        mockContext = createMockContext(request, response);
        mockCallHandler = createMockCallHandler({ success: true });

        await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            'http.request_body': expect.any(String),
          }),
        );
      });
    });

    it('should NOT log body for GET requests', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/resource',
        body: { shouldNotBeLogged: true },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ data: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.request_body': undefined,
        }),
      );
    });

    it('should NOT log empty body', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/resource',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ success: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.request_body': undefined,
        }),
      );
    });

    it('should NOT log null body', async () => {
      const request = {
        method: 'DELETE',
        path: '/api/admin/resource/123',
        body: null,
        params: { id: '123' },
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ deleted: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.request_body': undefined,
        }),
      );
    });
  });

  describe('sensitive data sanitization', () => {
    it('should redact password in request body', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/users',
        body: { email: 'test@example.com', password: 'super-secret-123' },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ userId: '123' });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).not.toContain('super-secret-123');
      expect(requestBody).toContain('[REDACTED]');
    });

    it('should redact token in request body', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/auth/refresh',
        body: { refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ success: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(requestBody).toContain('[REDACTED]');
    });

    it('should redact apiKey in request body', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/integrations',
        body: { name: 'Integration', apiKey: 'sk-live-abc123xyz' },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ integrationId: '456' });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).not.toContain('sk-live-abc123xyz');
      expect(requestBody).toContain('[REDACTED]');
    });

    it('should redact secret in request body', async () => {
      const request = {
        method: 'PUT',
        path: '/api/admin/config',
        body: { clientSecret: 'very-secret-value' },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ updated: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).not.toContain('very-secret-value');
      expect(requestBody).toContain('[REDACTED]');
    });

    it('should redact creditCard in request body', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/payments',
        body: { amount: 100, creditCard: '4111111111111111' },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ paymentId: '789' });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).not.toContain('4111111111111111');
      expect(requestBody).toContain('[REDACTED]');
    });

    it('should redact ssn in request body', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/verification',
        body: { userId: '123', ssn: '123-45-6789' },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ verified: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).not.toContain('123-45-6789');
      expect(requestBody).toContain('[REDACTED]');
    });

    it('should redact nested sensitive fields', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/users',
        body: {
          user: {
            email: 'test@example.com',
            credentials: {
              password: 'nested-password',
            },
          },
        },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ userId: '123' });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).not.toContain('nested-password');
      expect(requestBody).toContain('[REDACTED]');
    });

    it('should redact sensitive fields in arrays', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/bulk-users',
        body: {
          users: [
            { email: 'user1@example.com', password: 'pass1' },
            { email: 'user2@example.com', password: 'pass2' },
          ],
        },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ created: 2 });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).not.toContain('pass1');
      expect(requestBody).not.toContain('pass2');
    });

    it('should redact sensitive fields in query params', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/validate',
        body: {},
        params: {},
        query: { token: 'sensitive-token-value' },
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ valid: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const queryParams = logCall['http.query_params'];
      expect(queryParams).not.toContain('sensitive-token-value');
      expect(queryParams).toContain('[REDACTED]');
    });

    it('should redact sensitive fields in path params', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/tokens/secret-token-123',
        body: {},
        params: { token: 'secret-token-123' },
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ token: {} });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const pathParams = logCall['http.path_params'];
      expect(pathParams).not.toContain('secret-token-123');
      expect(pathParams).toContain('[REDACTED]');
    });

    it('should truncate large request bodies', async () => {
      const largeContent = 'x'.repeat(5000);
      const request = {
        method: 'POST',
        path: '/api/admin/import',
        body: { data: largeContent },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ imported: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'] as string;
      // Body should be truncated to ~4000 chars + '...'
      expect(requestBody.length).toBeLessThanOrEqual(4003);
      expect(requestBody.endsWith('...')).toBe(true);
    });

    it('should preserve primitive values during recursive sanitization', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/data',
        body: {
          stringValue: 'hello',
          numberValue: 42,
          booleanValue: true,
          nullValue: null,
          nested: {
            primitiveString: 'world',
            primitiveNumber: 123,
          },
        },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ success: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'] as string;
      // Verify primitive values are preserved (not redacted)
      expect(requestBody).toContain('"stringValue":"hello"');
      expect(requestBody).toContain('"numberValue":42');
      expect(requestBody).toContain('"booleanValue":true');
      expect(requestBody).toContain('"primitiveString":"world"');
      expect(requestBody).toContain('"primitiveNumber":123');
    });

    it('should preserve primitive values in arrays during sanitization', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/data',
        body: {
          // Arrays with primitive values trigger the sanitizeRecursive non-object return path
          numbers: [1, 2, 3, 42],
          strings: ['hello', 'world'],
          booleans: [true, false],
          mixedItems: [1, 'text', true, null],
        },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ success: true });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'] as string;
      // Verify primitive array values are preserved
      expect(requestBody).toContain('"numbers":[1,2,3,42]');
      expect(requestBody).toContain('"strings":["hello","world"]');
      expect(requestBody).toContain('"booleans":[true,false]');
      expect(requestBody).toContain('"mixedItems":[1,"text",true,null]');
    });
  });

  describe('error handling', () => {
    it('should log error with audit information', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/fail',
        body: { data: 'test' },
        params: {},
        query: {},
        headers: {},
        user: { sub: 'user-123', type: 'USER' },
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      const testError = new Error('Something went wrong') as Error & { status?: number };
      testError.status = 500;
      mockCallHandler = createErrorCallHandler(testError);

      await expect(
        firstValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
      ).rejects.toThrow('Something went wrong');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'API Error: POST /api/admin/fail',
          'log.type': 'api_log',
          'http.request_id': 'mock-request-id-12345',
          'http.method': 'POST',
          'http.path': '/api/admin/fail',
          'http.status_code': 500,
          'error.type': 'Error',
          'error.message': 'Something went wrong',
          'actor.id': 'user-123',
          'actor.type': 'USER',
        }),
      );
    });

    it('should default to 500 status code when error has no status', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/error',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      const testError = new Error('Unknown error');
      mockCallHandler = createErrorCallHandler(testError);

      await expect(
        firstValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
      ).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.status_code': 500,
        }),
      );
    });

    it('should log error with custom status code', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/auth',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      const testError = new Error('Unauthorized') as Error & { status?: number };
      testError.status = 401;
      mockCallHandler = createErrorCallHandler(testError);

      await expect(
        firstValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
      ).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.status_code': 401,
        }),
      );
    });

    it('should include response time in error logs', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/timeout',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      const testError = new Error('Timeout');
      mockCallHandler = createErrorCallHandler(testError);

      // Mock Date.now
      const startTime = 1000;
      const endTime = 5000; // 4000ms duration
      let callCount = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? startTime : endTime;
      });

      await expect(
        firstValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
      ).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.response_time_ms': 4000,
        }),
      );
    });

    it('should include sanitized request body in error logs', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/create',
        body: { name: 'test', password: 'secret123' },
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      const testError = new Error('Validation failed');
      mockCallHandler = createErrorCallHandler(testError);

      await expect(
        firstValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
      ).rejects.toThrow();

      const logCall = loggerErrorSpy.mock.calls[0][0];
      const requestBody = logCall['http.request_body'];
      expect(requestBody).toContain('name');
      expect(requestBody).not.toContain('secret123');
      expect(requestBody).toContain('[REDACTED]');
    });

    it('should re-throw the original error', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/error',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      const originalError = new Error('Original error message');
      mockCallHandler = createErrorCallHandler(originalError);

      await expect(
        firstValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
      ).rejects.toBe(originalError);
    });

    it('should log error type name', async () => {
      const request = {
        method: 'POST',
        path: '/api/admin/type-check',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);

      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomValidationError';
        }
      }

      const customError = new CustomError('Custom error');
      mockCallHandler = createErrorCallHandler(customError);

      await expect(
        firstValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
      ).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'error.type': 'CustomValidationError',
        }),
      );
    });
  });

  describe('getPathTemplate', () => {
    it('should construct path template from controller and handler metadata', async () => {
      const request = {
        method: 'GET',
        path: '/api/users/123',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(
        request,
        response,
        'findOne',
        'UsersController',
        'users',
        ':id',
      );
      mockCallHandler = createMockCallHandler({ user: {} });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.path_template': '/users/:id',
        }),
      );
    });

    it('should handle empty controller path', async () => {
      const request = {
        method: 'GET',
        path: '/health',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response, 'check', 'HealthController', '', 'health');
      mockCallHandler = createMockCallHandler({ status: 'ok' });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.path_template': '/health',
        }),
      );
    });

    it('should handle empty handler path', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response, 'index', 'AdminController', 'admin', '');
      mockCallHandler = createMockCallHandler({ data: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.path_template': '/admin/',
        }),
      );
    });

    it('should normalize multiple slashes in path template', async () => {
      const request = {
        method: 'GET',
        path: '/api///admin///users',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();

      // Simulate paths with trailing/leading slashes
      vi.spyOn(Reflect, 'getMetadata').mockImplementation((metadataKey, target) => {
        const handler = mockContext.getHandler();
        const controller = mockContext.getClass();
        if (metadataKey === 'path') {
          if (target === controller) return '/admin/';
          if (target === handler) return '/users/';
        }
        return undefined;
      });

      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ users: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      // Path should have normalized slashes
      expect(logCall['http.path_template']).not.toContain('//');
    });
  });

  describe('sanitizeParams', () => {
    it('should return empty string for empty params', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/list',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ items: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.path_params': '',
          'http.query_params': '',
        }),
      );
    });

    it('should return empty string for null params', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/list',
        body: {},
        params: null,
        query: null,
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ items: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.path_params': '',
          'http.query_params': '',
        }),
      );
    });

    it('should preserve non-sensitive params', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/users/123',
        body: {},
        params: { id: '123', type: 'admin' },
        query: { page: '1', limit: '10' },
        headers: {},
      };
      const response = createMockResponse();
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler({ users: [] });

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logCall = loggerLogSpy.mock.calls[0][0];
      const pathParams = JSON.parse(logCall['http.path_params']);
      const queryParams = JSON.parse(logCall['http.query_params']);

      expect(pathParams.id).toBe('123');
      expect(pathParams.type).toBe('admin');
      expect(queryParams.page).toBe('1');
      expect(queryParams.limit).toBe('10');
    });
  });

  describe('response handling', () => {
    it('should handle undefined response data', async () => {
      const request = {
        method: 'DELETE',
        path: '/api/admin/users/123',
        body: {},
        params: { id: '123' },
        query: {},
        headers: {},
      };
      const response = createMockResponse(204);
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler(undefined);

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.response_body_size': 2, // JSON.stringify({}).length
        }),
      );
    });

    it('should handle null response data', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/users/999',
        body: {},
        params: { id: '999' },
        query: {},
        headers: {},
      };
      const response = createMockResponse(200);
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler(null);

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      // Code uses (data || {}) which coerces null to {}, resulting in size 2
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.response_body_size': 2, // JSON.stringify(null || {}).length
        }),
      );
    });

    it('should correctly calculate body size for complex objects', async () => {
      const request = {
        method: 'GET',
        path: '/api/admin/complex',
        body: {},
        params: {},
        query: {},
        headers: {},
      };
      const response = createMockResponse();
      const complexData = {
        items: [
          { id: 1, name: 'Item 1', nested: { a: 1, b: 2 } },
          { id: 2, name: 'Item 2', nested: { a: 3, b: 4 } },
        ],
        metadata: {
          total: 2,
          page: 1,
        },
      };
      mockContext = createMockContext(request, response);
      mockCallHandler = createMockCallHandler(complexData);

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const expectedSize = JSON.stringify(complexData).length;
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.response_body_size': expectedSize,
        }),
      );
    });
  });
});
