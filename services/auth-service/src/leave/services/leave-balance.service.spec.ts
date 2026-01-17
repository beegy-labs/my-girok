import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeaveBalanceService } from './leave-balance.service';
import { PrismaService } from '../../database/prisma.service';

describe('LeaveBalanceService', () => {
  let service: LeaveBalanceService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    adminLeaveBalance: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    adminLeave: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveBalanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LeaveBalanceService>(LeaveBalanceService);
    _prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new leave balance', async () => {
      const dto = {
        adminId: 'admin-123',
        year: 2026,
        annualEntitled: 15,
        sickEntitled: 10,
      };

      mockPrismaService.adminLeaveBalance.create.mockResolvedValue({
        id: 'balance-1',
        admin_id: dto.adminId,
        year: dto.year,
        annual_entitled: '15',
        annual_used: '0',
        annual_pending: '0',
        annual_remaining: '15',
        sick_entitled: '10',
        sick_used: '0',
        sick_remaining: '10',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.create(dto);

      expect(result.adminId).toBe(dto.adminId);
      expect(result.year).toBe(dto.year);
      expect(result.annualEntitled).toBe(15);
    });
  });

  describe('getBalance', () => {
    it('should return leave balance for admin and year', async () => {
      const adminId = 'admin-123';
      const year = 2026;

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        admin_id: adminId,
        year,
        annual_entitled: '15',
        annual_used: '3',
        annual_remaining: '12',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.getBalance(adminId, year);

      expect(result.adminId).toBe(adminId);
      expect(result.year).toBe(year);
      expect(result.annualUsed).toBe(3);
    });

    it('should throw NotFoundException if balance not found', async () => {
      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue(null);

      await expect(service.getBalance('admin-123', 2026)).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjust', () => {
    it('should adjust annual leave balance', async () => {
      const adminId = 'admin-123';
      const year = 2026;
      const adjustedBy = 'hr-admin';
      const dto = {
        adjustment: 2,
        adjustmentReason: 'Tenure bonus',
      };

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        admin_id: adminId,
        year,
        annual_entitled: '15',
        annual_remaining: '12',
      });

      mockPrismaService.adminLeaveBalance.update.mockResolvedValue({
        id: 'balance-1',
        admin_id: adminId,
        year,
        annual_entitled: '17',
        annual_remaining: '14',
        adjustment: '2',
        adjustment_reason: dto.adjustmentReason,
        adjusted_by: adjustedBy,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.adjust(adminId, year, adjustedBy, dto);

      expect(result.annualEntitled).toBe(17);
      expect(result.annualRemaining).toBe(14);
      expect(result.adjustmentReason).toBe('Tenure bonus');
    });
  });

  describe('recalculate', () => {
    it('should recalculate leave balance based on approved leaves', async () => {
      const adminId = 'admin-123';
      const year = 2026;

      mockPrismaService.adminLeave.findMany.mockResolvedValue([
        {
          leave_type: 'ANNUAL',
          days_count: '2',
          status: 'APPROVED',
        },
        {
          leave_type: 'ANNUAL',
          days_count: '1',
          status: 'APPROVED',
        },
        {
          leave_type: 'SICK',
          days_count: '1',
          status: 'APPROVED',
        },
      ]);

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        admin_id: adminId,
        year,
        annual_entitled: '15',
        annual_used: '0',
        annual_pending: '0',
        annual_remaining: '15',
        sick_entitled: '10',
        sick_used: '0',
        sick_remaining: '10',
        compensatory_entitled: '0',
        compensatory_used: '0',
        compensatory_remaining: '0',
        special_entitled: '0',
        special_used: '0',
        special_remaining: '0',
        carryover_from_previous: '0',
        adjustment: '0',
      });

      mockPrismaService.adminLeaveBalance.update.mockResolvedValue({
        id: 'balance-1',
        admin_id: adminId,
        year,
        annual_entitled: '15',
        annual_used: '3',
        annual_remaining: '12',
        sick_entitled: '10',
        sick_used: '1',
        sick_remaining: '9',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.recalculate(adminId, year);

      expect(result.annualUsed).toBe(3);
      expect(result.sickUsed).toBe(1);
    });
  });

  describe('initializeForNewYear', () => {
    it('should initialize balance for new year with tenure bonus', async () => {
      const adminId = 'admin-123';
      const year = 2026;
      const tenureYears = 5;

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-2025',
        admin_id: adminId,
        year: 2025,
        annual_remaining: '3',
      });

      mockPrismaService.adminLeaveBalance.create.mockResolvedValue({
        id: 'balance-2026',
        admin_id: adminId,
        year,
        annual_entitled: '17', // 15 base + 2 for 5 years
        carryover_from_previous: '3',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.initializeForNewYear(adminId, year, tenureYears);

      expect(result.year).toBe(year);
      expect(result.annualEntitled).toBe(17);
      expect(result.carryoverFromPrevious).toBe(3);
    });

    it('should initialize with base annual leave for new employee', async () => {
      const adminId = 'admin-new';
      const year = 2026;
      const tenureYears = 0;

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue(null);

      mockPrismaService.adminLeaveBalance.create.mockResolvedValue({
        id: 'balance-2026',
        admin_id: adminId,
        year,
        annual_entitled: '15',
        carryover_from_previous: '0',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.initializeForNewYear(adminId, year, tenureYears);

      expect(result.annualEntitled).toBe(15);
      expect(result.carryoverFromPrevious).toBe(0);
    });
  });

  describe('getCurrentBalance', () => {
    it('should get current year balance', async () => {
      const adminId = 'admin-123';
      const currentYear = new Date().getFullYear();

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        admin_id: adminId,
        year: currentYear,
        annual_entitled: '15',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.getCurrentBalance(adminId);

      expect(result.adminId).toBe(adminId);
      expect(result.year).toBe(currentYear);
    });
  });
});
