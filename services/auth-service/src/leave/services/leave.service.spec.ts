import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '../../database/prisma.service';
import { LeaveStatus, LeaveType } from '@my-girok/types';

describe('LeaveService', () => {
  let service: LeaveService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    adminLeave: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    adminLeaveBalance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    _prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new leave request', async () => {
      const adminId = 'admin-123';
      const dto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        daysCount: 3,
        reason: 'Personal travel',
      };

      mockPrismaService.adminLeave.findFirst.mockResolvedValue(null);
      mockPrismaService.adminLeave.create.mockResolvedValue({
        id: 'leave-1',
        adminId: adminId,
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        daysCount: '3',
        status: LeaveStatus.DRAFT,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(adminId, dto);

      expect(result.id).toBe('leave-1');
      expect(result.status).toBe(LeaveStatus.DRAFT);
      expect(result.leaveType).toBe(LeaveType.ANNUAL);
    });

    it('should throw BadRequestException if overlapping leave exists', async () => {
      const adminId = 'admin-123';
      const dto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        daysCount: 3,
      };

      mockPrismaService.adminLeave.findFirst.mockResolvedValue({
        id: 'existing-leave',
        adminId: adminId,
        status: LeaveStatus.APPROVED,
        startDate: new Date('2026-02-02'),
        endDate: new Date('2026-02-04'),
      });

      await expect(service.create(adminId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit', () => {
    it('should submit a leave request for approval', async () => {
      const leaveId = 'leave-1';
      const adminId = 'admin-123';
      const dto = {
        firstApproverId: 'manager-123',
      };

      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: leaveId,
        adminId: adminId,
        status: LeaveStatus.DRAFT,
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        adminId: adminId,
        status: LeaveStatus.PENDING,
        submittedAt: new Date(),
        firstApproverId: dto.firstApproverId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.submit(leaveId, adminId, dto);

      expect(result.status).toBe(LeaveStatus.PENDING);
      expect(result.firstApproverId).toBe('manager-123');
    });

    it('should throw NotFoundException if leave not found', async () => {
      mockPrismaService.adminLeave.findUnique.mockResolvedValue(null);

      await expect(service.submit('invalid-id', 'admin-123', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: 'leave-1',
        adminId: 'another-admin',
        status: LeaveStatus.DRAFT,
      });

      await expect(service.submit('leave-1', 'admin-123', {})).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already submitted', async () => {
      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: 'leave-1',
        adminId: 'admin-123',
        status: LeaveStatus.PENDING,
      });

      await expect(service.submit('leave-1', 'admin-123', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve leave by first approver', async () => {
      const leaveId = 'leave-1';
      const approverId = 'manager-123';
      const dto = {
        approvalStatus: 'APPROVED' as const,
      };

      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: leaveId,
        adminId: 'admin-123',
        status: LeaveStatus.PENDING,
        firstApproverId: approverId,
        firstApprovedAt: null,
        secondApproverId: null,
        leaveType: LeaveType.ANNUAL,
        daysCount: '3',
        startDate: new Date('2026-02-01'),
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        adminId: 'admin-123',
        status: LeaveStatus.APPROVED,
        firstApproverId: approverId,
        firstApprovedAt: new Date(),
        firstApprovalStatus: 'APPROVED',
        finalApprovedBy: approverId,
        finalApprovedAt: new Date(),
        leaveType: LeaveType.ANNUAL,
        daysCount: '3',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        adminId: 'admin-123',
        year: 2026,
        annualEntitled: '15',
        annualUsed: '0',
        annualRemaining: '15',
        sickEntitled: '10',
        sickUsed: '0',
        sickRemaining: '10',
      });

      mockPrismaService.adminLeaveBalance.update.mockResolvedValue({});

      const result = await service.approve(leaveId, approverId, dto);

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(result.finalApprovedBy).toBe(approverId);
    });

    it('should reject leave if approver rejects', async () => {
      const leaveId = 'leave-1';
      const approverId = 'manager-123';
      const dto = {
        approvalStatus: 'REJECTED' as const,
        rejectionReason: 'Not enough coverage',
      };

      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: leaveId,
        status: LeaveStatus.PENDING,
        firstApproverId: approverId,
        firstApprovedAt: null,
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        status: LeaveStatus.REJECTED,
        rejectedBy: approverId,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.approve(leaveId, approverId, dto);

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(result.rejectionReason).toBe('Not enough coverage');
    });

    it('should throw ForbiddenException if not authorized approver', async () => {
      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: 'leave-1',
        status: LeaveStatus.PENDING,
        firstApproverId: 'manager-123',
        firstApprovedAt: null,
      });

      await expect(
        service.approve('leave-1', 'random-user', { approvalStatus: 'APPROVED' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('should cancel a leave request', async () => {
      const leaveId = 'leave-1';
      const adminId = 'admin-123';
      const dto = {
        cancellationReason: 'Plans changed',
      };

      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: leaveId,
        adminId: adminId,
        status: LeaveStatus.PENDING,
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        adminId: adminId,
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.cancellationReason,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.cancel(leaveId, adminId, dto);

      expect(result.status).toBe(LeaveStatus.CANCELLED);
      expect(result.cancellationReason).toBe('Plans changed');
    });

    it('should restore balance if approved leave is cancelled', async () => {
      const leaveId = 'leave-1';
      const adminId = 'admin-123';

      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: leaveId,
        adminId: adminId,
        status: LeaveStatus.APPROVED,
        leaveType: LeaveType.ANNUAL,
        daysCount: '3',
        startDate: new Date('2026-02-01'),
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        status: LeaveStatus.CANCELLED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        adminId: adminId,
        year: 2026,
        annualUsed: '3',
        annualRemaining: '12',
      });

      mockPrismaService.adminLeaveBalance.update.mockResolvedValue({});

      await service.cancel(leaveId, adminId, { cancellationReason: 'Test' });

      expect(mockPrismaService.adminLeaveBalance.update).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list leaves with pagination', async () => {
      const query = {
        adminId: 'admin-123',
        page: 1,
        limit: 20,
      };

      mockPrismaService.$transaction.mockResolvedValue([
        [
          {
            id: 'leave-1',
            adminId: 'admin-123',
            leaveType: LeaveType.ANNUAL,
            daysCount: '3',
            status: LeaveStatus.APPROVED,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        1,
      ]);

      const result = await service.list(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getPendingApprovals', () => {
    it('should get pending approvals for an approver', async () => {
      const approverId = 'manager-123';

      mockPrismaService.adminLeave.findMany.mockResolvedValue([
        {
          id: 'leave-1',
          adminId: 'admin-123',
          status: LeaveStatus.PENDING,
          firstApproverId: approverId,
          daysCount: '3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getPendingApprovals(approverId);

      expect(result).toHaveLength(1);
      expect(result[0].firstApproverId).toBe(approverId);
    });
  });
});
