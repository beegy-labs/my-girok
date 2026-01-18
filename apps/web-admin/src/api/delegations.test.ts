import { describe, it, expect, vi, beforeEach } from 'vitest';
import { delegationApi } from './delegations';
import type { Delegation, DelegationListResponse } from '@my-girok/types';

// Mock apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('./client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('delegationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create delegation', async () => {
      const createDto = {
        delegateeId: 'user-2',
        scope: 'ALL' as const,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        reason: 'Vacation coverage',
        autoRevoke: true,
      };

      const mockDelegation: Delegation = {
        id: '1',
        delegatorId: 'user-1',
        ...createDto,
        status: 'PENDING',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockPost.mockResolvedValueOnce({ data: mockDelegation });

      const result = await delegationApi.create(createDto);

      expect(mockPost).toHaveBeenCalledWith('/delegations', createDto);
      expect(result).toEqual(mockDelegation);
    });
  });

  describe('list', () => {
    it('should fetch delegations with filters', async () => {
      const mockResponse: DelegationListResponse = {
        data: [
          {
            id: '1',
            delegatorId: 'user-1',
            delegateeId: 'user-2',
            scope: 'ALL',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            status: 'ACTIVE',
            autoRevoke: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse });

      const filter = { status: 'ACTIVE', page: 1, limit: 20 };
      const result = await delegationApi.list(filter);

      expect(mockGet).toHaveBeenCalledWith('/delegations', { params: filter });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('revoke', () => {
    it('should revoke delegation', async () => {
      const mockDelegation: Delegation = {
        id: '1',
        delegatorId: 'user-1',
        delegateeId: 'user-2',
        scope: 'ALL',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        status: 'REVOKED',
        autoRevoke: true,
        revokedAt: '2024-01-15T00:00:00Z',
        revokedBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      mockPost.mockResolvedValueOnce({ data: mockDelegation });

      const result = await delegationApi.revoke('1', 'No longer needed');

      expect(mockPost).toHaveBeenCalledWith('/delegations/1/revoke', {
        reason: 'No longer needed',
      });
      expect(result).toEqual(mockDelegation);
    });
  });

  describe('approve', () => {
    it('should approve delegation', async () => {
      const mockDelegation: Delegation = {
        id: '1',
        delegatorId: 'user-1',
        delegateeId: 'user-2',
        scope: 'ALL',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        status: 'ACTIVE',
        autoRevoke: true,
        approverId: 'manager-1',
        approvedAt: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      };

      mockPost.mockResolvedValueOnce({ data: mockDelegation });

      const result = await delegationApi.approve('1', { approved: true });

      expect(mockPost).toHaveBeenCalledWith('/delegations/1/approve', { approved: true });
      expect(result).toEqual(mockDelegation);
    });
  });

  describe('delete', () => {
    it('should delete delegation', async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      await delegationApi.delete('1');

      expect(mockDelete).toHaveBeenCalledWith('/delegations/1');
    });
  });

  describe('getLogs', () => {
    it('should fetch delegation logs', async () => {
      const mockLogs = [
        {
          id: '1',
          delegationId: '1',
          action: 'CREATED',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      mockGet.mockResolvedValueOnce({ data: mockLogs });

      const result = await delegationApi.getLogs('1');

      expect(mockGet).toHaveBeenCalledWith('/delegations/1/logs');
      expect(result).toEqual(mockLogs);
    });
  });
});
