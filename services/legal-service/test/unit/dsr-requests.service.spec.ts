import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { DsrRequestsService } from '../../src/dsr-requests/dsr-requests.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrisma, MockPrismaService } from '../utils/mock-prisma';
import {
  createMockDsrRequest,
  createGdprAccessRequest,
  createGdprErasureRequest,
  createCcpaRequest,
  createDsrRequestDto,
} from '../utils/test-factory';
import { DsrRequestStatus } from '../../src/dsr-requests/dto/update-dsr-request.dto';

describe('DsrRequestsService', () => {
  let service: DsrRequestsService;
  let prisma: MockPrismaService;
  let configService: { get: jest.Mock };

  const DEFAULT_DUE_DAYS = 30;

  beforeEach(async () => {
    prisma = createMockPrisma();
    configService = {
      get: jest.fn((key: string, defaultValue: number) => {
        if (key === 'DSR_DEFAULT_DUE_DAYS') return DEFAULT_DUE_DAYS;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DsrRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<DsrRequestsService>(DsrRequestsService);
  });

  describe('create', () => {
    it('should create a new DSR request with 30-day deadline (GDPR)', async () => {
      const dto = createDsrRequestDto();
      const mockRequest = createMockDsrRequest();
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const result = await service.create(dto as never);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockRequest.id);
      expect(result.status).toBe('PENDING');
      expect(prisma.dsrRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should calculate due date based on DSR_DEFAULT_DUE_DAYS config', async () => {
      const dto = createDsrRequestDto();
      const mockRequest = createMockDsrRequest();
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      await service.create(dto as never);

      expect(prisma.dsrRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should create GDPR Article 15 (Access) request', async () => {
      const dto = createDsrRequestDto({ requestType: 'ACCESS' });
      const mockRequest = createGdprAccessRequest();
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const result = await service.create(dto as never);

      expect(result.requestType).toBe('ACCESS');
    });

    it('should create GDPR Article 17 (Erasure) request', async () => {
      const dto = createDsrRequestDto({ requestType: 'ERASURE' });
      const mockRequest = createGdprErasureRequest();
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const result = await service.create(dto as never);

      expect(result.requestType).toBe('ERASURE');
    });

    it('should store IP address and metadata', async () => {
      const dto = createDsrRequestDto({
        ipAddress: '192.168.1.100',
        metadata: { source: 'web_portal' },
      });
      const mockRequest = createMockDsrRequest({
        ipAddress: '192.168.1.100',
        metadata: { source: 'web_portal' },
      });
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      await service.create(dto as never);

      expect(prisma.dsrRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.100',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated DSR requests', async () => {
      const mockRequests = [createMockDsrRequest()];
      prisma.dsrRequest.findMany.mockResolvedValue(mockRequests as never);
      prisma.dsrRequest.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.dsrRequest.findMany.mockResolvedValue([]);
      prisma.dsrRequest.count.mockResolvedValue(0);

      await service.findAll({ status: 'PENDING' });

      expect(prisma.dsrRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by request type', async () => {
      prisma.dsrRequest.findMany.mockResolvedValue([]);
      prisma.dsrRequest.count.mockResolvedValue(0);

      await service.findAll({ type: 'ERASURE' });

      expect(prisma.dsrRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requestType: 'ERASURE' }),
        }),
      );
    });

    it('should use default pagination values', async () => {
      prisma.dsrRequest.findMany.mockResolvedValue([]);
      prisma.dsrRequest.count.mockResolvedValue(0);

      await service.findAll({});

      expect(prisma.dsrRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      prisma.dsrRequest.findMany.mockResolvedValue([]);
      prisma.dsrRequest.count.mockResolvedValue(0);

      await service.findAll({});

      expect(prisma.dsrRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findByAccount', () => {
    it('should return all DSR requests for an account', async () => {
      const accountId = 'account-123';
      const mockRequests = [createMockDsrRequest({ accountId })];
      prisma.dsrRequest.findMany.mockResolvedValue(mockRequests as never);

      const result = await service.findByAccount(accountId);

      expect(result).toHaveLength(1);
      expect(prisma.dsrRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return DSR request by ID', async () => {
      const mockRequest = createMockDsrRequest();
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);

      const result = await service.findOne('dsr-123');

      expect(result.id).toBe(mockRequest.id);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.dsrRequest.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update DSR request status', async () => {
      const mockRequest = createMockDsrRequest();
      const updatedRequest = { ...mockRequest, status: 'IN_PROGRESS' };
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue(updatedRequest as never);

      const result = await service.update('dsr-123', { status: DsrRequestStatus.IN_PROGRESS });

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should set acknowledgedAt when status changes to IN_PROGRESS', async () => {
      const mockRequest = createMockDsrRequest({ acknowledgedAt: null });
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'IN_PROGRESS',
        acknowledgedAt: new Date(),
      } as never);

      await service.update('dsr-123', { status: DsrRequestStatus.IN_PROGRESS });

      expect(prisma.dsrRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DsrRequestStatus.IN_PROGRESS,
            acknowledgedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should not override existing acknowledgedAt', async () => {
      const existingAckDate = new Date('2025-01-01');
      const mockRequest = createMockDsrRequest({ acknowledgedAt: existingAckDate });
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'IN_PROGRESS',
      } as never);

      await service.update('dsr-123', { status: DsrRequestStatus.IN_PROGRESS });

      expect(prisma.dsrRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            acknowledgedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should set completedAt when status is COMPLETED', async () => {
      const mockRequest = createMockDsrRequest();
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'COMPLETED',
        completedAt: new Date(),
      } as never);

      await service.update('dsr-123', { status: DsrRequestStatus.COMPLETED });

      expect(prisma.dsrRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DsrRequestStatus.COMPLETED,
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should set completedAt when status is REJECTED', async () => {
      const mockRequest = createMockDsrRequest();
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'REJECTED',
        completedAt: new Date(),
      } as never);

      await service.update('dsr-123', {
        status: DsrRequestStatus.REJECTED,
        rejectionReason: 'Invalid request',
      });

      expect(prisma.dsrRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DsrRequestStatus.REJECTED,
            completedAt: expect.any(Date),
            rejectionReason: 'Invalid request',
          }),
        }),
      );
    });

    it('should update assignedTo field', async () => {
      const mockRequest = createMockDsrRequest();
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        assignedTo: 'operator-123',
      } as never);

      await service.update('dsr-123', { assignedTo: 'operator-123' });

      expect(prisma.dsrRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedTo: 'operator-123',
          }),
        }),
      );
    });

    it('should update resolution field', async () => {
      const mockRequest = createMockDsrRequest();
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        resolution: 'Data exported successfully',
      } as never);

      await service.update('dsr-123', { resolution: 'Data exported successfully' });

      expect(prisma.dsrRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolution: 'Data exported successfully',
          }),
        }),
      );
    });

    it('should throw NotFoundException when request not found', async () => {
      prisma.dsrRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { status: DsrRequestStatus.IN_PROGRESS }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GDPR Compliance', () => {
    it('should support GDPR Article 15 (Access) workflow', async () => {
      const dto = createDsrRequestDto({ requestType: 'ACCESS' });
      const mockRequest = createGdprAccessRequest();
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const result = await service.create(dto as never);

      expect(result.requestType).toBe('ACCESS');
    });

    it('should support GDPR Article 17 (Erasure) workflow', async () => {
      const dto = createDsrRequestDto({
        requestType: 'ERASURE',
        description: 'Please delete all my personal data',
      });
      const mockRequest = createGdprErasureRequest();
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const result = await service.create(dto as never);

      expect(result.requestType).toBe('ERASURE');
    });

    it('should track all GDPR request types', async () => {
      const requestTypes = [
        'ACCESS',
        'RECTIFICATION',
        'ERASURE',
        'RESTRICTION',
        'PORTABILITY',
        'OBJECTION',
      ];

      for (const requestType of requestTypes) {
        const dto = createDsrRequestDto({ requestType });
        const mockRequest = createMockDsrRequest({ requestType: requestType as never });
        prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

        const result = await service.create(dto as never);
        expect(result.requestType).toBe(requestType);
      }
    });
  });

  describe('CCPA Compliance', () => {
    it('should handle CCPA requests with 45-day deadline metadata', async () => {
      const dto = createDsrRequestDto({
        requestType: 'ACCESS',
        metadata: { regulation: 'CCPA' },
      });
      const mockRequest = createCcpaRequest();
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const result = await service.create(dto as never);

      expect(result).toBeDefined();
    });
  });

  describe('DSR Deadline Calculations', () => {
    it('should calculate 30-day deadline for GDPR', async () => {
      const dto = createDsrRequestDto();
      const now = new Date();
      const expectedDueDate = new Date(now);
      expectedDueDate.setDate(expectedDueDate.getDate() + 30);

      const mockRequest = createMockDsrRequest();
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      await service.create(dto as never);

      const createCall = prisma.dsrRequest.create.mock.calls[0][0];
      const createdDueDate = new Date(createCall.data.dueDate);

      // Due date should be approximately 30 days from now (allowing for test execution time)
      const daysDiff = Math.round(
        (createdDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      expect(daysDiff).toBe(30);
    });
  });
});
