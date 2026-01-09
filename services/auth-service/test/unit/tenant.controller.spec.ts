import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { TenantController } from '../../src/admin/controllers/tenant.controller';
import { TenantService } from '../../src/admin/services/tenant.service';
import { PermissionGuard } from '../../src/admin/guards/permission.guard';
import {
  createAdminPayload,
  generateTestId,
  resetTestCounter,
  createTenantAdmin,
} from '../utils/test-factory';
import { TenantType, TenantStatus } from '../../src/admin/types/admin.types';

describe('TenantController', () => {
  let controller: TenantController;
  let mockTenantService: {
    list: Mock;
    findById: Mock;
    create: Mock;
    update: Mock;
    updateStatus: Mock;
    getMyTenant: Mock;
    updateMyTenant: Mock;
  };

  const tenantId = '00000000-0000-7000-0000-000000000001';

  const mockTenant = {
    id: tenantId,
    name: 'Test Partner',
    type: 'COMMERCE' as TenantType,
    slug: 'test-partner',
    status: 'ACTIVE' as TenantStatus,
    settings: { feature1: true },
    approvedAt: new Date(),
    approvedBy: generateTestId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    adminCount: 5,
  };

  beforeEach(async () => {
    resetTestCounter();

    mockTenantService = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      getMyTenant: vi.fn(),
      updateMyTenant: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [{ provide: TenantService, useValue: mockTenantService }, Reflector],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TenantController>(TenantController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated tenants', async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      const mockResponse = {
        items: [mockTenant],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockTenantService.list.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.list(query);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockTenantService.list).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('should return tenant by id', async () => {
      // Arrange
      mockTenantService.findById.mockResolvedValue(mockTenant);

      // Act
      const result = await controller.findById(tenantId);

      // Assert
      expect(result.id).toBe(tenantId);
      expect(result.name).toBe('Test Partner');
      expect(mockTenantService.findById).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('create', () => {
    it('should create a new tenant', async () => {
      // Arrange
      const dto = {
        name: 'New Partner',
        slug: 'new-partner',
        type: 'COMMERCE' as TenantType,
      };
      const createdTenant = {
        ...mockTenant,
        ...dto,
        id: generateTestId(),
        status: 'PENDING' as TenantStatus,
      };
      mockTenantService.create.mockResolvedValue(createdTenant);

      // Act
      const result = await controller.create(dto);

      // Assert
      expect(result.name).toBe('New Partner');
      expect(result.status).toBe('PENDING');
      expect(mockTenantService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update tenant', async () => {
      // Arrange
      const dto = { name: 'Updated Partner' };
      const updatedTenant = { ...mockTenant, name: 'Updated Partner' };
      mockTenantService.update.mockResolvedValue(updatedTenant);

      // Act
      const result = await controller.update(tenantId, dto);

      // Assert
      expect(result.name).toBe('Updated Partner');
      expect(mockTenantService.update).toHaveBeenCalledWith(tenantId, dto);
    });
  });

  describe('updateStatus', () => {
    it('should update tenant status', async () => {
      // Arrange
      const admin = createAdminPayload();
      const dto = { status: 'SUSPENDED' as TenantStatus, reason: 'Policy violation' };
      const updatedTenant = { ...mockTenant, status: 'SUSPENDED' as TenantStatus };
      mockTenantService.updateStatus.mockResolvedValue(updatedTenant);

      // Act
      const result = await controller.updateStatus(tenantId, dto, admin);

      // Assert
      expect(result.status).toBe('SUSPENDED');
      expect(mockTenantService.updateStatus).toHaveBeenCalledWith(tenantId, dto, admin);
    });
  });

  describe('getMyTenant', () => {
    it('should return current admin tenant', async () => {
      // Arrange
      const admin = createTenantAdmin(tenantId);
      mockTenantService.getMyTenant.mockResolvedValue(mockTenant);

      // Act
      const result = await controller.getMyTenant(admin);

      // Assert
      expect(result.id).toBe(tenantId);
      expect(mockTenantService.getMyTenant).toHaveBeenCalledWith(tenantId);
    });

    it('should throw error when admin has no tenant', async () => {
      // Arrange
      const admin = createAdminPayload(); // System admin, no tenantId

      // Act & Assert
      await expect(controller.getMyTenant(admin)).rejects.toThrow(
        'No tenant associated with this admin',
      );
    });
  });

  describe('updateMyTenant', () => {
    it('should update current admin tenant', async () => {
      // Arrange
      const admin = createTenantAdmin(tenantId);
      const dto = { settings: { newFeature: true } };
      const updatedTenant = { ...mockTenant, settings: { newFeature: true } };
      mockTenantService.updateMyTenant.mockResolvedValue(updatedTenant);

      // Act
      const result = await controller.updateMyTenant(admin, dto);

      // Assert
      expect(result.settings).toEqual({ newFeature: true });
      expect(mockTenantService.updateMyTenant).toHaveBeenCalledWith(tenantId, dto);
    });

    it('should throw error when admin has no tenant', async () => {
      // Arrange
      const admin = createAdminPayload();
      const dto = { settings: {} };

      // Act & Assert
      await expect(controller.updateMyTenant(admin, dto)).rejects.toThrow(
        'No tenant associated with this admin',
      );
    });
  });
});
