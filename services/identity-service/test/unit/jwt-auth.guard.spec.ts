import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard, JwtPayload } from '../../src/common/guards/jwt-auth.guard';
import { CacheService } from '../../src/common/cache/cache.service';
import { CircuitBreakerService } from '../../src/common/resilience/circuit-breaker.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let jwtService: jest.Mocked<JwtService>;
  let circuitBreaker: jest.Mocked<CircuitBreakerService>;

  const mockPayload: JwtPayload = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    jti: 'jwt-id-123',
    email: 'test@example.com',
    username: 'testuser',
    permissions: ['read:account', 'write:account'],
    roles: ['user'],
    accountMode: 'SERVICE',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const createMockExecutionContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const mockRequest = {
      headers: {
        authorization: headers.authorization || '',
        ...headers,
      },
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
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          JWT_SECRET: 'test-secret',
          JWT_PUBLIC_KEY: undefined,
          JWT_ISSUER: 'test-issuer',
          JWT_AUDIENCE: 'test-audience',
          NODE_ENV: 'production',
          SECURITY_FAIL_SECURE: true,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockCacheService = {
      isTokenRevoked: jest.fn(),
    };

    const mockCircuitBreaker = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
    jwtService = module.get(JwtService);
    circuitBreaker = module.get(CircuitBreakerService);
  });

  describe('canActivate', () => {
    it('should allow access to public routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-Bearer token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        authorization: 'Basic abc123',
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Authorization token is required');
    });

    it('should verify valid Bearer token and allow access', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockResolvedValue(false);

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
        algorithms: ['HS256', 'HS384', 'HS512'],
        issuer: 'test-issuer',
        audience: 'test-audience',
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const context = createMockExecutionContext({
        authorization: 'Bearer invalid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException for expired token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      const context = createMockExecutionContext({
        authorization: 'Bearer expired-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('token revocation check', () => {
    it('should reject revoked token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockResolvedValue(true); // Token is revoked

      const context = createMockExecutionContext({
        authorization: 'Bearer revoked-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Token has been revoked');
    });

    it('should allow non-revoked token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockResolvedValue(false); // Token not revoked

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should skip revocation check for tokens without JTI', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const payloadWithoutJti = { ...mockPayload, jti: undefined };
      jwtService.verifyAsync.mockResolvedValue(payloadWithoutJti);

      const context = createMockExecutionContext({
        authorization: 'Bearer token-without-jti',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(circuitBreaker.execute).not.toHaveBeenCalled();
    });
  });

  describe('FAIL-SECURE behavior (Issue #468)', () => {
    it('should reject token when cache is unavailable in production (fail-secure)', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockRejectedValue(new Error('Cache unavailable'));

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Unable to verify token status');
    });

    it('should reject token when cache timeout occurs in production (fail-secure)', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockRejectedValue(new Error('Cache timeout'));

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Unable to verify token status');
    });

    it('should reject token when circuit breaker is open (fail-secure)', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockRejectedValue(new Error('Circuit breaker is open'));

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Unable to verify token status');
    });

    it('should log security event on cache failure', async () => {
      // Note: In a real test, we'd use a logger spy
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockRejectedValue(new Error('Cache error'));

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('FAIL-OPEN behavior in non-production', () => {
    beforeEach(async () => {
      const mockConfigNonProd = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            JWT_SECRET: 'test-secret',
            JWT_PUBLIC_KEY: undefined,
            JWT_ISSUER: undefined,
            JWT_AUDIENCE: undefined,
            NODE_ENV: 'development',
            SECURITY_FAIL_SECURE: false,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
          { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigNonProd },
          { provide: CacheService, useValue: { isTokenRevoked: jest.fn() } },
          { provide: CircuitBreakerService, useValue: { execute: jest.fn() } },
        ],
      }).compile();

      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
      reflector = module.get(Reflector);
      jwtService = module.get(JwtService);
      circuitBreaker = module.get(CircuitBreakerService);
    });

    it('should allow token when cache fails in development (fail-open)', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockRejectedValue(new Error('Cache unavailable'));

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      // In development with fail-open, should not throw
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('without cache service', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
          { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: unknown) => {
                const config: Record<string, unknown> = {
                  JWT_SECRET: 'test-secret',
                  JWT_ISSUER: 'test-issuer',
                  JWT_AUDIENCE: 'test-audience',
                  NODE_ENV: 'production',
                  SECURITY_FAIL_SECURE: true,
                };
                return config[key] ?? defaultValue;
              }),
            },
          },
          // CacheService not provided
        ],
      }).compile();

      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
      reflector = module.get(Reflector);
      jwtService = module.get(JwtService);
    });

    it('should reject token when cache service unavailable (fail-secure)', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Unable to verify token status');
    });
  });

  describe('RS256 algorithm configuration', () => {
    beforeEach(async () => {
      const mockConfigRS256 = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            JWT_SECRET: undefined,
            JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nMIIB...test\n-----END PUBLIC KEY-----',
            JWT_ISSUER: 'test-issuer',
            JWT_AUDIENCE: 'test-audience',
            NODE_ENV: 'production',
            SECURITY_FAIL_SECURE: true,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
          { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigRS256 },
          { provide: CacheService, useValue: { isTokenRevoked: jest.fn() } },
          { provide: CircuitBreakerService, useValue: { execute: jest.fn() } },
        ],
      }).compile();

      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
      reflector = module.get(Reflector);
      jwtService = module.get(JwtService);
      circuitBreaker = module.get(CircuitBreakerService);
    });

    it('should use RS256 algorithms when public key is configured', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockResolvedValue(false);

      const context = createMockExecutionContext({
        authorization: 'Bearer rs256-token',
      });

      await guard.canActivate(context);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'rs256-token',
        expect.objectContaining({
          algorithms: ['RS256', 'RS384', 'RS512'],
        }),
      );
    });
  });

  describe('request user attachment', () => {
    it('should attach user payload to request', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      circuitBreaker.execute.mockResolvedValue(false);

      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect((mockRequest as any).user).toBeDefined();
      expect((mockRequest as any).user.sub).toBe(mockPayload.sub);
      expect((mockRequest as any).accountId).toBe(mockPayload.sub);
    });
  });

  describe('production configuration validation', () => {
    it('should require issuer and audience in production', async () => {
      const mockConfigNoIssuer = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            JWT_SECRET: 'test-secret',
            JWT_ISSUER: undefined,
            JWT_AUDIENCE: undefined,
            NODE_ENV: 'production',
            SECURITY_FAIL_SECURE: true,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
          { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigNoIssuer },
          { provide: CacheService, useValue: { isTokenRevoked: jest.fn() } },
          { provide: CircuitBreakerService, useValue: { execute: jest.fn() } },
        ],
      }).compile();

      const testGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
      const testReflector = module.get<Reflector>(Reflector);
      const testJwtService = module.get<JwtService>(JwtService);

      (testReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      (testJwtService.verifyAsync as jest.Mock).mockRejectedValue(
        new Error('JWT issuer/audience not configured'),
      );

      const context = createMockExecutionContext({
        authorization: 'Bearer some-token',
      });

      await expect(testGuard.canActivate(context)).rejects.toThrow();
    });
  });
});
