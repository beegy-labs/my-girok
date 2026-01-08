import { Test, TestingModule } from '@nestjs/testing';
import {
  OperatorAssignmentService,
  OperatorAssignmentRow,
  PermissionRow,
} from './operator-assignment.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';

describe('OperatorAssignmentService', () => {
  let service: OperatorAssignmentService;
  let prismaService: jest.Mocked<PrismaService>;
  let outboxService: jest.Mocked<OutboxService>;

  const mockAccountId = '01935c6d-c2d0-7abc-8def-1234567890ab';
  const mockServiceId = '01935c6d-c2d0-7abc-8def-1234567890ac';
  const mockAssignmentId = '01935c6d-c2d0-7abc-8def-1234567890ad';
  const mockAssignedBy = '01935c6d-c2d0-7abc-8def-1234567890ae';
  const mockCountryCode = 'KR';

  const mockAssignment: OperatorAssignmentRow = {
    id: mockAssignmentId,
    accountId: mockAccountId,
    serviceId: mockServiceId,
    countryCode: mockCountryCode,
    status: 'ACTIVE',
    assignedBy: mockAssignedBy,
    assignedAt: new Date(),
    deactivatedAt: null,
    deactivatedBy: null,
    deactivationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        // Execute the callback with the mock prisma service itself as the transaction client
        return fn(mockPrismaService);
      }),
    };

    const mockOutboxService = {
      addEventDirect: jest.fn().mockResolvedValue('event-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<OperatorAssignmentService>(OperatorAssignmentService);
    prismaService = module.get(PrismaService);
    outboxService = module.get(OutboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignOperator', () => {
    it('should create new operator assignment', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([]) // getAssignment - no existing
        .mockResolvedValueOnce([mockAssignment]); // getAssignmentById
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.assignOperator(
        mockAccountId,
        mockServiceId,
        mockCountryCode,
        mockAssignedBy,
      );

      expect(result.success).toBe(true);
      expect(result.assignment).toBeDefined();
      expect(result.message).toBe('Operator assigned successfully');
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'OPERATOR_ASSIGNED',
        mockAccountId,
        expect.objectContaining({
          accountId: mockAccountId,
          serviceId: mockServiceId,
        }),
      );
    });

    it('should fail if active assignment already exists', async () => {
      prismaService.$queryRaw.mockResolvedValue([mockAssignment]);

      const result = await service.assignOperator(
        mockAccountId,
        mockServiceId,
        mockCountryCode,
        mockAssignedBy,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Operator assignment already exists');
    });

    it('should reactivate suspended assignment', async () => {
      const suspendedAssignment: OperatorAssignmentRow = {
        ...mockAssignment,
        status: 'SUSPENDED',
      };

      prismaService.$queryRaw
        .mockResolvedValueOnce([suspendedAssignment]) // getAssignment - existing suspended
        .mockResolvedValueOnce([{ ...mockAssignment, status: 'ACTIVE' }]); // getAssignmentById after reactivation
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.assignOperator(
        mockAccountId,
        mockServiceId,
        mockCountryCode,
        mockAssignedBy,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Operator assignment reactivated');
    });

    it('should assign with permissions', async () => {
      const permissionIds = ['perm-1', 'perm-2'];

      prismaService.$queryRaw
        .mockResolvedValueOnce([]) // getAssignment
        .mockResolvedValueOnce([mockAssignment]); // getAssignmentById
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.assignOperator(
        mockAccountId,
        mockServiceId,
        mockCountryCode,
        mockAssignedBy,
        permissionIds,
      );

      expect(result.success).toBe(true);
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'OPERATOR_ASSIGNED',
        mockAccountId,
        expect.objectContaining({ permissionCount: 2 }),
      );
    });
  });

  describe('revokeAssignment', () => {
    it('should revoke active assignment', async () => {
      prismaService.$queryRaw.mockResolvedValue([mockAssignment]);
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.revokeAssignment(
        mockAssignmentId,
        mockAssignedBy,
        'Policy violation',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Assignment revoked successfully');
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'OPERATOR_REVOKED',
        mockAccountId,
        expect.objectContaining({
          reason: 'Policy violation',
        }),
      );
    });

    it('should fail if assignment not found', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.revokeAssignment(
        'nonexistent-id',
        mockAssignedBy,
        'Test reason',
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Assignment not found');
    });

    it('should fail if assignment already revoked', async () => {
      const revokedAssignment: OperatorAssignmentRow = {
        ...mockAssignment,
        status: 'REVOKED',
      };

      prismaService.$queryRaw.mockResolvedValue([revokedAssignment]);

      const result = await service.revokeAssignment(
        mockAssignmentId,
        mockAssignedBy,
        'Test reason',
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Assignment already revoked');
    });
  });

  describe('getAssignment', () => {
    it('should return assignment if exists', async () => {
      prismaService.$queryRaw.mockResolvedValue([mockAssignment]);

      const result = await service.getAssignment(mockAccountId, mockServiceId, mockCountryCode);

      expect(result).toEqual(mockAssignment);
    });

    it('should return null if not exists', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getAssignment(mockAccountId, mockServiceId, mockCountryCode);

      expect(result).toBeNull();
    });
  });

  describe('getServiceAssignments', () => {
    it('should return paginated assignments', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([mockAssignment])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.getServiceAssignments(mockServiceId);

      expect(result.assignments).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by country code', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([mockAssignment])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.getServiceAssignments(mockServiceId, {
        countryCode: 'KR',
      });

      expect(result.assignments).toHaveLength(1);
    });

    it('should filter by status', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([mockAssignment])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.getServiceAssignments(mockServiceId, {
        status: 'ACTIVE',
      });

      expect(result.assignments).toHaveLength(1);
    });

    it('should filter by both country code and status', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([mockAssignment])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.getServiceAssignments(mockServiceId, {
        countryCode: 'KR',
        status: 'ACTIVE',
      });

      expect(result.assignments).toHaveLength(1);
    });

    it('should handle pagination', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(25) }]);

      const result = await service.getServiceAssignments(mockServiceId, {
        page: 2,
        pageSize: 10,
      });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalCount).toBe(25);
    });
  });

  describe('updatePermissions', () => {
    it('should update permissions for active assignment', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([mockAssignment]) // getAssignmentById
        .mockResolvedValueOnce([mockAssignment]); // getAssignmentById after update
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.updatePermissions(
        mockAssignmentId,
        ['perm-1', 'perm-2'],
        mockAssignedBy,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Permissions updated successfully');
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'OPERATOR_PERMISSIONS_UPDATED',
        mockAccountId,
        expect.objectContaining({ permissionCount: 2 }),
      );
    });

    it('should fail if assignment not found', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.updatePermissions('nonexistent-id', ['perm-1'], mockAssignedBy);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Assignment not found');
    });

    it('should fail if assignment is not active', async () => {
      const suspendedAssignment: OperatorAssignmentRow = {
        ...mockAssignment,
        status: 'SUSPENDED',
      };

      prismaService.$queryRaw.mockResolvedValue([suspendedAssignment]);

      const result = await service.updatePermissions(mockAssignmentId, ['perm-1'], mockAssignedBy);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot update permissions for inactive assignment');
    });

    it('should handle empty permissions array', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([mockAssignment])
        .mockResolvedValueOnce([mockAssignment]);
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.updatePermissions(mockAssignmentId, [], mockAssignedBy);

      expect(result.success).toBe(true);
    });
  });

  describe('getPermissions', () => {
    it('should return permissions for assignment', async () => {
      const mockPermissions: PermissionRow[] = [
        {
          id: 'perm-1',
          resource: 'users',
          action: 'read',
          category: 'USER_MANAGEMENT',
          description: 'View users',
          isSystem: false,
        },
        {
          id: 'perm-2',
          resource: 'users',
          action: 'write',
          category: 'USER_MANAGEMENT',
          description: 'Modify users',
          isSystem: false,
        },
      ];

      prismaService.$queryRaw.mockResolvedValue(mockPermissions);

      const result = await service.getPermissions(mockAssignmentId);

      expect(result).toHaveLength(2);
      expect(result[0].resource).toBe('users');
    });

    it('should return empty array if no permissions', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getPermissions(mockAssignmentId);

      expect(result).toHaveLength(0);
    });
  });
});
