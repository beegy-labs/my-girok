import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmployeeDelegationService } from './employee-delegation.service';
import { DelegationService } from '../../delegation/services/delegation.service';

describe('EmployeeDelegationService', () => {
  let service: EmployeeDelegationService;
  let delegationService: DelegationService;

  const mockDelegationService = {
    findAll: vi.fn(),
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeDelegationService,
        { provide: DelegationService, useValue: mockDelegationService },
      ],
    }).compile();

    service = module.get<EmployeeDelegationService>(EmployeeDelegationService);
    delegationService = module.get<DelegationService>(DelegationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getReceivedDelegations', () => {
    it('should call DelegationService.findAll with delegateId filter', async () => {
      const employeeId = 'employee-123';
      const mockResult = { data: [], total: 0 };

      mockDelegationService.findAll.mockResolvedValue(mockResult);

      const result = await service.getReceivedDelegations(employeeId);

      expect(result).toEqual(mockResult);
      expect(delegationService.findAll).toHaveBeenCalledWith({
        delegateId: employeeId,
        status: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should support status filter and pagination', async () => {
      const employeeId = 'employee-123';
      const status = 'ACTIVE';
      const mockResult = { data: [], total: 0 };

      mockDelegationService.findAll.mockResolvedValue(mockResult);

      await service.getReceivedDelegations(employeeId, status, 2, 10);

      expect(delegationService.findAll).toHaveBeenCalledWith({
        delegateId: employeeId,
        status,
        page: 2,
        limit: 10,
      });
    });

    it('should only return delegations assigned TO the employee', async () => {
      const employeeId = 'employee-123';
      const mockDelegations = [
        {
          id: 'delegation-1',
          delegatorId: 'manager-123',
          delegateId: employeeId,
          status: 'ACTIVE',
        },
        {
          id: 'delegation-2',
          delegatorId: 'admin-456',
          delegateId: employeeId,
          status: 'PENDING',
        },
      ];
      const mockResult = { data: mockDelegations, total: 2 };

      mockDelegationService.findAll.mockResolvedValue(mockResult);

      const result = await service.getReceivedDelegations(employeeId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].delegateId).toBe(employeeId);
      expect(result.data[1].delegateId).toBe(employeeId);
      expect(delegationService.findAll).toHaveBeenCalledWith({
        delegateId: employeeId,
        status: undefined,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('getDelegation', () => {
    it('should call DelegationService.findById', async () => {
      const delegationId = 'delegation-123';
      const mockResult = {
        id: delegationId,
        delegatorId: 'manager-123',
        delegateId: 'employee-123',
        status: 'ACTIVE',
      };

      mockDelegationService.findById.mockResolvedValue(mockResult);

      const result = await service.getDelegation(delegationId);

      expect(result).toEqual(mockResult);
      expect(delegationService.findById).toHaveBeenCalledWith(delegationId);
    });
  });
});
