import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  PermissionAuditService,
  PermissionAuditEntry,
  PermissionCheckResult,
} from './permission-audit.service';
import { AuditService } from '../services/audit.service';

// Mock the @my-girok/nest-common module
vi.mock('@my-girok/nest-common', () => ({
  maskIpAddress: vi.fn((ip: string) => `masked-${ip}`),
  maskUuid: vi.fn((uuid: string) => `masked-${uuid}`),
}));

describe('PermissionAuditService', () => {
  let service: PermissionAuditService;
  let loggerDebugSpy: ReturnType<typeof vi.spyOn>;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionAuditService, { provide: AuditService, useValue: mockAuditService }],
    }).compile();

    service = module.get<PermissionAuditService>(PermissionAuditService);

    // Spy on logger methods
    loggerDebugSpy = vi.spyOn(Logger.prototype, 'debug').mockImplementation();
    loggerWarnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logPermissionCheck', () => {
    const createMockEntry = (
      overrides: Partial<PermissionAuditEntry> = {},
    ): PermissionAuditEntry => ({
      operatorId: 'user-123',
      operatorEmail: 'user@example.com',
      ipAddress: '192.168.1.100',
      resource: 'users',
      action: 'read',
      requiredPermissions: ['users:read'],
      operatorPermissions: ['users:read', 'users:update'],
      result: 'GRANTED' as PermissionCheckResult,
      ...overrides,
    });

    it('should log debug message for GRANTED result', async () => {
      // Arrange
      const entry = createMockEntry({ result: 'GRANTED' });

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permission check GRANTED',
          operatorId: 'masked-user-123',
          ipAddress: 'masked-192.168.1.100',
          resource: 'users',
          action: 'read',
          result: 'GRANTED',
        }),
      );
    });

    it('should log warning message for DENIED result', async () => {
      // Arrange
      const entry = createMockEntry({ result: 'DENIED' });

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permission check DENIED',
          operatorId: 'masked-user-123',
          ipAddress: 'masked-192.168.1.100',
          resource: 'users',
          action: 'read',
          result: 'DENIED',
          operatorPermissions: ['users:read', 'users:update'],
        }),
      );
    });

    it('should persist audit log to AuditService', async () => {
      // Arrange
      const entry = createMockEntry({
        resourceId: 'resource-456',
        method: 'GET',
        path: '/api/users/resource-456',
        userAgent: 'Mozilla/5.0',
        metadata: { extra: 'data' },
      });

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorType: 'ADMIN',
        actorId: 'user-123',
        actorEmail: 'user@example.com',
        resource: 'users',
        action: 'read',
        targetId: 'resource-456',
        method: 'GET',
        path: '/api/users/resource-456',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        success: true,
        metadata: {
          requiredPermissions: ['users:read'],
          operatorPermissions: ['users:read', 'users:update'],
          result: 'GRANTED',
          extra: 'data',
        },
      });
    });

    it('should set success to false for DENIED result', async () => {
      // Arrange
      const entry = createMockEntry({ result: 'DENIED' });

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it('should mask PII in log context', async () => {
      // Arrange
      const entry = createMockEntry({
        operatorId: 'sensitive-uuid-12345',
        ipAddress: '10.0.0.1',
      });

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'masked-sensitive-uuid-12345',
          ipAddress: 'masked-10.0.0.1',
        }),
      );
    });

    it('should include all required log context fields', async () => {
      // Arrange
      const entry = createMockEntry({
        resourceId: 'doc-789',
        method: 'POST',
        path: '/api/documents',
      });

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorEmail: 'user@example.com',
          requiredPermissions: ['users:read'],
          resourceId: 'doc-789',
          method: 'POST',
          path: '/api/documents',
        }),
      );
    });

    it('should handle missing optional fields', async () => {
      // Arrange
      const entry: PermissionAuditEntry = {
        operatorId: 'user-123',
        ipAddress: '192.168.1.1',
        resource: 'users',
        action: 'list',
        requiredPermissions: [],
        operatorPermissions: [],
        result: 'GRANTED',
      };

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorEmail: undefined,
          targetId: undefined,
          method: undefined,
          path: undefined,
          userAgent: undefined,
        }),
      );
    });

    it('should merge metadata with permission details', async () => {
      // Arrange
      const entry = createMockEntry({
        metadata: { customField: 'customValue', anotherField: 123 },
      });

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            customField: 'customValue',
            anotherField: 123,
            requiredPermissions: ['users:read'],
            operatorPermissions: ['users:read', 'users:update'],
            result: 'GRANTED',
          }),
        }),
      );
    });
  });

  describe('logGranted', () => {
    it('should log a granted permission check', async () => {
      // Arrange
      const operatorId = 'user-123';
      const ipAddress = '10.0.0.1';
      const resource = 'documents';
      const action = 'read';

      // Act
      await service.logGranted(operatorId, ipAddress, resource, action);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: operatorId,
          resource,
          action,
          success: true,
          metadata: expect.objectContaining({ result: 'GRANTED' }),
        }),
      );
    });

    it('should include optional parameters', async () => {
      // Arrange
      const options = {
        operatorEmail: 'test@example.com',
        requiredPermissions: ['docs:read'],
        operatorPermissions: ['docs:read', 'docs:write'],
        resourceId: 'doc-123',
        method: 'GET',
        path: '/api/documents/doc-123',
        userAgent: 'TestAgent/1.0',
        metadata: { source: 'api' },
      };

      // Act
      await service.logGranted('user-123', '10.0.0.1', 'documents', 'read', options);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorEmail: 'test@example.com',
          targetId: 'doc-123',
          method: 'GET',
          path: '/api/documents/doc-123',
          userAgent: 'TestAgent/1.0',
        }),
      );
    });

    it('should use empty arrays for missing permission fields', async () => {
      // Act
      await service.logGranted('user-123', '10.0.0.1', 'documents', 'read');

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            requiredPermissions: [],
            operatorPermissions: [],
          }),
        }),
      );
    });
  });

  describe('logDenied', () => {
    it('should log a denied permission check', async () => {
      // Arrange
      const operatorId = 'user-456';
      const ipAddress = '172.16.0.1';
      const resource = 'admin-settings';
      const action = 'update';

      // Act
      await service.logDenied(operatorId, ipAddress, resource, action);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permission check DENIED',
          resource: 'admin-settings',
          action: 'update',
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: operatorId,
          resource,
          action,
          success: false,
          metadata: expect.objectContaining({ result: 'DENIED' }),
        }),
      );
    });

    it('should include optional parameters', async () => {
      // Arrange
      const options = {
        operatorEmail: 'hacker@example.com',
        requiredPermissions: ['admin:manage'],
        operatorPermissions: ['user:read'],
        resourceId: 'setting-999',
        method: 'DELETE',
        path: '/api/admin/settings/setting-999',
        userAgent: 'SuspiciousBot/1.0',
        metadata: { attemptNumber: 3 },
      };

      // Act
      await service.logDenied('user-456', '172.16.0.1', 'admin-settings', 'delete', options);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorEmail: 'hacker@example.com',
          targetId: 'setting-999',
          method: 'DELETE',
          path: '/api/admin/settings/setting-999',
          userAgent: 'SuspiciousBot/1.0',
          metadata: expect.objectContaining({
            attemptNumber: 3,
            requiredPermissions: ['admin:manage'],
            operatorPermissions: ['user:read'],
          }),
        }),
      );
    });

    it('should use empty arrays for missing permission fields', async () => {
      // Act
      await service.logDenied('user-123', '10.0.0.1', 'settings', 'update');

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            requiredPermissions: [],
            operatorPermissions: [],
          }),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty permission arrays', async () => {
      // Arrange
      const entry: PermissionAuditEntry = {
        operatorId: 'user-123',
        ipAddress: '10.0.0.1',
        resource: 'public-resource',
        action: 'read',
        requiredPermissions: [],
        operatorPermissions: [],
        result: 'GRANTED',
      };

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            requiredPermissions: [],
            operatorPermissions: [],
          }),
        }),
      );
    });

    it('should handle wildcard permissions in operator permissions', async () => {
      // Arrange
      const entry: PermissionAuditEntry = {
        operatorId: 'super-admin-123',
        operatorEmail: 'superadmin@example.com',
        ipAddress: '10.0.0.1',
        resource: 'any-resource',
        action: 'any-action',
        requiredPermissions: ['specific:permission'],
        operatorPermissions: ['*'],
        result: 'GRANTED',
      };

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            operatorPermissions: ['*'],
          }),
        }),
      );
    });

    it('should handle many permissions', async () => {
      // Arrange
      const manyPermissions = Array.from({ length: 50 }, (_, i) => `permission:${i}`);
      const entry: PermissionAuditEntry = {
        operatorId: 'user-123',
        ipAddress: '10.0.0.1',
        resource: 'complex-resource',
        action: 'manage',
        requiredPermissions: manyPermissions.slice(0, 5),
        operatorPermissions: manyPermissions,
        result: 'GRANTED',
      };

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            operatorPermissions: manyPermissions,
          }),
        }),
      );
    });

    it('should handle special characters in resource and action names', async () => {
      // Arrange
      const entry: PermissionAuditEntry = {
        operatorId: 'user-123',
        ipAddress: '10.0.0.1',
        resource: 'resource-with-dashes_and_underscores',
        action: 'action:with:colons',
        requiredPermissions: [],
        operatorPermissions: [],
        result: 'GRANTED',
      };

      // Act
      await service.logPermissionCheck(entry);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'resource-with-dashes_and_underscores',
          action: 'action:with:colons',
        }),
      );
    });
  });
});
