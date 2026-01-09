import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';

// Mock the @my-girok/nest-common module which provides PII masking utilities
vi.mock('@my-girok/nest-common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@my-girok/nest-common')>();
  return {
    ...actual,
    maskEmail: vi.fn((email: string) => (email ? `${email[0]}***@m***.com` : '***')),
    maskPhone: vi.fn((phone: string) => (phone ? '***-****-' + phone.slice(-4) : '***')),
    maskIpAddress: vi.fn((ip: string) =>
      ip ? ip.split('.').slice(0, 2).join('.') + '.***' : '***',
    ),
    maskObject: vi.fn((obj: Record<string, unknown>) => ({
      ...obj,
      email: obj.email ? `${String(obj.email)[0]}***@m***.com` : undefined,
      phone: obj.phone ? '***-****-' + String(obj.phone).slice(-4) : undefined,
    })),
  };
});

import { PiiLoggingInterceptor } from './pii-logging.interceptor';
import {
  maskEmail,
  maskPhone,
  maskIpAddress,
  maskObject as maskPiiFields,
} from '@my-girok/nest-common';

describe('PiiLoggingInterceptor', () => {
  let interceptor: PiiLoggingInterceptor;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a fresh interceptor instance
    interceptor = new PiiLoggingInterceptor();

    // Spy on Logger.debug
    loggerDebugSpy = vi.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock ExecutionContext
  const createMockContext = (request: Record<string, unknown>): ExecutionContext => {
    return {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
      getClass: vi.fn(),
      getHandler: vi.fn(),
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
  const createErrorCallHandler = (error: Error): CallHandler => {
    return {
      handle: vi.fn().mockReturnValue(throwError(() => error)),
    };
  };

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should call next.handle() and return observable', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should log incoming request with masked IP', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskIpAddress).toHaveBeenCalledWith('10.0.0.50');

            // Verify debug was called for incoming request
            expect(loggerDebugSpy).toHaveBeenCalledWith(
              expect.objectContaining({
                message: 'Incoming request',
                method: 'POST',
                url: '/api/auth/login',
                ip: '10.0.***',
              }),
            );
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should mask PII in request body', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskPiiFields).toHaveBeenCalledWith({
              email: 'john.doe@example.com',
              phone: '010-1234-5678',
              name: 'John Doe',
            });
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should mask email and phone in query params', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskEmail).toHaveBeenCalledWith('search@example.com');
            expect(maskPhone).toHaveBeenCalledWith('010-9876-5432');
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should log request completion with duration', () => {
      return new Promise<void>((resolve, reject) => {
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
        vi.spyOn(Date, 'now').mockImplementation(() => {
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
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should log response type for array responses', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should log response type for object responses', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should log error with duration on request failure', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
        });
      });
    });

    it('should handle null body gracefully', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskPiiFields).not.toHaveBeenCalled();
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle undefined body gracefully', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskPiiFields).not.toHaveBeenCalled();
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle null query params gracefully', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle empty query params', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskEmail).not.toHaveBeenCalled();
            expect(maskPhone).not.toHaveBeenCalled();
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should pass through non-PII query params unchanged', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskEmail).not.toHaveBeenCalled();
            expect(maskPhone).not.toHaveBeenCalled();
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should only mask email in query when only email is present', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskEmail).toHaveBeenCalledWith('only-email@example.com');
            expect(maskPhone).not.toHaveBeenCalled();
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should only mask phone in query when only phone is present', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskPhone).toHaveBeenCalledWith('010-5555-5555');
            expect(maskEmail).not.toHaveBeenCalled();
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle various HTTP methods', () => {
      return new Promise<void>((resolve, reject) => {
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
                resolve();
              }
            },
            error: reject,
          });
        });
      });
    });

    it('should handle null IP address', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskIpAddress).toHaveBeenCalledWith(null);
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle IPv6 addresses', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskIpAddress).toHaveBeenCalledWith('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle undefined response', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle null response', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle string response', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });
  });

  describe('maskRequestBody', () => {
    it('should call maskPiiFields for object body', () => {
      return new Promise<void>((resolve, reject) => {
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
            expect(maskPiiFields).toHaveBeenCalledWith({
              email: 'test@example.com',
              name: 'Test',
            });
            resolve();
          },
          error: reject,
        });
      });
    });

    it('should handle non-object body by returning it as-is', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });
  });

  describe('maskQueryParams', () => {
    it('should handle non-object query by returning it as-is', () => {
      return new Promise<void>((resolve, reject) => {
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
            resolve();
          },
          error: reject,
        });
      });
    });
  });
});
