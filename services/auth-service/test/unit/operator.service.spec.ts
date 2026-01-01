import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

import { OperatorService } from '../../src/admin/services/operator.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import {
  createOperatorResponse,
  createService,
  generateTestId,
  resetTestCounter,
} from '../utils/test-factory';
import { InvitationType } from '../../src/admin/dto/operator.dto';

describe('OperatorService', () => {
  let service: OperatorService;
  let mockPrisma: MockPrismaService;

  const adminId = '00000000-0000-7000-0000-000000000001';
  const operatorId = '00000000-0000-7000-0000-000000000002';
  const serviceSlug = 'test-service';

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OperatorService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<OperatorService>(OperatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAdminServiceAccess', () => {
    it('should allow SYSTEM scope admin access to any service', async () => {
      // Arrange - The method is private but we test it through create
      const mockService = createService({ slug: serviceSlug });
      const mockOperator = createOperatorResponse({
        email: 'operator@test.com',
        serviceSlug,
      });

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }]) // Admin scope check
        .mockResolvedValueOnce([mockService]) // Service lookup
        .mockResolvedValueOnce([]) // No existing operator check
        .mockResolvedValueOnce([mockOperator]) // Find by ID after create
        .mockResolvedValueOnce([]); // No permissions
      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act & Assert
      await expect(
        service.create(adminId, {
          email: 'operator@test.com',
          name: 'Test Operator',
          serviceSlug,
          countryCode: 'KR',
          tempPassword: 'TempPass123!',
        }),
      ).resolves.toBeDefined();
    });

    it('should throw ForbiddenException for TENANT admin without service access', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'TENANT' }]) // Admin scope check
        .mockResolvedValueOnce([]); // No service access

      // Act & Assert
      await expect(
        service.create(adminId, {
          email: 'operator@test.com',
          name: 'Test Operator',
          serviceSlug,
          countryCode: 'KR',
          tempPassword: 'TempPass123!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    const mockServiceRow = {
      id: generateTestId(),
      slug: serviceSlug,
      name: 'Test Service',
    };

    it('should create a new operator with hashed password', async () => {
      // Arrange
      const mockOperatorRow = {
        id: operatorId,
        email: 'operator@test.com',
        name: 'Test Operator',
        serviceId: mockServiceRow.id,
        serviceSlug: mockServiceRow.slug,
        serviceName: mockServiceRow.name,
        countryCode: 'KR',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
      };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }]) // Admin scope check
        .mockResolvedValueOnce([mockServiceRow]) // Service lookup
        .mockResolvedValueOnce([]) // No existing operator
        .mockResolvedValueOnce([mockOperatorRow]) // findById after create
        .mockResolvedValueOnce([]); // No permissions

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.create(adminId, {
        email: 'operator@test.com',
        name: 'Test Operator',
        serviceSlug,
        countryCode: 'KR',
        tempPassword: 'TempPass123!',
      });

      // Assert
      expect(result.email).toBe('operator@test.com');
      expect(result.serviceSlug).toBe(serviceSlug);
      expect(result.isActive).toBe(true);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should throw ConflictException if operator already exists for service', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([mockServiceRow])
        .mockResolvedValueOnce([{ id: operatorId }]); // Existing operator

      // Act & Assert
      await expect(
        service.create(adminId, {
          email: 'existing@test.com',
          name: 'Test Operator',
          serviceSlug,
          countryCode: 'KR',
          tempPassword: 'TempPass123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if service does not exist', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ scope: 'SYSTEM' }]).mockResolvedValueOnce([]); // No service found

      // Act & Assert
      await expect(
        service.create(adminId, {
          email: 'operator@test.com',
          name: 'Test Operator',
          serviceSlug: 'non-existent',
          countryCode: 'KR',
          tempPassword: 'TempPass123!',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should grant permissions if provided', async () => {
      // Arrange
      const permissionId = generateTestId();
      const mockOperatorRow = {
        id: operatorId,
        email: 'operator@test.com',
        name: 'Test Operator',
        serviceId: mockServiceRow.id,
        serviceSlug: mockServiceRow.slug,
        serviceName: mockServiceRow.name,
        countryCode: 'KR',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
      };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([mockServiceRow])
        .mockResolvedValueOnce([]) // No existing operator
        .mockResolvedValueOnce([mockOperatorRow])
        .mockResolvedValueOnce([
          {
            operatorId,
            id: permissionId,
            resource: 'content',
            action: 'read',
            displayName: 'View Content',
          },
        ]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.create(adminId, {
        email: 'operator@test.com',
        name: 'Test Operator',
        serviceSlug,
        countryCode: 'KR',
        tempPassword: 'TempPass123!',
        permissionIds: [permissionId],
      });

      // Assert
      expect(result.permissions).toHaveLength(1);
      // Number of calls depends on implementation: Create operator + grant permission + possible audit logs
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('invite', () => {
    const mockServiceRow = {
      id: generateTestId(),
      slug: serviceSlug,
      name: 'Test Service',
    };

    it('should create an email invitation', async () => {
      // Arrange
      const mockInvitation = {
        id: generateTestId(),
        email: 'invited@test.com',
        name: 'Invited User',
        type: 'EMAIL',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([mockServiceRow])
        .mockResolvedValueOnce([]) // No pending invitation
        .mockResolvedValueOnce([mockInvitation]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.invite(adminId, {
        email: 'invited@test.com',
        name: 'Invited User',
        serviceSlug,
        countryCode: 'KR',
        type: InvitationType.EMAIL,
        permissionIds: [],
      });

      // Assert
      expect(result.email).toBe('invited@test.com');
      expect(result.type).toBe('EMAIL');
      expect(result.status).toBe('PENDING');
    });

    it('should create a direct invitation with temp password', async () => {
      // Arrange
      const mockInvitation = {
        id: generateTestId(),
        email: 'direct@test.com',
        name: 'Direct User',
        type: 'DIRECT',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([mockServiceRow])
        .mockResolvedValueOnce([]) // No pending invitation
        .mockResolvedValueOnce([mockInvitation]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.invite(adminId, {
        email: 'direct@test.com',
        name: 'Direct User',
        serviceSlug,
        countryCode: 'KR',
        type: InvitationType.DIRECT,
        tempPassword: 'TempPass123!',
        permissionIds: [],
      });

      // Assert
      expect(result.type).toBe('DIRECT');
    });

    it('should throw ConflictException if pending invitation exists', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([mockServiceRow])
        .mockResolvedValueOnce([{ id: generateTestId() }]); // Existing invitation

      // Act & Assert
      await expect(
        service.invite(adminId, {
          email: 'existing@test.com',
          name: 'Existing User',
          serviceSlug,
          countryCode: 'KR',
          type: InvitationType.EMAIL,
          permissionIds: [],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return list of operators for system admin', async () => {
      // Arrange
      const mockOperators = [
        {
          id: operatorId,
          email: 'operator1@test.com',
          name: 'Operator 1',
          serviceId: generateTestId(),
          serviceSlug,
          serviceName: 'Test Service',
          countryCode: 'KR',
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce(mockOperators)
        .mockResolvedValueOnce([]); // No permissions

      // Act
      const result = await service.findAll(adminId, {});

      // Assert
      expect(result.operators).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by service slug', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.findAll(adminId, {
        serviceSlug: 'non-existent',
      });

      // Assert
      expect(result.operators).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter by active status', async () => {
      // Arrange
      const mockOperators = [
        {
          id: operatorId,
          email: 'active@test.com',
          name: 'Active Operator',
          serviceId: generateTestId(),
          serviceSlug,
          serviceName: 'Test Service',
          countryCode: 'KR',
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce(mockOperators)
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.findAll(adminId, { isActive: true });

      // Assert
      expect(result.operators).toHaveLength(1);
      expect(result.operators[0].isActive).toBe(true);
    });

    it('should filter by search term', async () => {
      // Arrange
      const mockOperators = [
        {
          id: operatorId,
          email: 'john@test.com',
          name: 'John Doe',
          serviceId: generateTestId(),
          serviceSlug,
          serviceName: 'Test Service',
          countryCode: 'KR',
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce(mockOperators)
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.findAll(adminId, { search: 'john' });

      // Assert
      expect(result.operators).toHaveLength(1);
    });

    it('should include operator permissions', async () => {
      // Arrange
      const mockOperators = [
        {
          id: operatorId,
          email: 'operator@test.com',
          name: 'Test Operator',
          serviceId: generateTestId(),
          serviceSlug,
          serviceName: 'Test Service',
          countryCode: 'KR',
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
        },
      ];

      const mockPermissions = [
        {
          operatorId,
          id: generateTestId(),
          resource: 'content',
          action: 'read',
          displayName: 'View Content',
        },
      ];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce(mockOperators)
        .mockResolvedValueOnce(mockPermissions);

      // Act
      const result = await service.findAll(adminId, {});

      // Assert
      expect(result.operators[0].permissions).toHaveLength(1);
      expect(result.operators[0].permissions[0].resource).toBe('content');
    });
  });

  describe('findById', () => {
    it('should return operator with permissions', async () => {
      // Arrange
      const mockOperator = {
        id: operatorId,
        email: 'operator@test.com',
        name: 'Test Operator',
        serviceId: generateTestId(),
        serviceSlug,
        serviceName: 'Test Service',
        countryCode: 'KR',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
      };

      const mockPermissions = [
        {
          operatorId,
          id: generateTestId(),
          resource: 'content',
          action: 'read',
          displayName: 'View Content',
        },
      ];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce(mockPermissions);

      // Act
      const result = await service.findById(operatorId);

      // Assert
      expect(result.id).toBe(operatorId);
      expect(result.email).toBe('operator@test.com');
      expect(result.permissions).toHaveLength(1);
    });

    it('should throw NotFoundException if operator not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const mockOperator = {
      id: operatorId,
      email: 'operator@test.com',
      name: 'Test Operator',
      serviceId: generateTestId(),
      serviceSlug,
      serviceName: 'Test Service',
      countryCode: 'KR',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
    };

    it('should update operator name', async () => {
      // Arrange
      const updatedOperator = { ...mockOperator, name: 'Updated Name' };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator]) // findById
        .mockResolvedValueOnce([]) // permissions
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }]) // admin check
        .mockResolvedValueOnce([updatedOperator]) // findById after update
        .mockResolvedValueOnce([]); // permissions

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.update(adminId, operatorId, {
        name: 'Updated Name',
      });

      // Assert
      expect(result.name).toBe('Updated Name');
    });

    it('should update operator active status', async () => {
      // Arrange
      const updatedOperator = { ...mockOperator, isActive: false };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([updatedOperator])
        .mockResolvedValueOnce([]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.update(adminId, operatorId, {
        isActive: false,
      });

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should update both name and active status', async () => {
      // Arrange
      const updatedOperator = {
        ...mockOperator,
        name: 'New Name',
        isActive: false,
      };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([updatedOperator])
        .mockResolvedValueOnce([]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.update(adminId, operatorId, {
        name: 'New Name',
        isActive: false,
      });

      // Assert
      expect(result.name).toBe('New Name');
      expect(result.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete operator', async () => {
      // Arrange
      const mockOperator = {
        id: operatorId,
        email: 'operator@test.com',
        name: 'Test Operator',
        serviceId: generateTestId(),
        serviceSlug,
        serviceName: 'Test Service',
        countryCode: 'KR',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
      };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act & Assert
      await expect(service.delete(adminId, operatorId)).resolves.toBeUndefined();
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('grantPermission', () => {
    const mockOperator = {
      id: operatorId,
      email: 'operator@test.com',
      name: 'Test Operator',
      serviceId: generateTestId(),
      serviceSlug,
      serviceName: 'Test Service',
      countryCode: 'KR',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
    };

    const permissionId = generateTestId();

    it('should grant permission to operator', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator]) // findById
        .mockResolvedValueOnce([]) // existing permissions
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }]) // admin check
        .mockResolvedValueOnce([{ id: permissionId }]) // permission exists
        .mockResolvedValueOnce([]); // not already granted

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act & Assert
      await expect(
        service.grantPermission(adminId, operatorId, permissionId),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundException if permission does not exist', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([]); // Permission not found

      // Act & Assert
      await expect(service.grantPermission(adminId, operatorId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if permission already granted', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }])
        .mockResolvedValueOnce([{ id: permissionId }])
        .mockResolvedValueOnce([{ id: generateTestId() }]); // Already granted

      // Act & Assert
      await expect(service.grantPermission(adminId, operatorId, permissionId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('revokePermission', () => {
    const mockOperator = {
      id: operatorId,
      email: 'operator@test.com',
      name: 'Test Operator',
      serviceId: generateTestId(),
      serviceSlug,
      serviceName: 'Test Service',
      countryCode: 'KR',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
    };

    const permissionId = generateTestId();

    it('should revoke permission from operator', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([
          {
            operatorId,
            id: permissionId,
            resource: 'content',
            action: 'read',
            displayName: 'View Content',
          },
        ])
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act & Assert
      await expect(
        service.revokePermission(adminId, operatorId, permissionId),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundException if permission not granted', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ scope: 'SYSTEM' }]);

      mockPrisma.$executeRaw.mockResolvedValue(0); // No rows deleted

      // Act & Assert
      await expect(service.revokePermission(adminId, operatorId, 'not-granted')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
