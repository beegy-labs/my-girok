import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaveApi, leaveBalanceApi } from './leave';
import type { LeaveRequest, LeaveBalance, LeaveRequestListResponse } from '@my-girok/types';

// Mock apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('./client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

describe('leaveApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create leave request', async () => {
      const createDto = {
        leaveType: 'ANNUAL' as const,
        startDate: '2024-01-15',
        endDate: '2024-01-17',
        days: 3,
        reason: 'Vacation',
      };

      const mockRequest: LeaveRequest = {
        id: '1',
        adminId: 'admin-1',
        ...createDto,
        status: 'DRAFT',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockPost.mockResolvedValueOnce({ data: mockRequest });

      const result = await leaveApi.create(createDto);

      expect(mockPost).toHaveBeenCalledWith('/leaves', createDto);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('submit', () => {
    it('should submit leave request', async () => {
      const mockRequest: LeaveRequest = {
        id: '1',
        adminId: 'admin-1',
        leaveType: 'ANNUAL',
        startDate: '2024-01-15',
        endDate: '2024-01-17',
        days: 3,
        status: 'PENDING',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockPost.mockResolvedValueOnce({ data: mockRequest });

      const result = await leaveApi.submit('1');

      expect(mockPost).toHaveBeenCalledWith('/leaves/1/submit');
      expect(result).toEqual(mockRequest);
    });
  });

  describe('approve', () => {
    it('should approve leave request', async () => {
      const mockRequest: LeaveRequest = {
        id: '1',
        adminId: 'admin-1',
        leaveType: 'ANNUAL',
        startDate: '2024-01-15',
        endDate: '2024-01-17',
        days: 3,
        status: 'APPROVED',
        approverId: 'manager-1',
        approverComment: 'Approved',
        approvedAt: '2024-01-02T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockPost.mockResolvedValueOnce({ data: mockRequest });

      const result = await leaveApi.approve('1', { approved: true, comment: 'Approved' });

      expect(mockPost).toHaveBeenCalledWith('/leaves/1/approve', {
        approved: true,
        comment: 'Approved',
      });
      expect(result).toEqual(mockRequest);
    });
  });

  describe('list', () => {
    it('should fetch leave requests with filters', async () => {
      const mockResponse: LeaveRequestListResponse = {
        data: [
          {
            id: '1',
            adminId: 'admin-1',
            leaveType: 'ANNUAL',
            startDate: '2024-01-15',
            endDate: '2024-01-17',
            days: 3,
            status: 'PENDING',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse });

      const filter = { status: 'PENDING', page: 1, limit: 20 };
      const result = await leaveApi.list(filter);

      expect(mockGet).toHaveBeenCalledWith('/leaves', { params: filter });
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('leaveBalanceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyBalance', () => {
    it('should fetch current leave balance', async () => {
      const mockBalance: LeaveBalance = {
        id: '1',
        adminId: 'admin-1',
        year: 2024,
        totalDays: 15,
        usedDays: 5,
        remainingDays: 10,
        carriedForwardDays: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockGet.mockResolvedValueOnce({ data: mockBalance });

      const result = await leaveBalanceApi.getMyBalance();

      expect(mockGet).toHaveBeenCalledWith('/leave-balances/me');
      expect(result).toEqual(mockBalance);
    });
  });

  describe('adjust', () => {
    it('should adjust leave balance', async () => {
      const mockBalance: LeaveBalance = {
        id: '1',
        adminId: 'admin-1',
        year: 2024,
        totalDays: 16,
        usedDays: 5,
        remainingDays: 11,
        carriedForwardDays: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-05T00:00:00Z',
      };

      mockPatch.mockResolvedValueOnce({ data: mockBalance });

      const result = await leaveBalanceApi.adjust('admin-1', 2024, {
        adjustment: 1,
        reason: 'Bonus leave',
      });

      expect(mockPatch).toHaveBeenCalledWith('/leave-balances/admin-1/2024/adjust', {
        adjustment: 1,
        reason: 'Bonus leave',
      });
      expect(result).toEqual(mockBalance);
    });
  });
});
