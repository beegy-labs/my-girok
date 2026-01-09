import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConflictException, ExecutionContext, CallHandler } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { of, throwError } from 'rxjs';
import { lastValueFrom, firstValueFrom } from 'rxjs';
import {
  IdempotencyInterceptor,
  IDEMPOTENT_KEY,
  IDEMPOTENT_TTL_KEY,
  IDEMPOTENCY_KEY_HEADER,
  Idempotent,
  IdempotentTtl,
} from '../../src/common/interceptors/idempotency.interceptor';
import { CacheService } from '../../src/common/cache';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let mockReflector: { getAllAndOverride: Mock };
  let mockCacheService: { get: Mock; set: Mock; del: Mock };
  let mockPrisma: { idempotencyRecord: { findUnique: Mock; upsert: Mock } };
  let mockCallHandler: CallHandler;
  let mockRequest: {
    headers: Record<string, string>;
    method: string;
    path: string;
    body: unknown;
  };
  let mockResponse: {
    statusCode: number;
    setHeader: Mock;
    getHeader: Mock;
    status: Mock;
  };
  let mockExecutionContext: ExecutionContext;

  const validUuidKey = '550e8400-e29b-41d4-a716-446655440000';
  const validAlphanumericKey = 'my-custom-key-123';

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };

    mockCacheService = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      idempotencyRecord: {
        findUnique: vi.fn(),
        upsert: vi.fn().mockResolvedValue(undefined),
      },
    };

    mockRequest = {
      headers: {},
      method: 'POST',
      path: '/api/users',
      body: { email: 'test@example.com' },
    };

    mockResponse = {
      statusCode: 201,
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      status: vi.fn(),
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ id: '123', email: 'test@example.com' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: CacheService, useValue: mockCacheService },
        { provide: IdentityPrismaService, useValue: mockPrisma },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
  });

  describe('decorator exports', () => {
    it('should export Idempotent decorator', () => {
      expect(Idempotent).toBeDefined();
      expect(typeof Idempotent).toBe('function');
    });

    it('should export IdempotentTtl decorator', () => {
      expect(IdempotentTtl).toBeDefined();
      expect(typeof IdempotentTtl).toBe('function');
    });

    it('should export IDEMPOTENCY_KEY_HEADER constant', () => {
      expect(IDEMPOTENCY_KEY_HEADER).toBe('Idempotency-Key');
    });
  });

  describe('intercept - non-idempotent endpoints', () => {
    it('should pass through for non-idempotent endpoints', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const data = await firstValueFrom(result);

      expect(data).toEqual({ id: '123', email: 'test@example.com' });
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });
  });

  describe('intercept - no idempotency key header', () => {
    it('should pass through when no idempotency key header is provided', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const data = await firstValueFrom(result);

      expect(data).toEqual({ id: '123', email: 'test@example.com' });
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });
  });

  describe('intercept - idempotency key validation', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });
    });

    it('should accept valid UUID v4 format', async () => {
      mockRequest.headers['idempotency-key'] = validUuidKey;
      mockCacheService.get.mockResolvedValue(null);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should accept valid alphanumeric key', async () => {
      mockRequest.headers['idempotency-key'] = validAlphanumericKey;
      mockCacheService.get.mockResolvedValue(null);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should accept key with underscores', async () => {
      mockRequest.headers['idempotency-key'] = 'my_custom_key_123';
      mockCacheService.get.mockResolvedValue(null);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should pass through for empty key (optional header)', async () => {
      // Empty string is falsy, so it's treated as no header provided
      mockRequest.headers['idempotency-key'] = '';

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const data = await firstValueFrom(result);

      expect(data).toEqual({ id: '123', email: 'test@example.com' });
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });

    it('should reject key longer than 64 characters', async () => {
      mockRequest.headers['idempotency-key'] = 'a'.repeat(65);

      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject key with special characters', async () => {
      mockRequest.headers['idempotency-key'] = 'invalid@key!';

      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('intercept - cached response', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });
      mockRequest.headers['idempotency-key'] = validUuidKey;
    });

    it('should return cached response if exists', async () => {
      const cachedResponse = {
        statusCode: 201,
        body: { id: 'cached-123' },
        headers: { 'content-type': 'application/json' },
        createdAt: Date.now(),
      };
      mockCacheService.get.mockResolvedValueOnce(cachedResponse);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const data = await firstValueFrom(result);

      expect(data).toEqual({ id: 'cached-123' });
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Idempotency-Replayed', 'true');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should set headers from cached response', async () => {
      const cachedResponse = {
        statusCode: 200,
        body: { id: 'cached' },
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req-123',
        },
        createdAt: Date.now(),
      };
      mockCacheService.get.mockResolvedValueOnce(cachedResponse);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('content-type', 'application/json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('x-request-id', 'req-123');
    });

    it('should not set content-length header from cache', async () => {
      const cachedResponse = {
        statusCode: 200,
        body: { id: 'cached' },
        headers: { 'content-length': '100' },
        createdAt: Date.now(),
      };
      mockCacheService.get.mockResolvedValueOnce(cachedResponse);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result);

      const setHeaderCalls = mockResponse.setHeader.mock.calls.map((call: string[]) => call[0]);
      expect(setHeaderCalls).not.toContain('content-length');
    });
  });

  describe('intercept - database fallback', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });
      mockRequest.headers['idempotency-key'] = validUuidKey;
    });

    it('should check database if not in cache', async () => {
      const dbRecord = {
        responseStatus: 201,
        responseBody: { id: 'db-123' },
        responseHeaders: { 'content-type': 'application/json' },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // Not expired
      };
      mockCacheService.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue(dbRecord);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const data = await firstValueFrom(result);

      expect(data).toEqual({ id: 'db-123' });
      expect(mockCacheService.set).toHaveBeenCalled(); // Re-populate cache
    });

    it('should not use expired database record', async () => {
      const expiredRecord = {
        responseStatus: 201,
        responseBody: { id: 'expired' },
        responseHeaders: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue(expiredRecord);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      // Should execute handler since record is expired
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.idempotencyRecord.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      // Should continue with request despite DB error
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('intercept - concurrent request handling', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });
      mockRequest.headers['idempotency-key'] = validUuidKey;
    });

    it('should reject concurrent duplicate request', async () => {
      // First call: no cached response, but lock exists
      mockCacheService.get
        .mockResolvedValueOnce(null) // No cached response
        .mockResolvedValueOnce(true); // Lock exists (2nd get is for lock key)

      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue(null);

      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler)).rejects.toThrow(
        ConflictException,
      );

      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should acquire lock and process request', async () => {
      mockCacheService.get
        .mockResolvedValueOnce(null) // No cached response
        .mockResolvedValueOnce(null); // No lock

      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue(null);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalled(); // Lock should be set
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('intercept - response caching', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });
      mockRequest.headers['idempotency-key'] = validUuidKey;
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue(null);
    });

    it('should cache successful response', async () => {
      mockResponse.getHeader.mockImplementation((header: string) => {
        if (header === 'content-type') return 'application/json';
        return undefined;
      });

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('idempotency:'),
        expect.objectContaining({
          statusCode: 201,
          body: { id: '123', email: 'test@example.com' },
        }),
        expect.any(Number),
      );
    });

    it('should release lock after successful response', async () => {
      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      // Wait for async tap callbacks to complete
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockCacheService.del).toHaveBeenCalledWith(expect.stringContaining('lock:'));
    });

    it('should release lock on error', async () => {
      mockCallHandler.handle = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Handler error')));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await expect(lastValueFrom(result)).rejects.toThrow('Handler error');
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('should save response to database', async () => {
      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockPrisma.idempotencyRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            idempotencyKey_requestFingerprint: expect.any(Object),
          }),
          create: expect.objectContaining({
            idempotencyKey: validUuidKey,
            responseStatus: 201,
          }),
        }),
      );
    });

    it('should handle database save errors gracefully', async () => {
      mockPrisma.idempotencyRecord.upsert.mockRejectedValue(new Error('DB save error'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Should not throw, should complete successfully
      const data = await lastValueFrom(result);
      expect(data).toEqual({ id: '123', email: 'test@example.com' });
    });
  });

  describe('intercept - custom TTL', () => {
    beforeEach(() => {
      mockRequest.headers['idempotency-key'] = validUuidKey;
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue(null);
    });

    it('should use custom TTL when set', async () => {
      const customTtlSeconds = 3600; // 1 hour
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        if (key === IDEMPOTENT_TTL_KEY) return customTtlSeconds;
        return undefined;
      });

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        3600000, // 1 hour in milliseconds
      );
    });

    it('should use default TTL when custom TTL not set', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        86400000, // 24 hours in milliseconds
      );
    });
  });

  describe('request fingerprinting', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });
      mockRequest.headers['idempotency-key'] = validUuidKey;
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue(null);
    });

    it('should generate different cache keys for different bodies', async () => {
      // First request
      mockRequest.body = { email: 'user1@example.com' };
      const result1 = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result1);
      const cacheKey1 = mockCacheService.set.mock.calls[0][0];

      mockCacheService.set.mockClear();

      // Second request with different body
      mockRequest.body = { email: 'user2@example.com' };
      const result2 = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result2);
      const cacheKey2 = mockCacheService.set.mock.calls[0][0];

      expect(cacheKey1).not.toBe(cacheKey2);
    });

    it('should generate different cache keys for different paths', async () => {
      // First request
      mockRequest.path = '/api/users';
      const result1 = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result1);
      const cacheKey1 = mockCacheService.set.mock.calls[0][0];

      mockCacheService.set.mockClear();

      // Second request with different path
      mockRequest.path = '/api/accounts';
      const result2 = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result2);
      const cacheKey2 = mockCacheService.set.mock.calls[0][0];

      expect(cacheKey1).not.toBe(cacheKey2);
    });

    it('should handle empty request body', async () => {
      mockRequest.body = {};

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should handle null request body', async () => {
      mockRequest.body = null;

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('response header extraction', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });
      mockRequest.headers['idempotency-key'] = validUuidKey;
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.idempotencyRecord.findUnique.mockResolvedValue(null);
    });

    it('should extract allowed headers from response', async () => {
      mockResponse.getHeader.mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          'x-request-id': 'req-123',
          'x-correlation-id': 'corr-456',
        };
        return headers[header];
      });

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      // Wait for async tap callbacks to complete
      await new Promise((resolve) => setImmediate(resolve));

      // Find the call that sets the cached response (not the lock)
      // The cached response has a statusCode, body, and headers properties
      const cachedDataCall = mockCacheService.set.mock.calls.find(
        (call: [string, { statusCode?: number; body?: unknown; headers?: unknown }]) =>
          call[1] && typeof call[1] === 'object' && 'statusCode' in call[1],
      );

      expect(cachedDataCall).toBeDefined();
      expect(cachedDataCall[1].headers).toEqual({
        'content-type': 'application/json',
        'x-request-id': 'req-123',
        'x-correlation-id': 'corr-456',
      });
    });

    it('should not extract disallowed headers', async () => {
      mockResponse.getHeader.mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          'set-cookie': 'session=abc123',
          authorization: 'Bearer token',
        };
        return headers[header];
      });

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result);

      // Wait for async tap callbacks to complete
      await new Promise((resolve) => setImmediate(resolve));

      // Find the call that sets the cached response (not the lock)
      const cachedDataCall = mockCacheService.set.mock.calls.find(
        (
          call: [string, { statusCode?: number; body?: unknown; headers?: Record<string, string> }],
        ) => call[1] && typeof call[1] === 'object' && 'statusCode' in call[1],
      );

      expect(cachedDataCall).toBeDefined();
      expect(cachedDataCall[1].headers['set-cookie']).toBeUndefined();
      expect(cachedDataCall[1].headers['authorization']).toBeUndefined();
    });
  });

  describe('without prisma dependency', () => {
    let interceptorNoPrisma: IdempotencyInterceptor;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IdempotencyInterceptor,
          { provide: Reflector, useValue: mockReflector },
          { provide: CacheService, useValue: mockCacheService },
          // No IdentityPrismaService
        ],
      }).compile();

      interceptorNoPrisma = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    });

    it('should work without database', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IDEMPOTENT_KEY) return true;
        return undefined;
      });
      mockRequest.headers['idempotency-key'] = validUuidKey;
      mockCacheService.get.mockResolvedValue(null);

      const result = await interceptorNoPrisma.intercept(mockExecutionContext, mockCallHandler);
      const data = await lastValueFrom(result);

      expect(data).toEqual({ id: '123', email: 'test@example.com' });
    });
  });
});
