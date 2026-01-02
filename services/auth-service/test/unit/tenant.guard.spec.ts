import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TenantGuard } from '../../src/admin/guards/tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantGuard],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
  });

  function createMockContext(
    admin: Record<string, unknown> | null,
    params?: Record<string, string>,
    body?: Record<string, string>,
  ): ExecutionContext {
    const mockRequest = {
      admin,
      params: params || {},
      body: body || {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  }

  describe('canActivate', () => {
    it('should throw ForbiddenException when no admin context', () => {
      // Arrange
      const context = createMockContext(null);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Admin context not found');
    });

    it('should allow SYSTEM scope admin to access any tenant', () => {
      // Arrange
      const admin = {
        id: 'admin-123',
        scope: 'SYSTEM',
        tenantId: null,
      };
      const context = createMockContext(admin, { tenantId: 'any-tenant-id' });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow tenant admin to access their own tenant (via params)', () => {
      // Arrange
      const tenantId = 'tenant-123';
      const admin = {
        id: 'admin-123',
        scope: 'TENANT',
        tenantId,
      };
      const context = createMockContext(admin, { tenantId });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow tenant admin to access their own tenant (via body)', () => {
      // Arrange
      const tenantId = 'tenant-123';
      const admin = {
        id: 'admin-123',
        scope: 'TENANT',
        tenantId,
      };
      const context = createMockContext(admin, {}, { tenantId });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny tenant admin access to other tenants', () => {
      // Arrange
      const admin = {
        id: 'admin-123',
        scope: 'TENANT',
        tenantId: 'tenant-123',
      };
      const context = createMockContext(admin, { tenantId: 'other-tenant-456' });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Cannot access other tenant data');
    });

    it('should allow tenant admin when no tenantId is specified', () => {
      // Arrange
      const admin = {
        id: 'admin-123',
        scope: 'TENANT',
        tenantId: 'tenant-123',
      };
      const context = createMockContext(admin); // No tenantId in params or body

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should prioritize params.tenantId over body.tenantId', () => {
      // Arrange
      const admin = {
        id: 'admin-123',
        scope: 'TENANT',
        tenantId: 'tenant-123',
      };
      // params has different tenant than body
      const context = createMockContext(
        admin,
        { tenantId: 'other-tenant-456' },
        { tenantId: 'tenant-123' },
      );

      // Act & Assert
      // Should fail because params.tenantId takes precedence
      expect(() => guard.canActivate(context)).toThrow('Cannot access other tenant data');
    });
  });
});
