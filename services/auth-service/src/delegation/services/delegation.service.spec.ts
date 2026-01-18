import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DelegationService } from './delegation.service';
import { PrismaService } from '../../database/prisma.service';
import {
  delegation_status,
  delegation_type,
  delegation_scope,
  delegation_reason,
} from '../../../node_modules/.prisma/auth-client';

describe('DelegationService', () => {
  let service: DelegationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    admins: {
      findUnique: vi.fn(),
    },
    adminDelegation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    adminDelegationLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      return Promise.all(callback);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DelegationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DelegationService>(DelegationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      delegatorId: 'delegator-123',
      delegateId: 'delegate-456',
      delegationType: delegation_type.PARTIAL,
      delegationScope: delegation_scope.TEAM,
      delegationReason: delegation_reason.VACATION,
      specificPermissions: ['read:employees', 'write:attendance'],
      specificRoleIds: [],
      resourceIds: [],
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-15'),
      requiresApproval: true,
    };

    it('should create a new delegation', async () => {
      mockPrismaService.admins.findUnique
        .mockResolvedValueOnce({ id: 'delegator-123' })
        .mockResolvedValueOnce({ id: 'delegate-456' });

      mockPrismaService.adminDelegation.findFirst.mockResolvedValue(null);

      mockPrismaService.adminDelegation.create.mockResolvedValue({
        id: 'delegation-1',
        ...createDto,
        status: delegation_status.PENDING,
        allowedHours: [],
        allowedIps: [],
        notifyOnUse: true,
        notifyOnExpiry: true,
        expiryReminderDays: [7, 1],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.id).toBe('delegation-1');
      expect(result.status).toBe(delegation_status.PENDING);
      expect(mockPrismaService.adminDelegation.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if delegator not found', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if delegating to self', async () => {
      const invalidDto = {
        ...createDto,
        delegatorId: 'same-id',
        delegateId: 'same-id',
      };

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'same-id' });

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if end date before start date', async () => {
      const invalidDto = {
        ...createDto,
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-01'),
      };

      mockPrismaService.admins.findUnique
        .mockResolvedValueOnce({ id: 'delegator-123' })
        .mockResolvedValueOnce({ id: 'delegate-456' });

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if overlapping delegation exists', async () => {
      mockPrismaService.admins.findUnique
        .mockResolvedValueOnce({ id: 'delegator-123' })
        .mockResolvedValueOnce({ id: 'delegate-456' });

      mockPrismaService.adminDelegation.findFirst.mockResolvedValue({
        id: 'existing-delegation',
        status: delegation_status.ACTIVE,
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return a delegation by ID', async () => {
      const delegation = {
        id: 'delegation-1',
        delegatorId: 'delegator-123',
        delegateId: 'delegate-456',
        delegationType: delegation_type.PARTIAL,
        delegationScope: delegation_scope.TEAM,
        delegationReason: delegation_reason.VACATION,
        specificPermissions: ['read:employees'],
        specificRoleIds: [],
        resourceIds: [],
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-15'),
        status: delegation_status.ACTIVE,
        requiresApproval: true,
        allowedHours: [],
        allowedIps: [],
        notifyOnUse: true,
        notifyOnExpiry: true,
        expiryReminderDays: [7, 1],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.adminDelegation.findUnique.mockResolvedValue(delegation);

      const result = await service.findById('delegation-1');

      expect(result.id).toBe('delegation-1');
      expect(result.status).toBe(delegation_status.ACTIVE);
    });

    it('should throw NotFoundException if delegation not found', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a pending delegation', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
        status: delegation_status.PENDING,
        requiresApproval: true,
      });

      mockPrismaService.adminDelegation.update.mockResolvedValue({
        id: 'delegation-1',
        status: delegation_status.ACTIVE,
        approvedBy: 'approver-123',
        approvedAt: new Date(),
      });

      const result = await service.approve('delegation-1', 'approver-123', {
        approved: true,
      });

      expect(result.status).toBe(delegation_status.ACTIVE);
      expect(result.approvedBy).toBe('approver-123');
    });

    it('should reject a pending delegation', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
        status: delegation_status.PENDING,
        requiresApproval: true,
      });

      mockPrismaService.adminDelegation.update.mockResolvedValue({
        id: 'delegation-1',
        status: delegation_status.REVOKED,
        approvedBy: 'approver-123',
        approvedAt: new Date(),
        rejectionReason: 'Not authorized',
      });

      const result = await service.approve('delegation-1', 'approver-123', {
        approved: false,
        rejectionReason: 'Not authorized',
      });

      expect(result.status).toBe(delegation_status.REVOKED);
      expect(result.rejectionReason).toBe('Not authorized');
    });

    it('should throw BadRequestException if not pending', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
        status: delegation_status.ACTIVE,
      });

      await expect(
        service.approve('delegation-1', 'approver-123', { approved: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revoke', () => {
    it('should revoke an active delegation', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
        status: delegation_status.ACTIVE,
      });

      mockPrismaService.adminDelegation.update.mockResolvedValue({
        id: 'delegation-1',
        status: delegation_status.REVOKED,
        revokedBy: 'revoker-123',
        revokedAt: new Date(),
        revocationReason: 'No longer needed',
      });

      const result = await service.revoke('delegation-1', 'revoker-123', {
        revocationReason: 'No longer needed',
      });

      expect(result.status).toBe(delegation_status.REVOKED);
      expect(result.revocationReason).toBe('No longer needed');
    });

    it('should throw BadRequestException if already revoked', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
        status: delegation_status.REVOKED,
      });

      await expect(
        service.revoke('delegation-1', 'revoker-123', {
          revocationReason: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a delegation if not active', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
        delegatorId: 'delegator-123',
        status: delegation_status.PENDING,
      });

      mockPrismaService.adminDelegation.delete.mockResolvedValue({});

      await service.delete('delegation-1', 'delegator-123');

      expect(mockPrismaService.adminDelegation.delete).toHaveBeenCalledWith({
        where: { id: 'delegation-1' },
      });
    });

    it('should throw ForbiddenException if not delegator', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
        delegatorId: 'delegator-123',
        status: delegation_status.PENDING,
      });

      await expect(service.delete('delegation-1', 'other-admin')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if delegation is active', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
        delegatorId: 'delegator-123',
        status: delegation_status.ACTIVE,
      });

      await expect(service.delete('delegation-1', 'delegator-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLogs', () => {
    it('should return delegation logs', async () => {
      mockPrismaService.adminDelegation.findUnique.mockResolvedValue({
        id: 'delegation-1',
      });

      const logs = [
        {
          id: 'log-1',
          delegationId: 'delegation-1',
          delegateId: 'delegate-456',
          action: 'approved_leave_request',
          resourceType: 'leave',
          resourceId: 'leave-123',
          success: true,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.$transaction.mockResolvedValue([logs, 1]);

      const result = await service.getLogs('delegation-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].action).toBe('approved_leave_request');
    });
  });

  describe('updateExpiredDelegations', () => {
    it('should update expired delegations', async () => {
      mockPrismaService.adminDelegation.updateMany.mockResolvedValue({
        count: 3,
      });

      const count = await service.updateExpiredDelegations();

      expect(count).toBe(3);
      expect(mockPrismaService.adminDelegation.updateMany).toHaveBeenCalledWith({
        where: {
          status: delegation_status.ACTIVE,
          endDate: { lt: expect.any(Date) },
        },
        data: {
          status: delegation_status.EXPIRED,
        },
      });
    });
  });
});
