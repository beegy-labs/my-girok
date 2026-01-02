import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
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
    setHeader: jest.Mock;
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
      setHeader: jest.fn(),
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('response')),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should generate request ID and correlation ID if not provided', (done) => {
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
          done();
        },
      });
    });

    it('should use provided request ID from header', (done) => {
      mockRequest.headers['x-request-id'] = 'custom-request-id';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context?.requestId).toBe('custom-request-id');
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'custom-request-id');
          done();
        },
      });
    });

    it('should use provided correlation ID from header', (done) => {
      mockRequest.headers['x-request-id'] = 'request-id';
      mockRequest.headers['x-correlation-id'] = 'correlation-id';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context?.requestId).toBe('request-id');
          expect(mockRequest.context?.correlationId).toBe('correlation-id');
          done();
        },
      });
    });

    it('should attach request context with correct properties', (done) => {
      mockRequest.headers['user-agent'] = 'Jest Test Agent';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context).toMatchObject({
            path: '/api/test',
            method: 'GET',
            userAgent: 'Jest Test Agent',
            ip: '127.0.0.1',
          });
          expect(mockRequest.context?.timestamp).toBeInstanceOf(Date);
          done();
        },
      });
    });

    it('should extract account ID from authenticated user', (done) => {
      mockRequest.user = { id: 'user-123' };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context?.accountId).toBe('user-123');
          done();
        },
      });
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', (done) => {
      mockRequest.headers['x-forwarded-for'] = '10.0.0.1, 10.0.0.2';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context?.ip).toBe('10.0.0.1');
          done();
        },
      });
    });

    it('should handle x-forwarded-for as array', (done) => {
      mockRequest.headers['x-forwarded-for'] = ['10.0.0.1', '10.0.0.2'];

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context?.ip).toBe('10.0.0.1');
          done();
        },
      });
    });

    it('should extract IP from x-real-ip header', (done) => {
      mockRequest.headers['x-real-ip'] = '192.168.1.1';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context?.ip).toBe('192.168.1.1');
          done();
        },
      });
    });

    it('should fallback to request.ip', (done) => {
      mockRequest.ip = '127.0.0.1';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context?.ip).toBe('127.0.0.1');
          done();
        },
      });
    });

    it('should fallback to socket.remoteAddress', (done) => {
      mockRequest.ip = undefined;
      mockRequest.socket = { remoteAddress: '::1' };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.context?.ip).toBe('::1');
          done();
        },
      });
    });
  });

  describe('logging', () => {
    it('should log successful requests', (done) => {
      const logSpy = jest.spyOn((interceptor as any).logger, 'log');
      mockResponse.statusCode = 200;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should warn on 4xx responses', (done) => {
      const warnSpy = jest.spyOn((interceptor as any).logger, 'warn');
      mockResponse.statusCode = 404;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(warnSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should log errors on 5xx responses', (done) => {
      const errorSpy = jest.spyOn((interceptor as any).logger, 'error');
      mockResponse.statusCode = 500;

      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => ({ status: 500, message: 'Internal error' })));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
