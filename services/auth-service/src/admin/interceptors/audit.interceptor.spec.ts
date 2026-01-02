import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { ID } from '@my-girok/nest-common';

// Mock the @my-girok/nest-common ID module
jest.mock('@my-girok/nest-common', () => ({
  ID: {
    generate: jest.fn().mockReturnValue('mock-request-id-12345'),
  },
}));

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create a fresh interceptor instance
    interceptor = new AuditInterceptor();

    // Spy on Logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Reset mocks
    jest.clearAllMocks();
    (ID.generate as jest.Mock).mockReturnValue('mock-request-id-12345');
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    const handler = jest.fn();
    Object.defineProperty(handler, 'name', { value: handlerName });

    const controller = jest.fn();
    Object.defineProperty(controller, 'name', { value: controllerName });

    // Mock Reflect.getMetadata
    jest.spyOn(Reflect, 'getMetadata').mockImplementation((metadataKey, target) => {
      if (metadataKey === 'path') {
        if (target === controller) return controllerPath;
        if (target === handler) return handlerPath;
      }
      return undefined;
    });

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue(response),
      }),
      getClass: jest.fn().mockReturnValue(controller),
      getHandler: jest.fn().mockReturnValue(handler),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  // Helper to create mock CallHandler
  const createMockCallHandler = (response: unknown): CallHandler => {
    return {
      handle: jest.fn().mockReturnValue(of(response)),
    };
  };

  // Helper to create error CallHandler
  const createErrorCallHandler = (error: Error & { status?: number }): CallHandler => {
    return {
      handle: jest.fn().mockReturnValue(throwError(() => error)),
    };
  };

  // Helper to create mock response
  const createMockResponse = (statusCode = 200): Record<string, unknown> => {
    return {
      statusCode,
      setHeader: jest.fn(),
    };
  };

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should generate and set request ID', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // Verify request ID was generated
          expect(ID.generate).toHaveBeenCalled();
          // Verify request ID was set on request
          expect(request.requestId).toBe('mock-request-id-12345');
          // Verify response header was set
          expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'mock-request-id-12345');
          done();
        },
        error: done.fail,
      });
    });

    it('should log successful request with audit information', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
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
          done();
        },
        error: done.fail,
      });
    });

    it('should log admin actor when present', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'actor.id': 'admin-456',
              'actor.type': 'admin',
              'actor.email': 'admin@example.com',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should include service ID from params', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'service.id': 'svc-123',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should include session ID from headers', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'session.id': 'session-abc-123',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should include UI event ID from headers', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'ui.event_id': 'ui-event-xyz-789',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should calculate response time in milliseconds', (done) => {
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
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? startTime : endTime;
      });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.response_time_ms': 150,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should calculate response body size', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const expectedSize = JSON.stringify(responseData).length;
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.response_body_size': expectedSize,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should log path template from controller metadata', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.path_template': '/admin/users/:id',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('request body logging for mutations', () => {
    const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    mutationMethods.forEach((method) => {
      it(`should log sanitized body for ${method} requests`, (done) => {
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

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          complete: () => {
            expect(loggerLogSpy).toHaveBeenCalledWith(
              expect.objectContaining({
                'http.request_body': expect.any(String),
              }),
            );
            done();
          },
          error: done.fail,
        });
      });
    });

    it('should NOT log body for GET requests', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.request_body': undefined,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should NOT log empty body', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.request_body': undefined,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should NOT log null body', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.request_body': undefined,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('sensitive data sanitization', () => {
    it('should redact password in request body', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).not.toContain('super-secret-123');
          expect(requestBody).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact token in request body', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
          expect(requestBody).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact apiKey in request body', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).not.toContain('sk-live-abc123xyz');
          expect(requestBody).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact secret in request body', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).not.toContain('very-secret-value');
          expect(requestBody).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact creditCard in request body', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).not.toContain('4111111111111111');
          expect(requestBody).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact ssn in request body', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).not.toContain('123-45-6789');
          expect(requestBody).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact nested sensitive fields', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).not.toContain('nested-password');
          expect(requestBody).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact sensitive fields in arrays', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).not.toContain('pass1');
          expect(requestBody).not.toContain('pass2');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact sensitive fields in query params', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const queryParams = logCall['http.query_params'];
          expect(queryParams).not.toContain('sensitive-token-value');
          expect(queryParams).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should redact sensitive fields in path params', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const pathParams = logCall['http.path_params'];
          expect(pathParams).not.toContain('secret-token-123');
          expect(pathParams).toContain('[REDACTED]');
          done();
        },
        error: done.fail,
      });
    });

    it('should truncate large request bodies', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'] as string;
          // Body should be truncated to ~4000 chars + '...'
          expect(requestBody.length).toBeLessThanOrEqual(4003);
          expect(requestBody.endsWith('...')).toBe(true);
          done();
        },
        error: done.fail,
      });
    });

    it('should preserve primitive values during recursive sanitization', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'] as string;
          // Verify primitive values are preserved (not redacted)
          expect(requestBody).toContain('"stringValue":"hello"');
          expect(requestBody).toContain('"numberValue":42');
          expect(requestBody).toContain('"booleanValue":true');
          expect(requestBody).toContain('"primitiveString":"world"');
          expect(requestBody).toContain('"primitiveNumber":123');
          done();
        },
        error: done.fail,
      });
    });

    it('should preserve primitive values in arrays during sanitization', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'] as string;
          // Verify primitive array values are preserved
          expect(requestBody).toContain('"numbers":[1,2,3,42]');
          expect(requestBody).toContain('"strings":["hello","world"]');
          expect(requestBody).toContain('"booleans":[true,false]');
          expect(requestBody).toContain('"mixedItems":[1,"text",true,null]');
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('error handling', () => {
    it('should log error with audit information', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error.message).toBe('Something went wrong');
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
          done();
        },
      });
    });

    it('should default to 500 status code when error has no status', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.status_code': 500,
            }),
          );
          done();
        },
      });
    });

    it('should log error with custom status code', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.status_code': 401,
            }),
          );
          done();
        },
      });
    });

    it('should include response time in error logs', (done) => {
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
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? startTime : endTime;
      });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.response_time_ms': 4000,
            }),
          );
          done();
        },
      });
    });

    it('should include sanitized request body in error logs', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: () => {
          const logCall = loggerErrorSpy.mock.calls[0][0];
          const requestBody = logCall['http.request_body'];
          expect(requestBody).toContain('name');
          expect(requestBody).not.toContain('secret123');
          expect(requestBody).toContain('[REDACTED]');
          done();
        },
      });
    });

    it('should re-throw the original error', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error).toBe(originalError);
          expect(error.message).toBe('Original error message');
          done();
        },
      });
    });

    it('should log error type name', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'error.type': 'CustomValidationError',
            }),
          );
          done();
        },
      });
    });
  });

  describe('getPathTemplate', () => {
    it('should construct path template from controller and handler metadata', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.path_template': '/users/:id',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should handle empty controller path', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.path_template': '/health',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should handle empty handler path', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.path_template': '/admin/',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should normalize multiple slashes in path template', (done) => {
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
      jest.spyOn(Reflect, 'getMetadata').mockImplementation((metadataKey, target) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          // Path should have normalized slashes
          expect(logCall['http.path_template']).not.toContain('//');
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('sanitizeParams', () => {
    it('should return empty string for empty params', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.path_params': '',
              'http.query_params': '',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should return empty string for null params', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.path_params': '',
              'http.query_params': '',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should preserve non-sensitive params', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = loggerLogSpy.mock.calls[0][0];
          const pathParams = JSON.parse(logCall['http.path_params']);
          const queryParams = JSON.parse(logCall['http.query_params']);

          expect(pathParams.id).toBe('123');
          expect(pathParams.type).toBe('admin');
          expect(queryParams.page).toBe('1');
          expect(queryParams.limit).toBe('10');
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('response handling', () => {
    it('should handle undefined response data', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.response_body_size': 2, // JSON.stringify({}).length
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should handle null response data', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // Code uses (data || {}) which coerces null to {}, resulting in size 2
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.response_body_size': 2, // JSON.stringify(null || {}).length
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should correctly calculate body size for complex objects', (done) => {
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

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          const expectedSize = JSON.stringify(complexData).length;
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              'http.response_body_size': expectedSize,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });
  });
});
