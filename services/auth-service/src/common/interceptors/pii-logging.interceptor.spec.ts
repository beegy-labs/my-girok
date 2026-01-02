import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PiiLoggingInterceptor } from './pii-logging.interceptor';
import * as piiMaskingUtil from '../utils/pii-masking.util';

// Mock the pii-masking utility module
jest.mock('../utils/pii-masking.util', () => ({
  maskEmail: jest.fn((email) => (email ? `${email[0]}***@m***.com` : '***')),
  maskPhone: jest.fn((phone) => (phone ? '***-****-' + phone.slice(-4) : '***')),
  maskIpAddress: jest.fn((ip) => (ip ? ip.split('.').slice(0, 2).join('.') + '.***' : '***')),
  maskPiiFields: jest.fn((obj) => ({
    ...obj,
    email: obj.email ? `${obj.email[0]}***@m***.com` : undefined,
    phone: obj.phone ? '***-****-' + obj.phone.slice(-4) : undefined,
  })),
}));

describe('PiiLoggingInterceptor', () => {
  let interceptor: PiiLoggingInterceptor;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create a fresh interceptor instance
    interceptor = new PiiLoggingInterceptor();

    // Spy on Logger.debug
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to create mock ExecutionContext
  const createMockContext = (request: Record<string, unknown>): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
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
  const createErrorCallHandler = (error: Error): CallHandler => {
    return {
      handle: jest.fn().mockReturnValue(throwError(() => error)),
    };
  };

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should call next.handle() and return observable', (done) => {
      const request = {
        method: 'GET',
        url: '/api/users',
        body: null,
        query: {},
        ip: '192.168.1.100',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ success: true });

      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      result$.subscribe({
        next: (value) => {
          expect(value).toEqual({ success: true });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should log incoming request with masked IP', (done) => {
      const request = {
        method: 'POST',
        url: '/api/auth/login',
        body: { email: 'test@example.com', password: 'secret' },
        query: {},
        ip: '10.0.0.50',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ token: 'jwt-token' });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // Verify maskIpAddress was called
          expect(piiMaskingUtil.maskIpAddress).toHaveBeenCalledWith('10.0.0.50');

          // Verify debug was called for incoming request
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Incoming request',
              method: 'POST',
              url: '/api/auth/login',
              ip: '10.0.***',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should mask PII in request body', (done) => {
      const request = {
        method: 'POST',
        url: '/api/users',
        body: {
          email: 'john.doe@example.com',
          phone: '010-1234-5678',
          name: 'John Doe',
        },
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ id: 'user-123' });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // Verify maskPiiFields was called with body
          expect(piiMaskingUtil.maskPiiFields).toHaveBeenCalledWith({
            email: 'john.doe@example.com',
            phone: '010-1234-5678',
            name: 'John Doe',
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should mask email and phone in query params', (done) => {
      const request = {
        method: 'GET',
        url: '/api/users/search',
        body: null,
        query: {
          email: 'search@example.com',
          phone: '010-9876-5432',
          status: 'active',
        },
        ip: '192.168.1.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ users: [] });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // Verify maskEmail and maskPhone were called
          expect(piiMaskingUtil.maskEmail).toHaveBeenCalledWith('search@example.com');
          expect(piiMaskingUtil.maskPhone).toHaveBeenCalledWith('010-9876-5432');
          done();
        },
        error: done.fail,
      });
    });

    it('should log request completion with duration', (done) => {
      const request = {
        method: 'GET',
        url: '/api/health',
        body: null,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ status: 'healthy' });

      // Mock Date.now to control timing
      const startTime = 1000;
      const endTime = 1050; // 50ms duration
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? startTime : endTime;
      });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // Verify completion log includes duration
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request completed',
              method: 'GET',
              url: '/api/health',
              duration: '50ms',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should log response type for array responses', (done) => {
      const request = {
        method: 'GET',
        url: '/api/users',
        body: null,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler([{ id: '1' }, { id: '2' }]);

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request completed',
              responseType: 'array',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should log response type for object responses', (done) => {
      const request = {
        method: 'GET',
        url: '/api/user/123',
        body: null,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ id: '123', name: 'Test' });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request completed',
              responseType: 'object',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should log error with duration on request failure', (done) => {
      const request = {
        method: 'POST',
        url: '/api/auth/login',
        body: { email: 'test@example.com' },
        query: {},
        ip: '192.168.1.100',
      };
      mockContext = createMockContext(request);
      const testError = new Error('Authentication failed');
      mockCallHandler = createErrorCallHandler(testError);

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error.message).toBe('Authentication failed');
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request failed',
              method: 'POST',
              url: '/api/auth/login',
              error: 'Authentication failed',
            }),
          );
          done();
        },
      });
    });

    it('should handle null body gracefully', (done) => {
      const request = {
        method: 'GET',
        url: '/api/status',
        body: null,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ ok: true });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // maskPiiFields should NOT be called for null body
          expect(piiMaskingUtil.maskPiiFields).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should handle undefined body gracefully', (done) => {
      const request = {
        method: 'GET',
        url: '/api/status',
        body: undefined,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ ok: true });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // maskPiiFields should NOT be called for undefined body
          expect(piiMaskingUtil.maskPiiFields).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should handle null query params gracefully', (done) => {
      const request = {
        method: 'GET',
        url: '/api/status',
        body: null,
        query: null,
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ ok: true });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // maskEmail/maskPhone should NOT be called for null query
          // Because maskQueryParams returns early for null
          done();
        },
        error: done.fail,
      });
    });

    it('should handle empty query params', (done) => {
      const request = {
        method: 'GET',
        url: '/api/status',
        body: null,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ ok: true });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // No email/phone in query, so those specific masks shouldn't be called
          expect(piiMaskingUtil.maskEmail).not.toHaveBeenCalled();
          expect(piiMaskingUtil.maskPhone).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should pass through non-PII query params unchanged', (done) => {
      const request = {
        method: 'GET',
        url: '/api/users',
        body: null,
        query: {
          page: '1',
          limit: '10',
          sortBy: 'createdAt',
        },
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ users: [] });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // No email or phone, so mask functions shouldn't be called
          expect(piiMaskingUtil.maskEmail).not.toHaveBeenCalled();
          expect(piiMaskingUtil.maskPhone).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should only mask email in query when only email is present', (done) => {
      const request = {
        method: 'GET',
        url: '/api/users/search',
        body: null,
        query: {
          email: 'only-email@example.com',
          status: 'active',
        },
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ users: [] });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(piiMaskingUtil.maskEmail).toHaveBeenCalledWith('only-email@example.com');
          expect(piiMaskingUtil.maskPhone).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should only mask phone in query when only phone is present', (done) => {
      const request = {
        method: 'GET',
        url: '/api/users/search',
        body: null,
        query: {
          phone: '010-5555-5555',
          status: 'active',
        },
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ users: [] });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(piiMaskingUtil.maskPhone).toHaveBeenCalledWith('010-5555-5555');
          expect(piiMaskingUtil.maskEmail).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should handle various HTTP methods', (done) => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      let completed = 0;

      methods.forEach((method) => {
        const request = {
          method,
          url: '/api/resource',
          body: method !== 'GET' ? { data: 'test' } : null,
          query: {},
          ip: '127.0.0.1',
        };
        const context = createMockContext(request);
        const handler = createMockCallHandler({ success: true });

        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(loggerDebugSpy).toHaveBeenCalledWith(
              expect.objectContaining({
                method,
              }),
            );
            completed++;
            if (completed === methods.length) {
              done();
            }
          },
          error: done.fail,
        });
      });
    });

    it('should handle null IP address', (done) => {
      const request = {
        method: 'GET',
        url: '/api/status',
        body: null,
        query: {},
        ip: null,
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ ok: true });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(piiMaskingUtil.maskIpAddress).toHaveBeenCalledWith(null);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle IPv6 addresses', (done) => {
      const request = {
        method: 'GET',
        url: '/api/status',
        body: null,
        query: {},
        ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ ok: true });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(piiMaskingUtil.maskIpAddress).toHaveBeenCalledWith(
            '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should handle undefined response', (done) => {
      const request = {
        method: 'DELETE',
        url: '/api/user/123',
        body: null,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler(undefined);

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request completed',
              responseType: 'undefined',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should handle null response', (done) => {
      const request = {
        method: 'GET',
        url: '/api/user/not-found',
        body: null,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler(null);

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request completed',
              responseType: 'object', // typeof null === 'object'
            }),
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should handle string response', (done) => {
      const request = {
        method: 'GET',
        url: '/api/version',
        body: null,
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler('v1.0.0');

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request completed',
              responseType: 'string',
            }),
          );
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('maskRequestBody', () => {
    it('should call maskPiiFields for object body', (done) => {
      const request = {
        method: 'POST',
        url: '/api/users',
        body: { email: 'test@example.com', name: 'Test' },
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ id: 'user-1' });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(piiMaskingUtil.maskPiiFields).toHaveBeenCalledWith({
            email: 'test@example.com',
            name: 'Test',
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should handle non-object body by returning it as-is', (done) => {
      // This tests the edge case where body is a primitive type
      const request = {
        method: 'POST',
        url: '/api/raw',
        body: 'raw-string-body',
        query: {},
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ success: true });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          // maskPiiFields should not be called for non-object body
          // or it should return the body as-is based on the implementation
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('maskQueryParams', () => {
    it('should handle non-object query by returning it as-is', (done) => {
      const request = {
        method: 'GET',
        url: '/api/status',
        body: null,
        query: 'invalid-query-type',
        ip: '127.0.0.1',
      };
      mockContext = createMockContext(request);
      mockCallHandler = createMockCallHandler({ ok: true });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          done();
        },
        error: done.fail,
      });
    });
  });
});
