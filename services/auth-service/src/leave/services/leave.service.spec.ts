import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '../../database/prisma.service';
import { LeaveStatus, LeaveType } from '../dto/leave.dto';

describe('LeaveService', () => {
  let service: LeaveService;
  let prisma: PrismaService;

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
    prisma = module.get<PrismaService>(PrismaService);
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
        admin_id: adminId,
        leave_type: dto.leaveType,
        start_date: dto.startDate,
        end_date: dto.endDate,
        days_count: '3',
        status: LeaveStatus.DRAFT,
        requested_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
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
        admin_id: adminId,
        status: LeaveStatus.APPROVED,
        start_date: new Date('2026-02-02'),
        end_date: new Date('2026-02-04'),
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
        admin_id: adminId,
        status: LeaveStatus.DRAFT,
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        admin_id: adminId,
        status: LeaveStatus.PENDING,
        submitted_at: new Date(),
        first_approver_id: dto.firstApproverId,
        created_at: new Date(),
        updated_at: new Date(),
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
        admin_id: 'another-admin',
        status: LeaveStatus.DRAFT,
      });

      await expect(service.submit('leave-1', 'admin-123', {})).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already submitted', async () => {
      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: 'leave-1',
        admin_id: 'admin-123',
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
        admin_id: 'admin-123',
        status: LeaveStatus.PENDING,
        first_approver_id: approverId,
        first_approved_at: null,
        second_approver_id: null,
        leave_type: LeaveType.ANNUAL,
        days_count: '3',
        start_date: new Date('2026-02-01'),
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        admin_id: 'admin-123',
        status: LeaveStatus.APPROVED,
        first_approver_id: approverId,
        first_approved_at: new Date(),
        first_approval_status: 'APPROVED',
        final_approved_by: approverId,
        final_approved_at: new Date(),
        leave_type: LeaveType.ANNUAL,
        days_count: '3',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        admin_id: 'admin-123',
        year: 2026,
        annual_entitled: '15',
        annual_used: '0',
        annual_remaining: '15',
        sick_entitled: '10',
        sick_used: '0',
        sick_remaining: '10',
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
        first_approver_id: approverId,
        first_approved_at: null,
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        status: LeaveStatus.REJECTED,
        rejected_by: approverId,
        rejected_at: new Date(),
        rejection_reason: dto.rejectionReason,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.approve(leaveId, approverId, dto);

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(result.rejectionReason).toBe('Not enough coverage');
    });

    it('should throw ForbiddenException if not authorized approver', async () => {
      mockPrismaService.adminLeave.findUnique.mockResolvedValue({
        id: 'leave-1',
        status: LeaveStatus.PENDING,
        first_approver_id: 'manager-123',
        first_approved_at: null,
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
        admin_id: adminId,
        status: LeaveStatus.PENDING,
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        admin_id: adminId,
        status: LeaveStatus.CANCELLED,
        cancelled_at: new Date(),
        cancellation_reason: dto.cancellationReason,
        created_at: new Date(),
        updated_at: new Date(),
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
        admin_id: adminId,
        status: LeaveStatus.APPROVED,
        leave_type: LeaveType.ANNUAL,
        days_count: '3',
        start_date: new Date('2026-02-01'),
      });

      mockPrismaService.adminLeave.update.mockResolvedValue({
        id: leaveId,
        status: LeaveStatus.CANCELLED,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        admin_id: adminId,
        year: 2026,
        annual_used: '3',
        annual_remaining: '12',
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
            admin_id: 'admin-123',
            leave_type: LeaveType.ANNUAL,
            days_count: '3',
            status: LeaveStatus.APPROVED,
            created_at: new Date(),
            updated_at: new Date(),
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
          admin_id: 'admin-123',
          status: LeaveStatus.PENDING,
          first_approver_id: approverId,
          days_count: '3',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.getPendingApprovals(approverId);

      expect(result).toHaveLength(1);
      expect(result[0].firstApproverId).toBe(approverId);
    });
  });
});
