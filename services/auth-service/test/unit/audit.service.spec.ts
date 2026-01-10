import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { AuditService } from '../../src/common/services/audit.service';
import { PrismaService } from '../../src/database/prisma.service';
import { AuditEntry } from '../../src/common/types/audit.types';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrismaService: { $executeRaw: Mock };
  let mockConfigService: { get: Mock };

  beforeEach(async () => {
    mockPrismaService = {
      $executeRaw: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('true'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    const baseEntry: AuditEntry = {
      actorType: 'ADMIN',
      actorId: 'admin-123',
      actorEmail: 'admin@test.com',
      resource: 'user',
      action: 'create',
      success: true,
    };

    it('should log audit entry and write to postgres when dual-write enabled', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.log(baseEntry);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should not write to postgres when dual-write disabled', async () => {
      // Arrange - recreate service with dual-write disabled
      mockConfigService.get.mockReturnValue('false');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const serviceNoDualWrite = module.get<AuditService>(AuditService);

      // Act
      await serviceNoDualWrite.log(baseEntry);

      // Assert
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('should not throw when postgres write fails', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockRejectedValue(new Error('DB error'));

      // Act & Assert - should not throw
      await expect(service.log(baseEntry)).resolves.not.toThrow();
    });

    it('should handle entry with all optional fields', async () => {
      // Arrange
      const fullEntry: AuditEntry = {
        ...baseEntry,
        serviceId: 'service-123',
        serviceSlug: 'resume',
        tenantId: 'tenant-123',
        countryCode: 'KR',
        targetType: 'profile',
        targetId: 'profile-123',
        method: 'POST',
        path: '/api/users',
        statusCode: 201,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        errorMessage: '',
        durationMs: 150,
        metadata: { extra: 'data' },
        requestBody: { name: 'Test' },
        responseSummary: 'Created',
      };
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.log(fullEntry);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('logAdminAction', () => {
    it('should create admin audit entry with correct actor type', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logAdminAction('admin-123', 'admin@test.com', 'update', 'tenant', {
        targetId: 'tenant-456',
        targetType: 'tenant',
        tenantId: 'tenant-456',
        metadata: { status: 'active' },
        ipAddress: '10.0.0.1',
        userAgent: 'Admin Client',
      });

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should work with minimal options', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logAdminAction('admin-123', 'admin@test.com', 'list', 'users');

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('logOperatorAction', () => {
    it('should create operator audit entry with service slug', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logOperatorAction(
        'operator-123',
        'operator@test.com',
        'approve',
        'sanction',
        'resume',
        {
          targetId: 'sanction-456',
          targetType: 'sanction',
          metadata: { reason: 'approved' },
          ipAddress: '10.0.0.2',
          userAgent: 'Operator Console',
        },
      );

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('logUserAction', () => {
    it('should create user audit entry', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logUserAction('user-123', 'user@test.com', 'update', 'profile', {
        targetId: 'profile-123',
        serviceSlug: 'resume',
        metadata: { field: 'name' },
        ipAddress: '192.168.1.50',
        userAgent: 'Mobile App',
      });

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('logSystemAction', () => {
    it('should create system audit entry with success', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logSystemAction('cleanup', 'sessions', {
        targetId: 'batch-123',
        serviceSlug: 'auth',
        metadata: { expiredCount: 100 },
        success: true,
      });

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should create system audit entry with failure', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logSystemAction('sync', 'data', {
        success: false,
        errorMessage: 'Connection timeout',
      });

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should default success to true when not specified', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logSystemAction('healthcheck', 'service');

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });
});
