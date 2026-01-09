import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AccountTypeGuard } from './account-type.guard';
import {
  REQUIRE_ACCOUNT_TYPE_KEY,
  AccountType,
} from '../decorators/require-account-type.decorator';
import { AuthenticatedEntity } from '@my-girok/types';

describe('AccountTypeGuard', () => {
  let guard: AccountTypeGuard;

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const createMockUser = (type: 'USER' | 'ADMIN' | 'OPERATOR'): AuthenticatedEntity => {
    if (type === 'USER') {
      return {
        type: 'USER',
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        accountMode: 'SERVICE',
        countryCode: 'KR',
        services: {},
      };
    }
    if (type === 'ADMIN') {
      return {
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
      };
    }
    return {
      type: 'OPERATOR',
      id: 'operator-123',
      email: 'operator@example.com',
      name: 'Operator User',
      adminId: 'admin-123',
      serviceId: 'service-1',
      serviceSlug: 'my-girok',
      countryCode: 'KR',
      permissions: ['legal:read'],
    };
  };

  const createMockExecutionContext = (user: AuthenticatedEntity | null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountTypeGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<AccountTypeGuard>(AccountTypeGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no account types are required', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(createMockUser('USER'));

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_ACCOUNT_TYPE_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return true when required types array is empty', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext(createMockUser('USER'));

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user type matches required type', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['USER'] as AccountType[]);
      const context = createMockExecutionContext(createMockUser('USER'));

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when admin type matches required type', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['ADMIN'] as AccountType[]);
      const context = createMockExecutionContext(createMockUser('ADMIN'));

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when operator type matches required type', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['OPERATOR'] as AccountType[]);
      const context = createMockExecutionContext(createMockUser('OPERATOR'));

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user type matches one of multiple required types', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'OPERATOR'] as AccountType[]);
      const context = createMockExecutionContext(createMockUser('OPERATOR'));

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user type does not match', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['ADMIN'] as AccountType[]);
      const context = createMockExecutionContext(createMockUser('USER'));

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required account type: ADMIN',
      );
    });

    it('should throw ForbiddenException with multiple types in message', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'OPERATOR'] as AccountType[]);
      const context = createMockExecutionContext(createMockUser('USER'));

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required account type: ADMIN or OPERATOR',
      );
    });

    it('should throw ForbiddenException when no user is present', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['USER'] as AccountType[]);
      const context = createMockExecutionContext(null);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user object is undefined', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['USER'] as AccountType[]);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: undefined }),
        }),
        getHandler: () => vi.fn(),
        getClass: () => vi.fn(),
      } as unknown as ExecutionContext;

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should correctly check at handler and class level', () => {
      // Arrange
      const handlerFn = vi.fn();
      const classFn = vi.fn();
      mockReflector.getAllAndOverride.mockReturnValue(['USER'] as AccountType[]);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: createMockUser('USER') }),
        }),
        getHandler: () => handlerFn,
        getClass: () => classFn,
      } as unknown as ExecutionContext;

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_ACCOUNT_TYPE_KEY, [
        handlerFn,
        classFn,
      ]);
    });
  });
});
