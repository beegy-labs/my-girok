import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../../common/decorators';
import { Role } from '@my-girok/types';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const createMockExecutionContext = (user: any): ExecutionContext => {
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
      providers: [RolesGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: Role.USER });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return true when user has the required role', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue([Role.USER]);
      const context = createMockExecutionContext({ role: Role.USER });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue([Role.USER, Role.MANAGER]);
      const context = createMockExecutionContext({ role: Role.MANAGER });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue([Role.MASTER]);
      const context = createMockExecutionContext({ role: Role.USER });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user does not have any of multiple required roles', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue([Role.MANAGER, Role.MASTER]);
      const context = createMockExecutionContext({ role: Role.USER });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle GUEST role correctly', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue([Role.GUEST]);
      const context = createMockExecutionContext({ role: Role.GUEST });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow MASTER role access to MASTER-only endpoints', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue([Role.MASTER]);
      const context = createMockExecutionContext({ role: Role.MASTER });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when required roles array is empty', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({ role: Role.USER });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false); // empty array means no match with some()
    });

    it('should correctly check role at handler level', () => {
      // Arrange
      const handlerFn = vi.fn();
      const classFn = vi.fn();
      mockReflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: Role.USER } }),
        }),
        getHandler: () => handlerFn,
        getClass: () => classFn,
      } as unknown as ExecutionContext;

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handlerFn, classFn]);
    });
  });
});
