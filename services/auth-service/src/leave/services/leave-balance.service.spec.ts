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
        adminId: dto.adminId,
        year: dto.year,
        annualEntitled: '15',
        annualUsed: '0',
        annualPending: '0',
        annualRemaining: '15',
        sickEntitled: '10',
        sickUsed: '0',
        sickRemaining: '10',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        adminId: adminId,
        year,
        annualEntitled: '15',
        annualUsed: '3',
        annualRemaining: '12',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        adminId: adminId,
        year,
        annualEntitled: '15',
        annualRemaining: '12',
      });

      mockPrismaService.adminLeaveBalance.update.mockResolvedValue({
        id: 'balance-1',
        adminId: adminId,
        year,
        annualEntitled: '17',
        annualRemaining: '14',
        adjustment: '2',
        adjustmentReason: dto.adjustmentReason,
        adjustedBy: adjustedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
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
          leaveType: 'ANNUAL',
          daysCount: '2',
          status: 'APPROVED',
        },
        {
          leaveType: 'ANNUAL',
          daysCount: '1',
          status: 'APPROVED',
        },
        {
          leaveType: 'SICK',
          daysCount: '1',
          status: 'APPROVED',
        },
      ]);

      mockPrismaService.adminLeaveBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        adminId: adminId,
        year,
        annualEntitled: '15',
        annualUsed: '0',
        annualPending: '0',
        annualRemaining: '15',
        sickEntitled: '10',
        sickUsed: '0',
        sickRemaining: '10',
        compensatoryEntitled: '0',
        compensatoryUsed: '0',
        compensatoryRemaining: '0',
        specialEntitled: '0',
        specialUsed: '0',
        specialRemaining: '0',
        carryoverFromPrevious: '0',
        adjustment: '0',
      });

      mockPrismaService.adminLeaveBalance.update.mockResolvedValue({
        id: 'balance-1',
        adminId: adminId,
        year,
        annualEntitled: '15',
        annualUsed: '3',
        annualRemaining: '12',
        sickEntitled: '10',
        sickUsed: '1',
        sickRemaining: '9',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        adminId: adminId,
        year: 2025,
        annualRemaining: '3',
      });

      mockPrismaService.adminLeaveBalance.create.mockResolvedValue({
        id: 'balance-2026',
        adminId: adminId,
        year,
        annualEntitled: '17', // 15 base + 2 for 5 years
        carryoverFromPrevious: '3',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        adminId: adminId,
        year,
        annualEntitled: '15',
        carryoverFromPrevious: '0',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        adminId: adminId,
        year: currentYear,
        annualEntitled: '15',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getCurrentBalance(adminId);

      expect(result.adminId).toBe(adminId);
      expect(result.year).toBe(currentYear);
    });
  });
});
