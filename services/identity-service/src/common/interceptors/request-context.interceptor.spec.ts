import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { RequestContextInterceptor, RequestContext } from './request-context.interceptor';

describe('RequestContextInterceptor', () => {
  let interceptor: RequestContextInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: {
    headers: Record<string, string | string[] | undefined>;
    path: string;
    method: string;
    ip?: string;
    socket?: { remoteAddress?: string };
    user?: { id?: string };
    context?: RequestContext;
  };
  let mockResponse: {
    setHeader: Mock;
    statusCode: number;
  };

  beforeEach(() => {
    interceptor = new RequestContextInterceptor();

    mockRequest = {
      headers: {},
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
    };

    mockResponse = {
      setHeader: vi.fn(),
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
        getResponse: vi.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of('response')),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('intercept', () => {
    it('should generate request ID and correlation ID if not provided', async () => {
      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context).toBeDefined();
            expect(mockRequest.context?.requestId).toBeDefined();
            expect(mockRequest.context?.correlationId).toBe(mockRequest.context?.requestId);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-Correlation-Id',
              expect.any(String),
            );
            resolve();
          },
        });
      });
    });

    it('should use provided request ID from header', async () => {
      mockRequest.headers['x-request-id'] = 'custom-request-id';

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context?.requestId).toBe('custom-request-id');
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-Request-Id',
              'custom-request-id',
            );
            resolve();
          },
        });
      });
    });

    it('should use provided correlation ID from header', async () => {
      mockRequest.headers['x-request-id'] = 'request-id';
      mockRequest.headers['x-correlation-id'] = 'correlation-id';

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context?.requestId).toBe('request-id');
            expect(mockRequest.context?.correlationId).toBe('correlation-id');
            resolve();
          },
        });
      });
    });

    it('should attach request context with correct properties', async () => {
      mockRequest.headers['user-agent'] = 'Test Agent';

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context).toMatchObject({
              path: '/api/test',
              method: 'GET',
              userAgent: 'Test Agent',
              ip: '127.0.0.1',
            });
            expect(mockRequest.context?.timestamp).toBeInstanceOf(Date);
            resolve();
          },
        });
      });
    });

    it('should extract account ID from authenticated user', async () => {
      mockRequest.user = { id: 'user-123' };

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context?.accountId).toBe('user-123');
            resolve();
          },
        });
      });
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      mockRequest.headers['x-forwarded-for'] = '10.0.0.1, 10.0.0.2';

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context?.ip).toBe('10.0.0.1');
            resolve();
          },
        });
      });
    });

    it('should handle x-forwarded-for as array', async () => {
      mockRequest.headers['x-forwarded-for'] = ['10.0.0.1', '10.0.0.2'];

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context?.ip).toBe('10.0.0.1');
            resolve();
          },
        });
      });
    });

    it('should extract IP from x-real-ip header', async () => {
      mockRequest.headers['x-real-ip'] = '192.168.1.1';

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context?.ip).toBe('192.168.1.1');
            resolve();
          },
        });
      });
    });

    it('should fallback to request.ip', async () => {
      mockRequest.ip = '127.0.0.1';

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context?.ip).toBe('127.0.0.1');
            resolve();
          },
        });
      });
    });

    it('should fallback to socket.remoteAddress', async () => {
      mockRequest.ip = undefined;
      mockRequest.socket = { remoteAddress: '::1' };

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(mockRequest.context?.ip).toBe('::1');
            resolve();
          },
        });
      });
    });
  });

  describe('logging', () => {
    it('should log successful requests', async () => {
      const logSpy = vi.spyOn((interceptor as any).logger, 'log');
      mockResponse.statusCode = 200;

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(logSpy).toHaveBeenCalled();
            resolve();
          },
        });
      });
    });

    it('should warn on 4xx responses', async () => {
      const warnSpy = vi.spyOn((interceptor as any).logger, 'warn');
      mockResponse.statusCode = 404;

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          complete: () => {
            expect(warnSpy).toHaveBeenCalled();
            resolve();
          },
        });
      });
    });

    it('should log errors on 5xx responses', async () => {
      const errorSpy = vi.spyOn((interceptor as any).logger, 'error');
      mockResponse.statusCode = 500;

      mockCallHandler.handle = vi
        .fn()
        .mockReturnValue(throwError(() => ({ status: 500, message: 'Internal error' })));

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          error: () => {
            expect(errorSpy).toHaveBeenCalled();
            resolve();
          },
        });
      });
    });
  });
});
