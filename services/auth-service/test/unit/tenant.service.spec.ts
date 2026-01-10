import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';

import { TenantService } from '../../src/admin/services/tenant.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { createAdminPayload, generateTestId, resetTestCounter } from '../utils/test-factory';
import { TenantType } from '../../src/admin/types/admin.types';

describe('TenantService', () => {
  let service: TenantService;
  let mockPrisma: MockPrismaService;

  const tenantId = '00000000-0000-7000-0000-000000000001';
  const adminId = '00000000-0000-7000-0000-000000000002';

  const mockTenant = {
    id: tenantId,
    name: 'Test Partner',
    type: 'PARTNER',
    slug: 'test-partner',
    status: 'ACTIVE',
    settings: { feature1: true },
    approvedAt: new Date(),
    approvedBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated list of tenants', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockTenant])
        .mockResolvedValueOnce([{ tenant_id: tenantId, count: BigInt(5) }]);

      // Act
      const result = await service.list({ page: 1, limit: 20 });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].adminCount).toBe(5);
    });

    it('should apply filters correctly', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.list({
        type: 'COMMERCE' as TenantType,
        status: 'ACTIVE',
        search: 'test',
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.list({});

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('findById', () => {
    it('should return tenant by id', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockTenant])
        .mockResolvedValueOnce([{ count: BigInt(5) }]);

      // Act
      const result = await service.findById(tenantId);

      // Assert
      expect(result.id).toBe(tenantId);
      expect(result.name).toBe('Test Partner');
      expect(result.adminCount).toBe(5);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.findById(tenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new tenant', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // slug check
        .mockResolvedValueOnce([
          { ...mockTenant, status: 'PENDING', approvedAt: null, approvedBy: null },
        ]);

      // Act
      const result = await service.create({
        name: 'Test Partner',
        type: 'COMMERCE' as TenantType,
        slug: 'test-partner',
        settings: { feature1: true },
      });

      // Assert
      expect(result.name).toBe('Test Partner');
      expect(result.status).toBe('PENDING');
      expect(result.adminCount).toBe(0);
    });

    it('should throw ConflictException when slug already exists', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: generateTestId() }]);

      // Act & Assert
      await expect(
        service.create({
          name: 'Test Partner',
          type: 'COMMERCE' as TenantType,
          slug: 'existing-slug',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should use default type INTERNAL when not provided', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockTenant, type: 'INTERNAL' }]);

      // Act
      const result = await service.create({
        name: 'Internal Tenant',
        slug: 'internal-tenant',
      });

      // Assert
      expect(result.type).toBe('INTERNAL');
    });
  });

  describe('update', () => {
    it('should update tenant name and settings', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockTenant]) // findById
        .mockResolvedValueOnce([{ count: BigInt(5) }]) // adminCount
        .mockResolvedValueOnce([{ ...mockTenant, name: 'Updated Name' }]) // update
        .mockResolvedValueOnce([{ count: BigInt(5) }]); // adminCount again

      // Act
      const result = await service.update(tenantId, {
        name: 'Updated Name',
        settings: { feature2: true },
      });

      // Assert
      expect(result.name).toBe('Updated Name');
    });

    it('should return unchanged tenant when no updates provided', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockTenant])
        .mockResolvedValueOnce([{ count: BigInt(5) }])
        .mockResolvedValueOnce([mockTenant])
        .mockResolvedValueOnce([{ count: BigInt(5) }]);

      // Act
      const result = await service.update(tenantId, {});

      // Assert
      expect(result.name).toBe('Test Partner');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.update(tenantId, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    const admin = createAdminPayload();

    it('should activate a pending tenant', async () => {
      // Arrange
      const pendingTenant = { ...mockTenant, status: 'PENDING' };
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([pendingTenant]) // findById
        .mockResolvedValueOnce([{ count: BigInt(0) }]) // adminCount
        .mockResolvedValueOnce([{ ...mockTenant, status: 'ACTIVE' }]) // update
        .mockResolvedValueOnce([{ count: BigInt(0) }]); // adminCount again

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updateStatus(tenantId, { status: 'ACTIVE' }, admin);

      // Assert
      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.$executeRaw).toHaveBeenCalled(); // audit log
    });

    it('should suspend an active tenant', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockTenant]) // findById
        .mockResolvedValueOnce([{ count: BigInt(5) }]) // adminCount
        .mockResolvedValueOnce([{ ...mockTenant, status: 'SUSPENDED' }]) // update
        .mockResolvedValueOnce([{ count: BigInt(5) }]); // adminCount again

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updateStatus(
        tenantId,
        { status: 'SUSPENDED', reason: 'Policy violation' },
        admin,
      );

      // Assert
      expect(result.status).toBe('SUSPENDED');
    });

    it('should throw ForbiddenException for invalid status transition', async () => {
      // Arrange - Terminated is a terminal state
      const terminatedTenant = { ...mockTenant, status: 'TERMINATED' };
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([terminatedTenant])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      // Act & Assert
      await expect(service.updateStatus(tenantId, { status: 'ACTIVE' }, admin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for PENDING -> SUSPENDED transition', async () => {
      // Arrange
      const pendingTenant = { ...mockTenant, status: 'PENDING' };
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([pendingTenant])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      // Act & Assert
      await expect(service.updateStatus(tenantId, { status: 'SUSPENDED' }, admin)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMyTenant', () => {
    it('should return tenant for tenant admin', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockTenant])
        .mockResolvedValueOnce([{ count: BigInt(5) }]);

      // Act
      const result = await service.getMyTenant(tenantId);

      // Assert
      expect(result.id).toBe(tenantId);
    });
  });

  describe('updateMyTenant', () => {
    it('should update tenant settings only', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ ...mockTenant, settings: { newFeature: true } }])
        .mockResolvedValueOnce([{ count: BigInt(5) }]);

      // Act
      const result = await service.updateMyTenant(tenantId, {
        settings: { newFeature: true },
      });

      // Assert
      expect(result.settings).toEqual({ newFeature: true });
    });

    it('should return unchanged tenant when no settings provided', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockTenant])
        .mockResolvedValueOnce([{ count: BigInt(5) }]);

      // Act
      const result = await service.updateMyTenant(tenantId, {});

      // Assert
      expect(result.settings).toEqual({ feature1: true });
    });
  });
});
