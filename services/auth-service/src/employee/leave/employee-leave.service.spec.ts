import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmployeeLeaveService } from './employee-leave.service';
import { LeaveService } from '../../leave/services/leave.service';
import { LeaveBalanceService } from '../../leave/services/leave-balance.service';

describe('EmployeeLeaveService', () => {
  let service: EmployeeLeaveService;
  let leaveService: LeaveService;
  let leaveBalanceService: LeaveBalanceService;

  const mockLeaveService = {
    create: vi.fn(),
    submit: vi.fn(),
    cancel: vi.fn(),
    list: vi.fn(),
    findOne: vi.fn(),
  };

  const mockLeaveBalanceService = {
    getCurrentBalance: vi.fn(),
    getBalance: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeLeaveService,
        { provide: LeaveService, useValue: mockLeaveService },
        { provide: LeaveBalanceService, useValue: mockLeaveBalanceService },
      ],
    }).compile();

    service = module.get<EmployeeLeaveService>(EmployeeLeaveService);
    leaveService = module.get<LeaveService>(LeaveService);
    leaveBalanceService = module.get<LeaveBalanceService>(LeaveBalanceService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLeaveRequest', () => {
    it('should call LeaveService.create with employeeId', async () => {
      const employeeId = 'employee-123';
      const dto = {
        leaveType: 'ANNUAL',
        startDate: new Date('2026-01-20'),
        endDate: new Date('2026-01-21'),
        daysCount: 2,
      };
      const mockResult = { id: 'leave-123', adminId: employeeId, status: 'DRAFT' };

      mockLeaveService.create.mockResolvedValue(mockResult);

      const result = await service.createLeaveRequest(employeeId, dto);

      expect(result).toEqual(mockResult);
      expect(leaveService.create).toHaveBeenCalledWith(employeeId, dto);
    });
  });

  describe('submitLeaveRequest', () => {
    it('should call LeaveService.submit with employeeId and leaveId', async () => {
      const employeeId = 'employee-123';
      const leaveId = 'leave-123';
      const dto = { firstApproverId: 'manager-123' };
      const mockResult = { id: leaveId, adminId: employeeId, status: 'PENDING' };

      mockLeaveService.submit.mockResolvedValue(mockResult);

      const result = await service.submitLeaveRequest(employeeId, leaveId, dto);

      expect(result).toEqual(mockResult);
      expect(leaveService.submit).toHaveBeenCalledWith(leaveId, employeeId, dto);
    });
  });

  describe('cancelLeaveRequest', () => {
    it('should call LeaveService.cancel with employeeId and leaveId', async () => {
      const employeeId = 'employee-123';
      const leaveId = 'leave-123';
      const dto = { cancellationReason: 'Changed plans' };
      const mockResult = { id: leaveId, adminId: employeeId, status: 'CANCELLED' };

      mockLeaveService.cancel.mockResolvedValue(mockResult);

      const result = await service.cancelLeaveRequest(employeeId, leaveId, dto);

      expect(result).toEqual(mockResult);
      expect(leaveService.cancel).toHaveBeenCalledWith(leaveId, employeeId, dto);
    });
  });

  describe('getMyLeaveRequests', () => {
    it('should call LeaveService.list with employeeId filter', async () => {
      const employeeId = 'employee-123';
      const mockResult = { data: [], total: 0 };

      mockLeaveService.list.mockResolvedValue(mockResult);

      const result = await service.getMyLeaveRequests(employeeId);

      expect(result).toEqual(mockResult);
      expect(leaveService.list).toHaveBeenCalledWith({
        adminId: employeeId,
        startDate: undefined,
        endDate: undefined,
        status: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should support filters and pagination', async () => {
      const employeeId = 'employee-123';
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      const status = 'APPROVED';
      const mockResult = { data: [], total: 0 };

      mockLeaveService.list.mockResolvedValue(mockResult);

      await service.getMyLeaveRequests(employeeId, startDate, endDate, status, 2, 10);

      expect(leaveService.list).toHaveBeenCalledWith({
        adminId: employeeId,
        startDate,
        endDate,
        status,
        page: 2,
        limit: 10,
      });
    });
  });

  describe('getMyLeaveBalance', () => {
    it('should call LeaveBalanceService.getCurrentBalance with employeeId', async () => {
      const employeeId = 'employee-123';
      const mockResult = {
        adminId: employeeId,
        year: 2026,
        annualEntitled: 15,
        annualRemaining: 10,
      };

      mockLeaveBalanceService.getCurrentBalance.mockResolvedValue(mockResult);

      const result = await service.getMyLeaveBalance(employeeId);

      expect(result).toEqual(mockResult);
      expect(leaveBalanceService.getCurrentBalance).toHaveBeenCalledWith(employeeId);
    });
  });

  describe('getMyLeaveBalanceByYear', () => {
    it('should call LeaveBalanceService.getBalance with employeeId and year', async () => {
      const employeeId = 'employee-123';
      const year = 2025;
      const mockResult = {
        adminId: employeeId,
        year,
        annualEntitled: 15,
        annualRemaining: 5,
      };

      mockLeaveBalanceService.getBalance.mockResolvedValue(mockResult);

      const result = await service.getMyLeaveBalanceByYear(employeeId, year);

      expect(result).toEqual(mockResult);
      expect(leaveBalanceService.getBalance).toHaveBeenCalledWith(employeeId, year);
    });
  });
});
