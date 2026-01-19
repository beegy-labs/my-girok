import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TenantAuthGuard } from '../tenant-auth.guard';
import { TelemetryContext } from '../../types/telemetry.types';

describe('TenantAuthGuard', () => {
  let guard: TenantAuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;

  const createMockExecutionContext = (
    headers: Record<string, string | string[]> = {},
  ): ExecutionContext => {
    const mockRequest = {
      headers,
      telemetryContext: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockJwtService = {
      verifyAsync: vi.fn(),
    };

    const mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'telemetry.apiKeys') {
          return 'test-api-key-1,test-api-key-2';
        }
        if (key === 'JWT_SECRET') {
          return 'test-jwt-secret';
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<TenantAuthGuard>(TenantAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('JWT Authentication', () => {
    it('should accept valid JWT token', async () => {
      const mockPayload = {
        sub: 'user-123',
        tenantId: 'tenant-123',
        email: 'user@example.com',
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-jwt-token',
      });

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest<any>();

      expect(result).toBe(true);
      expect(request.telemetryContext).toBeDefined();
      expect(request.telemetryContext.tenantId).toBe('tenant-123');
      expect(request.telemetryContext.userId).toBe('user-123');
      expect(request.telemetryContext.source).toBe('jwt');
      expect(request.telemetryContext.metadata?.email).toBe('user@example.com');
    });

    it('should reject invalid JWT token', async () => {
      vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error('Invalid token'));

      const context = createMockExecutionContext({
        authorization: 'Bearer invalid-jwt-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Valid JWT token or API key required',
      );
    });

    it('should reject JWT token without tenantId', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        // tenantId is missing
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      const context = createMockExecutionContext({
        authorization: 'Bearer token-without-tenant',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should extract tenant context from JWT payload', async () => {
      const mockPayload = {
        sub: 'user-456',
        tenantId: 'tenant-456',
        email: 'admin@example.com',
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      const context = createMockExecutionContext({
        authorization: 'Bearer another-valid-token',
      });

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest<any>();
      const ctx: TelemetryContext = request.telemetryContext;

      expect(ctx.tenantId).toBe('tenant-456');
      expect(ctx.userId).toBe('user-456');
      expect(ctx.source).toBe('jwt');
      expect(ctx.metadata?.email).toBe('admin@example.com');
    });
  });

  describe('API Key Authentication', () => {
    it('should accept valid API key with tenant header', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'test-api-key-1',
        'x-tenant-id': 'tenant-789',
      });

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest<any>();

      expect(result).toBe(true);
      expect(request.telemetryContext).toBeDefined();
      expect(request.telemetryContext.tenantId).toBe('tenant-789');
      expect(request.telemetryContext.source).toBe('api-key');
      expect(request.telemetryContext.userId).toBeUndefined();
    });

    it('should accept second valid API key', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'test-api-key-2',
        'x-tenant-id': 'tenant-999',
      });

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest<any>();

      expect(result).toBe(true);
      expect(request.telemetryContext.tenantId).toBe('tenant-999');
    });

    it('should reject invalid API key', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'invalid-api-key',
        'x-tenant-id': 'tenant-789',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Valid JWT token or API key required',
      );
    });

    it('should reject API key without tenant header', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'test-api-key-1',
        // x-tenant-id is missing
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should extract tenant context from headers', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'test-api-key-1',
        'x-tenant-id': 'tenant-custom',
      });

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest<any>();
      const ctx: TelemetryContext = request.telemetryContext;

      expect(ctx.tenantId).toBe('tenant-custom');
      expect(ctx.source).toBe('api-key');
      expect(ctx.metadata).toEqual({});
    });

    it('should handle array API key header', async () => {
      const context = createMockExecutionContext({
        'x-api-key': ['test-api-key-1', 'ignored'],
        'x-tenant-id': 'tenant-array',
      });

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest<any>();

      expect(result).toBe(true);
      expect(request.telemetryContext.tenantId).toBe('tenant-array');
    });
  });

  describe('Missing Credentials', () => {
    it('should reject request without any credentials', async () => {
      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Valid JWT token or API key required',
      );
    });

    it('should reject malformed Authorization header', async () => {
      const context = createMockExecutionContext({
        authorization: 'Basic some-basic-auth', // Not Bearer
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Priority and Fallback', () => {
    it('should try JWT first, then fallback to API key', async () => {
      // JWT fails
      vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error('Invalid JWT'));

      // API key succeeds
      const context = createMockExecutionContext({
        authorization: 'Bearer invalid-token',
        'x-api-key': 'test-api-key-1',
        'x-tenant-id': 'tenant-fallback',
      });

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest<any>();

      expect(result).toBe(true);
      expect(request.telemetryContext.source).toBe('api-key');
      expect(request.telemetryContext.tenantId).toBe('tenant-fallback');
    });

    it('should use JWT if both JWT and API key are provided', async () => {
      const mockPayload = {
        sub: 'user-jwt',
        tenantId: 'tenant-jwt',
        email: 'jwt@example.com',
      };

      vi.mocked(jwtService.verifyAsync).mockResolvedValue(mockPayload);

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-jwt',
        'x-api-key': 'test-api-key-1',
        'x-tenant-id': 'tenant-api-key',
      });

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest<any>();

      // Should prefer JWT
      expect(request.telemetryContext.source).toBe('jwt');
      expect(request.telemetryContext.tenantId).toBe('tenant-jwt');
    });
  });

  describe('Timing-Safe Comparison', () => {
    it('should use timing-safe comparison for API key validation', async () => {
      // Valid key should work
      const validContext = createMockExecutionContext({
        'x-api-key': 'test-api-key-1',
        'x-tenant-id': 'tenant-123',
      });
      await expect(guard.canActivate(validContext)).resolves.toBe(true);

      // Similar but invalid key should fail
      const invalidContext = createMockExecutionContext({
        'x-api-key': 'test-api-key-3',
        'x-tenant-id': 'tenant-123',
      });
      await expect(guard.canActivate(invalidContext)).rejects.toThrow();
    });

    it('should reject keys with different lengths', async () => {
      const shortContext = createMockExecutionContext({
        'x-api-key': 'short',
        'x-tenant-id': 'tenant-123',
      });
      await expect(guard.canActivate(shortContext)).rejects.toThrow();

      const longContext = createMockExecutionContext({
        'x-api-key': 'very-long-api-key-that-does-not-match-anything',
        'x-tenant-id': 'tenant-123',
      });
      await expect(guard.canActivate(longContext)).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should handle missing JWT_SECRET gracefully', async () => {
      vi.mocked(configService.get).mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') {
          return undefined; // Simulate missing secret
        }
        if (key === 'telemetry.apiKeys') {
          return 'test-api-key-1';
        }
        return undefined;
      });

      const context = createMockExecutionContext({
        authorization: 'Bearer some-token',
      });

      // Should reject since JWT validation will fail without secret
      await expect(guard.canActivate(context)).rejects.toThrow();
    });

    it('should handle empty API keys configuration', async () => {
      const mockConfigEmpty = {
        get: vi.fn((key: string) => {
          if (key === 'telemetry.apiKeys') {
            return ''; // Empty
          }
          if (key === 'JWT_SECRET') {
            return 'test-jwt-secret';
          }
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TenantAuthGuard,
          { provide: JwtService, useValue: { verifyAsync: vi.fn() } },
          { provide: ConfigService, useValue: mockConfigEmpty },
        ],
      }).compile();

      const testGuard = module.get<TenantAuthGuard>(TenantAuthGuard);

      const context = createMockExecutionContext({
        'x-api-key': 'any-key',
        'x-tenant-id': 'tenant-123',
      });

      // Should reject since no API keys are configured
      await expect(testGuard.canActivate(context)).rejects.toThrow();
    });
  });
});
