import { Test, TestingModule } from '@nestjs/testing';
import { ServiceFeatureController } from './service-feature.controller';
import { ServiceFeatureService } from '../services/service-feature.service';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';
import {
  CreateServiceFeatureDto,
  UpdateServiceFeatureDto,
  BulkFeatureOperationDto,
  CreateFeaturePermissionDto,
  ListFeaturesQueryDto,
  ServiceFeatureResponseDto,
  FeaturePermissionResponseDto,
  ServiceFeatureListResponseDto,
  PermissionTargetType,
  FeatureAction,
} from '../dto/service-feature.dto';
import { AdminPayload } from '../types/admin.types';

describe('ServiceFeatureController', () => {
  let controller: ServiceFeatureController;
  let mockFeatureService: {
    list: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    bulk: jest.Mock;
    listPermissions: jest.Mock;
    createPermission: jest.Mock;
    deletePermission: jest.Mock;
  };

  const mockServiceId = '550e8400-e29b-41d4-a716-446655440001';
  const mockFeatureId = '550e8400-e29b-41d4-a716-446655440002';
  const mockPermissionId = '550e8400-e29b-41d4-a716-446655440003';

  const mockAdmin: AdminPayload = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@example.com',
    name: 'Super Admin',
    type: 'ADMIN_ACCESS',
    accountMode: 'SERVICE',
    scope: 'SYSTEM',
    tenantId: null,
    roleId: '550e8400-e29b-41d4-a716-446655440100',
    roleName: 'SUPER_ADMIN',
    level: 0,
    permissions: ['*'],
    services: {},
  };

  const mockFeature: ServiceFeatureResponseDto = {
    id: mockFeatureId,
    serviceId: mockServiceId,
    code: 'resume_builder',
    name: 'Resume Builder',
    description: 'Build professional resumes',
    category: 'career',
    parentId: null,
    path: '/resume_builder',
    depth: 0,
    displayOrder: 1,
    isActive: true,
    isDefault: true,
    icon: 'document',
    color: '#3B82F6',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPermission: FeaturePermissionResponseDto = {
    id: mockPermissionId,
    featureId: mockFeatureId,
    serviceId: mockServiceId,
    targetType: PermissionTargetType.ALL_USERS,
    targetId: null,
    action: FeatureAction.USE,
    isAllowed: true,
    conditions: null,
    validFrom: null,
    validUntil: null,
    createdAt: new Date('2024-01-01'),
    createdBy: mockAdmin.sub,
  };

  beforeEach(async () => {
    mockFeatureService = {
      list: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulk: jest.fn(),
      listPermissions: jest.fn(),
      createPermission: jest.fn(),
      deletePermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceFeatureController],
      providers: [
        { provide: ServiceFeatureService, useValue: mockFeatureService },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ServiceFeatureController>(ServiceFeatureController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listFeatures', () => {
    it('should return list of features for a service', async () => {
      const query: ListFeaturesQueryDto = { category: 'career', includeInactive: false };
      const expectedResponse: ServiceFeatureListResponseDto = {
        data: [mockFeature],
        meta: { total: 1, serviceId: mockServiceId, category: 'career' },
      };
      mockFeatureService.list.mockResolvedValue(expectedResponse);

      const result = await controller.listFeatures(mockServiceId, query);

      expect(result).toEqual(expectedResponse);
      expect(mockFeatureService.list).toHaveBeenCalledWith(mockServiceId, {
        category: 'career',
        includeInactive: false,
        includeChildren: true,
      });
    });

    it('should include children by default', async () => {
      const query: ListFeaturesQueryDto = {};
      const expectedResponse: ServiceFeatureListResponseDto = {
        data: [mockFeature],
        meta: { total: 1, serviceId: mockServiceId },
      };
      mockFeatureService.list.mockResolvedValue(expectedResponse);

      await controller.listFeatures(mockServiceId, query);

      expect(mockFeatureService.list).toHaveBeenCalledWith(mockServiceId, {
        category: undefined,
        includeInactive: false,
        includeChildren: true,
      });
    });

    it('should allow excluding children', async () => {
      const query: ListFeaturesQueryDto = { includeChildren: false };
      mockFeatureService.list.mockResolvedValue({
        data: [],
        meta: { total: 0, serviceId: mockServiceId },
      });

      await controller.listFeatures(mockServiceId, query);

      expect(mockFeatureService.list).toHaveBeenCalledWith(mockServiceId, {
        category: undefined,
        includeInactive: false,
        includeChildren: false,
      });
    });
  });

  describe('getFeature', () => {
    it('should return a single feature', async () => {
      mockFeatureService.findOne.mockResolvedValue(mockFeature);

      const result = await controller.getFeature(mockServiceId, mockFeatureId);

      expect(result).toEqual(mockFeature);
      expect(mockFeatureService.findOne).toHaveBeenCalledWith(mockServiceId, mockFeatureId);
    });
  });

  describe('createFeature', () => {
    it('should create a feature', async () => {
      const dto: CreateServiceFeatureDto = {
        code: 'resume_builder',
        name: 'Resume Builder',
        category: 'career',
        description: 'Build professional resumes',
      };
      mockFeatureService.create.mockResolvedValue(mockFeature);

      const result = await controller.createFeature(mockServiceId, dto, mockAdmin);

      expect(result).toEqual(mockFeature);
      expect(mockFeatureService.create).toHaveBeenCalledWith(mockServiceId, dto, mockAdmin);
    });

    it('should create a feature with parent', async () => {
      const parentId = '550e8400-e29b-41d4-a716-446655440010';
      const dto: CreateServiceFeatureDto = {
        code: 'resume_template',
        name: 'Resume Templates',
        category: 'career',
        parentId,
      };
      const childFeature = {
        ...mockFeature,
        code: 'resume_template',
        parentId,
        path: '/resume_builder/resume_template',
        depth: 1,
      };
      mockFeatureService.create.mockResolvedValue(childFeature);

      const result = await controller.createFeature(mockServiceId, dto, mockAdmin);

      expect(result.parentId).toBe(parentId);
      expect(result.depth).toBe(1);
    });
  });

  describe('updateFeature', () => {
    it('should update a feature', async () => {
      const dto: UpdateServiceFeatureDto = {
        name: 'Updated Resume Builder',
        isActive: false,
      };
      const updatedFeature = { ...mockFeature, ...dto };
      mockFeatureService.update.mockResolvedValue(updatedFeature);

      const result = await controller.updateFeature(mockServiceId, mockFeatureId, dto, mockAdmin);

      expect(result.name).toBe('Updated Resume Builder');
      expect(result.isActive).toBe(false);
      expect(mockFeatureService.update).toHaveBeenCalledWith(
        mockServiceId,
        mockFeatureId,
        dto,
        mockAdmin,
      );
    });
  });

  describe('deleteFeature', () => {
    it('should delete a feature', async () => {
      mockFeatureService.delete.mockResolvedValue({ success: true });

      const result = await controller.deleteFeature(mockServiceId, mockFeatureId, mockAdmin);

      expect(result).toEqual({ success: true });
      expect(mockFeatureService.delete).toHaveBeenCalledWith(
        mockServiceId,
        mockFeatureId,
        mockAdmin,
      );
    });
  });

  describe('bulkOperation', () => {
    it('should perform bulk create operation', async () => {
      const dto: BulkFeatureOperationDto = {
        operation: 'create',
        items: [{ code: 'feature1', name: 'Feature 1' }],
      };
      const expectedResponse: ServiceFeatureListResponseDto = {
        data: [{ ...mockFeature, code: 'feature1', name: 'Feature 1' }],
        meta: { total: 1, serviceId: mockServiceId },
      };
      mockFeatureService.bulk.mockResolvedValue(expectedResponse);

      const result = await controller.bulkOperation(mockServiceId, dto, mockAdmin);

      expect(result).toEqual(expectedResponse);
      expect(mockFeatureService.bulk).toHaveBeenCalledWith(mockServiceId, dto, mockAdmin);
    });

    it('should perform bulk reorder operation', async () => {
      const dto: BulkFeatureOperationDto = {
        operation: 'reorder',
        items: [
          { id: mockFeatureId, displayOrder: 2 },
          { id: '550e8400-e29b-41d4-a716-446655440011', displayOrder: 1 },
        ],
      };
      mockFeatureService.bulk.mockResolvedValue({
        data: [],
        meta: { total: 2, serviceId: mockServiceId },
      });

      await controller.bulkOperation(mockServiceId, dto, mockAdmin);

      expect(mockFeatureService.bulk).toHaveBeenCalledWith(mockServiceId, dto, mockAdmin);
    });

    it('should perform bulk delete operation', async () => {
      const dto: BulkFeatureOperationDto = {
        operation: 'delete',
        items: [{ id: mockFeatureId }],
      };
      mockFeatureService.bulk.mockResolvedValue({
        data: [],
        meta: { total: 0, serviceId: mockServiceId },
      });

      await controller.bulkOperation(mockServiceId, dto, mockAdmin);

      expect(mockFeatureService.bulk).toHaveBeenCalledWith(mockServiceId, dto, mockAdmin);
    });
  });

  describe('listPermissions', () => {
    it('should list permissions for a feature', async () => {
      mockFeatureService.findOne.mockResolvedValue(mockFeature);
      mockFeatureService.listPermissions.mockResolvedValue([mockPermission]);

      const result = await controller.listPermissions(mockServiceId, mockFeatureId);

      expect(result).toEqual([mockPermission]);
      expect(mockFeatureService.findOne).toHaveBeenCalledWith(mockServiceId, mockFeatureId);
      expect(mockFeatureService.listPermissions).toHaveBeenCalledWith(mockFeatureId);
    });
  });

  describe('createPermission', () => {
    it('should create a permission for a feature', async () => {
      const dto: CreateFeaturePermissionDto = {
        targetType: PermissionTargetType.ALL_USERS,
        action: FeatureAction.USE,
        isAllowed: true,
      };
      mockFeatureService.createPermission.mockResolvedValue(mockPermission);

      const result = await controller.createPermission(
        mockServiceId,
        mockFeatureId,
        dto,
        mockAdmin,
      );

      expect(result).toEqual(mockPermission);
      expect(mockFeatureService.createPermission).toHaveBeenCalledWith(
        mockServiceId,
        mockFeatureId,
        dto,
        mockAdmin,
      );
    });

    it('should create permission with time constraints', async () => {
      const dto: CreateFeaturePermissionDto = {
        targetType: PermissionTargetType.USER,
        targetId: '550e8400-e29b-41d4-a716-446655440020',
        action: FeatureAction.CREATE,
        isAllowed: true,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2024-12-31T23:59:59Z',
      };
      const timedPermission = {
        ...mockPermission,
        targetType: PermissionTargetType.USER,
        targetId: dto.targetId,
        action: FeatureAction.CREATE,
        validFrom: new Date(dto.validFrom!),
        validUntil: new Date(dto.validUntil!),
      };
      mockFeatureService.createPermission.mockResolvedValue(timedPermission);

      const result = await controller.createPermission(
        mockServiceId,
        mockFeatureId,
        dto,
        mockAdmin,
      );

      expect(result.validFrom).toBeDefined();
      expect(result.validUntil).toBeDefined();
    });
  });

  describe('deletePermission', () => {
    it('should delete a permission', async () => {
      mockFeatureService.findOne.mockResolvedValue(mockFeature);
      mockFeatureService.deletePermission.mockResolvedValue({ success: true });

      const result = await controller.deletePermission(
        mockServiceId,
        mockFeatureId,
        mockPermissionId,
        mockAdmin,
      );

      expect(result).toEqual({ success: true });
      expect(mockFeatureService.findOne).toHaveBeenCalledWith(mockServiceId, mockFeatureId);
      expect(mockFeatureService.deletePermission).toHaveBeenCalledWith(
        mockServiceId,
        mockPermissionId,
        mockAdmin,
      );
    });
  });
});
