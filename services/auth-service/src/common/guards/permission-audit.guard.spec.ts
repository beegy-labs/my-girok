import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { PermissionAuditGuard, AuditPermissionOptions } from './permission-audit.guard';
import { PermissionAuditService } from './permission-audit.service';

describe('PermissionAuditGuard', () => {
  let guard: PermissionAuditGuard;

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const mockPermissionAuditService = {
    logPermissionCheck: vi.fn(),
  };

  const createMockUser = (overrides: Record<string, any> = {}) => ({
    id: 'user-123',
    sub: 'user-123',
    email: 'user@example.com',
    permissions: ['legal:read', 'legal:update'],
    ...overrides,
  });

  const createMockRequest = (overrides: Record<string, any> = {}) => ({
    user: createMockUser(),
    params: { id: 'resource-123' },
    method: 'GET',
    url: '/api/legal/documents/resource-123',
    ip: '192.168.1.100',
    connection: { remoteAddress: '192.168.1.100' },
    headers: {
      'user-agent': 'Mozilla/5.0 Test Agent',
      'x-forwarded-for': '10.0.0.1, 192.168.1.1',
      'x-real-ip': '172.16.0.1',
    },
    ...overrides,
  });

  const createMockExecutionContext = (
    request: any,
    handlerName = 'findOne',
    controllerName = 'LegalDocumentsController',
  ): ExecutionContext => {
    const handler = vi.fn();
    Object.defineProperty(handler, 'name', { value: handlerName });

    const controller = vi.fn();
    Object.defineProperty(controller, 'name', { value: controllerName });

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => handler,
      getClass: () => controller,
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionAuditGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PermissionAuditService, useValue: mockPermissionAuditService },
      ],
    }).compile();

    guard = module.get<PermissionAuditGuard>(PermissionAuditGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should always return true (audit only, no blocking)', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(createMockRequest());

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should log GRANTED when user has required permissions', async () => {
      // Arrange
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['legal:read']) // PERMISSIONS_KEY
        .mockReturnValueOnce(undefined); // AUDIT_PERMISSION_KEY
      const request = createMockRequest();
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'user-123',
          operatorEmail: 'user@example.com',
          resource: 'legaldocuments',
          action: 'findOne',
          requiredPermissions: ['legal:read'],
          operatorPermissions: ['legal:read', 'legal:update'],
          result: 'GRANTED',
          resourceId: 'resource-123',
          method: 'GET',
          path: '/api/legal/documents/resource-123',
        }),
      );
    });

    it('should log DENIED when user lacks required permissions', async () => {
      // Arrange
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['admin:manage']) // PERMISSIONS_KEY
        .mockReturnValueOnce(undefined); // AUDIT_PERMISSION_KEY
      const request = createMockRequest();
      const context = createMockExecutionContext(request);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true); // Guard always returns true
      expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'DENIED',
          requiredPermissions: ['admin:manage'],
          operatorPermissions: ['legal:read', 'legal:update'],
        }),
      );
    });

    it('should log GRANTED when no permissions are required', async () => {
      // Arrange
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // PERMISSIONS_KEY - no permissions required
        .mockReturnValueOnce(undefined); // AUDIT_PERMISSION_KEY
      const request = createMockRequest();
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'GRANTED',
          requiredPermissions: [],
        }),
      );
    });

    it('should log GRANTED when required permissions array is empty', async () => {
      // Arrange
      mockReflector.getAllAndOverride
        .mockReturnValueOnce([]) // PERMISSIONS_KEY - empty array
        .mockReturnValueOnce(undefined); // AUDIT_PERMISSION_KEY
      const request = createMockRequest();
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'GRANTED',
          requiredPermissions: [],
        }),
      );
    });

    describe('with AuditPermission decorator options', () => {
      it('should use custom resource and action from decorator', async () => {
        // Arrange
        const auditOptions: AuditPermissionOptions = {
          resource: 'custom-resource',
          action: 'custom-action',
        };
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(['legal:read']) // PERMISSIONS_KEY
          .mockReturnValueOnce(auditOptions); // AUDIT_PERMISSION_KEY
        const context = createMockExecutionContext(createMockRequest());

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            resource: 'custom-resource',
            action: 'custom-action',
          }),
        );
      });

      it('should include custom metadata from decorator', async () => {
        // Arrange
        const auditOptions: AuditPermissionOptions = {
          resource: 'users',
          action: 'update',
          metadata: { reason: 'admin-override', requestId: 'req-123' },
        };
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(['users:update']) // PERMISSIONS_KEY
          .mockReturnValueOnce(auditOptions); // AUDIT_PERMISSION_KEY
        const context = createMockExecutionContext(createMockRequest());

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: { reason: 'admin-override', requestId: 'req-123' },
          }),
        );
      });

      it('should not log success when logSuccess is false', async () => {
        // Arrange
        const auditOptions: AuditPermissionOptions = {
          resource: 'users',
          action: 'read',
          logSuccess: false,
        };
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(['legal:read']) // PERMISSIONS_KEY - user has this
          .mockReturnValueOnce(auditOptions); // AUDIT_PERMISSION_KEY
        const context = createMockExecutionContext(createMockRequest());

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).not.toHaveBeenCalled();
      });

      it('should not log failure when logFailure is false', async () => {
        // Arrange
        const auditOptions: AuditPermissionOptions = {
          resource: 'users',
          action: 'delete',
          logFailure: false,
        };
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(['admin:delete']) // PERMISSIONS_KEY - user doesn't have this
          .mockReturnValueOnce(auditOptions); // AUDIT_PERMISSION_KEY
        const context = createMockExecutionContext(createMockRequest());

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).not.toHaveBeenCalled();
      });

      it('should log success when logSuccess is true (explicit)', async () => {
        // Arrange
        const auditOptions: AuditPermissionOptions = {
          resource: 'users',
          action: 'read',
          logSuccess: true,
        };
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(['legal:read'])
          .mockReturnValueOnce(auditOptions);
        const context = createMockExecutionContext(createMockRequest());

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ result: 'GRANTED' }),
        );
      });
    });

    describe('IP address extraction', () => {
      it('should extract IP from x-forwarded-for header (first IP)', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({
          headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1' },
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ ipAddress: '203.0.113.1' }),
        );
      });

      it('should extract IP from x-real-ip header', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({
          headers: { 'x-real-ip': '172.16.0.100' },
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ ipAddress: '172.16.0.100' }),
        );
      });

      it('should extract IP from request.ip', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({
          headers: {},
          ip: '10.0.0.50',
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ ipAddress: '10.0.0.50' }),
        );
      });

      it('should extract IP from connection.remoteAddress', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({
          headers: {},
          ip: undefined,
          connection: { remoteAddress: '192.168.100.50' },
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ ipAddress: '192.168.100.50' }),
        );
      });

      it('should return "unknown" when no IP is available', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({
          headers: {},
          ip: undefined,
          connection: {},
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ ipAddress: 'unknown' }),
        );
      });
    });

    describe('user context handling', () => {
      it('should handle user with id property', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({
          user: { id: 'user-456', email: 'test@example.com', permissions: [] },
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ operatorId: 'user-456' }),
        );
      });

      it('should handle user with sub property (JWT)', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({
          user: { sub: 'jwt-user-789', email: 'jwt@example.com', permissions: [] },
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ operatorId: 'jwt-user-789' }),
        );
      });

      it('should use "anonymous" when no user ID is available', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({
          user: { email: 'test@example.com', permissions: [] },
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({ operatorId: 'anonymous' }),
        );
      });

      it('should use "anonymous" when no user is present', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const request = createMockRequest({ user: undefined });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            operatorId: 'anonymous',
            operatorEmail: undefined,
          }),
        );
      });

      it('should handle user with empty permissions array', async () => {
        // Arrange
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(['legal:read'])
          .mockReturnValueOnce(undefined);
        const request = createMockRequest({
          user: { id: 'user-123', permissions: [] },
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            result: 'DENIED',
            operatorPermissions: [],
          }),
        );
      });

      it('should handle user without permissions property', async () => {
        // Arrange
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(['legal:read'])
          .mockReturnValueOnce(undefined);
        const request = createMockRequest({
          user: { id: 'user-123', email: 'test@example.com' },
        });
        const context = createMockExecutionContext(request);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            result: 'DENIED',
            operatorPermissions: [],
          }),
        );
      });
    });

    describe('controller and handler name extraction', () => {
      it('should extract resource from controller name', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockExecutionContext(createMockRequest(), 'list', 'UsersController');

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            resource: 'users',
            action: 'list',
          }),
        );
      });

      it('should extract resource from admin controller name', async () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockExecutionContext(
          createMockRequest(),
          'create',
          'AdminLegalController',
        );

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            resource: 'adminlegal',
            action: 'create',
          }),
        );
      });
    });

    it('should include user-agent in audit log', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const request = createMockRequest({
        headers: { 'user-agent': 'CustomBot/1.0' },
      });
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({ userAgent: 'CustomBot/1.0' }),
      );
    });

    it('should handle missing params.id', async () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const request = createMockRequest({ params: {} });
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockPermissionAuditService.logPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: undefined }),
      );
    });
  });
});
