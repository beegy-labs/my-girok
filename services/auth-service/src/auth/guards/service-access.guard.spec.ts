import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ServiceAccessGuard } from './service-access.guard';
import { REQUIRE_SERVICE_KEY } from '../decorators/require-service.decorator';
import { AuthenticatedEntity } from '@my-girok/types';

describe('ServiceAccessGuard', () => {
  let guard: ServiceAccessGuard;

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const createMockUser = (
    services: Record<string, { status: string; countries: string[] }>,
  ): AuthenticatedEntity => ({
    type: 'USER',
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
    accountMode: 'SERVICE',
    countryCode: 'KR',
    services: services as any,
  });

  const createMockAdmin = (): AuthenticatedEntity => ({
    type: 'ADMIN',
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    scope: 'SYSTEM',
    tenantId: null,
    roleId: 'role-1',
    roleName: 'SUPER_ADMIN',
    level: 0,
    permissions: ['*'],
    services: {},
  });

  const createMockOperator = (): AuthenticatedEntity => ({
    type: 'OPERATOR',
    id: 'operator-123',
    email: 'operator@example.com',
    name: 'Operator User',
    adminId: 'admin-123',
    serviceId: 'service-1',
    serviceSlug: 'my-girok',
    countryCode: 'KR',
    permissions: ['legal:read'],
  });

  const createMockExecutionContext = (
    user: AuthenticatedEntity | null,
    params: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
        }),
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceAccessGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<ServiceAccessGuard>(ServiceAccessGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no service is required', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(createMockUser({}));

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_SERVICE_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('my-girok');
      const context = createMockExecutionContext(null);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User authentication required');
    });

    it('should throw ForbiddenException for admin (not user type)', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('my-girok');
      const context = createMockExecutionContext(createMockAdmin());

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User authentication required');
    });

    it('should throw ForbiddenException for operator (not user type)', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('my-girok');
      const context = createMockExecutionContext(createMockOperator());

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User authentication required');
    });

    it('should return true when user has joined the service with ACTIVE status', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('my-girok');
      const user = createMockUser({
        'my-girok': { status: 'ACTIVE', countries: ['KR'] },
      });
      const context = createMockExecutionContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user has not joined the service', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('my-girok');
      const user = createMockUser({});
      const context = createMockExecutionContext(user);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Not joined to service: my-girok');
    });

    it('should throw ForbiddenException when service is SUSPENDED', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('my-girok');
      const user = createMockUser({
        'my-girok': { status: 'SUSPENDED', countries: ['KR'] },
      });
      const context = createMockExecutionContext(user);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Service access suspended: my-girok');
    });

    it('should throw ForbiddenException when service is WITHDRAWN', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('my-girok');
      const user = createMockUser({
        'my-girok': { status: 'WITHDRAWN', countries: ['KR'] },
      });
      const context = createMockExecutionContext(user);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Service access suspended: my-girok');
    });

    // Dynamic service slug tests
    describe('dynamic service slug', () => {
      it('should get service slug from route params', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          personal: { status: 'ACTIVE', countries: ['KR'] },
        });
        const context = createMockExecutionContext(user, { slug: 'personal' });

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when dynamic slug is missing', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          'my-girok': { status: 'ACTIVE', countries: ['KR'] },
        });
        const context = createMockExecutionContext(user, {});

        // Act & Assert
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('Service slug is required');
      });

      it('should throw ForbiddenException when user not joined to dynamic service', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          'my-girok': { status: 'ACTIVE', countries: ['KR'] },
        });
        const context = createMockExecutionContext(user, { slug: 'personal' });

        // Act & Assert
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('Not joined to service: personal');
      });

      it('should throw ForbiddenException when dynamic service is suspended', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          personal: { status: 'SUSPENDED', countries: ['KR'] },
        });
        const context = createMockExecutionContext(user, { slug: 'personal' });

        // Act & Assert
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('Service access suspended: personal');
      });
    });

    it('should handle multiple services correctly', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('personal');
      const user = createMockUser({
        'my-girok': { status: 'ACTIVE', countries: ['KR'] },
        personal: { status: 'ACTIVE', countries: ['KR', 'US'] },
        analytics: { status: 'SUSPENDED', countries: ['KR'] },
      });
      const context = createMockExecutionContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should correctly check at handler and class level', () => {
      // Arrange
      const handlerFn = vi.fn();
      const classFn = vi.fn();
      mockReflector.getAllAndOverride.mockReturnValue('my-girok');

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: createMockUser({
              'my-girok': { status: 'ACTIVE', countries: ['KR'] },
            }),
            params: {},
          }),
        }),
        getHandler: () => handlerFn,
        getClass: () => classFn,
      } as unknown as ExecutionContext;

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_SERVICE_KEY, [
        handlerFn,
        classFn,
      ]);
    });
  });
});
