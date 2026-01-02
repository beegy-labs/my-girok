import { Test, TestingModule } from '@nestjs/testing';

import { SanctionController } from '../../src/admin/controllers/sanction.controller';
import { SanctionService } from '../../src/admin/services/sanction.service';
import {
  createSanctionResponse,
  createAdminPayload,
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

// Mock service type with jest.fn() methods
type MockSanctionService = {
  [K in keyof SanctionService]?: jest.Mock;
};

describe('SanctionController', () => {
  let controller: SanctionController;
  let mockSanctionService: MockSanctionService;

  const adminPayload = createAdminPayload({ permissions: ['sanction:*'] });
  const serviceId = generateTestId();

  beforeEach(async () => {
    resetTestCounter();

    mockSanctionService = {
      list: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      revoke: jest.fn(),
      extend: jest.fn(),
      reduce: jest.fn(),
      getAppeal: jest.fn(),
      reviewAppeal: jest.fn(),
      getNotifications: jest.fn(),
      resendNotifications: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SanctionController],
      providers: [{ provide: SanctionService, useValue: mockSanctionService }],
    }).compile();

    controller = module.get<SanctionController>(SanctionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return list of sanctions', async () => {
      // Arrange
      const sanctions = [
        createSanctionResponse({ status: SanctionStatus.ACTIVE }),
        createSanctionResponse({ status: SanctionStatus.REVOKED }),
      ];

      mockSanctionService.list!.mockResolvedValue({
        data: sanctions,
        meta: { total: 2, page: 1, limit: 20, serviceId },
      });

      // Act
      const result = await controller.list(serviceId, {});

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should pass query parameters to service', async () => {
      // Arrange
      mockSanctionService.list!.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, serviceId },
      });

      // Act
      await controller.list(serviceId, {
        status: SanctionStatus.ACTIVE,
        type: SanctionType.WARNING,
      });

      // Assert
      expect(mockSanctionService.list).toHaveBeenCalledWith(
        serviceId,
        expect.objectContaining({
          status: 'ACTIVE',
          type: 'WARNING',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return sanction by ID', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const sanction = createSanctionResponse({ id: sanctionId });

      mockSanctionService.findOne!.mockResolvedValue(sanction);

      // Act
      const result = await controller.findOne(serviceId, sanctionId);

      // Assert
      expect(result.id).toBe(sanctionId);
    });

    it('should pass includeNotifications option', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const sanction = createSanctionResponse({ id: sanctionId });

      mockSanctionService.findOne!.mockResolvedValue(sanction);

      // Act
      await controller.findOne(serviceId, sanctionId, true);

      // Assert
      expect(mockSanctionService.findOne).toHaveBeenCalledWith(serviceId, sanctionId, {
        includeNotifications: true,
      });
    });
  });

  describe('create', () => {
    it('should create a warning sanction', async () => {
      // Arrange
      const subjectId = generateTestId();
      const sanction = createSanctionResponse({
        type: SanctionType.WARNING,
        subjectId,
      });

      mockSanctionService.create!.mockResolvedValue(sanction);

      // Act
      const result = await controller.create(
        serviceId,
        {
          subjectId,
          subjectType: SanctionSubjectType.USER,
          type: SanctionType.WARNING,
          reason: 'Terms of service violation',
          startAt: new Date().toISOString(),
        },
        adminPayload,
      );

      // Assert
      expect(result.type).toBe('WARNING');
      expect(mockSanctionService.create).toHaveBeenCalledWith(
        serviceId,
        expect.objectContaining({
          type: 'WARNING',
          reason: 'Terms of service violation',
        }),
        adminPayload,
      );
    });

    it('should create a temporary ban with end date', async () => {
      // Arrange
      const subjectId = generateTestId();
      const endAt = new Date();
      endAt.setDate(endAt.getDate() + 7);

      const sanction = createSanctionResponse({
        type: SanctionType.TEMPORARY_BAN,
        subjectId,
        endAt,
      });

      mockSanctionService.create!.mockResolvedValue(sanction);

      // Act
      const result = await controller.create(
        serviceId,
        {
          subjectId,
          subjectType: SanctionSubjectType.USER,
          type: SanctionType.TEMPORARY_BAN,
          reason: 'Spam activity',
          startAt: new Date().toISOString(),
          endAt: endAt.toISOString(),
        },
        adminPayload,
      );

      // Assert
      expect(result.type).toBe('TEMPORARY_BAN');
    });
  });

  describe('update', () => {
    it('should update sanction', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const updatedSanction = createSanctionResponse({
        id: sanctionId,
        severity: SanctionSeverity.HIGH,
      });

      mockSanctionService.update!.mockResolvedValue(updatedSanction);

      // Act
      const result = await controller.update(
        serviceId,
        sanctionId,
        {
          severity: SanctionSeverity.HIGH,
          updateReason: 'Escalation required',
        },
        adminPayload,
      );

      // Assert
      expect(result.severity).toBe('HIGH');
    });
  });

  describe('revoke', () => {
    it('should revoke sanction', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const revokedSanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.REVOKED,
      });

      mockSanctionService.revoke!.mockResolvedValue(revokedSanction);

      // Act
      const result = await controller.revoke(
        serviceId,
        sanctionId,
        { reason: 'User appealed successfully' },
        adminPayload,
      );

      // Assert
      expect(result.status).toBe('REVOKED');
    });
  });

  describe('extend', () => {
    it('should extend sanction duration', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const newEndAt = new Date();
      newEndAt.setDate(newEndAt.getDate() + 14);

      const extendedSanction = createSanctionResponse({
        id: sanctionId,
        endAt: newEndAt,
      });

      mockSanctionService.extend!.mockResolvedValue(extendedSanction);

      // Act
      const result = await controller.extend(
        serviceId,
        sanctionId,
        {
          newEndAt: newEndAt.toISOString(),
          reason: 'Extended for review',
        },
        adminPayload,
      );

      // Assert
      expect(result.endAt).toEqual(newEndAt);
    });
  });

  describe('reduce', () => {
    it('should reduce sanction duration', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const newEndAt = new Date();
      newEndAt.setDate(newEndAt.getDate() + 3);

      const reducedSanction = createSanctionResponse({
        id: sanctionId,
        endAt: newEndAt,
      });

      mockSanctionService.reduce!.mockResolvedValue(reducedSanction);

      // Act
      const result = await controller.reduce(
        serviceId,
        sanctionId,
        {
          newEndAt: newEndAt.toISOString(),
          reason: 'Good behavior',
        },
        adminPayload,
      );

      // Assert
      expect(result.endAt).toEqual(newEndAt);
    });
  });

  describe('getAppeal', () => {
    it('should return appeal information', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const appeal = {
        id: sanctionId,
        sanctionId,
        appealStatus: 'PENDING' as any,
        appealedAt: new Date(),
        appealReason: 'I disagree with the decision',
        appealReviewedBy: null,
        appealReviewedAt: null,
        appealResponse: null,
      };

      mockSanctionService.getAppeal!.mockResolvedValue(appeal);

      // Act
      const result = await controller.getAppeal(serviceId, sanctionId);

      // Assert
      expect(result.appealStatus).toBe('PENDING');
    });
  });

  describe('reviewAppeal', () => {
    it('should approve appeal', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const approvedSanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.REVOKED,
        appealStatus: 'APPROVED' as any,
      });

      mockSanctionService.reviewAppeal!.mockResolvedValue(approvedSanction);

      // Act
      const result = await controller.reviewAppeal(
        serviceId,
        sanctionId,
        {
          status: 'APPROVED',
          response: 'Valid evidence provided',
        },
        adminPayload,
      );

      // Assert
      expect(result.appealStatus).toBe('APPROVED');
      expect(result.status).toBe('REVOKED');
    });

    it('should reject appeal', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const rejectedSanction = createSanctionResponse({
        id: sanctionId,
        status: SanctionStatus.ACTIVE,
        appealStatus: 'REJECTED' as any,
      });

      mockSanctionService.reviewAppeal!.mockResolvedValue(rejectedSanction);

      // Act
      const result = await controller.reviewAppeal(
        serviceId,
        sanctionId,
        {
          status: 'REJECTED',
          response: 'Insufficient evidence',
        },
        adminPayload,
      );

      // Assert
      expect(result.appealStatus).toBe('REJECTED');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for sanction', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const notifications = [
        {
          id: generateTestId(),
          sanctionId,
          channel: NotificationChannel.EMAIL,
          status: 'SENT',
          sentAt: new Date(),
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockSanctionService.getNotifications!.mockResolvedValue(notifications);

      // Act
      const result = await controller.getNotifications(serviceId, sanctionId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].channel).toBe('EMAIL');
    });
  });

  describe('resendNotifications', () => {
    it('should resend notifications', async () => {
      // Arrange
      const sanctionId = generateTestId();
      const notifications = [
        {
          id: generateTestId(),
          sanctionId,
          channel: NotificationChannel.EMAIL,
          status: 'PENDING',
          sentAt: null,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockSanctionService.resendNotifications!.mockResolvedValue(notifications);

      // Act
      const result = await controller.resendNotifications(
        serviceId,
        sanctionId,
        { channels: [NotificationChannel.EMAIL] },
        adminPayload,
      );

      // Assert
      expect(result).toHaveLength(1);
    });
  });
});
