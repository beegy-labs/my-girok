import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { SanctionService } from '../../src/admin/services/sanction.service';
import { AuditLogService } from '../../src/admin/services/audit-log.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { createMockCacheManager, MockCacheManager } from '../utils/mock-cache';
import {
  createAdminPayload,
  createSanctionResponse,
  createTemporaryBanSanction,
  generateTestId,
  resetTestCounter,
} from '../utils/test-factory';
import {
  SanctionSubjectType,
  SanctionType,
  SanctionStatus,
  SanctionSeverity,
  NotificationChannel,
} from '../../src/admin/dto/sanction.dto';

describe('SanctionService', () => {
  let service: SanctionService;
  let mockPrisma: MockPrismaService;
  let mockCache: MockCacheManager;
  let mockEventEmitter: { emit: Mock };
  let mockAuditLogService: { log: Mock };

  const serviceId = '00000000-0000-7000-0000-000000000001';
  const sanctionId = '00000000-0000-7000-0000-000000000002';
  const subjectId = '00000000-0000-7000-0000-000000000003';

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();
    mockCache = createMockCacheManager();
    mockEventEmitter = { emit: vi.fn() };
    mockAuditLogService = { log: vi.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanctionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<SanctionService>(SanctionService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated list of sanctions', async () => {
      // Arrange
      const mockSanctions = [
        {
          id: sanctionId,
          subjectId,
          subjectType: 'USER',
          subjectEmail: 'user@test.com',
          subjectName: 'Test User',
          serviceId,
          scope: 'SERVICE',
          type: 'WARNING',
          status: 'ACTIVE',
          severity: 'MEDIUM',
          restrictedFeatures: [],
          reason: 'Test reason',
          internalNote: null,
          evidenceUrls: [],
          issuedBy: generateTestId(),
          issuerEmail: 'admin@test.com',
          issuerName: 'Test Admin',
          issuedByType: 'ADMIN',
          startAt: new Date(),
          endAt: null,
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
          appealStatus: null,
          appealedAt: null,
          appealReason: null,
          appealReviewedBy: null,
          appealReviewedAt: null,
          appealResponse: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }]) // Count query
        .mockResolvedValueOnce(mockSanctions); // List query

      // Act
      const result = await service.list(serviceId, { page: 1, limit: 20 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.serviceId).toBe(serviceId);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should apply filters correctly', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: BigInt(0) }]).mockResolvedValueOnce([]);

      // Act
      const result = await service.list(serviceId, {
        status: SanctionStatus.ACTIVE,
        type: SanctionType.TEMPORARY_BAN,
        severity: SanctionSeverity.HIGH,
        page: 2,
        limit: 10,
      });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: BigInt(0) }]).mockResolvedValueOnce([]);

      // Act
      const result = await service.list(serviceId, {});

      // Assert
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('findOne', () => {
    const mockSanctionRow = {
      id: sanctionId,
      subjectId,
      subjectType: 'USER',
      subjectEmail: 'user@test.com',
      subjectName: 'Test User',
      serviceId,
      scope: 'SERVICE',
      type: 'WARNING',
      status: 'ACTIVE',
      severity: 'MEDIUM',
      restrictedFeatures: [],
      reason: 'Test reason',
      internalNote: null,
      evidenceUrls: [],
      issuedBy: generateTestId(),
      issuerEmail: 'admin@test.com',
      issuerName: 'Test Admin',
      issuedByType: 'ADMIN',
      startAt: new Date(),
      endAt: null,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      appealStatus: null,
      appealedAt: null,
      appealReason: null,
      appealReviewedBy: null,
      appealReviewedAt: null,
      appealResponse: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return sanction by id', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValue([mockSanctionRow]);

      // Act
      const result = await service.findOne(serviceId, sanctionId);

      // Assert
      expect(result.id).toBe(sanctionId);
      expect(result.subjectId).toBe(subjectId);
      expect(result.status).toBe('ACTIVE');
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should return cached sanction if available', async () => {
      // Arrange
      const cachedSanction = createSanctionResponse({ id: sanctionId });
      mockCache.get.mockResolvedValue(cachedSanction);

      // Act
      const result = await service.findOne(serviceId, sanctionId);

      // Assert
      expect(result).toEqual(cachedSanction);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when sanction does not exist', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne(serviceId, sanctionId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(serviceId, sanctionId)).rejects.toThrow(
        `Sanction not found: ${sanctionId}`,
      );
    });

    it('should include notifications when requested', async () => {
      // Arrange
      const mockNotifications = [
        {
          id: generateTestId(),
          sanctionId,
          channel: 'EMAIL',
          status: 'PENDING',
          sentAt: null,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockSanctionRow]) // findOne
        .mockResolvedValueOnce([mockSanctionRow]) // getNotifications verification
        .mockResolvedValueOnce(mockNotifications); // getNotifications

      // Act
      const result = await service.findOne(serviceId, sanctionId, {
        includeNotifications: true,
      });

      // Assert
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications?.[0].channel).toBe('EMAIL');
    });

    it('should skip cache when skipCache option is true', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([mockSanctionRow]);

      // Act
      await service.findOne(serviceId, sanctionId, { skipCache: true });

      // Assert
      expect(mockCache.get).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const admin = createAdminPayload();

    it('should create a warning sanction', async () => {
      // Arrange
      const mockSanctionRow = {
        id: expect.any(String),
        subjectId,
        subjectType: 'USER',
        subjectEmail: 'user@test.com',
        subjectName: 'Test User',
        serviceId,
        scope: 'SERVICE',
        type: 'WARNING',
        status: 'ACTIVE',
        severity: 'MEDIUM',
        restrictedFeatures: [],
        reason: 'Violation of terms',
        internalNote: null,
        evidenceUrls: [],
        issuedBy: admin.sub,
        issuerEmail: admin.email,
        issuerName: admin.name,
        issuedByType: 'ADMIN',
        startAt: new Date(),
        endAt: null,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        appealStatus: null,
        appealedAt: null,
        appealReason: null,
        appealReviewedBy: null,
        appealReviewedAt: null,
        appealResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue([mockSanctionRow]);

      // Act
      const result = await service.create(
        serviceId,
        {
          subjectId,
          subjectType: SanctionSubjectType.USER,
          type: SanctionType.WARNING,
          reason: 'Violation of terms',
          startAt: new Date().toISOString(),
        },
        admin,
      );

      // Assert
      expect(result.status).toBe('ACTIVE');
      expect(result.type).toBe('WARNING');
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'sanction',
          action: 'create',
        }),
      );
    });

    it('should throw BadRequestException for FEATURE_RESTRICTION without features', async () => {
      // Arrange
      const admin = createAdminPayload();

      // Act & Assert
      await expect(
        service.create(
          serviceId,
          {
            subjectId,
            subjectType: SanctionSubjectType.USER,
            type: SanctionType.FEATURE_RESTRICTION,
            reason: 'Feature restriction',
            startAt: new Date().toISOString(),
          },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for TEMPORARY_BAN without endAt', async () => {
      // Arrange
      const admin = createAdminPayload();

      // Act & Assert
      await expect(
        service.create(
          serviceId,
          {
            subjectId,
            subjectType: SanctionSubjectType.USER,
            type: SanctionType.TEMPORARY_BAN,
            reason: 'Temporary ban',
            startAt: new Date().toISOString(),
          },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate feature codes for FEATURE_RESTRICTION', async () => {
      // Arrange
      const admin = createAdminPayload();
      mockPrisma.$queryRaw.mockResolvedValue([{ code: 'valid-feature' }]);

      // Act & Assert
      await expect(
        service.create(
          serviceId,
          {
            subjectId,
            subjectType: SanctionSubjectType.USER,
            type: SanctionType.FEATURE_RESTRICTION,
            restrictedFeatures: ['valid-feature', 'invalid-feature'],
            reason: 'Feature restriction',
            startAt: new Date().toISOString(),
          },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create notifications for default channels', async () => {
      // Arrange
      const mockSanctionRow = {
        id: sanctionId,
        subjectId,
        subjectType: 'USER',
        subjectEmail: 'user@test.com',
        subjectName: 'Test User',
        serviceId,
        scope: 'SERVICE',
        type: 'WARNING',
        status: 'ACTIVE',
        severity: 'MEDIUM',
        restrictedFeatures: [],
        reason: 'Test',
        internalNote: null,
        evidenceUrls: [],
        issuedBy: admin.sub,
        issuerEmail: admin.email,
        issuerName: admin.name,
        issuedByType: 'ADMIN',
        startAt: new Date(),
        endAt: null,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        appealStatus: null,
        appealedAt: null,
        appealReason: null,
        appealReviewedBy: null,
        appealReviewedAt: null,
        appealResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockSanctionRow])
        .mockResolvedValueOnce([mockSanctionRow])
        .mockResolvedValueOnce([
          {
            id: '1',
            sanctionId,
            channel: 'EMAIL',
            status: 'PENDING',
            sentAt: null,
            readAt: null,
            createdAt: new Date(),
          },
        ]);

      // Act
      await service.create(
        serviceId,
        {
          subjectId,
          subjectType: SanctionSubjectType.USER,
          type: SanctionType.WARNING,
          reason: 'Test',
          startAt: new Date().toISOString(),
        },
        admin,
      );

      // Assert - 2 default channels (EMAIL, IN_APP)
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(3); // 1 sanction + 2 notifications
    });
  });

  describe('update', () => {
    const admin = createAdminPayload();

    it('should update an active sanction', async () => {
      // Arrange
      const beforeSanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
        severity: SanctionSeverity.MEDIUM,
      });

      const afterSanctionRow = {
        id: sanctionId,
        subjectId: beforeSanction.subjectId,
        subjectType: 'USER',
        subjectEmail: 'user@test.com',
        subjectName: 'Test User',
        serviceId,
        scope: 'SERVICE',
        type: 'WARNING',
        status: 'ACTIVE',
        severity: 'HIGH',
        restrictedFeatures: [],
        reason: 'Updated reason',
        internalNote: null,
        evidenceUrls: [],
        issuedBy: beforeSanction.issuedBy,
        issuerEmail: 'admin@test.com',
        issuerName: 'Test Admin',
        issuedByType: 'ADMIN',
        startAt: new Date(),
        endAt: null,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        appealStatus: null,
        appealedAt: null,
        appealReason: null,
        appealReviewedBy: null,
        appealReviewedAt: null,
        appealResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCache.get.mockResolvedValueOnce(beforeSanction);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue([afterSanctionRow]);

      // Act
      const result = await service.update(
        serviceId,
        sanctionId,
        { severity: SanctionSeverity.HIGH, updateReason: 'Escalation' },
        admin,
      );

      // Assert
      expect(result.severity).toBe('HIGH');
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          beforeState: beforeSanction,
        }),
      );
    });

    it('should throw BadRequestException for non-active sanction', async () => {
      // Arrange
      const revokedSanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.REVOKED,
      });

      mockCache.get.mockResolvedValue(revokedSanction);

      // Act & Assert
      await expect(
        service.update(
          serviceId,
          sanctionId,
          { severity: SanctionSeverity.HIGH, updateReason: 'Test' },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revoke', () => {
    const admin = createAdminPayload();

    it('should revoke an active sanction', async () => {
      // Arrange
      const activeSanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
      });

      const revokedSanctionRow = {
        id: sanctionId,
        subjectId: activeSanction.subjectId,
        subjectType: 'USER',
        subjectEmail: 'user@test.com',
        subjectName: 'Test User',
        serviceId,
        scope: 'SERVICE',
        type: 'WARNING',
        status: 'REVOKED',
        severity: 'MEDIUM',
        restrictedFeatures: [],
        reason: 'Original reason',
        internalNote: null,
        evidenceUrls: [],
        issuedBy: activeSanction.issuedBy,
        issuerEmail: 'admin@test.com',
        issuerName: 'Test Admin',
        issuedByType: 'ADMIN',
        startAt: new Date(),
        endAt: null,
        revokedAt: new Date(),
        revokedBy: admin.sub,
        revokeReason: 'User appealed successfully',
        appealStatus: null,
        appealedAt: null,
        appealReason: null,
        appealReviewedBy: null,
        appealReviewedAt: null,
        appealResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCache.get.mockResolvedValueOnce(activeSanction);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue([revokedSanctionRow]);

      // Act
      const result = await service.revoke(
        serviceId,
        sanctionId,
        { reason: 'User appealed successfully' },
        admin,
      );

      // Assert
      expect(result.status).toBe('REVOKED');
      expect(result.revokedBy).toBe(admin.sub);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'revoke',
        }),
      );
    });

    it('should throw BadRequestException for non-active sanction', async () => {
      // Arrange
      const revokedSanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.REVOKED,
      });

      mockCache.get.mockResolvedValue(revokedSanction);

      // Act & Assert
      await expect(
        service.revoke(serviceId, sanctionId, { reason: 'Test' }, admin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('extend', () => {
    const admin = createAdminPayload();

    it('should extend a temporary ban', async () => {
      // Arrange
      const currentEndAt = new Date();
      currentEndAt.setDate(currentEndAt.getDate() + 7);
      const newEndAt = new Date();
      newEndAt.setDate(newEndAt.getDate() + 14);

      const tempBan = createTemporaryBanSanction(currentEndAt, {
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
      });

      const extendedRow = {
        id: sanctionId,
        subjectId: tempBan.subjectId,
        subjectType: 'USER',
        subjectEmail: 'user@test.com',
        subjectName: 'Test User',
        serviceId,
        scope: 'SERVICE',
        type: 'TEMPORARY_BAN',
        status: 'ACTIVE',
        severity: 'MEDIUM',
        restrictedFeatures: [],
        reason: 'Test',
        internalNote: null,
        evidenceUrls: [],
        issuedBy: tempBan.issuedBy,
        issuerEmail: 'admin@test.com',
        issuerName: 'Test Admin',
        issuedByType: 'ADMIN',
        startAt: new Date(),
        endAt: newEndAt,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        appealStatus: null,
        appealedAt: null,
        appealReason: null,
        appealReviewedBy: null,
        appealReviewedAt: null,
        appealResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCache.get.mockResolvedValueOnce(tempBan);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue([extendedRow]);

      // Act
      const result = await service.extend(
        serviceId,
        sanctionId,
        { newEndAt: newEndAt.toISOString(), reason: 'Extended for review' },
        admin,
      );

      // Assert
      expect(result.endAt).toEqual(newEndAt);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'extend',
        }),
      );
    });

    it('should throw BadRequestException when new end date is not after current', async () => {
      // Arrange
      const currentEndAt = new Date();
      currentEndAt.setDate(currentEndAt.getDate() + 14);
      const newEndAt = new Date();
      newEndAt.setDate(newEndAt.getDate() + 7);

      const tempBan = createTemporaryBanSanction(currentEndAt, {
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
      });

      mockCache.get.mockResolvedValue(tempBan);

      // Act & Assert
      await expect(
        service.extend(
          serviceId,
          sanctionId,
          { newEndAt: newEndAt.toISOString(), reason: 'Test' },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reduce', () => {
    const admin = createAdminPayload();

    it('should reduce a temporary ban duration', async () => {
      // Arrange
      const currentEndAt = new Date();
      currentEndAt.setDate(currentEndAt.getDate() + 14);
      const newEndAt = new Date();
      newEndAt.setDate(newEndAt.getDate() + 7);

      const tempBan = createTemporaryBanSanction(currentEndAt, {
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
      });

      const reducedRow = {
        id: sanctionId,
        subjectId: tempBan.subjectId,
        subjectType: 'USER',
        subjectEmail: 'user@test.com',
        subjectName: 'Test User',
        serviceId,
        scope: 'SERVICE',
        type: 'TEMPORARY_BAN',
        status: 'ACTIVE',
        severity: 'MEDIUM',
        restrictedFeatures: [],
        reason: 'Test',
        internalNote: null,
        evidenceUrls: [],
        issuedBy: tempBan.issuedBy,
        issuerEmail: 'admin@test.com',
        issuerName: 'Test Admin',
        issuedByType: 'ADMIN',
        startAt: new Date(),
        endAt: newEndAt,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        appealStatus: null,
        appealedAt: null,
        appealReason: null,
        appealReviewedBy: null,
        appealReviewedAt: null,
        appealResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCache.get.mockResolvedValueOnce(tempBan);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue([reducedRow]);

      // Act
      const result = await service.reduce(
        serviceId,
        sanctionId,
        { newEndAt: newEndAt.toISOString(), reason: 'Good behavior' },
        admin,
      );

      // Assert
      expect(result.endAt).toEqual(newEndAt);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'reduce',
        }),
      );
    });

    it('should throw BadRequestException when new end date is not before current', async () => {
      // Arrange
      const currentEndAt = new Date();
      currentEndAt.setDate(currentEndAt.getDate() + 7);
      const newEndAt = new Date();
      newEndAt.setDate(newEndAt.getDate() + 14);

      const tempBan = createTemporaryBanSanction(currentEndAt, {
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
      });

      mockCache.get.mockResolvedValue(tempBan);

      // Act & Assert
      await expect(
        service.reduce(
          serviceId,
          sanctionId,
          { newEndAt: newEndAt.toISOString(), reason: 'Test' },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAppeal', () => {
    it('should return appeal information', async () => {
      // Arrange
      const sanction = createSanctionResponse({
        id: sanctionId,
        appealStatus: 'PENDING' as any,
        appealedAt: new Date(),
        appealReason: 'I disagree with the decision',
      });

      mockCache.get.mockResolvedValue(sanction);

      // Act
      const result = await service.getAppeal(serviceId, sanctionId);

      // Assert
      expect(result.sanctionId).toBe(sanctionId);
      expect(result.appealStatus).toBe('PENDING');
      expect(result.appealReason).toBe('I disagree with the decision');
    });
  });

  describe('reviewAppeal', () => {
    const admin = createAdminPayload();

    it('should approve appeal and revoke sanction', async () => {
      // Arrange
      const sanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
        appealStatus: 'PENDING' as any,
        appealReason: 'I disagree',
      });

      const approvedRow = {
        id: sanctionId,
        subjectId: sanction.subjectId,
        subjectType: 'USER',
        subjectEmail: 'user@test.com',
        subjectName: 'Test User',
        serviceId,
        scope: 'SERVICE',
        type: 'WARNING',
        status: 'REVOKED',
        severity: 'MEDIUM',
        restrictedFeatures: [],
        reason: 'Test',
        internalNote: null,
        evidenceUrls: [],
        issuedBy: sanction.issuedBy,
        issuerEmail: 'admin@test.com',
        issuerName: 'Test Admin',
        issuedByType: 'ADMIN',
        startAt: new Date(),
        endAt: null,
        revokedAt: new Date(),
        revokedBy: admin.sub,
        revokeReason: 'Appeal approved: Valid evidence provided',
        appealStatus: 'APPROVED',
        appealedAt: sanction.appealedAt,
        appealReason: sanction.appealReason,
        appealReviewedBy: admin.sub,
        appealReviewedAt: new Date(),
        appealResponse: 'Valid evidence provided',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCache.get.mockResolvedValueOnce(sanction);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue([approvedRow]);

      // Act
      const result = await service.reviewAppeal(
        serviceId,
        sanctionId,
        { status: 'APPROVED', response: 'Valid evidence provided' },
        admin,
      );

      // Assert
      expect(result.appealStatus).toBe('APPROVED');
      expect(result.status).toBe('REVOKED');
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'sanction_appeal',
          action: 'approved',
        }),
      );
    });

    it('should reject appeal without revoking sanction', async () => {
      // Arrange
      const sanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
        appealStatus: 'PENDING' as any,
        appealReason: 'I disagree',
      });

      const rejectedRow = {
        id: sanctionId,
        subjectId: sanction.subjectId,
        subjectType: 'USER',
        subjectEmail: 'user@test.com',
        subjectName: 'Test User',
        serviceId,
        scope: 'SERVICE',
        type: 'WARNING',
        status: 'ACTIVE',
        severity: 'MEDIUM',
        restrictedFeatures: [],
        reason: 'Test',
        internalNote: null,
        evidenceUrls: [],
        issuedBy: sanction.issuedBy,
        issuerEmail: 'admin@test.com',
        issuerName: 'Test Admin',
        issuedByType: 'ADMIN',
        startAt: new Date(),
        endAt: null,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        appealStatus: 'REJECTED',
        appealedAt: sanction.appealedAt,
        appealReason: sanction.appealReason,
        appealReviewedBy: admin.sub,
        appealReviewedAt: new Date(),
        appealResponse: 'Insufficient evidence',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCache.get.mockResolvedValueOnce(sanction);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue([rejectedRow]);

      // Act
      const result = await service.reviewAppeal(
        serviceId,
        sanctionId,
        { status: 'REJECTED', response: 'Insufficient evidence' },
        admin,
      );

      // Assert
      expect(result.appealStatus).toBe('REJECTED');
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw BadRequestException when no appeal exists', async () => {
      // Arrange
      const sanction = createSanctionResponse({
        id: sanctionId,
        appealStatus: null,
      });

      mockCache.get.mockResolvedValue(sanction);

      // Act & Assert
      await expect(
        service.reviewAppeal(
          serviceId,
          sanctionId,
          { status: 'APPROVED', response: 'Test' },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when appeal already reviewed', async () => {
      // Arrange
      const sanction = createSanctionResponse({
        id: sanctionId,
        appealStatus: 'APPROVED' as any,
      });

      mockCache.get.mockResolvedValue(sanction);

      // Act & Assert
      await expect(
        service.reviewAppeal(
          serviceId,
          sanctionId,
          { status: 'REJECTED', response: 'Test' },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for a sanction', async () => {
      // Arrange
      const sanction = createSanctionResponse({ id: sanctionId });
      const mockNotifications = [
        {
          id: generateTestId(),
          sanctionId,
          channel: 'EMAIL',
          status: 'SENT',
          sentAt: new Date(),
          readAt: null,
          createdAt: new Date(),
        },
        {
          id: generateTestId(),
          sanctionId,
          channel: 'IN_APP',
          status: 'PENDING',
          sentAt: null,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockCache.get.mockResolvedValue(sanction);
      mockPrisma.$queryRaw.mockResolvedValue(mockNotifications);

      // Act
      const result = await service.getNotifications(serviceId, sanctionId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].channel).toBe('EMAIL');
      expect(result[1].channel).toBe('IN_APP');
    });
  });

  describe('resendNotifications', () => {
    const admin = createAdminPayload();

    it('should create new notification entries', async () => {
      // Arrange
      const sanction = createSanctionResponse({ id: sanctionId });
      const mockNotifications = [
        {
          id: generateTestId(),
          sanctionId,
          channel: 'EMAIL',
          status: 'PENDING',
          sentAt: null,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockCache.get.mockResolvedValue(sanction);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue(mockNotifications);

      // Act
      const result = await service.resendNotifications(
        serviceId,
        sanctionId,
        { channels: [NotificationChannel.EMAIL] },
        admin,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'sanction_notification',
          action: 'resend',
        }),
      );
    });
  });
});
