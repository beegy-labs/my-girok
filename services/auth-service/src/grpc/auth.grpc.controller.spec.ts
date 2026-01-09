import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { AuthGrpcController } from './auth.grpc.controller';
import { PrismaService } from '../database/prisma.service';
import { AdminSessionService } from '../admin/services/admin-session.service';
import { AdminMfaService } from '../admin/services/admin-mfa.service';
import { AdminPasswordService } from '../admin/services/admin-password.service';
import { OperatorAssignmentService } from '../admin/services/operator-assignment.service';
import { OutboxService } from '../common/outbox/outbox.service';

// Proto enum values (matching controller enums)
enum ProtoOperatorStatus {
  OPERATOR_STATUS_UNSPECIFIED = 0,
  OPERATOR_STATUS_PENDING = 1,
  OPERATOR_STATUS_ACTIVE = 2,
  OPERATOR_STATUS_SUSPENDED = 3,
  OPERATOR_STATUS_REVOKED = 4,
}

enum ProtoRoleScope {
  ROLE_SCOPE_UNSPECIFIED = 0,
  ROLE_SCOPE_GLOBAL = 1,
  ROLE_SCOPE_SERVICE = 2,
  ROLE_SCOPE_TENANT = 3,
}

enum ProtoSubjectType {
  SUBJECT_TYPE_UNSPECIFIED = 0,
  SUBJECT_TYPE_USER = 1,
  SUBJECT_TYPE_OPERATOR = 2,
  SUBJECT_TYPE_SERVICE = 3,
}

enum ProtoSanctionType {
  SANCTION_TYPE_UNSPECIFIED = 0,
  SANCTION_TYPE_WARNING = 1,
  SANCTION_TYPE_MUTE = 2,
  SANCTION_TYPE_TEMPORARY_BAN = 3,
  SANCTION_TYPE_PERMANENT_BAN = 4,
  SANCTION_TYPE_FEATURE_RESTRICTION = 5,
}

enum ProtoSanctionSeverity {
  SANCTION_SEVERITY_UNSPECIFIED = 0,
  SANCTION_SEVERITY_LOW = 1,
  SANCTION_SEVERITY_MEDIUM = 2,
  SANCTION_SEVERITY_HIGH = 3,
  SANCTION_SEVERITY_CRITICAL = 4,
}

describe('AuthGrpcController', () => {
  let controller: AuthGrpcController;
  let mockPrismaService: {
    $queryRaw: Mock;
  };

  // Mock data
  const mockOperatorId = '550e8400-e29b-41d4-a716-446655440000';
  const mockRoleId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPermissionId = '550e8400-e29b-41d4-a716-446655440002';
  const mockSanctionId = '550e8400-e29b-41d4-a716-446655440003';

  const mockOperatorRow = {
    id: mockOperatorId,
    accountId: 'account-123',
    email: 'operator@example.com',
    name: 'Test Operator',
    isActive: true,
    roleId: mockRoleId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
  };

  const mockRoleRow = {
    id: mockRoleId,
    name: 'Admin',
    description: 'Administrator role',
    level: 100,
    scope: 'PLATFORM', // Maps to GLOBAL (1) in proto
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPermissionRow = {
    id: mockPermissionId,
    resource: 'users',
    action: 'read',
    category: 'user-management',
    description: 'Read users',
    isSystem: false,
  };

  const mockSanctionRow = {
    id: mockSanctionId,
    subjectId: mockOperatorId,
    subjectType: 'USER',
    type: 'WARNING',
    severity: 'LOW',
    reason: 'Test violation',
    evidenceUrls: ['https://example.com/evidence'],
    issuedBy: 'admin-123',
    startAt: new Date('2024-01-01'),
    endAt: null,
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: vi.fn(),
    };

    const mockAdminSessionService = {
      validateSession: vi.fn(),
      revokeSession: vi.fn(),
      createSession: vi.fn(),
    };

    const mockAdminMfaService = {
      generateChallenge: vi.fn(),
      verifyChallenge: vi.fn(),
    };

    const mockAdminPasswordService = {
      validatePassword: vi.fn(),
      changePassword: vi.fn(),
    };

    const mockOperatorAssignmentService = {
      assignOperator: vi.fn(),
      unassignOperator: vi.fn(),
    };

    const mockOutboxService = {
      addEvent: vi.fn(),
      saveEvent: vi.fn(),
    };

    const mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthGrpcController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AdminSessionService, useValue: mockAdminSessionService },
        { provide: AdminMfaService, useValue: mockAdminMfaService },
        { provide: AdminPasswordService, useValue: mockAdminPasswordService },
        { provide: OperatorAssignmentService, useValue: mockOperatorAssignmentService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    controller = module.get<AuthGrpcController>(AuthGrpcController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission Operations', () => {
    describe('CheckPermission', () => {
      it('should allow permission via direct assignment', async () => {
        // Mock: operator exists and is active
        mockPrismaService.$queryRaw
          .mockResolvedValueOnce([{ id: mockOperatorId, isActive: true }])
          // Mock: direct permission found
          .mockResolvedValueOnce([{ id: mockPermissionId, resource: 'users', action: 'read' }]);

        const result = await controller.checkPermission({
          operatorId: mockOperatorId,
          resource: 'users',
          action: 'read',
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('Permission granted via direct assignment');
        expect(result.matchedPermissions).toContain(mockPermissionId);
      });

      it('should allow permission via role', async () => {
        mockPrismaService.$queryRaw
          // Operator exists and is active
          .mockResolvedValueOnce([{ id: mockOperatorId, isActive: true }])
          // No direct permission
          .mockResolvedValueOnce([])
          // Role permission found
          .mockResolvedValueOnce([{ id: mockPermissionId, resource: 'users', action: 'write' }]);

        const result = await controller.checkPermission({
          operatorId: mockOperatorId,
          resource: 'users',
          action: 'write',
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('Permission granted via role');
        expect(result.matchedPermissions).toContain(mockPermissionId);
      });

      it('should allow permission via wildcard', async () => {
        mockPrismaService.$queryRaw
          // Operator exists and is active
          .mockResolvedValueOnce([{ id: mockOperatorId, isActive: true }])
          // No direct permission
          .mockResolvedValueOnce([])
          // No role permission
          .mockResolvedValueOnce([])
          // Wildcard permission found
          .mockResolvedValueOnce([{ id: mockPermissionId, resource: '*', action: '*' }]);

        const result = await controller.checkPermission({
          operatorId: mockOperatorId,
          resource: 'any-resource',
          action: 'any-action',
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('Permission granted via wildcard');
        expect(result.matchedPermissions).toContain(mockPermissionId);
      });

      it('should deny permission for inactive operator', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([
          { id: mockOperatorId, isActive: false },
        ]);

        const result = await controller.checkPermission({
          operatorId: mockOperatorId,
          resource: 'users',
          action: 'read',
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Operator is not active');
        expect(result.matchedPermissions).toHaveLength(0);
      });

      it('should deny permission when operator not found', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

        const result = await controller.checkPermission({
          operatorId: 'non-existent-id',
          resource: 'users',
          action: 'read',
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Operator not found');
        expect(result.matchedPermissions).toHaveLength(0);
      });

      it('should throw RpcException on database error', async () => {
        mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database error'));

        await expect(
          controller.checkPermission({
            operatorId: mockOperatorId,
            resource: 'users',
            action: 'read',
          }),
        ).rejects.toThrow(RpcException);
      });
    });

    describe('CheckPermissions', () => {
      it('should return allAllowed true when all permissions granted', async () => {
        // CheckPermissions uses batch query: 1) operator check, 2) batch permission check
        mockPrismaService.$queryRaw
          // Operator exists and is active
          .mockResolvedValueOnce([{ id: mockOperatorId, isActive: true }])
          // Batch permission query returns all requested permissions
          .mockResolvedValueOnce([
            {
              resource: 'users',
              action: 'read',
              permissionId: mockPermissionId,
              source: 'role',
            },
            {
              resource: 'users',
              action: 'write',
              permissionId: 'perm-2',
              source: 'role',
            },
          ]);

        const result = await controller.checkPermissions({
          operatorId: mockOperatorId,
          checks: [
            { resource: 'users', action: 'read' },
            { resource: 'users', action: 'write' },
          ],
        });

        expect(result.allAllowed).toBe(true);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].allowed).toBe(true);
        expect(result.results[1].allowed).toBe(true);
      });

      it('should return allAllowed false when some permissions denied', async () => {
        mockPrismaService.$queryRaw
          // Operator exists and is active
          .mockResolvedValueOnce([{ id: mockOperatorId, isActive: true }])
          // Batch permission query returns only one permission (read, but not delete)
          .mockResolvedValueOnce([
            {
              resource: 'users',
              action: 'read',
              permissionId: mockPermissionId,
              source: 'direct',
            },
          ]);

        const result = await controller.checkPermissions({
          operatorId: mockOperatorId,
          checks: [
            { resource: 'users', action: 'read' },
            { resource: 'users', action: 'delete' },
          ],
        });

        expect(result.allAllowed).toBe(false);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].allowed).toBe(true);
        expect(result.results[1].allowed).toBe(false);
        expect(result.results[1].reason).toBe('Permission not found');
      });

      it('should handle empty checks array', async () => {
        const result = await controller.checkPermissions({
          operatorId: mockOperatorId,
          checks: [],
        });

        expect(result.allAllowed).toBe(true);
        expect(result.results).toHaveLength(0);
      });
    });

    describe('GetOperatorPermissions', () => {
      it('should return permissions with role permissions included', async () => {
        mockPrismaService.$queryRaw
          // Direct permissions
          .mockResolvedValueOnce([mockPermissionRow])
          // Role permissions
          .mockResolvedValueOnce([
            {
              ...mockPermissionRow,
              id: 'role-perm-1',
              resource: 'reports',
              action: 'read',
            },
          ]);

        const result = await controller.getOperatorPermissions({
          operatorId: mockOperatorId,
          includeRolePermissions: true,
        });

        expect(result.directPermissions).toHaveLength(1);
        expect(result.rolePermissions).toHaveLength(1);
        expect(result.permissions).toHaveLength(2);
      });

      it('should return only direct permissions when includeRolePermissions is false', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([mockPermissionRow]);

        const result = await controller.getOperatorPermissions({
          operatorId: mockOperatorId,
          includeRolePermissions: false,
        });

        expect(result.directPermissions).toHaveLength(1);
        expect(result.rolePermissions).toHaveLength(0);
        expect(result.permissions).toHaveLength(1);
      });

      it('should deduplicate permissions by id', async () => {
        // Same permission exists in both direct and role
        mockPrismaService.$queryRaw
          .mockResolvedValueOnce([mockPermissionRow])
          .mockResolvedValueOnce([mockPermissionRow]);

        const result = await controller.getOperatorPermissions({
          operatorId: mockOperatorId,
          includeRolePermissions: true,
        });

        expect(result.permissions).toHaveLength(1);
        expect(result.directPermissions).toHaveLength(1);
        expect(result.rolePermissions).toHaveLength(1);
      });
    });
  });

  describe('Role Operations', () => {
    describe('GetRole', () => {
      it('should return role with permissions when found', async () => {
        mockPrismaService.$queryRaw
          // Role found
          .mockResolvedValueOnce([mockRoleRow])
          // Role permissions
          .mockResolvedValueOnce([mockPermissionRow]);

        const result = await controller.getRole({ id: mockRoleId });

        expect(result.role).toBeDefined();
        expect(result.role.id).toBe(mockRoleId);
        expect(result.role.name).toBe('Admin');
        expect(result.role.scope).toBe(ProtoRoleScope.ROLE_SCOPE_GLOBAL);
        expect(result.role.permissions).toHaveLength(1);
      });

      it('should throw RpcException NOT_FOUND when role not found', async () => {
        mockPrismaService.$queryRaw.mockResolvedValue([]);

        try {
          await controller.getRole({ id: 'non-existent' });
          fail('Expected RpcException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RpcException);
          const rpcError = error as RpcException;
          expect(rpcError.getError()).toMatchObject({
            code: GrpcStatus.NOT_FOUND,
          });
        }
      });
    });

    describe('GetRolesByOperator', () => {
      it('should return roles with permissions', async () => {
        // Single query with LEFT JOIN returns role + permission data combined
        mockPrismaService.$queryRaw.mockResolvedValueOnce([
          {
            ...mockRoleRow,
            permissionId: mockPermissionId,
            permissionResource: 'users',
            permissionAction: 'read',
            permissionCategory: 'user-management',
            permissionDescription: 'Read users',
            permissionIsSystem: false,
          },
        ]);

        const result = await controller.getRolesByOperator({
          operatorId: mockOperatorId,
        });

        expect(result.roles).toHaveLength(1);
        expect(result.roles[0].id).toBe(mockRoleId);
        expect(result.roles[0].name).toBe('Admin');
        expect(result.roles[0].permissions).toHaveLength(1);
        expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
      });

      it('should return empty array when operator has no roles', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

        const result = await controller.getRolesByOperator({
          operatorId: mockOperatorId,
        });

        expect(result.roles).toHaveLength(0);
      });
    });
  });

  describe('Operator Operations', () => {
    describe('GetOperator', () => {
      it('should return operator with role when found', async () => {
        mockPrismaService.$queryRaw
          // Operator found
          .mockResolvedValueOnce([mockOperatorRow])
          // Role for operator
          .mockResolvedValueOnce([mockRoleRow])
          // Permissions for role
          .mockResolvedValueOnce([mockPermissionRow]);

        const result = await controller.getOperator({ id: mockOperatorId });

        expect(result.operator).toBeDefined();
        expect(result.operator.id).toBe(mockOperatorId);
        expect(result.operator.email).toBe('operator@example.com');
        expect(result.operator.status).toBe(ProtoOperatorStatus.OPERATOR_STATUS_ACTIVE);
        expect(result.operator.role).toBeDefined();
      });

      it('should throw RpcException NOT_FOUND when operator not found', async () => {
        mockPrismaService.$queryRaw.mockResolvedValue([]);

        try {
          await controller.getOperator({ id: 'non-existent' });
          fail('Expected RpcException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RpcException);
          const rpcError = error as RpcException;
          expect(rpcError.getError()).toMatchObject({
            code: GrpcStatus.NOT_FOUND,
          });
        }
      });

      it('should return operator without role when roleId is null', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([{ ...mockOperatorRow, roleId: null }]);

        const result = await controller.getOperator({ id: mockOperatorId });

        expect(result.operator).toBeDefined();
        expect(result.operator.role).toBeUndefined();
      });
    });

    describe('ValidateOperator', () => {
      it('should return valid true for active operator', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: mockOperatorId, isActive: true }]);

        const result = await controller.validateOperator({ id: mockOperatorId });

        expect(result.valid).toBe(true);
        expect(result.status).toBe(ProtoOperatorStatus.OPERATOR_STATUS_ACTIVE);
        expect(result.message).toBe('Operator is valid and active');
      });

      it('should return valid false for inactive operator', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([
          { id: mockOperatorId, isActive: false },
        ]);

        const result = await controller.validateOperator({ id: mockOperatorId });

        expect(result.valid).toBe(false);
        expect(result.status).toBe(ProtoOperatorStatus.OPERATOR_STATUS_SUSPENDED);
        expect(result.message).toBe('Operator is not active');
      });

      it('should return valid false when operator not found', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

        const result = await controller.validateOperator({
          id: 'non-existent',
        });

        expect(result.valid).toBe(false);
        expect(result.status).toBe(ProtoOperatorStatus.OPERATOR_STATUS_UNSPECIFIED);
        expect(result.message).toBe('Operator not found');
      });
    });
  });

  describe('Sanction Operations', () => {
    describe('CheckSanction', () => {
      it('should return isSanctioned true when active sanctions exist', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([mockSanctionRow]);

        const result = await controller.checkSanction({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_USER,
        });

        expect(result.isSanctioned).toBe(true);
        expect(result.activeSanctions).toHaveLength(1);
        expect(result.highestSeverity).toBe(ProtoSanctionSeverity.SANCTION_SEVERITY_LOW);
      });

      it('should return isSanctioned false when no active sanctions', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

        const result = await controller.checkSanction({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_USER,
        });

        expect(result.isSanctioned).toBe(false);
        expect(result.activeSanctions).toHaveLength(0);
        expect(result.highestSeverity).toBe(ProtoSanctionSeverity.SANCTION_SEVERITY_UNSPECIFIED);
      });

      it('should filter by sanction type when provided', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([mockSanctionRow]);

        const result = await controller.checkSanction({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_USER,
          sanctionType: ProtoSanctionType.SANCTION_TYPE_WARNING,
        });

        expect(result.isSanctioned).toBe(true);
        expect(result.activeSanctions).toHaveLength(1);
        // Verify query was called (type filter applied)
        expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      });

      it('should return highest severity among multiple sanctions', async () => {
        const criticalSanction = {
          ...mockSanctionRow,
          id: 'sanction-2',
          severity: 'CRITICAL',
          type: 'PERMANENT_BAN',
        };

        mockPrismaService.$queryRaw.mockResolvedValueOnce([mockSanctionRow, criticalSanction]);

        const result = await controller.checkSanction({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_USER,
        });

        expect(result.activeSanctions).toHaveLength(2);
        expect(result.highestSeverity).toBe(ProtoSanctionSeverity.SANCTION_SEVERITY_CRITICAL);
      });
    });

    describe('GetActiveSanctions', () => {
      it('should return active sanctions for subject', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([
          mockSanctionRow,
          { ...mockSanctionRow, id: 'sanction-2', type: 'MUTE' },
        ]);

        const result = await controller.getActiveSanctions({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_USER,
        });

        expect(result.sanctions).toHaveLength(2);
        expect(result.totalCount).toBe(2);
      });

      it('should return empty array when no active sanctions', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

        const result = await controller.getActiveSanctions({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_USER,
        });

        expect(result.sanctions).toHaveLength(0);
        expect(result.totalCount).toBe(0);
      });

      it('should handle different subject types', async () => {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([
          { ...mockSanctionRow, subjectType: 'ADMIN' },
        ]);

        const result = await controller.getActiveSanctions({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_OPERATOR,
        });

        expect(result.sanctions).toHaveLength(1);
        expect(result.sanctions[0].subjectType).toBe(ProtoSubjectType.SUBJECT_TYPE_OPERATOR);
      });
    });
  });

  describe('Error Handling', () => {
    it('should wrap database errors in RpcException with INTERNAL code', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      try {
        await controller.checkSanction({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_USER,
        });
        fail('Expected RpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toMatchObject({
          code: GrpcStatus.INTERNAL,
        });
      }
    });

    it('should pass through existing RpcException', async () => {
      const rpcError = new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Custom not found',
      });
      mockPrismaService.$queryRaw.mockRejectedValue(rpcError);

      await expect(controller.getRole({ id: mockRoleId })).rejects.toThrow(rpcError);
    });
  });

  describe('Proto Timestamp Conversion', () => {
    it('should convert Date to proto timestamp correctly', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockOperatorRow])
        .mockResolvedValueOnce([mockRoleRow])
        .mockResolvedValueOnce([mockPermissionRow]);

      const result = await controller.getOperator({ id: mockOperatorId });

      expect(result.operator.createdAt).toBeDefined();
      expect(result.operator.createdAt?.seconds).toBeGreaterThan(0);
      expect(result.operator.createdAt?.nanos).toBeDefined();
    });

    it('should handle null dates gracefully', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { ...mockOperatorRow, lastLoginAt: null, roleId: null },
      ]);

      const result = await controller.getOperator({ id: mockOperatorId });

      expect(result.operator.lastLoginAt).toBeUndefined();
    });
  });

  describe('Enum Mapping', () => {
    it('should map role scope correctly', async () => {
      const testCases = [
        { scope: 'PLATFORM', expected: ProtoRoleScope.ROLE_SCOPE_GLOBAL }, // PLATFORM -> GLOBAL
        { scope: 'SERVICE', expected: ProtoRoleScope.ROLE_SCOPE_SERVICE },
        { scope: 'TENANT', expected: ProtoRoleScope.ROLE_SCOPE_TENANT },
        { scope: 'UNKNOWN', expected: ProtoRoleScope.ROLE_SCOPE_UNSPECIFIED },
      ];

      for (const testCase of testCases) {
        mockPrismaService.$queryRaw
          .mockResolvedValueOnce([{ ...mockRoleRow, scope: testCase.scope }])
          .mockResolvedValueOnce([]);

        const result = await controller.getRole({ id: mockRoleId });
        expect(result.role.scope).toBe(testCase.expected);
      }
    });

    it('should map sanction severity correctly', async () => {
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const expectedValues = [
        ProtoSanctionSeverity.SANCTION_SEVERITY_LOW,
        ProtoSanctionSeverity.SANCTION_SEVERITY_MEDIUM,
        ProtoSanctionSeverity.SANCTION_SEVERITY_HIGH,
        ProtoSanctionSeverity.SANCTION_SEVERITY_CRITICAL,
      ];

      for (let i = 0; i < severities.length; i++) {
        mockPrismaService.$queryRaw.mockResolvedValueOnce([
          { ...mockSanctionRow, severity: severities[i] },
        ]);

        const result = await controller.checkSanction({
          subjectId: mockOperatorId,
          subjectType: ProtoSubjectType.SUBJECT_TYPE_USER,
        });

        expect(result.highestSeverity).toBe(expectedValues[i]);
      }
    });
  });
});
